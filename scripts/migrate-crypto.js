'use strict';

/**
 * scripts/migrate-crypto.js — Stored-data migration for ADR U03
 *
 * Migrates Redis records encrypted with the legacy AES-256-CBC/EVP_BytesToKey
 * scheme (crypto.createCipher, removed in Node 22) to the new AES-256-GCM
 * scheme (ADR U07).
 *
 * IMPORTANT: Run this script BEFORE upgrading to Node 22+.
 * It can also run on Node 20/22 because it reimplements EVP_BytesToKey using
 * createDecipheriv instead of the removed createDecipher.
 *
 * Usage:
 *   EG_CONFIG_DIR=lib/config node scripts/migrate-crypto.js [options]
 *
 * Options:
 *   --dry-run    Detect and attempt legacy decrypt but do NOT write back.
 *   --verify     Decrypt all new-scheme records and confirm no errors.
 *   --namespace  Redis key namespace prefix (default: EG)
 *
 * See docs/ops/migration.md for the full run procedure.
 */

const crypto = require('crypto');
const path = require('path');

// ── Bootstrap config ─────────────────────────────────────────────────────────

const configDir = process.env.EG_CONFIG_DIR || path.join(__dirname, '..', 'lib', 'config');
process.env.EG_CONFIG_DIR = configDir;
process.env.EG_DISABLE_CONFIG_WATCH = 'true';

const config = require('../lib/config');
const db = require('../lib/db');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERIFY = args.includes('--verify');
const nsIdx = args.indexOf('--namespace');
const NAMESPACE = nsIdx !== -1 ? args[nsIdx + 1] : (config.systemConfig.db.redis.namespace || 'EG');
const SCRYPT_SALT_DEFAULT = 'eg-scrypt-salt-v1';

// ── Fields that contain encrypted values ─────────────────────────────────────
// These are the Redis hash fields known to store ciphertext.

const ENCRYPTED_FIELDS = ['tokenEncrypted'];

// ── EVP_BytesToKey reimplementation ───────────────────────────────────────────
// Derives AES-256 key (32 bytes) and IV (16 bytes) from a passphrase using
// the same algorithm as OpenSSL EVP_BytesToKey with MD5, no salt, count=1.
// This is what crypto.createCipher('aes256', password) used internally.
// Reimplemented here so it works on Node 22+ without the removed createDecipher.

function evpBytesToKey (password, keyLen, ivLen) {
  const pass = Buffer.isBuffer(password) ? password : Buffer.from(password, 'utf8');
  let derived = Buffer.alloc(0);
  let prev = Buffer.alloc(0);
  while (derived.length < keyLen + ivLen) {
    prev = crypto.createHash('md5').update(Buffer.concat([prev, pass])).digest();
    derived = Buffer.concat([derived, prev]);
  }
  return { key: derived.slice(0, keyLen), iv: derived.slice(keyLen, keyLen + ivLen) };
}

// ── Legacy decrypt (AES-256-CBC via EVP_BytesToKey) ───────────────────────────

function decryptLegacy (hexCiphertext, cipherKey) {
  const { key, iv } = evpBytesToKey(cipherKey, 32, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return decipher.update(hexCiphertext, 'hex', 'utf8') + decipher.final('utf8');
}

// ── New encrypt (AES-256-GCM) ─────────────────────────────────────────────────

function encryptNew (plaintext, cipherKey, scryptSalt) {
  const key = crypto.scryptSync(cipherKey, scryptSalt || SCRYPT_SALT_DEFAULT, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ── New decrypt (AES-256-GCM) ─────────────────────────────────────────────────

function decryptNew (ciphertext, cipherKey, scryptSalt) {
  const key = crypto.scryptSync(cipherKey, scryptSalt || SCRYPT_SALT_DEFAULT, 32);
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8');
}

// ── Format detection ──────────────────────────────────────────────────────────

function isLegacy (value) {
  return typeof value === 'string' && value.length > 0 && !value.includes(':');
}

function isNewScheme (value) {
  return typeof value === 'string' && value.split(':').length === 3;
}

// ── Scan + process ────────────────────────────────────────────────────────────

async function run () {
  const { cipherKey, scryptSalt } = config.systemConfig.crypto;

  let cursor = '0';
  let totalKeys = 0;
  let legacyFound = 0;
  let migrated = 0;
  let alreadyNew = 0;
  let errored = 0;
  const errors = [];

  console.log(`[migrate-crypto] mode=${DRY_RUN ? 'dry-run' : VERIFY ? 'verify' : 'migrate'} namespace=${NAMESPACE}`);
  console.log(`[migrate-crypto] scanning Redis for keys matching ${NAMESPACE}:*`);

  do {
    const [nextCursor, keys] = await db.scan(cursor, 'MATCH', `${NAMESPACE}:*`, 'COUNT', 100);
    cursor = nextCursor;

    for (const key of keys) {
      totalKeys++;
      const type = await db.type(key);
      if (type !== 'hash') continue;

      const hash = await db.hgetall(key);
      if (!hash) continue;

      for (const field of ENCRYPTED_FIELDS) {
        const value = hash[field];
        if (!value) continue;

        if (VERIFY) {
          // Verify mode: confirm new-scheme records decrypt correctly.
          if (!isNewScheme(value)) {
            if (isLegacy(value)) {
              const msg = `VERIFY FAIL: ${key}[${field}] still has legacy ciphertext`;
              console.error(msg);
              errors.push(msg);
              errored++;
            }
            continue;
          }
          try {
            decryptNew(value, cipherKey, scryptSalt);
            alreadyNew++;
          } catch (err) {
            const msg = `VERIFY FAIL: ${key}[${field}] — ${err.message}`;
            console.error(msg);
            errors.push(msg);
            errored++;
          }
          continue;
        }

        if (isLegacy(value)) {
          legacyFound++;
          console.log(`[migrate-crypto] LEGACY: ${key}[${field}]`);

          let plaintext;
          try {
            plaintext = decryptLegacy(value, cipherKey);
          } catch (err) {
            const msg = `CANNOT_DECRYPT: ${key}[${field}] — ${err.message}`;
            console.error(`[migrate-crypto] ${msg}`);
            errors.push(msg);
            errored++;
            continue; // never silently overwrite a record that failed decryption
          }

          if (DRY_RUN) {
            console.log(`[migrate-crypto] DRY-RUN: would migrate ${key}[${field}]`);
            migrated++;
          } else {
            const newCiphertext = encryptNew(plaintext, cipherKey, scryptSalt);
            await db.hset(key, field, newCiphertext);
            console.log(`[migrate-crypto] MIGRATED: ${key}[${field}]`);
            migrated++;
          }
        } else if (isNewScheme(value)) {
          alreadyNew++;
        }
      }
    }
  } while (cursor !== '0');

  console.log('');
  console.log('[migrate-crypto] ─────────────── SUMMARY ───────────────');
  console.log(`[migrate-crypto] Keys scanned:    ${totalKeys}`);
  if (VERIFY) {
    console.log(`[migrate-crypto] Verified OK:     ${alreadyNew}`);
    console.log(`[migrate-crypto] Verify failures: ${errored}`);
  } else {
    console.log(`[migrate-crypto] Legacy found:    ${legacyFound}`);
    console.log(`[migrate-crypto] Already new:     ${alreadyNew}`);
    console.log(`[migrate-crypto] ${DRY_RUN ? 'Would migrate' : 'Migrated'}:   ${migrated}`);
    console.log(`[migrate-crypto] Errors:          ${errored}`);
  }
  if (errors.length > 0) {
    console.log('[migrate-crypto] ────────────── ERROR DETAILS ──────────────');
    errors.forEach(e => console.error(`[migrate-crypto]   ${e}`));
    console.log('[migrate-crypto] DO NOT UPGRADE NODE VERSION until these are resolved.');
    console.log('[migrate-crypto] Restore the Redis snapshot taken in Phase 1 (see docs/ops/migration.md).');
    process.exitCode = 1;
  } else if (DRY_RUN) {
    console.log('[migrate-crypto] Dry run complete. No data written.');
    if (legacyFound === 0) {
      console.log('[migrate-crypto] No legacy records found — safe to upgrade Node version.');
    } else {
      console.log(`[migrate-crypto] ${legacyFound} legacy record(s) found. Run without --dry-run to migrate.`);
    }
  } else if (VERIFY) {
    console.log('[migrate-crypto] Verification passed. All records use new scheme.');
  } else {
    console.log('[migrate-crypto] Migration complete.');
    if (legacyFound === 0) {
      console.log('[migrate-crypto] No legacy records were present — Redis was already clean.');
    }
  }

  await db.quit();
}

run().catch(err => {
  console.error('[migrate-crypto] Fatal error:', err.message);
  process.exitCode = 1;
  db.quit().catch(() => {});
});
