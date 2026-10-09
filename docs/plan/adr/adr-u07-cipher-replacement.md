# ADR U07 — Cipher Replacement Strategy

**Status:** Accepted  
**Stage:** G3 (prerequisite for G4)  
**Addresses:** R01 (`docs/discovery/risk-register.md`), R09, U07 (`docs/discovery/unknowns.md`)  
**Touches:** `lib/services/utils.js` (functions `encrypt`, `decrypt`)  
**Must be implemented before:** Any G4 work on the services layer

---

## Context

`lib/services/utils.js` lines 18–28 implement `encrypt()` and `decrypt()` using `crypto.createCipher(algorithm, cipherKey)` and `crypto.createDecipher(algorithm, cipherKey)`. These Node.js APIs were deprecated in Node 10 and **removed in Node 22** (confirmed in `docs/discovery/dependency-inventory.md` — Node.js API Incompatibilities table). Their removal is the direct cause of KD-001 (`docs/baseline/known-defects.md`), which produces 64 of the 127 failing tests on Node 24.

Beyond removal, `createCipher` is also **cryptographically insecure by design** (Risk R09 in `docs/discovery/risk-register.md`): it derives a static IV from the password using OpenSSL's EVP_BytesToKey, meaning every call with the same plaintext and key produces the same ciphertext. This makes the scheme vulnerable to frequency analysis and replay. The algorithm is `aes256` (CBC mode) as configured in `lib/config/system.config.yml` `crypto.algorithm`.

The `encrypt()` function is called from `lib/services/tokens/token.service.js` (token body encryption before Redis storage). The `decrypt()` function is called when tokens are retrieved. `encrypt/decrypt` are also used in `lib/services/credentials/` for credential secrets. The `saltAndHash`/`compareSaltAndHashed` functions in the same file use bcryptjs — these are **not** affected and require no change.

---

## Decision Drivers

1. **Correctness on Node 24:** The replacement must use APIs present in Node 18, 20, 22, and 24.
2. **IV uniqueness:** Each encryption call must produce a unique, unpredictable IV to prevent ciphertext reuse.
3. **Integrity:** The scheme should detect tampering or corruption — unauthenticated CBC (the current scheme) does not.
4. **Minimal footprint:** The change must be confined to `lib/services/utils.js`; callers should require zero changes to their interface.
5. **Key management surface:** The replacement must not introduce new external key management requirements that don't exist in the current configuration model.
6. **Reversibility:** Stored data encrypted under the old scheme cannot be automatically decrypted by the new scheme (see ADR U03). The chosen scheme must make this boundary explicit.

---

## Options Considered

### Option 1 — AES-256-CBC with random IV prepended to ciphertext

Replace `createCipher` with `createCipheriv` using a 16-byte cryptographically random IV (`crypto.randomBytes(16)`). Prepend the IV to the output ciphertext so `decrypt()` can extract it. Continue using the `cipherKey` from `system.config.yml` directly as the AES key (after appropriate length normalisation — AES-256 requires a 32-byte key).

- **Pro:** Minimal change to calling interface; same algorithm family; IV uniqueness guaranteed by CSPRNG.
- **Pro:** No new external dependencies; uses built-in `crypto` module only.
- **Con:** AES-256-CBC with prepended IV provides **confidentiality but not integrity** — the decryption output is not authenticated; a corrupted or tampered ciphertext produces garbage plaintext without an error (padding-oracle risk).
- **Con:** The `cipherKey` from `system.config.yml` is a short passphrase string ("sensitiveKey" default), not a 32-byte key — must be derived or truncated.

### Option 2 — AES-256-GCM with random IV (authenticated encryption)

Replace `createCipher` with `createCipheriv` using AES-256-GCM mode, 12-byte random IV. Output format: `iv (12 bytes hex) + authTag (16 bytes hex) + ciphertext (hex)`. Derive the 32-byte AES key from the passphrase using `crypto.scryptSync(cipherKey, salt, 32)` with a fixed per-deployment salt stored in `system.config.yml`.

- **Pro:** GCM is authenticated encryption — decryption verifies the auth tag and throws on tampering or corruption; reduces padding-oracle risk to zero.
- **Pro:** IV uniqueness guaranteed by CSPRNG.
- **Pro:** Key derivation via scrypt addresses the short-passphrase issue.
- **Con:** Slightly larger output (IV + tag overhead).
- **Con:** Introduces a per-deployment scrypt salt that must be stored in `system.config.yml` alongside `cipherKey`.

### Option 3 — Delegate to a dedicated secrets library (e.g. `keyv` + `@keyv/encrypt`)

Replace the homegrown encrypt/decrypt with a maintained library that handles key management.

- **Pro:** Shifts cryptographic responsibility to a maintained library.
- **Con:** Introduces a new external dependency. Upstream project is abandoned; adding dependencies increases maintenance burden. Risk R10 applies.
- **Con:** Integration would require changes beyond `lib/services/utils.js`.
- **Rejected** on R10 grounds and minimal-footprint requirement.

---

## Decision

**Option 2 — AES-256-GCM with random 12-byte IV and scrypt key derivation** is adopted.

Rationale:
- GCM provides authenticated encryption; decryption of a tampered or migrated-incorrectly record will throw, not silently produce garbage.
- scrypt key derivation eliminates the short-passphrase problem without requiring a new key format.
- The fixed scrypt salt is config-resident (same location as the existing `cipherKey`), requiring no new infrastructure.
- The output format `<iv_hex>:<tag_hex>:<ciphertext_hex>` is self-describing, making the version boundary visible to ADR U03's migration logic.

---

## Implementation Specification

### Output format (new scheme)

```
<iv_hex (24 chars)>:<authTag_hex (32 chars)>:<ciphertext_hex (variable)>
```

Example: `a3f2...8b01:cc4d...f91a:deadbeef...`

Old-scheme ciphertext is **pure hex with no colons** — this distinction is the format sentinel used by ADR U03's lazy-migration logic to detect legacy records.

### Key derivation

```js
const SCRYPT_SALT_DEFAULT = 'eg-scrypt-salt-v1'; // overridable via system.config.yml crypto.scryptSalt
const derivedKey = crypto.scryptSync(cipherKey, scryptSalt, 32);
```

The `scryptSalt` value must be added to `system.config.yml` with a default. It is **not** a secret — scrypt salt is a public, per-deployment value whose purpose is to domain-separate the key derivation, not to add secrecy.

### `encrypt(text)` — new implementation

```js
function encrypt(text) {
  const { algorithm: _alg, cipherKey, scryptSalt } = config.systemConfig.crypto;
  const key = crypto.scryptSync(cipherKey, scryptSalt || SCRYPT_SALT_DEFAULT, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}
```

### `decrypt(ciphertext)` — new implementation

```js
function decrypt(ciphertext) {
  const { cipherKey, scryptSalt } = config.systemConfig.crypto;
  const key = crypto.scryptSync(cipherKey, scryptSalt || SCRYPT_SALT_DEFAULT, 32);
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8');
}
```

If `ciphertext` does not contain colons (old-scheme format), `decrypt()` must detect this and either:
- Throw a `LegacyEncryptionError` (triggering the migration path in ADR U03), OR
- Route to the old `createDecipher` path if running on a compatible Node version (not available on Node 22+).

**Decision:** On Node 22+, old-scheme ciphertext passed to `decrypt()` must throw `LegacyEncryptionError`. The migration path in ADR U03 handles this case before the record reaches `decrypt()`.

### ESLint

Remove `crypto.createCipher` and `crypto.createDecipher` from `.eslintrc` `node/no-deprecated-api.ignoreModuleItems` (noted in `docs/discovery/dependency-inventory.md`). This will make any future re-introduction of the old API a lint error.

### Configuration addition to `system.config.yml`

```yaml
crypto:
  cipherKey: sensitiveKey
  algorithm: aes256          # retained for compatibility; not used by new encrypt/decrypt
  scryptSalt: ${EG_CRYPTO_SCRYPT_SALT:-eg-scrypt-salt-v1}
  saltRounds: 10
```

---

## Consequences

**Positive:**
- KD-001 resolved: all 64 failing tests (direct + cascade) will pass after G4.
- R09 resolved: static IV vulnerability eliminated.
- Authenticated encryption detects data corruption before it reaches callers.

**Negative:**
- **Breaking change to stored data format.** Any ciphertext encrypted with the old scheme cannot be decrypted by the new `decrypt()`. This is a known, accepted consequence — see ADR U03 for the migration strategy.
- `scryptSync` adds ~100 ms latency per encrypt/decrypt call. This is acceptable for token operations (called once per token lifecycle, not per request). If performance is a concern in future, the derived key can be cached keyed on `(cipherKey, scryptSalt)`.
- The `.eslintrc` change will cause lint errors if any remaining code uses `createCipher` — this is intentional.

---

## Acceptance Criteria for G4

1. `lib/services/utils.js` contains no calls to `crypto.createCipher` or `crypto.createDecipher`.
2. `encrypt(text)` output matches pattern `<24-char hex>:<32-char hex>:<variable hex>`.
3. `decrypt(encrypt(text)) === text` for any UTF-8 string `text`.
4. `decrypt()` on a tampered ciphertext throws an error (GCM auth tag mismatch).
5. `decrypt()` on a legacy (no-colon) ciphertext throws `LegacyEncryptionError` on Node 22+.
6. Characterization test C8a and C8b updated from "must throw" to "must succeed".
7. Unit+policy test suite passes: failing count ≤ 63 (KD-001 cluster resolved; non-KD-001 defects remain).
8. `.eslintrc` no longer suppresses `crypto.createCipher`/`createDecipher`.
