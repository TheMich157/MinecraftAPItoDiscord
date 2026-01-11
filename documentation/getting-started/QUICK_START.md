# Quick Start Guide

Get your Minecraft Whitelist Dashboard up and running in minutes. This guide assumes you're familiar with Node.js, Discord bots, and basic server administration.

---

## ⚡ Prerequisites Checklist

- ✅ Node.js 16+ installed
- ✅ Discord bot created (have token, client ID, client secret)
- ✅ Discord channel ID for notifications
- ✅ Discord user IDs for admin/client access
- ✅ Minecraft server whitelist.json file location
- ✅ Ports 3000, 3001, 3002, 3003 available

---

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save the output** - you'll need it for the API configuration.

### 3. Configure Environment Variables

**Create `api/.env`:**

```bash
PORT=3001
NODE_ENV=development
ENCRYPTION_KEY=<paste-generated-key-here>
DISCORD_CLIENT_ID=<your-client-id>
DISCORD_CLIENT_SECRET=<your-client-secret>
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DASHBOARD_URL=http://localhost:3000
BOT_URL=http://localhost:3002
CORS_ORIGIN=http://localhost:3000
ADMIN_DISCORD_IDS=<comma-separated-admin-ids>
CLIENT_DISCORD_IDS=<comma-separated-client-ids>
DEVELOPER_KEY=<secure-random-string>
NOTIFY_SECRET=<secure-random-string>
```

**Create `bot/.env`:**

```bash
API_URL=http://localhost:3001
BOT_PORT=3002
DISCORD_CLIENT_ID=<your-client-id>
NOTIFY_SECRET=<same-as-api-notify-secret>
```

**Create `dashboard/.env`:**

```bash
REACT_APP_API_URL=http://localhost:3001
```

**Create `minecraft-server/.env`:**

```bash
MINECRAFT_API_PORT=3003
MINECRAFT_API_KEY=<will-generate-in-dashboard>
WHITELIST_FILE=./whitelist.json
SERVER_MODE=online
RCON_ENABLED=false
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=
```

### 4. Start Services

**Terminal 1 - API Server:**
```bash
cd api && npm run dev
```

**Terminal 2 - Dashboard:**
```bash
cd dashboard && npm start
```

**Terminal 3 - Bot:**
```bash
cd bot && npm run dev
```

**Terminal 4 - Minecraft API:**
```bash
cd minecraft-server && npm start
```

### 5. Configure Dashboard

1. **Open http://localhost:3000**
2. **Login with developer key** (default: `dev2024` or your `DEVELOPER_KEY`)
3. **Configure:**
   - Paste Discord bot token
   - Generate and copy Minecraft API key → paste in `minecraft-server/.env`
   - Enter notification channel ID
   - Add admin/client Discord IDs
   - Set Minecraft server domain (e.g., `http://localhost:3003`)
   - Set Minecraft server IP
4. **Save configuration**

### 6. Restart Minecraft API

```bash
# Stop Minecraft API (Ctrl+C)
# Update .env with API key from dashboard
cd minecraft-server && npm start
```

---

## ✅ Verify Setup

**Test Discord Bot:**
- Type `!ip` in Discord → Bot responds
- Type `/requestwhitelist` → Command appears

**Test Dashboard:**
- Login as client → Submit request
- Login as admin → Approve request
- Check Discord channel for notifications

**Test Minecraft Integration:**
- Approve request → Check `whitelist.json`
- Run `/whitelist reload` in Minecraft console
- Player should be whitelisted

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Change all default keys (`DEVELOPER_KEY`, `NOTIFY_SECRET`)
- [ ] Set `NODE_ENV=production`
- [ ] Update URLs to production domain (e.g., `https://manihub.xyz`)
- [ ] Set proper `CORS_ORIGIN`
- [ ] Enable HTTPS
- [ ] Set secure `ENCRYPTION_KEY` (32+ characters)
- [ ] Configure firewall rules
- [ ] Set up process managers (PM2, systemd, etc.)
- [ ] Enable RCON for automatic reloads (recommended)
- [ ] Review [Security Guide](../security/SECURITY.md)

---

## 📚 Next Steps

- **[Full Installation Guide](INSTALLATION.md)** - Detailed step-by-step instructions
- **[Environment Variables Reference](../reference/ENV_VARIABLES.md)** - Complete variable list
- **[Discord OAuth Setup](../guides/DISCORD_OAUTH_SETUP.md)** - Enable Discord login
- **[RCON Configuration](../guides/RCON_SETUP.md)** - Enable automatic reloads

---

**That's it!** Your dashboard should now be running. For detailed instructions or troubleshooting, see the [Complete Installation Guide](INSTALLATION.md).
