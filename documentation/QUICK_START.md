# Quick Start Guide

Get your Minecraft Whitelist Dashboard running in 5 minutes.

## Prerequisites Check

Before starting, verify you have:

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Discord account with server access
- [ ] Minecraft server (any type)

## 5-Minute Setup

### 1. Install Dependencies (2 minutes)

```bash
# Root dependencies
npm install

# API server
cd api && npm install && cd ..

# Discord bot
cd bot && npm install && cd ..

# Dashboard
cd dashboard && npm install && cd ..
```

### 2. Create Discord Bot (1 minute)

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it → "Create"
3. Go to "Bot" → "Add Bot" → Copy token
4. Enable "Message Content Intent"
5. Go to "OAuth2" → "URL Generator"
6. Select scopes: `bot`, `applications.commands`
7. Copy URL → Invite bot to your server

### 3. Get Required IDs (30 seconds)

**Enable Developer Mode:**
- Discord Settings → Advanced → Enable "Developer Mode"

**Get IDs:**
- Right-click notification channel → "Copy ID"
- Right-click users → "Copy ID" (for each allowed user)

### 4. Start Services (1 minute)

Open **3 terminal windows**:

**Terminal 1:**
```bash
cd api && npm run dev
```

**Terminal 2:**
```bash
cd dashboard && npm start
```

**Terminal 3:**
```bash
cd bot && npm run dev
```

### 5. Configure Dashboard (30 seconds)

1. Open http://localhost:3000
2. Login: "Developer Access" tab → Key: `dev2024`
3. Go to "Configuration" tab:
   - Paste bot token
   - Click "Generate" for API key → "Copy"
   - Paste channel ID
   - Paste user IDs (one per line)
   - Server URL: `http://localhost:3003`
   - Server IP: Your Minecraft server IP
   - Click "Save"

### 6. Setup Minecraft Server API (1 minute)

**Terminal 4:**
```bash
cd minecraft-server
npm install
cp .env.example .env
```

Edit `.env`:
```bash
MINECRAFT_API_KEY=<paste-api-key-from-step-5>
MINECRAFT_API_PORT=3003
WHITELIST_FILE=./whitelist.json
SERVER_MODE=online
```

Start:
```bash
npm start
```

## Test It

1. **In Discord:** Type `/requestwhitelist minecraft_username:TestPlayer`
2. **In Dashboard:** Admin → Approve request
3. **Check:** User should be in `whitelist.json`

## Done!

Your system is now running. All services should be active:

- ✅ API server on port 3001
- ✅ Dashboard on port 3000
- ✅ Discord bot online
- ✅ Minecraft API on port 3003

## Next Steps

- [ ] Change developer key (in `dashboard/src/components/Login.js`)
- [ ] Review `documentation/SECURITY.md`
- [ ] Set up production deployment
- [ ] Configure backups
- [ ] Read full documentation

## Need More Help?

- **Detailed Setup:** See `documentation/INSTALLATION.md`
- **Troubleshooting:** See `README.md` troubleshooting section
- **Architecture:** See `documentation/PROJECT_STRUCTURE.md`
