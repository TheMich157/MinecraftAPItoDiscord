const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const clients = new Map();
const serverIndex = new Map();

async function readConfig() {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, 'config.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function unregister(ws) {
  const meta = clients.get(ws);
  if (meta && meta.serverId) {
    const existing = serverIndex.get(meta.serverId);
    if (existing === ws) {
      serverIndex.delete(meta.serverId);
    }
  }
  clients.delete(ws);
}

function getAnyAuthedClient() {
  for (const [ws, meta] of clients.entries()) {
    if (meta && meta.authed) return ws;
  }
  return null;
}

function getClientByServerId(serverId) {
  if (!serverId || typeof serverId !== 'string') return null;
  return serverIndex.get(serverId) || null;
}

function listServers() {
  const out = [];
  for (const [serverId, ws] of serverIndex.entries()) {
    const meta = clients.get(ws);
    if (meta && meta.authed) {
      out.push({
        serverId,
        connectedAt: meta.connectedAt
      });
    }
  }
  return out;
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

    const serverId = typeof msg.serverId === 'string' ? msg.serverId : 'default';

    clients.set(ws, {
      authed: true,
      serverId,
      connectedAt: Date.now()
    });

    serverIndex.set(serverId, ws);

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

function whitelistAddTo(serverId, username) {
  const ws = getClientByServerId(serverId) || getAnyAuthedClient();
  return sendToClient(ws, { type: 'whitelist_add', username, serverId });
}

function whitelistRemove(username) {
  const ws = getAnyAuthedClient();
  return sendToClient(ws, { type: 'whitelist_remove', username });
}

function whitelistRemoveFrom(serverId, username) {
  const ws = getClientByServerId(serverId) || getAnyAuthedClient();
  return sendToClient(ws, { type: 'whitelist_remove', username, serverId });
}

module.exports = {
  handleMessage,
  unregister,
  listServers,
  whitelistAdd,
  whitelistAddTo,
  whitelistRemove,
  whitelistRemoveFrom
};
