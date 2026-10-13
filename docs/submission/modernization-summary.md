# Modernization Summary — express-gateway v1.16.10

**Branch:** `modernization-factory`  
**Project:** IBM Bob Modernization Factory hackathon submission  
**Repository:** expressgateway/express-gateway (fork: Mike-Demo/express-gateway)  
**Environment:** Node 24.21.0, Windows Server 2022, IBM Cloud VPC `bob-windows` VSI  

---

## Before and After

| Metric | Baseline (G2) | G4 Close |
|---|---|---|
| Unit + policy tests passing | **357** | **551** |
| Unit + policy tests failing | **127** | **32** |
| Characterization tests | 30 / 0 fail | 31 / 0 fail |
| `npm audit` total vulnerabilities | **88** | **65** |
| `npm audit` critical | **14** | **7** |
| Lint errors / warnings | 0 / 0 | 0 / 0 |
| Node base image (Dockerfile) | `node:10-alpine` | `node:22-alpine` |
| `package.json` engines floor | `>= 8.3.0` | `>=22.0.0` |

For the 7 remaining critical advisories and their full dependency paths, see  
[`docs/baseline/security-disposition-f2.md`](../baseline/security-disposition-f2.md).

---

## Stage-by-Stage Narrative

### G0 — Safety Contract and Access Boundaries

The first action was establishing the rules of engagement before touching any code.
`BOB-PROJECT-RULES.md` was added with ten rules — four of which are hard stops that
require halting and asking rather than proceeding. `.bobignore` was added to keep the
agent out of secrets, `node_modules/`, coverage artefacts, and production data.
These two files govern every subsequent stage and are referenced by `AGENTS.md`.

*Commit:* `86196a0` (`.bobignore`), `76aecdb` (`BOB-PROJECT-RULES.md`)

---

### G1 — Codebase Discovery

A read-only analysis pass produced six artefacts:

- **`docs/discovery/discovery-report.md`** — full application narrative, module map, runtime architecture diagram, and first test run (357 passing / 127 failing on Node 24).
- **`docs/discovery/dependency-inventory.md`** — every direct dependency with version, status, and CVE summary. Baseline audit: **88 vulnerabilities, 14 critical**.
- **`docs/discovery/risk-register.md`** — prioritised risk table (R01 through R17).
- **`docs/discovery/unknowns.md`** — open questions (U01–U12) requiring decisions before G4.
- **`docs/discovery/journeys.md`** — request flow walkthroughs for the main auth policies.
- **`docs/discovery/technology-inventory.md`** — runtime and dev toolchain inventory.

The most important finding: `lib/services/utils.js` used `crypto.createCipher` and
`crypto.createDecipher`, removed in Node 22. This single root cause accounted for
~64 of the 127 failing tests and was flagged as the G4 top priority.

*Commit:* `e04a950`

---

### G2 — Behavioural Baseline

Before any code changes, a precise snapshot of all observable behaviour was captured:

- **`docs/baseline/test-baseline.md`** — exact pass/fail counts (357/127), per-suite breakdown, failure categories.
- **`docs/baseline/known-defects.md`** — eleven known defects (KD-001 through KD-011) with root causes, error messages, and affected test suites.
- **`docs/baseline/coverage.md`** — code coverage baseline (statements 62.01%, branches 45.71%, functions 55.06%).
- **`docs/baseline/regression-checklist.md`** — step-by-step gate verification procedure.
- **Characterization tests** added at `test/characterization/` — 30 tests locking the externally observable behaviour of the admin API, request routing, auth policies, and config loading. These run as a separate suite and must stay green throughout all subsequent stages.

*Commit:* `df57250`

---

### G3 — Analysis and Planning

G3 produced the complete implementation plan for G4:

- **`docs/plan/plan.md`** — G4 work breakdown across six phases (A–F), regression gate definition, commit discipline rules, risk table, and known-defects expected to remain.
- **`docs/plan/adr/adr-u07-cipher-replacement.md`** — architecture decision record selecting AES-256-GCM with scrypt key derivation to replace the removed `crypto.createCipher`.
- **`docs/plan/adr/adr-u03-stored-data-migration.md`** — migration strategy for any data encrypted under the old scheme.
- **`docs/plan/targets.md`**, **`docs/plan/dependency-disposition.md`** — target versions and disposition codes for every dependency upgrade.
- **`docs/plan/refactor-selection.md`** — single refactor chosen for G4: the admin-route CRUD factory (design D4).
- **`docs/plan/analysis.md`**, **`docs/plan/architecture.md`** — coupling analysis and architectural notes.

*Commit:* `0bf67db`

---

### G4 Phase A — Cryptographic Fix

**The highest-priority change.** `lib/services/utils.js` was rewritten to replace
`crypto.createCipher`/`createDecipher` with AES-256-GCM authenticated encryption:

- Random 12-byte IV per encryption call (prevents ciphertext reuse).
- `crypto.scryptSync` key derivation from the passphrase (addresses short-key weakness).
- Auth tag verification on decryption (detects tampering — the old CBC scheme did not).
- New `scryptSalt` field added to `lib/config/system.config.yml`.
- Migration script `scripts/migrate-crypto.js` created with `--dry-run` and `--verify` flags (ADR U03).
- ESLint suppressions for the old APIs removed from `.eslintrc`.
- Characterization tests C8a/C8b/C8c updated to reflect the new cipher format.

This single change cleared 64 direct crypto failures plus ~40 cascaded failures.

*Commits:* `df116da`, `33063fc`, `e72edb1`

---

### G4 Phase B — uuid Modernisation

- `uuid/v4` sub-path imports (`require('uuid/v4')`) replaced with
  `const { v4: uuidv4 } = require('uuid')` and `uuid` upgraded to v9.
  (`lib/services/tokens/token.service.js`, `lib/services/credentials/credential.service.js`)
- `uuid62` removed from the runtime library; replaced with standard UUID v4 in
  `lib/gateway/context.js`. `uuid62` demoted to devDependency for test fixtures only.

*Commits:* `b4ab467`, `6a2d158`

---

### G4 Phase C — AUTO-class Dependency Upgrades

Nine packages upgraded in a batch where no source changes were required:

| Package | From | To | CVEs addressed |
|---|---|---|---|
| `express` | 4.17.1 | 4.22.3 | 6 (body-parser, cookie, path-to-regexp, qs, send, proxy-addr) |
| `express-session` | 1.16.2 | 1.19.0 | cookie, on-headers |
| `minimatch` | 3.0.4 | 3.1.5 | 2 ReDoS |
| `semver` | 6.3.0 | 7.8.5 | 1 ReDoS |
| `chokidar` | 3.0.2 | 3.6.0 | braces, glob-parent transitive |
| `sinon` | 7.4.2 | 17.0.1 | just-extend prototype pollution |
| `mocha` | 6.2.0 | 10.8.2 | debug, js-yaml, minimatch transitive |
| `eslint` | 6.3.0 | 8.57.1 | EOL replacement |
| `chalk` + `winston` | 2.4.2 / 3.2.1 | 4.1.2 / 3.19.0 | coordinated upgrade |

*Commits:* `7860738` through `4e08cdc`, `fda95d8`, `e62ad74`

---

### G4 Phase D — CODE-class Upgrades (source changes required)

Seven packages requiring targeted source changes, one commit each:

- **jsonwebtoken 8→9** (`D1`): explicit `algorithms` array now required in `jwt.verify()`. Added to `lib/policies/jwt/jwt.js`.
- **js-yaml 3→4** (`D2`): `yaml.safeLoad()` removed; renamed to `yaml.load()` across `lib/config/config.js`.
- **passport 0.4→0.7** (`D3`): session user-population change; `req.user` access pattern in `lib/gateway/actionParams.js` validated.
- **lodash.flatmap removed** (`D4`): replaced with native `Array.prototype.flatMap` in `lib/gateway/pipelines.js`.
- **proxy-agent 4→6** (`D5`): `ProxyAgent` constructor signature updated in `lib/policies/proxy/proxy.js`.
- **superagent 5→8** (`D6`): callback API dropped; `.then()` / `await` verified at all call sites.
- **json-schema-ref-parser → @apidevtools/json-schema-ref-parser 11** (`D7`): import path updated in `lib/services/credentials/credential.service.js`.

*Commits:* `9031ec3` through `11226fd`

---

### G4 Phase E — Admin Fix + CRUD Factory Refactor

Phase E resolved three previously misunderstood or deferred known defects and
completed the one selected refactor.

#### E0 — Admin Server IPv6 URL Fix (KD-003 resolved)

On Node 24, `localhost` resolves to the IPv6 loopback `::1`. The admin REST server
in `lib/rest/index.js` defaulted its bind host to `'localhost'`, so it bound on `::1`.
`test/common/admin-helper.js` then constructed the superagent base URL as
`http://::1:PORT` — a syntactically invalid URL (bare IPv6 without brackets).
Node 24's `url.parse()` misrouted every request, producing 404 on all 28 admin REST
tests. Fix: default host changed to `'127.0.0.1'`; URL construction updated to use
bracket notation for IPv6.

#### E0b — CLI Test Isolation Fix (KD-002 resolved, misdiagnosis corrected)

KD-002 was originally diagnosed as "Cannot find module 'yeoman-test/lib/adapter'".
This was incorrect — `yeoman-test@1.9.1` has always shipped `lib/adapter`. The real
failure mode was config-singleton isolation: REST API test files called
`config.loadGatewayConfig()` on temp YAML files without an `admin:` section,
mutating the shared module singleton. When CLI tests subsequently called
`adminHelper.start()` with no config argument, `rest()` fell back to the mutated
singleton and returned `undefined`. Fix: `admin-helper.js` now supplies an explicit
`DEFAULT_CONFIG` when no config is given, and sets `process.env.EG_ADMIN_URL` after
the server starts so CLI generators use the correct ephemeral port.

#### E0c — Policy Loading at Admin Server Startup (KD-003a resolved)

Six further REST API failures (pipeline 422s and schema errors) were masked by the
URL bug and surfaced after E0. Root cause: `lib/config/config.js`
`updateGatewayConfig()` validates pipeline policies against the policies module
singleton, which was empty when only the admin REST server started without a full
gateway. Fix: `lib/rest/index.js` now calls `policies.load()` before mounting routes,
loading all built-in policies; `policyNames` exported from `lib/policies/index.js`.

#### E1 — CRUD Factory Refactor (design D4)

`lib/rest/routes/api-endpoints.js`, `service-endpoints.js`, and `pipelines.js` each
implemented the same four-method REST pattern differing only in their config key.
A new `lib/rest/routes/admin-route-factory.js` exports `createCrudRouter(configKey)`.
Each of the three files was reduced to a single line:
`module.exports = createCrudRouter('<key>')`. `lib/rest/index.js` mount calls
unchanged; no test files modified.

*Commits:* `33e5679`, `ad324fc`, `058f95e`, `ac9935d`, `ba87159`, `e57b50c`, `eff82e6`

---

### G4 Phase F — Runtime Alignment and Audit Remediation

#### F1 — Node 22 Runtime Alignment

The gateway was originally built for Node 10 (`FROM node:10-alpine` in both
Dockerfiles). All G4 work was verified on Node 24. The target runtime for the
submission is Node 22 LTS.

- `Dockerfile` and `Dockerfile-master`: `node:10-alpine` → `node:22-alpine`.
- `.circleci/config.yml`: replaced EOL `circleci/node:8/10/12-browsers` jobs with
  `cimg/node:20.x` and `cimg/node:22.x`; release job updated to `cimg/node:22.x`;
  test matrix is now `node-20` + `node-22` + `node-22-real-redis`.
- `package.json` `engines`: `>= 20.0.0` → `>=22.0.0`.

*Commit:* `43de43d`

#### F2 — Audit Remediation

Five critical advisories cleared by `npm overrides` pins (non-major fixes):
`@babel/traverse`, `form-data`, `handlebars`, `just-extend`, `nise`.

Seven critical advisories could not be cleared without major-version upgrades of
direct dependencies (`ejs`, `yeoman-generator`, `yeoman-test`, `puppeteer`). The
yeoman stack upgrade was attempted and triggered the abort condition: the API changes
between `yeoman-generator@3` / `yeoman-environment@2` and the required `@7`/`@4`
versions require rewriting `bin/environment.js` and all CLI generators — this exceeds
the mechanical call-site scope permitted under BOB-PROJECT-RULES.md Rule 1.

The yeoman stack migration and `puppeteer` major upgrade are identified as a G5
follow-on project. Full analysis: [`docs/baseline/security-disposition-f2.md`](../baseline/security-disposition-f2.md).

*Commits:* `7bddaf3`, `9968381`

---

## Key Root-Cause Stories

### The AES-256-GCM Migration

The gateway stored tokens and credentials by encrypting them with
`crypto.createCipher('aes256', key)` — an API that Node.js deprecated in v10 and
removed in v22. On Node 24, this threw `TypeError: crypto.createCipher is not a
function` on every write and read of the services layer, cascading into 64 direct
failures and approximately 40 more in OAuth flows and CLI tests that depended on
working credentials.

ADR U07 selected AES-256-GCM as the replacement for three reasons beyond mere API
compatibility: GCM is authenticated (detects tampering, unlike the old CBC mode),
uses a cryptographically random IV per call (prevents ciphertext reuse), and derives
the AES key via `scryptSync` (addresses the short-passphrase weakness). The output
format is `iv_hex + authtag_hex + ciphertext_hex` — a self-contained token that
carries its own IV. The old format (`ciphertext_hex` only) is explicitly incompatible,
requiring the migration script in `scripts/migrate-crypto.js` for live deployments
with existing stored tokens.

### The KD-002 Misdiagnosis and Correction

The G2 baseline recorded KD-002 as "Cannot find module 'yeoman-test/lib/adapter'" —
32 CLI test failures attributed to a missing Yeoman adapter module. This diagnosis
was accepted and scheduled for G3/G4 fix.

During Phase E, investigation revealed the module had always been importable
(`yeoman-test@1.9.1` ships `lib/adapter`). The actual failure was a config-singleton
isolation bug: prior REST API tests corrupted `require('../config')` by loading a YAML
without an `admin:` section, causing `rest()` to return `undefined` rather than a
Promise. The `known-defects.md` was corrected with the retraction in commit `33e5679`.

The fix (E0b) was entirely in `test/common/admin-helper.js`: supply an explicit
`DEFAULT_CONFIG` to guarantee a valid admin section, and publish the actual server URL
in `process.env.EG_ADMIN_URL` so CLI generators always reach the ephemeral port.

### The Admin Server IPv6 / Node 24 URL Fix

Node 24's resolver changed the behaviour of `localhost`: it now resolves to `::1`
(IPv6 loopback) rather than `127.0.0.1`. The admin REST server defaulted its bind
host to `'localhost'`, so it bound to `::1`. The test helper constructed the client
URL directly from `srvInfo.address`, producing `http://::1:PORT` — a URL that
`url.parse()` on Node 24 treated as the host `::1` with path `:PORT/...`, routing
every request to a non-existent path. The result was 28 REST API 404s and a Node 24
deprecation warning on every test run.

The two-part fix: default the admin bind host to `'127.0.0.1'` in `lib/rest/index.js`
so the server uses IPv4, and add IPv6 bracket notation in `admin-helper.js` as a
defensive fallback for any future IPv6 binding. Together, KD-003 (28 failures) and
the newly surfaced KD-003a (6 failures) were fully resolved.

---

## Independent Validation

After the modernization was complete, the full diff against upstream
(`a294cac..HEAD`) was independently reviewed by **Muse Wonder** (Meta) — a
different AI system from the IBM Bob agent that authored the changes — acting as
a second, adversarial reviewer alongside GitHub Copilot's PR review.

**Verdict: sound.** No critical or high-severity findings.

What the review verified:

- The AES-256-GCM replacement is implemented correctly: random 96-bit IV per
  message, auth tag stored and verified on decryption, and legacy ciphertext
  rejected with a coded error that points operators at the migration script.
- The data migration's coverage is complete: `tokenEncrypted` is the only
  encrypted field in the codebase, and the script's Redis scan patterns match
  `token.dao.js`'s real key formats — the same pattern class Copilot's P1
  finding corrected in PR #2, now guarded by regression tests.
- The admin-route CRUD factory refactor is behavior-identical to the three
  original route files (status codes and update semantics compared
  line-by-line).
- Test integrity: no test was skipped, `only`-ed, or weakened anywhere in the
  diff; the characterization suite is exactly 31 substantive behavior tests.
- The ESLint exemption for the removed crypto APIs was deleted, so the lint
  gate now actively forbids them.

The review recorded five medium/low findings, all accepted as documented
trade-offs rather than defects: JWT algorithm acceptance narrows to RS256/HS256
unless operators configure `algorithms` explicitly (a jsonwebtoken v9
requirement); the default scrypt salt is a known constant unless
`EG_CRYPTO_SCRYPT_SALT` is set per installation; scrypt key derivation runs on
every encrypt/decrypt call; issued credential IDs changed from base62 to
standard UUID format at equal entropy; and the migration script hardcodes the
legacy cipher and must run with gateway writes quiesced.

As part of the review, the gates were re-run independently from a fresh clone:
ESLint clean on `lib/` and `scripts/`, and the migration-script and
characterization suites passed 42/42.
