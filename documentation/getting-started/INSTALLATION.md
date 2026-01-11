# Complete Installation Guide

This comprehensive guide will walk you through installing and configuring the Minecraft Whitelist Dashboard from scratch. Follow these steps carefully for a successful setup.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Step 1: Download and Install](#step-1-download-and-install)
4. [Step 2: Create Discord Bot](#step-2-create-discord-bot)
5. [Step 3: Get Discord IDs](#step-3-get-discord-ids)
6. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
7. [Step 5: Initial Dashboard Configuration](#step-5-initial-dashboard-configuration)
8. [Step 6: Connect Minecraft Server](#step-6-connect-minecraft-server)
9. [Step 7: Test Everything](#step-7-test-everything)
10. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before starting, ensure you have everything you need:

### Required Software

- **Node.js 16 or higher** - [Download here](https://nodejs.org/)
  - Includes npm (Node Package Manager)
  - Choose LTS (Long Term Support) version for stability
  
- **npm** - Comes with Node.js, but verify it's installed:
  ```bash
  npm --version
  # Should show 7.0.0 or higher
  ```

- **Git** (optional) - For version control and cloning repositories
  - [Download here](https://git-scm.com/)

### Required Accounts and Services

- **Discord Account** - With access to a Discord server where you can invite bots
- **Minecraft Server** - Any type works (Vanilla, Paper, Spigot, Fabric, etc.)
- **Text Editor** - For editing configuration files (VS Code, Notepad++, etc.)

### Verify Prerequisites

Run these commands to verify your setup:

```bash
# Check Node.js version (should be 16+)
node --version

# Check npm version (should be 7+)
npm --version

# Check if you have Git (optional)
git --version
```

If any command fails, install the missing software before continuing.

---

## 💻 System Requirements

### Minimum Requirements

- **CPU:** 1 core
- **RAM:** 512MB (1GB recommended)
- **Storage:** 100MB free space
- **Network:** Internet connection for Discord API
- **Ports Available:** 3000, 3001, 3002, 3003 (defaults)

### Recommended Requirements

- **CPU:** 2+ cores
- **RAM:** 2GB+
- **Storage:** 500MB+ free space
- **Network:** Stable internet connection
- **Operating System:** Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)

---

## 📥 Step 1: Download and Install

### Option A: Using Git (Recommended)

If you have Git installed:

```bash
# Clone the repository
git clone <your-repository-url>
cd MinecraftAPItoDiscord

# Verify the files are present
ls
```

### Option B: Download ZIP

1. Download the project ZIP file from your repository
2. Extract the ZIP file to your desired location
3. Open terminal/command prompt in the extracted folder

### Install Dependencies

From the project root directory, install all required dependencies:

```bash
# Install root dependencies (API, Bot, Dashboard)
npm install

# Verify installation
ls node_modules
```

You should see a `node_modules` folder created. If you see errors, check:
- Node.js version (must be 16+)
- Internet connection
- Disk space available

**Expected Output:**
```
added 250 packages in 30s
```

---

## 🤖 Step 2: Create Discord Bot

This section will guide you through creating a Discord bot and getting the necessary credentials.

### 2.1: Create Discord Application

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Create New Application**
   - Click the "New Application" button (top right)
   - Enter a name (e.g., "Minecraft Whitelist Bot")
   - Click "Create"
   - You'll see the application overview page

### 2.2: Create and Configure Bot

1. **Navigate to Bot Section**
   - Click "Bot" in the left sidebar
   - Click "Add Bot" button
   - Confirm by clicking "Yes, do it!"
   - Your bot is now created

2. **Get Bot Token**
   - Under "Token", click "Reset Token" or "Copy" (if already visible)
   - **IMPORTANT:** Copy this token immediately and save it securely
   - **Never share this token!** If leaked, reset it immediately
   - Format: `MTAy...` (long alphanumeric string)

3. **Configure Bot Settings**
   - Scroll down to "Privileged Gateway Intents"
   - Enable "Message Content Intent" (required for `!ip` command)
   - Leave other intents disabled unless you need them
   - Click "Save Changes"

4. **Get Client ID**
   - Stay on the "Bot" page
   - Note the "Application ID" at the top (or get it from "OAuth2" → "General")
   - This is your Client ID (needed for OAuth)

5. **Get Client Secret**
   - Go to "OAuth2" → "General" in the left sidebar
   - Under "Client Secret", click "Reset Secret" or "Copy"
   - **IMPORTANT:** Copy and save this securely (needed for OAuth)

### 2.3: Generate OAuth URL and Invite Bot

1. **Generate Invite URL**
   - Go to "OAuth2" → "URL Generator" in the left sidebar
   - Under "Scopes", select:
     - ✅ `bot` - Required for bot functionality
     - ✅ `applications.commands` - Required for slash commands
   - Under "Bot Permissions", select:
     - ✅ Send Messages
     - ✅ Read Message History
     - ✅ Use Slash Commands
   - Scroll down to "Generated URL" at the bottom
   - **Copy this URL** - You'll use it to invite the bot

2. **Invite Bot to Server**
   - Open the copied URL in your browser
   - Select your Discord server from the dropdown
   - Click "Authorize"
   - Complete any CAPTCHA if prompted
   - You should see "Bot added!" message
   - Check your Discord server - the bot should appear (offline initially)

### 2.4: Verify Bot

1. **Check Bot is in Server**
   - Open your Discord server
   - Look for the bot in the member list (should be offline initially)
   - You should see the bot name you created

2. **Save Your Credentials**
   - **Bot Token:** `MTAy...` (long string)
   - **Client ID:** `123456789012345678` (18-digit number)
   - **Client Secret:** `abc123...` (long string)
   - Keep these secure - you'll need them soon!

---

## 🔢 Step 3: Get Discord IDs

You'll need several Discord IDs for configuration. Here's how to get them.

### 3.1: Enable Developer Mode

1. **Open Discord Settings**
   - Click the gear icon ⚙️ next to your username (bottom left)
   - Or press `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)

2. **Enable Developer Mode**
   - Click "Advanced" in the left sidebar
   - Scroll down to "Developer Mode"
   - Toggle it **ON** (should turn blue/green)
   - Close settings

### 3.2: Get Channel ID

1. **Find Your Notification Channel**
   - Navigate to the Discord channel where you want whitelist notifications
   - This should be a channel where staff can see requests

2. **Copy Channel ID**
   - Right-click on the channel name
   - Click "Copy ID" (this option only appears with Developer Mode enabled)
   - **Save this ID** - You'll need it for configuration
   - Format: `987654321098765432` (18-digit number)

### 3.3: Get User IDs

You'll need Discord user IDs for:

**Admin IDs:** Users who can access the admin panel
**Client IDs:** Users who can access the client dashboard

**To get User IDs:**
1. Right-click on a user (in server member list or in chat)
2. Click "Copy ID"
3. **Save each ID** - You'll enter them in the dashboard
4. Format: `123456789012345678` (18-digit number)

**Tip:** Create a text file to store all IDs:
```
Notification Channel ID: 987654321098765432
Admin IDs:
- 123456789012345678
- 987654321098765432
Client IDs:
- 111111111111111111
- 222222222222222222
```

---

## ⚙️ Step 4: Configure Environment Variables

Environment variables keep your sensitive data secure and make configuration easy. Each service has its own `.env` file.

### 4.1: Generate Encryption Key

First, generate a secure encryption key for encrypting bot tokens:

```bash
# Run this command to generate a 64-character encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Save this key securely!** You'll need it for the API server configuration.

### 4.2: Configure API Server

**Create `api/.env` file:**

```bash
cd api
# Create .env file (create new file if it doesn't exist)
```

**Edit `api/.env` with these values:**

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Encryption Key (paste the key you generated above)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your-client-id-from-step-2
DISCORD_CLIENT_SECRET=your-client-secret-from-step-2
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# URLs
DASHBOARD_URL=http://localhost:3000
BOT_URL=http://localhost:3002
CORS_ORIGIN=http://localhost:3000

# Admin and Client Access Control
# Add your Discord IDs (comma-separated, no spaces)
ADMIN_DISCORD_IDS=123456789012345678,987654321098765432
CLIENT_DISCORD_IDS=111111111111111111,222222222222222222

# Security
DEVELOPER_KEY=your-secure-dev-key-here
NOTIFY_SECRET=your-secure-notify-secret-here
```

**Important Notes:**
- Replace `your-client-id-from-step-2` with your actual Client ID
- Replace `your-client-secret-from-step-2` with your actual Client Secret
- Replace Discord IDs with your actual IDs from Step 3
- **Change `DEVELOPER_KEY` and `NOTIFY_SECRET`** to secure random strings!

### 4.3: Configure Bot (Optional)

**Create `bot/.env` file:**

```bash
cd ../bot
# Create .env file
```

**Edit `bot/.env`:**

```bash
API_URL=http://localhost:3001
BOT_PORT=3002
DISCORD_CLIENT_ID=your-client-id-from-step-2
NOTIFY_SECRET=your-secure-notify-secret-here
```

**Important:** `NOTIFY_SECRET` must match the one in `api/.env`!

### 4.4: Configure Dashboard (Optional)

**Create `dashboard/.env` file:**

```bash
cd ../dashboard
# Create .env file
```

**Edit `dashboard/.env`:**

```bash
REACT_APP_API_URL=http://localhost:3001
```

**Note:** React requires the `REACT_APP_` prefix for environment variables.

### 4.5: Configure Minecraft Server (Will do later)

We'll configure this after setting up the dashboard. See Step 6.

---

## 🎮 Step 5: Initial Dashboard Configuration

Now we'll start the services and configure the dashboard for the first time.

### 5.1: Start API Server

Open your first terminal window:

```bash
cd api
npm run dev
```

**Expected Output:**
```
[nodemon] starting `node server.js`
API server running on port 3001
Environment: development
Configuration validated successfully
```

**Keep this terminal open!** The server must stay running.

### 5.2: Start Dashboard

Open a **second terminal window**:

```bash
cd dashboard
npm start
```

**Expected Behavior:**
- Terminal shows compilation progress
- Browser should automatically open to http://localhost:3000
- If browser doesn't open, navigate manually

**Expected Output:**
```
Compiled successfully!
You can now view dashboard in the browser.
Local: http://localhost:3000
```

### 5.3: Login to Dashboard

1. **Open Dashboard**
   - Browser should be at http://localhost:3000
   - If not, navigate there manually

2. **Developer Login**
   - Click the "Developer Access" tab
   - Enter your developer key (default: `dev2024`, or your custom `DEVELOPER_KEY`)
   - Click "Login"
   - **Important:** Change this key in production!

3. **Verify Login**
   - You should see the Admin Panel
   - If you see an error, check API server is running

### 5.4: Configure System Settings

1. **Navigate to Configuration Tab**
   - Click "Configuration" in the top navigation
   - You'll see all configuration options

2. **Discord Bot Token**
   - Find "Discord Bot Token" field
   - Paste your bot token from Step 2
   - **This will be encrypted automatically** when saved

3. **Minecraft Server API Key**
   - Find "Minecraft Server API Key" field
   - Click the "Generate" button (creates a secure random key)
   - Click the "Copy" button next to it
   - **Save this key securely!** You'll need it for Minecraft server configuration
   - Format: 64-character hexadecimal string

4. **Notification Channel ID**
   - Find "Notification Channel ID" field
   - Paste your channel ID from Step 3

5. **Admin/Developer Discord IDs**
   - Find "Admin/Developer Discord IDs" field
   - Enter Discord IDs (one per line)
   - These users can access the admin panel
   - Example:
     ```
     123456789012345678
     987654321098765432
     ```

6. **Client Discord IDs**
   - Find "Client Discord IDs" field (or go to "Client Management" tab)
   - Enter Discord IDs (one per line)
   - These users can access the client dashboard
   - **Leave empty to allow all users** (not recommended for production)
   - Example:
     ```
     111111111111111111
     222222222222222222
     ```

7. **Minecraft Server Domain/URL**
   - Find "Minecraft Server Domain/URL" field
   - If running locally: `http://localhost:3003`
   - If on different machine: `http://your-server-ip:3003`
   - If using domain: `https://your-domain.com` (production)
   - This is where the API will send whitelist requests

8. **Minecraft Whitelist File Path** (Optional)
   - Find "Minecraft Whitelist File Path" field
   - Enter path to your whitelist.json file
   - Examples:
     - `./whitelist.json` (relative path)
     - `/home/user/minecraft/server/whitelist.json` (Linux absolute)
     - `C:\Users\YourName\minecraft\whitelist.json` (Windows absolute)
   - **Note:** Server API uses `WHITELIST_FILE` environment variable, this is just informational

9. **Minecraft Server IP**
   - Find "Minecraft Server IP" field
   - Enter the IP address players will use to connect
   - This is shown when users use the `!ip` command
   - Examples:
     - `play.example.com`
     - `192.168.1.100:25565`
     - `mc.yourserver.com`

10. **Save Configuration**
    - Scroll to the bottom
    - Click "Save Configuration" button
    - Wait for success message: "Configuration saved successfully!"
    - Configuration is saved to `data/config.json`

### 5.5: Start Discord Bot

Open a **third terminal window**:

```bash
cd bot
npm run dev
```

**Expected Output:**
```
Bot configuration validated successfully
Bot logged in as YourBotName#1234
Registering slash commands...
Slash commands registered successfully
Bot notification server running on port 3002
```

**Verify Bot is Online:**
- Check your Discord server
- Bot should show as online (green dot)
- Bot name should appear in member list

**Test Bot Commands:**
- Type `!ip` in Discord → Bot should respond with server IP
- Type `/requestwhitelist` → Slash command should appear

---

## 🎯 Step 6: Connect Minecraft Server

Now we'll set up the Minecraft server API to receive whitelist requests from the dashboard.

### 6.1: Install Minecraft Server API

**Navigate to Minecraft Server folder:**

```bash
cd minecraft-server
```

**Install dependencies:**

```bash
npm install
```

**Verify installation:**
- Check for `node_modules` folder
- No error messages during installation

### 6.2: Locate Your Whitelist File

**Find your Minecraft server's whitelist.json file:**

**Common Locations:**
- **Vanilla/Paper/Spigot:** Usually in server root directory as `whitelist.json`
- **Single Player:** Check Minecraft saves folder
- **Dedicated Server:** In server installation directory

**How to find it:**
1. Start your Minecraft server (if not already running)
2. Run `/whitelist list` in server console
3. If it works, the whitelist file exists
4. Check server directory for `whitelist.json`

**Example paths:**
- Windows: `C:\Users\YourName\minecraft-server\whitelist.json`
- Linux: `/home/user/minecraft-server/whitelist.json`
- Mac: `~/minecraft-server/whitelist.json`

**Important:** Write down the full path - you'll need it!

### 6.3: Create Environment File

**Create `minecraft-server/.env` file:**

```bash
# Copy example (if exists)
cp .env.example .env

# Or create new file manually
```

**Edit `.env` with these values:**

```bash
# Server Configuration
MINECRAFT_API_PORT=3003
NODE_ENV=development

# API Key (MUST match the one from dashboard Step 5.4!)
MINECRAFT_API_KEY=paste-the-api-key-you-generated-in-dashboard-here

# Whitelist File Path (use the path you found in 6.2)
WHITELIST_FILE=./whitelist.json

# Server Mode
# 'online' for Mojang servers (players need premium accounts)
# 'offline' for cracked servers (anyone can join)
SERVER_MODE=online

# RCON Configuration (Optional - Recommended for Paper/Spigot)
# See documentation/guides/HOW_TO_GET_RCON.md for setup
RCON_ENABLED=false
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-rcon-password-here
```

**Critical:** The `MINECRAFT_API_KEY` **must exactly match** the key you generated in the dashboard (Step 5.4)!

### 6.4: Start Minecraft Server API

**Start the API server:**

```bash
npm start
```

**Expected Output:**
```
Minecraft Whitelist API running on port 3003
API Key: abc12345...
Whitelist file: ./whitelist.json
Server mode: online
RCON enabled: false
Security: Path injection protection enabled
Security: File locking enabled
Security: Rate limiting enabled (10 req/min)
```

**Keep this terminal open!** The Minecraft API server must stay running.

### 6.5: Optional: Enable RCON (Recommended for Paper/Spigot)

RCON allows instant whitelist updates without manually reloading. Highly recommended for Paper/Spigot servers.

**Enable RCON on Minecraft Server:**

1. **Edit `server.properties`:**
   ```properties
   enable-rcon=true
   rcon.port=25575
   rcon.password=YourSecurePassword123!
   ```

2. **Restart Minecraft Server**
   - RCON only activates after server restart
   - Wait for server to fully start

3. **Update Minecraft API `.env`:**
   ```bash
   RCON_ENABLED=true
   RCON_HOST=localhost
   RCON_PORT=25575
   RCON_PASSWORD=YourSecurePassword123!
   ```

4. **Restart Minecraft API Server**
   - Stop the API server (Ctrl+C)
   - Start it again: `npm start`
   - Should show: `RCON enabled: true`

**For detailed RCON setup, see:**
- [RCON Setup Guide](../guides/RCON_SETUP.md)
- [Understanding RCON](../guides/RCON_EXPLAINED.md)
- [How to Get RCON Password](../guides/HOW_TO_GET_RCON.md)

---

## ✅ Step 7: Test Everything

Now let's verify everything is working correctly.

### 7.1: Test Discord Bot

**Test `!ip` Command:**
1. In your Discord server, type: `!ip`
2. Bot should respond with an embed showing the server IP
3. If no response, check:
   - Bot is online (green dot)
   - "Message Content Intent" is enabled
   - Bot has proper permissions

**Test Slash Command:**
1. Type `/` in Discord
2. Select "requestwhitelist" command
3. Optionally add: `minecraft_username:TestPlayer`
4. Submit the command
5. Bot should respond with success message
6. If command doesn't appear:
   - Wait 5-10 minutes (Discord caches commands)
   - Re-invite bot with `applications.commands` scope

### 7.2: Test Dashboard - Client View

**Login as Client:**
1. Logout from admin (if logged in)
2. Use Discord OAuth login (if configured):
   - Click "Login with Discord" button
   - Authorize the application
   - Should redirect to client dashboard
3. Or use manual login:
   - Enter your Discord ID (must be in client IDs list)
   - Click "Login"

**Submit Request:**
1. Enter Minecraft username: `TestPlayer`
2. Click "Submit Request"
3. Should see success message
4. Request should appear in "My Requests" section

### 7.3: Test Dashboard - Admin View

**Login as Admin:**
1. Logout from client (if logged in)
2. Use Discord OAuth (if configured as admin) or developer key

**Review Request:**
1. Go to "Whitelist Requests" tab
2. Should see your test request with status "pending"
3. Click "Approve" button
4. Enter/confirm Minecraft username: `TestPlayer`
5. Click "Confirm"
6. Request status should change to "approved"

**Check Notifications:**
1. Check Discord notification channel → Should see approval message
2. If you're the request submitter → Check DMs → Should receive approval message

### 7.4: Test Minecraft Server Integration

**Verify API Communication:**
1. Check Minecraft API server logs
   - Should show: `Added TestPlayer to whitelist (UUID: ...)`
   - If RCON enabled: Should show: `Added TestPlayer via RCON`

2. **Check whitelist.json file:**
   - Open your whitelist.json file
   - Should contain entry for TestPlayer:
     ```json
     [
       {
         "uuid": "550e8400-e29b-41d4-a716-446655440000",
         "name": "TestPlayer"
       }
     ]
     ```

3. **Test In-Game:**
   - If using RCON: Player should be whitelisted immediately
   - If not using RCON: Run `/whitelist reload` in server console
   - TestPlayer should be able to join server

**If Minecraft integration fails:**
- Check API key matches in dashboard and server
- Verify Minecraft API server is running
- Test API manually (see troubleshooting section)

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Bot Not Responding

**Symptoms:** Bot doesn't respond to `!ip` or slash commands

**Solutions:**
1. ✅ Check bot token is correct in dashboard config
2. ✅ Verify bot is online in Discord (green dot)
3. ✅ Enable "Message Content Intent" in Discord Developer Portal
4. ✅ Check bot has proper permissions in Discord server
5. ✅ Review bot console logs for errors
6. ✅ Restart bot server

#### Slash Commands Not Appearing

**Symptoms:** `/requestwhitelist` command doesn't appear when typing `/`

**Solutions:**
1. ✅ Wait 5-10 minutes (Discord caches commands globally)
2. ✅ Re-invite bot with `applications.commands` scope
3. ✅ Check bot console for registration errors
4. ✅ Verify bot has proper permissions
5. ✅ Try restarting the bot server

#### Dashboard Won't Load

**Symptoms:** Browser shows blank page or error

**Solutions:**
1. ✅ Check API server is running on port 3001
2. ✅ Verify `REACT_APP_API_URL` in dashboard `.env` (defaults to localhost:3001)
3. ✅ Check browser console for errors (F12)
4. ✅ Ensure port 3000 is not in use by another application
5. ✅ Try clearing browser cache
6. ✅ Check API server logs for errors

#### API Connection Errors

**Symptoms:** Dashboard shows connection errors

**Solutions:**
1. ✅ Verify `API_URL` is correct in all services
2. ✅ Check CORS settings in API server
3. ✅ Ensure API server is running
4. ✅ Check firewall/network settings
5. ✅ Test API health: `curl http://localhost:3001/api/health`
6. ✅ Verify ports are not blocked

#### Minecraft Server Not Receiving Requests

**Symptoms:** Approving requests doesn't add players to whitelist

**Solutions:**
1. ✅ Verify Minecraft API server is running
2. ✅ Check API key matches in both dashboard and Minecraft server
3. ✅ Test API endpoint manually:
   ```bash
   curl -X POST http://localhost:3003/api/whitelist/add \
     -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"username":"TestPlayer"}'
   ```
4. ✅ Check Minecraft API server logs for errors
5. ✅ Verify whitelist file path is correct
6. ✅ Ensure file permissions allow write access
7. ✅ Check network connectivity between services

#### Whitelist Not Updating In-Game

**Symptoms:** Player added to whitelist.json but can't join server

**Solutions:**
1. ✅ Run `/whitelist reload` in Minecraft server console
2. ✅ Some servers require restart for whitelist changes
3. ✅ Check server logs for errors
4. ✅ Verify whitelist file format is correct
5. ✅ Enable RCON for automatic reload (recommended)

#### Discord OAuth Not Working

**Symptoms:** "Login with Discord" button doesn't work

**Solutions:**
1. ✅ Check `DISCORD_CLIENT_ID` is set in API `.env`
2. ✅ Verify `DISCORD_CLIENT_SECRET` is correct
3. ✅ Ensure `DISCORD_REDIRECT_URI` matches exactly in Discord Developer Portal
4. ✅ Check API server logs for OAuth errors
5. ✅ Verify redirect URI uses correct protocol (http vs https)

#### Environment Variables Not Loading

**Symptoms:** Services show configuration errors

**Solutions:**
1. ✅ Check `.env` files are in correct locations
2. ✅ Verify `.env` file syntax (no spaces around `=`)
3. ✅ Ensure `.env` files are not committed to git (check `.gitignore`)
4. ✅ Restart services after changing `.env` files
5. ✅ Check for typos in variable names

---

## 🎉 Installation Complete!

Congratulations! Your Minecraft Whitelist Dashboard is now installed and configured. 

### What's Running

You should have **4 services** running:

1. ✅ **API Server** - Port 3001 (handles all API requests)
2. ✅ **Dashboard** - Port 3000 (web interface)
3. ✅ **Discord Bot** - Background process (handles Discord commands)
4. ✅ **Minecraft API** - Port 3003 (receives whitelist requests)

### Next Steps

**Before going to production:**

1. **Change developer key** - Set a secure `DEVELOPER_KEY` in `api/.env`
2. **Review security** - Read [Security Guide](../security/SECURITY.md)
3. **Configure production** - Set up for live use
4. **Test thoroughly** - Verify all features work correctly

**For production deployment:**
- See main [README.md](../../README.md) deployment section
- Review [Environment Variables Reference](../reference/ENV_VARIABLES.md) for production values
- Set up HTTPS and proper CORS settings

---

## 📚 Additional Resources

- **[Quick Start Guide](QUICK_START.md)** - Faster setup for experienced users
- **[Environment Variables Setup](ENV_SETUP.md)** - Detailed environment variable configuration
- **[Security Guide](../security/SECURITY.md)** - Security best practices
- **[Discord OAuth Setup](../guides/DISCORD_OAUTH_SETUP.md)** - Enable Discord login
- **[Minecraft Server Integration](../guides/INTEGRATION_GUIDE.md)** - Server integration details
- **[RCON Setup Guide](../guides/RCON_SETUP.md)** - Configure RCON

---

**Need help?** Check the [Documentation Index](../README.md) or review the troubleshooting section above.

**Happy whitelist managing!** 🎮✨
