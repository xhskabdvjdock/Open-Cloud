'use strict';

/**
 * Open Cloud server.
 * Frontend -> Backend API -> Telegram API. Tokens never touch the browser.
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./src/config');
const dbmod = require('./src/db');
const mw = require('./src/middleware');

function createApp() {
  dbmod.open();
  try {
    fs.mkdirSync(config.tmpDir, { recursive: true });
  } catch (e) {
    // Serverless read-only FS: use /tmp instead.
    const fallback = '/tmp/opencloud-tmp';
    if (config.tmpDir !== fallback) {
      console.warn(`[open-cloud] tmp dir not writable, falling back to ${fallback}`);
      try { config.tmpDir = fallback; } catch { /* */ }
      fs.mkdirSync(fallback, { recursive: true });
    } else {
      throw e;
    }
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cookieParser(config.sessionSecret || 'dev'));
  app.use(express.json({ limit: '256kb' }));
  app.use(mw.rateLimit({ max: 300, key: 'global' }));

  // Public (no session): health must be registered before the auth routers.
  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/api/auth', mw.requireCsrf, require('./src/routes/auth'));
  app.use('/api/storage', mw.requireCsrf, mw.rateLimit({ max: 200, key: 'api' }), require('./src/routes/storage'));
  app.use('/api', mw.requireCsrf, mw.rateLimit({ max: 400, key: 'api' }), require('./src/routes/files'));
  app.use('/api', mw.requireCsrf, mw.rateLimit({ max: 200, key: 'api' }), require('./src/routes/settings'));

  // Static frontend
  const pub = path.join(__dirname, 'public');
  app.use(express.static(pub, { index: false, maxAge: config.isProd ? '1h' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(pub, 'index.html'));
  });

  app.use(mw.errorHandler);
  return app;
}

if (require.main === module) {
  if (config.databaseUrl && config.databaseUrl.startsWith('postgres')) {
    console.warn('[open-cloud] DATABASE_URL is PostgreSQL. This build runs SQLite; migrate with database/schema.postgres.sql.');
  }
  if (config.encryptionKeyEphemeral) {
    console.warn('[open-cloud] WARNING: ENCRYPTION_KEY not set — using ephemeral dev key. Stored bot tokens will NOT survive restarts. Set ENCRYPTION_KEY.');
  }
  if (!config.sessionSecret || config.sessionSecret.includes('change-me') || config.sessionSecret.includes('dev-session-secret')) {
    console.warn('[open-cloud] WARNING: SESSION_SECRET looks default. Set a strong SESSION_SECRET — JWT sessions are only secure with a stable secret shared by all instances.');
  }
  if (!config.loginBotToken) {
    console.warn('[open-cloud] Telegram Login not configured (TELEGRAM_LOGIN_BOT_TOKEN). See README. Dev login:', config.devLocalLogin ? 'ENABLED' : 'disabled');
  }
  const app = createApp();
  app.listen(config.port, () => console.log(`[open-cloud] listening on http://localhost:${config.port}`));
}

// ---- Vercel serverless compatibility ----
// Vercel expects the module's default export to be a function (req, res).
// We export a lazy handler that builds/caches the Express app on first hit,
// while keeping { createApp } available for tests and `node server.js`.
let _cachedApp = null;
function getApp() {
  if (!_cachedApp) _cachedApp = createApp();
  return _cachedApp;
}
function vercelHandler(req, res) {
  return getApp()(req, res);
}
vercelHandler.createApp = createApp;
vercelHandler.getApp = getApp;

module.exports = vercelHandler;
module.exports.createApp = createApp;
module.exports.getApp = getApp;
module.exports.default = vercelHandler;
