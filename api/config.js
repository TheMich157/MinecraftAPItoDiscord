const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback'
  },
  
  dashboard: {
    url: process.env.DASHBOARD_URL || 'http://localhost:3000'
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || ''
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  notifySecret: process.env.NOTIFY_SECRET || ''
};

function validateConfig() {
  const errors = [];
  
  if (!config.encryption.key || config.encryption.key.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  if (config.nodeEnv === 'production') {
    if (!config.discord.clientId) {
      errors.push('DISCORD_CLIENT_ID is required in production');
    }
    if (!config.discord.clientSecret) {
      errors.push('DISCORD_CLIENT_SECRET is required in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    if (config.nodeEnv === 'production') {
      throw new Error('Invalid configuration. Please check your environment variables.');
    } else {
      console.warn('Running in development mode with missing configuration.');
    }
  }
  
  return errors.length === 0;
}

module.exports = {
  config,
  validateConfig
};
