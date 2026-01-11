# RCON Utilities Documentation

Complete documentation for the RCON utilities module (`bot/rcon-utils.js`).

---

## 📋 Overview

The RCON utilities module provides functions for:
- RCON connection management
- Command execution with retry logic
- Log file monitoring
- Console mirroring

---

## 🔌 RCON Functions

### `initializeRCON(host, port, password)`

Initialize and test RCON connection.

**Parameters:**
- `host` (string): RCON server hostname or IP
- `port` (number): RCON server port (default: 25575)
- `password` (string): RCON password

**Returns:** `Promise<boolean>` - `true` if initialization successful

**Example:**
```javascript
const { initializeRCON } = require('./rcon-utils');

const success = await initializeRCON('localhost', 25575, 'password123');
if (success) {
  console.log('RCON initialized');
}
```

**Notes:**
- Tests connection but doesn't maintain persistent connection
- Connection is established on first command execution
- Returns `false` if `mcrcon` package not installed

---

### `executeRCONCommand(command, retries)`

Execute a Minecraft server command via RCON.

**Parameters:**
- `command` (string): Minecraft command to execute (without `/`)
- `retries` (number, optional): Number of retry attempts (default: 3)

**Returns:** `Promise<string>` - Command response

**Example:**
```javascript
const { executeRCONCommand } = require('./rcon-utils');

try {
  const response = await executeRCONCommand('whitelist add PlayerName');
  console.log('Response:', response);
} catch (error) {
  console.error('Command failed:', error.message);
}
```

**Features:**
- **Automatic Retry:** Retries up to 3 times on failure
- **Exponential Backoff:** 1s, 2s, 3s delays between retries
- **Command Sanitization:** Automatically escapes dangerous characters
- **Connection Management:** Creates new connection for each command
- **Timeout Protection:** 10-second timeout per attempt

**Error Handling:**
- Throws error if `mcrcon` not installed
- Throws error if RCON not configured
- Throws error if command execution fails after all retries

---

### `escapeRCONCommand(input)`

Escape RCON command to prevent injection attacks.

**Parameters:**
- `input` (string): Command input to escape

**Returns:** `string` - Escaped command

**Example:**
```javascript
const { escapeRCONCommand } = require('./rcon-utils');

const safe = escapeRCONCommand('whitelist add Player; rm -rf /');
// Returns: 'whitelist add Player rm -rf '
```

**Security:**
- Removes all non-alphanumeric characters except `-`, `.`, and spaces
- Prevents command injection attacks
- Preserves valid Minecraft usernames

---

### `sanitizeCommand(input)`

Sanitize command input by removing HTML-like characters.

**Parameters:**
- `input` (string): Command input to sanitize

**Returns:** `string` - Sanitized command

**Example:**
```javascript
const { sanitizeCommand } = require('./rcon-utils');

const safe = sanitizeCommand('say <Hello>');
// Returns: 'say Hello'
```

---

### `getRCONConfig()`

Get RCON configuration from environment variables.

**Returns:** `object` - RCON configuration
```javascript
{
  host: string,
  port: number,
  password: string
}
```

**Example:**
```javascript
const { getRCONConfig } = require('./rcon-utils');

const config = getRCONConfig();
console.log(`Connecting to ${config.host}:${config.port}`);
```

---

## 📺 Log File Functions

### `watchLogFile(logFilePath, onLogLine, onError)`

Watch a log file for changes and call callback for each new line.

**Parameters:**
- `logFilePath` (string): Path to log file
- `onLogLine` (function): Callback for each log line
  - Receives: `{ timestamp: string, content: string, raw: string }`
- `onError` (function, optional): Error callback

**Returns:** `Promise<FSWatcher>` - File system watcher

**Example:**
```javascript
const { watchLogFile } = require('./rcon-utils');

const watcher = await watchLogFile(
  '/path/to/logs/latest.log',
  (formattedLine) => {
    console.log(`[${formattedLine.timestamp}] ${formattedLine.content}`);
  },
  (error) => {
    console.error('Log watcher error:', error);
  }
);

// Later, to stop watching:
watcher.close();
```

**Features:**
- **Smart Filtering:** Filters chat messages and spam
- **Formatted Output:** Parses timestamps and content
- **Error Handling:** Handles file errors gracefully
- **Efficient Reading:** Only reads new lines

**Filtering:**
- Ignores chat messages (`<Player> message`)
- Ignores very short messages (< 5 characters)
- Configurable via `logFilters` object

---

### `getLogFilePath(serverPath)`

Find log file path from server directory.

**Parameters:**
- `serverPath` (string): Path to Minecraft server directory

**Returns:** `Promise<string|null>` - Log file path or `null` if not found

**Example:**
```javascript
const { getLogFilePath } = require('./rcon-utils');

const logPath = await getLogFilePath('/path/to/minecraft/server');
if (logPath) {
  console.log('Found log file:', logPath);
}
```

**Search Order:**
1. `{serverPath}/logs/latest.log`
2. `{serverPath}/server.log`
3. `{serverPath}/logs/server.log`
4. `{serverPath}/../logs/latest.log`

---

## 🔧 Configuration

### Environment Variables

```bash
# Required for RCON
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-secure-password

# Required for console mirroring
CONSOLE_MIRROR_ENABLED=true
MINECRAFT_LOG_FILE=/path/to/logs/latest.log
# OR
MINECRAFT_SERVER_PATH=/path/to/minecraft/server
```

### Dependencies

**Required:**
- `fs` (Node.js built-in)
- `path` (Node.js built-in)

**Optional:**
- `mcrcon` - Install with: `npm install mcrcon --save-optional`

---

## 🛡️ Security

### Command Sanitization

All commands are automatically sanitized:
- Removes dangerous characters
- Prevents command injection
- Validates input format

### Connection Security

- **Password Protection:** RCON password required
- **Timeout Protection:** 10-second timeout prevents hanging
- **Error Handling:** Graceful error handling prevents crashes

---

## 📊 Performance

### Connection Management

- **On-Demand Connections:** Connections created only when needed
- **Automatic Cleanup:** Connections closed after use
- **Connection Pooling:** (Future feature) Reuse connections

### Retry Logic

- **Exponential Backoff:** 1s, 2s, 3s delays
- **Maximum Retries:** 3 attempts by default
- **Fast Failure:** Fails quickly on persistent errors

---

## 🐛 Troubleshooting

### "mcrcon package not installed"

**Solution:**
```bash
npm install mcrcon --save-optional
```

### "RCON not configured"

**Solution:**
Set environment variables:
```bash
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-password
```

### "RCON command execution timeout"

**Solutions:**
1. Check RCON is enabled in `server.properties`
2. Verify RCON host and port are correct
3. Check firewall allows RCON port
4. Test RCON connection manually

### "Log file not found"

**Solutions:**
1. Verify log file path is correct
2. Check file permissions (read access required)
3. Ensure server is running and generating logs
4. Try using `MINECRAFT_SERVER_PATH` instead of direct file path

---

## 📝 Examples

### Execute Command

```javascript
const { executeRCONCommand } = require('./rcon-utils');

// Add player to whitelist
await executeRCONCommand('whitelist add PlayerName');

// Ban player
await executeRCONCommand('ban PlayerName Cheating');

// Get player list
const response = await executeRCONCommand('list');
console.log('Players:', response);
```

### Watch Log File

```javascript
const { watchLogFile } = require('./rcon-utils');

const watcher = await watchLogFile(
  '/path/to/logs/latest.log',
  (line) => {
    // Send to Discord, log, etc.
    console.log(`[${line.timestamp}] ${line.content}`);
  }
);
```

### Initialize RCON

```javascript
const { initializeRCON } = require('./rcon-utils');

const success = await initializeRCON('localhost', 25575, 'password');
if (success) {
  console.log('RCON ready');
} else {
  console.error('RCON initialization failed');
}
```

---

## 🔗 Related Files

- **[bot/index.js](./index.js)** - Bot main file using RCON utilities
- **[bot/utils.js](./utils.js)** - General utility functions
- **[bot/config.js](./config.js)** - Configuration management
- **[bot/README.md](./README.md)** - Bot documentation

---

**Last Updated:** January 2024  
**Version:** 1.0.0
