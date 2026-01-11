const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const configCache = {
  data: null,
  timestamp: 0,
  ttl: 30000
};

const ipCache = {
  data: null,
  timestamp: 0,
  ttl: 60000
};

async function readConfig(cache = true) {
  if (cache && configCache.data && Date.now() - configCache.timestamp < configCache.ttl) {
    return configCache.data;
  }

  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'config.json'), 'utf8');
    const config = JSON.parse(data);
    
    if (config.botToken) {
      try {
        const { decrypt } = require('../api/crypto-utils');
        config.botToken = decrypt(config.botToken);
      } catch (error) {
        console.error('Failed to decrypt bot token:', error);
      }
    }
    
    if (cache) {
      configCache.data = config;
      configCache.timestamp = Date.now();
    }
    
    return config;
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
}

async function getServerIP(cache = true) {
  if (cache && ipCache.data && Date.now() - ipCache.timestamp < ipCache.ttl) {
    return ipCache.data;
  }

  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'server.json'), 'utf8');
    const server = JSON.parse(data);
    const ip = server.ip || 'Not configured';
    
    if (cache) {
      ipCache.data = ip;
      ipCache.timestamp = Date.now();
    }
    
    return ip;
  } catch (error) {
    return 'Not configured';
  }
}

function validateMinecraftUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_]{3,16}$/.test(username.trim());
}

function escapeDiscordMarkdown(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/([*_~`|\\>])/g, '\\$1');
}

function truncateText(text, maxLength = 2000) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function formatCodeBlock(content, language = '') {
  const code = truncateText(content, 1990);
  return `\`\`\`${language}\n${code}\`\`\``;
}

function parseCommand(commandString) {
  if (!commandString || typeof commandString !== 'string') {
    return { command: '', args: [] };
  }
  
  const parts = commandString.trim().split(/\s+/);
  return {
    command: parts[0] || '',
    args: parts.slice(1)
  };
}

function createErrorEmbed(title, description, error = null) {
  const { EmbedBuilder } = require('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(0xff0000)
    .setTimestamp();
  
  if (error && error.message) {
    embed.addFields({
      name: 'Error Details',
      value: truncateText(escapeDiscordMarkdown(error.message), 1024),
      inline: false
    });
  }
  
  return embed;
}

function createSuccessEmbed(title, description, fields = []) {
  const { EmbedBuilder } = require('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(0x00ff00)
    .setTimestamp();
  
  if (Array.isArray(fields) && fields.length > 0) {
    fields.forEach(field => {
      if (field && field.name && field.value) {
        embed.addFields({
          name: field.name,
          value: truncateText(field.value, 1024),
          inline: field.inline !== false
        });
      }
    });
  }
  
  return embed;
}

function createInfoEmbed(title, description, fields = [], color = 0x3498db) {
  const { EmbedBuilder } = require('discord.js');
  
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  
  if (Array.isArray(fields) && fields.length > 0) {
    fields.forEach(field => {
      if (field && field.name && field.value) {
        embed.addFields({
          name: field.name,
          value: truncateText(field.value, 1024),
          inline: field.inline !== false
        });
      }
    });
  }
  
  return embed;
}

function paginateArray(array, page = 1, perPage = 10) {
  const totalPages = Math.ceil(array.length / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const items = array.slice(startIndex, endIndex);
  
  return {
    items,
    page,
    perPage,
    totalPages,
    totalItems: array.length,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

function formatList(items, maxLength = 2000) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No items found.';
  }
  
  const list = items.join(', ');
  if (list.length <= maxLength) {
    return list;
  }
  
  const truncated = items.slice(0, Math.floor(maxLength / 12));
  return truncated.join(', ') + `\n... and ${items.length - truncated.length} more`;
}

const commandCooldowns = new Map();

function checkCooldown(userId, command, cooldownMs = 3000) {
  const key = `${userId}:${command}`;
  const now = Date.now();
  
  if (commandCooldowns.has(key)) {
    const lastUsed = commandCooldowns.get(key);
    const timeLeft = cooldownMs - (now - lastUsed);
    
    if (timeLeft > 0) {
      return Math.ceil(timeLeft / 1000);
    }
  }
  
  commandCooldowns.set(key, now);
  
  setTimeout(() => {
    commandCooldowns.delete(key);
  }, cooldownMs);
  
  return 0;
}

function clearCache(type = 'all') {
  if (type === 'all' || type === 'config') {
    configCache.data = null;
    configCache.timestamp = 0;
  }
  
  if (type === 'all' || type === 'ip') {
    ipCache.data = null;
    ipCache.timestamp = 0;
  }
}

function logAction(action, userId, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[ACTION] ${timestamp} | ${action} | User: ${userId} | ${JSON.stringify(details)}`);
}

module.exports = {
  readConfig,
  getServerIP,
  validateMinecraftUsername,
  escapeDiscordMarkdown,
  truncateText,
  formatCodeBlock,
  parseCommand,
  createErrorEmbed,
  createSuccessEmbed,
  createInfoEmbed,
  paginateArray,
  formatList,
  checkCooldown,
  clearCache,
  logAction
};
