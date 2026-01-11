const { config: envConfig } = require('./config');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJSON(file) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
}

function validateDiscordId(id) {
  if (typeof id !== 'string') return false;
  return /^\d{17,19}$/.test(id.trim());
}

function validateMinecraftUsername(username) {
  if (typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,16}$/.test(username.trim());
}

function validateUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(parsed.hostname)) {
      const parts = parsed.hostname.split('.').map(Number);
      return parts.every(part => part >= 0 && part <= 255);
    }
    return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const config = await readJSON('config.json') || {};
    
    const envAdminIds = envConfig.access.adminDiscordIds || [];
    const fileAdminIds = config.adminDiscordIds || [];
    const adminIds = [...new Set([...envAdminIds, ...fileAdminIds])];

    if (adminIds.length === 0) {
      return res.status(403).json({ error: 'No admin users configured' });
    }

    if (!adminIds.includes(token)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    req.user = { discordId: token };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
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

module.exports = {
  sanitizeString,
  validateDiscordId,
  validateMinecraftUsername,
  validateUrl,
  requireAdmin,
  rateLimit
};
