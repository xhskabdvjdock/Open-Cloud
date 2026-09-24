'use strict';

/**
 * File + folder + search + trash + usage routes.
 * Every handler verifies ownership (user_id). Telegram tokens never
 * leave the server. Uploads stream via temp files, never full RAM.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const dbmod = require('../db');
const mw = require('../middleware');
const tg = require('../telegram');
const { sha256File } = require('../crypto');
const storage = require('./storage');

const router = express.Router();
router.use(mw.requireAuth);

fs.mkdirSync(config.tmpDir, { recursive: true });
const upload = multer({
  dest: config.tmpDir,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});
// Map multer errors to clean API errors (e.g. Telegram Bot API size cap)
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'FILE_TOO_LARGE', message: `File exceeds the Telegram Bot API limit (${Math.round(config.maxUploadBytes / 1048576)} MB for bots).` });
      }
      return res.status(400).json({ error: 'UPLOAD_FAILED', message: err.message || 'Upload failed.' });
    }
    next();
  });
}

function ensureFolderOwned(userId, folderId) {
  if (folderId == null) return null;
  const f = dbmod.db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(Number(folderId), userId);
  if (!f) {
    const e = new Error('Folder not found.');
    e.status = 404; e.code = 'FOLDER_NOT_FOUND';
    throw e;
  }
  return f;
}

function getFileOwned(userId, id) {
  const r = dbmod.db.prepare('SELECT f.*, t.deleted_at AS trashed_at FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.id = ? AND f.user_id = ?').get(Number(id), userId);
  if (!r) {
    const e = new Error('File not found.');
    e.status = 404; e.code = 'FILE_NOT_FOUND';
    throw e;
  }
  return r;
}

const SORT_COL = { name: 'f.name', size: 'f.size', created_at: 'f.created_at', updated_at: 'f.updated_at', mime_type: 'f.mime_type' };

function listFiles({ userId, folderId = undefined, view = 'all', sortBy = 'updated_at', sortDir = 'desc', limit = 100, offset = 0 }) {
  const col = SORT_COL[sortBy] || 'f.updated_at';
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
  limit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  offset = Math.max(Number(offset) || 0, 0);
  const conds = ['f.user_id = ?'];
  const params = [userId];
  if (view === 'trash') {
    conds.push('t.deleted_at IS NOT NULL');
  } else {
    conds.push('t.deleted_at IS NULL');
    if (view === 'favorites') conds.push('f.is_favorite = 1');
    // favorites/recent are global views; folder scoping applies to 'all' only
    if (view === 'all') {
      if (folderId === null || folderId === 'null' || folderId === '') { conds.push('f.folder_id IS NULL'); }
      else if (folderId !== undefined) { conds.push('f.folder_id = ?'); params.push(Number(folderId)); }
    }
  }
  if (view === 'recent') { /* same base, ordered by updated */ }
  const where = conds.join(' AND ');
  const total = dbmod.db.prepare(`SELECT COUNT(*) AS c FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE ${where}`).get(...params).c;
  const rows = dbmod.db.prepare(
    `SELECT f.*, t.deleted_at AS trashed_at FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE ${where} ORDER BY ${col} ${dir}, f.id ${dir} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  return { items: rows.map(mw.publicFile), total, limit, offset };
}

// ---------- Folders ----------
router.get('/folders/tree', (req, res) => {
  const rows = dbmod.db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC').all(req.user.id);
  res.json({ folders: rows });
});

router.get('/folders/:id/path', (req, res, next) => {
  try {
    const chain = [];
    let cur = ensureFolderOwned(req.user.id, req.params.id);
    let guard = 0;
    while (cur && guard++ < 50) {
      chain.unshift({ id: cur.id, name: cur.name });
      cur = cur.parent_id ? dbmod.db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(cur.parent_id, req.user.id) : null;
    }
    res.json({ path: chain });
  } catch (e) { next(e); }
});

router.post('/folders', (req, res, next) => {
  try {
    const name = mw.cleanName(req.body && req.body.name);
    if (!name) return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Folder name is required.' });
    let parentId = null;
    if (req.body && req.body.parent_id != null && req.body.parent_id !== '') {
      ensureFolderOwned(req.user.id, req.body.parent_id);
      parentId = Number(req.body.parent_id);
    }
    const dup = dbmod.db.prepare(
      parentId == null
        ? 'SELECT id FROM folders WHERE user_id = ? AND parent_id IS NULL AND name = ?'
        : 'SELECT id FROM folders WHERE user_id = ? AND parent_id = ? AND name = ?'
    ).get(...(parentId == null ? [req.user.id, name] : [req.user.id, parentId, name]));
    if (dup) return res.status(409).json({ error: 'FOLDER_EXISTS', message: 'A folder with this name already exists here.' });
    const t = dbmod.now();
    const r = dbmod.db.prepare('INSERT INTO folders (user_id, parent_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, parentId, name, t, t);
    res.status(201).json({ folder: dbmod.db.prepare('SELECT * FROM folders WHERE id = ?').get(Number(r.lastInsertRowid)) });
  } catch (e) { next(e); }
});

router.patch('/folders/:id', (req, res, next) => {
  try {
    const f = ensureFolderOwned(req.user.id, req.params.id);
    const updates = [];
    const params = [];
    if (req.body && req.body.name !== undefined) {
      const name = mw.cleanName(req.body.name);
      updates.push('name = ?'); params.push(name);
    }
    if (req.body && req.body.parent_id !== undefined) {
      const pid = req.body.parent_id == null || req.body.parent_id === '' ? null : Number(req.body.parent_id);
      if (pid === f.id) return res.status(400).json({ error: 'INVALID_MOVE', message: 'A folder cannot contain itself.' });
      if (pid != null) {
        const p = ensureFolderOwned(req.user.id, pid);
        // cycle check
        let cur = p; let guard = 0;
        while (cur && guard++ < 100) {
          if (cur.id === f.id) return res.status(400).json({ error: 'INVALID_MOVE', message: 'Cannot move a folder into its own subfolder.' });
          cur = cur.parent_id ? dbmod.db.prepare('SELECT * FROM folders WHERE id = ?').get(cur.parent_id) : null;
        }
      }
      updates.push('parent_id = ?'); params.push(pid);
    }
    if (!updates.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE', message: 'Nothing to update.' });
    updates.push('updated_at = ?'); params.push(dbmod.now());
    params.push(f.id);
    dbmod.db.prepare(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ folder: dbmod.db.prepare('SELECT * FROM folders WHERE id = ?').get(f.id) });
  } catch (e) { next(e); }
});

function folderContentsCount(userId, folderId) {
  const files = dbmod.db.prepare('SELECT COUNT(*) AS c FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id = ? AND t.deleted_at IS NULL').get(userId, folderId).c;
  const subs = dbmod.db.prepare('SELECT COUNT(*) AS c FROM folders WHERE user_id = ? AND parent_id = ?').get(userId, folderId).c;
  return { files, subs };
}

function trashFolderRecursive(userId, folderId) {
  const t = dbmod.now();
  const files = dbmod.db.prepare('SELECT f.id FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id = ? AND t.deleted_at IS NULL').all(userId, folderId);
  for (const f of files) dbmod.db.prepare('INSERT OR IGNORE INTO trash (file_id, user_id, deleted_at) VALUES (?, ?, ?)').run(f.id, userId, t);
  const subs = dbmod.db.prepare('SELECT id FROM folders WHERE user_id = ? AND parent_id = ?').all(userId, folderId);
  for (const s of subs) trashFolderRecursive(userId, s.id);
  dbmod.db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(folderId, userId);
}

router.delete('/folders/:id', (req, res, next) => {
  try {
    const f = ensureFolderOwned(req.user.id, req.params.id);
    const { files: fc, subs } = folderContentsCount(req.user.id, f.id);
    if ((fc > 0 || subs > 0) && req.query.mode !== 'trash') {
      return res.status(409).json({ error: 'FOLDER_NOT_EMPTY', message: `Folder contains ${fc} file(s) and ${subs} subfolder(s).`, files: fc, folders: subs });
    }
    if (fc > 0 || subs > 0) trashFolderRecursive(req.user.id, f.id);
    else dbmod.db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(f.id, req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- Files ----------
router.get('/files', (req, res) => {
  const { by, dir } = mw.parseSort(req.query);
  let folderId = undefined;
  if (req.query.folder_id !== undefined) {
    folderId = (req.query.folder_id === '' || req.query.folder_id === 'null' || req.query.folder_id === 'root') ? null : req.query.folder_id;
    if (folderId !== null && folderId !== undefined) ensureFolderOwnedSafe(req, folderId);
  }
  const view = ['all', 'recent', 'favorites'].includes(req.query.view) ? req.query.view : 'all';
  res.json(listFiles({ userId: req.user.id, folderId, view, sortBy: by, sortDir: dir, limit: req.query.limit, offset: req.query.offset }));
});

function ensureFolderOwnedSafe(req, folderId) {
  const f = dbmod.db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(Number(folderId), req.user.id);
  if (!f) {
    const e = new Error('Folder not found.');
    e.status = 404; e.code = 'FOLDER_NOT_FOUND';
    throw e;
  }
}

function resolveNameConflict(userId, folderId, name) {
  const exists = (n) => dbmod.db.prepare(
    folderId == null
      ? 'SELECT f.id FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id IS NULL AND f.name = ? AND t.deleted_at IS NULL'
      : 'SELECT f.id FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id = ? AND f.name = ? AND t.deleted_at IS NULL'
  ).get(...(folderId == null ? [userId, n] : [userId, folderId, n]));
  if (!exists(name)) return { name, conflict: false };
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let i = 1; i < 1000; i++) {
    const cand = `${base} (${i})${ext}`;
    if (!exists(cand)) return { name: cand, conflict: true };
  }
  return { name: `${base} (${Date.now()})${ext}`, conflict: true };
}

router.post('/files/upload', uploadSingle, async (req, res) => {
  const tmpPath = req.file && req.file.path;
  const cleanup = () => { if (tmpPath) fs.unlink(tmpPath, () => {}); };
  try {
    if (!req.file) return res.status(400).json({ error: 'FILE_REQUIRED', message: 'No file received.' });
    let folderId = null;
    if (req.body && req.body.folder_id != null && req.body.folder_id !== '' && req.body.folder_id !== 'null') {
      try { ensureFolderOwned(req.user.id, req.body.folder_id); folderId = Number(req.body.folder_id); }
      catch { cleanup(); return res.status(404).json({ error: 'FOLDER_NOT_FOUND', message: 'Target folder not found.' }); }
    }
    let conn;
    try { conn = storage.loadToken(req.user.id); }
    catch (e) { cleanup(); return res.status(e.status || 409).json({ error: e.code || 'NO_STORAGE', message: e.message }); }
    if (!conn.conn.storage_chat_id) {
      cleanup();
      return res.status(409).json({ error: 'NO_STORAGE_CHAT', message: 'Configure a storage chat first (Setup Wizard, step 3).' });
    }
    const onConflict = String((req.body && req.body.on_conflict) || 'rename');
    const originalName = req.file.originalname || 'file';
    const safeBase = mw.cleanName(path.basename(originalName));
    if (onConflict === 'error') {
      const dup = dbmod.db.prepare(
        folderId == null
          ? 'SELECT f.id FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id IS NULL AND f.name = ? AND t.deleted_at IS NULL'
          : 'SELECT f.id FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id = ? AND f.name = ? AND t.deleted_at IS NULL'
      ).get(...(folderId == null ? [req.user.id, safeBase] : [req.user.id, folderId, safeBase]));
      if (dup) { cleanup(); return res.status(409).json({ error: 'FILE_EXISTS', message: 'This file already exists. Choose Replace, Keep Both, or Rename.', file_id: dup.id }); }
    }
    // Duplicate content hint (size + hash) — warn, don't block
    const hash = await sha256File(tmpPath);
    const sameContent = dbmod.db.prepare('SELECT f.id, f.name FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.sha256 = ? AND f.size = ? AND t.deleted_at IS NULL LIMIT 1')
      .get(req.user.id, hash, req.file.size);

    let finalName = safeBase;
    if (onConflict !== 'replace') {
      const r = resolveNameConflict(req.user.id, folderId, safeBase);
      finalName = r.name;
    } else {
      // replace: remove existing same-name file (to trash? No — replace means new version; move old to trash)
      const old = dbmod.db.prepare(
        folderId == null
          ? 'SELECT f.* FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id IS NULL AND f.name = ? AND t.deleted_at IS NULL'
          : 'SELECT f.* FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND f.folder_id = ? AND f.name = ? AND t.deleted_at IS NULL'
      ).get(...(folderId == null ? [req.user.id, safeBase] : [req.user.id, folderId, safeBase]));
      if (old) {
        dbmod.db.prepare('INSERT OR IGNORE INTO trash (file_id, user_id, deleted_at) VALUES (?, ?, ?)').run(old.id, req.user.id, dbmod.now());
        // best-effort telegram delete of replaced version
        try { await tg.deleteMessage(conn.token, old.telegram_chat_id, old.telegram_message_id); } catch { /* keep metadata in trash */ }
      }
    }

    // Upload to Telegram (the actual storage). No DB entry until this succeeds.
    let message;
    try {
      message = await tg.sendDocument(conn.token, conn.conn.storage_chat_id, tmpPath, finalName);
    } catch (e) {
      cleanup();
      return res.status(502).json({ error: e.code || 'UPLOAD_FAILED', message: e.message || 'Upload failed. Retry.' });
    }
    let ref;
    try { ref = tg.extractFileRef(message); }
    catch (e) { cleanup(); return res.status(502).json({ error: 'UPLOAD_FAILED', message: e.message }); }

    // Save metadata. If DB fails after Telegram success, try to remove the orphan message.
    const t = dbmod.now();
    try {
      const mime = req.file.mimetype || 'application/octet-stream';
      const r = dbmod.db.prepare(
        'INSERT INTO files (user_id, folder_id, name, original_name, telegram_message_id, telegram_file_id, telegram_file_unique_id, telegram_chat_id, mime_type, size, sha256, is_favorite, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)'
      ).run(req.user.id, folderId, finalName, originalName.slice(0, 255),
        ref.message_id, ref.file_id, ref.file_unique_id, String(conn.conn.storage_chat_id),
        mime, req.file.size, hash, 'available', t, t);
      const row = dbmod.db.prepare('SELECT f.*, NULL AS trashed_at FROM files f WHERE f.id = ?').get(Number(r.lastInsertRowid));
      cleanup();
      res.status(201).json({
        file: mw.publicFile(row),
        duplicate_of: sameContent ? { id: sameContent.id, name: sameContent.name } : null,
      });
    } catch (dbErr) {
      try { await tg.deleteMessage(conn.token, String(conn.conn.storage_chat_id), ref.message_id); } catch { /* orphan: logged */ }
      console.error('[upload] DB save failed after Telegram success; orphan message cleanup attempted.', dbErr.message);
      cleanup();
      res.status(500).json({ error: 'DB_SAVE_FAILED', message: 'Telegram upload succeeded but saving metadata failed. The orphan message was removed; please retry.' });
    }
  } catch (e) {
    cleanup();
    if (e && e.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: `File exceeds the Telegram Bot API limit (${Math.round(config.maxUploadBytes / 1048576)} MB for bots).` });
    }
    res.status(500).json({ error: 'UPLOAD_FAILED', message: (e && e.message) || 'Upload failed.' });
  }
});

router.get('/files/:id', (req, res, next) => {
  try {
    const r = getFileOwned(req.user.id, req.params.id);
    res.json({ file: mw.publicFile(r) });
  } catch (e) { next(e); }
});

router.patch('/files/:id', (req, res, next) => {
  try {
    const f = getFileOwned(req.user.id, req.params.id);
    const updates = []; const params = [];
    if (req.body && req.body.name !== undefined) {
      const name = mw.cleanName(req.body.name);
      if (!name) return res.status(400).json({ error: 'NAME_REQUIRED', message: 'Name is required.' });
      updates.push('name = ?'); params.push(name);
    }
    if (req.body && req.body.folder_id !== undefined) {
      const fid = (req.body.folder_id == null || req.body.folder_id === '' || req.body.folder_id === 'null') ? null : Number(req.body.folder_id);
      if (fid != null) ensureFolderOwned(req.user.id, fid);
      updates.push('folder_id = ?'); params.push(fid);
    }
    if (req.body && req.body.is_favorite !== undefined) {
      updates.push('is_favorite = ?'); params.push(req.body.is_favorite ? 1 : 0);
    }
    if (!updates.length) return res.status(400).json({ error: 'NOTHING_TO_UPDATE', message: 'Nothing to update.' });
    updates.push('updated_at = ?'); params.push(dbmod.now());
    params.push(f.id);
    dbmod.db.prepare(`UPDATE files SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ file: mw.publicFile(getFileOwned(req.user.id, f.id)) });
  } catch (e) { next(e); }
});

// Move to trash (Telegram message kept until permanent delete).
// ?mode=permanent deletes the Telegram message + metadata immediately.
router.delete('/files/:id', async (req, res, next) => {
  try {
    const f = getFileOwned(req.user.id, req.params.id);
    if (req.query.mode === 'permanent') {
      await permanentDelete(req.user.id, f.id);
      return res.json({ ok: true, permanent: true });
    }
    dbmod.db.prepare('INSERT OR IGNORE INTO trash (file_id, user_id, deleted_at) VALUES (?, ?, ?)').run(f.id, req.user.id, dbmod.now());
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Orphan probe: verify Telegram still has the file
router.post('/files/:id/check', async (req, res, next) => {
  try {
    const f = getFileOwned(req.user.id, req.params.id);
    let conn;
    try { conn = storage.loadToken(req.user.id); }
    catch (e) { return res.status(e.status || 409).json({ error: e.code, message: e.message }); }
    try {
      await tg.getFile(conn.token, f.telegram_file_id);
      dbmod.db.prepare('UPDATE files SET status = ? WHERE id = ?').run('available', f.id);
      res.json({ available: true });
    } catch (e) {
      if (e.code === 'FILE_UNAVAILABLE' || /file/i.test(e.message)) {
        dbmod.db.prepare('UPDATE files SET status = ? WHERE id = ?').run('unavailable', f.id);
        return res.json({ available: false, error: 'FILE_UNAVAILABLE', message: 'This file is no longer available in Telegram storage.' });
      }
      throw e;
    }
  } catch (e) { next(e); }
});

// Stream helper (download = attachment, preview = inline), with Range support
async function streamFromTelegram(req, res, next, disposition) {
  try {
    const f = getFileOwned(req.user.id, req.params.id);
    if (f.status === 'unavailable') {
      return res.status(410).json({ error: 'FILE_UNAVAILABLE', message: 'This file is no longer available in Telegram storage.' });
    }
    let conn;
    try { conn = storage.loadToken(req.user.id); }
    catch (e) { return res.status(e.status || 409).json({ error: e.code, message: e.message }); }
    let info;
    try { info = await tg.getFile(conn.token, f.telegram_file_id); }
    catch (e) {
      if (e.code === 'FILE_UNAVAILABLE' || /file/i.test(e.message || '')) {
        dbmod.db.prepare('UPDATE files SET status = ? WHERE id = ?').run('unavailable', f.id);
        return res.status(410).json({ error: 'FILE_UNAVAILABLE', message: 'This file is no longer available in Telegram storage.' });
      }
      return res.status(502).json({ error: e.code || 'DOWNLOAD_FAILED', message: e.message });
    }
    if (!info || !info.file_path) return res.status(502).json({ error: 'DOWNLOAD_FAILED', message: 'Telegram did not return a download path.' });
    const url = tg.fileDownloadUrl(conn.token, info.file_path);
    const headers = {};
    const range = req.headers.range;
    if (range) headers.Range = range;
    let upstream;
    try {
      upstream = await fetch(url, { headers });
    } catch (e) {
      return res.status(502).json({ error: 'NETWORK', message: `Cannot reach Telegram file server: ${e.message}` });
    }
    if (!upstream.ok && upstream.status !== 206) {
      if (upstream.status === 404) {
        dbmod.db.prepare('UPDATE files SET status = ? WHERE id = ?').run('unavailable', f.id);
        return res.status(410).json({ error: 'FILE_UNAVAILABLE', message: 'This file is no longer available in Telegram storage.' });
      }
      return res.status(502).json({ error: 'DOWNLOAD_FAILED', message: `Telegram file server responded ${upstream.status}.` });
    }
    const safeName = f.name.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Type', f.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(f.name)}`);
    res.setHeader('Accept-Ranges', 'bytes');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const cr = upstream.headers.get('content-range');
    if (cr) { res.status(206); res.setHeader('Content-Range', cr); }
    res.setHeader('Cache-Control', 'private, max-age=60');
    const reader = upstream.body.getReader();
    req.on('close', () => { try { reader.cancel(); } catch { /* */ } });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) await new Promise((r) => res.once('drain', r));
    }
    res.end();
  } catch (e) { next(e); }
}

router.get('/files/:id/download', (req, res, next) => streamFromTelegram(req, res, next, 'attachment'));
router.get('/files/:id/preview', (req, res, next) => streamFromTelegram(req, res, next, 'inline'));

// ---------- Search ----------
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return res.json({ items: [], total: 0 });
  const { by, dir } = mw.parseSort(req.query);
  const col = SORT_COL[by] || 'f.updated_at';
  const d = dir === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const typeFilter = String(req.query.type || '').trim(); // e.g. pdf, png
  const params = [req.user.id, like];
  let extra = '';
  if (typeFilter) { extra += ' AND (f.name LIKE ? OR f.mime_type LIKE ?)'; params.push(`%.${typeFilter}`, `%${typeFilter}%`); }
  if (req.query.folder_id) { extra += ' AND f.folder_id = ?'; params.push(Number(req.query.folder_id)); }
  const total = dbmod.db.prepare(
    `SELECT COUNT(*) AS c FROM files f LEFT JOIN trash t ON t.file_id = f.id LEFT JOIN folders fo ON fo.id = f.folder_id WHERE f.user_id = ? AND (f.name LIKE ? OR fo.name LIKE ?) AND t.deleted_at IS NULL${extra}`
  ).get(params[0], like, like, ...params.slice(2)).c;
  const rows = dbmod.db.prepare(
    `SELECT f.*, t.deleted_at AS trashed_at FROM files f LEFT JOIN trash t ON t.file_id = f.id LEFT JOIN folders fo ON fo.id = f.folder_id WHERE f.user_id = ? AND (f.name LIKE ? OR fo.name LIKE ?) AND t.deleted_at IS NULL${extra} ORDER BY ${col} ${d} LIMIT ? OFFSET ?`
  ).all(params[0], like, like, ...params.slice(2), limit, offset);
  res.json({ items: rows.map(mw.publicFile), total, limit, offset });
});

// ---------- Trash ----------
router.get('/trash', (req, res) => {
  const { by, dir } = mw.parseSort(req.query);
  const col = SORT_COL[by] || 'f.updated_at';
  const d = dir === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const total = dbmod.db.prepare('SELECT COUNT(*) AS c FROM trash WHERE user_id = ?').get(req.user.id).c;
  const rows = dbmod.db.prepare(
    `SELECT f.*, t.deleted_at AS trashed_at FROM trash t JOIN files f ON f.id = t.file_id WHERE t.user_id = ? ORDER BY t.deleted_at ${d} LIMIT ? OFFSET ?`
  ).all(req.user.id, limit, offset);
  res.json({ items: rows.map(mw.publicFile), total, limit, offset });
});

router.post('/trash/:id/restore', (req, res, next) => {
  try {
    const f = getFileOwned(req.user.id, req.params.id);
    if (f.folder_id != null) {
      const folder = dbmod.db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(f.folder_id, req.user.id);
      if (!folder) dbmod.db.prepare('UPDATE files SET folder_id = NULL WHERE id = ?').run(f.id);
    }
    dbmod.db.prepare('DELETE FROM trash WHERE file_id = ? AND user_id = ?').run(f.id, req.user.id);
    res.json({ ok: true, file: mw.publicFile(getFileOwned(req.user.id, f.id)) });
  } catch (e) { next(e); }
});

async function permanentDelete(userId, fileId) {
  const f = dbmod.db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(Number(fileId), userId);
  if (!f) {
    const e = new Error('File not found.');
    e.status = 404; e.code = 'FILE_NOT_FOUND';
    throw e;
  }
  // 1) Remove Telegram storage message where appropriate (best effort)
  try {
    const conn = dbmod.db.prepare('SELECT * FROM storage_connections WHERE user_id = ?').get(userId);
    if (conn) {
      const { decryptToken } = require('../crypto');
      try {
        const token = decryptToken(conn.encrypted_bot_token);
        await tg.deleteMessage(token, f.telegram_chat_id, f.telegram_message_id);
      } catch { /* keep going — metadata must not be orphaned */ }
    }
  } catch { /* ignore */ }
  // 2) Remove metadata  3) usage updates automatically (computed)
  dbmod.db.prepare('DELETE FROM trash WHERE file_id = ?').run(f.id);
  dbmod.db.prepare('DELETE FROM files WHERE id = ? AND user_id = ?').run(f.id, userId);
}

router.delete('/trash/:id', async (req, res, next) => {
  try { await permanentDelete(req.user.id, req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

router.post('/trash/empty', async (req, res, next) => {
  try {
    const rows = dbmod.db.prepare('SELECT file_id FROM trash WHERE user_id = ?').all(req.user.id);
    let deleted = 0;
    for (const r of rows) {
      try { await permanentDelete(req.user.id, r.file_id); deleted += 1; }
      catch { /* continue with the rest */ }
    }
    res.json({ ok: true, deleted });
  } catch (e) { next(e); }
});

// ---------- Usage (always computed from real rows) ----------
router.get('/storage/usage', (req, res) => {
  const live = dbmod.db.prepare(
    'SELECT COUNT(*) AS files, COALESCE(SUM(f.size),0) AS bytes FROM files f LEFT JOIN trash t ON t.file_id = f.id WHERE f.user_id = ? AND t.deleted_at IS NULL'
  ).get(req.user.id);
  const folders = dbmod.db.prepare('SELECT COUNT(*) AS c FROM folders WHERE user_id = ?').get(req.user.id).c;
  const trash = dbmod.db.prepare(
    'SELECT COUNT(*) AS files, COALESCE(SUM(f.size),0) AS bytes FROM trash t JOIN files f ON f.id = t.file_id WHERE t.user_id = ?'
  ).get(req.user.id);
  res.json({
    usedBytes: Number(live.bytes) || 0,
    filesCount: Number(live.files) || 0,
    foldersCount: Number(folders) || 0,
    trashCount: Number(trash.files) || 0,
    trashBytes: Number(trash.bytes) || 0,
  });
});

module.exports = router;
