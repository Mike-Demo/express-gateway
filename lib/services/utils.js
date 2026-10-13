'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const config = require('../config');

const SCRYPT_SALT_DEFAULT = 'eg-scrypt-salt-v1';

function appendCreatedAt (obj) {
  Object.assign(obj, {
    createdAt: (new Date()).toString()
  });
}

function appendUpdatedAt (obj) {
  Object.assign(obj, {
    updatedAt: (new Date()).toString()
  });
}

/**
 * Encrypt text using AES-256-GCM with a random 12-byte IV and scrypt key
 * derivation. Output format: <iv_hex (24)>:<authTag_hex (32)>:<ciphertext_hex>
 *
 * Replaces the deprecated crypto.createCipher (removed in Node 22). See ADR U07.
 */
function encrypt (text) {
  const { cipherKey, scryptSalt } = config.systemConfig.crypto;
  const key = crypto.scryptSync(cipherKey, scryptSalt || SCRYPT_SALT_DEFAULT, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt AES-256-GCM ciphertext produced by encrypt(). Expects the format
 * <iv_hex>:<authTag_hex>:<ciphertext_hex> (colon-separated). Throws
 * LegacyEncryptionError if given legacy (no-colon) ciphertext — callers must
 * run scripts/migrate-crypto.js before the system goes live on Node 22+.
 *
 * Replaces the deprecated crypto.createDecipher (removed in Node 22). See ADR U07.
 */
function decrypt (ciphertext) {
  if (!ciphertext || !ciphertext.includes(':')) {
    const err = new Error('LegacyEncryptionError: ciphertext was encrypted with createCipher; run scripts/migrate-crypto.js before upgrading to Node 22+');
    err.code = 'LEGACY_ENCRYPTION';
    throw err;
  }
  const { cipherKey, scryptSalt } = config.systemConfig.crypto;
  const key = crypto.scryptSync(cipherKey, scryptSalt || SCRYPT_SALT_DEFAULT, 32);
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8');
}

function compareSaltAndHashed (password, hash) {
  return (!password || !hash) ? null : bcrypt.compare(password, hash);
}

function saltAndHash (password) {
  if (!password || typeof password !== 'string') {
    return Promise.reject(new Error('invalid arguments'));
  }

  return bcrypt
    .genSalt(config.systemConfig.crypto.saltRounds)
    .then((salt) => bcrypt.hash(password, salt));
}

module.exports = {
  appendCreatedAt,
  appendUpdatedAt,
  encrypt,
  decrypt,
  compareSaltAndHashed,
  saltAndHash
};
