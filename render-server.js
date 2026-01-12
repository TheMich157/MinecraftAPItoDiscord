const express = require('express');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const { WebSocketServer } = require('ws');
const wsHub = require('./ws-hub');

const { app: apiApp, initApi } = require('./api/server');

let botModule = null;
try {
  botModule = require('./bot/index.js');
} catch (error) {
}

const PORT = process.env.PORT || 3000;

const app = express();

app.use(apiApp);

if (botModule && botModule.notifyApp) {
  app.use('/internal', botModule.notifyApp);
}

const buildPath = path.join(__dirname, 'dashboard', 'build');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(buildPath, 'index.html'));
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      await wsHub.handleMessage(ws, msg);
    } catch (err) {
    }
  });

  ws.on('close', () => {
    wsHub.unregister(ws);
  });
});

server.listen(PORT, async () => {
  console.log(`Unified server running on port ${PORT}`);

  if (typeof initApi === 'function') {
    try {
      await initApi();
    } catch (error) {
    }
  }

  if (botModule && typeof botModule.startBot === 'function') {
    botModule.startBot();
  }
});
module.exports = app;
