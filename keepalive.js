const http = require('http');
const https = require('https');

function ping(url) {
  return new Promise((resolve) => {
    try {
      if (!url) return resolve(false);
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          method: 'GET',
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + (u.search || ''),
          timeout: 10_000,
          headers: { 'User-Agent': 'whitelisthub-keepalive' }
        },
        (res) => {
          res.resume();
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.on('error', () => resolve(false));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function startKeepAlive({ url, intervalMs = 12 * 60 * 1000 } = {}) {
  if (!url) return;

  const safeInterval = Math.max(60_000, Number(intervalMs) || 12 * 60 * 1000);

  setInterval(async () => {
    try {
      await ping(url);
    } catch {
    }
  }, safeInterval);
}

module.exports = {
  startKeepAlive
};
