# WhitelistHub

<div align="center">

**A production-ready, secure, and user-friendly system for managing Minecraft server whitelist requests through Discord integration.**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Support](#-support)

</div>

---

## 🌟 Overview

WhitelistHub is a comprehensive solution that streamlines the process of managing whitelist requests for your Minecraft server. It combines a powerful Discord bot, an intuitive web dashboard, and seamless Minecraft server integration to provide a complete whitelist management system.

**Perfect for:** Server administrators, community managers, and anyone looking to automate and organize their Minecraft server's whitelist approval process.

---

## ✨ Key Features

### 🤖 Discord Bot Integration
- **Instant Server IP Display** - `!ip` command shows your server IP to players
- **Slash Command Support** - `/requestwhitelist` for easy whitelist requests
- **Automatic Notifications** - Get notified in configured Discord channels
- **Direct Messaging** - Players receive DMs when requests are approved
- **Professional Embeds** - Beautiful, informative Discord messages

### 💻 Web Dashboard

**For Players (Client Dashboard):**
- **Discord OAuth Login** - One-click authentication with your Discord account
- **Request Submission** - Submit whitelist requests with your Minecraft username
- **Request Tracking** - View your request status and history
- **Simple Interface** - Clean, easy-to-use design

**For Administrators (Admin Panel):**
- **Complete System Control** - Manage all aspects from one place
- **Request Management** - Approve, reject, or delete whitelist requests
- **Configuration Management** - Configure bot tokens, API keys, and settings
- **User Management** - Add/remove admin and client Discord IDs
- **System Monitoring** - View all requests and system status

### 🔒 Enterprise-Grade Security

- **AES-256-GCM Encryption** - Bot tokens encrypted at rest
- **API Key Authentication** - Secure communication between services
- **Input Validation** - Protection against injection attacks
- **Rate Limiting** - Prevents abuse and brute force attacks
- **SSRF Protection** - Secure URL validation for server connections
- **XSS Prevention** - All user input sanitized and escaped
- **Audit Logging** - Complete action history for security monitoring

### 🎮 Minecraft Server Integration

- **Universal Compatibility** - Works with Vanilla, Paper, Spigot, and more
- **RCON Support** - Instant whitelist updates for Paper/Spigot servers
- **UUID Generation** - Automatic UUID generation for online/offline servers
- **File-Based or RCON** - Flexible integration options
- **Secure API Communication** - API key authentication required
- **Race Condition Protection** - File locking prevents data corruption

### 🚀 Production Ready

- **Deployment Configuration** - Ready for Render.com with `render.yaml`
- **Environment Variable Support** - Secure configuration management
- **Modular Architecture** - Separate services for scalability
- **Comprehensive Documentation** - Detailed guides for every aspect
- **Error Handling** - Robust error handling throughout

---

## ⚡ Quick Start

Get up and running in 5 minutes! See the [Quick Start Guide](documentation/getting-started/QUICK_START.md) for step-by-step instructions.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (see documentation)
# Create api/.env with required settings

# 3. Start all services
npm run dev
```

For detailed installation, see the [Complete Installation Guide](documentation/getting-started/INSTALLATION.md).

---

## 🚀 Deploying to Render (single-host option)

You can run the Dashboard and API together on one Render Web Service using the bundled `render-server.js` which serves the built dashboard and mounts the API routes.

Quick steps:

1. Build the dashboard:

```bash
cd dashboard
npm install
npm run build
cd ..
```

2. Create a Web Service on Render pointing to this repo and set the Start Command to:

```bash
npm run start:render
```

3. Set the following environment variables (minimum recommended):

- `ENCRYPTION_KEY` — 32+ characters
- `DEVELOPER_KEY` — developer key used for fallback developer access
- `NOTIFY_SECRET` — secret shared with Bot for notifications
- `DASHBOARD_URL` — e.g. https://your-app.onrender.com
- `BOT_URL` — e.g. https://your-bot.onrender.com (if bot runs separately)
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` — if using Discord OAuth
- `CORS_ORIGIN` — dashboard origin, e.g. https://your-app.onrender.com

4. Bot deployment recommendation:

- Run the Discord bot as a separate Render Background Worker with start command `npm run start:bot` (or `node bot/index.js`). Provide the same environment variables so it can call the API at `BOT_URL`.

5. Plugin wiring notes:

- Deploy the Paper plugin JAR to your Minecraft server `plugins/` folder. The plugin will create a config file that contains a plugin API key.
- Copy that plugin API key into the Dashboard -> Configuration (`Minecraft API Key`) so the API accepts requests from the plugin.

Security: store sensitive variables (ENCRYPTION_KEY, DEVELOPER_KEY, DISCORD_CLIENT_SECRET) as Render secrets; do not commit them.


## 📚 Documentation

Comprehensive documentation is available in the `documentation/` folder. Here's what you'll find:

### 🚀 Getting Started

- **[Quick Start Guide](documentation/getting-started/QUICK_START.md)** - Get running in 5 minutes
- **[Complete Installation Guide](documentation/getting-started/INSTALLATION.md)** - Detailed step-by-step setup
- **[Setup Reference](documentation/getting-started/SETUP.md)** - Quick configuration reference
- **[Environment Variables Setup](documentation/getting-started/ENV_SETUP.md)** - Configure all environment variables

### 📖 Configuration Guides

- **[Discord OAuth Setup](documentation/guides/DISCORD_OAUTH_SETUP.md)** - Enable Discord login authentication
- **[Minecraft Server Integration](documentation/guides/INTEGRATION_GUIDE.md)** - Connect your Minecraft server
- **[RCON Setup Guide](documentation/guides/RCON_SETUP.md)** - Configure RCON for instant updates
- **[Understanding RCON](documentation/guides/RCON_EXPLAINED.md)** - Learn about RCON and its benefits
- **[How to Get RCON Password](documentation/guides/HOW_TO_GET_RCON.md)** - Find your RCON credentials

### 📘 Technical Reference

- **[Project Structure & Architecture](documentation/reference/PROJECT_STRUCTURE.md)** - System architecture overview
- **[API Communication Protocol](documentation/reference/COMMUNICATION.md)** - Complete API documentation
- **[Environment Variables Reference](documentation/reference/ENV_VARIABLES.md)** - All environment variables explained

### 🔒 Security

- **[Security Guide](documentation/security/SECURITY.md)** - Security features and best practices
- **[Security Improvements](documentation/security/SECURITY_IMPROVEMENTS.md)** - Security enhancement log

### 📋 Other Resources

- **[Documentation Index](documentation/README.md)** - Complete documentation index
- **[Changelog](documentation/CHANGELOG.md)** - Version history and updates
- **[Minecraft Server README](minecraft-server/README.md)** - Server-specific documentation

---

## 🛠️ System Architecture

The system consists of four main components:

```
┌─────────────────────────────────────────────────────────┐
│                   User Interfaces                        │
├──────────────────────┬──────────────────────────────────┤
│   Discord Server     │      Web Dashboard               │
│   (Discord Bot)      │      (React Frontend)            │
└──────────┬───────────┴──────────┬───────────────────────┘
           │                      │
           │ Discord API         │ HTTP Requests
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Services                           │
├──────────────────────┬──────────────────────────────────┤
│   Discord Bot        │      API Server                  │
│   (Node.js)          │      (Express.js)                │
│   Port: 3002         │      Port: 3001                  │
└──────────┬───────────┴──────────┬───────────────────────┘
           │                      │
           │                      │ HTTP POST
           │                      │ (with API Key)
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│         Minecraft Server Integration                    │
├─────────────────────────────────────────────────────────┤
│   Minecraft Server API (Node.js)                        │
│   Port: 3003                                            │
│   - Receives whitelist requests                        │
│   - Updates whitelist.json                             │
│   - Optional RCON integration                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ File I/O / RCON
                       │
                       ▼
              ┌─────────────────┐
              │ Minecraft Server│
              │ whitelist.json  │
              └─────────────────┘
```

---

## 📦 Installation

### Prerequisites

Before installing, ensure you have:

- ✅ **Node.js 16+** - [Download here](https://nodejs.org/)
- ✅ **npm** - Comes with Node.js
- ✅ **Discord Account** - With access to a Discord server
- ✅ **Minecraft Server** - Any type (Vanilla, Paper, Spigot, etc.)
- ✅ **Basic Command Line Knowledge** - Helpful but not required

### Step-by-Step Installation

1. **Clone or Download the Project**
   ```bash
   git clone <your-repository-url>
   cd MinecraftAPItoDiscord
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create Discord Bot**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and bot
   - Copy the bot token (you'll need it later)
   - Enable "Message Content Intent"
   - Invite bot to your server

4. **Configure Environment Variables**
   - Create `.env` files in `api/`, `bot/`, and `minecraft-server/`
   - See [Environment Variables Setup](documentation/getting-started/ENV_SETUP.md) for details
   - Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

5. **Start Services**
   ```bash
   npm run dev
   ```

6. **Configure Dashboard**
   - Open http://localhost:3000
   - Login with developer key: `dev2024` (change in production!)
   - Configure bot token, API keys, and settings

7. **Connect Minecraft Server**
   - See [Minecraft Server Integration Guide](documentation/guides/INTEGRATION_GUIDE.md)

For detailed instructions, see the [Complete Installation Guide](documentation/getting-started/INSTALLATION.md).

---

## 🎯 Usage

### For Players

**Using Discord:**
1. Type `/requestwhitelist minecraft_username:YourUsername` in Discord
2. Wait for staff approval
3. Receive DM notification when approved

**Using Web Dashboard:**
1. Visit the dashboard URL
2. Login with Discord OAuth (or enter your Discord ID)
3. Submit a whitelist request with your Minecraft username
4. Track your request status

### For Administrators

1. **Login to Admin Panel**
   - Use Discord OAuth (if configured as admin)
   - Or use developer key: `dev2024` (change this!)

2. **Review Requests**
   - Go to "Whitelist Requests" tab
   - View all pending requests
   - See Discord user and Minecraft username

3. **Approve or Reject**
   - Click "Approve" and enter/confirm Minecraft username
   - Or click "Reject" to deny the request
   - User will be notified automatically

4. **Configure System**
   - Go to "Configuration" tab
   - Update bot token, API keys, settings
   - Manage admin and client Discord IDs

---

## 🔧 Configuration

### Environment Variables

The system uses environment variables for secure configuration. Key variables include:

- **`ENCRYPTION_KEY`** - For encrypting bot tokens (required)
- **`DISCORD_CLIENT_ID`** - Discord OAuth client ID
- **`DISCORD_CLIENT_SECRET`** - Discord OAuth client secret
- **`ADMIN_DISCORD_IDS`** - Admin user IDs (comma-separated)
- **`CLIENT_DISCORD_IDS`** - Client user IDs (comma-separated)
- **`MINECRAFT_API_KEY`** - API key for Minecraft server communication

See the [Environment Variables Reference](documentation/reference/ENV_VARIABLES.md) for complete documentation.

### Configuration Files

All configuration is stored in `data/config.json`:
- Bot token (encrypted)
- Minecraft API key
- Notification channel ID
- Discord IDs for admin/client access
- Minecraft server settings

**⚠️ Important:** Never commit `data/*.json` files to version control!

---

## 🚀 Deployment

### Deploying to Render.com

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` and create services

3. **Configure Environment Variables**
   - Set all required environment variables in Render dashboard
   - See [Environment Variables Setup](documentation/getting-started/ENV_SETUP.md)

4. **Deploy**
   - Render will automatically deploy your services
   - Monitor deployment logs for any issues

See `render.yaml` for deployment configuration details.

### Production Checklist

Before deploying to production:

- [ ] Change default developer key (`DEVELOPER_KEY`)
- [ ] Generate strong encryption key (`ENCRYPTION_KEY`)
- [ ] Set secure API keys
- [ ] Configure Discord OAuth (production URLs)
- [ ] Set `NODE_ENV=production`
- [ ] Review [Security Guide](documentation/security/SECURITY.md)
- [ ] Configure HTTPS
- [ ] Set up monitoring
- [ ] Backup configuration files

---

## 🔒 Security

This system includes comprehensive security features:

- ✅ **Encrypted Token Storage** - Bot tokens encrypted with AES-256-GCM
- ✅ **API Key Authentication** - Secure service-to-service communication
- ✅ **Input Validation** - All inputs validated and sanitized
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **SSRF Protection** - Secure URL validation
- ✅ **XSS Prevention** - All outputs escaped
- ✅ **Path Injection Protection** - File paths validated
- ✅ **Audit Logging** - Complete action history

**Important:** Review the [Security Guide](documentation/security/SECURITY.md) before deploying to production.

---

## 📁 Project Structure

```
MinecraftAPItoDiscord/
│
├── api/                          # Backend API Server
│   ├── server.js                 # Main API server
│   ├── config.js                 # Configuration management
│   ├── middleware.js             # Authentication & validation
│   ├── crypto-utils.js           # Encryption utilities
│   └── .env                      # Environment variables
│
├── bot/                          # Discord Bot
│   ├── index.js                  # Bot logic & commands
│   ├── config.js                 # Bot configuration
│   └── .env                      # Environment variables
│
├── dashboard/                    # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Login.js          # Login page
│   │   │   ├── Dashboard.js      # Client dashboard
│   │   │   ├── AdminPanel.js     # Admin panel
│   │   │   └── ...
│   │   └── App.js                # Main app router
│   └── .env                      # Environment variables
│
├── minecraft-server/             # Minecraft Server Integration
│   ├── whitelist-api.js          # Minecraft API server
│   ├── README.md                 # Server-specific docs
│   └── .env                      # Environment variables
│
├── data/                         # Data Storage (DO NOT COMMIT)
│   ├── config.json               # System configuration
│   ├── requests.json             # Whitelist requests
│   └── server.json               # Server IP
│
├── documentation/                # All Documentation
│   ├── getting-started/          # Beginner guides
│   ├── guides/                   # Configuration guides
│   ├── reference/                # Technical reference
│   └── security/                 # Security documentation
│
├── package.json                  # Unified dependencies
├── render.yaml                   # Render.com deployment
└── README.md                     # This file
```

---

## 🔌 API Endpoints

### Dashboard API (Port 3001)

**Public Endpoints:**
- `GET /api/health` - Health check
- `POST /api/requests` - Create whitelist request
- `POST /api/auth/discord/callback` - Discord OAuth callback

**Admin Endpoints (require authentication):**
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration
- `GET /api/requests` - Get all requests
- `PUT /api/requests/:id` - Update request status
- `DELETE /api/requests/:id` - Delete request
- `POST /api/server` - Update server IP

See [API Communication Protocol](documentation/reference/COMMUNICATION.md) for detailed documentation.

### Minecraft Server API (Port 3003)

**Protected Endpoints (require API key):**
- `POST /api/whitelist/add` - Add user to whitelist
- `DELETE /api/whitelist/remove` - Remove user from whitelist
- `GET /api/whitelist/status` - Get whitelist status

**Public Endpoints:**
- `GET /api/health` - Health check

---

## 🐛 Troubleshooting

### Common Issues

**Bot Not Responding**
- ✅ Check bot token is correct in dashboard config
- ✅ Verify bot is online in Discord (green dot)
- ✅ Enable "Message Content Intent" in Discord Developer Portal
- ✅ Check bot has proper permissions in Discord server
- ✅ Review bot console logs for errors

**Slash Commands Not Appearing**
- ✅ Wait 5-10 minutes (Discord caches commands globally)
- ✅ Re-invite bot with `applications.commands` scope
- ✅ Check bot console for registration errors
- ✅ Verify bot has proper permissions

**Dashboard Not Loading**
- ✅ Check API server is running on port 3001
- ✅ Verify `REACT_APP_API_URL` in dashboard `.env`
- ✅ Check browser console for errors (F12)
- ✅ Ensure CORS is configured correctly

**API Connection Errors**
- ✅ Verify `API_URL` is correct in all services
- ✅ Check CORS settings in API server
- ✅ Ensure API server is running
- ✅ Check firewall/network settings
- ✅ Verify ports are not blocked

**Minecraft Server Not Receiving Requests**
- ✅ Verify Minecraft API server is running
- ✅ Check API key matches in both dashboard and server
- ✅ Test API endpoint manually (see [Communication Protocol](documentation/reference/COMMUNICATION.md))
- ✅ Check Minecraft API server logs
- ✅ Verify whitelist file path is correct
- ✅ Ensure file permissions allow write access

**Whitelist Not Updating In-Game**
- ✅ Run `/whitelist reload` in Minecraft server console
- ✅ Some servers require restart for whitelist changes
- ✅ Check server logs for errors
- ✅ Verify whitelist file format is correct
- ✅ Enable RCON for automatic reload (recommended)

For more troubleshooting help, see the troubleshooting sections in each guide.

---

## 📖 Documentation

Complete documentation is available in the `documentation/` folder:

- **[Documentation Index](documentation/README.md)** - Start here for navigation
- **[Quick Start](documentation/getting-started/QUICK_START.md)** - Get running in 5 minutes
- **[Installation Guide](documentation/getting-started/INSTALLATION.md)** - Complete setup instructions
- **[Environment Variables](documentation/reference/ENV_VARIABLES.md)** - All configuration options
- **[Security Guide](documentation/security/SECURITY.md)** - Security best practices

---

## 🔄 Running the System

### Development Mode

Run all services at once:
```bash
npm run dev
```

Or run individually:

**Terminal 1 - API Server:**
```bash
npm run dev:api
```

**Terminal 2 - Dashboard:**
```bash
npm run dev:dashboard
```

**Terminal 3 - Discord Bot:**
```bash
npm run dev:bot
```

**Terminal 4 - Minecraft API:**
```bash
cd minecraft-server
npm start
```

### Production Mode

Build the dashboard:
```bash
npm run build
```

Start services:
```bash
# API Server
npm run start:api

# Discord Bot
npm run start:bot

# Minecraft API (separate package.json)
cd minecraft-server
npm start
```

---

## 🔐 Security Best Practices

1. **Change Default Developer Key**
   - Default key is `dev2024` - change this immediately!
   - Set `DEVELOPER_KEY` environment variable

2. **Use Strong Encryption Keys**
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Minimum 32 characters
   - Store securely

3. **Never Commit Sensitive Files**
   - `data/*.json` files are in `.gitignore`
   - `.env` files are in `.gitignore`
   - Never commit these files!

4. **Use HTTPS in Production**
   - Required for secure OAuth
   - Use reverse proxy (nginx) if needed

5. **Rotate Keys Regularly**
   - Change API keys periodically
   - Update bot token if compromised
   - Rotate encryption key (requires re-encryption)

6. **Review Access Regularly**
   - Check admin and client Discord IDs
   - Remove access when needed
   - Monitor audit logs

See the [Security Guide](documentation/security/SECURITY.md) for complete security documentation.

---

## 📊 System Requirements

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

---

## 🤝 Support

Need help? Check these resources:

1. **[Documentation Index](documentation/README.md)** - Find the right guide
2. **[Troubleshooting Section](#-troubleshooting)** - Common issues and solutions
3. **Console Logs** - Check service logs for errors
4. **Browser Console** - Check for frontend errors (F12)

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Discord.js](https://discord.js.org/) - Discord bot framework
- [Express.js](https://expressjs.com/) - Web framework
- [React](https://reactjs.org/) - Frontend framework
- [Node.js](https://nodejs.org/) - JavaScript runtime

---

## 📈 Future Enhancements

Planned improvements:
- [ ] JWT authentication
- [ ] Database integration (PostgreSQL/MySQL)
- [ ] Redis caching
- [ ] WebSocket support for real-time updates
- [ ] Email notifications
- [ ] Multi-server support
- [ ] Advanced role-based permissions
- [ ] Analytics dashboard
- [ ] Request expiration system
- [ ] Bulk operations

---

<div align="center">

**Made with ❤️ for the Minecraft community**

[Documentation](documentation/README.md) • [Quick Start](documentation/getting-started/QUICK_START.md) • [Security](documentation/security/SECURITY.md)

</div>
