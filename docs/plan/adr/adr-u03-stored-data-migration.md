# ADR U03 — Stored-Data Migration Strategy

**Status:** Accepted  
**Stage:** G3 (prerequisite for G4)  
**Addresses:** U03 (`docs/discovery/unknowns.md`), R09 (`docs/discovery/risk-register.md`), R01  
**Depends on:** ADR U07 (cipher replacement strategy — defines legacy format sentinel)  
**Touches:** `lib/services/tokens/token.service.js`, `lib/services/credentials/credential.service.js`, `lib/services/utils.js`  
**Must be implemented before:** G4 deployment to any environment with live Redis data

---

## Context

The functions `encrypt()` and `decrypt()` in `lib/services/utils.js` are called in two places:

1. **Token storage** — `lib/services/tokens/token.service.js:createInternalToken()` calls `utils.encrypt()` to encrypt the token body before writing to Redis. `token.service.js:formExternalToken()` calls `utils.decrypt()` to recover the token body on read.
2. **Credential secrets** — `lib/services/credentials/credential.service.js` calls `utils.encrypt()` when storing credential secrets (e.g. OAuth2 client secrets).

All data encrypted under the old `createCipher` scheme produces ciphertext with **no colons** — pure hex. ADR U07 defines the new scheme output format as `<iv_hex>:<tag_hex>:<ciphertext_hex>`, which always contains colons. This format difference is the migration sentinel.

As established in U03 (`docs/discovery/unknowns.md`): if any records encrypted under the old scheme exist in Redis at migration time, they **cannot be decrypted under the new scheme** using the same key. The old `crypto.createDecipher` API is not available on Node 22+, so there is no fallback path on the target platform.

Per assumption A02 (`docs/discovery/unknowns.md`): the codebase is assumed not to be actively deployed in production. This assumption reduces migration urgency but does not remove the requirement to have a correct migration plan.

---

## Decision Drivers

1. **Data safety:** No valid token or credential record may be silently lost or corrupted during migration.
2. **Correctness:** After migration, `decrypt()` must succeed on all migrated records.
3. **Rollback:** If migration fails, the system must be recoverable to its pre-migration state.
4. **Detectability:** Records that cannot be migrated must be identified and reported, not silently discarded.
5. **Minimal operational complexity:** The migration must not require a maintenance window or dual-running systems, given assumption A02 (development/test environment).

---

## Migration Execution Model Options

### Option A — Lazy migration on read (dual-read with format detection)

On each call to `decrypt(ciphertext)`: inspect the input. If it contains no colons → legacy format → attempt old-scheme decryption (or throw `LegacyEncryptionError` on Node 22+); if it contains colons → new scheme. Re-encrypt with the new scheme and write back to Redis on successful read.

- **Pro:** Zero-downtime; no separate migration job; records migrate naturally as they are accessed.
- **Con:** On Node 22+, there is **no available path to decrypt legacy ciphertext** — `createDecipher` is removed. Lazy migration requires the old decryption to work, which it does not on the target platform.
- **Con:** Records that are never accessed are never migrated — a "dark migration" problem.
- **Rejected** for Node 22+ target: the old decryption path is unavailable.

### Option B — Eager batch migration before upgrade

Before upgrading to Node 22+, run a migration script on the old Node version (10/12/14) that:
1. Reads all encrypted records from Redis.
2. Decrypts each using `createDecipher` (still available on old Node).
3. Re-encrypts each using the new AES-256-GCM scheme.
4. Writes the new ciphertext back to Redis.
5. Verifies each record by decrypting under the new scheme and comparing plaintext.

After the migration is verified, upgrade Node.

- **Pro:** All records migrated before cutover; no legacy-decrypt path needed on new Node.
- **Pro:** Explicit verification step catches failures before they affect production.
- **Con:** Requires running on an old Node version. Given assumption A02, this is feasible.
- **Con:** Requires a Redis snapshot (backup) before the migration run as the rollback mechanism.

### Option C — Dual-write with versioned key (no migration of existing records)

Mark all new records with the new scheme. Let old records expire naturally (tokens have TTLs; credentials can be revoked and reissued). No migration of existing data.

- **Pro:** Zero migration risk.
- **Con:** During the transition period, `decrypt()` must handle both formats. On Node 22+, the old format cannot be decrypted.
- **Con:** Credentials have no TTL — they would be permanently inaccessible if not manually migrated.
- **Rejected** for credentials: the natural-expiry approach does not work for indefinitely-lived records.

---

## Decision

**Option B — Eager batch migration before Node upgrade** is the primary path. However, given assumption A02 (no production deployment), the practical implementation uses a **development-time migration script** that operates as follows:

### Phase 1 — Pre-migration snapshot

Before running the migration script, the operator must take a Redis snapshot (or `BGSAVE` a dump file). This is the rollback artefact.

```
redis-cli BGSAVE
# or: redis-cli --rdb /backup/pre-migration-$(date +%Y%m%d).rdb
```

### Phase 2 — Migration script (`scripts/migrate-crypto.js`)

The script must be run on **Node 14 or below** (where `createDecipher` is available):

```
EG_CONFIG_DIR=lib/config node scripts/migrate-crypto.js [--dry-run] [--namespace EG]
```

Algorithm:
1. Connect to Redis using the same `ioredis` configuration from `system.config.yml`.
2. Scan all keys matching the `EG:*` namespace.
3. For each key: read the stored hash fields that contain encrypted values (token body, credential secrets).
4. Detect format: if value contains no colons → legacy; if contains colons → already migrated (skip).
5. For legacy records: `decrypt_legacy(value)` → plaintext → `encrypt_new(plaintext)` → write back.
6. Log: each migrated key, any failures (cannot decrypt), and a final summary count.
7. `--dry-run` mode: perform detection and decryption but do not write back; emit what would change.

### Phase 3 — Verification

After the migration script completes:
1. Run `scripts/migrate-crypto.js --verify` (decrypt all new-scheme records; confirm no errors).
2. Run `npm run test:unit` on **Node 22+ with the new `decrypt()` implementation**. Expect failing count ≤ 63 (KD-001 resolved).

### Phase 4 — Rollback procedure

If verification fails or the migration script reports errors:
1. Stop the gateway process.
2. Restore the Redis snapshot taken in Phase 1 (`redis-cli --rdb /backup/pre-migration-*.rdb`).
3. Investigate the failure log from Phase 2.
4. Fix the migration script or the cipher implementation.
5. Repeat from Phase 1.

---

## Handling Records That Cannot Be Decrypted

Records that fail old-scheme decryption (corrupted, or encrypted with a different key) fall into two categories:

1. **Tokens:** Tokens have TTLs (`accessTokens.timeToExpiry: 7200000`, `refreshTokens.timeToExpiry: 7200000` in `system.config.yml`). A token that cannot be decrypted is effectively already expired-and-unreachable. The migration script must log its key and mark it for deletion after operator review.

2. **Credentials:** Credentials (OAuth2 client secrets, API keys) do not expire. A credential secret that cannot be decrypted means the credential cannot be used. The migration script must log the `consumerId` and `credentialType` of affected records and output a report. The operator must decide whether to revoke and reissue these credentials.

**Under no circumstances** should the migration script silently delete or overwrite a record that failed decryption — it must stop and report.

---

## Format Sentinel Logic in `decrypt()` (post-migration)

After G4, `decrypt()` receives only new-scheme ciphertext (all old records migrated or expired). However, to be defensive:

```js
function decrypt(ciphertext) {
  if (!ciphertext.includes(':')) {
    // Legacy format — cannot decrypt on Node 22+
    const err = new Error('LegacyEncryptionError: ciphertext was encrypted with createCipher; run migration script');
    err.code = 'LEGACY_ENCRYPTION';
    throw err;
  }
  // ... new-scheme GCM decryption (see ADR U07)
}
```

Callers that catch `LegacyEncryptionError` must not silently continue — they must surface the error so the operator knows migration is incomplete.

---

## Acceptance Criteria for G4

1. `scripts/migrate-crypto.js` exists and accepts `--dry-run` and `--verify` flags.
2. Running `--dry-run` against a Redis instance populated with legacy-encrypted records produces a report showing count of legacy records, zero writes.
3. Running without `--dry-run` migrates all legacy records; `--verify` reports zero errors.
4. After migration, `npm run test:unit` on Node 24 fails with count ≤ 63 (KD-001 resolved; non-KD-001 defects remain unchanged per regression checklist).
5. `decrypt()` throws `LegacyEncryptionError` (code `LEGACY_ENCRYPTION`) when given a no-colon ciphertext.
6. Migration script is documented in `README.md` or `docs/ops/migration.md` with exact run order.
7. Operator sign-off confirms Redis snapshot was taken before migration run (or: test environment only, ioredis-mock flushed between runs).

---

## Assumptions and Open Items

- **A02 applies:** No live production data exists. If A02 is ever invalidated, the migration must be re-evaluated with a maintenance-window procedure.
- **U04 (real Redis testing):** The migration script must be validated against a real Redis instance, not only `ioredis-mock`. See U04 in `docs/discovery/unknowns.md`.
- **Token TTLs:** The two-hour and 120-hour token TTLs mean that in a development context with ioredis-mock, there are no persisted legacy records between test runs. The migration script is primarily relevant for environments with persistent Redis.
