'use strict';
/**
 * Open Cloud tests (node:test). Covers:
 * - Telegram Login signature verification
 * - Token encryption round-trip + token never exposed via API
 * - Storage connect validation (mocked Telegram API)
 * - File management: rename/move/delete/restore/search/sort
 * - Authorization: user A cannot touch user B's files
 * - Upload flow with mocked Telegram (no DB entry on failure)
 *
 * Run: npm test
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

// ---- Isolated env BEFORE requiring app modules ----
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-test-'));
const dbFile = path.join(tmpRoot, 'test.db');
process.env.DATABASE_PATH = dbFile;
process.env.SESSION_SECRET = 'test-session-secret-1234567890';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.TELEGRAM_LOGIN_BOT_TOKEN = '123456:TEST-LOGIN-TOKEN-abcdefghijklmnopqrstuvwxyz';
process.env.TELEGRAM_LOGIN_BOT_NAME = 'test_login_bot';
process.env.DEV_ALLOW_LOCAL_LOGIN = 'true';
process.env.NODE_ENV = 'test';

// Mock Telegram Bot API server
let mockState = { mode: 'ok', lastSend: null, messages: new Map(), nextMsgId: 100 };
function mockHandler(req, res) {
  let body = '';
  req.on('data', (d) => { body += d; });
  req.on('end', () => {
    const url = req.url || '';
    res.setHeader('content-type', 'application/json');
    const send = (obj, status = 200) => { res.statusCode = status; res.end(JSON.stringify(obj)); };
    if (url.includes('/getMe')) {
      if (mockState.mode === 'bad-token') return send({ ok: false, error_code: 401, description: 'Unauthorized: bot token is invalid' }, 401);
      return send({ ok: true, result: { id: 999, is_bot: true, first_name: 'StoreBot', username: 'store_test_bot' } });
    }
    if (url.includes('/getChat')) {
      return send({ ok: true, result: { id: -100123, type: 'private', first_name: 'User' } });
    }
    if (url.includes('/sendChatAction')) return send({ ok: true, result: true });
    if (url.includes('/getUpdates')) {
      return send({ ok: true, result: [{ update_id: 1, message: { message_id: 5, chat: { id: 777, type: 'private', first_name: 'User' } } }] });
    }
    if (url.includes('/sendDocument')) {
      // multipart from form-data submit; accept anything in ok mode
      if (mockState.mode === 'upload-fail') return send({ ok: false, error_code: 500, description: 'Internal Server Error' }, 500);
      const mid = mockState.nextMsgId++;
      return send({ ok: true, result: { message_id: mid, document: { file_id: `FILEID-${mid}`, file_unique_id: `UNIQ-${mid}`, file_name: 'f.bin', mime_type: 'application/octet-stream', file_size: 11 } } });
    }
    if (url.includes('/getFile')) {
      const j = JSON.parse(body || '{}');
      if (mockState.mode === 'file-gone') return send({ ok: false, error_code: 400, description: 'Bad Request: wrong file identifier' }, 400);
      return send({ ok: true, result: { file_id: j.file_id, file_path: `docs/${j.file_id}.bin`, file_size: 11 } });
    }
    if (url.includes('/deleteMessage')) return send({ ok: true, result: true });
    return send({ ok: false, error_code: 404, description: 'Not Found' }, 404);
  });
}

let mockServer, mockBase, app, server, port;
function jfetch(p, opts = {}, cookie) {
  const path = p.startsWith('/api/') ? p : '/api' + (p.startsWith('/') ? p : '/' + p);
  return fetch(`http://127.0.0.1:${port}${path}`, {
    redirect: 'manual',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(opts.headers || {}) },
    ...opts,
  });
}
async function loginAs(username) {
  const r = await jfetch('/api/auth/dev', { method: 'POST', body: JSON.stringify({ username }) });
  assert.equal(r.status, 200);
  const setCookie = r.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  const me = await (await jfetch('/api/auth/me', {}, cookie)).json();
  return { cookie, user: me.user };
}

// Debug helper: fetch JSON and log raw body on parse failure
async function jjson(promise, label) {
  const r = await promise;
  const txt = await r.text();
  try { return { status: r.status, body: JSON.parse(txt) }; }
  catch (e) {
    console.log(`[DEBUG ${label}] status=${r.status} body=${txt.slice(0, 300)}`);
    throw e;
  }
}

before(async () => {
  mockServer = http.createServer(mockHandler);
  await new Promise((r) => mockServer.listen(0, '127.0.0.1', r));
  mockBase = `http://127.0.0.1:${mockServer.address().port}`;
  process.env.TELEGRAM_API_BASE = mockBase;
  // tmp dir isolation
  process.env.TMPDIR = tmpRoot;
  const config = require('../src/config');
  config.tmpDir = tmpRoot;
  ({ createApp } = require('../server'));
  app = createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.on('listening', r));
  port = server.address().port;
});
let createApp;
after(async () => {
  await new Promise((r) => (server ? server.close(r) : r()));
  await new Promise((r) => (mockServer ? mockServer.close(r) : r()));
  try { require('../src/db').close(); } catch { /* */ }
  await new Promise((r) => setTimeout(r, 300));
  try { fs.rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch { /* Windows file locks: best effort cleanup */ }
});

describe('auth', () => {
  it('rejects unauthenticated access', async () => {
    const r = await jfetch('/api/files');
    assert.equal(r.status, 401);
  });

  it('verifies real Telegram Login signatures', async () => {
    const auth = require('../src/auth');
    const payload = { id: 424242, first_name: 'Ada', username: 'ada', auth_date: Math.floor(Date.now() / 1000) };
    const checkString = Object.keys(payload).sort().map((k) => `${k}=${payload[k]}`).join('\n');
    const secret = crypto.createHash('sha256').update(process.env.TELEGRAM_LOGIN_BOT_TOKEN).digest();
    payload.hash = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
    const profile = auth.verifyTelegramAuth(payload);
    assert.equal(profile.telegram_user_id, 424242);
    assert.throws(() => auth.verifyTelegramAuth({ ...payload, hash: '0'.repeat(64) }), /mismatch/);
    assert.throws(() => auth.verifyTelegramAuth({ ...payload, auth_date: 1000 }), /expired/);
  });

  it('logout destroys the session', async () => {
    const { cookie } = await loginAs('logoutcase');
    assert.equal((await jfetch('/api/auth/me', {}, cookie)).status, 200);
    await jfetch('/api/auth/logout', { method: 'POST', body: '{}' }, cookie);
    assert.equal((await jfetch('/api/auth/me', {}, cookie)).status, 401);
  });
});

describe('crypto', () => {
  it('encrypts bot tokens and round-trips', async () => {
    const { encryptToken, decryptToken } = require('../src/crypto');
    const enc = encryptToken('123456:ABCDEF-secret-token-value-xyz');
    assert.ok(!enc.includes('ABCDEF'));
    assert.equal(decryptToken(enc), '123456:ABCDEF-secret-token-value-xyz');
  });
});

describe('storage connection', () => {
  it('rejects malformed tokens without calling Telegram', async () => {
    const { cookie } = await loginAs('store1');
    const r = await jfetch('/api/storage/connect', { method: 'POST', body: JSON.stringify({ bot_token: 'nope' }) }, cookie);
    assert.equal(r.status, 400);
  });

  it('rejects invalid tokens reported by Telegram', async () => {
    const { cookie } = await loginAs('store2');
    mockState.mode = 'bad-token';
    const r = await jfetch('/api/storage/connect', { method: 'POST', body: JSON.stringify({ bot_token: '111111:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }) }, cookie);
    assert.equal(r.status, 502);
    mockState.mode = 'ok';
  });

  it('connects, stores encrypted token (never returned), detects chat, tests', async () => {
    const { cookie } = await loginAs('store3');
    const token = '222222:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    const r = await jfetch('/api/storage/connect', { method: 'POST', body: JSON.stringify({ bot_token: token }) }, cookie);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.bot_username, 'store_test_bot');
    assert.ok(!JSON.stringify(body).includes(token.slice(7)), 'token must not leak in response');

    const conn = await (await jfetch('/api/storage/connection', {}, cookie)).json();
    assert.equal(conn.configured, true);
    assert.ok(!('encrypted_bot_token' in conn) && !('bot_token' in conn));

    // DB holds ciphertext only
    const dbmod = require('../src/db');
    const row = dbmod.db.prepare('SELECT encrypted_bot_token FROM storage_connections WHERE user_id = (SELECT id FROM users WHERE username = ?)').get('dev_store3');
    assert.ok(row && !row.encrypted_bot_token.includes(token.slice(7)));

    const det = await (await jfetch('/api/storage/detect', {}, cookie)).json();
    assert.ok(Array.isArray(det.chats) && det.chats.length === 1);

    const chat = await jfetch('/api/storage/chat', { method: 'POST', body: JSON.stringify({ storage_chat_id: '777' }) }, cookie);
    assert.equal(chat.status, 200);

    const test = await jfetch('/api/storage/test', { method: 'POST', body: '{}' }, cookie);
    assert.equal(test.status, 200);
    const conn2 = await (await jfetch('/api/storage/connection', {}, cookie)).json();
    assert.equal(conn2.status, 'connected');
  });
});

describe('file management + authorization', () => {
  let a, b;
  before(async () => {
    a = await loginAs('alice');
    b = await loginAs('bob');
    // alice connects storage
    await jfetch('/api/storage/connect', { method: 'POST', body: JSON.stringify({ bot_token: '333333:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' }) }, a.cookie);
    await jfetch('/api/storage/chat', { method: 'POST', body: JSON.stringify({ storage_chat_id: '777' }) }, a.cookie);
    await jfetch('/api/storage/test', { method: 'POST', body: '{}' }, a.cookie);
  });

  async function uploadViaApi(cookie, folderId, name, content) {
    const FormData = globalThis.FormData;
    const fd = new FormData();
    fd.append('file', new Blob([content]), name);
    if (folderId != null) fd.append('folder_id', String(folderId));
    fd.append('on_conflict', 'error');
    const r = await fetch(`http://127.0.0.1:${port}/api/files/upload`, {
      method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest', Cookie: cookie }, body: fd,
    });
    return r;
  }

  it('uploads through Telegram and stores real identifiers (no local file storage)', async () => {
    const r = await uploadViaApi(a.cookie, null, 'hello.txt', 'hello world');
    assert.equal(r.status, 201);
    const body = await r.json();
    assert.ok(body.file.telegram_message_id === undefined, 'raw telegram ids stay server-side in DB, not required in API');
    assert.equal(body.file.name, 'hello.txt');
    assert.equal(body.file.size, 11);
    assert.ok(body.file.sha256);
    // DB row has real telegram identifiers
    const dbmod = require('../src/db');
    const row = dbmod.db.prepare('SELECT telegram_message_id, telegram_file_id, telegram_chat_id FROM files WHERE id = ?').get(body.file.id);
    assert.ok(row.telegram_message_id >= 100 && row.telegram_file_id.startsWith('FILEID-'));
    assert.equal(row.telegram_chat_id, '777');
  });

  it('does NOT create a DB entry when Telegram upload fails', async () => {
    const dbmod = require('../src/db');
    const beforeCount = dbmod.db.prepare('SELECT COUNT(*) AS c FROM files').get().c;
    mockState.mode = 'upload-fail';
    const r = await uploadViaApi(a.cookie, null, 'fail.bin', 'x'.repeat(10));
    mockState.mode = 'ok';
    assert.equal(r.status, 502);
    const afterCount = dbmod.db.prepare('SELECT COUNT(*) AS c FROM files').get().c;
    assert.equal(afterCount, beforeCount);
  });

  it('rename / move / search / sort / favorite work', async () => {
    const folder = (await jjson(jfetch('/api/folders', { method: 'POST', body: JSON.stringify({ name: 'Docs' }) }, a.cookie), 'mkdir')).body;
    const r = await uploadViaApi(a.cookie, null, 'report.pdf', 'pdf-bytes!');
    const ftext = await r.text();
    let f;
    try { f = JSON.parse(ftext).file; } catch (e) { console.log(`[DEBUG upload] status=${r.status} body=${ftext.slice(0, 300)}`); throw e; }
    const renamed = (await jjson(jfetch(`/files/${f.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'report-final.pdf' }) }, a.cookie), 'rename')).body;
    assert.equal(renamed.file.name, 'report-final.pdf');
    await jfetch(`/files/${f.id}`, { method: 'PATCH', body: JSON.stringify({ folder_id: folder.folder.id }) }, a.cookie);
    const search = (await jjson(jfetch('/search?q=report', {}, a.cookie), 'search')).body;
    assert.ok(search.items.some((x) => x.id === f.id));
    const sorted = (await jjson(jfetch('/files?folder_id=null&sort_by=name&sort_dir=asc', {}, a.cookie), 'sorted')).body;
    assert.ok(sorted.total >= 1);
    await jfetch(`/files/${f.id}`, { method: 'PATCH', body: JSON.stringify({ is_favorite: true }) }, a.cookie);
    const fav = (await jjson(jfetch('/files?folder_id=null&view=favorites', {}, a.cookie), 'fav')).body;
    assert.ok(fav.items.some((x) => x.id === f.id));
  });

  it('trash: move, restore, permanent delete (telegram + metadata)', async () => {
    const r = await uploadViaApi(a.cookie, null, 'todelete.txt', 'bye-bye!');
    const f = (await r.json()).file;
    assert.equal((await jfetch(`/files/${f.id}`, { method: 'DELETE' }, a.cookie)).status, 200);
    const trash = await (await jfetch('/trash', {}, a.cookie)).json();
    assert.ok(trash.items.some((x) => x.id === f.id));
    assert.equal((await jfetch(`/trash/${f.id}/restore`, { method: 'POST', body: '{}' }, a.cookie)).status, 200);
    await jfetch(`/files/${f.id}`, { method: 'DELETE' }, a.cookie);
    assert.equal((await jfetch(`/trash/${f.id}`, { method: 'DELETE' }, a.cookie)).status, 200);
    assert.equal((await jfetch(`/files/${f.id}`, {}, a.cookie)).status, 404);
  });

  it('marks files unavailable when Telegram no longer has them (orphan detection)', async () => {
    const r = await uploadViaApi(a.cookie, null, 'orphan.txt', 'orphan-me!');
    const f = (await r.json()).file;
    mockState.mode = 'file-gone';
    const check = await (await jfetch(`/files/${f.id}/check`, { method: 'POST', body: '{}' }, a.cookie)).json();
    mockState.mode = 'ok';
    assert.equal(check.available, false);
    const meta = await (await jfetch(`/files/${f.id}`, {}, a.cookie)).json();
    assert.equal(meta.file.status, 'unavailable');
  });

  it('user B cannot access user A files (authz)', async () => {
    const r = await uploadViaApi(a.cookie, null, 'secret.txt', 'alice-only!');
    const f = (await r.json()).file;
    assert.equal((await jfetch(`/files/${f.id}`, {}, b.cookie)).status, 404);
    assert.equal((await jfetch(`/files/${f.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'hacked' }) }, b.cookie)).status, 404);
    assert.equal((await jfetch(`/files/${f.id}`, { method: 'DELETE' }, b.cookie)).status, 404);
    const dl = await fetch(`http://127.0.0.1:${port}/api/files/${f.id}/download`, { headers: { Cookie: b.cookie } });
    assert.equal(dl.status, 404);
    await dl.arrayBuffer().catch(() => {});
  });

  it('storage usage reflects real rows', async () => {
    const u = await (await jfetch('/storage/usage', {}, a.cookie)).json();
    assert.ok(u.usedBytes > 0 && u.filesCount > 0);
  });
});
