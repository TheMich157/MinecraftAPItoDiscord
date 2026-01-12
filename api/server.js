const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { encrypt, decrypt } = require('./crypto-utils');
const { config: envConfig, validateConfig } = require('./config');
const { sanitizeString, validateDiscordId, validateMinecraftUsername, validateUrl, requireAdmin, rateLimit } = require('./middleware');
const wsHub = require('../ws-hub');

let sendBotNotification = null;
try {
  ({ sendNotification: sendBotNotification } = require('../bot/index.js'));
} catch (error) {
}

const app = express();
const PORT = envConfig.port;

const DISCORD_CLIENT_ID = envConfig.discord.clientId;
const DISCORD_CLIENT_SECRET = envConfig.discord.clientSecret;
const DISCORD_REDIRECT_URI = envConfig.discord.redirectUri;
const DASHBOARD_URL = envConfig.dashboard.url;

const corsOptions = {
  origin: envConfig.cors.origin === '*' ? '*' : envConfig.cors.origin.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

const DATA_DIR = path.join(__dirname, '..', 'data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

async function initApi() {
  await ensureDataDir();
  try {
    validateConfig();
  } catch (error) {
    // validateConfig may throw in production; keep init call-site in control.
    throw error;
  }
}

async function readJSON(file) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function writeJSON(file, data) {
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

async function verifyAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const config = await readJSON('config.json');
  
  if (!config || !config.minecraftApiKey || config.minecraftApiKey !== apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

app.get('/api/config', rateLimit, requireAdmin, async (req, res) => {
  const config = await readJSON('config.json') || {};

  const allAdminIds = Array.isArray(config.adminDiscordIds) ? config.adminDiscordIds : [];
  const allClientIds = Array.isArray(config.clientDiscordIds) ? config.clientDiscordIds : [];
  
  let decryptedToken = '';
  if (config.botToken) {
    try {
      decryptedToken = decrypt(config.botToken);
    } catch (error) {
      decryptedToken = config.botToken;
    }
  }
  
  res.json({
    botToken: decryptedToken,
    minecraftApiKey: config.minecraftApiKey || '',
    notificationChannelId: config.notificationChannelId || '',
    allowedDiscordIds: config.allowedDiscordIds || [],
    adminDiscordIds: allAdminIds,
    clientDiscordIds: allClientIds,
    minecraftServerDomain: config.minecraftServerDomain || '',
    minecraftWhitelistFile: config.minecraftWhitelistFile || '',
    clientId: config.clientId || '',
    discordClientId: DISCORD_CLIENT_ID,
    discordRedirectUri: DISCORD_REDIRECT_URI
  });
});

app.post('/api/auth/manual', rateLimit, async (req, res) => {
  try {
    const { discordId } = req.body;
    if (!discordId || typeof discordId !== 'string' || !validateDiscordId(discordId)) {
      return res.status(400).json({ success: false, error: 'Invalid Discord ID format' });
    }

    const fileConfig = await readJSON('config.json') || {};
    const adminIds = Array.isArray(fileConfig.adminDiscordIds) ? fileConfig.adminDiscordIds : [];
    const clientIds = Array.isArray(fileConfig.clientDiscordIds) ? fileConfig.clientDiscordIds : [];

    if (adminIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const isAdmin = adminIds.includes(discordId);
    const isClient = clientIds.includes(discordId);

    if (!isAdmin && !isClient) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      user: {
        discordId,
        username: `User#${discordId.slice(-4)}`,
        avatar: null
      },
      roles: {
        isAdmin,
        isClient
      }
    });
  } catch (error) {
    console.error('Manual auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// Public config for unauthenticated clients (e.g., login page) - does NOT expose secrets
app.get('/api/config/public', async (req, res) => {
  try {
    res.json({
      discordClientId: DISCORD_CLIENT_ID || '',
      discordRedirectUri: DISCORD_REDIRECT_URI || '',
      dashboardUrl: DASHBOARD_URL || '',
      oauthEnabled: !!DISCORD_CLIENT_ID
    });
  } catch (error) {
    console.error('Error fetching public config:', error);
    res.status(500).json({ error: 'Failed to fetch public config' });
  }
});

app.post('/api/config', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { botToken, minecraftApiKey, notificationChannelId, allowedDiscordIds, adminDiscordIds, clientDiscordIds, minecraftServerDomain, minecraftWhitelistFile, clientId } = req.body;
    
    const currentConfig = await readJSON('config.json') || {};
    
    let encryptedToken = currentConfig.botToken;
    if (botToken !== undefined && botToken !== '') {
      if (typeof botToken !== 'string' || botToken.length > 200) {
        return res.status(400).json({ error: 'Invalid bot token format' });
      }
      try {
        encryptedToken = encrypt(botToken);
      } catch (error) {
        console.error('Failed to encrypt bot token:', error);
        return res.status(500).json({ error: 'Failed to encrypt bot token. Ensure ENCRYPTION_KEY is set.' });
      }
    }
    
    if (minecraftApiKey !== undefined && (typeof minecraftApiKey !== 'string' || minecraftApiKey.length > 200)) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }
    
    if (notificationChannelId !== undefined && !validateDiscordId(notificationChannelId)) {
      return res.status(400).json({ error: 'Invalid notification channel ID format' });
    }
    
    if (minecraftServerDomain !== undefined && minecraftServerDomain !== '' && !validateUrl(minecraftServerDomain)) {
      return res.status(400).json({ error: 'Invalid server domain URL' });
    }
    
    if (adminDiscordIds !== undefined && Array.isArray(adminDiscordIds)) {
      if (!adminDiscordIds.every(id => validateDiscordId(id))) {
        return res.status(400).json({ error: 'Invalid admin Discord ID format' });
      }
    }
    
    if (clientDiscordIds !== undefined && Array.isArray(clientDiscordIds)) {
      if (!clientDiscordIds.every(id => validateDiscordId(id))) {
        return res.status(400).json({ error: 'Invalid client Discord ID format' });
      }
    }
    
    const newConfig = {
      ...currentConfig,
      botToken: encryptedToken,
      minecraftApiKey: minecraftApiKey !== undefined ? sanitizeString(minecraftApiKey, 200) : currentConfig.minecraftApiKey,
      notificationChannelId: notificationChannelId !== undefined ? notificationChannelId.trim() : currentConfig.notificationChannelId,
      allowedDiscordIds: allowedDiscordIds !== undefined ? allowedDiscordIds.filter(id => validateDiscordId(id)) : (currentConfig.allowedDiscordIds || []),
      adminDiscordIds: adminDiscordIds !== undefined ? adminDiscordIds.filter(id => validateDiscordId(id)) : (currentConfig.adminDiscordIds || []),
      clientDiscordIds: clientDiscordIds !== undefined ? clientDiscordIds.filter(id => validateDiscordId(id)) : (currentConfig.clientDiscordIds || []),
      minecraftServerDomain: minecraftServerDomain !== undefined ? sanitizeString(minecraftServerDomain, 500) : currentConfig.minecraftServerDomain,
      minecraftWhitelistFile: minecraftWhitelistFile !== undefined ? sanitizeString(minecraftWhitelistFile, 500) : currentConfig.minecraftWhitelistFile,
      clientId: clientId !== undefined ? sanitizeString(clientId, 50) : currentConfig.clientId
    };
    
    await writeJSON('config.json', newConfig);
    res.json({ success: true, message: 'Config updated' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

app.get('/api/auth/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID) {
    return res.status(500).json({ error: 'Discord OAuth not configured' });
  }
  
  const state = Math.random().toString(36).substring(7);
  const scope = 'identify';
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;
  
  res.json({ authUrl, state });
});

app.post('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Discord OAuth not configured' });
  }
  
  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    
    const userData = userResponse.data;
    const discordId = userData.id;
    const username = userData.username;
    const avatar = userData.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png` : null;
    
    const fileConfig = await readJSON('config.json') || {};

    const adminIds = Array.isArray(fileConfig.adminDiscordIds) ? fileConfig.adminDiscordIds : [];
    const clientIds = Array.isArray(fileConfig.clientDiscordIds) ? fileConfig.clientDiscordIds : [];

    if (adminIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const isAdmin = adminIds.includes(discordId);
    const isClient = clientIds.includes(discordId);

    if (!isAdmin && !isClient) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    res.json({
      success: true,
      user: {
        discordId,
        username,
        avatar,
        discriminator: userData.discriminator
      },
      roles: {
        isAdmin,
        isClient
      }
    });
  } catch (error) {
    console.error('Discord OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Discord' });
  }
});

app.get('/api/requests', rateLimit, requireAdmin, async (req, res) => {
  try {
    const requests = await readJSON('requests.json') || [];
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.post('/api/requests', rateLimit, async (req, res) => {
  try {
    const { discordId, discordUsername, minecraftUsername } = req.body;
    
    if (!discordId || !discordUsername) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validateDiscordId(discordId)) {
      return res.status(400).json({ error: 'Invalid Discord ID format' });
    }
    
    if (typeof discordUsername !== 'string' || discordUsername.length > 100) {
      return res.status(400).json({ error: 'Invalid Discord username format' });
    }
    
    if (minecraftUsername && !validateMinecraftUsername(minecraftUsername)) {
      return res.status(400).json({ error: 'Invalid Minecraft username format' });
    }
    
    const requests = await readJSON('requests.json') || [];
    
    const existingRequest = requests.find(r => 
      r.discordId === discordId && r.status === 'pending'
    );
    
    if (existingRequest) {
      return res.status(409).json({ error: 'You already have a pending request' });
    }
    
    const newRequest = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      discordId: discordId.trim(),
      discordUsername: sanitizeString(discordUsername, 100),
      minecraftUsername: minecraftUsername ? minecraftUsername.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null
    };
    
    requests.push(newRequest);
    await writeJSON('requests.json', requests);
    
    res.json(newRequest);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.put('/api/requests/:id', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, minecraftUsername, approvedBy } = req.body;
    
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, approved, or rejected' });
    }
    
    const requests = await readJSON('requests.json') || [];
    const requestIndex = requests.findIndex(r => r.id === id);
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (status === 'approved' && !minecraftUsername && !requests[requestIndex].minecraftUsername) {
      return res.status(400).json({ error: 'Minecraft username is required when approving a request' });
    }
    
    if (minecraftUsername && (typeof minecraftUsername !== 'string' || minecraftUsername.length > 16 || !/^[a-zA-Z0-9_]{3,16}$/.test(minecraftUsername))) {
      return res.status(400).json({ error: 'Invalid Minecraft username format' });
    }
    
    requests[requestIndex].status = status;
    if (minecraftUsername) {
      requests[requestIndex].minecraftUsername = minecraftUsername.trim();
    }
    if (status === 'approved') {
      requests[requestIndex].approvedAt = new Date().toISOString();
      requests[requestIndex].approvedBy = approvedBy || 'Staff';
    } else if (status === 'rejected') {
      requests[requestIndex].rejectedAt = new Date().toISOString();
      requests[requestIndex].rejectedBy = approvedBy || 'Staff';
    }
    
    await writeJSON('requests.json', requests);
    
    if (status === 'approved') {
      const finalUsername = minecraftUsername || requests[requestIndex].minecraftUsername;
      if (finalUsername) {
        try {
          const ok = wsHub.whitelistAdd(finalUsername);
          if (!ok) {
            console.warn('No Minecraft server connected via WebSocket; cannot whitelist user yet');
          }
        } catch (err) {
          console.error('Failed to send whitelist add to Minecraft server:', err.message || err);
        }
      }
      
      try {
        if (typeof sendBotNotification === 'function') {
          await sendBotNotification({
            type: 'approval',
            userId: requests[requestIndex].discordId,
            discordUsername: requests[requestIndex].discordUsername,
            minecraftUsername: finalUsername,
            message: `Your whitelist request has been approved!`
          });
        } else {
          console.log('Bot notification not available (bot module not loaded)');
        }
      } catch (error) {
        console.log('Direct user notification not available');
      }
    }
    
    res.json(requests[requestIndex]);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

app.delete('/api/requests/:id', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string' || id.length > 100) {
      return res.status(400).json({ error: 'Invalid request ID' });
    }
    
    const requests = await readJSON('requests.json') || [];
    const filtered = requests.filter(r => r.id !== id);
    
    if (filtered.length === requests.length) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    await writeJSON('requests.json', filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

app.post('/api/whitelist/add', verifyAPIKey, async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  console.log(`Adding ${username} to whitelist`);
  
  res.json({ success: true, message: `${username} added to whitelist` });
});

app.get('/api/server', async (req, res) => {
  const server = await readJSON('server.json');
  res.json(server || { ip: '' });
});

app.post('/api/server', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP address is required' });
    }
    
    const ipPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?$|^(\d{1,3}\.){3}\d{1,3}(:\d+)?$|^localhost(:\d+)?$/;
    if (!ipPattern.test(ip.trim()) || ip.length > 100) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }
    
    await writeJSON('server.json', { ip: sanitizeString(ip, 100) });
    res.json({ success: true, message: 'Server IP updated' });
  } catch (error) {
    console.error('Error updating server IP:', error);
    res.status(500).json({ error: 'Failed to update server IP' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer(portOverride) {
  try {
    await initApi();
    console.log('Configuration validated successfully');

    const listenPort = portOverride || PORT;
    const server = app.listen(listenPort, () => {
      console.log(`API server running on port ${listenPort}`);
      console.log(`Environment: ${envConfig.nodeEnv}`);
      if (envConfig.nodeEnv === 'development') {
        console.log(`Dashboard URL: ${DASHBOARD_URL}`);
        console.log(`Discord OAuth: ${DISCORD_CLIENT_ID ? 'Configured' : 'Not configured'}`);
      }
    });

    return server;
  } catch (err) {
    console.error('Failed to start API server:', err);
    throw err;
  }
}

if (require.main === module) {
  startServer();
} else {
  module.exports = { app, startServer, initApi };
}
