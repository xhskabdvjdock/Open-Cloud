'use strict';

/**
 * db.js — SQLite (node:sqlite, built-in) storage layer.
 * Stores ONLY metadata + encrypted credentials. Never file contents.
 * PostgreSQL migration schema lives in database/schema.postgres.sql.
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

let db = null;

function now() {
  return new Date().toISOString();
}

function open(customPath) {
  if (db) return db;
  let file = customPath || config.databasePath;
  if (!file) {
    throw new Error('DATABASE_URL points to PostgreSQL: see database/schema.postgres.sql for migration. SQLite build requires DATABASE_PATH.');
  }
  // Serverless (Vercel /var/task is read-only): fall back to /tmp on any mkdir failure.
  try {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  } catch (e) {
    const fallback = '/tmp/opencloud.db';
    if (path.resolve(file) !== fallback) {
      console.warn(`[open-cloud] DB dir not writable (${e.code || e.message}), falling back to ${fallback}`);
      file = fallback;
      try { config.databasePath = fallback; } catch { /* */ }
      fs.mkdirSync(path.dirname(fallback), { recursive: true });
    } else {
      throw e;
    }
  }
  db = new DatabaseSync(path.resolve(file));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate();
  return db;
}

function migrate() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
}

function close() {
  if (db) { db.close(); db = null; }
}

// For tests: open an isolated DB file.
function openTest(file) {
  close();
  return open(file);
}

module.exports = { open, openTest, close, now, get db() { return db; } };
