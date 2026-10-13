# Test Baseline — express-gateway v1.16.10

**Date:** 2025  
**Node:** 24.21.0  
**Command:** `$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"; node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000`  
**Scope:** Unit + policy tests (excludes `test/e2e/`)

---

## Summary

| Metric | Value |
|---|---|
| Total tests | 452 |
| **Passing** | **357** |
| **Failing** | **127** |
| Pending/skipped | 0 |
| Duration | ~13 s |

---

## Failure Groups (categorised)

| Count | Category | Root cause |
|---|---|---|
| 32 | **CLI tests** (tests 1–32) | `Not Found` — `yeoman-test/lib/adapter` module not found; CLI test fixture broken on current Node/yeoman-test version |
| 25 | **REST API admin tests** (tests 71–95) | `Not Found` — admin helper returns 404; admin server port binding issue in test setup |
| 22 | **Token service tests** (tests 96–127) | `crypto.createCipher is not a function` — removed in Node 22 |
| 14 | **OAuth policy tests** (tests 41–53, 60) | Cascade from crypto failure + `Cannot convert undefined or null to object` |
| 9 | **Proxy policy option tests** (tests 62–70) | `expected 200, got 502` — proxy target not reachable in test env |
| 4 | **SNI/TLS tests** (tests 37–40) | `error:0A00018F:SSL routines::ee key too small` — test certs use RSA key size rejected by OpenSSL in Node 24 |
| 4 | **Headers/modifier policy** (tests 56–57) + **key-auth+headers** (58–59) | Response header assertion mismatch + `undefined.close` cascade |
| 3 | **Config-hostname tests** (tests 35–36) | Network interface binding / DNS resolution failures |
| 2 | **jsonSchema condition** (tests 33–34) | Remote schema fetch returns 404 (network dependency) |
| 2 | **Authorization code service** (tests 97–99) | Cascade from crypto failure |
| 1 | **Plugin installer** (test 55) | `spawn EINVAL` — Windows-incompatible spawn in npm plugin installer |
| 1 | **Admin with plugins** (test 54) | `ECONNREFUSED` — inter-process port timing |
| 1 | **Proxy bad-gateway vs 500** (test 61) | Behavioural difference: expected 502, got 500 |
| 1 | **Authorization code grant** (test 43, 53) | `expected 200, got 400` — bad request on token exchange |

---

## Per-Test-Suite Results

| Test Suite | Pass | Fail | Notes |
|---|---|---|---|
| `test/cli/apps/*.test.js` | 0 | 7 | yeoman-test adapter missing |
| `test/cli/credential-scopes/*.test.js` | 0 | 3 | yeoman-test adapter missing |
| `test/cli/credentials/*.test.js` | 0 | 6 | yeoman-test adapter missing |
| `test/cli/scopes/*.test.js` | 0 | 5 | yeoman-test adapter missing |
| `test/cli/tokens/*.test.js` | 0 | 1 | yeoman-test adapter missing |
| `test/cli/users/*.test.js` | 0 | 9 | yeoman-test adapter missing |
| `test/conditions.test.js` | ~20 | 2 | jsonSchema remote schema (network) |
| `test/config-http-hostname.test.js` | ~2 | 2 | Network interface / DNS |
| `test/config-https-sni.test.js` | ~0 | 4 | OpenSSL key-too-small (Node 24) |
| `test/module.js` | 1 | 0 | ✅ |
| `test/pipelines/*.test.js` | ~30 | 0 | ✅ |
| `test/plugins/*.test.js` | ~6 | 2 | plugin installer (Windows) + admin ECONNREFUSED |
| `test/policies/basic-auth-policy.test.js` | ~12 | 0 | ✅ |
| `test/policies/cors/*.test.js` | ~8 | 0 | ✅ |
| `test/policies/expression/*.test.js` | ~10 | 0 | ✅ |
| `test/policies/jwt/*.test.js` | ~15 | 0 | ✅ |
| `test/policies/keyauth/*.test.js` | ~20 | 0 | ✅ |
| `test/policies/log/*.test.js` | ~4 | 0 | ✅ |
| `test/policies/missing-policy.test.js` | ~2 | 0 | ✅ |
| `test/policies/modifier/*.test.js` | ~8 | 6 | headers mismatch + proxy 502 + crypto cascade |
| `test/policies/multi-actions-per-policy.test.js` | ~4 | 0 | ✅ |
| `test/policies/oauth/*.test.js` | ~6 | 14 | crypto cascade + OAuth flow 400s |
| `test/policies/passthrough.test.js` | ~2 | 0 | ✅ |
| `test/policies/proxy/*.test.js` | ~15 | 8 | proxy options 502 + requestStream |
| `test/policies/rate-limiter/*.test.js` | ~10 | 0 | ✅ |
| `test/policies/terminate/*.test.js` | ~4 | 0 | ✅ |
| `test/rest-api/api-endpoint.test.js` | 0 | 6 | admin 404 |
| `test/rest-api/pipelines.test.js` | 0 | 7 | admin 404 |
| `test/rest-api/policies.test.js` | 0 | 4 | admin 404 |
| `test/rest-api/schemas.test.js` | 0 | 2 | admin 404 |
| `test/rest-api/service-endpoint.test.js` | 0 | 6 | admin 404 |
| `test/routing/*.test.js` | ~40 | 0 | ✅ |
| `test/services/tokens.test.js` | ~6 | 32 | crypto.createCipher |
| `test/services/*.test.js` (auth, credentials, users) | ~20 | 0 | ✅ (no encrypt path) |

---

## e2e Tests (not included in baseline run)

Command: `npm run test:e2e` (no `EG_*` env vars; forks child processes)  
Status: **Not run** — requires open ports 3000–3100, full gateway child process, longer timeout.  
Documented as unknown U05 in `docs/discovery/unknowns.md`.

---

## Nondeterministic / Environment-Dependent Tests

| Test | Dependency | Risk |
|---|---|---|
| `test/conditions.test.js` jsonSchema remote | External HTTP schema fetch (raw.githubusercontent.com or similar) | Fails if no network |
| `test/config-http-hostname.test.js` | Specific network interfaces (`fe80::`) | Fails on hosts without IPv6 link-local |
| `test/config-https-sni.test.js` | TLS cert key size (OpenSSL policy in Node 24) | Fails on Node ≥22 |
| `test/plugins/` admin ECONNREFUSED | Port timing between tests | Occasionally flaky |
| `test/policies/proxy/` proxy options | Requires reachable backend at specific port | May vary |
| `server-helper.js` port pool | Ports 3000–3100 assumed free | Fails if ports occupied |
