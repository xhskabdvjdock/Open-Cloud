'use strict';

/**
 * auth.js — official Telegram Login verification + server sessions.
 * Docs: https://core.telegram.org/widgets/login
 * Never asks for phone/password/OTP. Verifies the widget's HMAC hash.
 */
const crypto = require('crypto');
const config = require('./config');
const dbmod = require('./db');
const { randomToken } = require('./crypto');

const COOKIE_NAME = 'oc_session';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd, // Secure cookies in production (HTTPS)
    path: '/',
    maxAge: config.sessionDays * 24 * 3600 * 1000,
  };
}

/**
 * Verify Telegram Login Widget payload.
 * data: { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
 * Returns cleaned profile or throws.
 */
function verifyTelegramAuth(data) {
  const botToken = config.loginBotToken;
  if (!botToken) throw new Error('Telegram Login is not configured (TELEGRAM_LOGIN_BOT_TOKEN).');
  if (!data || typeof data !== 'object') throw new Error('Invalid auth payload.');
  const { hash, ...rest } = data;
  if (!hash || !rest.id || !rest.auth_date) throw new Error('Missing auth fields.');
  const authDate = Number(rest.auth_date);
  if (!Number.isFinite(authDate)) throw new Error('Invalid auth date.');
  // Reject stale logins (> 24h)
  if (Math.abs(Date.now() / 1000 - authDate) > 24 * 3600) {
    throw new Error('Login expired. Please try again.');
  }
  const checkString = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join('\n');
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  const a = Buffer.from(hmac);
  const b = Buffer.from(String(hash));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Telegram signature mismatch.');
  }
  return {
    telegram_user_id: Number(rest.id),
    username: rest.username ? String(rest.username) : null,
    display_name: [rest.first_name, rest.last_name].filter(Boolean).join(' ').slice(0, 120) || 'Telegram User',
    photo_url: rest.photo_url ? String(rest.photo_url) : null,
  };
}

function findUserByTelegramId(telegramId) {
  const db = dbmod.db;
  return db.prepare('SELECT * FROM users WHERE telegram_user_id = ?').get(Number(telegramId)) || null;
}

function upsertUser(profile) {
  const db = dbmod.db;
  const t = dbmod.now();
  const existing = profile.telegram_user_id != null ? findUserByTelegramId(profile.telegram_user_id) : null;
  if (existing) {
    db.prepare('UPDATE users SET username = ?, display_name = ?, photo_url = ?, updated_at = ? WHERE id = ?')
      .run(profile.username || null, profile.display_name || existing.display_name, profile.photo_url || null, t, existing.id);
    db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').run(existing.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
  }
  const r = db.prepare('INSERT INTO users (telegram_user_id, username, display_name, photo_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(profile.telegram_user_id != null ? Number(profile.telegram_user_id) : null,
      profile.username || null, profile.display_name || 'User', profile.photo_url || null, t, t);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(r.lastInsertRowid));
  db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').run(user.id);
  return user;
}

function createSession(userId) {
  const db = dbmod.db;
  const id = randomToken(32);
  const t = dbmod.now();
  const expires = new Date(Date.now() + config.sessionDays * 24 * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(id, userId, t, expires);
  // prune expired occasionally
  try { db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(t); } catch { /* ignore */ }
  return { id, expires };
}

function getSession(token) {
  if (!token) return null;
  const db = dbmod.db;
  const row = db.prepare('SELECT s.*, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?').get(token);
  if (!row) return null;
  if (row.expires_at < dbmod.now()) {
    try { db.prepare('DELETE FROM sessions WHERE id = ?').run(token); } catch { /* */ }
    return null;
  }
  return row;
}

function destroySession(token) {
  if (!token) return;
  try { dbmod.db.prepare('DELETE FROM sessions WHERE id = ?').run(token); } catch { /* */ }
}

function destroyAllUserSessions(userId) {
  try { dbmod.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); } catch { /* */ }
}

module.exports = {
  COOKIE_NAME, cookieOptions,
  verifyTelegramAuth, findUserByTelegramId, upsertUser,
  createSession, getSession, destroySession, destroyAllUserSessions,
};
