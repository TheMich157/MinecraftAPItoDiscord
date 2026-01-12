const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const clients = new Map();
const serverIndex = new Map();

const serverState = new Map();
const serverEvents = new Map();
const MAX_EVENTS = 500;

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
    pushEvent(meta.serverId, { ts: Date.now(), type: 'disconnected' });
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

function pushEvent(serverId, event) {
  if (!serverId) return;
  const list = serverEvents.get(serverId) || [];
  list.push(event);
  if (list.length > MAX_EVENTS) {
    list.splice(0, list.length - MAX_EVENTS);
  }
  serverEvents.set(serverId, list);
}

function setState(serverId, state) {
  if (!serverId) return;
  serverState.set(serverId, state);
}

function getServerState(serverId) {
  return serverState.get(serverId) || null;
}

function getServerEvents(serverId, limit = 100) {
  const list = serverEvents.get(serverId) || [];
  const n = typeof limit === 'number' && limit > 0 ? Math.min(limit, MAX_EVENTS) : 100;
  return list.slice(Math.max(0, list.length - n));
}

async function handleMessage(ws, msg) {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    return;
  }

  if (msg.type === 'auth') {
    const cfg = await readConfig();
    const serverId = typeof msg.serverId === 'string' ? msg.serverId : 'default';
    const expectedKey = cfg?.servers?.[serverId]?.apiKey || cfg?.minecraftServers?.[serverId]?.apiKey || cfg?.minecraftApiKey;

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
      serverId,
      connectedAt: Date.now()
    });

    serverIndex.set(serverId, ws);

    pushEvent(serverId, { ts: Date.now(), type: 'connected' });

    ws.send(JSON.stringify({ type: 'auth_result', ok: true }));
    return;
  }

  const meta = clients.get(ws);
  if (!meta?.authed) {
    ws.send(JSON.stringify({ type: 'error', error: 'not_authenticated' }));
    return;
  }

  if (msg.type === 'event') {
    const eventType = typeof msg.eventType === 'string' ? msg.eventType : 'unknown';
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
    pushEvent(meta.serverId, { ts: Date.now(), type: eventType, payload });
    return;
  }

  if (msg.type === 'state') {
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
    setState(meta.serverId, { ts: Date.now(), payload });
    return;
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
  getServerState,
  getServerEvents,
  whitelistAdd,
  whitelistAddTo,
  whitelistRemove,
  whitelistRemoveFrom
};
