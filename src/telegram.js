'use strict';

/**
 * telegram.js — server-side Telegram Bot API client.
 * NEVER called from the browser. Bot tokens stay on the server.
 * Respects rate limits: retry with backoff on 429/5xx + network errors.
 */
const fs = require('fs');
const path = require('path');

function apiBase() {
  return (require('./config').telegramApiBase || 'https://api.telegram.org').replace(/\/+$/, '');
}

class TelegramError extends Error {
  constructor(message, code, extra) {
    super(message);
    this.name = 'TelegramError';
    this.code = code || 'TELEGRAM_ERROR';
    this.retryAfter = extra && extra.retryAfter;
    this.httpStatus = extra && extra.httpStatus;
  }
}

function mapTelegramError(description, httpStatus) {
  const d = String(description || '');
  if (/unauthorized|invalid token|not found.*bot/i.test(d) || httpStatus === 401) {
    return { code: 'INVALID_TOKEN', message: 'Invalid bot token. Check the token from @BotFather.' };
  }
  if (/bot was blocked|bot is blocked|disabled/i.test(d)) {
    return { code: 'BOT_DISABLED', message: 'Bot is blocked or disabled. Start a chat with the bot and try again.' };
  }
  if (/chat not found/i.test(d)) {
    return { code: 'CHAT_NOT_FOUND', message: 'Storage chat not found. Send /start to the bot first, then retry detection.' };
  }
  if (/not enough rights|not an administrator|need administrator/i.test(d)) {
    return { code: 'NO_WRITE_ACCESS', message: 'Bot has no write access to that chat. Add it as admin (channels/groups) or send /start (private chat).' };
  }
  if (/file is too big|request entity too large|too large/i.test(d)) {
    return { code: 'FILE_TOO_LARGE', message: 'File exceeds the Telegram Bot API size limit (50 MB for bots).' };
  }
  if (/wrong file identifier|file can't be downloaded|file is deleted|bad request: file/i.test(d)) {
    return { code: 'FILE_UNAVAILABLE', message: 'This file is no longer available in Telegram storage.' };
  }
  if (/message to delete not found|message can't be deleted/i.test(d)) {
    return { code: 'MESSAGE_GONE', message: 'Telegram storage message is already gone.' };
  }
  if (/too many requests|flood/i.test(d)) {
    return { code: 'RATE_LIMITED', message: 'Telegram rate limit hit. Please wait and retry.' };
  }
  return { code: 'TELEGRAM_ERROR', message: d || 'Telegram API error.' };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Generic Bot API call (JSON). Retries 429/5xx/network with backoff.
 * Returns the `result` field or throws TelegramError.
 */
async function apiCall(token, method, params = {}, opts = {}) {
  const maxRetries = opts.maxRetries != null ? opts.maxRetries : 3;
  let attempt = 0;
  for (;;) {
    let res;
    try {
      res = await fetch(`${apiBase()}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
        signal: opts.signal,
      });
    } catch (e) {
      if (attempt >= maxRetries) throw new TelegramError(`Cannot reach Telegram API: ${e.message}`, 'NETWORK');
      await sleep(Math.min(1000 * 2 ** attempt, 8000));
      attempt += 1;
      continue;
    }
    if (res.status === 429) {
      let retryAfter = 2;
      try {
        const j = await res.json();
        retryAfter = (j.parameters && j.parameters.retry_after) || 2;
      } catch { /* ignore */ }
      if (attempt >= maxRetries) throw new TelegramError('Telegram rate limit hit. Please wait and retry.', 'RATE_LIMITED', { retryAfter });
      await sleep(Math.min(retryAfter * 1000, 15000));
      attempt += 1;
      continue;
    }
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok || !body || body.ok !== true) {
      const desc = (body && body.description) || `HTTP ${res.status}`;
      // Retry transient 5xx
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        attempt += 1;
        continue;
      }
      const mapped = mapTelegramError(desc, res.status);
      const err = new TelegramError(mapped.message, mapped.code, { httpStatus: res.status });
      if (body && body.parameters && body.parameters.retry_after) err.retryAfter = body.parameters.retry_after;
      throw err;
    }
    return body.result;
  }
}

async function getMe(token) {
  return apiCall(token, 'getMe');
}

async function getChat(token, chatId) {
  return apiCall(token, 'getChat', { chat_id: chatId });
}

async function sendChatAction(token, chatId, action = 'upload_document') {
  return apiCall(token, 'sendChatAction', { chat_id: chatId, action });
}

async function getUpdates(token, opts = {}) {
  return apiCall(token, 'getUpdates', {
    limit: 100,
    allowed_updates: ['message', 'channel_post', 'my_chat_member'],
    ...(opts.offset ? { offset: opts.offset } : {}),
    ...(opts.timeout ? { timeout: opts.timeout } : {}),
  });
}

/**
 * Detect candidate storage chats from recent bot updates.
 * NOTE: Telegram only returns *pending* updates. The user must send
 * /start (or any message) to the bot shortly before detection.
 */
async function detectStorageChats(token) {
  const updates = await getUpdates(token);
  const seen = new Map();
  for (const u of updates || []) {
    const msg = u.message || u.channel_post;
    const member = u.my_chat_member;
    if (msg && msg.chat) {
      const c = msg.chat;
      if (!seen.has(String(c.id))) {
        seen.set(String(c.id), {
          chat_id: String(c.id),
          type: c.type,
          title: c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || String(c.id),
          username: c.username || null,
        });
      }
    } else if (member && member.chat) {
      const c = member.chat;
      if (!seen.has(String(c.id))) {
        seen.set(String(c.id), {
          chat_id: String(c.id),
          type: c.type,
          title: c.title || c.username || String(c.id),
          username: c.username || null,
        });
      }
    }
  }
  return [...seen.values()];
}

async function getFile(token, fileId) {
  return apiCall(token, 'getFile', { file_id: fileId });
}

function fileDownloadUrl(token, filePath) {
  return `${apiBase()}/file/bot${token}/${filePath}`;
}

async function deleteMessage(token, chatId, messageId) {
  try {
    return await apiCall(token, 'deleteMessage', { chat_id: chatId, message_id: messageId });
  } catch (e) {
    if (e && (e.code === 'MESSAGE_GONE')) return true; // already gone = fine
    throw e;
  }
}

/**
 * Stream a local file to Telegram as a document (disk -> Telegram,
 * no full-file RAM buffering). Returns the sent message object.
 */
function sendDocument(token, chatId, localPath, filename, caption) {
  return new Promise((resolve, reject) => {
    let FormData;
    try {
      FormData = require('form-data');
    } catch (e) {
      return reject(new Error('Missing dependency "form-data". Run npm install.'));
    }
    let fileSize = 0;
    try { fileSize = fs.statSync(localPath).size; } catch (e) { return reject(e); }
    const url = new URL(`${apiBase()}/bot${token}/sendDocument`);
    // Build a FRESH form + file stream on every attempt: a consumed
    // stream cannot be re-sent, so retrying with the same form would hang.
    const submit = (attempt) => {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      form.append('document', fs.createReadStream(localPath), {
        filename: filename || path.basename(localPath),
        knownLength: fileSize,
      });
      if (caption) form.append('caption', String(caption).slice(0, 1024));
      form.append('disable_notification', 'true');
      form.submit(
        { host: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname + url.search, protocol: url.protocol },
        (err, res) => {
          if (err) {
            if (attempt < 2) return setTimeout(() => submit(attempt + 1), 1000 * (attempt + 1));
            return reject(new TelegramError(`Cannot reach Telegram API: ${err.message}`, 'NETWORK'));
          }
          let raw = '';
          res.on('data', (d) => { raw += d; });
          res.on('end', () => {
            let body = null;
            try { body = JSON.parse(raw); } catch { body = null; }
            if (res.statusCode === 429) {
              let wait = 2;
              try { wait = (body.parameters || {}).retry_after || 2; } catch { /* */ }
              if (attempt < 3) return setTimeout(() => submit(attempt + 1), Math.min(wait * 1000, 15000));
              return reject(new TelegramError('Telegram rate limit hit. Please wait and retry.', 'RATE_LIMITED', { retryAfter: wait }));
            }
            if (res.statusCode >= 500 && attempt < 3) {
              return setTimeout(() => submit(attempt + 1), 1000 * 2 ** attempt);
            }
            if (!body || body.ok !== true) {
              const mapped = mapTelegramError((body && body.description) || `HTTP ${res.statusCode}`, res.statusCode);
              return reject(new TelegramError(mapped.message, mapped.code, { httpStatus: res.statusCode }));
            }
            resolve(body.result);
          });
          res.on('error', (e) => {
            if (attempt < 2) return setTimeout(() => submit(attempt + 1), 1000 * (attempt + 1));
            reject(new TelegramError(`Telegram upload failed: ${e.message}`, 'UPLOAD_FAILED'));
          });
        }
      );
    };
    submit(0);
  });
}

/** Extract the usable file_id/message_id from a sendDocument message. */
function extractFileRef(message) {
  if (!message) throw new TelegramError('Empty Telegram response', 'UPLOAD_FAILED');
  const doc = message.document;
  if (doc && doc.file_id) {
    return {
      message_id: message.message_id,
      file_id: doc.file_id,
      file_unique_id: doc.file_unique_id || null,
    };
  }
  // Fallbacks for edge cases (e.g. sent as other media)
  const media = message.video || message.audio || message.photo;
  if (Array.isArray(media)) {
    const best = media[media.length - 1];
    if (best && best.file_id) {
      return { message_id: message.message_id, file_id: best.file_id, file_unique_id: best.file_unique_id || null };
    }
  } else if (media && media.file_id) {
    return { message_id: message.message_id, file_id: media.file_id, file_unique_id: media.file_unique_id || null };
  }
  throw new TelegramError('Telegram did not return a file reference', 'UPLOAD_FAILED');
}

/**
 * Real connection test: getMe + getChat + sendChatAction (proves the
 * bot exists AND can write to the storage chat without spamming).
 */
async function testConnection(token, chatId) {
  const me = await getMe(token);
  if (!chatId) {
    return { ok: true, bot: { username: me.username, name: me.first_name }, chat: null, note: 'Bot token valid. Configure a storage chat next.' };
  }
  const chat = await getChat(token, chatId);
  await sendChatAction(token, chatId, 'upload_document');
  return {
    ok: true,
    bot: { username: me.username, name: me.first_name },
    chat: { id: chat.id, type: chat.type, title: chat.title || chat.username || String(chat.id) },
  };
}

function isValidTokenFormat(token) {
  return typeof token === 'string' && /^\d{5,}:[\w-]{30,}$/.test(token.trim());
}

module.exports = {
  TelegramError,
  apiCall,
  getMe,
  getChat,
  getUpdates,
  detectStorageChats,
  sendDocument,
  extractFileRef,
  getFile,
  fileDownloadUrl,
  deleteMessage,
  sendChatAction,
  testConnection,
  isValidTokenFormat,
};
