# Minecraft Server Integration Guide

Complete guide for integrating the whitelist dashboard with your Minecraft server, including setup, configuration, and deployment options.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration Options](#configuration-options)
5. [Deployment Options](#deployment-options)
6. [Server Types](#server-types)
7. [Troubleshooting](#troubleshooting)

## Overview

The Minecraft Server API is a standalone Node.js service that receives whitelist requests from the dashboard and updates your Minecraft server's whitelist.json file. It supports both online (Mojang) and offline (cracked) servers, with optional RCON integration for Paper/Spigot servers.

### Components

- **Dashboard API** - Manages requests and approvals
- **Minecraft Server API** - Receives approved requests and updates whitelist
- **RCON Integration** - Optional direct server command execution

## Quick Start

### 5-Minute Setup

1. **Install dependencies:**
   ```bash
   cd minecraft-server
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure `.env`:**
   ```bash
   MINECRAFT_API_KEY=your-api-key-from-dashboard
   MINECRAFT_API_PORT=3003
   WHITELIST_FILE=./whitelist.json
   SERVER_MODE=online
   ```

4. **Start server:**
   ```bash
   npm start
   ```

5. **Configure dashboard:**
   - Set Minecraft Server Domain/URL: `http://localhost:3003`
   - Set Minecraft Server API Key: Same as in `.env`

## Detailed Setup

### Step 1: Installation

**Navigate to minecraft-server directory:**
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

### Step 2: Environment Configuration

**Create `.env` file:**
```bash
cp .env.example .env
```

**Required Configuration:**

```bash
# API Key - Must match dashboard configuration
MINECRAFT_API_KEY=your-secure-api-key-here

# Port for API server
MINECRAFT_API_PORT=3003

# Path to whitelist.json file
WHITELIST_FILE=./whitelist.json
```

**Optional Configuration:**

```bash
# Server mode: 'online' or 'offline'
# 'online' - Mojang servers (UUIDs resolved by Mojang)
# 'offline' - Cracked servers (UUIDs generated locally)
SERVER_MODE=online

# RCON Configuration (optional)
RCON_ENABLED=false
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-rcon-password
```

### Step 3: Locate Whitelist File

**Finding your whitelist.json:**

**Vanilla/Paper/Spigot Server:**
- Usually in server root directory: `./whitelist.json`
- Same directory as `server.properties`

**Single Player (for testing):**
- Windows: `%appdata%\.minecraft\whitelist.json`
- Linux: `~/.minecraft/whitelist.json`
- Mac: `~/Library/Application Support/minecraft/whitelist.json`

**Update `WHITELIST_FILE` in `.env` with the correct path:**
```bash
# Relative path (from API server directory)
WHITELIST_FILE=./whitelist.json

# Absolute path (Linux/Mac)
WHITELIST_FILE=/home/user/minecraft/server/whitelist.json

# Absolute path (Windows)
WHITELIST_FILE=C:\Users\YourName\minecraft\server\whitelist.json
```

### Step 4: Start API Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Expected output:**
```
Minecraft Whitelist API running on port 3003
API Key: your-key...
Whitelist file: ./whitelist.json
Server mode: online
RCON enabled: false
Security: Path injection protection enabled
Security: File locking enabled
Security: Rate limiting enabled (10 req/min)
```

### Step 5: Configure Dashboard

1. **Open dashboard admin panel**
2. **Go to Configuration tab**
3. **Set Minecraft Server Domain/URL:**
   - Local: `http://localhost:3003`
   - Remote: `http://your-server-ip:3003`
   - Domain: `https://your-domain.com`
4. **Set Minecraft Server API Key:**
   - Must match `MINECRAFT_API_KEY` from `.env`
5. **Set Minecraft Whitelist File Path (optional):**
   - Same path as `WHITELIST_FILE` in `.env`
6. **Click "Save Configuration"**

### Step 6: Test Integration

1. **Submit test request:**
   - Use Discord: `/requestwhitelist minecraft_username:TestPlayer`
   - Or Dashboard: Submit request form

2. **Approve request:**
   - Login to admin panel
   - Approve the test request

3. **Verify:**
   - Check Minecraft API server logs
   - Check whitelist.json file
   - User should be added

## Configuration Options

### Server Mode

**Online Mode (Mojang Servers):**
```bash
SERVER_MODE=online
```
- For servers with Mojang authentication
- UUIDs will be resolved when player first joins
- Uses offline UUID as fallback until resolved

**Offline Mode (Cracked Servers):**
```bash
SERVER_MODE=offline
```
- For servers without Mojang authentication
- Generates deterministic UUIDs based on username
- UUIDs are consistent and permanent

### RCON Configuration

RCON allows direct server command execution. See `documentation/RCON_SETUP.md` for complete setup.

**Enable RCON:**
```bash
RCON_ENABLED=true
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-secure-password
```

**Benefits:**
- Server automatically reloads whitelist
- No file permission issues
- More reliable for Paper/Spigot

## Deployment Options

### Option A: Same Machine as Minecraft Server

**Advantages:**
- Direct file access
- No network latency
- Simple setup
- No firewall configuration needed

**Setup:**
1. Install Node.js on Minecraft server machine
2. Run API server on same machine
3. Use `localhost` in dashboard configuration
4. Set `WHITELIST_FILE` to actual whitelist.json path

**Configuration:**
```bash
# Dashboard
Minecraft Server Domain/URL: http://localhost:3003

# .env
WHITELIST_FILE=/path/to/minecraft/server/whitelist.json
```

### Option B: Different Machine

**Advantages:**
- Separate resources
- Can manage multiple servers
- Better for distributed setups

**Setup:**
1. Install Node.js on separate machine
2. Share whitelist.json via network path or file sync
3. Configure firewall to allow port 3003
4. Use server IP in dashboard configuration

**Configuration:**
```bash
# Dashboard
Minecraft Server Domain/URL: http://server-ip:3003

# .env (on API server machine)
WHITELIST_FILE=/mnt/network/minecraft/whitelist.json
# Or use file synchronization
```

**Network Path Examples:**
- Windows: `\\server\minecraft\whitelist.json`
- Linux: `/mnt/network/minecraft/whitelist.json`
- Or use file sync tools (rsync, robocopy, etc.)

### Option C: Docker Container

**Create Dockerfile:**
```dockerfile
FROM node:18
WORKDIR /app
COPY package.json .
RUN npm install
COPY whitelist-api.js .
EXPOSE 3003
CMD ["node", "whitelist-api.js"]
```

**Run container:**
```bash
docker build -t minecraft-whitelist-api .
docker run -d \
  -p 3003:3003 \
  -e MINECRAFT_API_KEY=your-key \
  -e WHITELIST_FILE=/data/whitelist.json \
  -v /path/to/minecraft:/data \
  minecraft-whitelist-api
```

## Server Types

### Vanilla Minecraft

**Compatibility:** ✅ Fully supported

**Setup:**
- Use file-based mode (no RCON needed)
- Set `WHITELIST_FILE` to server's whitelist.json
- Run `/whitelist reload` after changes (or restart server)

### Paper/Spigot

**Compatibility:** ✅ Fully supported

**Setup:**
- File-based mode works
- RCON recommended for better reliability
- See `documentation/RCON_SETUP.md` for RCON setup

### Fabric

**Compatibility:** ⚠️ File-based only

**Setup:**
- Use file-based mode
- No RCON support (Fabric doesn't have RCON)
- May need mod for better integration

### Velocity/BungeeCord

**Compatibility:** ⚠️ Limited

**Setup:**
- Each backend server needs its own API instance
- Configure different ports for each server
- Use different API keys for each server

## Production Deployment

### Using PM2 (Recommended)

**Install PM2:**
```bash
npm install -g pm2
```

**Start API server:**
```bash
cd minecraft-server
pm2 start whitelist-api.js --name minecraft-whitelist-api
```

**Save process list:**
```bash
pm2 save
```

**Setup startup script:**
```bash
pm2 startup
# Follow instructions to enable auto-start
```

**Useful PM2 commands:**
```bash
pm2 list              # List all processes
pm2 logs              # View logs
pm2 restart all       # Restart all processes
pm2 stop all          # Stop all processes
```

### Using systemd (Linux)

**Create service file:** `/etc/systemd/system/minecraft-whitelist-api.service`

```ini
[Unit]
Description=Minecraft Whitelist API
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/minecraft-server
Environment="NODE_ENV=production"
Environment="MINECRAFT_API_KEY=your-key"
Environment="MINECRAFT_API_PORT=3003"
Environment="WHITELIST_FILE=/path/to/whitelist.json"
Environment="SERVER_MODE=online"
ExecStart=/usr/bin/node whitelist-api.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl enable minecraft-whitelist-api
sudo systemctl start minecraft-whitelist-api
sudo systemctl status minecraft-whitelist-api
```

## Troubleshooting

### API Server Won't Start

**Check:**
- Node.js is installed: `node --version`
- Dependencies installed: `npm install`
- Port 3003 is available: `netstat -an | grep 3003`
- Environment variables are set correctly

### Cannot Write to Whitelist File

**Check:**
- File path is correct
- File permissions allow write access
- Directory exists
- Disk space available

**Fix permissions (Linux/Mac):**
```bash
chmod 644 whitelist.json
chown your-user:your-group whitelist.json
```

### Dashboard Can't Connect

**Check:**
- API server is running
- Port is correct (3003)
- Firewall allows connections
- API key matches exactly
- URL format is correct (http:// or https://)

**Test connection:**
```bash
curl http://localhost:3003/api/health
```

### Whitelist Not Updating In-Game

**Check:**
- File is being written (check timestamp)
- Minecraft server needs `/whitelist reload`
- File format is correct JSON
- No syntax errors in whitelist.json

**Reload whitelist:**
```
/whitelist reload
```

## Related Documentation

- **Communication Protocol:** `documentation/COMMUNICATION.md`
- **RCON Setup:** `documentation/RCON_SETUP.md`
- **Security:** `documentation/SECURITY.md`
- **Minecraft Server README:** `minecraft-server/README.md`
