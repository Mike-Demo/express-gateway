# Coverage Baseline — express-gateway v1.16.10

**Date:** 2025  
**Node:** 24.21.0  
**Command:** `node node_modules/nyc/bin/nyc.js --reporter=text node_modules/mocha/bin/mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000`  
**Scope:** Unit + policy tests (excludes `test/e2e/`)  
**Note:** `npm test` was not used (requires `codecov` CI token). nyc invoked directly via `node node_modules/nyc/bin/nyc.js` to avoid bash shim incompatibility on Windows.

---

## Overall Coverage

| Metric | Baseline |
|---|---|
| **Statements** | **62.01%** |
| **Branches** | **45.71%** |
| **Functions** | **55.06%** |
| **Lines** | **61.80%** |

---

## Per-Module Coverage

| Module | Stmts % | Branch % | Funcs % | Lines % |
|---|---|---|---|---|
| **All files** | **62.01** | **45.71** | **55.06** | **61.80** |
| `lib/conditions` | 75.58 | 53.33 | 76.19 | 75.00 |
| `lib/config` | 46.73 | 30.00 | 56.25 | 46.67 |
| `lib/gateway` | 83.12 | 73.81 | 89.36 | 83.12 |
| `lib/policies` (index) | 100.00 | 100.00 | 100.00 | 100.00 |
| `lib/policies/basic-auth` | 93.55 | 95.65 | 87.50 | 93.33 |
| `lib/policies/cors` | 100.00 | 100.00 | 100.00 | 100.00 |
| `lib/policies/expression` | 100.00 | 100.00 | 100.00 | 100.00 |
| `lib/policies/headers` | 45.45 | 100.00 | 50.00 | 45.45 |
| `lib/policies/jwt` | 91.18 | 81.25 | 100.00 | 91.18 |
| `lib/policies/key-auth` | 83.54 | 70.59 | 90.91 | 85.71 |
| `lib/policies/log` | 100.00 | 100.00 | 100.00 | 100.00 |
| `lib/policies/oauth2` | 60.83 | 42.31 | 50.94 | 63.18 |
| `lib/policies/proxy` | 91.55 | 74.36 | 100.00 | 91.43 |
| `lib/policies/proxy/strategies` | 52.94 | 0.00 | 50.00 | 52.94 |
| `lib/policies/rate-limit` | 90.91 | 100.00 | 100.00 | 90.91 |
| `lib/policies/request-transformer` | 89.47 | 66.67 | 100.00 | 96.88 |
| `lib/policies/response-transformer` | 94.44 | 50.00 | 100.00 | 94.44 |
| `lib/policies/terminate` | 100.00 | 100.00 | 100.00 | 100.00 |
| `lib/rest` (index) | 75.00 | 61.54 | 66.67 | 74.42 |
| `lib/rest/routes` | 33.67 | 0.00 | 16.67 | 34.02 |
| `lib/rest/utils` | 42.86 | 0.00 | 0.00 | 42.86 |
| `lib/schemas` | 88.24 | 61.54 | 76.92 | 89.29 |
| `lib/services` | 71.84 | 62.82 | 74.07 | 72.28 |
| `lib/services/authorization-codes` | 56.90 | 33.33 | 27.27 | 56.36 |
| `lib/services/consumers` | 89.30 | 73.53 | 90.77 | 88.56 |
| `lib/services/credentials` | 88.82 | 77.30 | 94.79 | 88.10 |
| `lib/services/tokens` | 33.18 | 21.93 | 24.44 | 33.33 |

---

## Coverage Notes

1. **`lib/services/tokens`** — 33% coverage because 32+ token tests fail due to KD-001 (`crypto.createCipher`). Expected to rise to ~80%+ after G4 fix.
2. **`lib/rest/routes`** — 34% coverage because 25 REST API tests fail due to KD-003 (admin 404). Expected to rise after G3 fix.
3. **`lib/config`** — 47% coverage; hot-reload, watch, and updateGatewayConfig paths not exercised in unit tests (only in e2e tests).
4. **`lib/policies/headers`** — 45% coverage due to modifier/headers test failures (KD-009).
5. **`lib/policies/oauth2`** — 61% due to OAuth flow test failures cascading from KD-001.
6. **`lib/policies/proxy/strategies`** — 53% (round-robin only; static strategy not tested).
7. **`lib/rest/utils`** — 43% coverage; error serialisation utilities not exercised.

---

## Coverage Targets for G4 (post-fix expectations)

| Module | Current | Expected post-G4 |
|---|---|---|
| `lib/services/tokens` | 33% | ~80% |
| `lib/rest/routes` | 34% | ~70% |
| `lib/policies/oauth2` | 61% | ~80% |
| **Overall** | **62%** | **~75%** |
