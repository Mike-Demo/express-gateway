# You are a coding agent operating in agent mode. Begin by running `git pull origin modernization-factory` before making any changes.

CONTEXT AND VERIFIED PROBLEM:
`scripts/migrate-crypto.js` scans Redis using the pattern `${NAMESPACE}:*`. However, `lib/services/tokens/token.dao.js` stores token records under `${namespace}-access-token:<id>` (dao line 24) and `${namespace}-refresh-token:<id>` (dao line 29). The current scan pattern matches none of the real token keys. As a result, --dry-run, --verify, and migrate modes all report success while legacy tokens remain entirely unmigrated. This is the Copilot P1 finding on PR #1.

TASK 1 — FIX THE SCAN PATTERN:
Modify `scripts/migrate-crypto.js` to enumerate the DAO's actual token key formats. Replace the single `${NAMESPACE}:*` scan with scans for both `${namespace}-access-token:*` and `${namespace}-refresh-token:*`, matching exactly the patterns used in `lib/services/tokens/token.dao.js` lines 24 and 29. Do not alter the semantics of the three operating modes (--dry-run, --verify, and migrate). Only the key discovery logic changes.

TASK 2 — ADD AN AUTOMATED TEST:
Write an automated test that does all of the following:
- Seeds a legacy-encrypted token record in Redis using the real DAO key format (`${namespace}-access-token:<id>` or `${namespace}-refresh-token:<id>`), not the old scan pattern's assumed format.
- Proves the full migration path in sequence: --dry-run detects the seeded record, migrate converts it, --verify confirms it, and the migrated record decrypts correctly using the current AES-256-GCM implementation.
- The seeded record must match the DAO's key format exactly as defined in `lib/services/tokens/token.dao.js`.

TASK 3 — CORRECT DOCUMENTATION IF APPLICABLE:
Inspect `docs/ops/migration.md`. If it states the old key pattern (`${NAMESPACE}:*` or any equivalent incorrect form) anywhere, correct it to reflect the real DAO key formats (`${namespace}-access-token:*` and `${namespace}-refresh-token:*`). Include this correction in the same commit series as the code fix.

TASK 4 — RUN THE FULL TEST SUITE:
After completing all fixes, run the full test suite, the characterization tests, and the linter. There must be zero regressions. The baseline to hold is: 551 passing / 32 failing, 31/31, 0/0. Report all three figures explicitly.

TASK 5 — COMMIT, PUSH, AND CONFIRM:
Commit all changes with a message that explicitly references the PR #1 P1 fix. Push to origin. Confirm the branch is 0 commits ahead after the push. Do not reply to the PR #1 comment thread — that is a human action. Include the fixing commit hash in your gate report.

GATE REPORT — include all of the following:
- The scan pattern before the fix and the scan pattern after the fix, shown explicitly.
- The new test, its name, and its pass/fail result.
- All three suite figures: full suite (passing/failing), characterization (pass count / total), lint (errors/warnings).
- Complete list of files changed with a brief description of each change.
- All commit hashes in the commit series.
- Bobcoins balance or reward if visible in output.

Follow BOB-PROJECT-RULES.md in full throughout this task.

---

**Status:** active  **Date:** 2026-10-13

---

### 👤 User

You are a coding agent operating in agent mode. Begin by running `git pull origin modernization-factory` before making any changes.

CONTEXT AND VERIFIED PROBLEM:
`scripts/migrate-crypto.js` scans Redis using the pattern `${NAMESPACE}:*`. However, `lib/services/tokens/token.dao.js` stores token records under `${namespace}-access-token:<id>` (dao line 24) and `${namespace}-refresh-token:<id>` (dao line 29). The current scan pattern matches none of the real token keys. As a result, --dry-run, --verify, and migrate modes all report success while legacy tokens remain entirely unmigrated. This is the Copilot P1 finding on PR #1.

TASK 1 — FIX THE SCAN PATTERN:
Modify `scripts/migrate-crypto.js` to enumerate the DAO's actual token key formats. Replace the single `${NAMESPACE}:*` scan with scans for both `${namespace}-access-token:*` and `${namespace}-refresh-token:*`, matching exactly the patterns used in `lib/services/tokens/token.dao.js` lines 24 and 29. Do not alter the semantics of the three operating modes (--dry-run, --verify, and migrate). Only the key discovery logic changes.

TASK 2 — ADD AN AUTOMATED TEST:
Write an automated test that does all of the following:
- Seeds a legacy-encrypted token record in Redis using the real DAO key format (`${namespace}-access-token:<id>` or `${namespace}-refresh-token:<id>`), not the old scan pattern's assumed format.
- Proves the full migration path in sequence: --dry-run detects the seeded record, migrate converts it, --verify confirms it, and the migrated record decrypts correctly using the current AES-256-GCM implementation.
- The seeded record must match the DAO's key format exactly as defined in `lib/services/tokens/token.dao.js`.

TASK 3 — CORRECT DOCUMENTATION IF APPLICABLE:
Inspect `docs/ops/migration.md`. If it states the old key pattern (`${NAMESPACE}:*` or any equivalent incorrect form) anywhere, correct it to reflect the real DAO key formats (`${namespace}-access-token:*` and `${namespace}-refresh-token:*`). Include this correction in the same commit series as the code fix.

TASK 4 — RUN THE FULL TEST SUITE:
After completing all fixes, run the full test suite, the characterization tests, and the linter. There must be zero regressions. The baseline to hold is: 551 passing / 32 failing, 31/31, 0/0. Report all three figures explicitly.

TASK 5 — COMMIT, PUSH, AND CONFIRM:
Commit all changes with a message that explicitly references the PR #1 P1 fix. Push to origin. Confirm the branch is 0 commits ahead after the push. Do not reply to the PR #1 comment thread — that is a human action. Include the fixing commit hash in your gate report.

GATE REPORT — include all of the following:
- The scan pattern before the fix and the scan pattern after the fix, shown explicitly.
- The new test, its name, and its pass/fail result.
- All three suite figures: full suite (passing/failing), characterization (pass count / total), lint (errors/warnings).
- Complete list of files changed with a brief description of each change.
- All commit hashes in the commit series.
- Bobcoins balance or reward if visible in output.

Follow BOB-PROJECT-RULES.md in full throughout this task.

---

### 🤖 Assistant

> 🔧 called: execute_command

I'll start by pulling the latest changes and then investigating the codebase before making any modifications.

> 🔧 **execute_command** — git pull origin modernization-factory

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — [-] Task 1: Investigate codebase and fix scan pattern in scripts/migrate-crypto.js
[ ] Task 2: Add automated test for migration path
[ ] Task 3: Correct documentation in docs/ops/migration.md if needed
[ ] Task 4: Run full test suite, characterization tests, and linter
[ ] Task 5: Commit, push, and confirm


### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — scripts/migrate-crypto.js

> 🔧 **read_file** — lib/services/tokens/token.dao.js

### 🤖 Assistant

> 🔧 called: glob, glob

Now let me look at the existing tests and documentation:

> 🔧 **glob** — test/**/*migrate*

> 🔧 **glob** — docs/ops/migration.md

### 🤖 Assistant

> 🔧 called: glob, glob



> 🔧 **glob** — test/**/*.test.js

> 🔧 **glob** — docs/**/*.md

### 🤖 Assistant

> 🔧 called: list_files, list_files



> 🔧 **list_files** — test

> 🔧 **list_files** — docs

### 🤖 Assistant

> 🔧 called: list_files, list_files



> 🔧 **list_files** — docs/ops

> 🔧 **list_files** — test/policies

### 🤖 Assistant

> 🔧 called: read_file, list_files



> 🔧 **list_files** — test/characterization

> 🔧 **read_file** — docs/ops/migration.md

### 🤖 Assistant

> 🔧 called: list_files, read_file

Now let me look at the test structure and understand the existing test patterns before writing the new test:

> 🔧 **list_files** — test/common

> 🔧 **read_file** — test/policies/basic-auth-policy.test.js

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — lib/config

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — lib/config/system.config.yml

### 🤖 Assistant

> 🔧 called: grep

Now I have a clear picture. Let me understand the full scope:

1. **NAMESPACE** = `EG` (from config)
2. **Token key format** = `EG-access-token:<id>` and `EG-refresh-token:<id>` (using `-` not `:`)
3. **Current scan pattern** = `EG:*` — completely wrong! It should be `EG-access-token:*` and `EG-refresh-token:*`

Let me also check the `docs/ops/migration.md` for the old pattern reference:

> 🔧 **grep** — NAMESPACE|namespace.*\*|:.*\*

### 🤖 Assistant

> 🔧 called: grep

The migration.md doesn't explicitly mention the wrong scan pattern — let me check for any `NAMESPACE:*` references in it:

> 🔧 **grep** — docs/ops/migration.md

### 🤖 Assistant

> 🔧 called: grep

The migration.md doesn't reference the scan pattern, but let me look at the entire file more carefully for any Redis key patterns and also check the broader documentation:

> 🔧 **grep** — NAMESPACE|EG:",  "EG:",  "eg-",  "EG-

### 🤖 Assistant

> 🔧 called: grep



> 🔧 **grep** — docs/ops/migration.md

### 🤖 Assistant

> 🔧 called: list_files

The `docs/ops/migration.md` doesn't contain the wrong pattern `${NAMESPACE}:*` or `EG:*` directly in the documentation text. However, the task says to inspect it and correct it if it states the old key pattern. The doc does say "Redis key namespace prefix" in the script comments. Let me look more carefully at the script's log message which reveals the wrong pattern:

Looking at [`scripts/migrate-crypto.js`](scripts/migrate-crypto.js:121), line 121 says:
```
console.log(`[migrate-crypto] scanning Redis for keys matching ${NAMESPACE}:*`);
```

And line 124 has the actual wrong scan:
```js
const [nextCursor, keys] = await db.scan(cursor, 'MATCH', `${NAMESPACE}:*`, 'COUNT', 100);
```

The docs don't explicitly have the wrong pattern text but let me add a clarifying note about the real key format.

Now let me look at how the test common helpers work and look at an existing services test:

> 🔧 **list_files** — test/services

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — test/services/tokens.test.js

### 🤖 Assistant

> 🔧 called: list_files



> 🔧 **list_files** — scripts

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — scripts/.eslintrc

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — test/.eslintrc

### 🤖 Assistant

> 🔧 called: read_file

Now let me look at the package.json to understand how tests are run:

> 🔧 **read_file** — package.json

### 🤖 Assistant

> 🔧 called: apply_diff

Now I have all the information I need. Let me now:

1. Fix the scan pattern in `scripts/migrate-crypto.js`
2. Write the test
3. Update docs if needed

Let me start with Task 1 — fixing the scan pattern:

> 🔧 **apply_diff** — scripts/migrate-crypto.js

### 🤖 Assistant

> 🔧 called: read_file

Good, the main logic is changed. Let me verify the current state of the file:

> 🔧 **read_file** — scripts/migrate-crypto.js

### 🤖 Assistant

> 🔧 called: apply_diff

The script looks good. The redundant `// ── Scan + process ────` comment is still at line 107 while the section header is now at line 109. Let me clean that up:

> 🔧 **apply_diff** — scripts/migrate-crypto.js

### 🤖 Assistant

> 🔧 called: read_file, read_file

Now let me understand how the migration script's internal functions can be tested. The test needs to be able to run in-process using ioredis-mock, seed a key, then test the full migration flow. Since the migration script runs as a standalone process, the test will need to either:
1. Fork child processes (like e2e tests), or  
2. Extract the functions and call them directly

Let me check how the migration script exports work and look at how I can import its logic:

> 🔧 **read_file** — test/common/gateway.helper.js

> 🔧 **read_file** — test/characterization/smoke.test.js

### 🤖 Assistant

> 🔧 called: read_file

The test needs to run the migration script as a child process, or I need to extract its logic. Since the script currently has side effects at module load time (requires config, requires db), the cleanest approach for the test is to spawn it as a child process similar to how e2e tests work, but with ioredis-mock.

However, the issue with spawning a child process is that each invocation creates its own Redis in-memory mock that is separate from the parent. Instead, I need a different approach.

Let me think about the best approach:
1. The script connects to `lib/db` which uses ioredis-mock by default
2. If I spawn child processes, each will have its own in-memory Redis, so data seeded in one won't be visible to another

The cleanest solution is to extract the crypto helpers and the scanning logic into a module that can be tested in-process, but that changes the structure of the script significantly.

Alternatively, I could use a real Redis for tests. But looking at how other tests work, they use ioredis-mock in-process.

The best approach for this test is to **write the test to use the internally-exportable logic** by refactoring `migrate-crypto.js` to export its testable functions, while keeping the `run()` function as the CLI entry point. This is the minimal change needed and follows existing patterns.

Let me refactor the script to export the key helper functions so they can be tested:

> 🔧 **read_file** — scripts/migrate-crypto.js

### 🤖 Assistant

> 🔧 called: write_file

The current approach for the test: since the script at the bottom calls `run()` immediately on `require()`, and it also calls `db.quit()` at the end, I need to be careful about how to test it. The problem with running child processes for each mode is that they each get a fresh ioredis-mock instance.

The best approach is to **refactor** the script to separate the core migration logic (`migrate`) from the `run()` CLI entry point and export the core functions so tests can use them directly on the same ioredis-mock instance. The run() stays as the CLI entry point guarded by `if (require.main === module)`.

Let me refactor `scripts/migrate-crypto.js` to export the testable core:

> 🔧 **write_file** — scripts/migrate-crypto.js

### 🤖 Assistant

> 🔧 called: update_todo_list

Now let me update the todo list and write the test:

> 🔧 **update_todo_list** — [x] Task 1: Investigate codebase and fix scan pattern in scripts/migrate-crypto.js
[-] Task 2: Add automated test for migration path
[ ] Task 3: Correct documentation in docs/ops/migration.md if needed
[ ] Task 4: Run full test suite, characterization tests, and linter
[ ] Task 5: Commit, push, and confirm


### 🤖 Assistant

> 🔧 called: read_file

Now I need to understand what ioredis-mock provides for the `scan` method, so I can seed data correctly. Let me check:

> 🔧 **read_file** — lib/db.js

### 🤖 Assistant

> 🔧 called: write_file

Since `lib/db.js` is a singleton that's already initialized at require-time, I need to use the same `db` instance in the test. The migration script also uses `require('../lib/db')` — so they'll share the same singleton when both are required within the same test process. The test can:
1. Require `lib/db` to seed data directly
2. Require `scripts/migrate-crypto` to get the exported `migrate` function
3. Call `migrate` with the shared db instance

Let me now write the test:

> 🔧 **write_file** — test/scripts/migrate-crypto.test.js

### 🤖 Assistant

> 🔧 called: execute_command

Now let me run the new test alone first to verify it works:

> 🔧 **execute_command** — cross-env EG_HTTP_PORT=0 EG_CONFIG_DIR=lib/config EG_DISABLE_CONFIG_WATCH=true npx mocha test/scripts/migrate-crypto.test.js --exit --timeout 15000 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — $env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"; npx mocha test/scripts/migrate-crypto.test.js --exit --timeout 15000 2>&1

### 🤖 Assistant

> 🔧 called: write_file

The tests are finding `0` keys even when seeded. This likely means the `before` hooks in the nested `describe` blocks aren't running before the individual `it` tests. The tests show the data isn't being found — the issue is that `beforeEach` in the outer describe flushes Redis, and each `describe` block's `before` only runs once but the `beforeEach` runs before each `it`. So:

1. `before` seeds the data
2. `beforeEach` (outer) flushes it before each `it`

That's the problem — outer `beforeEach` is running AFTER inner `before`. Let me restructure to avoid this issue by using `before` and `after` pairs:

> 🔧 **write_file** — 'use strict';

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

const should = require('should');
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


### 🤖 Assistant

> 🔧 called: execute_command

The key issue with the "full migration path" tests is that they run in **sequence** (`--dry-run` → `migrate` → `--verify` → `decrypt check`). After `--dry-run`, the data is still legacy. After `migrate`, the data is converted. Each subsequent `it()` depends on the state left by the previous one. This is intentional but requires the tests to be ordered and the Redis state to NOT be flushed between them.

However, `ioredis-mock` is a singleton that persists across all test `it()` calls within the same `describe` block (no `beforeEach` flush), so this should work correctly.

But there's a subtle issue: the test file structure means all the `before` hooks are called before the `it()` tests in each describe, but the order between sibling `describe` blocks is also sequential. Let me trace through:

1. **before** (access token): flush, seed legacy
2. **it 1** (dry-run): sees 1 legacy key ✓
3. **it 2** (migrate): migrates it ✓ — now Redis has new-scheme record  
4. **it 3** (verify): the record was already migrated by it 2 ✓
5. **it 4** (decrypt): reads the migrated record ✓
6. **after** (access token): flush

This is correct! The tests depend on each other's state. Let me run them again:

> 🔧 **execute_command** — $env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"; npx mocha test/scripts/migrate-crypto.test.js --exit --timeout 15000 2>&1

### 🤖 Assistant

> 🔧 called: read_file

All 11 tests pass. Now let me check the documentation (Task 3):

> 🔧 **read_file** — docs/ops/migration.md

### 🤖 Assistant

> 🔧 called: apply_diff

The docs don't explicitly mention `${NAMESPACE}:*` as the scan pattern — they reference the `--namespace` CLI option. However, the task says to add information about the real key formats. Let me add a section that documents the Redis key formats being scanned:

> 🔧 **apply_diff** — <<<<<<< SEARCH
:start_line:86
-------
### Step 6 — Run regression gate

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"
node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 2>&1 | Select-String "passing|failing"
node_modules\.bin\mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000 2>&1 | Select-String "passing|failing"
```

Expected: unit+policy passing ≥ 357, failing ≤ 63; characterization 31/0.
=======
### Step 6 — Run regression gate

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"
node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 2>&1 | Select-String "passing|failing"
node_modules\.bin\mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000 2>&1 | Select-String "passing|failing"
```

Expected: unit+policy passing ≥ 357, failing ≤ 63; characterization 31/0.

---

## Redis key formats scanned

The migration script enumerates keys in exactly the two namespaces written by
`lib/services/tokens/token.dao.js`:

| Token type    | Redis key pattern                          |
|---------------|--------------------------------------------|
| Access token  | `${namespace}-access-token:<token-id>`     |
| Refresh token | `${namespace}-refresh-token:<token-id>`    |

Where `${namespace}` defaults to `EG` (the `db.redis.namespace` value in
`system.config.yml`). The script uses a hyphen (`-`) as the separator between
the namespace and the token type, matching the DAO exactly.

> **Note:** An earlier version of the script scanned using the pattern
> `${namespace}:*` (colon separator). That pattern matched none of the real
> token keys and has been corrected to use the patterns listed above.
>>>>>>> REPLACE


### 🤖 Assistant

> 🔧 called: update_todo_list

Now let me update the todo list and run the full test suite:

> 🔧 **update_todo_list** — [x] Task 1: Investigate codebase and fix scan pattern in scripts/migrate-crypto.js
[x] Task 2: Add automated test for migration path
[x] Task 3: Correct documentation in docs/ops/migration.md if needed
[-] Task 4: Run full test suite, characterization tests, and linter
[ ] Task 5: Commit, push, and confirm


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — $env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"; npx mocha "./test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 2>&1 | Select-String "passing|failing"

### 🤖 Assistant

> 🔧 called: execute_command

562 passing, 32 failing. The baseline was 551 passing / 32 failing. The 11 new tests added = 551 + 11 = 562. Failing count is unchanged at 32. Now let me run the characterization tests:

> 🔧 **execute_command** — $env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"; npx mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000 2>&1 | Select-String "passing|failing"

### 🤖 Assistant

> 🔧 called: execute_command

31/31, 0 failing. Now let me run the linter:

> 🔧 **execute_command** — npx eslint . 2>&1

### 🤖 Assistant

> 🔧 called: apply_diff

I need to fix the unused `should` import in the test. The `should` library works by extending prototypes when required, so the import is necessary to enable the assertion methods, but it doesn't need to be assigned. Let me fix this:

> 🔧 **apply_diff** — <<<<<<< SEARCH
:start_line:14
-------
const should = require('should');
=======
require('should');
>>>>>>> REPLACE


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — npx eslint . 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

Linter passes with 0 errors, 0 warnings. Let me run the tests once more to confirm all still pass after the lint fix:

> 🔧 **execute_command** — $env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"; npx mocha test/scripts/migrate-crypto.test.js --exit --timeout 15000 2>&1

### 🤖 Assistant

> 🔧 called: update_todo_list

All 11 tests pass. Now let me commit and push:

> 🔧 **update_todo_list** — [x] Task 1: Investigate codebase and fix scan pattern in scripts/migrate-crypto.js
[x] Task 2: Add automated test for migration path
[x] Task 3: Correct documentation in docs/ops/migration.md if needed
[x] Task 4: Run full test suite, characterization tests, and linter
[-] Task 5: Commit, push, and confirm


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — git add scripts/migrate-crypto.js test/scripts/migrate-crypto.test.js docs/ops/migration.md 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

Those are just line-ending warnings, not errors. The git add succeeded. Let me verify the staged files:

> 🔧 **execute_command** — git status 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — git commit -m "fix(migrate-crypto): fix scan pattern to match DAO token key format (PR #1 P1)

The migration script was scanning Redis using `\${NAMESPACE}:*` (colon separator)
but token.dao.js stores records under `\${namespace}-access-token:<id>` and
`\${namespace}-refresh-token:<id>` (hyphen separator). As a result --dry-run,
--verify, and migrate modes all reported success while leaving legacy tokens
entirely unmigrated.

Changes:
- scripts/migrate-crypto.js: Replace single NAMESPACE:* scan with scans for
  both NAMESPACE-access-token:* and NAMESPACE-refresh-token:*, matching the
  exact patterns used in lib/services/tokens/token.dao.js lines 24 and 29.
  Refactor core migration logic into an exported `migrate()` function for
  testability; add `encryptLegacy()` export for test seeding. CLI behavior
  and all three modes (--dry-run, --verify, migrate) are unchanged.

- test/scripts/migrate-crypto.test.js: New automated test proving the full
  migration path in sequence: --dry-run detects seeded legacy record, migrate
  converts it, --verify confirms it, migrated record decrypts correctly with
  AES-256-GCM. Seeds records using the real DAO key format. Includes regression
  guard confirming old EG:* pattern cannot reach DAO keys.

- docs/ops/migration.md: Add 'Redis key formats scanned' section documenting
  the correct key patterns (\${namespace}-access-token:* and
  \${namespace}-refresh-token:*) and noting the previously broken \${namespace}:*
  pattern.

Fixes: Copilot P1 finding on PR #1 — scan pattern mismatch" 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

Commit `d3b8ca2` created. Now push:

> 🔧 **execute_command** — git push origin modernization-factory 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

Push succeeded (exit code 1 here is just PowerShell's way of reporting stderr). Let me verify the branch is clean:

> 🔧 **execute_command** — git status 2>&1; git log --oneline -3 2>&1

### 🤖 Assistant

> 🔧 called: update_todo_list

Branch is 0 commits ahead, working tree is clean. Let me update the final todo:

> 🔧 **update_todo_list** — [x] Task 1: Investigate codebase and fix scan pattern in scripts/migrate-crypto.js
[x] Task 2: Add automated test for migration path
[x] Task 3: Correct documentation in docs/ops/migration.md if needed
[x] Task 4: Run full test suite, characterization tests, and linter
[x] Task 5: Commit, push, and confirm


### 🤖 Assistant

---

## Gate Report

### Scan pattern — before and after

| | Pattern |
|---|---|
| **Before (broken)** | `${NAMESPACE}:*` (colon separator — matched zero real token keys) |
| **After (fixed)** | `${namespace}-access-token:*` and `${namespace}-refresh-token:*` (hyphen separator — matches DAO exactly) |

### New test

**File:** [`test/scripts/migrate-crypto.test.js`](test/scripts/migrate-crypto.test.js)  
**Suite:** `migrate-crypto — scan pattern and full migration path (PR #1 P1)`

Key tests proving the full migration sequence (seeded under DAO key format):
- **`--dry-run detects the seeded legacy record under the DAO key format`** ✅
- **`migrate converts the legacy record to the new AES-256-GCM scheme`** ✅
- **`--verify confirms the migrated record uses the new scheme (zero errors)`** ✅
- **`migrated record decrypts correctly using the current AES-256-GCM implementation`** ✅
- Plus 7 additional tests (refresh token path, regression guard, already-new path)

**Result: 11 passing / 0 failing**

### Suite figures

| Suite | Result |
|---|---|
| **Full unit suite** | **562 passing / 32 failing** (baseline was 551/32; +11 new tests, 0 new failures) |
| **Characterization** | **31 passing / 0 failing** (31/31 ✅) |
| **Lint** | **0 errors / 0 warnings** ✅ |

### Files changed

| File | Change |
|---|---|
| [`scripts/migrate-crypto.js`](scripts/migrate-crypto.js) | Fixed scan pattern: replaced `${NAMESPACE}:*` with `${namespace}-access-token:*` + `${namespace}-refresh-token:*`. Refactored core logic into exported `migrate()` + `encryptLegacy()` for testability. CLI behavior (all three modes) unchanged. |
| [`test/scripts/migrate-crypto.test.js`](test/scripts/migrate-crypto.test.js) | **New file.** 11-test suite proving full migration path using the real DAO key format. |
| [`docs/ops/migration.md`](docs/ops/migration.md) | Added "Redis key formats scanned" section documenting the correct patterns and explicitly noting the previously incorrect `${namespace}:*` pattern. |

### Commit hash

```
d3b8ca2  fix(migrate-crypto): fix scan pattern to match DAO token key format (PR #1 P1)
```

Branch `modernization-factory` is **0 commits ahead** of `origin/modernization-factory` after push.