# G4 Implementation Plan — express-gateway v1.16.10 Modernization

**Stage:** G3 deliverable — plan for G4 execution  
**Branch:** `modernization-factory`  
**Authored from:** G1 discovery, G2 baseline, G3 analysis, ADR U07, ADR U03, `docs/plan/targets.md`, `docs/plan/dependency-disposition.md`, `docs/plan/refactor-selection.md`, `docs/plan/api-enablement.md`

---

## 1. Goals

G4 has a single top-level objective: **bring the unit+policy test suite from 127 failing tests to ≤ 50 failing tests, with zero regression below the G2 baseline, running on Node 20 LTS.**

Secondary objectives:
- Eliminate all P0 (Certain/Critical and High/Critical) CVEs from the runtime dependency tree.
- Produce a Dockerfile that builds and runs on a supported Node base image.
- Leave the codebase in a state where G5 (AJV migration, rate-limit, remaining CODEs) can proceed without architectural blockers.

**Out of scope for G4:** AJV v8 migration (explicitly deferred), express-rate-limit v7, e2e test repair (e2e tests are not part of the regression gate).

---

## 2. Regression Gate

The G4 stage passes only when **all** of the following are true:

| Check | Threshold | Measurement |
|---|---|---|
| Unit+policy tests passing | ≥ 357 | `npm run test:unit` (includes all `test/{,!(e2e)/**/}*.test.js`) |
| Unit+policy tests failing | ≤ 50 (improvement from 127) | same run |
| Characterization tests passing | 30 | `mocha test/characterization/**/*.test.js` |
| Characterization tests failing | 0 | same run |
| Coverage: statements | ≥ 62.01% | `nyc npm run test:unit` |
| Coverage: branches | ≥ 45.71% | same run |
| Coverage: functions | ≥ 55.06% | same run |
| `npm run lint` | 0 errors, 0 warnings | must be clean |
| `npm audit` | 0 critical CVEs | after all dependency upgrades |

**The baseline thresholds are non-negotiable per BOB-PROJECT-RULES.md Rule 5 and Rule 10.** Any work item that causes the passing count to drop below 357 or coverage to drop below the baseline must be reverted before proceeding.

---

## 3. Work Breakdown

Work items are ordered by dependency. Items with no dependency on each other are grouped; within a group, order by risk (highest-risk first).

### Phase A — Cryptographic fix (unblocks 64 failures, highest priority)

**A1 — Implement ADR U07: replace `crypto.createCipher` with AES-256-GCM**

- File: `lib/services/utils.js`
- Change: Implement new `encrypt()` and `decrypt()` per ADR U07 specification.
- Add `scryptSalt` to `lib/config/system.config.yml`.
- Remove `crypto.createCipher`/`crypto.createDecipher` from `.eslintrc` `ignoreModuleItems` (R17).
- **Acceptance criteria:** ADR U07 §Acceptance Criteria items 1–8.
- **KDs resolved:** KD-001 direct (22 tests) + KD-011 (2 tests) + ~40 cascade failures.
- **Expected failing after:** ≤ 65 (was 127).

**A2 — Implement ADR U03: migration script**

- Create: `scripts/migrate-crypto.js`
- Supports `--dry-run` and `--verify` flags per ADR U03 specification.
- Must run on Node 14 (old `createDecipher` path) and produce a report.
- **Acceptance criteria:** ADR U03 §Acceptance Criteria items 1–7.
- **Not gate-blocking for test runs** (the migration script is for live environments; ioredis-mock has no persisted legacy data).
- Run: `node scripts/migrate-crypto.js --dry-run --namespace EG` as a smoke test against the mock.

---

### Phase B — uuid and uuid62 (unblocks U11, prerequisite for services stability)

**B1 — Fix `uuid/v4` sub-path import (U11, Cluster D2)**

- Files: `lib/services/tokens/token.service.js:3`, `lib/services/credentials/credential.service.js:2`
- Change: `const uuidv4 = require('uuid/v4')` → `const { v4: uuidv4 } = require('uuid')`
- Package: `npm install uuid@^9.0.0`
- **No test changes required** — callers use `uuidv4()` directly; the return value is unchanged.

**B2 — Remove uuid62 (R08)**

- File: `lib/gateway/context.js`
- Change: Replace `uuid62.v4()` requestID with `require('uuid').v4()` (standard UUID string, replacing base62 format).
- Package: `npm uninstall uuid62`
- **Impact on request context:** `EgContextBase.requestID` format changes from base62 (`~22 chars`) to UUID format (`36 chars`). This is visible in logs but is not externally observable behaviour per the API contract.
- **Test impact:** Search `test/` for assertions on `requestID` format before committing.

---

### Phase C — AUTO-class dependency upgrades (no source changes required)

Run as a single batch. Each upgrade must be followed by `npm run test:unit` to confirm no regression before the batch is committed.

| Package | Command | CVEs fixed |
|---|---|---|
| `express` | `npm install express@^4.21.0` | 6 CVEs (body-parser, cookie, path-to-regexp, qs, send, proxy-addr) |
| `express-session` | `npm install express-session@^1.18.1` | cookie, on-headers |
| `minimatch` | `npm install minimatch@^3.1.2` | 2 ReDoS CVEs |
| `semver` | `npm install semver@^7.5.4` | 1 ReDoS CVE |
| `chokidar` | `npm install chokidar@^3.6.0` | braces, glob-parent transitive |
| `chalk` | `npm install chalk@^4.1.2` | (no CVEs; keeps tree current) |
| `sinon` | `npm install sinon@^17.0.0` | just-extend prototype pollution |
| `mocha` | `npm install mocha@^10.7.0` | debug, js-yaml, minimatch transitive |
| `eslint` | `npm install eslint@^8.57.0` | 6.x EOL |

**Validation step after batch C:** Run `npm run test:unit`. Expect passing ≥ 357 (unchanged from baseline + Phase A gains). Run `npm run lint`. Fix any new lint warnings from eslint v8.

---

### Phase D — CODE-class upgrades requiring source changes

Each item in this phase must be done in a separate commit. Each commit must include its own test validation.

**D1 — jsonwebtoken 8.5.1 → 9.0.0 (R02)**

- Package: `npm install jsonwebtoken@^9.0.0`
- File: `lib/policies/jwt/jwt.js`
- Change: Pass explicit `algorithms` array to `jwt.verify()`. The JWT policy schema (`lib/policies/jwt/index.js`) already has an `algorithms` field — use it. If `algorithms` is not supplied by the user, default to `['HS256']` (most common) rather than leaving it open.
- **Acceptance criteria:** All `test/policies/jwt/` tests pass. No new failures in `test/policies/`.

**D2 — js-yaml 3.13.1 → 4.1.0 (R04)**

- Package: `npm install js-yaml@^4.1.0`
- Files: `lib/config/config.js` (all `yaml.load()` and `yaml.dump()` call sites)
- Change: In v3, `yaml.load()` is **unsafe** (allows executable JS). In v4, `yaml.load()` is safe by default (equivalent to v3's `yaml.safeLoad()`). If any call site uses `yaml.safeLoad()`, rename to `yaml.load()`.
- **yawn-yaml risk:** After upgrade, test `config.updateGatewayConfig()` manually. If yawn-yaml is broken by js-yaml v4 (U08), replace the write path per the fallback in `dependency-disposition.md`.
- **Acceptance criteria:** `test/config*` tests and all config-loading unit tests pass. `updateGatewayConfig` smoke test passes.

**D3 — passport 0.4.0 → 0.7.0 (R15)**

- Package: `npm install passport@^0.7.0 passport-http@latest passport-http-bearer@latest passport-oauth2-client-password@latest passport-local@latest`
- File: `lib/gateway/actionParams.js:getCommonAuthCallback()` — validate `req.user` access pattern (breaking change in passport 0.6: session user population changed).
- All four auth policies must be tested: basic-auth, key-auth, JWT, OAuth2 (Cluster D1).
- **Acceptance criteria:** `test/policies/basic-auth/`, `test/policies/key-auth/`, `test/policies/jwt/`, `test/policies/oauth/` all pass at or above pre-D3 counts.

**D4 — Remove lodash.flatmap (R03)**

- Package: `npm uninstall lodash.flatmap`
- File: `lib/gateway/pipelines.js` — replace `require('lodash.flatmap')` call with native `.flatMap()`.
- Node 20+ has `Array.prototype.flatMap` natively; no polyfill needed.
- **Acceptance criteria:** `test/gateway/` pipeline tests pass. `npm run lint` passes.

**D5 — proxy-agent 4.0.1 → 6.3.0 (R07)**

- Package: `npm install proxy-agent@^6.3.0`
- File: `lib/policies/proxy/proxy.js` — validate `ProxyAgent` constructor signature against v6 API.
- **Acceptance criteria:** Proxy policy tests in `test/policies/proxy/` pass at or above pre-D5 count (note: KD-008 and KD-010 are pre-existing failures; do not treat them as regressions).

**D6 — superagent 5.1.0 → 8.1.0**

- Package: `npm install superagent@^8.1.0`
- Files: `lib/schemas/index.js` (remote schema loading), `admin/client.js`.
- superagent v8 drops callback API in favour of promises; verify both call sites use `.then()` or `await`, not `.end(callback)`.
- **Acceptance criteria:** `test/conditions.test.js` jsonSchema remote-fetch tests pass (note: KD-006 is a pre-existing 404; those 2 failures remain).

**D7 — json-schema-ref-parser → @apidevtools/json-schema-ref-parser 11.x**

- Package: `npm uninstall json-schema-ref-parser; npm install @apidevtools/json-schema-ref-parser@^11.0.0`
- File: `lib/services/credentials/credential.service.js` — update import path.
- **Acceptance criteria:** Credential service tests pass. `npm run lint` passes.

---

### Phase E — Refactor (D4 admin route consolidation)

**E1 — Admin route CRUD factory (from `docs/plan/refactor-selection.md`)**

- Create: `lib/rest/routes/admin-route-factory.js`
- Replace body of: `api-endpoints.js`, `service-endpoints.js`, `pipelines.js`
- **Acceptance criteria:** `refactor-selection.md` §Acceptance Criteria items 1–5. REST API tests pass at same rate as before E1 (KD-003 status is unchanged at this point unless D-series work resolved it).

---

### Phase F — Infrastructure

**F1 — Update Dockerfile base image**

- File: `Dockerfile`
- Change: `FROM node:10-alpine` → `FROM node:20-alpine`
- **Acceptance criteria:** `docker build .` completes without error. Container starts and responds on `EG_HTTP_PORT`.

**F2 — Update CircleCI config (R06)**

- File: `.circleci/config.yml`
- Change: Replace `circleci/node:8-browsers`, `circleci/node:10-browsers`, `circleci/node:12-browsers` with `cimg/node:20.x`, `cimg/node:22.x` (current CircleCI convenience images).
- Add test matrix: `[ "20", "22" ]`.
- **Acceptance criteria:** CircleCI config is valid YAML. `circleci config validate` passes (if CLI available).

---

### Phase G — Stretch items (optional, non-gating)

From `docs/plan/api-enablement.md`. Only attempt if Phase A–F complete with time remaining and the gate is already passing.

**G1 — Schema discovery endpoint** (api-enablement.md Opportunity 1)  
**G2 — Health check endpoint** (api-enablement.md Opportunity 3)

---

## 4. Execution Order and Dependencies

```
A1 (cipher fix)
  └─ A2 (migration script)  ← independent; can run after A1
B1 (uuid import fix)         ← can run in parallel with A
B2 (uuid62 removal)          ← can run in parallel with A, after B1
C  (AUTO upgrades)           ← can run after A1 (tests must be stable first)
  └─ D1 (jsonwebtoken)       ← after C (mocha upgraded)
  └─ D2 (js-yaml)            ← after C
  └─ D3 (passport)           ← after D1 (both touch auth layer)
  └─ D4 (lodash.flatmap)     ← after C; independent
  └─ D5 (proxy-agent)        ← after C; independent
  └─ D6 (superagent)         ← after C; independent
  └─ D7 (json-schema-ref-parser) ← after C; independent
E1 (CRUD refactor)           ← after D2 (js-yaml may affect config.updateGatewayConfig)
F1 (Dockerfile)              ← independent
F2 (CircleCI)                ← independent
G1, G2 (stretch)             ← after E1; non-gating
```

---

## 5. Risk Table for G4

| Risk | Mitigation |
|---|---|
| A1 fails: GCM auth-tag mismatch in test fixtures | Characterization test C8a/C8b must be updated to reflect the new cipher — see ADR U07 §Acceptance Criteria item 6 |
| D2 breaks yawn-yaml (U08) | If `config.updateGatewayConfig` breaks, replace write path with `yaml.dump()` + `fs.writeFile()` per fallback in `dependency-disposition.md` |
| D3 passport 0.7 changes `req.user` access | Run all four auth policy tests in isolation before declaring D3 complete; roll back if any new failures appear |
| Phase C AUTO-upgrade causes unexpected failures | Run `test:unit` after each package upgrade in Phase C, not only at the end of the batch; revert the offending package and mark REVIEW if needed |
| E1 changes 404 behaviour of admin routes | Read current implementations of all three route files before writing factory; confirm 404 path is identical |
| uuid62 requestID format change (B2) | Grep test files for requestID format assertions before committing B2 |

---

## 6. Known Defects Expected to Remain After G4

These defects are out of scope for G4. Their presence does not indicate a G4 regression.

| KD | Count | Reason deferred |
|---|---|---|
| KD-002 | 32 | yeoman-test/lib/adapter missing — requires yeoman-environment + yeoman-generator + yeoman-test triple upgrade. Deferred to G5. |
| KD-003 | ~25 | Admin server 404 — may be resolved by D-series work (js-yaml, superagent upgrades). If not resolved incidentally, investigate as a standalone item. Not gating G4. |
| KD-004 | 4 | OpenSSL RSA key size — test fixtures must be regenerated. Deferred to G5 (test infrastructure cleanup). |
| KD-005 | 1 | spawn EINVAL on Windows — platform-specific; deferred. |
| KD-006 | 2 | Remote schema 404 — network-dependent; deferred to G5. |
| KD-007 | 2 | IPv6 link-local interface not available on this host — environment-specific; deferred. |
| KD-008 | 6 | Proxy 502 — backend server setup in tests; deferred to G5 proxy policy review. |
| KD-009 | 2 | Modifier headers assertion brittle — deferred to G5 test cleanup. |
| KD-010 | 1 | Proxy 500 vs 502 — deferred to G5. |

After G4, the expected failing ceiling is ≤ 50 (KD-001's 64 direct+cascade failures resolved; the remaining ~50 distributed across KD-002 through KD-010 above).

---

## 7. G4 Commit Discipline

Per BOB-PROJECT-RULES.md Rule 3 (small, reviewable changes):

- Each Phase A, B, D, E, F item is a separate commit.
- Phase C (AUTO batch) is a single commit preceded by a `npm run test:unit` clean run.
- Each commit message must follow the format: `G4/<phase>: <description>`  
  Example: `G4/A1: replace crypto.createCipher with AES-256-GCM (ADR U07)`
- No commit may take the passing test count below the G2 baseline of 357.
- If a commit causes a regression, it must be reverted before any subsequent commit is made.

---

## 8. References

| Document | Role |
|---|---|
| `docs/plan/adr/adr-u07-cipher-replacement.md` | Implementation spec for Phase A1 |
| `docs/plan/adr/adr-u03-stored-data-migration.md` | Implementation spec for Phase A2 |
| `docs/plan/targets.md` | Target versions for all packages in Phases B–D |
| `docs/plan/dependency-disposition.md` | Disposition codes; deferred items |
| `docs/plan/analysis.md` | Coupling map; Cluster D1–D4; hotspot table |
| `docs/plan/refactor-selection.md` | E1 implementation spec |
| `docs/plan/api-enablement.md` | G1, G2 stretch items |
| `docs/baseline/regression-checklist.md` | Step-by-step gate verification procedure |
| `docs/baseline/known-defects.md` | KD-001 through KD-011 defect reference |
