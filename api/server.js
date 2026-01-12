const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { encrypt, decrypt } = require('./crypto-utils');
const { config: envConfig, validateConfig } = require('./config');
const { sanitizeString, validateDiscordId, validateMinecraftUsername, validateUrl, requireAdmin, rateLimit } = require('./middleware');
const wsHub = require('../ws-hub');
const crypto = require('crypto');

let sendBotNotification = null;
try {
  ({ sendNotification: sendBotNotification } = require('../bot/index.js'));
} catch (error) {
}

function requireServerRole(roleAllowlist) {
  return (req, res, next) => {
    if (req.user?.isAdmin) return next();
    const role = req.user?.role;
    if (!role || !roleAllowlist.includes(role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
  };
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

app.post('/api/registrations', rateLimit, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    if (!validateDiscordId(token)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { serverId, serverName, serverIp, serverPort, onlineMode } = req.body || {};

    if (!serverId || typeof serverId !== 'string') return res.status(400).json({ error: 'serverId is required' });
    const safeServerId = sanitizeString(serverId, 100);

    const safeName = typeof serverName === 'string' && serverName.trim().length > 0 ? sanitizeString(serverName, 100) : safeServerId;
    const safeIp = typeof serverIp === 'string' ? sanitizeString(serverIp, 100) : '';
    const safePort = serverPort === undefined || serverPort === null ? 25565 : parseInt(serverPort, 10);

    if (!safeIp) return res.status(400).json({ error: 'serverIp is required' });
    if (!Number.isFinite(safePort) || safePort < 1 || safePort > 65535) return res.status(400).json({ error: 'Invalid serverPort' });

    const cfg = await readJSON('config.json') || {};
    if (!Array.isArray(cfg.adminDiscordIds) || cfg.adminDiscordIds.length === 0) {
      return res.status(403).json({ error: 'No platform admins configured' });
    }

    if (cfg.registrationEnabled === false) {
      return res.status(403).json({ error: 'Registrations are currently disabled' });
    }
    if (cfg.servers && cfg.servers[safeServerId]) {
      return res.status(409).json({ error: 'Server already exists' });
    }

    const registrations = await readJSON('registrations.json') || [];
    const existing = registrations.find(r => r.ownerDiscordId === token && r.serverId === safeServerId && r.status === 'pending');
    if (existing) return res.status(409).json({ error: 'You already have a pending registration for this serverId' });

    const rec = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      ownerDiscordId: token,
      serverId: safeServerId,
      serverName: safeName,
      serverIp: safeIp,
      serverPort: safePort,
      onlineMode: onlineMode === undefined ? true : !!onlineMode,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    registrations.push(rec);
    await writeJSON('registrations.json', registrations);
    res.json(rec);
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

app.get('/api/registrations/me', rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.substring(7);
  if (!validateDiscordId(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const registrations = await readJSON('registrations.json') || [];
  res.json(registrations.filter(r => r.ownerDiscordId === token));
});

app.get('/api/platform/registrations', rateLimit, requireAdmin, async (req, res) => {
  const registrations = await readJSON('registrations.json') || [];
  res.json(registrations);
});

app.put('/api/platform/registrations/:id', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const registrations = await readJSON('registrations.json') || [];
    const idx = registrations.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Registration not found' });

    registrations[idx].status = status;
    registrations[idx].reviewedAt = new Date().toISOString();
    registrations[idx].reviewedBy = req.user.discordId;

    if (status === 'approved') {
      const cfg = await readJSON('config.json') || {};
      cfg.servers = getServersConfig(cfg);
      if (cfg.servers[registrations[idx].serverId]) {
        return res.status(409).json({ error: 'Server already exists' });
      }

      const apiKey = crypto.randomBytes(32).toString('hex');
      cfg.servers[registrations[idx].serverId] = {
        apiKey,
        whitelistEnabled: true,
        name: registrations[idx].serverName,
        ip: registrations[idx].serverIp,
        port: registrations[idx].serverPort,
        onlineMode: registrations[idx].onlineMode,
        members: {
          [registrations[idx].ownerDiscordId]: { role: 'owner' }
        },
        clientDiscordIds: []
      };
      await writeJSON('config.json', cfg);
      registrations[idx].serverApiKeyGenerated = true;
    }

    await writeJSON('registrations.json', registrations);
    res.json(registrations[idx]);
  } catch (error) {
    console.error('Error reviewing registration:', error);
    res.status(500).json({ error: 'Failed to review registration' });
  }
});

app.get('/api/servers/:serverId/plugin-config', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), async (req, res) => {
  const { serverId } = req.params;
  const cfg = await readJSON('config.json') || {};
  const serverCfg = getServer(cfg, serverId);
  if (!serverCfg) return res.status(404).json({ error: 'Server not found' });
  const backendUrl = buildBackendWsUrl(req);

  res.setHeader('Content-Type', 'text/yaml');
  res.setHeader('Content-Disposition', `attachment; filename=WhitelistHub-${serverId}-config.yml`);
  res.send(
    `backend-url: "${backendUrl}"\n` +
    `server-id: "${serverId}"\n` +
    `api-key: "${serverCfg.apiKey || ''}"\n`
  );
});


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

function buildBackendWsUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toString();
  const wsProto = proto === 'https' ? 'wss' : 'ws';
  return `${wsProto}://${host}/ws`;
}

function getServersConfig(cfg) {
  const servers = cfg && typeof cfg.servers === 'object' && cfg.servers ? cfg.servers : {};
  return servers;
}

function getServer(cfg, serverId) {
  const servers = getServersConfig(cfg);
  const s = servers[serverId];
  return s && typeof s === 'object' ? s : null;
}

function getUserServerRoles(cfg, discordId) {
  const servers = getServersConfig(cfg);
  const out = [];
  for (const [serverId, serverCfg] of Object.entries(servers)) {
    if (!serverCfg || typeof serverCfg !== 'object') continue;
    const members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
    const entry = members[discordId];
    if (entry && typeof entry === 'object' && typeof entry.role === 'string') {
      out.push({ serverId, role: entry.role });
    }
  }
  return out;
}

function isPlatformAdmin(cfg, discordId) {
  const adminIds = Array.isArray(cfg?.adminDiscordIds) ? cfg.adminDiscordIds : [];
  return adminIds.includes(discordId);
}

function isServerMember(cfg, serverId, discordId) {
  const serverCfg = getServer(cfg, serverId);
  if (!serverCfg) return false;
  const members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
  return !!members[discordId];
}

function requireServerMember(roleAllowlist = ['owner', 'dev', 'viewer']) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.substring(7);
      if (!validateDiscordId(token)) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const serverId = req.params.serverId;
      const cfg = await readJSON('config.json') || {};

      if (isPlatformAdmin(cfg, token)) {
        req.user = { discordId: token, isAdmin: true };
        return next();
      }

      const serverCfg = getServer(cfg, serverId);
      if (!serverCfg) {
        return res.status(404).json({ error: 'Server not found' });
      }

      const members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
      const member = members[token];
      const role = member && typeof member.role === 'string' ? member.role : null;
      if (!role || !roleAllowlist.includes(role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      req.user = { discordId: token, isAdmin: false, serverId, role };
      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

async function verifyAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const config = await readJSON('config.json');
  
  if (!config) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const legacyKey = config.minecraftApiKey;
  const legacyServerKeys = config.minecraftServers && typeof config.minecraftServers === 'object' ? config.minecraftServers : {};
  const servers = getServersConfig(config);

  const anyMatch = legacyKey && legacyKey === apiKey
    ? true
    : Object.values(legacyServerKeys).some(s => s && typeof s.apiKey === 'string' && s.apiKey === apiKey)
      || Object.values(servers).some(s => s && typeof s.apiKey === 'string' && s.apiKey === apiKey);

  if (!anyMatch) {
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
    minecraftServers: config.minecraftServers || {},
    servers: config.servers || {},
    registrationEnabled: config.registrationEnabled !== false,
    notificationChannelId: config.notificationChannelId || '',
    adminDiscordIds: allAdminIds,
    clientDiscordIds: allClientIds,
    minecraftServerId: config.minecraftServerId || 'default',
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

    if (adminIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const isAdmin = adminIds.includes(discordId);
    const servers = getUserServerRoles(fileConfig, discordId);
    const registrationEnabled = fileConfig.registrationEnabled !== false;

    res.json({
      success: true,
      user: {
        discordId,
        username: `User#${discordId.slice(-4)}`,
        avatar: null
      },
      roles: {
        isAdmin,
        servers,
        canRegister: registrationEnabled && !isAdmin && servers.length === 0
      }
    });
  } catch (error) {
    console.error('Manual auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

app.get('/api/auth/roles', rateLimit, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    if (!validateDiscordId(token)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const fileConfig = await readJSON('config.json') || {};
    const adminIds = Array.isArray(fileConfig.adminDiscordIds) ? fileConfig.adminDiscordIds : [];
    const isAdmin = adminIds.includes(token);
    const servers = getUserServerRoles(fileConfig, token);
    const registrationEnabled = fileConfig.registrationEnabled !== false;

    res.json({
      roles: {
        isAdmin,
        servers,
        canRegister: registrationEnabled && !isAdmin && servers.length === 0
      }
    });
  } catch (error) {
    console.error('Error refreshing roles:', error);
    res.status(500).json({ error: 'Failed to refresh roles' });
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
    const { botToken, minecraftApiKey, minecraftServers, servers, registrationEnabled, notificationChannelId, allowedDiscordIds, adminDiscordIds, clientDiscordIds, minecraftServerId, minecraftServerDomain, minecraftWhitelistFile, clientId } = req.body;
    
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
    
    let sanitizedMinecraftServers = currentConfig.minecraftServers || {};
    if (minecraftServers !== undefined) {
      sanitizedMinecraftServers = {};
      if (minecraftServers && typeof minecraftServers === 'object') {
        for (const [serverId, serverCfg] of Object.entries(minecraftServers)) {
          if (typeof serverId !== 'string' || serverId.trim().length === 0) continue;
          const safeServerId = sanitizeString(serverId, 100);
          const apiKeyValue = serverCfg && typeof serverCfg.apiKey === 'string' ? sanitizeString(serverCfg.apiKey, 200) : '';
          sanitizedMinecraftServers[safeServerId] = { apiKey: apiKeyValue };
        }
      }
    }

    let sanitizedServers = currentConfig.servers || {};
    if (servers !== undefined) {
      sanitizedServers = {};
      if (servers && typeof servers === 'object') {
        for (const [serverId, serverCfg] of Object.entries(servers)) {
          if (typeof serverId !== 'string' || serverId.trim().length === 0) continue;
          const safeServerId = sanitizeString(serverId, 100);

          const apiKeyValue = serverCfg && typeof serverCfg.apiKey === 'string' ? sanitizeString(serverCfg.apiKey, 200) : '';
          const nameValue = serverCfg && typeof serverCfg.name === 'string' ? sanitizeString(serverCfg.name, 100) : safeServerId;
          const ipValue = serverCfg && typeof serverCfg.ip === 'string' ? sanitizeString(serverCfg.ip, 100) : '';
          const portValueRaw = serverCfg && serverCfg.port !== undefined ? parseInt(serverCfg.port, 10) : undefined;
          const portValue = Number.isFinite(portValueRaw) && portValueRaw >= 1 && portValueRaw <= 65535 ? portValueRaw : undefined;
          const onlineModeValue = serverCfg && serverCfg.onlineMode !== undefined ? !!serverCfg.onlineMode : undefined;
          const whitelistEnabledValue = serverCfg && serverCfg.whitelistEnabled !== undefined ? !!serverCfg.whitelistEnabled : undefined;

          const clientList = Array.isArray(serverCfg?.clientDiscordIds)
            ? serverCfg.clientDiscordIds.filter(id => validateDiscordId(id))
            : [];

          const members = serverCfg?.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
          const sanitizedMembers = {};
          for (const [memberId, memberInfo] of Object.entries(members)) {
            if (!validateDiscordId(memberId)) continue;
            const role = memberInfo && typeof memberInfo.role === 'string' ? memberInfo.role : 'viewer';
            if (!['owner', 'dev', 'viewer'].includes(role)) continue;
            sanitizedMembers[memberId] = { role };
          }

          sanitizedServers[safeServerId] = {
            ...(apiKeyValue ? { apiKey: apiKeyValue } : {}),
            name: nameValue,
            ...(ipValue ? { ip: ipValue } : {}),
            ...(portValue !== undefined ? { port: portValue } : {}),
            ...(onlineModeValue !== undefined ? { onlineMode: onlineModeValue } : {}),
            ...(whitelistEnabledValue !== undefined ? { whitelistEnabled: whitelistEnabledValue } : {}),
            members: sanitizedMembers,
            clientDiscordIds: clientList
          };
        }
      }
    }

    const newConfig = {
      ...currentConfig,
      botToken: encryptedToken,
      minecraftApiKey: minecraftApiKey !== undefined ? sanitizeString(minecraftApiKey, 200) : currentConfig.minecraftApiKey,
      minecraftServers: sanitizedMinecraftServers,
      servers: sanitizedServers,
      registrationEnabled: registrationEnabled === undefined ? (currentConfig.registrationEnabled !== false) : !!registrationEnabled,
      notificationChannelId: notificationChannelId !== undefined ? notificationChannelId.trim() : currentConfig.notificationChannelId,
      allowedDiscordIds: allowedDiscordIds !== undefined ? allowedDiscordIds.filter(id => validateDiscordId(id)) : (currentConfig.allowedDiscordIds || []),
      adminDiscordIds: adminDiscordIds !== undefined ? adminDiscordIds.filter(id => validateDiscordId(id)) : (currentConfig.adminDiscordIds || []),
      clientDiscordIds: clientDiscordIds !== undefined ? clientDiscordIds.filter(id => validateDiscordId(id)) : (currentConfig.clientDiscordIds || []),
      minecraftServerId: minecraftServerId !== undefined ? sanitizeString(minecraftServerId, 100) : (currentConfig.minecraftServerId || 'default'),
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

    if (adminIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const isAdmin = adminIds.includes(discordId);
    const servers = getUserServerRoles(fileConfig, discordId);
    const isServerUser = servers.length > 0;

    const registrationEnabled = fileConfig.registrationEnabled !== false;
    const canRegister = registrationEnabled && !isAdmin && servers.length === 0;

    if (!isAdmin && !isServerUser && !canRegister) {
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
        servers,
        canRegister
      }
    });
  } catch (error) {
    console.error('Discord OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Discord' });
  }
});

app.post('/api/platform/servers', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { serverId, ownerDiscordId, whitelistEnabled } = req.body || {};
    if (!serverId || typeof serverId !== 'string') {
      return res.status(400).json({ error: 'serverId is required' });
    }
    if (!ownerDiscordId || typeof ownerDiscordId !== 'string' || !validateDiscordId(ownerDiscordId)) {
      return res.status(400).json({ error: 'ownerDiscordId is required' });
    }

    const safeServerId = sanitizeString(serverId, 100);

    const cfg = await readJSON('config.json') || {};
    cfg.servers = getServersConfig(cfg);
    if (cfg.servers[safeServerId]) {
      return res.status(409).json({ error: 'Server already exists' });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');

    cfg.servers[safeServerId] = {
      apiKey,
      whitelistEnabled: whitelistEnabled === undefined ? true : !!whitelistEnabled,
      name: safeServerId,
      members: {
        [ownerDiscordId]: { role: 'owner' }
      },
      clientDiscordIds: []
    };

    await writeJSON('config.json', cfg);
    res.json({ serverId: safeServerId, apiKey });
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

app.get('/api/platform/servers', rateLimit, requireAdmin, async (req, res) => {
  const cfg = await readJSON('config.json') || {};
  const servers = getServersConfig(cfg);
  res.json({ servers: Object.keys(servers) });
});

app.get('/api/servers/:serverId/me', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), async (req, res) => {
  const cfg = await readJSON('config.json') || {};
  const serverCfg = getServer(cfg, req.params.serverId);
  res.json({
    serverId: req.params.serverId,
    role: req.user.role || 'admin',
    whitelistEnabled: !!serverCfg?.whitelistEnabled
  });
});

app.get('/api/servers/:serverId', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), async (req, res) => {
  const { serverId } = req.params;
  const cfg = await readJSON('config.json') || {};
  const serverCfg = getServer(cfg, serverId);
  if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

  const members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
  const safeMembers = {};
  for (const [discordId, info] of Object.entries(members)) {
    if (!validateDiscordId(discordId)) continue;
    const role = info && typeof info.role === 'string' ? info.role : 'viewer';
    safeMembers[discordId] = { role };
  }

  const clientDiscordIds = Array.isArray(serverCfg.clientDiscordIds) ? serverCfg.clientDiscordIds.filter(id => validateDiscordId(id)) : [];

  res.json({
    serverId,
    whitelistEnabled: !!serverCfg.whitelistEnabled,
    members: safeMembers,
    clientDiscordIds,
    connected: wsHub.listServers().some(s => s.serverId === serverId),
    onboardingCompleted: !!serverCfg.onboardingCompleted
  });
});

app.post('/api/servers/:serverId/onboarding/complete', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner', 'dev']), async (req, res) => {
  try {
    const { serverId } = req.params;
    const connected = wsHub.listServers().some(s => s.serverId === serverId);
    if (!connected) {
      return res.status(409).json({ error: 'Minecraft server not connected' });
    }

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    serverCfg.onboardingCompleted = true;
    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ success: true, serverId, onboardingCompleted: true });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

app.get('/api/servers/:serverId/state', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), (req, res) => {
  const { serverId } = req.params;
  res.json({ serverId, state: wsHub.getServerState(serverId) });
});

app.get('/api/servers/:serverId/events', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), (req, res) => {
  const { serverId } = req.params;
  const limit = parseInt(req.query.limit || '100', 10);
  res.json({ serverId, events: wsHub.getServerEvents(serverId, limit) });
});

app.get('/api/servers/:serverId/members', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner', 'dev']), async (req, res) => {
  const { serverId } = req.params;
  const cfg = await readJSON('config.json') || {};
  const serverCfg = getServer(cfg, serverId);
  if (!serverCfg) return res.status(404).json({ error: 'Server not found' });
  const members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
  res.json({ serverId, members });
});

app.post('/api/servers/:serverId/members', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner']), async (req, res) => {
  try {
    const { serverId } = req.params;
    const { discordId, role } = req.body || {};
    if (!discordId || !validateDiscordId(discordId)) return res.status(400).json({ error: 'Invalid discordId' });
    if (!role || !['owner', 'dev', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    serverCfg.members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
    serverCfg.members[discordId] = { role };
    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.put('/api/servers/:serverId/members/:discordId', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner']), async (req, res) => {
  try {
    const { serverId, discordId } = req.params;
    const { role } = req.body || {};
    if (!validateDiscordId(discordId)) return res.status(400).json({ error: 'Invalid discordId' });
    if (!role || !['owner', 'dev', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    serverCfg.members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
    if (!serverCfg.members[discordId]) return res.status(404).json({ error: 'Member not found' });
    serverCfg.members[discordId] = { role };
    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

app.delete('/api/servers/:serverId/members/:discordId', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner']), async (req, res) => {
  try {
    const { serverId, discordId } = req.params;
    if (!validateDiscordId(discordId)) return res.status(400).json({ error: 'Invalid discordId' });

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    serverCfg.members = serverCfg.members && typeof serverCfg.members === 'object' ? serverCfg.members : {};
    if (!serverCfg.members[discordId]) return res.status(404).json({ error: 'Member not found' });
    delete serverCfg.members[discordId];
    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

app.put('/api/servers/:serverId/settings', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner', 'dev']), async (req, res) => {
  try {
    const { serverId } = req.params;
    const { whitelistEnabled } = req.body || {};

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    if (whitelistEnabled !== undefined) {
      serverCfg.whitelistEnabled = !!whitelistEnabled;
    }

    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ success: true, whitelistEnabled: !!serverCfg.whitelistEnabled });
  } catch (error) {
    console.error('Error updating server settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.put('/api/servers/:serverId/clients', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner', 'dev']), async (req, res) => {
  try {
    const { serverId } = req.params;
    const { clientDiscordIds } = req.body || {};
    if (!Array.isArray(clientDiscordIds)) return res.status(400).json({ error: 'clientDiscordIds must be an array' });
    if (!clientDiscordIds.every(id => validateDiscordId(id))) return res.status(400).json({ error: 'Invalid Discord ID in list' });

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    serverCfg.clientDiscordIds = clientDiscordIds;
    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating client allowlist:', error);
    res.status(500).json({ error: 'Failed to update clients' });
  }
});

app.post('/api/servers/:serverId/key', rateLimit, requireServerMember(['owner', 'dev', 'viewer']), requireServerRole(['owner']), async (req, res) => {
  try {
    const { serverId } = req.params;
    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    const apiKey = crypto.randomBytes(32).toString('hex');
    serverCfg.apiKey = apiKey;
    cfg.servers = getServersConfig(cfg);
    cfg.servers[serverId] = serverCfg;
    await writeJSON('config.json', cfg);

    res.json({ serverId, apiKey });
  } catch (error) {
    console.error('Error rotating server api key:', error);
    res.status(500).json({ error: 'Failed to rotate key' });
  }
});

app.get('/api/servers/:serverId/requests', rateLimit, requireServerMember(['owner', 'dev']), async (req, res) => {
  const { serverId } = req.params;
  const requests = await readJSON('requests.json') || [];
  res.json(requests.filter(r => r.serverId === serverId));
});

app.put('/api/servers/:serverId/requests/:id', rateLimit, requireServerMember(['owner', 'dev']), async (req, res) => {
  try {
    const { serverId, id } = req.params;
    const { status, minecraftUsername } = req.body || {};

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (minecraftUsername && !validateMinecraftUsername(minecraftUsername)) {
      return res.status(400).json({ error: 'Invalid Minecraft username format' });
    }

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) return res.status(404).json({ error: 'Server not found' });

    const requests = await readJSON('requests.json') || [];
    const idx = requests.findIndex(r => r.id === id && r.serverId === serverId);
    if (idx === -1) return res.status(404).json({ error: 'Request not found' });

    if (status === 'approved') {
      const finalUsername = minecraftUsername || requests[idx].minecraftUsername;
      if (!finalUsername) return res.status(400).json({ error: 'Minecraft username required' });
      if (!serverCfg.whitelistEnabled) return res.status(400).json({ error: 'Whitelist is disabled for this server' });
      const ok = wsHub.whitelistAddTo(serverId, finalUsername);
      if (!ok) {
        return res.status(409).json({ error: 'Minecraft server not connected' });
      }
      requests[idx].status = 'approved';
      requests[idx].minecraftUsername = finalUsername;
      requests[idx].approvedAt = new Date().toISOString();
      requests[idx].approvedBy = req.user.discordId;
    } else {
      requests[idx].status = 'rejected';
      requests[idx].rejectedAt = new Date().toISOString();
      requests[idx].rejectedBy = req.user.discordId;
    }

    await writeJSON('requests.json', requests);
    res.json(requests[idx]);
  } catch (error) {
    console.error('Error updating server request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

app.post('/api/servers/:serverId/requests', rateLimit, async (req, res) => {
  try {
    const { serverId } = req.params;
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

    const cfg = await readJSON('config.json') || {};
    const serverCfg = getServer(cfg, serverId);
    if (!serverCfg) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const allow = Array.isArray(serverCfg.clientDiscordIds) ? serverCfg.clientDiscordIds : [];
    if (allow.length === 0 || !allow.includes(discordId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requests = await readJSON('requests.json') || [];
    const existing = requests.find(r => r.discordId === discordId && r.serverId === serverId && r.status === 'pending');
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending request' });
    }

    const newRequest = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      serverId,
      discordId: discordId.trim(),
      discordUsername: sanitizeString(discordUsername, 100),
      minecraftUsername: minecraftUsername ? minecraftUsername.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    requests.push(newRequest);
    await writeJSON('requests.json', requests);

    res.json(newRequest);
  } catch (error) {
    console.error('Error creating server request:', error);
    res.status(500).json({ error: 'Failed to create request' });
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
          const cfg = await readJSON('config.json') || {};
          const targetServerId = cfg.minecraftServerId || 'default';
          const ok = wsHub.whitelistAddTo(targetServerId, finalUsername);
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

app.get('/api/minecraft/servers', rateLimit, requireAdmin, (req, res) => {
  res.json({ servers: wsHub.listServers() });
});

app.get('/api/minecraft/servers/:serverId/state', rateLimit, requireAdmin, (req, res) => {
  const { serverId } = req.params;
  res.json({ serverId, state: wsHub.getServerState(serverId) });
});

app.get('/api/minecraft/servers/:serverId/events', rateLimit, requireAdmin, (req, res) => {
  const { serverId } = req.params;
  const limit = parseInt(req.query.limit || '100', 10);
  res.json({ serverId, events: wsHub.getServerEvents(serverId, limit) });
});

app.get('/api/minecraft/servers/config', rateLimit, requireAdmin, async (req, res) => {
  const config = await readJSON('config.json') || {};
  res.json({ minecraftServers: config.minecraftServers || {} });
});

app.post('/api/minecraft/servers/:serverId/key', rateLimit, requireAdmin, async (req, res) => {
  try {
    const { serverId } = req.params;
    if (!serverId || typeof serverId !== 'string' || serverId.length > 100) {
      return res.status(400).json({ error: 'Invalid serverId' });
    }

    const cfg = await readJSON('config.json') || {};
    const servers = cfg.minecraftServers && typeof cfg.minecraftServers === 'object' ? cfg.minecraftServers : {};

    const bytes = require('crypto').randomBytes(32);
    const key = bytes.toString('hex');

    servers[serverId] = { apiKey: key };
    cfg.minecraftServers = servers;
    await writeJSON('config.json', cfg);

    res.json({ serverId, apiKey: key });
  } catch (error) {
    console.error('Error generating server api key:', error);
    res.status(500).json({ error: 'Failed to generate key' });
  }
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
