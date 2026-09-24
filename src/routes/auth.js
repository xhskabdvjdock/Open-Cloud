'use strict';

const express = require('express');
const config = require('../config');
const auth = require('../auth');
const mw = require('../middleware');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    telegramLoginConfigured: !!(config.loginBotToken && config.loginBotName),
    loginBotName: config.loginBotName || null,
    devLoginEnabled: !!config.devLocalLogin,
    maxUploadBytes: config.maxUploadBytes,
  });
});

router.get('/me', (req, res) => {
  const sess = auth.getSession(req.cookies && req.cookies[auth.COOKIE_NAME]);
  if (!sess) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not logged in.' });
  res.json({
    user: mw.publicUser({
      id: sess.user_id, telegram_user_id: sess.telegram_user_id,
      username: sess.username, display_name: sess.display_name,
      photo_url: sess.photo_url, created_at: sess.created_at,
    }),
  });
});

// Official Telegram Login Widget verification
router.post('/telegram', mw.rateLimit({ max: 20, key: 'auth' }), (req, res) => {
  try {
    const profile = auth.verifyTelegramAuth(req.body || {});
    const user = auth.upsertUser(profile);
    const sess = auth.createSession(user.id);
    res.cookie(auth.COOKIE_NAME, sess.id, auth.cookieOptions());
    res.json({ user: mw.publicUser(user) });
  } catch (e) {
    res.status(401).json({ error: 'AUTH_FAILED', message: e.message || 'Telegram login failed.' });
  }
});

// Development-only login (disabled in production, clearly labelled)
router.post('/dev', mw.rateLimit({ max: 20, key: 'auth' }), (req, res) => {
  if (!config.devLocalLogin) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Development login is disabled.' });
  }
  const name = String((req.body && req.body.username) || 'dev').trim().slice(0, 40) || 'dev';
  const user = auth.upsertUser({ telegram_user_id: null, username: `dev_${name}`, display_name: `${name} (dev)`, photo_url: null });
  const sess = auth.createSession(user.id);
  res.cookie(auth.COOKIE_NAME, sess.id, auth.cookieOptions());
  res.json({ user: mw.publicUser(user), dev: true });
});

router.post('/logout', (req, res) => {
  auth.destroySession(req.cookies && req.cookies[auth.COOKIE_NAME]);
  res.clearCookie(auth.COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.post('/logout-all', mw.requireAuth, (req, res) => {
  auth.destroyAllUserSessions(req.user.id);
  res.clearCookie(auth.COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

module.exports = router;
