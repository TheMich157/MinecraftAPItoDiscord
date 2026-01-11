# Minecraft Whitelist API - Java Edition

Production-ready Java Spring Boot API server for managing Minecraft server whitelist via RCON.

**Note:** This API is designed for remote Minecraft servers. It uses RCON (Remote Console) to manage the whitelist, so you don't need direct file system access to the server.

---

## 📋 Features

- ✅ **Spring Boot 3.2** - Modern, production-ready framework
- ✅ **RESTful API** - Clean, standardized endpoints
- ✅ **RCON Integration** - Direct server command execution (required)
- ✅ **Rate Limiting** - Prevents abuse (10 requests/minute)
- ✅ **API Key Authentication** - Secure access control
- ✅ **Input Validation** - Comprehensive validation
- ✅ **Audit Logging** - Complete action history
- ✅ **Remote Server Support** - Works with hosted Minecraft servers

---

## 🚀 Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+
- Minecraft server with RCON enabled
- Network access to the Minecraft server's RCON port

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
   minecraft.server.rcon.host=your-minecraft-server-ip
   minecraft.server.rcon.port=25575
   minecraft.server.rcon.password=your-rcon-password
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
RCON_HOST=your-minecraft-server-ip
RCON_PORT=25575
RCON_PASSWORD=your-rcon-password

# Optional
MINECRAFT_API_PORT=3003
SERVER_MODE=ONLINE
RCON_ENABLED=true
```

### Application Properties

Create `src/main/resources/application.properties`:

```properties
minecraft.server.api-key=${MINECRAFT_API_KEY}
minecraft.server.mode=${SERVER_MODE:ONLINE}
minecraft.server.rcon.enabled=${RCON_ENABLED:true}
minecraft.server.rcon.host=${RCON_HOST}
minecraft.server.rcon.port=${RCON_PORT:25575}
minecraft.server.rcon.password=${RCON_PASSWORD}
```

### Enable RCON on Your Minecraft Server

1. Edit `server.properties`:
   ```properties
   enable-rcon=true
   rcon.port=25575
   rcon.password=your-secure-password
   ```

2. Restart your Minecraft server

3. Ensure the RCON port (default: 25575) is accessible from where you're running this API

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

**Response:**
```json
{
  "success": true,
  "message": "PlayerName removed from whitelist"
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
  "rcon_enabled": true,
  "rcon_host": "192.168.1.100",
  "rcon_port": 25575
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
- **Input Validation** - All inputs validated and sanitized
- **RCON Security** - Use strong RCON passwords and restrict network access

**Security Recommendations:**
- Use strong, unique API keys
- Use strong RCON passwords
- Restrict RCON port access via firewall
- Use HTTPS in production (via reverse proxy)

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

# Remove from whitelist
curl -X DELETE http://localhost:3003/api/whitelist/remove \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"username":"TestPlayer"}'
```

---

## 🐛 Troubleshooting

### RCON Connection Failed

1. **Verify RCON is enabled** on your Minecraft server:
   ```properties
   enable-rcon=true
   rcon.port=25575
   rcon.password=your-password
   ```

2. **Check network connectivity:**
   ```bash
   telnet your-minecraft-server-ip 25575
   ```

3. **Verify firewall rules** allow connections to RCON port

4. **Check RCON password** matches in both `server.properties` and application config

### Port Already in Use

Change port in `application.properties`:
```properties
server.port=3004
```

### Authentication Errors

- Verify `X-API-Key` header is included in requests
- Check API key matches configuration
- Ensure API key is properly set in environment or properties file

---

## 🔌 How It Works

This API uses **RCON (Remote Console)** to communicate with your Minecraft server:

1. **Add to Whitelist**: Executes `whitelist add <username>` via RCON
2. **Remove from Whitelist**: Executes `whitelist remove <username>` via RCON
3. **Get Status**: Executes `whitelist list` via RCON and parses the response

Since the server is hosted remotely, we don't have direct file system access. All operations are performed through RCON commands that the Minecraft server executes.

---

## 📚 Dependencies

- Spring Boot 3.2.0
- Spring Web
- Gson (JSON processing)
- Lombok (reduces boilerplate)
- Validation API

---

## 📖 Architecture

```
┌─────────────────┐         RCON          ┌──────────────────┐
│   Java API      │◄─────────────────────►│  Minecraft       │
│   (Port 3003)   │   (Port 25575)        │  Server          │
└─────────────────┘                        └──────────────────┘
         ▲
         │ HTTP/REST
         │
┌────────┴────────┐
│   Dashboard     │
│   Bot, etc.     │
└─────────────────┘
```

The Java API acts as a proxy, translating REST API calls into RCON commands sent to the remote Minecraft server.

---

**Version:** 1.0.0  
**Java:** 17+  
**Framework:** Spring Boot 3.2  
**Protocol:** RCON (required)
