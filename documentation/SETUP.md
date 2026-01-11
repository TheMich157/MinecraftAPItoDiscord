# Setup Guide

Quick reference guide for setting up the Minecraft Whitelist Dashboard.

## Prerequisites

- Node.js 16+ installed
- Discord Bot created and token ready
- Discord Server where bot will operate
- Minecraft server (any type)

## Quick Setup Steps

### 1. Install Dependencies

```bash
# Root
npm install

# API
cd api && npm install && cd ..

# Bot
cd bot && npm install && cd ..

# Dashboard
cd dashboard && npm install && cd ..

# Minecraft Server API (optional)
cd minecraft-server && npm install && cd ..
```

### 2. Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it and create
4. Go to "Bot" section → "Add Bot"
5. Under "Token", click "Reset Token" and copy it
6. Enable "Message Content Intent" under Privileged Gateway Intents
7. Go to "OAuth2" → "URL Generator"
8. Select scopes: `bot`, `applications.commands`
9. Select permissions: `Send Messages`, `Read Message History`
10. Copy the generated URL and invite bot to your server

### 3. Get Discord Channel ID

1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on the channel where you want notifications
3. Click "Copy ID"

### 4. Initial Configuration

1. Start the API server:
   ```bash
   cd api
   npm run dev
   ```

2. In another terminal, start the dashboard:
   ```bash
   cd dashboard
   npm start
   ```

3. Open http://localhost:3000 in your browser

4. Login as Developer:
   - Click "Developer Access" tab
   - Enter key: `dev2024` (change this in production!)

5. Go to "Configuration" tab and fill in:
   - **Discord Bot Token**: Paste your bot token
   - **Minecraft Server API Key**: Click "Generate", then "Copy"
   - **Notification Channel ID**: Paste the channel ID from step 3
   - **Allowed Discord IDs**: Add Discord IDs (one per line) of users who can request whitelist
   - **Minecraft Server Domain**: Your Minecraft server API URL (e.g., `http://localhost:3003`)
   - **Minecraft Server IP**: The IP shown by `!ip` command (e.g., `play.example.com`)

6. Click "Save Configuration"

### 5. Start the Discord Bot

In a new terminal:
```bash
cd bot
npm run dev
```

The bot should now:
- Login successfully
- Register slash commands
- Respond to `!ip` command
- Handle `/requestwhitelist` commands

### 6. Set Up Minecraft Server API

1. Navigate to minecraft-server folder:
   ```bash
   cd minecraft-server
   ```

2. Create .env file:
   ```bash
   cp .env.example .env
   ```

3. Edit .env:
   ```bash
   MINECRAFT_API_KEY=<paste-api-key-from-dashboard>
   MINECRAFT_API_PORT=3003
   WHITELIST_FILE=./whitelist.json
   SERVER_MODE=online
   ```

4. Start the API:
   ```bash
   npm start
   ```

## Test the System

1. Use `!ip` in Discord - should show server IP
2. Use `/requestwhitelist` in Discord - should create a request
3. Check dashboard - request should appear
4. Approve request in admin panel - should notify user and Minecraft server

## Production Deployment

### Environment Variables

Set these in your Render dashboard or `.env` files:

**API Service:**
- `PORT=3001`
- `API_URL=https://your-api.onrender.com`
- `NODE_ENV=production`

**Bot Service:**
- `API_URL=https://your-api.onrender.com`
- `BOT_PORT=3002`
- `BOT_URL=https://your-bot.onrender.com` (if bot has web service)
- `NODE_ENV=production`

### Render Deployment

1. Push code to GitHub
2. Connect repository to Render
3. Render will auto-detect `render.yaml`
4. Update environment variables in Render dashboard
5. Deploy both services

### Security Checklist

- [ ] Change default developer key
- [ ] Use strong, unique API keys
- [ ] Never commit `data/*.json` files
- [ ] Use HTTPS in production
- [ ] Regularly rotate tokens and keys
- [ ] Limit allowed Discord IDs

## Troubleshooting

### Bot not responding
- Check bot token is correct
- Verify bot is online in Discord
- Check bot has proper permissions
- Ensure "Message Content Intent" is enabled

### Slash commands not appearing
- Wait 5-10 minutes (Discord caches commands)
- Re-invite bot with `applications.commands` scope
- Check bot console for registration errors

### API connection errors
- Verify API_URL is correct
- Check CORS settings
- Ensure API server is running
- Check firewall/network settings

### Dashboard not loading
- Check API server is running
- Verify API_URL in dashboard
- Check browser console for errors

## Next Steps

- See `documentation/INSTALLATION.md` for detailed setup
- See `documentation/SECURITY.md` for security best practices
- See `documentation/INTEGRATION_GUIDE.md` for Minecraft server setup
- See main `README.md` for complete documentation
