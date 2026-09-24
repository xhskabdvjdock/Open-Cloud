'use strict';

/**
 * crypto.js — token encryption (AES-256-GCM) + helpers.
 * Bot tokens are encrypted at rest and never leave the server.
 */
const crypto = require('crypto');
const fs = require('fs');

function getKey() {
  return require('./config').encryptionKey;
}

/** Encrypt a bot token. Returns "v1.<base64(iv)>.<base64(ct)>.<base64(tag)>". */
function encryptToken(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length < 10) {
    throw new Error('invalid token');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${ct.toString('base64')}.${tag.toString('base64')}`;
}

/** Decrypt a value produced by encryptToken. */
function decryptToken(payload) {
  if (typeof payload !== 'string') throw new Error('invalid payload');
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('unsupported token format');
  const iv = Buffer.from(parts[1], 'base64');
  const ct = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Streaming SHA-256 of a file on disk (no full-file buffering). */
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('data', (d) => h.update(d));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = { encryptToken, decryptToken, sha256File, randomToken, safeEqual };
