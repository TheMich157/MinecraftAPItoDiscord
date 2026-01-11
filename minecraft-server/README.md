# Minecraft Whitelist API - Java Edition

Production-ready Java Spring Boot API server for managing Minecraft server whitelist, ops, and banned players.

---

## 📋 Features

- ✅ **Spring Boot 3.2** - Modern, production-ready framework
- ✅ **RESTful API** - Clean, standardized endpoints
- ✅ **File Locking** - Thread-safe file operations
- ✅ **Rate Limiting** - Prevents abuse (10 requests/minute)
- ✅ **API Key Authentication** - Secure access control
- ✅ **RCON Integration** - Direct server command execution
- ✅ **UUID Generation** - Online and offline mode support
- ✅ **Input Validation** - Comprehensive validation
- ✅ **Audit Logging** - Complete action history
- ✅ **Organized Structure** - Config folder for settings, root for data files

---

## 📁 File Structure

```
minecraft-server/
├── config/                          ← Configuration files go here
│   ├── server.properties
│   ├── eula.txt
│   └── (other config files)
├── whitelist.json                   ← Data files in root
├── ops.json                         ← Data files in root
├── banned-players.json              ← Data files in root
├── logs/
│   └── latest.log
└── (other server files)
```

---

## 🚀 Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+
- Minecraft server with existing whitelist.json

### Installation

1. **Clone and Navigate:**
   ```bash
   cd minecraft-server
   ```

2. **Build Project:**
   ```bash
   mvn clean package
   ```

3. **Configure:**
   Copy `src/main/resources/application.properties.example` to `src/main/resources/application.properties` and update:
   ```properties
   minecraft.server.api-key=your-secure-api-key-here
   minecraft.server.server-root=/path/to/minecraft/server
   minecraft.server.whitelist-file=whitelist.json
   ```

4. **Run:**
   ```bash
   java -jar target/minecraft-whitelist-api-1.0.0.jar
   ```

---

## ⚙️ Configuration

### Environment Variables

Set these in your environment or `.env` file:

```bash
# Required
MINECRAFT_API_KEY=your-secure-api-key-here
MINECRAFT_SERVER_ROOT=/path/to/minecraft/server

# Optional
MINECRAFT_API_PORT=3003
CONFIG_FOLDER=/path/to/minecraft/server/config
WHITELIST_FILE=whitelist.json
SERVER_MODE=ONLINE
RCON_ENABLED=false
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-rcon-password
```

### Application Properties

Create `src/main/resources/application.properties`:

```properties
minecraft.server.api-key=${MINECRAFT_API_KEY}
minecraft.server.server-root=${MINECRAFT_SERVER_ROOT:./}
minecraft.server.config-folder=${CONFIG_FOLDER:}
minecraft.server.whitelist-file=${WHITELIST_FILE:whitelist.json}
minecraft.server.mode=${SERVER_MODE:ONLINE}
minecraft.server.rcon.enabled=${RCON_ENABLED:false}
minecraft.server.rcon.host=${RCON_HOST:localhost}
minecraft.server.rcon.port=${RCON_PORT:25575}
minecraft.server.rcon.password=${RCON_PASSWORD:}
```

---

## 🔌 API Endpoints

### Add to Whitelist

```http
POST /api/whitelist/add
X-API-Key: your-api-key
Content-Type: application/json

{
  "username": "PlayerName"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PlayerName added to whitelist",
  "username": "PlayerName",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "online"
}
```

### Remove from Whitelist

```http
DELETE /api/whitelist/remove
X-API-Key: your-api-key
Content-Type: application/json

{
  "username": "PlayerName"
}
```

### Get Whitelist Status

```http
GET /api/whitelist/status
X-API-Key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "count": 42,
  "users": ["Player1", "Player2", ...],
  "mode": "online"
}
```

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00",
  "service": "minecraft-whitelist-api",
  "mode": "online",
  "rcon_enabled": false,
  "server_root": "/path/to/server",
  "config_folder": "/path/to/server/config",
  "whitelist_file": "whitelist.json"
}
```

---

## 🔧 Building

### Development Build

```bash
mvn clean compile
```

### Production Build

```bash
mvn clean package
```

This creates `target/minecraft-whitelist-api-1.0.0.jar`

### Run JAR

```bash
java -jar target/minecraft-whitelist-api-1.0.0.jar
```

---

## 🔒 Security

- **API Key Authentication** - All endpoints require valid API key
- **Rate Limiting** - 10 requests per minute per IP
- **Path Validation** - Prevents directory traversal attacks
- **File Locking** - Thread-safe file operations
- **Input Validation** - All inputs validated and sanitized

---

## 📝 Example Usage

### Using cURL

```bash
# Add to whitelist
curl -X POST http://localhost:3003/api/whitelist/add \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer"}'

# Get status
curl -X GET http://localhost:3003/api/whitelist/status \
  -H "X-API-Key: your-api-key"
```

---

## 🐛 Troubleshooting

### Port Already in Use

Change port in `application.properties`:
```properties
server.port=3004
```

### File Not Found

Verify `MINECRAFT_SERVER_ROOT` points to correct directory:
```bash
# Check if whitelist.json exists
ls $MINECRAFT_SERVER_ROOT/whitelist.json
```

### RCON Connection Failed

1. Verify RCON is enabled in `server.properties`
2. Check RCON password matches
3. Ensure firewall allows RCON port (default: 25575)

---

## 📚 Dependencies

- Spring Boot 3.2.0
- Spring Web
- Gson (JSON processing)
- Lombok (reduces boilerplate)
- Validation API

---

**Version:** 1.0.0  
**Java:** 17+  
**Framework:** Spring Boot 3.2
