# Security Features and Best Practices

Comprehensive guide to security features implemented in the Minecraft Whitelist Dashboard and best practices for secure deployment.

---

## 📋 Table of Contents

1. [Security Features Overview](#security-features-overview)
2. [Implemented Security Features](#implemented-security-features)
3. [Security Architecture](#security-architecture)
4. [Best Practices](#best-practices)
5. [Deployment Security Checklist](#deployment-security-checklist)
6. [Common Security Mistakes](#common-security-mistakes)
7. [Incident Response](#incident-response)
8. [Security Monitoring](#security-monitoring)

---

## 🛡️ Security Features Overview

The Minecraft Whitelist Dashboard implements multiple layers of security to protect your system, data, and users. This document covers all security features and how to use them effectively.

**Security Principles:**
- Defense in depth (multiple security layers)
- Least privilege (minimal required access)
- Secure by default (safe defaults)
- Input validation (all inputs validated)
- Audit logging (all actions logged)

---

## ✅ Implemented Security Features

### 1. Path Injection Protection

**Threat:** Attackers could manipulate file paths to read/write arbitrary files on the server.

**Protection:**
- Whitelist file path is **only** set via environment variable
- Requests **cannot** override the file path
- Path validation ensures files stay within allowed directory
- All paths are resolved and validated before use

**Implementation:**
```javascript
// ✅ SECURE: Only uses environment variable
const WHITELIST_FILE = process.env.WHITELIST_FILE || path.resolve('./whitelist.json');

// Path validation ensures no directory traversal
function validateWhitelistPath(filePath) {
  const resolved = path.resolve(filePath);
  const allowedDir = path.dirname(WHITELIST_FILE);
  const allowedDirResolved = path.resolve(allowedDir);
  
  if (!resolved.startsWith(allowedDirResolved)) {
    throw new Error('Invalid whitelist file path');
  }
  
  return resolved;
}


```

---

### 2. File Locking (Race Condition Prevention)

**Threat:** Multiple simultaneous requests could cause file corruption or data loss.

**Protection:**
- Implemented file locking mechanism
- Requests are queued and processed sequentially
- Prevents concurrent file writes
- Automatic lock release on errors

**Implementation:**
```javascript
let fileLock = false;
const lockQueue = [];

async function acquireLock() {
  return new Promise((resolve) => {
    if (!fileLock) {
      fileLock = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
}

function releaseLock() {
  fileLock = false;
  if (lockQueue.length > 0) {
    const next = lockQueue.shift();
    fileLock = true;
    next();
  }
}

// Usage:
await acquireLock();
try {
  // File operations here
  await fs.writeFile(filePath, data);
} finally {
  releaseLock(); // Always release lock
}
```

---

### 3. Rate Limiting

**Threat:** API abuse with excessive requests, brute force attacks, DoS.

**Protection:**
- Rate limiting: 100 requests per minute per IP (API Server)
- Rate limiting: 10 requests per minute per IP (Minecraft Server API)
- Automatic cleanup of expired entries (prevents memory leaks)
- Configurable limits

**Implementation:**
```javascript
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(ip);
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  limit.count++;
  next();
}

// Cleanup expired entries (prevent memory leaks)
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);
```

---

### 4. API Key Authentication

**Threat:** Unauthorized access to whitelist management endpoints.

**Protection:**
- All Minecraft server endpoints require valid API key
- Key sent via `X-API-Key` header (not URL parameters)
- Failed attempts are logged
- Keys stored securely (environment variables)

**Implementation:**
```javascript
function verifyAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!apiKey || apiKey !== API_KEY) {
    logAudit('AUTH_FAILED', null, ip, false, new Error('Invalid API key'));
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

// Usage:
app.post('/api/whitelist/add', rateLimit, verifyAPIKey, async (req, res) => {
  // Protected endpoint
});
```

**Best Practices:**
- Use strong, randomly generated keys (64+ characters)
- Store keys in environment variables (never hardcode)
- Rotate keys regularly
- Use different keys for different environments

---

### 5. Input Validation

**Threat:** Invalid usernames, injection attacks, malformed data.

**Protection:**
- Username format validation (3-16 alphanumeric + underscores)
- Discord ID validation (17-19 digit numbers)
- URL validation (prevents SSRF)
- JSON structure validation
- HTML sanitization (XSS prevention)

**Implementation:**
```javascript
// Minecraft username validation
function validateMinecraftUsername(username) {
  if (typeof username !== 'string') return false;
  return /^[a-zA-Z0-9_]{3,16}$/.test(username.trim());
}

// Discord ID validation
function validateDiscordId(id) {
  if (typeof id !== 'string') return false;
  return /^\d{17,19}$/.test(id.trim());
}

// URL validation (SSRF protection)
function validateUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    
    // Only allow localhost or private IP ranges
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      const parts = hostname.split('.').map(Number);
      // Check for private IP ranges
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      return false; // Public IP not allowed
    }
    
    // Allow specific domains (configure as needed)
    return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(hostname);
  } catch {
    return false;
  }
}

// HTML escaping (XSS prevention)
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

---

### 6. Audit Logging

**Threat:** No visibility into system actions, difficult to detect attacks.

**Protection:**
- All actions are logged with complete context
- Includes: timestamp, action type, username, IP address, success/failure, error messages
- Console output (can be redirected to log files)
- Easy to implement file-based or database logging

**Implementation:**
```javascript
function logAudit(action, username, ip, success = true, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    username,
    ip,
    success,
    error: error ? error.message : null
  };
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
  
  // Could also write to file or database:
  // await fs.appendFile('audit.log', JSON.stringify(logEntry) + '\n');
}

// Usage:
logAudit('ADD_WHITELIST', username, req.ip, true);
logAudit('AUTH_FAILED', null, req.ip, false, new Error('Invalid API key'));
```

**Logged Actions:**
- `ADD_WHITELIST` - User added to whitelist
- `REMOVE_WHITELIST` - User removed from whitelist
- `AUTH_FAILED` - Failed authentication attempt
- `RATE_LIMIT_EXCEEDED` - Rate limit violation
- `STATUS_CHECK` - Whitelist status check

---

### 7. Token Encryption

**Threat:** Bot tokens stored in plain text could be stolen.

**Protection:**
- Bot tokens encrypted using AES-256-GCM
- Encryption key stored in environment variable
- Automatic encryption on save, decryption on read
- Graceful degradation (old plain text tokens still work during migration)

**Implementation:**
```javascript
const crypto = require('crypto');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(text) {
  if (!text) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText; // Not encrypted, return as-is
    }
    
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.warn('Decryption failed, returning original text');
    return encryptedText; // Graceful degradation
  }
}
```

**Generating Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 8. RCON Command Injection Prevention

**Threat:** Malicious usernames could inject RCON commands.

**Protection:**
- Username sanitization before RCON command execution
- Only alphanumeric characters and underscores allowed
- Commands are escaped before execution

**Implementation:**
```javascript
function escapeRCONCommand(command) {
  // Remove all non-alphanumeric characters except underscores
  return command.replace(/[^a-zA-Z0-9_]/g, '');
}

// Usage:
const safeUsername = escapeRCONCommand(username);
await executeRCONCommand(`whitelist add ${safeUsername}`);
```

---

### 9. SSRF (Server-Side Request Forgery) Protection

**Threat:** Attackers could make requests to internal services.

**Protection:**
- URL validation restricts to localhost or private IP ranges
- Prevents requests to arbitrary external URLs
- Only allows whitelisted domains (configurable)

**Implementation:**
- See `validateUrl()` function in Input Validation section above

---

### 10. XSS (Cross-Site Scripting) Prevention

**Threat:** Malicious scripts injected into user-generated content.

**Protection:**
- HTML escaping in frontend components
- All user-generated content sanitized before display
- React's built-in XSS protection (auto-escapes)

**Implementation:**
- See `escapeHtml()` function in Input Validation section above
- Applied to all user-generated content in React components

---

## 🔒 Security Architecture

### Authentication Layers

The system uses multiple authentication layers:

1. **Developer Access**
   - Developer key authentication (stored in `DEVELOPER_KEY` env var)
   - Used for initial setup and configuration
   - **Must be changed in production!**

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

### Authorization

**Role-Based Access Control (RBAC):**
- **Clients** - Can submit requests, view own requests
- **Admins** - Can approve/reject requests, manage configuration
- **System** - Only system can modify whitelist files

**Access Matrix:**
| Action | Client | Admin | System |
|--------|--------|-------|--------|
| Submit Request | ✅ | ✅ | ❌ |
| View Own Requests | ✅ | ✅ | ❌ |
| View All Requests | ❌ | ✅ | ❌ |
| Approve/Reject | ❌ | ✅ | ❌ |
| Manage Config | ❌ | ✅ | ❌ |
| Modify Whitelist | ❌ | ❌ | ✅ |

---

## 📚 Best Practices

### 1. Environment Variables

**Always use environment variables for sensitive data:**

```bash
# ✅ GOOD: .env file (never commit to git)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
MINECRAFT_API_KEY=strong-random-key-here
RCON_PASSWORD=secure-password-123!

# ❌ BAD: Hardcoded in source code
const API_KEY = 'my-secret-key';
```

**Best Practices:**
- Never commit `.env` files to version control
- Use different keys for different environments
- Rotate keys regularly
- Use strong, randomly generated keys

---

### 2. API Key Security

**Generation:**
```bash
# Generate 64-character random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Storage:**
- Store in environment variables
- Never hardcode in source code
- Never commit to version control
- Use different keys for development/production

**Transmission:**
- Always use HTTPS in production
- Send via header (`X-API-Key`), not URL parameters
- Rotate keys regularly (e.g., every 90 days)

---

### 3. Network Security

**Development:**
- Use `localhost` only
- Firewall should block external access
- Disable unnecessary services

**Production:**
- **Use HTTPS** (via reverse proxy like Nginx)
- Restrict access to known IPs (if possible)
- Use VPN for internal networks
- Consider authentication beyond API key

**Example Nginx HTTPS Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.manihub.xyz;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 4. File Permissions

**Restrict file access:**

```bash
# Linux/Mac
chmod 600 data/config.json
chmod 600 data/requests.json
chown minecraft:minecraft whitelist.json

# Windows
# Use file system permissions to restrict access
```

**Best Practices:**
- Restrict read/write permissions to service user only
- Use separate user for Minecraft server
- Audit file permissions regularly

---

### 5. RCON Security

**If using RCON:**
- Use strong, unique passwords (20+ characters)
- Restrict RCON port access (firewall)
- Use different password than server admin password
- Monitor RCON access logs
- Consider disabling RCON if not needed

**Example Secure RCON Password:**
```bash
# Generate secure password
openssl rand -base64 32
```

---

### 6. Monitoring

**Monitor for:**
- Failed authentication attempts
- Rate limit violations
- Unusual access patterns
- File system errors
- API errors

**Set up alerts for:**
- Multiple failed API key attempts (>5 in 1 minute)
- Rate limit violations (>10 in 1 minute)
- File write failures
- RCON connection failures

**Example Monitoring Setup:**
```javascript
// Log all authentication failures
app.use((req, res, next) => {
  if (res.statusCode === 401) {
    console.error(`[SECURITY] Auth failure from ${req.ip} at ${new Date().toISOString()}`);
    // Send alert if multiple failures from same IP
  }
  next();
});
```

---

### 7. Backup Strategy

**Regular backups:**
- Backup `whitelist.json` daily (or more frequently)
- Backup `data/config.json` and `data/requests.json` weekly
- Store backups securely (encrypted)
- Test restore procedures regularly

**Backup Script Example:**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/whitelist"

mkdir -p $BACKUP_DIR
cp whitelist.json $BACKUP_DIR/whitelist-$DATE.json
cp data/config.json $BACKUP_DIR/config-$DATE.json
cp data/requests.json $BACKUP_DIR/requests-$DATE.json

# Keep only last 30 days
find $BACKUP_DIR -name "*.json" -mtime +30 -delete
```

---

### 8. Updates

**Keep dependencies updated:**
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

**Review security advisories:**
- Monitor Node.js security updates
- Update Express.js regularly
- Review dependency vulnerabilities monthly
- Subscribe to security mailing lists

---

## ✅ Deployment Security Checklist

Before deploying to production, verify:

- [ ] Strong encryption key generated and set (`ENCRYPTION_KEY`, 32+ characters)
- [ ] All environment variables configured (not hardcoded)
- [ ] Developer key changed from default (`DEVELOPER_KEY`)
- [ ] All API keys are strong and randomly generated
- [ ] File permissions restricted (600 for config files)
- [ ] Firewall configured (only necessary ports exposed)
- [ ] HTTPS enabled (production only)
- [ ] CORS configured properly (`CORS_ORIGIN` set to specific domain)
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] RCON password secure (if used, 20+ characters)
- [ ] Regular backups configured
- [ ] Dependencies updated (`npm audit` passes)
- [ ] Monitoring set up
- [ ] Access logs reviewed regularly
- [ ] `.env` files not committed to version control (check `.gitignore`)

---

## ❌ Common Security Mistakes

### 1. Accepting File Paths from Requests
```javascript
// ❌ BAD: Path injection risk
const whitelistFilePath = req.body.whitelistFile;

// ✅ GOOD: Only use environment variables
const WHITELIST_FILE = process.env.WHITELIST_FILE;
```

### 2. Weak API Keys
```javascript
// ❌ BAD: Weak key
const API_KEY = 'secret123';

// ✅ GOOD: Strong, randomly generated key
const API_KEY = process.env.MINECRAFT_API_KEY; // 64-character hex string
```

### 3. No Rate Limiting
```javascript
// ❌ BAD: No rate limiting
app.post('/api/endpoint', handler);

// ✅ GOOD: Rate limiting enabled
app.post('/api/endpoint', rateLimit, handler);
```

### 4. No Logging
```javascript
// ❌ BAD: No audit trail
await addToWhitelist(username);

// ✅ GOOD: All actions logged
logAudit('ADD_WHITELIST', username, req.ip, true);
await addToWhitelist(username);
```

### 5. Exposing to Internet Without HTTPS
```javascript
// ❌ BAD: HTTP in production
const API_URL = 'http://api.example.com';

// ✅ GOOD: HTTPS in production
const API_URL = 'https://api.example.com';
```

### 6. No Input Validation
```javascript
// ❌ BAD: No validation
const username = req.body.username;
await addToWhitelist(username);

// ✅ GOOD: Validate all inputs
if (!validateMinecraftUsername(username)) {
  return res.status(400).json({ error: 'Invalid username' });
}
await addToWhitelist(username);
```

### 7. Hardcoded Credentials
```javascript
// ❌ BAD: Never do this
const BOT_TOKEN = 'MTAy...';

// ✅ GOOD: Use environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
```

### 8. Loose File Permissions
```bash
# ❌ BAD: Everyone can read/write
chmod 777 config.json

# ✅ GOOD: Only owner can read/write
chmod 600 config.json
```

---

## 🚨 Incident Response

If you suspect a security breach:

### Immediate Actions

1. **Rotate all API keys immediately**
   ```bash
   # Generate new keys
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Update in .env files and restart services
   ```

2. **Review audit logs** for suspicious activity
   ```bash
   # Check recent authentication failures
   grep "AUTH_FAILED" logs/*.log
   # Check unusual IP addresses
   grep "ADD_WHITELIST" logs/*.log | awk '{print $4}' | sort | uniq
   ```

3. **Check whitelist.json** for unauthorized changes
   ```bash
   # Compare with backup
   diff whitelist.json backup/whitelist-*.json
   ```

4. **Review access logs** for unusual patterns
   - Multiple failed login attempts
   - Requests from unknown IP addresses
   - Unusual request times

5. **Update all credentials**
   - API keys
   - RCON passwords
   - Encryption key (requires re-encrypting tokens)
   - Developer key

6. **Review file permissions**
   ```bash
   ls -la data/
   ls -la whitelist.json
   ```

7. **Check for file system changes**
   - Unusual file modifications
   - New files created
   - Permission changes

8. **Notify affected users** if necessary
   - Data breach disclosure
   - Password reset recommendations

### Investigation Steps

1. **Identify the attack vector**
   - How did the attacker gain access?
   - What was compromised?
   - When did it occur?

2. **Contain the threat**
   - Disable affected services if needed
   - Block malicious IP addresses
   - Revoke compromised credentials

3. **Assess damage**
   - What data was accessed?
   - What systems were compromised?
   - What actions were taken?

4. **Document everything**
   - Timeline of events
   - Actions taken
   - Evidence collected

---

## 📊 Security Monitoring

### What to Monitor

**Authentication Failures:**
```javascript
// Track failed login attempts
let failedAttempts = new Map();

app.post('/api/auth/developer', (req, res) => {
  const ip = req.ip;
  // ... authentication logic ...
  if (authFailed) {
    const attempts = failedAttempts.get(ip) || 0;
    failedAttempts.set(ip, attempts + 1);
    
    if (attempts >= 5) {
      console.error(`[ALERT] Multiple failed login attempts from ${ip}`);
      // Could block IP or send alert
    }
  }
});
```

**Rate Limit Violations:**
- Track IPs that frequently hit rate limits
- May indicate automated attacks

**Unusual Access Patterns:**
- Requests at unusual times
- Requests from unexpected locations
- Sudden spike in requests

### Logging Best Practices

**Structured Logging:**
```javascript
// ✅ GOOD: Structured JSON logs
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'error',
  message: 'Authentication failed',
  ip: req.ip,
  user: username,
  action: 'login'
}));

// Easy to parse and search:
// grep '"level":"error"' logs/*.log | jq
```

**Log Rotation:**
- Rotate logs daily or weekly
- Keep logs for at least 30 days
- Compress old logs
- Store critical logs permanently

---

## 📚 Additional Resources

- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** - Common web application security risks
- **[Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)** - Official Node.js security guide
- **[Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)** - Express.js security best practices
- **[Crypto Best Practices](https://nodejs.org/api/crypto.html)** - Node.js crypto module documentation

---

## 🔐 Reporting Security Issues

If you find a security vulnerability:

1. **Do NOT create a public issue** - This could expose the vulnerability
2. **Contact the maintainer privately** - Use secure communication
3. **Provide detailed information:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
4. **Allow time for fix** before public disclosure
5. **Follow responsible disclosure** practices

---

**Last Updated:** January 2024  
**Version:** 1.0.0
