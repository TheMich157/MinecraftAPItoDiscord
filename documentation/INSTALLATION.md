# Complete Installation Guide

Comprehensive step-by-step instructions for installing and configuring the Minecraft Whitelist Dashboard system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- **Node.js 16 or higher** - [Download](https://nodejs.org/)
- **npm** (included with Node.js)
- **Git** (optional, for version control)
- **Discord Account** with server management permissions
- **Minecraft Server** (any type: Vanilla, Paper, Spigot, etc.)

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should show v16.0.0 or higher

# Check npm version
npm --version
# Should show 7.0.0 or higher
```

## System Requirements

### Minimum Requirements

- **CPU:** 1 core
- **RAM:** 512MB (1GB recommended)
- **Storage:** 100MB free space
- **Network:** Internet connection for Discord API

### Recommended Requirements

- **CPU:** 2+ cores
- **RAM:** 2GB+
- **Storage:** 500MB+ free space
- **Network:** Stable internet connection

## Installation Steps

### Step 1: Download/Clone Project

**Option A: Using Git**
```bash
git clone <your-repository-url>
cd MinecraftAPItoDiscord
```

**Option B: Download ZIP**
1. Download project ZIP file
2. Extract to desired location
3. Open terminal in extracted folder

### Step 2: Install Dependencies

Install all required dependencies for each component:

```bash
# Install root dependencies (concurrently for running multiple services)
npm install

# Install API server dependencies
cd api
npm install
cd ..

# Install Discord bot dependencies
cd bot
npm install
cd ..

# Install dashboard dependencies
cd dashboard
npm install
cd ..

# Install Minecraft server API dependencies (optional, for server integration)
cd minecraft-server
npm install
cd ..
```

**Verification:**
- Check for `node_modules` folders in each directory
- No error messages during installation

### Step 3: Create Discord Bot

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Create New Application**
   - Click "New Application"
   - Name: "Minecraft Whitelist Bot" (or your preferred name)
   - Click "Create"

3. **Create Bot**
   - Go to "Bot" section in left sidebar
   - Click "Add Bot"
   - Confirm by clicking "Yes, do it!"

4. **Configure Bot**
   - Under "Token", click "Reset Token"
   - Copy the token (save it securely - you'll need it later)
   - Scroll down to "Privileged Gateway Intents"
   - Enable "Message Content Intent" (required for `!ip` command)

5. **Generate Invite URL**
   - Go to "OAuth2" → "URL Generator" in left sidebar
   - Under "Scopes", select:
     - `bot`
     - `applications.commands`
   - Under "Bot Permissions", select:
     - Send Messages
     - Read Message History
     - Use Slash Commands
   - Copy the generated URL at the bottom

6. **Invite Bot to Server**
   - Open the copied URL in your browser
   - Select your Discord server
   - Click "Authorize"
   - Complete CAPTCHA if prompted

### Step 4: Get Discord IDs

1. **Enable Developer Mode**
   - Open Discord Settings (gear icon)
   - Go to "Advanced"
   - Enable "Developer Mode"

2. **Get Channel ID**
   - Right-click on the channel where you want whitelist notifications
   - Click "Copy ID"
   - Save this ID (you'll need it for configuration)

3. **Get User IDs**
   - Right-click on each user who should have access to the client dashboard
   - Click "Copy ID" for each user
   - Save these IDs (one per line for configuration)

### Step 5: Start Services

Open **four separate terminal windows/tabs**:

**Terminal 1 - API Server:**
```bash
cd api
npm run dev
```
Expected output: `API server running on port 3001`

**Terminal 2 - Dashboard:**
```bash
cd dashboard
npm start
```
Browser should automatically open to http://localhost:3000

**Terminal 3 - Discord Bot:**
```bash
cd bot
npm run dev
```
Expected output: `Bot logged in as [YourBotName]`

**Terminal 4 - Minecraft Server API (Optional):**
```bash
cd minecraft-server
npm start
```
Expected output: `Minecraft Whitelist API running on port 3003`

### Step 6: Initial Configuration

1. **Access Dashboard**
   - Open http://localhost:3000 in your browser
   - If it doesn't open automatically, navigate manually

2. **Developer Login**
   - Click the "Developer Access" tab
   - Enter developer key: `dev2024`
   - Click "Login"
   - **Important:** Change this key in production!

3. **Configure System**
   - Go to "Configuration" tab
   - Fill in all required fields:

   **Discord Bot Token:**
   - Paste the bot token from Step 3
   - This is the token you copied from Discord Developer Portal

   **Minecraft Server API Key:**
   - Click "Generate" button to create a secure API key
   - Click "Copy" to copy the generated key
   - **Save this key** - you'll need it for Minecraft server configuration

   **Notification Channel ID:**
   - Paste the channel ID from Step 4
   - This is where whitelist notifications will be sent

   **Allowed Discord IDs:**
   - Enter Discord user IDs (one per line)
   - These users can access the client dashboard
   - Each ID should be on its own line

   **Minecraft Server Domain/URL:**
   - If running locally: `http://localhost:3003`
   - If on different machine: `http://your-server-ip:3003`
   - If using domain: `https://your-domain.com`

   **Minecraft Whitelist File Path:**
   - Optional: Path to whitelist.json on your server
   - Examples:
     - `./whitelist.json` (relative path)
     - `/home/user/minecraft/server/whitelist.json` (Linux absolute)
     - `C:\Users\YourName\minecraft\whitelist.json` (Windows absolute)

   **Minecraft Server IP:**
   - Enter the IP address players will use to connect
   - Examples:
     - `play.example.com`
     - `192.168.1.100:25565`
     - `mc.yourserver.com`

4. **Save Configuration**
   - Click "Save Configuration" button
   - Wait for success message
   - Configuration is saved to `data/config.json`

### Step 7: Configure Minecraft Server API

1. **Navigate to Minecraft Server Folder**
   ```bash
   cd minecraft-server
   ```

2. **Create Environment File**
   ```bash
   # Copy example file
   cp .env.example .env
   ```

3. **Edit Environment File**
   Open `.env` in a text editor and configure:

   ```bash
   # Required: API key from dashboard (Step 6)
   MINECRAFT_API_KEY=paste-your-generated-api-key-here

   # Optional: Port for API server (default: 3003)
   MINECRAFT_API_PORT=3003

   # Required: Path to your whitelist.json file
   # Find your whitelist.json location:
   # - Vanilla/Paper: Usually in server root directory
   # - Single player: Check Minecraft saves folder
   WHITELIST_FILE=./whitelist.json

   # Optional: Server mode
   # 'online' for Mojang servers, 'offline' for cracked servers
   SERVER_MODE=online

   # Optional: RCON configuration (for Paper/Spigot)
   # See documentation/RCON_SETUP.md for details
   RCON_ENABLED=false
   RCON_HOST=localhost
   RCON_PORT=25575
   RCON_PASSWORD=your-rcon-password
   ```

4. **Start Minecraft API Server**
   ```bash
   npm start
   ```

   Expected output:
   ```
   Minecraft Whitelist API running on port 3003
   API Key: your-key...
   Whitelist file: ./whitelist.json
   Server mode: online
   ```

## Verification

### Test Bot Commands

1. **Test `!ip` Command**
   - In Discord, type: `!ip`
   - Bot should respond with server IP

2. **Test Slash Command**
   - In Discord, type: `/requestwhitelist`
   - Add optional parameter: `minecraft_username:TestPlayer`
   - Bot should respond with success message

### Test Dashboard

1. **Client Login**
   - Log out of developer account
   - Click "Client Login" tab
   - Enter your Discord ID (from allowed IDs list)
   - Click "Login"
   - Should see client dashboard

2. **Submit Request**
   - Enter Minecraft username
   - Click "Submit Request"
   - Should see success message

3. **View Request**
   - Request should appear in "My Requests" section
   - Status should be "pending"

### Test Admin Panel

1. **Login as Developer**
   - Use developer key to login
   - Go to "Whitelist Requests" tab

2. **Approve Request**
   - Find your test request
   - Enter/confirm Minecraft username
   - Click "Approve"
   - Should see success message

3. **Verify Minecraft Server**
   - Check Minecraft API server logs
   - Should see: `Added TestPlayer to whitelist`
   - Check `whitelist.json` file
   - User should be in the file

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**
- Solution: Run `npm install` in the specific folder
- Check Node.js version: `node --version` (should be 16+)
- Delete `node_modules` and `package-lock.json`, then reinstall

**Bot not responding:**
- Check bot token is correct in dashboard config
- Verify bot is online in Discord (green dot)
- Check "Message Content Intent" is enabled in Discord Developer Portal
- Review bot console for error messages

**Dashboard won't load:**
- Ensure API server is running on port 3001
- Check browser console for errors (F12)
- Verify port 3000 is not in use by another application
- Try clearing browser cache

**API connection errors:**
- Verify `API_URL` is correct in all services
- Check CORS settings in API server
- Ensure firewall allows connections
- Test API health: `curl http://localhost:3001/api/health`

**Slash commands not appearing:**
- Wait 5-10 minutes (Discord caches commands globally)
- Re-invite bot with `applications.commands` scope
- Check bot console for registration errors
- Verify bot has proper permissions in server

**Minecraft server not receiving requests:**
- Verify Minecraft API server is running
- Check API key matches in both dashboard and Minecraft server
- Test API endpoint manually:
  ```bash
  curl -X POST http://localhost:3003/api/whitelist/add \
    -H "X-API-Key: your-api-key" \
    -H "Content-Type: application/json" \
    -d '{"username":"TestPlayer"}'
  ```
- Check Minecraft API server logs
- Verify whitelist file path is correct
- Ensure file permissions allow write access

### Getting Help

If you encounter issues:

1. **Check Logs**
   - Review console output for all services
   - Look for error messages
   - Check browser console (F12)

2. **Verify Configuration**
   - Ensure all required fields are filled
   - Verify API keys match
   - Check environment variables

3. **Review Documentation**
   - See `documentation/TROUBLESHOOTING.md` for detailed solutions
   - Check `README.md` for general information
   - Review component-specific documentation

4. **Common Solutions**
   - Restart all services
   - Clear browser cache
   - Verify network connectivity
   - Check file permissions

## Next Steps

After successful installation:

1. **Security Hardening**
   - Change default developer key
   - Use strong, unique API keys
   - Review security settings
   - See `documentation/SECURITY.md`

2. **Production Deployment**
   - Set up production environment
   - Configure HTTPS
   - Set up monitoring
   - See `README.md` deployment section

3. **Backup Configuration**
   - Backup `data/` directory regularly
   - Store backups securely
   - Test restore procedures

4. **Monitoring**
   - Set up log monitoring
   - Configure alerts
   - Review audit logs regularly

## Additional Resources

- **Quick Start:** See `documentation/QUICK_START.md` for 5-minute setup
- **Architecture:** See `documentation/PROJECT_STRUCTURE.md` for system overview
- **Security:** See `documentation/SECURITY.md` for security best practices
- **Minecraft Integration:** See `minecraft-server/README.md` for server setup
