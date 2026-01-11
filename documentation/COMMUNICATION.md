# API Communication Protocol

Complete documentation of how the Dashboard API communicates with the Minecraft Server API, including request/response formats, error handling, and best practices.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Communication Flow](#communication-flow)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Error Handling](#error-handling)
6. [Security Considerations](#security-considerations)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## 🎯 Overview

The communication between the Dashboard API and Minecraft Server API uses **HTTP REST protocol** with **API key authentication**. This document provides complete details on:

- Request/response formats
- Authentication methods
- Error handling
- Security best practices
- Testing procedures
- Troubleshooting guide

**Communication Protocol:**
- Protocol: HTTP/HTTPS
- Format: JSON
- Authentication: API Key (via `X-API-Key` header)
- Port: 3003 (default)

---

## 🔄 Communication Flow

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard API                            │
│                   (Port 3001)                                │
│                                                              │
│  • Handles whitelist requests                                │
│  • Validates admin permissions                               │
│  • Communicates with Minecraft Server API                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ HTTP POST Request
                           │ Headers: X-API-Key: <key>
                           │ Body: { username: "PlayerName" }
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Minecraft Server API                         │
│                   (Port 3003)                                │
│                                                              │
│  • Validates API key                                         │
│  • Validates username format                                 │
│  • Updates whitelist.json                                    │
│  • Optional: Executes RCON commands                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ File I/O / RCON Commands
                           │
                           ▼
              ┌──────────────────────────────┐
              │    whitelist.json            │
              │    Minecraft Server          │
              └──────────────────────────────┘
```

### Request Lifecycle

```
1. Admin approves request in Dashboard
   │
   ├─→ Dashboard API receives approval
   │   ├─ Validates admin permissions
   │   ├─ Updates request status in database
   │   └─ Extracts Minecraft username
   │
   ├─→ Dashboard API sends POST to Minecraft Server API
   │   ├─ URL: ${minecraftServerDomain}/api/whitelist/add
   │   ├─ Headers: X-API-Key: <api-key>
   │   └─ Body: { username: "PlayerName" }
   │
   ├─→ Minecraft Server API receives request
   │   ├─ Validates API key
   │   ├─ Validates username format
   │   ├─ Acquires file lock
   │   ├─ Reads whitelist.json
   │   ├─ Checks for duplicate entries
   │   ├─ Generates UUID (if offline mode)
   │   ├─ Adds entry to whitelist.json
   │   ├─ Writes file
   │   ├─ Releases file lock
   │   └─ (Optional) Executes RCON: whitelist add PlayerName
   │
   └─→ Minecraft Server API responds
       ├─ Success: { success: true, message: "...", uuid: "..." }
       └─ Error: { error: "Error message" }
```

---

## 📡 API Endpoints

### 1. Add to Whitelist

**Endpoint:** `POST /api/whitelist/add`

**Purpose:** Add a Minecraft player to the server whitelist.

**Authentication:** Required (API Key via `X-API-Key` header)

**Rate Limit:** 10 requests per minute per IP

---

#### Request Format

**HTTP Method:** `POST`

**URL:** `http://localhost:3003/api/whitelist/add` (or your Minecraft server domain)

**Headers:**
```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "PlayerName"
}
```

**Parameters:**
- `username` (required, string): Minecraft username to add to whitelist
  - Must be 3-16 characters
  - Only alphanumeric characters and underscores
  - Case-insensitive matching

**Example Request (cURL):**
```bash
curl -X POST http://localhost:3003/api/whitelist/add \
  -H "X-API-Key: abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{"username":"PlayerName"}'
```

**Example Request (JavaScript/Axios):**
```javascript
const response = await axios.post(`${minecraftServerDomain}/api/whitelist/add`, {
  username: 'PlayerName'
}, {
  headers: {
    'X-API-Key': minecraftApiKey,
    'Content-Type': 'application/json'
  }
});
```

---

#### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "message": "PlayerName added to whitelist",
  "username": "PlayerName",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "online"
}
```

**Response Fields:**
- `success` (boolean): Always `true` for successful requests
- `message` (string): Human-readable success message
- `username` (string): The username that was added
- `uuid` (string): UUID generated for the player
- `mode` (string): Server mode (`"online"` or `"offline"`)

---

#### Error Responses

**400 Bad Request - Username Required:**
```json
{
  "error": "Username required"
}
```

**400 Bad Request - Invalid Username Format:**
```json
{
  "error": "Invalid username format. Must be 3-16 alphanumeric characters and underscores."
}
```

**401 Unauthorized - Invalid API Key:**
```json
{
  "error": "Invalid API key"
}
```
*Note: This is also logged as `AUTH_FAILED` in audit logs.*

**409 Conflict - User Already Whitelisted:**
```json
{
  "error": "User already whitelisted",
  "username": "PlayerName"
}
```

**429 Too Many Requests - Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded"
}
```
*Note: Rate limit is 10 requests per minute per IP. Wait 1 minute before retrying.*

**500 Internal Server Error:**
```json
{
  "error": "Failed to add to whitelist",
  "details": "Error message here"
}
```

---

### 2. Remove from Whitelist

**Endpoint:** `DELETE /api/whitelist/remove`

**Purpose:** Remove a Minecraft player from the server whitelist.

**Authentication:** Required (API Key via `X-API-Key` header)

**Rate Limit:** 10 requests per minute per IP

---

#### Request Format

**HTTP Method:** `DELETE`

**URL:** `http://localhost:3003/api/whitelist/remove`

**Headers:**
```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "PlayerName"
}
```

**Example Request (cURL):**
```bash
curl -X DELETE http://localhost:3003/api/whitelist/remove \
  -H "X-API-Key: abc123def456..." \
  -H "Content-Type: application/json" \
  -d '{"username":"PlayerName"}'
```

---

#### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "message": "PlayerName removed from whitelist"
}
```

---

#### Error Responses

**400 Bad Request - Username Required:**
```json
{
  "error": "Username required"
}
```

**401 Unauthorized - Invalid API Key:**
```json
{
  "error": "Invalid API key"
}
```

**404 Not Found - User Not in Whitelist:**
```json
{
  "error": "User not found in whitelist"
}
```

**429 Too Many Requests - Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to remove from whitelist",
  "details": "Error message here"
}
```

---

### 3. Get Whitelist Status

**Endpoint:** `GET /api/whitelist/status`

**Purpose:** Get current whitelist status (count and list of players).

**Authentication:** Required (API Key via `X-API-Key` header)

**Rate Limit:** 10 requests per minute per IP

---

#### Request Format

**HTTP Method:** `GET`

**URL:** `http://localhost:3003/api/whitelist/status`

**Headers:**
```http
X-API-Key: your-api-key-here
```

**No Request Body Required**

**Example Request (cURL):**
```bash
curl -X GET http://localhost:3003/api/whitelist/status \
  -H "X-API-Key: abc123def456..."
```

---

#### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "count": 42,
  "users": ["Player1", "Player2", "Player3", ...],
  "mode": "online"
}
```

**Response Fields:**
- `success` (boolean): Always `true` for successful requests
- `count` (number): Total number of whitelisted players
- `users` (array): Array of all whitelisted usernames
- `mode` (string): Server mode (`"online"` or `"offline"`)

---

#### Error Responses

**401 Unauthorized - Invalid API Key:**
```json
{
  "error": "Invalid API key"
}
```

**429 Too Many Requests - Rate Limit Exceeded:**
```json
{
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to read whitelist",
  "details": "Error message here"
}
```

---

### 4. Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Check if the Minecraft Server API is running and healthy.

**Authentication:** Not required (public endpoint)

**No Rate Limit**

---

#### Request Format

**HTTP Method:** `GET`

**URL:** `http://localhost:3003/api/health`

**No Headers Required**

**Example Request (cURL):**
```bash
curl http://localhost:3003/api/health
```

---

#### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "minecraft-whitelist-api",
  "mode": "online",
  "rcon_enabled": false
}
```

**Response Fields:**
- `status` (string): Always `"ok"` if service is running
- `timestamp` (string): ISO 8601 timestamp of response
- `service` (string): Service name (`"minecraft-whitelist-api"`)
- `mode` (string): Server mode (`"online"` or `"offline"`)
- `rcon_enabled` (boolean): Whether RCON is enabled

---

## 🔐 Request/Response Formats

### Request Headers

**Required Headers (for authenticated endpoints):**
```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Optional Headers:**
```http
User-Agent: MinecraftWhitelistDashboard/1.0.0
```

### Request Body Format

All request bodies must be valid JSON:
```json
{
  "username": "PlayerName"
}
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

---

## ⚠️ Error Handling

### Client-Side Error Handling

When making requests from the Dashboard API, always handle errors properly:

```javascript
try {
  const response = await axios.post(`${minecraftServerDomain}/api/whitelist/add`, {
    username: minecraftUsername
  }, {
    headers: {
      'X-API-Key': minecraftApiKey,
      'Content-Type': 'application/json'
    }
  });
  
  // Success
  console.log('User added:', response.data);
  // response.data = { success: true, message: "...", username: "...", uuid: "..." }
  
} catch (error) {
  if (error.response) {
    // Server responded with error status
    switch (error.response.status) {
      case 400:
        console.error('Bad Request:', error.response.data.error);
        // Handle validation errors
        break;
      case 401:
        console.error('Invalid API key');
        // Handle authentication errors (check API key)
        break;
      case 409:
        console.error('User already whitelisted');
        // Handle duplicate entries
        break;
      case 429:
        console.error('Rate limit exceeded - wait 1 minute');
        // Handle rate limiting (retry after delay)
        break;
      case 500:
        console.error('Server error:', error.response.data.error);
        // Handle server errors
        break;
      default:
        console.error('Unexpected error:', error.response.data);
    }
  } else if (error.request) {
    // Request made but no response received
    console.error('No response from server');
    // Handle network errors (server down, network issue)
  } else {
    // Error setting up request
    console.error('Request error:', error.message);
  }
}
```

### Server-Side Error Handling

The Minecraft Server API handles errors gracefully:

- **Validation errors** → 400 Bad Request with descriptive message
- **Authentication errors** → 401 Unauthorized, logged as `AUTH_FAILED`
- **Not found errors** → 404 Not Found
- **Rate limit violations** → 429 Too Many Requests
- **Server errors** → 500 Internal Server Error, logged with details

All errors are logged in audit logs with:
- Timestamp
- Action type
- Username (if applicable)
- IP address
- Success/failure status
- Error message

---

## 🔒 Security Considerations

### API Key Security

**Key Storage:**
- Store API keys in environment variables (never hardcode)
- Use different keys for different environments (dev/prod)
- Never commit keys to version control
- Rotate keys regularly (every 90 days recommended)

**Key Transmission:**
- Always use HTTPS in production (prevents man-in-the-middle attacks)
- Send via header (`X-API-Key`), not URL parameters (URLs are logged)
- Use strong, randomly generated keys (64+ characters)

**Key Validation:**
- Exact match required (case-sensitive)
- No extra spaces allowed
- Failed attempts are logged

### Network Security

**HTTPS (Production):**
- Use HTTPS via reverse proxy (Nginx, Apache)
- Valid SSL certificate required
- Prevents man-in-the-middle attacks
- Encrypts all data in transit

**Firewall:**
- Restrict access to known IPs (if possible)
- Only expose necessary ports (3003)
- Use VPN for internal networks

**Rate Limiting:**
- Prevents brute force attacks
- Limits per IP address (10 req/min)
- Automatic cleanup of expired entries

---

## 🧪 Testing

### Manual Testing with cURL

**Test Add to Whitelist:**
```bash
curl -X POST http://localhost:3003/api/whitelist/add \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer"}'
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "TestPlayer added to whitelist",
  "username": "TestPlayer",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "online"
}
```

**Test Remove from Whitelist:**
```bash
curl -X DELETE http://localhost:3003/api/whitelist/remove \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer"}'
```

**Test Get Status:**
```bash
curl -X GET http://localhost:3003/api/whitelist/status \
  -H "X-API-Key: your-api-key-here"
```

**Test Health Check:**
```bash
curl http://localhost:3003/api/health
```

### Testing with Postman

1. **Create New Request**
   - Method: `POST`
   - URL: `http://localhost:3003/api/whitelist/add`

2. **Add Headers**
   - `X-API-Key`: `your-api-key-here`
   - `Content-Type`: `application/json`

3. **Add Body (raw JSON)**
   ```json
   {
     "username": "TestPlayer"
   }
   ```

4. **Send Request**
   - Should receive 200 OK with success response

5. **Test Error Cases**
   - Invalid API key (should return 401)
   - Missing username (should return 400)
   - Invalid username format (should return 400)
   - Duplicate username (should return 409)

### Automated Testing

**Example Test Script (Node.js):**
```javascript
const axios = require('axios');

async function testWhitelistAPI() {
  const API_URL = 'http://localhost:3003';
  const API_KEY = 'your-api-key-here';
  
  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test health check
    const health = await axios.get(`${API_URL}/api/health`);
    console.log('Health check:', health.data);
    
    // Test add to whitelist
    const addResponse = await axios.post(
      `${API_URL}/api/whitelist/add`,
      { username: 'TestPlayer' },
      { headers }
    );
    console.log('Add response:', addResponse.data);
    
    // Test get status
    const statusResponse = await axios.get(
      `${API_URL}/api/whitelist/status`,
      { headers }
    );
    console.log('Status response:', statusResponse.data);
    
    // Test remove from whitelist
    const removeResponse = await axios.delete(
      `${API_URL}/api/whitelist/remove`,
      { data: { username: 'TestPlayer' }, headers }
    );
    console.log('Remove response:', removeResponse.data);
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testWhitelistAPI();
```

---

## 🔧 Troubleshooting

### Connection Refused

**Problem:** Cannot connect to Minecraft Server API

**Solutions:**
- ✅ Verify API server is running (`curl http://localhost:3003/api/health`)
- ✅ Check port is correct (default: 3003)
- ✅ Verify firewall allows connections
- ✅ Test with `curl` from same machine first
- ✅ Check server logs for errors

---

### Invalid API Key

**Problem:** Getting `401 Unauthorized` errors

**Solutions:**
- ✅ Verify API key matches in both dashboard and server
- ✅ Check for extra spaces or characters
- ✅ Ensure key is in `X-API-Key` header (not `Authorization` header)
- ✅ Restart both services after changing key
- ✅ Check environment variable is loaded correctly

**Debug Steps:**
1. Check `minecraft-server/.env` file
2. Check `data/config.json` (dashboard)
3. Verify both match exactly
4. Restart services

---

### User Already Whitelisted

**Problem:** Getting `409 Conflict` error

**Solutions:**
- ✅ Check `whitelist.json` manually for the username
- ✅ User may have different capitalization (check case-insensitive)
- ✅ Remove user first, then re-add
- ✅ Check for duplicate entries in whitelist.json

**Remove User Manually:**
```bash
# Edit whitelist.json
# Remove the entry for the player
# Or use the remove endpoint
```

---

### Rate Limit Exceeded

**Problem:** Getting `429 Too Many Requests` error

**Solutions:**
- ✅ Wait 1 minute before retrying
- ✅ Reduce request frequency
- ✅ Check if multiple services are making requests
- ✅ Adjust rate limit in server code if needed (default: 10 req/min)

---

### File Not Found

**Problem:** Getting errors about `whitelist.json` not found

**Solutions:**
- ✅ Verify `WHITELIST_FILE` environment variable is set correctly
- ✅ Check file exists at the specified path
- ✅ Verify file permissions (read/write access)
- ✅ Check path is absolute or relative to server directory

---

### RCON Connection Failed

**Problem:** RCON commands fail (if RCON enabled)

**Solutions:**
- ✅ Verify `RCON_ENABLED=true` in `.env`
- ✅ Check RCON password is correct
- ✅ Verify RCON host and port are correct
- ✅ Check Minecraft server is running
- ✅ Verify RCON is enabled in `server.properties`
- ✅ Test RCON connection manually

---

## ✅ Best Practices

### 1. Always Handle Errors

Check response status codes and handle all error cases:
```javascript
if (response.status === 200) {
  // Success
} else {
  // Handle error
}
```

### 2. Log All Requests

Log all requests for debugging and audit:
```javascript
console.log(`[API] POST /api/whitelist/add - Username: ${username}`);
```

### 3. Use HTTPS in Production

Always use HTTPS in production to encrypt communications:
```javascript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://minecraft.manihub.xyz'
  : 'http://localhost:3003';
```

### 4. Validate Inputs

Validate inputs both client and server side:
```javascript
if (!validateMinecraftUsername(username)) {
  return res.status(400).json({ error: 'Invalid username format' });
}
```

### 5. Implement Retry Logic

Implement retry logic for transient failures:
```javascript
async function addToWhitelistWithRetry(username, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios.post(`${API_URL}/api/whitelist/add`, {
        username
      }, { headers });
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        continue;
      }
      throw error;
    }
  }
}
```

### 6. Monitor Rate Limits

Monitor rate limits to avoid hitting them:
```javascript
let requestCount = 0;
const rateLimitWindow = 60000; // 1 minute

setInterval(() => {
  requestCount = 0;
}, rateLimitWindow);

async function makeRequest() {
  if (requestCount >= 10) {
    throw new Error('Rate limit reached, wait before retrying');
  }
  requestCount++;
  // Make request...
}
```

### 7. Test Thoroughly

Test all endpoints before deploying to production:
- ✅ Test success cases
- ✅ Test error cases (invalid input, auth failures)
- ✅ Test rate limiting
- ✅ Test network failures

---

## 📚 Related Documentation

- **[Integration Guide](guides/INTEGRATION_GUIDE.md)** - Complete Minecraft server integration guide
- **[Security Guide](security/SECURITY.md)** - Security best practices
- **[RCON Setup Guide](guides/RCON_SETUP.md)** - Configure RCON for instant reloads
- **[Minecraft Server README](../minecraft-server/README.md)** - Server-specific documentation

---

**Last Updated:** January 2024  
**Version:** 1.0.0
