# RCON Setup Guide

RCON (Remote Console) allows the API to execute Minecraft server commands directly, which is more reliable than file editing for Paper/Spigot servers.

## Why Use RCON?

**Advantages:**
- Server automatically reloads whitelist
- No file permission issues
- Works better with Paper/Spigot
- Can execute other server commands
- More reliable than file editing

**Disadvantages:**
- Requires RCON to be enabled on server
- Additional network connection
- Slightly more complex setup

## Setup Instructions

### Step 1: Enable RCON on Minecraft Server

**For Vanilla/Paper/Spigot:**

Edit `server.properties`:
```properties
enable-rcon=true
rcon.port=25575
rcon.password=your-secure-password-here
```

**Important:** Choose a strong password!

### Step 2: Restart Server

Restart your Minecraft server for changes to take effect.

### Step 3: Test RCON Connection

Test from command line:
```bash
# Install mcrcon (if not installed)
# Linux: sudo apt-get install mcrcon
# Mac: brew install mcrcon
# Windows: Download from https://github.com/Tiiffi/mcrcon

# Test connection
mcrcon -H localhost -P 25575 -p your-password "whitelist list"
```

### Step 4: Configure API

Edit `.env` file:
```bash
RCON_ENABLED=true
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-secure-password-here
```

### Step 5: Restart API Server

```bash
npm start
```

You should see:
```
RCON enabled: true
RCON host: localhost:25575
```

## How It Works

When RCON is enabled:

1. **File is still updated** (for backup/consistency)
2. **RCON command is also executed** (for immediate effect)
3. **Server reloads whitelist automatically**

Example flow:
```
Request → Update whitelist.json → Execute "whitelist add PlayerName" via RCON → Done
```

## RCON Commands Used

- `whitelist add <username>` - Add player to whitelist
- `whitelist remove <username>` - Remove player from whitelist
- `whitelist reload` - Reload whitelist (optional, usually automatic)

## Security Considerations

1. **Strong Password:**
   - Use a long, random password
   - Different from server admin password
   - Store in `.env` file only

2. **Network Access:**
   - RCON should only be accessible locally
   - Use firewall to block external access
   - Consider VPN for remote access

3. **Port Security:**
   - Default port is 25575
   - Change if needed
   - Don't expose to internet

## Troubleshooting

### "RCON connection failed"

**Check:**
- RCON is enabled in `server.properties`
- Server has been restarted
- Port number is correct
- Password is correct
- Firewall allows connection

### "RCON command failed"

**Check:**
- Server is running
- RCON is enabled
- Password is correct
- Command syntax is correct

### "File updated but RCON failed"

**This is OK:**
- File is still updated
- You can manually reload: `/whitelist reload`
- Check RCON configuration

## Alternative: File-Only Mode

If you don't want to use RCON:

1. Set `RCON_ENABLED=false` in `.env`
2. API will only update `whitelist.json`
3. You must run `/whitelist reload` manually in server console

## Testing

Test RCON integration:

```bash
# Add a test player
curl -X POST http://localhost:3003/api/whitelist/add \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer"}'

# Check server console - should see whitelist add message
# Check whitelist.json - should have TestPlayer
# Check in-game - TestPlayer should be whitelisted
```

## Advanced: Custom RCON Commands

You can extend the API to execute custom commands:

```javascript
// Example: Broadcast message when player is whitelisted
await executeRCONCommand(`whitelist add ${username}`);
await executeRCONCommand(`say ${username} has been whitelisted!`);
```

## Production Deployment

For production:

1. **Use strong RCON password**
2. **Restrict RCON port access** (firewall)
3. **Monitor RCON access logs**
4. **Use VPN for remote access**
5. **Regularly rotate RCON password**

## Support

For RCON-specific issues:
- Check Minecraft server logs
- Verify `server.properties` settings
- Test with `mcrcon` command-line tool
- Review API server logs for RCON errors
