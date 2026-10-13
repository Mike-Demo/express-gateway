'use strict';

/**
 * test/scripts/migrate-crypto.test.js
 *
 * Automated tests for scripts/migrate-crypto.js — PR #1 P1 fix.
 *
 * Verifies that the migration script correctly discovers and migrates token
 * records stored under the real DAO key format:
 *   ${namespace}-access-token:<id>   (token.dao.js line 24)
 *   ${namespace}-refresh-token:<id>  (token.dao.js line 29)
 */

require('should');
const db = require('../../lib/db');
const config = require('../../lib/config');
const {
  migrate,
  encryptLegacy,
  encryptNew,
  decryptNew,
  tokenKeyPatterns,
  isNewScheme
} = require('../../scripts/migrate-crypto');

const CIPHER_KEY = config.systemConfig.crypto.cipherKey;
const SCRYPT_SALT = config.systemConfig.crypto.scryptSalt;
const NAMESPACE = config.systemConfig.db.redis.namespace || 'EG';

// ── helpers ───────────────────────────────────────────────────────────────────

function accessTokenKey (id) {
  return `${NAMESPACE}-access-token:${id}`;
}

function refreshTokenKey (id) {
  return `${NAMESPACE}-refresh-token:${id}`;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('migrate-crypto — scan pattern and full migration path (PR #1 P1)', function () {
  this.timeout(15000);

  // ── unit: key pattern helpers ──────────────────────────────────────────────

  describe('tokenKeyPatterns()', function () {
    it('returns both access-token and refresh-token glob patterns for the given namespace', function () {
      const patterns = tokenKeyPatterns('EG');
      patterns.should.be.an.Array().and.have.length(2);
      patterns.should.containEql('EG-access-token:*');
      patterns.should.containEql('EG-refresh-token:*');
    });

    it('uses the correct separator (hyphen, not colon) between namespace and token type', function () {
      const [p1, p2] = tokenKeyPatterns('EG');
      p1.should.startWith('EG-');
      p2.should.startWith('EG-');
      // The old (broken) pattern used a colon: "EG:*"
      p1.should.not.startWith('EG:');
      p2.should.not.startWith('EG:');
    });
  });

  // ── PR #1 P1: full migration sequence on a seeded access token ─────────────
  //
  // Each step is an independent describe block with its own before/after so
  // the Redis state is fully controlled and the outer scope does not interfere.

  describe('full migration path (access token, DAO key format)', function () {
    const tokenId = 'test-token-id-001';
    const plainSecret = 'super-secret-token-value';
    const tokenKey = accessTokenKey(tokenId);

    before(function () {
      return db.flushdb().then(function () {
        const legacyCiphertext = encryptLegacy(plainSecret, CIPHER_KEY);
        return db.hmset(tokenKey, { tokenEncrypted: legacyCiphertext, id: tokenId });
      });
    });

    after(function () { return db.flushdb(); });

    it('--dry-run detects the seeded legacy record under the DAO key format', function () {
      return migrate({
        redisClient: db,
        cipherKey: CIPHER_KEY,
        scryptSalt: SCRYPT_SALT,
        namespace: NAMESPACE,
        dryRun: true
      }).then(function (result) {
        result.totalKeys.should.equal(1);
        result.legacyFound.should.equal(1);
        result.migrated.should.equal(1); // dry-run counts "would migrate" as migrated
        result.errored.should.equal(0);
        result.errors.should.be.empty();
      });
    });

    it('migrate converts the legacy record to the new AES-256-GCM scheme', function () {
      return migrate({
        redisClient: db,
        cipherKey: CIPHER_KEY,
        scryptSalt: SCRYPT_SALT,
        namespace: NAMESPACE,
        dryRun: false
      }).then(function (result) {
        result.legacyFound.should.equal(1);
        result.migrated.should.equal(1);
        result.errored.should.equal(0);
        result.errors.should.be.empty();
      });
    });

    it('--verify confirms the migrated record uses the new scheme (zero errors)', function () {
      // The record was already migrated by the previous it().
      return migrate({
        redisClient: db,
        cipherKey: CIPHER_KEY,
        scryptSalt: SCRYPT_SALT,
        namespace: NAMESPACE,
        verify: true
      }).then(function (result) {
        result.alreadyNew.should.equal(1);
        result.errored.should.equal(0);
        result.errors.should.be.empty();
      });
    });

    it('migrated record decrypts correctly using the current AES-256-GCM implementation', function () {
      // Read the ciphertext that was written by the migrate step and decrypt it.
      return db.hget(tokenKey, 'tokenEncrypted').then(function (storedCiphertext) {
        isNewScheme(storedCiphertext).should.be.true();
        const decrypted = decryptNew(storedCiphertext, CIPHER_KEY, SCRYPT_SALT);
        decrypted.should.equal(plainSecret);
      });
    });
  });

  // ── refresh token key format ───────────────────────────────────────────────

  describe('full migration path (refresh token, DAO key format)', function () {
    const tokenId = 'test-refresh-id-002';
    const plainSecret = 'refresh-secret-token-value';
    const tokenKey = refreshTokenKey(tokenId);

    before(function () {
      return db.flushdb().then(function () {
        const legacyCiphertext = encryptLegacy(plainSecret, CIPHER_KEY);
        return db.hmset(tokenKey, { tokenEncrypted: legacyCiphertext, id: tokenId });
      });
    });

    after(function () { return db.flushdb(); });

    it('--dry-run detects the seeded legacy refresh token', function () {
      return migrate({
        redisClient: db,
        cipherKey: CIPHER_KEY,
        scryptSalt: SCRYPT_SALT,
        namespace: NAMESPACE,
        dryRun: true
      }).then(function (result) {
        result.totalKeys.should.equal(1);
        result.legacyFound.should.equal(1);
        result.errored.should.equal(0);
      });
    });

    it('migrated refresh token decrypts correctly with AES-256-GCM', function () {
      return migrate({
        redisClient: db,
        cipherKey: CIPHER_KEY,
        scryptSalt: SCRYPT_SALT,
        namespace: NAMESPACE,
        dryRun: false
      }).then(function () {
        return db.hget(tokenKey, 'tokenEncrypted');
      }).then(function (storedCiphertext) {
        isNewScheme(storedCiphertext).should.be.true();
        const decrypted = decryptNew(storedCiphertext, CIPHER_KEY, SCRYPT_SALT);
        decrypted.should.equal(plainSecret);
      });
    });
  });

  // ── regression: old pattern EG:* must NOT match DAO keys ─────────────────

  describe('regression guard — old scan pattern EG:* is blind to DAO keys', function () {
    after(function () { return db.flushdb(); });

    it('a key under EG:token-id is NOT the same as a key under EG-access-token:token-id', function () {
      const daoKey = accessTokenKey('abc');
      daoKey.should.equal('EG-access-token:abc');
      // The old pattern was `${NAMESPACE}:*` i.e. "EG:*" — a key "EG-access-token:abc"
      // must not start with "EG:" so the old scanner would have missed it.
      daoKey.startsWith('EG:').should.be.false();
    });

    it('a record seeded under EG:stale-key is invisible to the new scan', function () {
      return db.flushdb().then(function () {
        return db.hmset('EG:stale-key-001', { tokenEncrypted: encryptLegacy('secret', CIPHER_KEY) });
      }).then(function () {
        return migrate({
          redisClient: db,
          cipherKey: CIPHER_KEY,
          scryptSalt: SCRYPT_SALT,
          namespace: NAMESPACE,
          dryRun: true
        });
      }).then(function (result) {
        // The old-pattern key must not be found by the fixed scanner
        result.totalKeys.should.equal(0);
        result.legacyFound.should.equal(0);
      });
    });
  });

  // ── already-new records ────────────────────────────────────────────────────

  describe('already-migrated record is counted as alreadyNew', function () {
    before(function () { return db.flushdb(); });
    after(function () { return db.flushdb(); });

    it('does not re-migrate a new-scheme record', function () {
      const tokenKey = accessTokenKey('already-new-001');
      const newCiphertext = encryptNew('plain', CIPHER_KEY, SCRYPT_SALT);
      return db.hmset(tokenKey, { tokenEncrypted: newCiphertext })
        .then(function () {
          return migrate({
            redisClient: db,
            cipherKey: CIPHER_KEY,
            scryptSalt: SCRYPT_SALT,
            namespace: NAMESPACE,
            dryRun: false
          });
        }).then(function (result) {
          result.alreadyNew.should.equal(1);
          result.legacyFound.should.equal(0);
          result.migrated.should.equal(0);
          result.errored.should.equal(0);
        });
    });
  });
});
