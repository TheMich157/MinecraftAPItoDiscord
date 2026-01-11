# Recent Changes Summary

## Discord OAuth Integration

### New Features Added

1. **Discord OAuth Login**
   - Added "Login with Discord" button on login page
   - One-click authentication via Discord
   - Automatic role detection (Admin/Client)

2. **Separate Role Management**
   - Admin/Developer Discord IDs (separate list)
   - Client Discord IDs (separate list)
   - Legacy "Allowed Discord IDs" field (for backward compatibility)

3. **Role Selection**
   - If user has both admin and client access, role selector appears
   - User can choose which dashboard to access
   - Choice saved for session

4. **Minecraft Server API Fix**
   - No longer creates new whitelist.json if file doesn't exist
   - Returns error if whitelist file not found
   - Must use existing whitelist.json file

### Files Modified

**API Server (`api/server.js`):**
- Added Discord OAuth endpoints (`/api/auth/discord`, `/api/auth/discord/callback`)
- Updated config to include `adminDiscordIds` and `clientDiscordIds`
- Added role checking logic

**Dashboard (`dashboard/src/`):**
- `Login.js` - Added Discord OAuth button and handler
- `App.js` - Added role selection logic and Discord callback handling
- `AdminPanel.js` - Added separate fields for admin and client Discord IDs
- `Dashboard.js` - Updated to handle Discord user objects
- `RoleSelector.js` - New component for role selection
- `DiscordCallback.js` - New component for OAuth callback

**Bot (`bot/index.js`):**
- Updated to check `clientDiscordIds` in addition to legacy `allowedDiscordIds`

**Minecraft Server API (`minecraft-server/whitelist-api.js`):**
- Fixed to not create new whitelist.json
- Returns error if file doesn't exist (must use existing file)

### Environment Variables Added

**API Server (`api/.env`):**
```bash
DISCORD_CLIENT_ID=your-discord-oauth-client-id
DISCORD_CLIENT_SECRET=your-discord-oauth-client-secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
DASHBOARD_URL=http://localhost:3000
```

### Configuration Changes

**Admin Panel Configuration:**
- **Admin/Developer Discord IDs** - Users who can access admin panel via OAuth
- **Client Discord IDs** - Users who can access client dashboard via OAuth
- **Allowed Discord IDs (Legacy)** - Backward compatibility field

### How It Works

1. **User clicks "Login with Discord"**
2. Redirects to Discord OAuth
3. User authorizes application
4. Discord redirects back with code
5. API exchanges code for user info
6. API checks user ID against:
   - `adminDiscordIds` → Admin role
   - `clientDiscordIds` → Client role
7. If both roles → Show role selector
8. If single role → Redirect to appropriate dashboard

### Setup Required

1. **Create Discord OAuth Application:**
   - Go to Discord Developer Portal
   - Add redirect URI: `http://localhost:3000/auth/discord/callback`
   - Copy Client ID and Client Secret

2. **Set Environment Variables:**
   - Add to `api/.env` file
   - See `api/.env.example` for template

3. **Configure Discord IDs:**
   - Login to admin panel
   - Add admin Discord IDs
   - Add client Discord IDs
   - Save configuration

### Documentation

- **Discord OAuth Setup:** `documentation/DISCORD_OAUTH_SETUP.md`
- **All documentation moved to:** `documentation/` folder

### Breaking Changes

- **Minecraft Server API:** Now requires existing whitelist.json file
- **Config Structure:** Added `adminDiscordIds` and `clientDiscordIds` fields
- **Legacy Support:** `allowedDiscordIds` still works but is deprecated

### Migration Guide

**For Existing Installations:**

1. **Update Config:**
   - Existing `allowedDiscordIds` will be used for client access
   - Add admin IDs to new `adminDiscordIds` field
   - Optionally migrate client IDs to `clientDiscordIds`

2. **Set Up OAuth (Optional):**
   - Add Discord OAuth credentials to `api/.env`
   - Configure redirect URI in Discord Developer Portal
   - Users can now use OAuth login

3. **Minecraft Server:**
   - Ensure whitelist.json exists
   - Update `WHITELIST_FILE` path if needed
   - API will no longer create new file
