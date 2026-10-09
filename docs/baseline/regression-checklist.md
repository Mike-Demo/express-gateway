# Regression Checklist — express-gateway v1.16.10

Every later stage (G3, G4, G5+) **must** re-run these checks before declaring a gate pass.  
A failure not in `known-defects.md` is a regression and must be fixed or explicitly accepted.

---

## 1. Required Environment

```powershell
# Windows PowerShell (this environment)
$env:EG_HTTP_PORT="0"
$env:EG_CONFIG_DIR="lib/config"
$env:EG_DISABLE_CONFIG_WATCH="true"
```

These three vars must be set for all unit/policy/characterization test runs.  
**Do NOT add** them for `npm run test:e2e` — e2e tests set their own env on forked processes.

---

## 2. Baseline Numbers (Node 24.21.0)

| Suite | Command | Pass | Fail | Notes |
|---|---|---|---|---|
| Unit + policy | `node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000` | **357** | **127** | 127 are known defects |
| Characterization | `node_modules\.bin\mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000` | **30** | **0** | Must stay at 30/0 |
| e2e | `npm run test:e2e` | unknown | unknown | Not measured; see U05 |

A later stage **passes** this check if:
- Unit+policy: `passing ≥ 357` AND `failing ≤ 127` (new failures = regression)
- Characterization: `passing = 30` AND `failing = 0`

---

## 3. Step-by-Step Regression Run

### Step 1 — Full unit+policy suite

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"
node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 --reporter spec 2>&1 | Tee-Object regression-run.txt
```

Extract counts:
```powershell
Select-String -Path regression-run.txt -Pattern "^\s+\d+ (passing|failing|pending)"
```

**Accept if:** passing ≥ 357, failing ≤ 127.  
**Reject if:** failing > 127 (new regression) OR passing < 357 (tests deleted or broken).

### Step 2 — Characterization suite

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"
node_modules\.bin\mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000 --reporter spec
```

**Accept if:** 30 passing, 0 failing.  
**Reject if:** any failure (these have no known-defect exemption).

### Step 3 — Coverage delta check

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"
node node_modules/nyc/bin/nyc.js --reporter=text node_modules/mocha/bin/mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 2>&1 | Select-String "All files"
```

**Baseline:** Stmts 62.01%, Branch 45.71%, Funcs 55.06%, Lines 61.80%  
**Accept if:** no decrease > 2% on any metric (small fluctuation expected).  
**Reject if:** significant decrease (indicates code removed from coverage).

### Step 4 — Lint

```powershell
npm run lint
```

**Accept if:** exit code 0.  
**Reject if:** any new lint errors (existing lint state is clean).

---

## 4. Journey Verification (manual or automated)

| Journey | Automated Test | Manual Verification |
|---|---|---|
| A: auth → proxy | `test/characterization/journey-a-auth-proxy.test.js` (A1–A6) | — |
| B: admin API + config | `test/characterization/journey-b-admin-hotreload.test.js` (B1–B8) | Verify YAML file written to disk |
| C: plugin/policy chain | `test/characterization/journey-c-plugin-policy.test.js` (C1–C8) | — |
| Smoke: startup | `test/characterization/smoke.test.js` | Gateway on :8080, admin on :9876 |

---

## 5. Known-Defect Cross-Reference

Before marking a new failure as a regression, consult `docs/baseline/known-defects.md`:

| Defect ID | Failure pattern | Expected failing count |
|---|---|---|
| KD-001 | `crypto.createCipher is not a function` | ~22 direct + cascade |
| KD-002 | `Cannot find module 'yeoman-test/lib/adapter'` | 32 |
| KD-003 | `Not Found` (REST API admin tests) | 25 |
| KD-004 | `error:0A00018F:SSL routines::ee key too small` | 4 |
| KD-005 | `spawn EINVAL` | 1 |
| KD-006 | `expected [Promise] to be fulfilled ... status: 404` (jsonSchema remote) | 2 |
| KD-007 | `getaddrinfo ENOTFOUND fe80` / `expected '' to contain 'ECONNREFUSED'` | 2 |
| KD-008 | `expected 200, got 502` (proxy options) | 6 |
| KD-009 | Header object mismatch (modifier policy) | 2 |
| KD-010 | `expected 502, got 500` (proxy bad-gateway) | 1 |
| KD-011 | `expected 200, got 400` (OAuth token exchange) | 2 |

If a defect from this table starts **passing** after a stage, that is **progress** — update `known-defects.md` and reduce the expected failing count.

---

## 6. Nondeterministic Tests — Handling Rules

These tests are flaky or environment-dependent; do not count them as regressions if they fail in isolation:

| Test | Why nondeterministic | Mitigation |
|---|---|---|
| `test/conditions.test.js` jsonSchema remote | External HTTP dependency | Re-run once; skip with `--grep` if network unavailable |
| `test/config-http-hostname.test.js` | IPv6 interface `fe80::` | Skip on hosts without IPv6 link-local |
| `test/config-https-sni.test.js` | TLS key size / OpenSSL version | Known fail on Node ≥22 (KD-004); skip during regression unless certs regenerated |
| `test/plugins/` admin ECONNREFUSED | Port timing | Re-run once; known intermittent |
| `server-helper.js` port range 3000–3100 | Assumes ports free | Run on a clean environment or wait 5s if ports are occupied |

---

## 7. Stage-Specific Notes

### G3 (dependency upgrades, cert regeneration, admin 404 fix)
- After G3, expect KD-002, KD-003, KD-004, KD-005, KD-006, KD-007 to resolve.
- Failing count should drop from 127 to ~64 (KD-001 cluster + proxy issues).
- Characterization B4/B6 should update from KD-003 `.catch` guards to positive assertions.

### G4 (crypto.createCipher → createCipheriv)
- After G4, KD-001 resolves. Expected failing count drops to ~0–10.
- Characterization C8a/C8b must be updated to assert success not failure.
- Coverage for `lib/services/tokens` should rise from 33% to ~80%.

### Before G3 starts
Run Steps 1–4 above. Confirm:
- [ ] 357 passing, 127 failing (unit+policy)
- [ ] 30 passing, 0 failing (characterization)
- [ ] Coverage ≈ 62% statements
- [ ] Lint clean

---

## 8. Quick One-Liner (all checks)

```powershell
$env:EG_HTTP_PORT="0"; $env:EG_CONFIG_DIR="lib/config"; $env:EG_DISABLE_CONFIG_WATCH="true"

# Unit suite
node_modules\.bin\mocha "test/{,!(e2e)/**/}*.test.js" --recursive --exit --timeout 60000 2>&1 | Select-String "passing|failing"

# Characterization suite
node_modules\.bin\mocha "test/characterization/**/*.test.js" --recursive --exit --timeout 15000 2>&1 | Select-String "passing|failing"

# Lint
npm run lint 2>&1 | Select-String "problems|error" | Select-Object -First 3
```
