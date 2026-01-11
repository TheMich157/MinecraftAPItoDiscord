const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { encrypt, decrypt } = require('./crypto-utils');
const { config: envConfig, validateConfig } = require('./config');
const { sanitizeString, validateDiscordId, validateMinecraftUsername, validateUrl, requireAdmin, rateLimit } = require('./middleware');

const app = express();
const PORT = envConfig.port;

const DISCORD_CLIENT_ID = envConfig.discord.clientId;
const DISCORD_CLIENT_SECRET = envConfig.discord.clientSecret;
const DISCORD_REDIRECT_URI = envConfig.discord.redirectUri;
const DASHBOARD_URL = envConfig.dashboard.url;
const BOT_URL = envConfig.bot.url;

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
  
  const envAdminIds = envConfig.access.adminDiscordIds || [];
  const envClientIds = envConfig.access.clientDiscordIds || [];
  
  const fileAdminIds = config.adminDiscordIds || [];
  const fileClientIds = config.clientDiscordIds || config.allowedDiscordIds || [];
  
  const allAdminIds = [...new Set([...envAdminIds, ...fileAdminIds])];
  const allClientIds = envClientIds.length > 0 ? envClientIds : fileClientIds;
  
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
    envAdminDiscordIds: envAdminIds,
    envClientDiscordIds: envClientIds,
    minecraftServerDomain: config.minecraftServerDomain || '',
    minecraftWhitelistFile: config.minecraftWhitelistFile || '',
    clientId: config.clientId || '',
    discordClientId: DISCORD_CLIENT_ID,
    discordRedirectUri: DISCORD_REDIRECT_URI
  });
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
    
    const envAdminIds = envConfig.access.adminDiscordIds || [];
    const envClientIds = envConfig.access.clientDiscordIds || [];
    
    const fileAdminIds = fileConfig.adminDiscordIds || [];
    const fileClientIds = fileConfig.clientDiscordIds || fileConfig.allowedDiscordIds || [];
    
    const adminIds = [...new Set([...envAdminIds, ...fileAdminIds])];
    const clientIds = envClientIds.length > 0 ? envClientIds : fileClientIds;
    
    const isAdmin = adminIds.length > 0 && adminIds.includes(discordId);
    const isClient = clientIds.length === 0 || clientIds.includes(discordId);
    
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
      const config = await readJSON('config.json');
      
      if (config && config.minecraftServerDomain && finalUsername) {
        if (!validateUrl(config.minecraftServerDomain)) {
          console.error('Invalid Minecraft server domain URL');
        } else {
          try {
            const url = new URL(config.minecraftServerDomain);
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.') || url.hostname.startsWith('172.')) {
              const response = await axios.post(`${config.minecraftServerDomain}/api/whitelist/add`, {
                username: finalUsername
              }, {
                headers: {
                  'X-API-Key': config.minecraftApiKey
                },
                timeout: 10000,
                maxRedirects: 0
              });
              console.log(`Successfully added ${finalUsername} to Minecraft whitelist`);
            } else {
              console.warn('Minecraft server domain must be localhost or private IP for security');
            }
          } catch (error) {
            console.error('Error notifying Minecraft server:', error.response?.data || error.message);
          }
        }
      }
      
      try {
        await axios.post(`${BOT_URL}/notify`, {
          type: 'approval',
          userId: requests[requestIndex].discordId,
          discordUsername: requests[requestIndex].discordUsername,
          minecraftUsername: finalUsername,
          message: `Your whitelist request has been approved!`
        }, {
          headers: {
            'Authorization': `Bearer ${envConfig.notifySecret || process.env.NOTIFY_SECRET || 'change-this-secret'}`
          },
          timeout: 5000
        }).catch(() => {
          console.log('Bot notification server not available');
        });
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

app.post('/api/auth/developer', rateLimit, async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key || typeof key !== 'string' || key.length > 200) {
      return res.status(400).json({ success: false, error: 'Invalid key format' });
    }
    
    if (key === envConfig.developerKey) {
      res.json({ 
        success: true, 
        discordId: 'dev',
        username: 'Developer'
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid developer key' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

ensureDataDir().then(() => {
  if (validateConfig()) {
    console.log('Configuration validated successfully');
  }
  
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Environment: ${envConfig.nodeEnv}`);
    if (envConfig.nodeEnv === 'development') {
      console.log(`Dashboard URL: ${DASHBOARD_URL}`);
      console.log(`Discord OAuth: ${DISCORD_CLIENT_ID ? 'Configured' : 'Not configured'}`);
    }
  });
});
