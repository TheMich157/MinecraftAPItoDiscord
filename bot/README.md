# Discord Bot - Minecraft Whitelist Management

Advanced Discord bot for managing Minecraft server whitelist requests, executing server commands, and mirroring console output.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Commands](#commands)
5. [RCON Integration](#rcon-integration)
6. [Console Mirroring](#console-mirroring)
7. [Utilities](#utilities)
8. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Features
- ✅ **Whitelist Request Management** - Users can submit whitelist requests via Discord
- ✅ **Admin Commands** - Full server management through Discord
- ✅ **RCON Integration** - Execute Minecraft server commands remotely
- ✅ **Console Mirroring** - Real-time server console output in Discord
- ✅ **Smart Caching** - Optimized performance with intelligent caching
- ✅ **Command Cooldowns** - Prevents spam and abuse
- ✅ **Comprehensive Logging** - All actions logged for audit trails

### Security Features
- ✅ **Permission System** - Role-based access control
- ✅ **Input Validation** - All inputs validated and sanitized
- ✅ **Dangerous Command Blocking** - Prevents accidental server shutdowns
- ✅ **Rate Limiting** - Command cooldowns prevent abuse
- ✅ **Secure Token Storage** - Encrypted bot tokens

---

## 🚀 Installation

### Prerequisites
- Node.js 16+ installed
- Discord bot token
- (Optional) RCON enabled on Minecraft server
- (Optional) Minecraft server log file access

### Install Dependencies

```bash
# From project root
npm install

# Or install mcrcon separately (optional, for RCON features)
npm install mcrcon --save-optional
```

### Environment Variables

Create `bot/.env` file:

```bash
# Required
API_URL=http://localhost:3001
BOT_PORT=3002
DISCORD_CLIENT_ID=your-discord-client-id
NOTIFY_SECRET=your-secure-notify-secret

# RCON Configuration (Optional, for admin commands)
RCON_ENABLED=true
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-rcon-password

# Console Mirroring (Optional)
CONSOLE_MIRROR_ENABLED=true
MINECRAFT_LOG_FILE=/path/to/logs/latest.log
# OR
MINECRAFT_SERVER_PATH=/path/to/minecraft/server

# Dashboard URL (Auto-detected based on NODE_ENV)
DASHBOARD_URL=http://localhost:3000  # Development
# OR
DASHBOARD_URL=https://manihub.xyz    # Production
```

---

## ⚙️ Configuration

### Bot Token Setup

1. **Get Bot Token:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Go to "Bot" section
   - Copy the bot token

2. **Configure in Dashboard:**
   - Login to admin dashboard
   - Go to Configuration tab
   - Paste bot token
   - Save configuration

### RCON Setup

1. **Enable RCON on Minecraft Server:**
   ```properties
   # server.properties
   enable-rcon=true
   rcon.port=25575
   rcon.password=YourSecurePassword123!
   ```

2. **Configure in Bot:**
   ```bash
   RCON_ENABLED=true
   RCON_HOST=localhost
   RCON_PORT=25575
   RCON_PASSWORD=YourSecurePassword123!
   ```

3. **Restart Minecraft Server** (RCON only activates after restart)

### Console Mirroring Setup

**Option 1: Direct Log File Path**
```bash
CONSOLE_MIRROR_ENABLED=true
MINECRAFT_LOG_FILE=/path/to/minecraft/server/logs/latest.log
```

**Option 2: Server Path (Auto-detect)**
```bash
CONSOLE_MIRROR_ENABLED=true
MINECRAFT_SERVER_PATH=/path/to/minecraft/server
```

The bot will automatically find `logs/latest.log` in the server directory.

---

## 🎮 Commands

### Public Commands

#### `/server` or `/ip`
**Description:** Get Minecraft server IP/domain  
**Usage:** `/server`  
**Cooldown:** 3 seconds  
**Example:**
```
/server
→ Shows: Minecraft Server Information
   Server IP/Domain: play.example.com
```

#### `/dashboard`
**Description:** Get link to whitelist dashboard  
**Usage:** `/dashboard`  
**Cooldown:** 3 seconds  
**Example:**
```
/dashboard
→ Shows: Whitelist Dashboard
   Access the whitelist dashboard at:
   https://manihub.xyz
```

#### `/requestwhitelist`
**Description:** Submit a whitelist request  
**Usage:** `/requestwhitelist [minecraft_username:PlayerName]`  
**Cooldown:** 10 seconds  
**Permissions:** Client access required (if configured)  
**Example:**
```
/requestwhitelist minecraft_username:PlayerName
→ Creates whitelist request
→ Sends notification to admin channel
→ Confirms submission to user
```

### Admin Commands

**Note:** All admin commands require administrator Discord ID in `ADMIN_DISCORD_IDS` or `config.json`.

#### `/whitelist add <username>`
**Description:** Add player to whitelist  
**Usage:** `/whitelist add username:PlayerName`  
**Cooldown:** 2 seconds  
**Permissions:** Admin only  
**Example:**
```
/whitelist add username:PlayerName
→ Adds PlayerName to whitelist
→ Executes RCON command (if enabled)
→ Shows success confirmation
```

#### `/whitelist remove <username>`
**Description:** Remove player from whitelist  
**Usage:** `/whitelist remove username:PlayerName`  
**Cooldown:** 2 seconds  
**Permissions:** Admin only  
**Example:**
```
/whitelist remove username:PlayerName
→ Removes PlayerName from whitelist
→ Executes RCON command (if enabled)
→ Shows success confirmation
```

#### `/whitelist list [username]`
**Description:** List all whitelisted players (optional search)  
**Usage:** `/whitelist list [username:PlayerName]`  
**Cooldown:** 2 seconds  
**Permissions:** Admin only  
**Example:**
```
/whitelist list
→ Shows all whitelisted players

/whitelist list username:Player
→ Shows players matching "Player"
```

#### `/whitelist reload`
**Description:** Reload whitelist from file  
**Usage:** `/whitelist reload`  
**Cooldown:** 2 seconds  
**Permissions:** Admin only  
**Requirements:** RCON enabled  
**Example:**
```
/whitelist reload
→ Executes: whitelist reload
→ Shows success confirmation
```

#### `/ban <username> [reason]`
**Description:** Ban a player from the server  
**Usage:** `/ban username:PlayerName [reason:Cheating]`  
**Cooldown:** 3 seconds  
**Permissions:** Admin only  
**Requirements:** RCON enabled  
**Example:**
```
/ban username:PlayerName reason:Cheating
→ Executes: ban PlayerName Cheating
→ Shows ban confirmation
```

#### `/pardon <username>`
**Description:** Unban a player from the server  
**Usage:** `/pardon username:PlayerName`  
**Cooldown:** 3 seconds  
**Permissions:** Admin only  
**Requirements:** RCON enabled  
**Example:**
```
/pardon username:PlayerName
→ Executes: pardon PlayerName
→ Shows unban confirmation
```

#### `/command <command>`
**Description:** Execute any Minecraft server command  
**Usage:** `/command command:tp PlayerName 0 100 0`  
**Cooldown:** 5 seconds  
**Permissions:** Admin only  
**Requirements:** RCON enabled  
**Safety:** Dangerous commands (`stop`, `shutdown`, `restart`, `kill`, `op`, `deop`) are blocked  
**Example:**
```
/command command:say Hello World
→ Executes: say Hello World
→ Shows command response
```

### Text Commands (Legacy Support)

For servers that don't support slash commands:

- `!ip` or `!server` - Shows server IP/domain
- `!dashboard` - Shows dashboard link

---

## 🔌 RCON Integration

### What is RCON?

RCON (Remote Console) is a protocol that allows remote command execution on Minecraft servers. It enables the bot to execute server commands without direct file access.

### Benefits

- ✅ **Real-time Updates** - Commands execute immediately
- ✅ **No File Reload** - No need to manually reload whitelist
- ✅ **Full Server Control** - Execute any server command
- ✅ **Secure** - Password-protected access

### Setup

1. **Enable RCON in `server.properties`:**
   ```properties
   enable-rcon=true
   rcon.port=25575
   rcon.password=YourSecurePassword123!
   ```

2. **Configure Bot:**
   ```bash
   RCON_ENABLED=true
   RCON_HOST=localhost
   RCON_PORT=25575
   RCON_PASSWORD=YourSecurePassword123!
   ```

3. **Restart Minecraft Server**

### Features

- **Automatic Retry** - Retries failed commands up to 3 times
- **Connection Management** - Efficient connection handling
- **Command Validation** - Validates and sanitizes all commands
- **Error Handling** - Clear error messages on failures

### Security

- **Dangerous Command Blocking** - Prevents accidental server shutdowns
- **Command Sanitization** - Prevents injection attacks
- **Password Protection** - Secure RCON password required

---

## 📺 Console Mirroring

### Overview

Console mirroring sends Minecraft server console output to a Discord channel in real-time.

### Features

- ✅ **Real-time Updates** - See server logs as they happen
- ✅ **Smart Filtering** - Filters chat messages and spam
- ✅ **Formatted Output** - Clean, readable log messages
- ✅ **Rate Limiting** - Prevents message spam
- ✅ **Message Queuing** - Batches messages for efficiency

### Setup

**Option 1: Direct Log File**
```bash
CONSOLE_MIRROR_ENABLED=true
MINECRAFT_LOG_FILE=/path/to/logs/latest.log
```

**Option 2: Server Path (Auto-detect)**
```bash
CONSOLE_MIRROR_ENABLED=true
MINECRAFT_SERVER_PATH=/path/to/minecraft/server
```

### Filtering

The console mirror automatically filters:
- Chat messages (`<Player> message`)
- Spam messages
- Very short messages (< 5 characters)

### Formatting

Log messages are formatted with:
- Timestamps (if available)
- Code blocks for readability
- Truncation for long messages

---

## 🛠️ Utilities

### `bot/utils.js`

Utility functions for common operations:

#### Caching
- `readConfig(cache)` - Read config with caching
- `getServerIP(cache)` - Get server IP with caching
- `clearCache(type)` - Clear cache

#### Validation
- `validateMinecraftUsername(username)` - Validate username format
- `escapeDiscordMarkdown(text)` - Escape markdown characters

#### Formatting
- `truncateText(text, maxLength)` - Truncate text
- `formatCodeBlock(content, language)` - Format code blocks
- `formatList(items, maxLength)` - Format item lists
- `paginateArray(array, page, perPage)` - Paginate arrays

#### Embeds
- `createErrorEmbed(title, description, error)` - Create error embed
- `createSuccessEmbed(title, description, fields)` - Create success embed
- `createInfoEmbed(title, description, fields, color)` - Create info embed

#### Cooldowns
- `checkCooldown(userId, command, cooldownMs)` - Check command cooldown

#### Logging
- `logAction(action, userId, details)` - Log user actions

### `bot/rcon-utils.js`

RCON utility functions:

#### Connection
- `initializeRCON(host, port, password)` - Initialize RCON connection
- `executeRCONCommand(command, retries)` - Execute RCON command with retry

#### Log Watching
- `watchLogFile(logFilePath, onLogLine, onError)` - Watch log file for changes
- `getLogFilePath(serverPath)` - Find log file path

#### Utilities
- `escapeRCONCommand(input)` - Escape RCON command
- `sanitizeCommand(input)` - Sanitize command input
- `getRCONConfig()` - Get RCON configuration

---

## 🔧 Troubleshooting

### Bot Not Responding

**Problem:** Bot doesn't respond to commands

**Solutions:**
1. ✅ Check bot is online in Discord (green dot)
2. ✅ Verify bot token is correct in dashboard
3. ✅ Check bot console for errors
4. ✅ Verify bot has proper permissions in Discord server
5. ✅ Restart bot server

### Slash Commands Not Appearing

**Problem:** `/command` doesn't appear when typing `/`

**Solutions:**
1. ✅ Wait 5-10 minutes (Discord caches commands globally)
2. ✅ Re-invite bot with `applications.commands` scope
3. ✅ Check bot console for registration errors
4. ✅ Verify bot has proper permissions

### RCON Commands Failing

**Problem:** Admin commands return "RCON not enabled" or connection errors

**Solutions:**
1. ✅ Verify `RCON_ENABLED=true` in `bot/.env`
2. ✅ Check RCON host, port, and password are correct
3. ✅ Verify RCON is enabled in `server.properties`
4. ✅ Restart Minecraft server after enabling RCON
5. ✅ Test RCON connection manually:
   ```bash
   # Install mcrcon-cli
   mcrcon-cli -H localhost -P 25575 -p YourPassword "list"
   ```

### Console Mirroring Not Working

**Problem:** Console output not appearing in Discord

**Solutions:**
1. ✅ Verify `CONSOLE_MIRROR_ENABLED=true` in `bot/.env`
2. ✅ Check log file path is correct
3. ✅ Verify log file exists and is readable
4. ✅ Check notification channel ID is configured
5. ✅ Verify bot has permission to send messages in channel
6. ✅ Check bot console for errors

### Permission Denied Errors

**Problem:** "You do not have permission to use this command"

**Solutions:**
1. ✅ Verify your Discord ID is in `ADMIN_DISCORD_IDS` environment variable
2. ✅ Or add your Discord ID in dashboard → Configuration → Admin Discord IDs
3. ✅ Check Discord ID format (17-19 digit number)
4. ✅ Restart bot after changing admin IDs

### Command Cooldown Issues

**Problem:** "Please wait X second(s) before using this command again"

**Solutions:**
1. ✅ Wait for cooldown to expire
2. ✅ Cooldowns are per-user, per-command
3. ✅ Cooldown times:
   - `/server`, `/dashboard`: 3 seconds
   - `/whitelist`: 2 seconds
   - `/ban`, `/pardon`: 3 seconds
   - `/command`: 5 seconds
   - `/requestwhitelist`: 10 seconds

---

## 📊 Performance

### Caching

The bot uses intelligent caching to improve performance:

- **Config Cache:** 30 seconds TTL
- **IP Cache:** 60 seconds TTL
- **Admin Cache:** 60 seconds TTL

### Rate Limiting

- **Command Cooldowns:** Per-user, per-command
- **Console Mirroring:** Message queuing with 1-second delay
- **API Requests:** 10-second timeout

---

## 🔒 Security

### Permission System

- **Admin Commands:** Require Discord ID in `ADMIN_DISCORD_IDS`
- **Client Commands:** Require Discord ID in `CLIENT_DISCORD_IDS` (if configured)
- **Public Commands:** Available to everyone

### Input Validation

- **Username Validation:** 3-16 alphanumeric characters and underscores
- **Command Sanitization:** All RCON commands sanitized
- **Dangerous Command Blocking:** Prevents accidental server shutdowns

### Token Security

- **Encrypted Storage:** Bot tokens encrypted with AES-256-GCM
- **Environment Variables:** Sensitive data in `.env` files
- **Never Committed:** `.env` files in `.gitignore`

---

## 📝 Logging

All actions are logged with:
- Timestamp
- Action type
- User ID
- Details (command, username, etc.)
- Success/failure status

**Log Format:**
```
[ACTION] 2024-01-01T12:00:00.000Z | WHITELIST_ADD | User: 123456789 | {"username":"PlayerName","uuid":"..."}
```

---

## 🚀 Running the Bot

### Development

```bash
# From project root
npm run dev:bot

# Or from bot directory
cd bot
npm run dev
```

### Production

```bash
# From project root
npm run start:bot

# Or from bot directory
cd bot
npm start
```

---

## 📚 Related Documentation

- **[Main README](../README.md)** - Project overview
- **[API Documentation](../api/README.md)** - API server documentation
- **[RCON Setup Guide](../documentation/guides/RCON_SETUP.md)** - Detailed RCON setup
- **[Security Guide](../documentation/security/SECURITY.md)** - Security best practices

---

## 🐛 Reporting Issues

If you encounter issues:

1. Check bot console for error messages
2. Verify all environment variables are set
3. Check Discord bot permissions
4. Review troubleshooting section above
5. Check logs for detailed error information

---

**Last Updated:** January 2024  
**Version:** 1.0.0
