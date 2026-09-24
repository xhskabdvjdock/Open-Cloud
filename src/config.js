'use strict';

require('dotenv').config();
const crypto = require('crypto');
const path = require('path');

function parseBytes(v, fallback) {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return fallback;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

let encryptionKey = null;
function loadEncryptionKey() {
  const raw = (process.env.ENCRYPTION_KEY || '').trim();
  if (!raw) {
    if (IS_PROD && !process.env.VERCEL && !process.env.VERCEL_ENV) throw new Error('ENCRYPTION_KEY is required in production');
    // Dev fallback: derive a stable-but-insecure key so the app runs.
    // A warning is printed at startup.
    return { key: crypto.createHash('sha256').update('open-cloud-dev-key').digest(), ephemeral: true };
  }
  // 64 hex chars -> 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return { key: Buffer.from(raw, 'hex'), ephemeral: false };
  // 44-char base64 -> 32 bytes
  try {
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return { key: b, ephemeral: false };
  } catch { /* fall through */ }
  // Otherwise treat as passphrase and hash it (documented behaviour).
  return { key: crypto.createHash('sha256').update(raw).digest(), ephemeral: false };
}

const enc = loadEncryptionKey();

const IS_VERCEL = !!(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

const config = {
  env: NODE_ENV,
  isProd: IS_PROD,
  port: Number(process.env.PORT || 3000),
  databasePath: process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')
    ? null
    : (process.env.DATABASE_PATH || (IS_VERCEL ? '/tmp/opencloud.db' : './data/opencloud.db')),
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || (IS_PROD && !IS_VERCEL ? null : 'dev-session-secret-not-for-production'),
  encryptionKey: enc.key,
  encryptionKeyEphemeral: enc.ephemeral,
  telegramApiBase: (process.env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/+$/, ''),
  loginBotToken: (process.env.TELEGRAM_LOGIN_BOT_TOKEN || '').trim(),
  loginBotName: (process.env.TELEGRAM_LOGIN_BOT_NAME || '').trim(),
  maxUploadBytes: parseBytes(process.env.MAX_UPLOAD_BYTES, 50 * 1024 * 1024),
  devLocalLogin: (!IS_PROD) && (process.env.DEV_ALLOW_LOCAL_LOGIN === 'true' || process.env.DEV_ALLOW_LOCAL_LOGIN === '1'),
  sessionDays: 30,
  tmpDir: IS_VERCEL ? '/tmp/opencloud-tmp' : path.join(__dirname, '..', 'tmp'),
  dataDir: IS_VERCEL ? '/tmp' : path.join(__dirname, '..', 'data'),
  isVercel: IS_VERCEL,
};

if (IS_PROD && !config.sessionSecret && !config.isVercel) {
  throw new Error('SESSION_SECRET is required in production');
}

module.exports = config;
