# Target Runtime and Framework Versions — express-gateway v1.16.10

**Sources:** `docs/discovery/dependency-inventory.md`, `docs/discovery/risk-register.md`, `docs/discovery/technology-inventory.md`

Every target version below has an explicit rationale. No version is proposed without a reason traceable to a CVE, a Node 22 removal notice, or a behavioural risk documented in G1/G2.

---

## Runtime

| Component | Current | Target | Rationale |
|---|---|---|---|
| **Node.js** | `>= 8.3.0` (engines field); CI tests Node 8/10/12 | **Node 20 LTS** (minimum), with Node 22 as stretch | Node 22 removes `crypto.createCipher` (KD-001). Node 20 is the current LTS with `crypto.createCipher` already removed. Target must be ≥ 20. Node 18 reached EOL April 2025. U02 is operator decision; Node 20 LTS is the conservative choice. |
| **Dockerfile base** | `node:10-alpine` (EOL Oct 2021) | `node:20-alpine` | Node 10 is EOL. Must match target runtime. (U12) |

---

## Direct Runtime Dependencies

| Package | Current | Target | Rationale |
|---|---|---|---|
| **express** | `^4.17.1` | `^4.21.x` (latest 4.x) | Body-parser DoS (GHSA-qwcr-r2fm-qrc7), `cookie` OOB (GHSA-pxg6-pf52-xh8x), `path-to-regexp` ReDoS (GHSA-9wv6-86v2-598j), `qs` prototype pollution (GHSA-hrpp-h998-j3pp), `send` template injection (GHSA-m6fv-jmcg-4jfg). Stay on 4.x to avoid Express 5 migration risk. `npm audit fix` handles most within semver range. |
| **jsonwebtoken** | `^8.5.1` | `^9.0.0` | Three critical CVEs: GHSA-qwph-4952-7xr6 (signature bypass), GHSA-hjrf-2m68-5959 (HMAC/RSA confusion), GHSA-8cf7-32gw-wr33 (unrestricted key type). R02 in risk register. v9 is a breaking change: `algorithm: none` verification removed; callers in `lib/policies/jwt/jwt.js` must explicitly pass `algorithms` array. `lib/policies/jwt/index.js` schema already includes `algorithms` field — API is prepared. |
| **passport** | `^0.4.0` | `^0.7.0` | GHSA-v923-w3x8-wh69 (session fixation). Fix landed in 0.6.0. Target 0.7.x for latest stable. Breaking change: `req.user` behaviour on session restore changes — `getCommonAuthCallback` in `lib/gateway/actionParams.js` must be validated against all four auth policies (Cluster D1 in `docs/plan/analysis.md`). |
| **js-yaml** | `^3.13.1` | `^4.1.0` | GHSA-mh29-5h37-fv8m (prototype pollution), multiple quadratic CPU DoS. R04 in risk register. Breaking change: `yaml.safeLoad()` renamed to `yaml.load()` (the v3 `yaml.load()` is the unsafe variant — v4 unifies them safely). All call sites in `lib/config/config.js` and `test/common/` use `yaml.load()` — must verify each call site uses the safe v4 API. |
| **minimatch** | `^3.0.4` | `^3.1.2` or `^9.0.0` | Multiple ReDoS vulnerabilities (GHSA-f8q6-p94x-37v3, GHSA-3ppc-4f35-3m26). Used in `lib/conditions/predefined.js:hostMatch`. Within v3 range: `3.1.2` is the patched minor. Major upgrade to v9 would require testing `hostMatch` condition against the new API. |
| **ioredis** | `^4.14.0` | `^5.3.0` | v4 is EOL. v5 is stable. Generally compatible but some Promise resolution changes. Affects all DAO files (Cluster D3). R18. |
| **ajv** | `^6.10.2` | **Deferred — see below** | v8 has breaking schema API changes affecting every policy schema, condition schema, config schema, and plugin integration. Full migration required (R16). This is a standalone workstream, not bundled with any other upgrade. |
| **express-rate-limit** | `^2.14.2` | `^7.x` | v2 is unmaintained (2016). Current stable v7 has breaking API changes (constructor signature, store interface). `lib/policies/rate-limit/` must be updated. R14. |
| **proxy-agent** | `^4.0.1` | `^6.3.0` | GHSA-9j49-mfvp-vmhm (`pac-resolver` code injection), GHSA-2p57-rm9w-gvfp (SSRF). R07. v6 is the last version with a compatible API; v8 has major breaking changes. Start at v6, validate `lib/policies/proxy/proxy.js` ProxyAgent usage. |
| **uuid** | `^3.3.3` | `^9.0.0` | GHSA-w5hq-g745-h8pq (buffer bounds). Breaking change: named exports replace sub-path imports. `require('uuid/v4')` → `require('uuid').v4`. Two files affected: `lib/services/tokens/token.service.js:3` and `lib/services/credentials/credential.service.js:2` (U11, Cluster D2). |
| **uuid62** | `1.0.1` | **Remove or replace** | GHSA-xq7p-g2vc-g82p (homograph attack via `base-x`). R08. `uuid62` generates `requestID` in `lib/gateway/context.js`. Replacement: use `uuid` v9 + base62 encoding via a one-line utility, or switch requestID to a standard UUID string (no base62 needed for operational identity). |
| **semver** | `^6.3.0` | `^7.5.4` | GHSA-c2qf-rxjj-qqgw (ReDoS). Used in `lib/plugins.js` for plugin version checks. v7 is a drop-in replacement within semver range. |
| **chokidar** | `^3.0.2` | `^3.6.0` | Transitive: `braces` and `glob-parent` CVEs. Within v3 range — patch upgrade. |
| **lodash.flatmap** | `^4.5.0` | **Replace with native** | GHSA-35jh-r3h4-6jhm (command injection via template). Used in `lib/gateway/pipelines.js:configurePipeline()` to flatten middleware arrays. Native `[].flatMap()` is available in Node 11+. Zero-dependency replacement. |
| **superagent** | `^5.1.0` | `^8.1.0` | Transitive CVEs in `debug`, `form-data`, `qs`. Used in `lib/schemas/index.js` for remote schema loading and in `admin/client.js`. v8 drops IE support but is otherwise API-compatible. |
| **express-session** | `^1.16.2` | `^1.18.1` | Depends on vulnerable `cookie` and `on-headers`. Within semver range — patch upgrade. |
| **ejs** | `^2.7.1` | `^3.1.10` | GHSA-phwq-j96m-2c2q (template injection), GHSA-ghr5-ch3p-vcr6 (prototype pollution). Used only by Yeoman generators in `bin/`. v3 has breaking changes for Yeoman template syntax — must test all generators. R05. |
| **yeoman-environment** | `^2.4.0` | `^3.19.3` | Multiple transitive CVEs. v3 requires yeoman-generator v5+. Requires coordinated upgrade with yeoman-generator. KD-002. |
| **yeoman-generator** | `^3.2.0` | `^5.10.0` | Transitive CVEs; required by yeoman-environment v3. Breaking: generator API changes. KD-002. |
| **json-schema-ref-parser** | `^7.1.1` | `@apidevtools/json-schema-ref-parser ^11.x` | Package renamed; v7 is deprecated. Used in `lib/services/credentials/credential.service.js`. Breaking import path change. |
| **yawn-yaml** | `1.4.0` | **Evaluate after js-yaml upgrade** | Unmaintained. Depends on js-yaml internals (R20, U08). After js-yaml v4 upgrade, test whether yawn-yaml still works; if not, replace the write path in `config.updateGatewayConfig()` with plain `yaml.dump()` + `fs.writeFile()`. |
| **connect-ensure-login** | `0.1.1` | **Keep pinned or remove** | Used only in OAuth2 routes. No known CVEs. Evaluate whether it can be removed when OAuth2 is audited. |
| **chalk** | `^2.4.2` | `^4.1.2` | Outdated; v4 adds ES module compatibility. v4 is still CommonJS-compatible. Low priority — no CVEs. |
| **find-up** | `^3.0.0` | `^5.0.0` | Outdated; v6+ is ESM-only. v5 is the last CJS-compatible version. No CVEs — low priority. |
| **parent-require** | `^1.0.0` | **Evaluate removal** | Unmaintained (2015). Used in `lib/plugins.js` for library-mode plugin loading. If U13 confirms it is unused in practice, remove. |

---

## Dev Dependencies

| Package | Current | Target | Rationale |
|---|---|---|---|
| **mocha** | `^6.2.0` | `^10.7.0` | 6.x EOL; depends on vulnerable `debug`, `js-yaml`, `minimatch`. v10 is the current stable. KD-002 fix requires newer yeoman-test which may need newer mocha. |
| **nyc** | `^14.1.1` | `^15.1.0` | Transitive CVEs. v15 is the last stable version of nyc; the project has largely moved to c8. Consider c8 as alternative. |
| **eslint** | `^6.3.0` | `^8.57.0` | 6.x EOL. v9 has a breaking flat config format — stay on v8 (last version with `.eslintrc` support) to avoid simultaneous ESLint config migration. |
| **puppeteer** | `^1.19.0` | **Remove if U10 confirmed** | 1.x critically vulnerable (GHSA-jmr9-qjv8-65gv). Used only for OAuth implicit flow e2e. If U10 confirms it's only used in one test file, replace those tests with supertest-based alternatives and remove puppeteer. |
| **sinon** | `^7.4.2` | `^17.0.0` | Transitive `just-extend` prototype pollution. v17 is current stable. Check for sinon API changes in test files. |
| **husky** | `^3.0.5` | `^8.0.3` | v3 EOL; `install` script blocked by npm's `allowScripts` policy (seen in G1). v8 has different install mechanism. |

---

## Deferred Version Changes

| Package | Target | Reason for Deferral |
|---|---|---|
| **ajv** | `^8.x` | R16. Breaking API changes affect every schema consumer (all policies, conditions, config, plugins). This is a full-program workstream requiring its own ADR. Deferred to a dedicated stage after G4. |
| **express-rate-limit** | `^7.x` | R14. Store interface change breaks `lib/policies/rate-limit/`. Not on the critical journey path; deferred to G4 or G5. |
| **proxy-agent** | `^8.x` | R07. v8 has major breaking changes beyond v6. Start with v6 in G4; v8 upgrade planned post-G4. |
| **yawn-yaml** | Replacement | R20, U08. Cannot be determined until js-yaml v4 is installed and tested. |
