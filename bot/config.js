const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  botPort: parseInt(process.env.BOT_PORT || '3002', 10),
  discordClientId: process.env.DISCORD_CLIENT_ID || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  rcon: {
    enabled: process.env.RCON_ENABLED === 'true',
    host: process.env.RCON_HOST || 'localhost',
    port: parseInt(process.env.RCON_PORT || '25575', 10),
    password: process.env.RCON_PASSWORD || ''
  },
  
  console: {
    mirrorEnabled: process.env.CONSOLE_MIRROR_ENABLED === 'true',
    logFilePath: process.env.MINECRAFT_LOG_FILE || null,
    serverPath: process.env.MINECRAFT_SERVER_PATH || null
  },
  
  dashboard: {
    url: process.env.DASHBOARD_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://manihub.xyz' 
      : 'http://localhost:3000')
  }
};

function validateConfig() {
  const errors = [];
  
  if (!config.apiUrl) {
    errors.push('API_URL is required');
  }
  
  if (errors.length > 0) {
    console.error('Bot configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  return true;
}

module.exports = {
  config,
  validateConfig
};
