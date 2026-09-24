'use strict';

/** Shared middleware: auth, CSRF-lite, rate limiting, errors. */
const auth = require('./auth');

// ---- Auth ----
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[auth.COOKIE_NAME];
  const sess = auth.getSession(token);
  if (!sess) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Please log in.' });
  req.user = {
    id: sess.user_id,
    telegram_user_id: sess.telegram_user_id,
    username: sess.username,
    display_name: sess.display_name,
    photo_url: sess.photo_url,
  };
  req.sessionId = token;
  next();
}

// ---- CSRF-lite: state-changing fetch calls must carry this header ----
function requireCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return next();
  return res.status(403).json({ error: 'CSRF', message: 'Missing X-Requested-With header.' });
}

// ---- Tiny in-memory sliding-window rate limiter ----
const buckets = new Map();
function rateLimit({ windowMs = 60000, max = 120, key = 'global' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const k = `${key}:${ip}`;
    const nowMs = Date.now();
    let arr = buckets.get(k) || [];
    arr = arr.filter((t) => nowMs - t < windowMs);
    if (arr.length >= max) {
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many requests. Slow down and retry.' });
    }
    arr.push(nowMs);
    buckets.set(k, arr);
    if (buckets.size > 5000) buckets.clear();
    next();
  };
}

// ---- Validation helpers ----
function cleanName(name, fallback = 'untitled') {
  if (typeof name !== 'string') return fallback;
  let n = name.trim().replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').slice(0, 180);
  n = n.replace(/^\.+$/, '_');
  return n || fallback;
}

const SORTS = new Set(['name', 'size', 'created_at', 'updated_at', 'mime_type']);
function parseSort(q) {
  const by = SORTS.has(q.sort_by) ? q.sort_by : 'updated_at';
  const dir = q.sort_dir === 'asc' ? 'asc' : 'desc';
  return { by, dir };
}

// Public user object (never leak internals)
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, telegram_user_id: u.telegram_user_id, username: u.username,
    display_name: u.display_name, photo_url: u.photo_url,
    created_at: u.created_at,
  };
}

// File row -> API object (never expose tokens)
function publicFile(r) {
  if (!r) return null;
  return {
    id: r.id, folder_id: r.folder_id, name: r.name, original_name: r.original_name,
    mime_type: r.mime_type, size: r.size, sha256: r.sha256,
    width: r.width, height: r.height, duration: r.duration,
    is_favorite: !!r.is_favorite, status: r.status,
    created_at: r.created_at, updated_at: r.updated_at,
    trashed_at: r.trashed_at || null,
  };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL' : 'ERROR');
  if (status >= 500) console.error('[api]', err);
  res.status(status).json({ error: code, message: err.message || 'Something went wrong.' });
}

module.exports = { requireAuth, requireCsrf, rateLimit, cleanName, parseSort, publicUser, publicFile, errorHandler };
