# RCON Explained

## What is RCON?

**RCON (Remote Console)** is a protocol that allows remote execution of commands on your Minecraft server. It's like having a remote control for your server's console.

## How RCON Works

1. **Server Side:** Your Minecraft server runs an RCON server (usually on port 25575)
2. **Client Side:** External applications connect to the RCON server using a password
3. **Command Execution:** Commands are sent to the server and executed as if typed in the console
4. **Response:** The server returns the command output

## Why Use RCON?

### Without RCON (File Editing Only)
```
1. API adds player to whitelist.json file
2. File is updated on disk
3. Server needs to detect file change OR
4. Admin must manually run /whitelist reload
5. Player can join (after reload)
```

### With RCON Enabled
```
1. API adds player to whitelist.json file
2. API sends RCON command: whitelist add PlayerName
3. Server immediately adds player to active whitelist
4. API sends RCON command: whitelist reload (optional)
5. Player can join immediately
```

## Benefits

✅ **Instant Updates** - Changes take effect immediately  
✅ **Automatic Reload** - No need to manually reload whitelist  
✅ **More Reliable** - Works better with Paper/Spigot servers  
✅ **Better for Production** - Reduces delays and manual intervention  

## When to Use RCON

### ✅ Enable RCON If:
- You're using **Paper** or **Spigot** server
- You want **instant whitelist updates**
- You want **automatic reload** after adding players
- You have RCON enabled on your server

### ❌ Disable RCON If:
- You're using **vanilla Minecraft** (file editing is enough)
- RCON is not enabled on your server
- You prefer manual control
- You're running in development/testing

## Setup Instructions

### 1. Enable RCON on Your Server

**Step 1: Open `server.properties`**
- Located in your Minecraft server's root directory
- Edit with any text editor

**Step 2: Find or add these lines:**
```properties
enable-rcon=false
rcon.port=25575
rcon.password=
```

**Step 3: Enable and set password:**
```properties
enable-rcon=true
rcon.port=25575
rcon.password=YourSecurePassword123!
```

**Important:**
- **You create the password yourself** - choose a strong password (20+ characters)
- Replace `YourSecurePassword123!` with your own password
- **Remember this password** - you'll need it for the API configuration

**Step 4: Save and restart server**
- Save `server.properties`
- Restart your Minecraft server
- Check logs to confirm: `[Server] RCON running on 0.0.0.0:25575`

**For Paper/Spigot/Vanilla:**
All server types use the same `server.properties` settings shown above.

### 2. Determine RCON Host

**If API and Minecraft server are on the SAME machine:**
```
RCON_HOST=localhost
```

**If API and Minecraft server are on DIFFERENT machines:**
```
RCON_HOST=192.168.1.100
```
(Replace with your actual Minecraft server's IP address)

**To find your server IP:**
- Windows: `ipconfig` in Command Prompt
- Linux/Mac: `ifconfig` or `ip addr` in Terminal
- Remote server: Check hosting provider's control panel

### 3. Configure in API

Set in `minecraft-server/.env`:
```bash
RCON_ENABLED=true
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=YourSecurePassword123!
```

**Important:** 
- The password must **match exactly** what you set in `server.properties`
- Use `localhost` if API is on same machine as Minecraft server
- Use server IP if API is on a different machine

### 3. Test Connection

The API will automatically test RCON when:
- A whitelist request is approved
- A player is added to the whitelist

Check the logs for:
- `Added PlayerName via RCON` - Success
- `RCON error: ...` - Connection issue

## Security Best Practices

1. **Strong Password**
   - Use a long, random password (20+ characters)
   - Different from your server admin password
   - Store securely in `.env` file

2. **Network Security**
   - Only allow RCON from localhost (if API is on same machine)
   - Use firewall to restrict RCON port access
   - Consider VPN for remote access

3. **Access Control**
   - Limit who can modify RCON settings
   - Monitor RCON access logs
   - Rotate password periodically

## Troubleshooting

### "RCON connection failed"
- Check RCON is enabled in `server.properties`
- Verify RCON password matches
- Check RCON port (default: 25575)
- Ensure server is running

### "RCON command failed"
- Server might be overloaded
- Command syntax might be wrong
- Check server logs for errors

### "RCON not available"
- Install `mcrcon` package: `npm install mcrcon`
- Or disable RCON and use file editing only

## Commands Used

When RCON is enabled, the API sends:
- `whitelist add <username>` - Adds player to whitelist
- `whitelist remove <username>` - Removes player from whitelist
- `whitelist reload` - Reloads whitelist from file (optional)

## Alternative: File Editing Only

If you don't want to use RCON:
1. Set `RCON_ENABLED=false` in `.env`
2. The API will still update `whitelist.json`
3. You'll need to manually run `/whitelist reload` in-game
4. Or restart the server for changes to take effect

This works fine for:
- Vanilla servers
- Low-traffic servers
- Development/testing environments
