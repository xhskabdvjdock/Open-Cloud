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

// ---- Stateless JWT sessions (works across serverless instances) ----
// Payload: { tid, u, d, p, jti, iat, exp }. Signed with SESSION_SECRET,
// so it MUST be a long random value shared by all instances (Vercel env).
function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}
function jwtSecret() {
  return config.sessionSecret || 'dev-session-secret-not-for-production';
}
function signJwt(payload) {
  const h = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64urlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', jwtSecret()).update(`${h}.${b}`).digest();
  return `${h}.${b}.${b64urlEncode(sig)}`;
}
function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let payload;
  try { payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8')); } catch { return null; }
  let actual;
  try { actual = b64urlDecode(parts[2]); } catch { return null; }
  const expected = crypto.createHmac('sha256', jwtSecret()).update(`${parts[0]}.${parts[1]}`).digest();
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  if (!payload.exp || Date.now() > Number(payload.exp) * 1000) return null;
  return payload;
}
function ensureRevokedTable() {
  try { dbmod.db.exec('CREATE TABLE IF NOT EXISTS revoked_jwt (jti TEXT PRIMARY KEY, user_id INTEGER, revoked_at TEXT NOT NULL)'); } catch { /* */ }
}
function pruneRevocations() {
  try {
    const threshold = new Date(Date.now() - config.sessionDays * 24 * 3600 * 1000).toISOString();
    dbmod.db.prepare('DELETE FROM revoked_jwt WHERE revoked_at < ?').run(threshold);
  } catch { /* */ }
}
function isJwtRevoked(jti) {
  if (!jti) return true;
  try {
    ensureRevokedTable();
    return !!dbmod.db.prepare('SELECT 1 FROM revoked_jwt WHERE jti = ?').get(jti);
  } catch { return false; }
}
// Resolve the DB user for a JWT payload, recreating it if the (ephemeral)
// database was wiped. Only writes when the user is missing or changed.
function resolveUserFromJwtPayload(payload) {
  const db = dbmod.db;
  if (payload.tid != null) {
    const existing = findUserByTelegramId(payload.tid);
    if (!existing) {
      return upsertUser({
        telegram_user_id: payload.tid,
        username: payload.u || null,
        display_name: payload.d || 'Telegram User',
        photo_url: payload.p || null,
      });
    }
    const nu = payload.u || null;
    const nd = payload.d || existing.display_name;
    const np = payload.p || null;
    if (existing.username !== nu || existing.display_name !== nd || existing.photo_url !== np) {
      db.prepare('UPDATE users SET username = ?, display_name = ?, photo_url = ?, updated_at = ? WHERE id = ?')
        .run(nu, nd, np, dbmod.now(), existing.id);
      db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').run(existing.id);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
    }
    return existing;
  }
  if (payload.u) {
    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(payload.u);
    if (existing) return existing;
    return upsertUser({
      telegram_user_id: null,
      username: payload.u,
      display_name: payload.d || 'User',
      photo_url: payload.p || null,
    });
  }
  return null;
}
function createJwtForUser(user) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    tid: user.telegram_user_id != null ? Number(user.telegram_user_id) : null,
    u: user.username || null,
    d: user.display_name || null,
    p: user.photo_url || null,
    jti: randomToken(16),
    iat: nowSec,
    exp: nowSec + config.sessionDays * 24 * 3600 * 1000,
  };
  return { token: signJwt(payload), expires: new Date(payload.exp * 1000).toISOString() };
}

function getSession(token) {
  if (!token) return null;
  // 1) Stateless JWT first (survives serverless restarts / multi-instance).
  const payload = verifyJwt(token);
  if (payload) {
    if (isJwtRevoked(payload.jti)) return null;
    try {
      const user = resolveUserFromJwtPayload(payload);
      if (!user) return null;
      return {
        id: token,
        user_id: user.id,
        telegram_user_id: user.telegram_user_id,
        username: user.username,
        display_name: user.display_name,
        photo_url: user.photo_url,
        created_at: user.created_at,
        expires_at: new Date(Number(payload.exp) * 1000).toISOString(),
        jwt: true,
      };
    } catch { return null; }
  }
  // 2) Fallback: legacy opaque DB session (single-node / old cookies).
  try {
    const db = dbmod.db;
    const row = db.prepare('SELECT s.*, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?').get(token);
    if (!row) return null;
    if (row.expires_at < dbmod.now()) {
      try { db.prepare('DELETE FROM sessions WHERE id = ?').run(token); } catch { /* */ }
      return null;
    }
    return row;
  } catch { return null; }
}

function destroySession(token) {
  if (!token) return;
  // Revoke JWTs so "logout" actually logs out (single-node revocation list).
  const payload = verifyJwt(token);
  if (payload && payload.jti) {
    try {
      ensureRevokedTable();
      let uid = null;
      try {
        const user = resolveUserFromJwtPayload(payload);
        uid = user ? user.id : null;
      } catch { /* */ }
      dbmod.db.prepare('INSERT OR IGNORE INTO revoked_jwt (jti, user_id, revoked_at) VALUES (?, ?, ?)')
        .run(payload.jti, uid, dbmod.now());
      pruneRevocations();
    } catch { /* */ }
  }
  // Delete legacy opaque sessions too.
  try { dbmod.db.prepare('DELETE FROM sessions WHERE id = ?').run(token); } catch { /* */ }
}

function destroyAllUserSessions(userId) {
  try { dbmod.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); } catch { /* */ }
  // NOTE: stateless JWTs from other browsers stay valid until expiry without
  // a shared store. The current cookie is always cleared by the route.
}

module.exports = {
  COOKIE_NAME, cookieOptions,
  verifyTelegramAuth, findUserByTelegramId, upsertUser,
  createSession, createJwtForUser, getSession, destroySession, destroyAllUserSessions,
};
