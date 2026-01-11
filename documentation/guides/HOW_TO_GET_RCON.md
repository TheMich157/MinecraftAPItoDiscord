# How to Get RCON Password and Host

This guide explains step-by-step how to find or set up your RCON password and host for your Minecraft server.

## Quick Answer

**RCON Password:** You create it yourself in `server.properties`  
**RCON Host:** 
- `localhost` if API is on the same machine as Minecraft server
- Your server's IP address if API is on a different machine
- Default port is `25575`

## Step-by-Step Guide

### Step 1: Locate Your `server.properties` File

The `server.properties` file is in your Minecraft server's root directory:

**Common Locations:**
- Windows: `C:\minecraft-server\server.properties`
- Linux/Mac: `~/minecraft-server/server.properties`
- Or wherever you installed your server: `./server.properties`

### Step 2: Open `server.properties` in a Text Editor

Use any text editor (Notepad, VS Code, nano, vim, etc.)

### Step 3: Find or Add RCON Settings

Look for these lines in `server.properties`:

```properties
enable-rcon=false
rcon.port=25575
rcon.password=
```

If they don't exist, add them at the end of the file.

### Step 4: Enable RCON and Set Password

**Change the settings to:**

```properties
enable-rcon=true
rcon.port=25575
rcon.password=YourSecurePassword123!
```

**Important:**
- Replace `YourSecurePassword123!` with your own strong password
- Use a long password (20+ characters recommended)
- Don't use special characters that might cause issues (stick to letters, numbers, and basic symbols)
- **Remember this password** - you'll need it for the API configuration

**Example of a good password:**
```
rcon.password=MyMinecraftServer2024RCONPassword
```

### Step 5: Determine Your RCON Host

**If API and Minecraft server are on the SAME machine:**
```
RCON_HOST=localhost
```

**If API and Minecraft server are on DIFFERENT machines:**
```
RCON_HOST=192.168.1.100
```
(Replace with your actual Minecraft server's IP address)

**To find your server's IP:**
- **Windows:** Open Command Prompt, type `ipconfig`, look for IPv4 Address
- **Linux/Mac:** Open Terminal, type `ifconfig` or `ip addr`, look for inet address
- **Remote server:** Check your hosting provider's control panel

### Step 6: Save and Restart Server

1. **Save** `server.properties`
2. **Restart your Minecraft server** for changes to take effect
3. Check server logs to confirm RCON is enabled:
   ```
   [Server] RCON running on 0.0.0.0:25575
   ```

### Step 7: Configure in API

Add these to your `minecraft-server/.env` file:

```bash
RCON_ENABLED=true
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=YourSecurePassword123!
```

**Important:** The password must match exactly what you set in `server.properties`!

## Complete Example

### In `server.properties`:
```properties
enable-rcon=true
rcon.port=25575
rcon.password=MyServer2024RCONPass
```

### In `minecraft-server/.env`:
```bash
RCON_ENABLED=true
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=MyServer2024RCONPass
```

## Testing RCON Connection

### Option 1: Test from Command Line

**Install mcrcon:**
- **Linux:** `sudo apt-get install mcrcon`
- **Mac:** `brew install mcrcon`
- **Windows:** Download from https://github.com/Tiiffi/mcrcon

**Test connection:**
```bash
mcrcon -H localhost -P 25575 -p YourPassword "whitelist list"
```

If it works, you'll see the whitelist. If it fails, check:
- Server is running
- RCON is enabled in server.properties
- Password is correct
- Port is correct (25575)

### Option 2: Test via API

1. Start your Minecraft API server
2. Approve a whitelist request in the dashboard
3. Check API logs for:
   - ✅ `Added PlayerName via RCON` - Success!
   - ❌ `RCON error: ...` - Check configuration

## Common Issues

### "RCON connection failed"

**Check:**
1. ✅ `enable-rcon=true` in server.properties
2. ✅ Password matches exactly in both files
3. ✅ Server was restarted after changing server.properties
4. ✅ RCON_HOST is correct:
   - `localhost` for same machine
   - Server IP for different machine
5. ✅ Port is 25575 (default)

### "RCON password incorrect"

- Check for extra spaces in password
- Make sure password matches exactly in both files
- Some special characters might cause issues - try alphanumeric only

### "Cannot connect to RCON host"

**If using `localhost`:**
- Make sure API is on the same machine as Minecraft server

**If using IP address:**
- Check firewall allows port 25575
- Verify IP address is correct
- Try `ping <server-ip>` to test connectivity

## Security Notes

1. **Strong Password:** Use a long, random password
2. **Firewall:** Only allow RCON from trusted IPs
3. **Localhost Only:** If API is on same machine, use `localhost` (more secure)
4. **Don't Share:** Keep RCON password secret
5. **Rotate Periodically:** Change password every few months

## Summary

1. **RCON Password:** Set it yourself in `server.properties` → `rcon.password=YourPassword`
2. **RCON Host:** 
   - `localhost` if same machine
   - Server IP if different machine
3. **RCON Port:** Usually `25575` (default)
4. **Copy to `.env`:** Use the same values in `minecraft-server/.env`
5. **Restart:** Restart Minecraft server after changes

That's it! Your RCON password and host are now configured.
