const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.MINECRAFT_API_PORT || 3003;
const API_KEY = process.env.MINECRAFT_API_KEY || 'your-api-key-here';

const MINECRAFT_SERVER_ROOT = process.env.MINECRAFT_SERVER_ROOT || process.cwd();
const CONFIG_FOLDER = process.env.CONFIG_FOLDER || path.join(MINECRAFT_SERVER_ROOT, 'config');

const WHITELIST_FILE = process.env.WHITELIST_FILE || path.join(MINECRAFT_SERVER_ROOT, 'whitelist.json');
const OPS_FILE = process.env.OPS_FILE || path.join(MINECRAFT_SERVER_ROOT, 'ops.json');
const BANNED_PLAYERS_FILE = process.env.BANNED_PLAYERS_FILE || path.join(MINECRAFT_SERVER_ROOT, 'banned-players.json');

const RCON_ENABLED = process.env.RCON_ENABLED === 'true';
const RCON_HOST = process.env.RCON_HOST || 'localhost';
const RCON_PORT = parseInt(process.env.RCON_PORT || '25575', 10);
const RCON_PASSWORD = process.env.RCON_PASSWORD || '';

const SERVER_MODE = process.env.SERVER_MODE || 'online';

let fileLock = false;
const lockQueue = [];

async function acquireLock() {
  return new Promise((resolve) => {
    if (!fileLock) {
      fileLock = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
}

function releaseLock() {
  fileLock = false;
  if (lockQueue.length > 0) {
    const next = lockQueue.shift();
    fileLock = true;
    next();
  }
}

function logAudit(action, username, ip, success = true, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    username,
    ip,
    success,
    error: error ? error.message : null
  };
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
}

function generateOfflineUUID(username) {
  const hash = crypto
    .createHash('md5')
    .update(`OfflinePlayer:${username}`)
    .digest('hex');

  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-');
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_]{3,16}$/.test(username);
}

function validateFilePath(filePath, allowedDirectory) {
  const resolved = path.resolve(filePath);
  const allowedDirResolved = path.resolve(allowedDirectory);
  
  if (!resolved.startsWith(allowedDirResolved)) {
    throw new Error(`Invalid file path: ${filePath} must be within ${allowedDirectory}`);
  }
  
  return resolved;
}

function escapeRCONCommand(username) {
  if (typeof username !== 'string') return '';
  return username.replace(/[^a-zA-Z0-9_]/g, '');
}

async function executeRCONCommand(command) {
  if (!RCON_ENABLED) {
    return null;
  }

  try {
    let mcrcon;
    try {
      mcrcon = require('mcrcon');
    } catch (error) {
      console.warn('[RCON] mcrcon package not installed');
      return null;
    }

    const client = mcrcon(RCON_HOST, RCON_PASSWORD, {
      port: RCON_PORT,
      timeout: 5000
    });

    await new Promise((resolve, reject) => {
      client.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const result = await new Promise((resolve, reject) => {
      client.send(command, (err, response) => {
        if (err) reject(err);
        else resolve(response || '');
      });
    });

    await new Promise((resolve, reject) => {
      client.end((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    return result;
  } catch (error) {
    console.error('[RCON] Command execution error:', error.message);
    return null;
  }
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error(`[ERROR] Failed to create directory ${dirPath}:`, error.message);
    }
  }
}

app.use(express.json());

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;
const MAX_MAP_SIZE = 10000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    const oldestEntries = Array.from(rateLimitMap.entries())
      .sort((a, b) => a[1].resetTime - b[1].resetTime)
      .slice(0, Math.floor(MAX_MAP_SIZE / 2));
    oldestEntries.forEach(([key]) => rateLimitMap.delete(key));
  }
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(ip);
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    logAudit('RATE_LIMIT_EXCEEDED', null, ip, false, new Error('Rate limit exceeded'));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  limit.count++;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

function verifyAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!apiKey || apiKey !== API_KEY) {
    logAudit('AUTH_FAILED', null, ip, false, new Error('Invalid API key'));
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

app.post('/api/whitelist/add', rateLimit, verifyAPIKey, async (req, res) => {
  const { username } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!username) {
    logAudit('ADD_WHITELIST', null, ip, false, new Error('Username required'));
    return res.status(400).json({ error: 'Username required' });
  }
  
  if (!validateUsername(username)) {
    logAudit('ADD_WHITELIST', username, ip, false, new Error('Invalid username format'));
    return res.status(400).json({ error: 'Invalid username format. Must be 3-16 alphanumeric characters and underscores.' });
  }
  
  const whitelistFilePath = validateFilePath(WHITELIST_FILE, MINECRAFT_SERVER_ROOT);
  
  try {
    await acquireLock();
    
    let whitelist = [];
    try {
      const data = await fs.readFile(whitelistFilePath, 'utf8');
      whitelist = JSON.parse(data);
      
      if (!Array.isArray(whitelist)) {
        throw new Error('Invalid whitelist file format');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        releaseLock();
        console.warn(`[WARNING] Whitelist file not found at ${whitelistFilePath}`);
        return res.status(404).json({ 
          error: 'Whitelist file not found',
          message: `Please create whitelist.json at ${whitelistFilePath} or update WHITELIST_FILE path`
        });
      } else {
        throw error;
      }
    }
    
    const exists = whitelist.some(entry => 
      entry.name && entry.name.toLowerCase() === username.toLowerCase()
    );
    
    if (exists) {
      releaseLock();
      logAudit('ADD_WHITELIST', username, ip, false, new Error('User already whitelisted'));
      return res.status(409).json({ 
        error: 'User already whitelisted',
        username: username
      });
    }
    
    let uuid;
    if (SERVER_MODE === 'offline') {
      uuid = generateOfflineUUID(username);
    } else {
      uuid = generateOfflineUUID(username);
    }
    
    const newEntry = {
      uuid: uuid,
      name: username
    };
    
    whitelist.push(newEntry);
    
    await fs.writeFile(whitelistFilePath, JSON.stringify(whitelist, null, 2), 'utf8');
    
    releaseLock();
    
    if (RCON_ENABLED) {
      try {
        const safeUsername = escapeRCONCommand(username);
        await executeRCONCommand(`whitelist add ${safeUsername}`);
        console.log(`[RCON] Added ${safeUsername} to whitelist`);
      } catch (error) {
        console.warn(`[RCON] Command failed: ${error.message}`);
      }
    }
    
    logAudit('ADD_WHITELIST', username, ip, true);
    console.log(`[SUCCESS] Added ${username} to whitelist (UUID: ${uuid})`);
    
    res.json({ 
      success: true, 
      message: `${username} added to whitelist`,
      username: username,
      uuid: uuid,
      mode: SERVER_MODE
    });
  } catch (error) {
    releaseLock();
    console.error('[ERROR] Error adding to whitelist:', error);
    logAudit('ADD_WHITELIST', username, ip, false, error);
    res.status(500).json({ error: 'Failed to add to whitelist', details: error.message });
  }
});

app.delete('/api/whitelist/remove', rateLimit, verifyAPIKey, async (req, res) => {
  const { username } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!username) {
    logAudit('REMOVE_WHITELIST', null, ip, false, new Error('Username required'));
    return res.status(400).json({ error: 'Username required' });
  }
  
  const whitelistFilePath = validateFilePath(WHITELIST_FILE, MINECRAFT_SERVER_ROOT);
  
  try {
    await acquireLock();
    
    let whitelist = [];
    try {
      const data = await fs.readFile(whitelistFilePath, 'utf8');
      whitelist = JSON.parse(data);
      
      if (!Array.isArray(whitelist)) {
        throw new Error('Invalid whitelist file format');
      }
    } catch (error) {
      releaseLock();
      logAudit('REMOVE_WHITELIST', username, ip, false, error);
      return res.status(404).json({ error: 'Whitelist file not found' });
    }
    
    const initialLength = whitelist.length;
    whitelist = whitelist.filter(entry => 
      entry.name && entry.name.toLowerCase() !== username.toLowerCase()
    );
    
    if (whitelist.length === initialLength) {
      releaseLock();
      logAudit('REMOVE_WHITELIST', username, ip, false, new Error('User not found'));
      return res.status(404).json({ error: 'User not found in whitelist' });
    }
    
    await fs.writeFile(whitelistFilePath, JSON.stringify(whitelist, null, 2), 'utf8');
    
    releaseLock();
    
    if (RCON_ENABLED) {
      try {
        const safeUsername = escapeRCONCommand(username);
        await executeRCONCommand(`whitelist remove ${safeUsername}`);
        console.log(`[RCON] Removed ${safeUsername} from whitelist`);
      } catch (error) {
        console.warn(`[RCON] Command failed: ${error.message}`);
      }
    }
    
    logAudit('REMOVE_WHITELIST', username, ip, true);
    console.log(`[SUCCESS] Removed ${username} from whitelist`);
    
    res.json({ 
      success: true, 
      message: `${username} removed from whitelist` 
    });
  } catch (error) {
    releaseLock();
    console.error('[ERROR] Error removing from whitelist:', error);
    logAudit('REMOVE_WHITELIST', username, ip, false, error);
    res.status(500).json({ error: 'Failed to remove from whitelist', details: error.message });
  }
});

app.get('/api/whitelist/status', rateLimit, verifyAPIKey, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const whitelistFilePath = validateFilePath(WHITELIST_FILE, MINECRAFT_SERVER_ROOT);
  
  try {
    const data = await fs.readFile(whitelistFilePath, 'utf8');
    const whitelist = JSON.parse(data);
    
    if (!Array.isArray(whitelist)) {
      throw new Error('Invalid whitelist file format');
    }
    
    logAudit('STATUS_CHECK', null, ip, true);
    
    res.json({
      success: true,
      count: whitelist.length,
      users: whitelist.map(entry => entry.name),
      mode: SERVER_MODE
    });
  } catch (error) {
    logAudit('STATUS_CHECK', null, ip, false, error);
    res.status(500).json({ error: 'Failed to read whitelist', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'minecraft-whitelist-api',
    mode: SERVER_MODE,
    rcon_enabled: RCON_ENABLED,
    server_root: MINECRAFT_SERVER_ROOT,
    config_folder: CONFIG_FOLDER,
    whitelist_file: WHITELIST_FILE
  });
});

(async () => {
  await ensureDirectoryExists(CONFIG_FOLDER);
  
  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Minecraft Whitelist API Server');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Port: ${PORT}`);
    console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
    console.log(`Server Root: ${MINECRAFT_SERVER_ROOT}`);
    console.log(`Config Folder: ${CONFIG_FOLDER}`);
    console.log(`Whitelist File: ${WHITELIST_FILE}`);
    console.log(`Ops File: ${OPS_FILE}`);
    console.log(`Banned Players File: ${BANNED_PLAYERS_FILE}`);
    console.log(`Server Mode: ${SERVER_MODE}`);
    console.log(`RCON Enabled: ${RCON_ENABLED}`);
    if (RCON_ENABLED) {
      console.log(`RCON Host: ${RCON_HOST}:${RCON_PORT}`);
    }
    console.log('═══════════════════════════════════════════════════════');
    console.log('Security Features:');
    console.log('  ✓ Path injection protection enabled');
    console.log('  ✓ File locking enabled');
    console.log('  ✓ Rate limiting enabled (10 req/min)');
    console.log('  ✓ Audit logging enabled');
    console.log('═══════════════════════════════════════════════════════');
  });
})();
