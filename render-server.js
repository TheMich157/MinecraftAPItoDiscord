const express = require('express');
const path = require('path');

// Import the API app and helper
const { app: apiApp, startServer: startApi } = require('./api/server');

const PORT = process.env.PORT || 3000;

const server = express();

// Serve static dashboard build
const buildPath = path.join(__dirname, 'dashboard', 'build');
server.use(express.static(buildPath));

// Mount API app - API routes are defined on apiApp (they start with /api/...)
server.use(apiApp);

// SPA fallback - send index.html for any non-API route
server.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(buildPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Render server running on port ${PORT}`);
});

// Also start internal API listeners if needed (startApi will ensure data dir and validation)
// Note: apiApp is already mounted; startApi is available if external listeners are required.
if (typeof startApi === 'function') {
  // Do not start a separate listener to avoid port conflicts; keep API mounted only.
}

module.exports = server;
