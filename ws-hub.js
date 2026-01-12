const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const clients = new Map();

async function readConfig() {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, 'config.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function unregister(ws) {
  clients.delete(ws);
}

function getAnyAuthedClient() {
  for (const [ws, meta] of clients.entries()) {
    if (meta && meta.authed) return ws;
  }
  return null;
}

async function handleMessage(ws, msg) {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    return;
  }

  if (msg.type === 'auth') {
    const cfg = await readConfig();
    const expectedKey = cfg?.minecraftApiKey;

    if (!expectedKey || typeof expectedKey !== 'string') {
      ws.send(JSON.stringify({ type: 'auth_result', ok: false, error: 'server_not_configured' }));
      ws.close();
      return;
    }

    if (!msg.apiKey || msg.apiKey !== expectedKey) {
      ws.send(JSON.stringify({ type: 'auth_result', ok: false, error: 'invalid_key' }));
      ws.close();
      return;
    }

    clients.set(ws, {
      authed: true,
      serverId: typeof msg.serverId === 'string' ? msg.serverId : 'default',
      connectedAt: Date.now()
    });

    ws.send(JSON.stringify({ type: 'auth_result', ok: true }));
    return;
  }

  if (!clients.get(ws)?.authed) {
    ws.send(JSON.stringify({ type: 'error', error: 'not_authenticated' }));
  }
}

function sendToClient(ws, payload) {
  if (!ws) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function whitelistAdd(username) {
  const ws = getAnyAuthedClient();
  return sendToClient(ws, { type: 'whitelist_add', username });
}

function whitelistRemove(username) {
  const ws = getAnyAuthedClient();
  return sendToClient(ws, { type: 'whitelist_remove', username });
}

module.exports = {
  handleMessage,
  unregister,
  whitelistAdd,
  whitelistRemove
};
