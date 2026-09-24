'use strict';

const express = require('express');
const dbmod = require('../db');
const mw = require('../middleware');

const router = express.Router();
router.use(mw.requireAuth);

const LANGS = new Set(['en', 'ar']);
const THEMES = new Set(['light', 'dark', 'system']);
const VIEWS = new Set(['grid', 'list']);
const TRASH_BEHAVIOR = new Set(['trash', 'permanent']);

router.get('/settings', (req, res) => {
  let s = dbmod.db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.user.id);
  if (!s) {
    dbmod.db.prepare('INSERT OR IGNORE INTO settings (user_id) VALUES (?)').run(req.user.id);
    s = dbmod.db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.user.id);
  }
  res.json({ settings: s });
});

router.put('/settings', (req, res) => {
  const b = req.body || {};
  const cur = dbmod.db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.user.id)
    || { language: 'en', theme: 'system', view: 'grid', default_folder_id: null, trash_behavior: 'trash', sort_by: 'updated_at', sort_dir: 'desc' };
  const next = {
    language: LANGS.has(b.language) ? b.language : cur.language,
    theme: THEMES.has(b.theme) ? b.theme : cur.theme,
    view: VIEWS.has(b.view) ? b.view : cur.view,
    default_folder_id: b.default_folder_id === undefined ? cur.default_folder_id
      : (b.default_folder_id == null || b.default_folder_id === '' ? null : Number(b.default_folder_id)),
    trash_behavior: TRASH_BEHAVIOR.has(b.trash_behavior) ? b.trash_behavior : cur.trash_behavior,
    sort_by: ['name', 'size', 'created_at', 'updated_at', 'mime_type'].includes(b.sort_by) ? b.sort_by : cur.sort_by,
    sort_dir: b.sort_dir === 'asc' ? 'asc' : 'desc',
  };
  if (next.default_folder_id != null) {
    const f = dbmod.db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(next.default_folder_id, req.user.id);
    if (!f) return res.status(400).json({ error: 'FOLDER_NOT_FOUND', message: 'Default folder not found.' });
  }
  dbmod.db.prepare(`INSERT INTO settings (user_id, language, theme, view, default_folder_id, trash_behavior, sort_by, sort_dir)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET language=excluded.language, theme=excluded.theme, view=excluded.view,
    default_folder_id=excluded.default_folder_id, trash_behavior=excluded.trash_behavior, sort_by=excluded.sort_by, sort_dir=excluded.sort_dir`)
    .run(req.user.id, next.language, next.theme, next.view, next.default_folder_id, next.trash_behavior, next.sort_by, next.sort_dir);
  res.json({ settings: dbmod.db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.user.id) });
});

// Account summary (no secrets)
router.get('/account', (req, res) => {
  const conn = dbmod.db.prepare('SELECT bot_username, storage_chat_id, status, last_checked_at, last_error, updated_at FROM storage_connections WHERE user_id = ?').get(req.user.id);
  res.json({
    user: mw.publicUser({ ...req.user }),
    storage: conn ? {
      connected: conn.status === 'connected',
      status: conn.status,
      bot_username: conn.bot_username,
      storage_chat_id: conn.storage_chat_id,
      last_checked_at: conn.last_checked_at,
      last_error: conn.last_error,
    } : { connected: false, status: 'none' },
  });
});

module.exports = router;
