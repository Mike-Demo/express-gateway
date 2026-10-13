# Known Defects — express-gateway v1.16.10 (Node 24.21.0 Baseline)

These failures existed **before** any modernization work. They are the "not a regression" reference.  
A later stage that introduces a NEW failure not in this list must treat it as a regression.  
A failure in this list that starts **passing** after a fix is progress — do not re-add it.

---

## KD-001 — crypto.createCipher/createDecipher removed in Node 22

**Count:** 22 direct + ~42 cascaded (total ~64 failures trace to this root cause)  
**Root cause:** `lib/services/utils.js:20` calls `crypto.createCipher(algorithm, cipherKey)` and line 25 calls `crypto.createDecipher(...)`. Both were deprecated in Node 10 and **removed in Node 22**. All token save/find operations, OAuth flows, and key-auth+header tests that exercise the services layer fail.

**Error message (direct):**
```
TypeError: crypto.createCipher is not a function
```

**Error message (cascade):**
```
expected TypeError { message: 'crypto.createCipher is not a function' } to not exist
Cannot read properties of undefined (reading 'refresh_token')
Cannot read properties of undefined (reading 'split')
Cannot read properties of undefined (reading 'id')
expected TypeError { message: 'Cannot read properties of null (reading 'should')' } to not exist
```

**Affected test suites:**
- `test/services/tokens.test.js` — Access Token tests (save, find, get, archive, by-consumer): tests 100–127
- `test/services/tokens.test.js` — Refresh Token tests: tests 113–127
- `test/services/tokens.test.js` — Auth tests Token Auth: test 96
- `test/oauth/` — Authorization Code Tests: tests 97–99
- `test/policies/oauth/` — Authorization Code, Implicit, Client Credentials, Client Password grants: tests 41–53, 60
- `test/policies/modifier/` — key-auth+headers cascade: tests 58–59

**Fix target:** G4 — replace with `crypto.createCipheriv` using explicit IV + `crypto.createDecipheriv`. Requires data migration plan (see U03, U07 in `docs/discovery/unknowns.md`).

**ESLint suppression to remove:** `.eslintrc` `node/no-deprecated-api.ignoreModuleItems` suppresses this warning — remove `crypto.createCipher` and `crypto.createDecipher` entries during fix.

---

## KD-002 — CLI tests: config-singleton isolation causes rest() to return undefined

**Count:** 31 failures (in full-suite run only; 0 failures when CLI tests run in isolation)

**⚠ DIAGNOSIS CORRECTION (Phase E, commit E0):** The original G2 diagnosis ("Cannot find module 'yeoman-test/lib/adapter'") was incorrect. `yeoman-test@1.9.1` ships `lib/adapter` and it has always been importable. The real failure mode is a config-singleton isolation bug.

**Root cause:** CLI tests call `adminHelper.start()` with no config argument. `admin-helper.js` passes `config: undefined` to `rest()`, which falls back to `require('../../lib/config')` — the module-level singleton. When the full test suite runs, test files that precede the CLI tests (REST API tests) call `config.loadGatewayConfig()` on temp YAML files that contain no `admin:` section. The singleton retains this state. When `rest()` checks `cfg.admin` it finds it missing and returns `undefined` instead of a Promise, causing `adminHelper.start()` to throw `TypeError: Cannot read properties of undefined (reading 'then')`.

**Error message (full-suite only):**
```
TypeError: Cannot read properties of undefined (reading 'then')
  at Object.start (test/common/admin-helper.js:6:30)
```

**Isolation behaviour:** Running `test/cli/**/*.test.js` alone → **98 passing, 0 failing**.

**Affected test suites:** All `test/cli/**/*.test.js` — apps, credential-scopes, credentials, scopes, tokens, users commands (31 "before all" hook failures in full-suite run).

**Fix target:** Phase E (E0b) — modify `adminHelper.start()` to supply an explicit default config when none is provided, breaking the dependency on the singleton.

**Status:** Open as of E0 commit. Will be resolved in E0b.

---

## KD-003 — REST API admin tests return 404 ✅ RESOLVED (Phase E, commit E0)

**Count (original):** 28 failures across all `test/rest-api/` files (25 in the five `.test.js` files + 3 in `users.js`, `applications.js`, `credentials.js`).

**Root cause (confirmed):** On Node 24, `localhost` resolves to `::1` (IPv6 loopback). `lib/rest/index.js` defaulted the admin bind host to `'localhost'`, so the server bound on `::1`. `admin-helper.js` then constructed the client base URL as `` `http://${srvInfo.address}:${srvInfo.port}` `` which produced `http://::1:PORT` — an invalid URL (bare IPv6 address without brackets). Node 24's `url.parse()` emitted a deprecation warning and misrouted the request path, resulting in 404 on every request.

**Fix applied (commit E0):**
- `lib/rest/index.js` line 17: default host changed from `'localhost'` to `'127.0.0.1'`.
- `test/common/admin-helper.js`: URL construction now bracket-wraps IPv6 addresses: `srvInfo.family === 'IPv6' ? \`[\${srvInfo.address}]\` : srvInfo.address`.

**Outcome:** 22 of 28 failures resolved. 6 remain (4 pipeline PUT/DELETE 422s, 2 schema errors) — these were masked by the 404 and are separate pre-existing issues being tracked below.

**Affected test suites:** All `test/rest-api/` files.

**Post-E0 baseline:** 453 passing / 63 failing (full `npm run test:unit`).

---

## KD-004 — SNI/TLS: OpenSSL rejects small RSA keys

**Count:** 4 failures (tests 37–40)  
**Root cause:** Test fixtures in `test/fixtures/certs/` use RSA keys that fall below the minimum size enforced by OpenSSL 3.x (bundled with Node 22+). OpenSSL returns `error:0A00018F:SSL routines::ee key too small`.

**Error message:**
```
error:0A00018F:SSL routines::ee key too small
```

**Affected test suite:** `test/config-https-sni.test.js`

**Fix target:** G3 — regenerate test certificates with ≥2048-bit RSA keys.

---

## KD-005 — Plugin installer: spawn EINVAL on Windows

**Count:** 1 failure (test 55)  
**Root cause:** `lib/plugin-installer.js` uses `spawn` with a command that fails on Windows with `EINVAL`. Likely a shell-command spawn that works on Linux/macOS (POSIX) but not Windows PowerShell/cmd.

**Error message:**
```
spawn EINVAL
```

**Affected test suite:** `test/plugins/` — `PluginInstaller#runNPMInstallation`

**Fix target:** Platform-specific — may be Windows-only defect pre-existing before modernization.

---

## KD-006 — jsonSchema condition: remote schema 404

**Count:** 2 failures (tests 33–34)  
**Root cause:** `test/conditions.test.js` jsonSchema tests fetch a remote JSON Schema via HTTP. The target URL returns 404 — either the schema host is down or the URL has changed since the test was written.

**Error message:**
```
expected [Promise] to be fulfilled, but it was rejected with Error { status: 404 }
```

**Affected test suite:** `test/conditions.test.js`

**Fix target:** G3 — replace remote schema with a local fixture or mock HTTP.

---

## KD-007 — Config hostname tests: network interface not available

**Count:** 2 failures (tests 35–36)  
**Root cause:** `test/config-http-hostname.test.js` tests bind to a specific IPv6 link-local interface (`fe80::`) which doesn't exist on this test host. One test expects an ECONNREFUSED message but gets an empty string; another gets `getaddrinfo ENOTFOUND fe80`.

**Error message:**
```
expected '' to contain 'ECONNREFUSED'
getaddrinfo ENOTFOUND fe80
```

**Affected test suite:** `test/config-http-hostname.test.js`

**Fix target:** Environment-specific. Tests should be skipped when the interface is not available, or use `127.0.0.1` instead.

---

## KD-008 — Proxy options tests: backend unreachable (502)

**Count:** 6 failures (tests 62–70)  
**Root cause:** `test/policies/proxy/` tests for `proxyOptions`, `requestStream`, and `stripPath` expect the proxy to forward successfully to a backend, but the backend isn't reachable in the test setup (proxy returns 502 instead of 200). These tests either rely on a specific backend server that isn't started, or the `http-proxy` version behaves differently against the test's backend mock.

**Error message:**
```
expected 200 "OK", got 502 "Bad Gateway"
```

**Affected test suite:** `test/policies/proxy/*.test.js` — proxyOptions, requestStream, stripPath suites.

**Fix target:** G3 — investigate backend server setup in proxy tests; may need `serverHelper.generateBackendServer` calls in `before` hooks.

---

## KD-009 — Modifier policy: headers assertion mismatch

**Count:** 2 failures (tests 56–57)  
**Root cause:** `test/policies/modifier/` — the response header assertion checks for an exact set of headers, but the actual response includes extra or different headers. Possibly an Express version difference affecting `x-powered-by` or similar headers.

**Error message:**
```
expected Object { 'x-powered-by': 'Express', 'r-test': 'baffino', 'x-test': 'hello', ... } to ...
```

**Affected test suite:** `test/policies/modifier/` — headers and responses modification.

**Fix target:** G3 — update assertions to be less brittle (subset check instead of exact match).

---

## KD-010 — Proxy bad-gateway error code: 500 vs 502

**Count:** 1 failure (test 61)  
**Root cause:** `test/policies/proxy/` — test expects `502 Bad Gateway` for incorrect proxy options but gets `500 Internal Server Error`. A change in error handling or exception propagation between proxy policy version and Express version causes the status code difference.

**Error message:**
```
expected 502 "Bad Gateway", got 500 "Internal Server Error"
```

**Fix target:** G3 — align proxy error handler to always return 502 for proxy errors.

---

## KD-011 — Authorization code grant: token exchange 400

**Count:** 2 failures (tests 43, 53)  
**Root cause:** Cascades from KD-001 (crypto failure during token creation). The token exchange step receives a bad request because no valid token was created.

**Error message:**
```
expected 200 "OK", got 400 "Bad Request"
```

**Directly traceable to:** KD-001. Will auto-fix when KD-001 is resolved.

---

## KD-003a — REST API pipeline create/update and schema failures (6 failures, surfaced post-E0)

**Count:** 6 failures (surfaced after KD-003 URL fix; were previously masked by 404)

**Root cause:** `lib/config/config.js` `updateGatewayConfig()` (line 134–155) validates pipeline policy steps by looking up each policy in `require('../policies').policies`. When only the admin REST server is started (without a full gateway), `policies.load()` is never called and the `policies` map is empty. Any pipeline PUT that references a policy (e.g., `proxy`) finds `policyDefinition` as `undefined`, causing `TypeError: Cannot read properties of undefined (reading 'schema')` which is caught, assigned `code: 'INVALID_CONFIG'`, and returned to the client as 422 Unprocessable Entity.

The schema route (`test/rest-api/schemas.test.js`) also reads from the same empty `policies` map and fails when iterating over schemas.

**Error messages:**
```
Error: Unprocessable Entity   (422 — pipeline PUT)
TypeError: Cannot read properties of undefined (reading 'schema')   (GET /schemas)
TypeError: Cannot read properties of undefined (reading '$id')      (GET /schemas/:name)
```

**Affected tests:**
- `test/rest-api/pipelines.test.js` — `should create a new pipeline` (×2), `should update existing pipeline`, `should delete existing pipeline`
- `test/rest-api/schemas.test.js` — `should list all policy schemas`, `should find basic-auth policy`

**Fix target:** Phase E (E0c) — either load policies before admin routes serve, or restructure the pipeline validation to handle the no-policies case gracefully.

**Status:** Open as of E0 commit. Will be addressed in E0c.

---

## Summary Table

| ID | Count | Severity | Target Stage | Auto-resolves with | Status |
|---|---|---|---|---|---|
| KD-001 | 64 | 🔴 Critical | G4 | — (primary fix) | ✅ Resolved (Phase A) |
| KD-002 | 31 | 🟡 Medium | Phase E E0b | — | Open (config isolation) |
| KD-003 | 28 | 🟡 Medium | Phase E E0 | — | ✅ Resolved 22/28 (E0) |
| KD-003a | 6 | 🟡 Medium | Phase E E0c | KD-003 | Open (policies not loaded) |
| KD-004 | 4 | 🟡 Medium | G3 | — | Open |
| KD-005 | 1 | 🟡 Low | G3 | — | Open |
| KD-006 | 2 | 🟡 Low | G3 | — | Open |
| KD-007 | 2 | 🟡 Low | G3 | — | Open |
| KD-008 | 6 | 🟡 Medium | G3 | — | Open |
| KD-009 | 2 | 🟡 Low | G3 | — | Open |
| KD-010 | 1 | 🟡 Low | G3 | — | Open |
| KD-011 | 2 | 🔴 Critical | G4 | KD-001 | ✅ Resolved (Phase A) |
| **Post-E0 open** | **55** | | | | 63 failing / 453 passing |
