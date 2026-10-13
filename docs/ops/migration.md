# Crypto Migration Operations Guide

**Addresses:** ADR U03 — Stored-Data Migration Strategy  
**Required before:** Upgrading the gateway to Node 22 LTS or later  
**Target runtime:** Node 22 LTS (active LTS; support through April 2027)

---

## Overview

Express Gateway 1.16.10 previously encrypted token bodies using `crypto.createCipher`
(AES-256-CBC, OpenSSL EVP_BytesToKey derivation). This API was removed in Node 22.

G4/A1 replaces it with AES-256-GCM + scrypt key derivation. Any records that were written
by the old scheme cannot be decrypted by the new code — they must be migrated first.

`decrypt()` now throws `LegacyEncryptionError` (code `LEGACY_ENCRYPTION`) if it receives
a no-colon ciphertext. This is a hard signal that migration is incomplete.

---

## When to run this migration

Run the migration script **on your current Node version** before upgrading to Node 22+.

The migration script reimplements the legacy EVP_BytesToKey derivation using `createDecipheriv`
and will therefore also work on Node 20 and Node 22.

---

## Step-by-step procedure

### Step 1 — Take a Redis snapshot

```sh
redis-cli BGSAVE
# or save to a specific path:
redis-cli --rdb /backup/pre-migration-$(date +%Y%m%d-%H%M%S).rdb
```

This is the rollback artefact. **Do not proceed without a snapshot.**

### Step 2 — Dry run (verify scope)

```sh
EG_CONFIG_DIR=lib/config node scripts/migrate-crypto.js --dry-run
```

Review the output:
- `Legacy found: 0` — Redis is already clean; proceed to Node upgrade directly.
- `Legacy found: N` — N records need migration; proceed to Step 3.
- Any `CANNOT_DECRYPT` entries — stop and investigate (key mismatch or corrupted record).

### Step 3 — Migrate

```sh
EG_CONFIG_DIR=lib/config node scripts/migrate-crypto.js
```

Expected output: each migrated key logged, summary shows `Errors: 0`.

If `Errors: N > 0` — see the Rollback procedure below. **Do not upgrade Node** until errors are zero.

### Step 4 — Verify

```sh
EG_CONFIG_DIR=lib/config node scripts/migrate-crypto.js --verify
```

Expected output: `Verification passed. All records use new scheme.`

### Step 5 — Upgrade Node to 22 LTS

After Step 4 passes with zero errors:

```sh
# Using nvm (example):
nvm install 22
nvm use 22
node --version   # should print v22.x.x

# Or update your Dockerfile:
# FROM node:22-alpine
```

### Step 6 — Run regression gate

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"
node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 2>&1 | Select-String "passing|failing"
node_modules\.bin\mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000 2>&1 | Select-String "passing|failing"
```

Expected: unit+policy passing ≥ 357, failing ≤ 63; characterization 31/0.

---

## Rollback procedure

If migration errors occur or post-upgrade tests regress:

1. Stop the gateway: `pm2 stop eg` (or your process manager equivalent).
2. Restore the snapshot: `redis-cli --rdb /backup/pre-migration-<timestamp>.rdb`
3. Review the error log from Step 3 for `CANNOT_DECRYPT` entries.
4. Fix the issue (typically: wrong `EG_CONFIG_DIR` pointing to wrong `cipherKey`).
5. Repeat from Step 2.

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `EG_CONFIG_DIR` | Directory containing `system.config.yml` with `crypto.cipherKey` | `lib/config` |
| `EG_CRYPTO_SCRYPT_SALT` | Override the scrypt salt for key derivation | `eg-scrypt-salt-v1` |
| `EG_DB_EMULATE` | Use ioredis-mock instead of real Redis | `true` |

Set `EG_DB_EMULATE=false` to run against a real Redis instance:

```sh
EG_CONFIG_DIR=lib/config EG_DB_EMULATE=false node scripts/migrate-crypto.js --dry-run
```

---

## ioredis-mock environments (development / CI)

In development, `EG_DB_EMULATE=true` (the default). ioredis-mock is in-memory and flushed
between process restarts, so there are no persisted legacy records to migrate. The migration
script will report `Legacy found: 0` and exit cleanly.

The migration script is primarily relevant for environments with persistent Redis (staging,
production, or long-running local instances).

---

## Records that cannot be decrypted

If a record fails legacy decryption, the script logs `CANNOT_DECRYPT` and continues. It
**never silently deletes or overwrites** such a record.

- **Tokens:** have TTLs (2 hours for access tokens). If the token is still valid and
  undecryptable, it is effectively unusable — the consumer must re-authenticate.
- **Credentials:** do not expire. Log the `consumerId` and `credentialType`, revoke the
  credential, and reissue it.

To list affected records after a run:

```sh
EG_CONFIG_DIR=lib/config node scripts/migrate-crypto.js --dry-run 2>&1 | grep CANNOT_DECRYPT
```
