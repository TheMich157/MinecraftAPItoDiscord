# Project Structure and Architecture

A comprehensive guide to understanding how the Minecraft Whitelist Dashboard is organized, how components communicate, and how data flows through the system.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [File Structure](#file-structure)
4. [Component Details](#component-details)
5. [Data Flow](#data-flow)
6. [Data Storage](#data-storage)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Communication Protocols](#communication-protocols)
10. [Environment Configuration](#environment-configuration)

---

## 🎯 System Overview

The Minecraft Whitelist Dashboard is a distributed system consisting of four main components:

1. **API Server** - Central backend handling all business logic and data management
2. **Discord Bot** - Handles Discord commands and notifications
3. **Web Dashboard** - User interface for clients and administrators
4. **Minecraft Server API** - Integration layer for Minecraft server whitelist management

Each component operates independently but communicates via HTTP/REST APIs, making the system modular and easy to deploy.

---

## 🏗️ Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                               │
├──────────────────────────┬──────────────────────────────────────┤
│    Discord Users         │      Web Dashboard Users            │
│    (Discord Server)      │      (Browser)                       │
└──────────┬───────────────┴──────────────┬───────────────────────┘
           │                               │
           │ Discord API / Slash Commands  │ HTTP Requests
           │                               │
           ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                │
├──────────────────────────┬──────────────────────────────────────┤
│    Discord Bot           │         API Server                   │
│    (Node.js / Port 3002) │      (Express.js / Port 3001)       │
│                          │                                      │
│  • Command Handling      │  • REST API Endpoints               │
│  • Slash Commands        │  • Configuration Management         │
│  • Notifications         │  • Request Processing               │
│  • User DMs              │  • Authentication                   │
└──────────┬───────────────┴──────────────┬───────────────────────┘
           │                               │
           │ Notify Endpoint               │ HTTP POST (API Key Auth)
           │                               │
           ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Minecraft Server Integration Layer                 │
├─────────────────────────────────────────────────────────────────┤
│         Minecraft Server API (Express.js / Port 3003)          │
│                                                                 │
│  • Whitelist Management                                         │
│  • UUID Generation                                              │
│  • RCON Integration (Optional)                                  │
│  • File I/O Operations                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ File I/O / RCON Commands
                           │
                           ▼
              ┌────────────────────────────┐
              │   Minecraft Server         │
              │   ┌──────────────────────┐ │
              │   │   whitelist.json    │ │
              │   └──────────────────────┘ │
              │   │   server.properties  │ │
              │   └──────────────────────┘ │
              └────────────────────────────┘
```

### Request Flow Architecture

```
User Request Flow:
─────────────────
Discord /requestwhitelist → Bot → API Server → Save Request → Notify Channel
                                    │
                                    ▼
Dashboard Submit → API Server → Save Request → Notify Channel

Admin Approval Flow:
────────────────────
Admin Login → Dashboard → API Server → Update Request Status
                                      │
                                      ├─→ Notify Bot → Discord User (DM)
                                      │
                                      └─→ Minecraft API → whitelist.json
                                                          │
                                                          └─→ RCON Command (if enabled)
```

---

## 📁 File Structure

```
MinecraftAPItoDiscord/
│
├── 📂 api/                          # Backend API Server
│   ├── 📄 server.js                 # Express server with all REST endpoints
│   ├── 📄 config.js                 # Centralized environment variable management
│   ├── 📄 middleware.js             # Security middleware (auth, validation, rate limiting)
│   ├── 📄 crypto-utils.js           # Encryption/decryption utilities (AES-256-GCM)
│   ├── 📦 package.json              # (No longer used - see root package.json)
│   └── 📄 .env.example              # Environment variables template
│
├── 📂 bot/                          # Discord Bot Service
│   ├── 📄 index.js                  # Bot logic, commands, notifications
│   ├── 📄 config.js                 # Bot environment configuration
│   ├── 📦 package.json              # (No longer used - see root package.json)
│   └── 📄 .env.example              # Environment variables template
│
├── 📂 dashboard/                    # React Web Dashboard
│   ├── 📂 public/
│   │   └── 📄 index.html            # HTML entry point
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── 📄 Login.js          # Login page (Client/Developer/Discord OAuth)
│   │   │   ├── 📄 Login.css         # Login styles
│   │   │   ├── 📄 Dashboard.js      # Client dashboard (submit requests, view status)
│   │   │   ├── 📄 Dashboard.css     # Dashboard styles
│   │   │   ├── 📄 AdminPanel.js     # Admin panel (manage requests, configure system)
│   │   │   ├── 📄 AdminPanel.css    # Admin panel styles
│   │   │   ├── 📄 RoleSelector.js   # Role selector (if user has both admin/client access)
│   │   │   └── 📄 DiscordCallback.js # Discord OAuth callback handler
│   │   ├── 📄 App.js                # Main React router and state management
│   │   ├── 📄 App.css               # Global styles
│   │   ├── 📄 index.js              # React entry point
│   │   └── 📄 index.css             # Global CSS
│   ├── 📦 package.json              # (No longer used - see root package.json)
│   └── 📄 .env.example              # Environment variables template
│
├── 📂 minecraft-server/             # Minecraft Server Integration
│   ├── 📄 whitelist-api.js          # Express API for whitelist management
│   ├── 📦 package.json              # Minecraft server dependencies
│   ├── 📄 README.md                 # Server-specific documentation
│   └── 📄 .env.example              # Environment variables template
│
├── 📂 data/                         # Data Storage (DO NOT COMMIT TO GIT!)
│   ├── 📄 config.json               # Encrypted bot token, API keys, settings
│   ├── 📄 requests.json             # All whitelist requests (history)
│   └── 📄 server.json               # Minecraft server IP address
│
├── 📂 documentation/                # Complete Documentation
│   ├── 📂 getting-started/
│   │   ├── 📄 INSTALLATION.md       # Complete installation guide
│   │   ├── 📄 QUICK_START.md        # 5-minute quick setup
│   │   └── 📄 ENV_SETUP.md          # Environment variable setup
│   ├── 📂 guides/
│   │   ├── 📄 DISCORD_OAUTH_SETUP.md # Discord OAuth configuration
│   │   ├── 📄 INTEGRATION_GUIDE.md   # Minecraft server integration
│   │   ├── 📄 RCON_SETUP.md          # RCON configuration guide
│   │   ├── 📄 RCON_EXPLAINED.md      # What is RCON?
│   │   └── 📄 HOW_TO_GET_RCON.md     # Step-by-step RCON setup
│   ├── 📂 reference/
│   │   └── 📄 ENV_VARIABLES.md       # Complete environment variable reference
│   ├── 📂 security/
│   │   └── 📄 SECURITY.md            # Security best practices
│   ├── 📄 PROJECT_STRUCTURE.md       # This file
│   ├── 📄 COMMUNICATION.md           # API communication protocol
│   └── 📄 README.md                  # Documentation index
│
├── 📄 package.json                  # ✅ ROOT package.json (unified dependencies)
├── 📄 render.yaml                   # Render.com deployment configuration
├── 📄 .gitignore                   # Git ignore rules
└── 📄 README.md                     # Main project README
```

---

## 🔧 Component Details

### 1. API Server (`api/`)

**Purpose:** Central backend service that handles all business logic, data management, and API requests.

**Technology Stack:**
- Node.js with Express.js
- File-based JSON storage
- AES-256-GCM encryption for sensitive data

**Default Port:** 3001

**Key Responsibilities:**
- ✅ REST API endpoints for dashboard and bot
- ✅ Configuration management (encrypted storage)
- ✅ Whitelist request processing and storage
- ✅ Authentication and authorization
- ✅ Discord OAuth integration
- ✅ Communication with Minecraft server API
- ✅ Notification coordination with Discord bot

**Main Files:**
- `server.js` - Express server with all endpoints
- `config.js` - Centralized environment variable management
- `middleware.js` - Security middleware (authentication, validation, rate limiting)
- `crypto-utils.js` - Token encryption/decryption utilities

**Key Endpoints:**
```
GET    /api/health                  # Health check
GET    /api/config                  # Get system configuration
POST   /api/config                  # Update configuration (admin only)
GET    /api/requests                # Get all whitelist requests
POST   /api/requests                # Create new request
PUT    /api/requests/:id            # Update request status (admin only)
DELETE /api/requests/:id            # Delete request (admin only)
GET    /api/server                  # Get server IP
POST   /api/server                  # Update server IP (admin only)
POST   /api/auth/discord            # Start Discord OAuth flow
POST   /api/auth/discord/callback   # Handle OAuth callback
POST   /api/auth/developer          # Developer key authentication
```

---

### 2. Discord Bot (`bot/`)

**Purpose:** Discord integration for commands, notifications, and user interaction.

**Technology Stack:**
- Node.js with Discord.js v14
- Express.js for notification endpoint

**Default Port:** 3002 (notification server)

**Key Responsibilities:**
- ✅ Handle text commands (`!ip`)
- ✅ Register and handle slash commands (`/requestwhitelist`)
- ✅ Send notifications to Discord channels
- ✅ Send direct messages (DMs) to users
- ✅ Create whitelist requests from Discord

**Commands:**
- `!ip` - Displays the Minecraft server IP address
- `/requestwhitelist [minecraft_username]` - Submit a whitelist request

**Notification Endpoints:**
- `POST /notify` - Receives notification requests from API server (protected with `NOTIFY_SECRET`)

**Main Files:**
- `index.js` - Bot logic, command handlers, notification system
- `config.js` - Bot environment configuration

---

### 3. Web Dashboard (`dashboard/`)

**Purpose:** User-friendly web interface for clients and administrators.

**Technology Stack:**
- React.js 18
- React Router v6
- Axios for API communication
- Lucide React for icons

**Default Port:** 3000 (development)

**Key Responsibilities:**
- ✅ User authentication (Discord OAuth, manual login, developer key)
- ✅ Client dashboard (submit requests, view status)
- ✅ Admin panel (manage requests, configure system)
- ✅ Role-based access control
- ✅ Configuration management interface

**Pages/Routes:**
- `/login` - Login page (Client/Developer/Discord OAuth)
- `/dashboard` - Client dashboard
- `/admin` - Admin panel
- `/auth/discord/callback` - OAuth callback handler
- `/` - Root (redirects based on authentication)

**Main Components:**
- `Login.js` - Login interface with multiple authentication methods
- `Dashboard.js` - Client dashboard for submitting and viewing requests
- `AdminPanel.js` - Admin interface for request management and configuration
- `RoleSelector.js` - Role selection (if user has both admin/client access)
- `DiscordCallback.js` - Handles Discord OAuth callback

---

### 4. Minecraft Server API (`minecraft-server/`)

**Purpose:** Integration layer for managing Minecraft server whitelist.

**Technology Stack:**
- Node.js with Express.js
- File I/O operations
- Optional RCON client integration

**Default Port:** 3003

**Key Responsibilities:**
- ✅ Receive whitelist requests from dashboard API
- ✅ Update `whitelist.json` file
- ✅ Generate UUIDs for offline mode servers
- ✅ Optional RCON integration for instant reload
- ✅ Security and validation
- ✅ File locking (prevent race conditions)
- ✅ Rate limiting
- ✅ Audit logging

**Endpoints:**
```
POST   /api/whitelist/add          # Add user to whitelist (requires API key)
DELETE /api/whitelist/remove       # Remove user from whitelist (requires API key)
GET    /api/whitelist/status       # Get whitelist status (requires API key)
GET    /api/health                 # Health check (no auth required)
```

**Security Features:**
- API key authentication (`X-API-Key` header)
- Path injection protection
- Input validation (Minecraft username format)
- File locking (prevents race conditions)
- Rate limiting (10 requests/minute per IP)
- Audit logging (all actions logged)

---

## 🔄 Data Flow

### Whitelist Request Flow

**Step-by-step process:**

```
1. User Action
   ├─ Option A: Discord
   │  └─ User types: /requestwhitelist minecraft_username:PlayerName
   │     └─ Bot receives command
   │        └─ Validates user (client ID check)
   │           └─ Sends POST to API Server
   │
   └─ Option B: Dashboard
      └─ User logs in → Client Dashboard
         └─ Fills form with Minecraft username
            └─ Submits form
               └─ Sends POST to API Server

2. Request Creation (API Server)
   ├─ Validates input (Minecraft username format)
   ├─ Checks for duplicate pending requests
   ├─ Creates request object:
   │  {
   │    id: "timestamp",
   │    discordId: "user-id",
   │    discordUsername: "username",
   │    minecraftUsername: "PlayerName",
   │    status: "pending",
   │    createdAt: "ISO-timestamp"
   │  }
   ├─ Saves to data/requests.json
   └─ Sends notification to Discord Bot

3. Notification (Discord Bot)
   ├─ Receives notification request
   ├─ Fetches notification channel from config
   └─ Sends embed message to channel:
      "New Whitelist Request: PlayerName by @username"

4. Staff Review (Admin Dashboard)
   ├─ Admin logs in → Admin Panel
   ├─ Views "Whitelist Requests" tab
   ├─ Sees pending request
   ├─ Reviews details (Discord user, Minecraft username, timestamp)
   └─ Makes decision: Approve or Reject

5. Approval Process (API Server)
   ├─ Admin clicks "Approve" button
   ├─ API validates admin permissions
   ├─ Updates request status to "approved"
   ├─ Updates request with:
   │  {
   │    approvedAt: "ISO-timestamp",
   │    approvedBy: "admin-username"
   │  }
   ├─ Saves to data/requests.json
   └─ Sends POST to Minecraft Server API

6. Minecraft Server Integration
   ├─ API Server sends POST to Minecraft Server API:
   │  POST /api/whitelist/add
   │  Headers: X-API-Key: <key>
   │  Body: { username: "PlayerName" }
   │
   ├─ Minecraft Server API:
   │  ├─ Validates API key
   │  ├─ Validates username format
   │  ├─ Acquires file lock
   │  ├─ Reads whitelist.json
   │  ├─ Checks if user already exists
   │  ├─ Generates UUID (if offline mode)
   │  ├─ Adds entry to whitelist.json
   │  ├─ Writes file
   │  ├─ Releases file lock
   │  └─ (Optional) Executes RCON command: whitelist add PlayerName
   │
   └─ Returns success response

7. User Notification (Discord Bot)
   ├─ API Server sends notification request to Bot
   ├─ Bot sends DM to user:
   │  "Your whitelist request has been approved!
   │   Minecraft Username: PlayerName"
   └─ Bot sends message to notification channel:
      "Whitelist Request Approved: PlayerName"
```

---

### Configuration Flow

```
1. Initial Setup
   ├─ Developer logs in with developer key
   ├─ Accesses Admin Panel → Configuration tab
   └─ Enters all settings:
      • Discord bot token
      • Minecraft server API key (generated)
      • Notification channel ID
      • Admin Discord IDs
      • Client Discord IDs
      • Minecraft server domain/URL
      • Minecraft server IP

2. Configuration Save
   ├─ User clicks "Save Configuration"
   ├─ API validates all inputs
   ├─ Encrypts bot token (AES-256-GCM)
   ├─ Saves to data/config.json:
   │  {
   │    botToken: "encrypted-token",
   │    minecraftApiKey: "generated-key",
   │    notificationChannelId: "channel-id",
   │    adminDiscordIds: ["id1", "id2"],
   │    clientDiscordIds: ["id1", "id2"],
   │    minecraftServerDomain: "http://localhost:3003",
   │    minecraftServerIP: "play.example.com"
   │  }
   └─ Returns success message

3. Configuration Usage
   ├─ Bot reads config.json on startup
   │  └─ Decrypts bot token
   │  └─ Logs in to Discord
   │
   ├─ API Server reads config.json for:
   │  ├─ Minecraft server domain (for API calls)
   │  ├─ API key (for Minecraft server requests)
   │  ├─ Notification channel ID (for bot notifications)
   │  └─ Discord IDs (for access control)
   │
   └─ Dashboard displays current configuration
```

---

## 💾 Data Storage

All data is stored in JSON files in the `data/` directory. **Never commit this directory to version control!**

### `data/config.json`

Stores all system configuration (encrypted sensitive data):

```json
{
  "botToken": "iv:tag:encrypted-token",
  "minecraftApiKey": "64-character-hex-string",
  "notificationChannelId": "987654321098765432",
  "adminDiscordIds": [
    "123456789012345678",
    "987654321098765432"
  ],
  "clientDiscordIds": [
    "111111111111111111",
    "222222222222222222"
  ],
  "minecraftServerDomain": "http://localhost:3003",
  "minecraftWhitelistFile": "./whitelist.json",
  "clientId": "bot-client-id",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Security Notes:**
- `botToken` is encrypted using AES-256-GCM
- `minecraftApiKey` is stored in plain text (needs to be readable for API calls)
- File should have restricted permissions (600 on Linux/Mac)

---

### `data/requests.json`

Stores all whitelist requests (full history):

```json
[
  {
    "id": "1704110400000",
    "discordId": "123456789012345678",
    "discordUsername": "PlayerName",
    "minecraftUsername": "MinecraftPlayer",
    "status": "approved",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "approvedAt": "2024-01-01T12:05:00.000Z",
    "approvedBy": "AdminName"
  },
  {
    "id": "1704110500000",
    "discordId": "987654321098765432",
    "discordUsername": "AnotherUser",
    "minecraftUsername": "AnotherPlayer",
    "status": "pending",
    "createdAt": "2024-01-01T12:10:00.000Z"
  }
]
```

**Status Values:**
- `pending` - Awaiting admin review
- `approved` - Approved and added to whitelist
- `rejected` - Rejected by admin

---

### `data/server.json`

Stores Minecraft server IP information:

```json
{
  "ip": "play.example.com"
}
```

**Used by:**
- Discord bot `!ip` command
- Dashboard display

---

## 🔒 Security Architecture

### Authentication Layers

The system uses multiple authentication layers:

1. **Developer Access**
   - Developer key authentication (stored in `DEVELOPER_KEY` env var)
   - Used for initial setup and configuration
   - Should be changed in production!

2. **Client Access**
   - Discord ID whitelist (stored in `CLIENT_DISCORD_IDS` env var or `config.json`)
   - Validated on login
   - Required for client dashboard access

3. **Admin Access**
   - Discord ID whitelist (stored in `ADMIN_DISCORD_IDS` env var or `config.json`)
   - Validated for admin endpoints
   - Required for admin panel access

4. **API Key Authentication**
   - Used for Minecraft server API endpoints
   - Sent via `X-API-Key` header
   - Must match on both dashboard and Minecraft server

5. **Discord OAuth**
   - OAuth 2.0 flow for seamless Discord login
   - Automatically verifies user roles
   - Secure token exchange

### Security Features

- ✅ **Path Injection Protection** - Whitelist file path only from environment variables
- ✅ **File Locking** - Prevents race conditions on concurrent file writes
- ✅ **Rate Limiting** - Prevents brute force attacks (10 req/min per IP)
- ✅ **Input Validation** - All inputs validated (Discord IDs, Minecraft usernames, URLs)
- ✅ **Audit Logging** - All actions logged with timestamp, user, IP, success/failure
- ✅ **Token Encryption** - Bot tokens encrypted with AES-256-GCM
- ✅ **SSRF Protection** - URL validation prevents requests to external servers
- ✅ **XSS Prevention** - HTML escaping in frontend components
- ✅ **RCON Command Injection Prevention** - Username sanitization before RCON commands
- ✅ **HTTPS Enforcement** - Production requires HTTPS
- ✅ **CORS Configuration** - Configurable CORS origins

---

## 🚀 Deployment Architecture

### Development Environment

All services run locally on separate ports:

```
API Server:      http://localhost:3001
Dashboard:       http://localhost:3000
Bot:             Background process (port 3002 for notifications)
Minecraft API:   http://localhost:3003
```

**Running:**
```bash
# Terminal 1: API Server
cd api && npm run dev

# Terminal 2: Dashboard
cd dashboard && npm start

# Terminal 3: Bot
cd bot && npm run dev

# Terminal 4: Minecraft API
cd minecraft-server && npm start
```

Or use unified scripts from root:
```bash
npm run dev  # Runs all services concurrently
```

---

### Production Deployment (Render.com)

**Service Types:**

1. **API Service** (Web Service)
   - Type: Web Service
   - Port: 3001
   - Health Check: `/api/health`
   - Auto-deploy: Enabled (from Git)

2. **Bot Service** (Worker)
   - Type: Background Worker
   - Runs: `npm run start:bot`
   - Always running (keeps bot online)

3. **Dashboard** (Static Site or Web Service)
   - Option A: Build static site, serve via CDN
   - Option B: Serve via API server (static files)
   - Option C: Separate web service

4. **Minecraft API** (Web Service)
   - Type: Web Service
   - Port: 3003
   - Health Check: `/api/health`
   - Deployed on Minecraft server machine or separate server

**Production URLs:**
```
API Server:      https://api.manihub.xyz
Dashboard:       https://manihub.xyz
Bot:             Background process
Minecraft API:   https://minecraft.manihub.xyz (or IP:3003)
```

---

## 📡 Communication Protocols

### HTTP REST API

**Request Format:**
```http
POST /api/endpoint HTTP/1.1
Host: localhost:3001
Content-Type: application/json
Authorization: Bearer <discord-id>  (for authenticated endpoints)
X-API-Key: <api-key>                (for Minecraft API)

{
  "key": "value"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### Discord API

**Text Commands:**
- Format: `!command`
- Example: `!ip`
- Response: Discord embed message

**Slash Commands:**
- Format: `/command [options]`
- Example: `/requestwhitelist minecraft_username:PlayerName`
- Response: Ephemeral message (only visible to user)

**Notifications:**
- Channel messages: Rich embeds with color coding
- Direct messages: Private embeds sent to user DMs

---

## ⚙️ Environment Configuration

See [Environment Variables Reference](reference/ENV_VARIABLES.md) for complete details.

**Quick Reference:**

- `api/.env` - API server configuration
- `bot/.env` - Bot configuration
- `dashboard/.env` - Dashboard configuration (optional)
- `minecraft-server/.env` - Minecraft server API configuration

**Key Variables:**
- `ENCRYPTION_KEY` - Required for token encryption (32+ characters)
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret
- `ADMIN_DISCORD_IDS` - Comma-separated admin Discord IDs
- `CLIENT_DISCORD_IDS` - Comma-separated client Discord IDs
- `MINECRAFT_API_KEY` - API key for Minecraft server communication

---

## 📚 Related Documentation

- **[Installation Guide](getting-started/INSTALLATION.md)** - Complete setup instructions
- **[Quick Start Guide](getting-started/QUICK_START.md)** - Fast setup for experienced users
- **[Security Guide](security/SECURITY.md)** - Security best practices
- **[Communication Protocol](COMMUNICATION.md)** - API communication details
- **[Environment Variables](reference/ENV_VARIABLES.md)** - Complete environment variable reference
- **[Discord OAuth Setup](guides/DISCORD_OAUTH_SETUP.md)** - Enable Discord login
- **[Minecraft Integration](guides/INTEGRATION_GUIDE.md)** - Server integration guide

---

**Last Updated:** January 2024  
**Version:** 1.0.0
