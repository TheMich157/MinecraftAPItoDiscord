# Changelog - Security and Production Fixes

## Version 2.0.0 - Production Ready

### Critical Fixes

1. **Fixed Path Injection Vulnerability**
   - Removed ability to accept file paths from requests
   - Only uses environment variable `WHITELIST_FILE`
   - Added path validation to ensure security

2. **Fixed UUID Generation**
   - Added offline UUID generation for cracked servers
   - UUIDs are now properly generated, not left empty
   - Works with both online and offline servers

3. **Fixed Race Conditions**
   - Implemented file locking mechanism
   - Prevents concurrent file writes
   - Queues requests to prevent data corruption

### Security Enhancements

1. **Path Injection Protection**
   - File paths can only be set via environment variables
   - Requests cannot override file paths
   - Path validation ensures files stay within allowed directory

2. **Rate Limiting**
   - Basic rate limiting: 10 requests per minute per IP
   - Prevents brute force attacks
   - Configurable limits

3. **Input Validation**
   - Username format validation (Minecraft rules)
   - JSON structure validation
   - Prevents injection attacks

4. **Audit Logging**
   - All actions are logged with timestamps
   - IP addresses tracked
   - Success/failure tracking
   - Error details logged

### New Features

1. **RCON Support**
   - Optional RCON integration for Paper/Spigot
   - Direct server command execution
   - More reliable than file editing alone
   - See `RCON_SETUP.md` for details

2. **Server Mode Configuration**
   - `SERVER_MODE=online` for Mojang servers
   - `SERVER_MODE=offline` for cracked servers
   - Automatic UUID generation based on mode

3. **Better Error Handling**
   - Detailed error messages
   - Proper error logging
   - Graceful failure handling

### Documentation

All documentation has been reorganized into the `documentation/` folder:

1. **documentation/SECURITY.md** - Security features and best practices
2. **documentation/RCON_SETUP.md** - RCON configuration guide
3. **documentation/INSTALLATION.md** - Complete installation guide
4. **documentation/INTEGRATION_GUIDE.md** - Minecraft server integration
5. **documentation/COMMUNICATION.md** - API communication protocol
6. **documentation/PROJECT_STRUCTURE.md** - System architecture
7. **documentation/QUICK_START.md** - 5-minute setup guide
8. **Updated README.md** - Production-ready instructions with documentation links

### Breaking Changes

- **File paths from requests are no longer accepted** (security fix)
- Must use `WHITELIST_FILE` environment variable
- RCON package is now optional (install separately if needed)

### Migration Guide

**Before:**
```javascript
// Could accept path from request (INSECURE)
const whitelistFile = req.body.whitelistFile || './whitelist.json';
```

**After:**
```bash
# Set in .env file (SECURE)
WHITELIST_FILE=./whitelist.json
```

```javascript
// Only uses environment variable
const WHITELIST_FILE = process.env.WHITELIST_FILE || './whitelist.json';
```

### Dependencies

- Added `mcrcon` as optional dependency (for RCON support)
- All other dependencies unchanged

### Testing

All security fixes have been tested:
- ✅ Path injection protection
- ✅ File locking prevents race conditions
- ✅ UUID generation works for offline servers
- ✅ Rate limiting prevents abuse
- ✅ Input validation works correctly

### Recommendations

1. **Update immediately** - Critical security fixes
2. **Review SECURITY.md** - Understand security features
3. **Set SERVER_MODE** - Configure for your server type
4. **Enable RCON** - If using Paper/Spigot (optional)
5. **Review audit logs** - Monitor for suspicious activity
