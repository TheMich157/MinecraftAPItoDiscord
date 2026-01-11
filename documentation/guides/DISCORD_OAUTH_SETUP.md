# Discord OAuth Setup Guide

Complete guide for setting up Discord OAuth authentication for the dashboard.

## Overview

Discord OAuth allows users to login with their Discord account instead of manually entering their Discord ID. This provides a better user experience and more secure authentication.

## Features

- **One-click login** with Discord account
- **Automatic role detection** (Admin/Client)
- **Role selection** if user has both roles
- **Secure authentication** via Discord's OAuth2

## Setup Instructions

### Step 1: Create Discord OAuth Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your existing application (or create a new one)
3. Go to "OAuth2" section in the left sidebar
4. Under "Redirects", click "Add Redirect"
5. Add redirect URI:
   - Development: `http://localhost:3000/auth/discord/callback`
   - Production: `https://your-domain.com/auth/discord/callback`
6. Copy the **Client ID** and **Client Secret**
   - Client ID: Visible in OAuth2 section
   - Client Secret: Click "Reset Secret" to reveal (save it securely!)

### Step 2: Configure Environment Variables

**API Server (`api/.env`):**

```bash
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_CLIENT_SECRET=your-client-secret-here
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Dashboard URL (for OAuth redirects)
DASHBOARD_URL=http://localhost:3000
```

**Production:**

```bash
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_CLIENT_SECRET=your-client-secret-here
DISCORD_REDIRECT_URI=https://your-domain.com/auth/discord/callback
DASHBOARD_URL=https://your-domain.com
```

### Step 3: Configure Admin and Client Discord IDs

1. **Login to Admin Panel** (using developer key)
2. **Go to Configuration tab**
3. **Set Admin/Developer Discord IDs:**
   - Enter Discord user IDs (one per line)
   - These users will have admin access via Discord OAuth
4. **Set Client Discord IDs:**
   - Enter Discord user IDs (one per line)
   - These users will have client access via Discord OAuth
   - **Leave empty to allow all users** (not recommended for production)
5. **Click "Save Configuration"**

### Step 4: Test Discord OAuth

1. **Start all services:**
   ```bash
   # API Server
   cd api && npm run dev
   
   # Dashboard
   cd dashboard && npm start
   ```

2. **Open dashboard:** http://localhost:3000

3. **Click "Login with Discord"** button

4. **Authorize the application** in Discord

5. **Verify redirect:**
   - If you're admin only → Redirects to Admin Panel
   - If you're client only → Redirects to Client Dashboard
   - If you're both → Shows role selector

## How It Works

### Login Flow

```
1. User clicks "Login with Discord"
   ↓
2. Redirects to Discord OAuth
   ↓
3. User authorizes application
   ↓
4. Discord redirects back with code
   ↓
5. API exchanges code for access token
   ↓
6. API fetches user info from Discord
   ↓
7. API checks user roles (admin/client)
   ↓
8. Returns user data and roles
   ↓
9. Dashboard redirects based on roles
```

### Role Detection

The system checks Discord IDs against configured lists:

- **Admin Role:** User ID in `adminDiscordIds` list
- **Client Role:** User ID in `clientDiscordIds` list (or empty list = all users)
- **Both Roles:** User ID in both lists → Shows role selector

### Role Selector

If a user has both admin and client access:

1. **Role Selector appears** after login
2. **User chooses:**
   - **Admin Panel** - Full system management
   - **Client Dashboard** - Request submission and status
3. **Choice is saved** for the session
4. **User can switch** by logging out and back in

## Configuration in Admin Panel

### Admin/Developer Discord IDs

**Purpose:** Users who can access the admin panel

**Setup:**
1. Get Discord user IDs (enable Developer Mode, right-click user → Copy ID)
2. Enter IDs in "Admin/Developer Discord IDs" field (one per line)
3. Save configuration

**Example:**
```
123456789012345678
987654321098765432
```

### Client Discord IDs

**Purpose:** Users who can access the client dashboard

**Setup:**
1. Get Discord user IDs
2. Enter IDs in "Client Discord IDs" field (one per line)
3. **Leave empty to allow all users** (development only!)

**Example:**
```
111111111111111111
222222222222222222
333333333333333333
```

**Important:** In production, always specify client IDs for security.

## Security Considerations

### OAuth Security

1. **Client Secret:**
   - Never commit to version control
   - Store in environment variables only
   - Rotate if compromised

2. **Redirect URI:**
   - Must match exactly in Discord Developer Portal
   - Use HTTPS in production
   - Validate redirects server-side

3. **State Parameter:**
   - Used to prevent CSRF attacks
   - Generated randomly per request
   - Validated on callback

### Role Management

1. **Admin Access:**
   - Only grant to trusted users
   - Review admin list regularly
   - Remove access immediately if needed

2. **Client Access:**
   - Specify allowed IDs in production
   - Don't leave empty in production
   - Monitor access logs

## Troubleshooting

### "Discord OAuth not available"

**Problem:** Login button doesn't appear or shows error

**Solutions:**
- Check `DISCORD_CLIENT_ID` is set in API `.env`
- Verify API server is running
- Check browser console for errors
- Ensure dashboard can reach API server

### "Invalid redirect URI"

**Problem:** Discord shows redirect URI mismatch error

**Solutions:**
- Verify redirect URI in Discord Developer Portal matches exactly
- Check `DISCORD_REDIRECT_URI` in API `.env`
- Ensure no trailing slashes or extra characters
- Use correct protocol (http vs https)

### "Failed to authenticate with Discord"

**Problem:** OAuth callback fails

**Solutions:**
- Verify `DISCORD_CLIENT_SECRET` is correct
- Check API server logs for detailed errors
- Ensure redirect URI is correct
- Verify code hasn't expired (codes expire quickly)

### User not getting correct role

**Problem:** User has wrong access level

**Solutions:**
- Check Discord ID is in correct list (admin/client)
- Verify ID format (should be 17-18 digits)
- Check for extra spaces in configuration
- Save configuration after changes
- User may need to logout and login again

### Role selector not appearing

**Problem:** User has both roles but selector doesn't show

**Solutions:**
- Verify user ID is in both admin and client lists
- Check browser console for errors
- Clear browser cache and localStorage
- Try logging out and back in

## Manual Login Fallback

If Discord OAuth is not configured or fails:

1. **Client Login tab:**
   - Enter Discord ID manually
   - System checks against client IDs list

2. **Developer Access tab:**
   - Enter developer key
   - Bypasses Discord OAuth

## Production Deployment

### Environment Variables

Set in your hosting platform (Render, Heroku, etc.):

```bash
DISCORD_CLIENT_ID=your-production-client-id
DISCORD_CLIENT_SECRET=your-production-client-secret
DISCORD_REDIRECT_URI=https://your-domain.com/auth/discord/callback
DASHBOARD_URL=https://your-domain.com
```

### Discord Developer Portal

1. **Update Redirect URI:**
   - Remove development redirect
   - Add production redirect
   - Or keep both for testing

2. **Verify Settings:**
   - Client ID matches environment variable
   - Client Secret matches environment variable
   - Redirect URI matches exactly

## Best Practices

1. **Use HTTPS in production** - Required for secure OAuth
2. **Rotate secrets regularly** - Change client secret periodically
3. **Monitor access logs** - Review who's accessing the system
4. **Limit admin access** - Only grant to necessary users
5. **Specify client IDs** - Don't allow all users in production
6. **Test thoroughly** - Verify all roles work correctly

## Related Documentation

- **Installation:** `documentation/INSTALLATION.md`
- **Security:** `documentation/SECURITY.md`
- **Configuration:** See Admin Panel Configuration tab
