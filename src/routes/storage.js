'use strict';

/**
 * Storage connection routes: connect bot token (validated via getMe,
 * encrypted at rest, never returned), configure chat, detect, test,
 * disconnect. All server-side — token never reaches the browser.
 */
const express = require('express');
const dbmod = require('../db');
const mw = require('../middleware');
const tg = require('../telegram');
const { encryptToken, decryptToken } = require('../crypto');

const router = express.Router();
router.use(mw.requireAuth);

function getConnection(userId) {
  return dbmod.db.prepare('SELECT * FROM storage_connections WHERE user_id = ?').get(userId) || null;
}

function publicConnection(c) {
  if (!c) return { configured: false, status: 'none' };
  return {
    configured: true,
    status: c.status,
    bot_username: c.bot_username || null,
    storage_chat_id: c.storage_chat_id || null,
    last_checked_at: c.last_checked_at || null,
    last_error: c.last_error || null,
    updated_at: c.updated_at,
  };
}

function loadToken(userId) {
  const c = getConnection(userId);
  if (!c) {
    const e = new Error('No storage bot connected.');
    e.status = 409; e.code = 'NO_STORAGE';
    throw e;
  }
  try {
    return { conn: c, token: decryptToken(c.encrypted_bot_token) };
  } catch {
    const e = new Error('Stored credentials are unreadable. Reconnect your bot.');
    e.status = 500; e.code = 'CREDENTIALS_CORRUPT';
    throw e;
  }
}

router.get('/connection', (req, res) => {
  res.json(publicConnection(getConnection(req.user.id)));
});

// Step 2: connect bot token
router.post('/connect', async (req, res, next) => {
  try {
    const raw = String((req.body && req.body.bot_token) || '').trim();
    if (!tg.isValidTokenFormat(raw)) {
      return res.status(400).json({ error: 'INVALID_TOKEN_FORMAT', message: 'That does not look like a BotFather token (format: 123456:ABC-DEF...).' });
    }
    let me;
    try {
      me = await tg.getMe(raw);
    } catch (e) {
      return res.status(502).json({ error: e.code || 'INVALID_TOKEN', message: e.message });
    }
    const t = dbmod.now();
    const enc = encryptToken(raw);
    const existing = getConnection(req.user.id);
    if (existing) {
      dbmod.db.prepare('UPDATE storage_connections SET bot_username = ?, encrypted_bot_token = ?, status = ?, last_checked_at = ?, last_error = NULL, updated_at = ? WHERE user_id = ?')
        .run(me.username || null, enc, existing.storage_chat_id ? 'pending' : 'pending', t, t, req.user.id);
    } else {
      dbmod.db.prepare('INSERT INTO storage_connections (user_id, bot_username, encrypted_bot_token, storage_chat_id, status, last_checked_at, last_error, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, NULL, ?, ?)')
        .run(req.user.id, me.username || null, enc, 'pending', t, t, t);
    }
    res.json({ ok: true, bot_username: me.username, bot_name: me.first_name, connection: publicConnection(getConnection(req.user.id)) });
  } catch (e) { next(e); }
});

// Step 3: configure storage chat
router.post('/chat', async (req, res, next) => {
  try {
    const chatId = String((req.body && req.body.storage_chat_id) || '').trim();
    if (!chatId) return res.status(400).json({ error: 'CHAT_REQUIRED', message: 'Storage chat is required.' });
    const { token } = loadToken(req.user.id);
    try {
      await tg.getChat(token, chatId);
    } catch (e) {
      return res.status(502).json({ error: e.code || 'CHAT_INVALID', message: e.message });
    }
    const t = dbmod.now();
    dbmod.db.prepare('UPDATE storage_connections SET storage_chat_id = ?, status = ?, updated_at = ? WHERE user_id = ?')
      .run(chatId, 'pending', t, req.user.id);
    res.json({ ok: true, connection: publicConnection(getConnection(req.user.id)) });
  } catch (e) { next(e); }
});

// Step 3 helper: detect chats (user must send /start to the bot first)
router.get('/detect', async (req, res) => {
  try {
    const { token } = loadToken(req.user.id);
    const chats = await tg.detectStorageChats(token);
    res.json({ chats, hint: chats.length ? null : 'No recent chats found. Open the bot in Telegram, press Start (or send any message), then retry.' });
  } catch (e) {
    res.status(502).json({ error: e.code || 'DETECT_FAILED', message: e.message || 'Detection failed.' });
  }
});

// Step 4: real test (getMe + getChat + sendChatAction)
router.post('/test', async (req, res) => {
  const conn = getConnection(req.user.id);
  if (!conn) return res.status(409).json({ error: 'NO_STORAGE', message: 'Connect a bot first.' });
  let token;
  try { token = decryptToken(conn.encrypted_bot_token); }
  catch { return res.status(500).json({ error: 'CREDENTIALS_CORRUPT', message: 'Stored credentials are unreadable. Reconnect.' }); }
  try {
    const result = await tg.testConnection(token, conn.storage_chat_id);
    const t = dbmod.now();
    dbmod.db.prepare('UPDATE storage_connections SET status = ?, last_checked_at = ?, last_error = NULL, updated_at = ? WHERE user_id = ?')
      .run('connected', t, t, req.user.id);
    res.json({ ok: true, ...result, connection: publicConnection(getConnection(req.user.id)) });
  } catch (e) {
    const t = dbmod.now();
    try {
      dbmod.db.prepare('UPDATE storage_connections SET status = ?, last_checked_at = ?, last_error = ?, updated_at = ? WHERE user_id = ?')
        .run('error', t, e.message, t, req.user.id);
    } catch { /* ignore */ }
    res.status(502).json({ error: e.code || 'TEST_FAILED', message: e.message, connection: publicConnection(getConnection(req.user.id)) });
  }
});

router.post('/disconnect', (req, res) => {
  dbmod.db.prepare('DELETE FROM storage_connections WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true, warning: 'Connection removed. Your Telegram messages were left untouched; file metadata is kept and will work again after reconnecting.' });
});

module.exports = router;
module.exports.getConnection = getConnection;
module.exports.loadToken = loadToken;
module.exports.publicConnection = publicConnection;
