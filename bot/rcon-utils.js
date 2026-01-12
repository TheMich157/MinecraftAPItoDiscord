const fs = require('fs').promises;
const path = require('path');
const { watch } = require('fs');

let mcrcon = null;
try {
  mcrcon = require('mcrcon');
} catch (error) {
  console.warn('mcrcon package not installed. RCON features will be limited. To enable, install the optional "mcrcon" package or set RCON_DISABLED.');
}

const connectionPool = new Map();
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CONNECTION_TIMEOUT = 10000;

function escapeRCONCommand(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9_\-\.\s]/g, '');
}

function sanitizeCommand(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

function getRCONConfig() {
  return {
    host: process.env.RCON_HOST || 'localhost',
    port: parseInt(process.env.RCON_PORT || '25575', 10),
    password: process.env.RCON_PASSWORD || ''
  };
}

function getConnectionKey(host, port) {
  return `${host}:${port}`;
}

async function initializeRCON(host, port, password) {
  if (!mcrcon) {
    console.warn('RCON initialization skipped: mcrcon package not installed');
    return false;
  }

  if (!host || !port || !password) {
    console.warn('RCON initialization skipped: missing configuration');
    return false;
  }

  const config = { host, port, password };
  const key = getConnectionKey(host, port);

  try {
    console.log(`[RCON] Initializing connection to ${host}:${port}`);
    
    const client = mcrcon(config.host, config.password, {
      port: config.port,
      timeout: CONNECTION_TIMEOUT
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('RCON connection timeout'));
      }, CONNECTION_TIMEOUT);

      client.connect((err) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    connectionPool.set(key, {
      client,
      lastUsed: Date.now(),
      healthy: true
    });

    client.disconnect();
    
    console.log('[RCON] Connection test successful');
    return true;
  } catch (error) {
    console.error(`[RCON] Initialization failed: ${error.message}`);
    return false;
  }
}

async function executeRCONCommand(command, retries = MAX_RETRIES) {
  if (!mcrcon) {
    throw new Error('RCON support not available: optional dependency "mcrcon" not installed. Install it or disable RCON in configuration.');
  }

  const config = getRCONConfig();

  if (!config.host || !config.port || !config.password) {
    throw new Error('RCON not configured. Set RCON_HOST, RCON_PORT, and RCON_PASSWORD');
  }

  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('Invalid command: command cannot be empty');
  }

  const sanitizedCommand = escapeRCONCommand(command.trim());
  
  if (sanitizedCommand.length === 0) {
    throw new Error('Invalid command: command contains only invalid characters');
  }

  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    
    try {
      client = mcrcon(config.host, config.password, {
        port: config.port,
        timeout: CONNECTION_TIMEOUT
      });

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('RCON command execution timeout'));
        }, CONNECTION_TIMEOUT);

        client.connect((err) => {
          if (err) {
            clearTimeout(timeout);
            reject(err);
            return;
          }

          client.send(sanitizedCommand, (err, response) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
              return;
            }
            resolve(response || '');
          });
        });
      });

      if (client) {
        try {
          client.disconnect();
        } catch (err) {
          // Ignore disconnect errors
        }
      }

      return response || '';
    } catch (error) {
      lastError = error;
      
      if (client) {
        try {
          client.disconnect();
        } catch (err) {
          // Ignore disconnect errors
        }
      }

      if (attempt < retries) {
        const delay = RETRY_DELAY * attempt;
        console.warn(`[RCON] Command execution failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[RCON] Command execution failed after ${retries} attempts: ${error.message}`);
        throw new Error(`RCON command failed: ${error.message}`);
      }
    }
  }

  throw lastError || new Error('RCON command execution failed');
}

async function watchLogFile(logFilePath, onLogLine, onError) {
  if (!logFilePath) {
    return null;
  }

  try {
    await fs.access(logFilePath);
  } catch (error) {
    console.warn(`[LOG] Log file not found: ${logFilePath}`);
    return null;
  }

  let lastPosition = 0;
  let fileHandle = null;
  
  try {
    const stats = await fs.stat(logFilePath);
    lastPosition = stats.size;
  } catch (error) {
    lastPosition = 0;
  }

  const logFilters = {
    ignoreChat: true,
    ignoreJoinLeave: false,
    ignoreCommands: false,
    minLength: 5
  };

  function shouldFilterLine(line) {
    if (!line || line.trim().length < logFilters.minLength) {
      return true;
    }

    const lowerLine = line.toLowerCase();

    if (logFilters.ignoreChat && line.includes('<') && line.includes('>')) {
      return true;
    }

    if (logFilters.ignoreJoinLeave) {
      if (lowerLine.includes('joined the game') ||
          lowerLine.includes('left the game') ||
          lowerLine.includes('logged in') ||
          lowerLine.includes('disconnected')) {
        return true;
      }
    }

    if (logFilters.ignoreCommands && lowerLine.includes('issued server command')) {
      return true;
    }

    return false;
  }

  function formatLogLine(line) {
    const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
    const timestamp = timestampMatch ? timestampMatch[1] : '';
    const content = timestampMatch ? line.substring(timestampMatch[0].length).trim() : line.trim();
    
    return { timestamp, content, raw: line };
  }

  const watcher = watch(logFilePath, { persistent: true }, async (eventType, filename) => {
    if (eventType === 'change' && filename) {
      try {
        const stats = await fs.stat(logFilePath);
        
        if (stats.size > lastPosition) {
          if (!fileHandle) {
            fileHandle = await fs.open(logFilePath, 'r');
          }
          
          const buffer = Buffer.alloc(stats.size - lastPosition);
          await fileHandle.read(buffer, 0, buffer.length, lastPosition, null);
          
          const newLines = buffer.toString('utf8');
          const lines = newLines.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (!shouldFilterLine(line.trim())) {
              const formatted = formatLogLine(line.trim());
              if (onLogLine && formatted.content) {
                onLogLine(formatted);
              }
            }
          }
          
          lastPosition = stats.size;
        }
      } catch (error) {
        if (fileHandle) {
          try {
            await fileHandle.close();
            fileHandle = null;
          } catch (err) {
            // Ignore close errors
          }
        }
        
        if (onError) {
          onError(error);
        } else {
          console.error('[LOG] Error reading log file:', error);
        }
      }
    }
  });

  watcher.on('error', (error) => {
    if (fileHandle) {
      try {
        fileHandle.close();
        fileHandle = null;
      } catch (err) {
        // Ignore close errors
      }
    }
    
    if (onError) {
      onError(error);
    } else {
      console.error('[LOG] Log file watcher error:', error);
    }
  });

  process.on('SIGINT', async () => {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch (err) {
        // Ignore close errors
      }
    }
    if (watcher) {
      watcher.close();
    }
  });

  console.log(`[LOG] Monitoring log file: ${logFilePath}`);
  return watcher;
}

async function getLogFilePath(serverPath) {
  if (!serverPath) {
    return null;
  }

  const possiblePaths = [
    path.join(serverPath, 'logs', 'latest.log'),
    path.join(serverPath, 'server.log'),
    path.join(serverPath, 'logs', 'server.log'),
    path.join(serverPath, '..', 'logs', 'latest.log')
  ];

  for (const logPath of possiblePaths) {
    try {
      await fs.access(logPath);
      return logPath;
    } catch (error) {
      continue;
    }
  }

  return null;
}

function cleanupConnections() {
  const now = Date.now();
  const MAX_IDLE_TIME = 300000;
  
  for (const [key, connection] of connectionPool.entries()) {
    if (now - connection.lastUsed > MAX_IDLE_TIME) {
      try {
        if (connection.client) {
          connection.client.disconnect();
        }
      } catch (err) {
        // Ignore disconnect errors
      }
      connectionPool.delete(key);
    }
  }
}

setInterval(cleanupConnections, 60000);

module.exports = {
  initializeRCON,
  executeRCONCommand,
  escapeRCONCommand,
  sanitizeCommand,
  watchLogFile,
  getLogFilePath,
  getRCONConfig
};
