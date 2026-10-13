# Dependency Disposition Table — express-gateway v1.16.10

**Sources:** `docs/discovery/dependency-inventory.md`, `docs/plan/targets.md`  
**Upstream status:** Project deprecated — no patches will be issued (R10). Every disposition must account for this.

Disposition codes:
- **AUTO** — `npm install <pkg>@<version>` with no source changes; safe within semver range
- **CODE** — version upgrade requires source code changes (API breaks, removed APIs, import changes)
- **REVIEW** — requires investigation before a disposition can be confirmed
- **DEFER** — not in scope for G4; explicitly deferred with reason

---

## Runtime Dependencies

| Package | Current | Vulnerability / Breakage | Proposed Action | Reason |
|---|---|---|---|---|
| **express** | `^4.17.1` | GHSA-qwcr-r2fm-qrc7, GHSA-v422-hmwv-36x6, GHSA-pxg6-pf52-xh8x, GHSA-9wv6-86v2-598j, GHSA-hrpp-h998-j3pp, GHSA-m6fv-jmcg-4jfg | **AUTO** → `^4.21.x` | All fixes are within the `^4.x` semver range. `npm audit fix` resolves. Validate Journey A and Journey B after update. |
| **jsonwebtoken** | `^8.5.1` | GHSA-qwph-4952-7xr6 (sig bypass), GHSA-hjrf-2m68-5959 (HMAC/RSA confusion), GHSA-8cf7-32gw-wr33 (key type) | **CODE** → `^9.0.0` | v9 removes `algorithm:none` support; callers in `lib/policies/jwt/jwt.js` must pass explicit `algorithms` array. Schema already has `algorithms` field. Must test JWT policy journeys post-upgrade. |
| **passport** | `^0.4.0` | GHSA-v923-w3x8-wh69 (session fixation) | **CODE** → `^0.7.0` | Breaking: `req.user` population in session contexts changed in v0.6. `lib/gateway/actionParams.js:getCommonAuthCallback()` must be validated. All four auth policies (Cluster D1) need regression test. |
| **ejs** | `^2.7.1` | GHSA-phwq-j96m-2c2q (template injection), GHSA-ghr5-ch3p-vcr6 (prototype pollution) | **CODE** → `^3.1.10` | v3 changes template rendering API (affects Yeoman generators in `bin/`). Must test all `eg` CLI generators. |
| **express-session** | `^1.16.2` | Depends on vulnerable `cookie`, `on-headers` | **AUTO** → `^1.18.1` | Patch within semver range. |
| **ioredis** | `^4.14.0` | EOL; transitive `debug` CVE | **CODE** → `^5.3.0` | v5 has Promise resolution changes for some commands. All DAO files (Cluster D3: `credential.dao.js`, `token.dao.js`, `user.dao.js`, `application.dao.js`) must be validated. |
| **ioredis-mock** | `^4.16.3` | Transitive `fengari`/`tmp`/`sprintf-js` CVEs | **AUTO** → latest compatible with ioredis v5 | ioredis-mock must match ioredis major version. Check ioredis-mock v5 release. |
| **ajv** | `^6.10.2` | GHSA-v88g-cgmw-v5xw (prototype pollution), ReDoS | **DEFER** | v8 has breaking schema API changes affecting every policy, condition, config schema, and plugin. Full program workstream required. Not in G4 scope. |
| **express-rate-limit** | `^2.14.2` | Unmaintained (2016); no CVE but no security maintenance | **CODE** → `^7.x` — **DEFER** to G5 | v7 has breaking store interface. Not on critical journey path. Deferred. |
| **rate-limit-redis** | `^1.6.0` | Depends on `redis@2-3` (vulnerable) | **CODE** → `^4.x` — **DEFER** with express-rate-limit | Must upgrade in lockstep with express-rate-limit. Deferred. |
| **proxy-agent** | `^4.0.1` | GHSA-9j49-mfvp-vmhm (code injection), GHSA-2p57-rm9w-gvfp (SSRF) | **CODE** → `^6.3.0` | v6 API is compatible with v4 usage in `lib/policies/proxy/proxy.js`. v8 would require more changes; start at v6. |
| **superagent** | `^5.1.0` | Transitive `debug`, `form-data`, `qs` CVEs | **AUTO** → `^8.1.0` | Used in `lib/schemas/index.js` (remote schema loading) and `admin/client.js`. v8 is API-compatible for these use cases. |
| **uuid** | `^3.3.3` | GHSA-w5hq-g745-h8pq (buffer bounds) | **CODE** → `^9.0.0` | Sub-path import `require('uuid/v4')` removed in v4+. Two files must change: `lib/services/tokens/token.service.js:3`, `lib/services/credentials/credential.service.js:2`. U11. |
| **uuid62** | `1.0.1` | GHSA-xq7p-g2vc-g82p (homograph attack via `base-x`) | **CODE** → remove, replace | `lib/gateway/context.js` uses `uuid62.v4()` for requestID. Replace with `uuid` v9 + simple base62 utility or plain UUID string. |
| **minimatch** | `^3.0.4` | GHSA-f8q6-p94x-37v3, GHSA-3ppc-4f35-3m26 (ReDoS) | **AUTO** → `^3.1.2` | Patch within v3 range. One call site: `lib/conditions/predefined.js:hostMatch`. |
| **js-yaml** | `^3.13.1` | GHSA-mh29-5h37-fv8m (prototype pollution), quadratic CPU DoS | **CODE** → `^4.1.0` | `yaml.safeLoad()` renamed to `yaml.load()` (v4 `load()` is safe by default). Call sites in `lib/config/config.js` use `yaml.load()` — must verify each is the v4-safe variant, not the v3-unsafe one. `yawn-yaml` compatibility unknown post-upgrade (U08). |
| **semver** | `^6.3.0` | GHSA-c2qf-rxjj-qqgw (ReDoS) | **AUTO** → `^7.5.4` | One call site: `lib/plugins.js`. v7 is drop-in compatible. |
| **chokidar** | `^3.0.2` | Transitive `braces`, `glob-parent` | **AUTO** → `^3.6.0` | Within v3 range. |
| **lodash.flatmap** | `^4.5.0` | GHSA-35jh-r3h4-6jhm (command injection) | **CODE** → remove, replace with `[].flatMap()` | Native `Array.prototype.flatMap()` available Node 11+. One call site: `lib/gateway/pipelines.js:configurePipeline()`. Zero-dependency replacement. |
| **superagent-logger** | `^1.1.0` | No CVE | **REVIEW** | Used in admin client. Verify still maintained; consider removing if not needed. |
| **superagent-prefix** | `0.0.2` | No CVE | **REVIEW** | Used in admin client. Last published 2015. Evaluate whether it can be inlined. |
| **yeoman-environment** | `^2.4.0` | Multiple transitive CVEs; KD-002 | **CODE** → `^3.19.3` | Requires coordinated upgrade with yeoman-generator. Fixes KD-002. |
| **yeoman-generator** | `^3.2.0` | Transitive CVEs | **CODE** → `^5.10.0` | In lockstep with yeoman-environment. Breaking generator API changes — all generators in `bin/generators/` must be updated. |
| **json-schema-ref-parser** | `^7.1.1` | Package deprecated | **CODE** → `@apidevtools/json-schema-ref-parser ^11.x` | Import path changes. One call site: `lib/services/credentials/credential.service.js`. |
| **yawn-yaml** | `1.4.0` | Unmaintained | **REVIEW** after js-yaml upgrade | If broken by js-yaml v4, replace the write path with `yaml.dump()` + `fs.writeFile()`. |
| **connect-ensure-login** | `0.1.1` | Unmaintained | **REVIEW** | Used in OAuth2 routes. Evaluate removal during passport upgrade. |
| **chalk** | `^2.4.2` | Outdated | **AUTO** → `^4.1.2` | No CVEs. Low priority but keeps dependency tree current. |
| **find-up** | `^3.0.0` | Outdated | **AUTO** → `^5.0.0` | v5 is last CJS-compatible version. No CVEs. Low priority. |
| **parent-require** | `^1.0.0` | Unmaintained (2015) | **REVIEW** → remove if U13 resolved | Only used in library-load path. If never exercised, remove to reduce surface. |
| **vhost** | `3.0.2` | Unmaintained (last update 2015) | **REVIEW** | Core to routing. No CVEs but no maintenance. Cannot safely auto-upgrade; must test vhost routing after any change. |
| **form-urlencoded** | `^4.0.0` | No CVE | **AUTO** if newer version available | Low priority. |
| **clone** | `^2.1.2` | No CVE | **REVIEW** | Used in proxy policy. Evaluate whether `structuredClone()` (Node 17+) can replace it. |
| **http-proxy** | `^1.18.0` | No direct CVE | **REVIEW** | Core to proxy policy. Last major release 2019. Watch for issues on Node 24. |
| **oauth2orize** | `^1.11.0` | No direct CVE | **REVIEW** | Core to OAuth2 policy. Evaluate whether maintained. |
| **bcryptjs** | `^2.4.3` | No CVE | **AUTO** if newer | Used for password hashing in `lib/services/utils.js:saltAndHash()`. Not affected by KD-001. |
| **color-convert** | `^1.9.3` | Transitive | **AUTO** | No direct CVE. |
| **form-data** | transitive | GHSA-fjxv-7rqg-78g4, GHSA-hmw2-7cc7-3qxx | **AUTO** (resolved by superagent upgrade) | Fixed by upgrading superagent. |
| **follow-redirects** | transitive | GHSA-pw2r-vq6v-hr8c, GHSA-cxjh-pqwp-8mfp | **AUTO** (resolved by superagent/proxy-agent upgrade) | Fixed by upgrading dependents. |
| **path-to-regexp** | transitive | GHSA-9wv6-86v2-598j (ReDoS) | **AUTO** (resolved by express upgrade) | Fixed within express semver range. |
| **cookie** | transitive | GHSA-pxg6-pf52-xh8x | **AUTO** (resolved by express/express-session upgrade) | Fixed within semver range. |
| **on-headers** | transitive | GHSA-76c9-3jph-rj3q | **AUTO** (resolved by express-session upgrade) | Fixed within semver range. |
| **proxy-addr** | transitive | GHSA-jqcg-44mw-7w3h (IP spoofing) | **AUTO** (resolved by express upgrade) | Fixed within semver range. |

---

## Dev Dependencies

| Package | Current | Vulnerability | Proposed Action | Reason |
|---|---|---|---|---|
| **mocha** | `^6.2.0` | Transitive `debug`, `js-yaml`, `minimatch` | **AUTO** → `^10.7.0` | v10 is current stable; within test infra; no production impact. |
| **nyc** | `^14.1.1` | Transitive CVEs | **AUTO** → `^15.1.0` | Last stable nyc; consider c8 as future replacement. |
| **eslint** | `^6.3.0` | Transitive `flatted`, `inquirer` | **AUTO** → `^8.57.0` | Stay on v8 (last with `.eslintrc`); v9 requires config format migration. |
| **puppeteer** | `^1.19.0` | GHSA-jmr9-qjv8-65gv (critical path traversal) | **CODE** → remove if U10 confirmed | If only used for OAuth implicit flow e2e test, replace with supertest-based test and remove. |
| **sinon** | `^7.4.2` | Transitive `just-extend` prototype pollution | **AUTO** → `^17.0.0` | API-compatible upgrade. |
| **husky** | `^3.0.5` | EOL; blocked by npm `allowScripts` | **AUTO** → `^8.0.3` | v8 uses different install mechanism (`.husky/` directory). |
| **yeoman-test** | (version in use) | `yeoman-test/lib/adapter` missing (KD-002) | **CODE** → version matching yeoman-environment v3 | KD-002 fix. Must match major version of yeoman-environment. |
| **cpr** | `^3.0.1` | No CVE | **REVIEW** | Used in test helpers to copy fixture directories. |
| **find-free-port** | `2.0.0` | No CVE | **REVIEW** | Used in `test/common/server-helper.js`. Pinned at exact version. |

---

## Disposition Summary

| Action | Count | Notes |
|---|---|---|
| **AUTO** | ~18 | Safe within semver range; no source changes |
| **CODE** | ~12 | Require source changes; must be tested individually |
| **REVIEW** | ~10 | Need investigation before disposition confirmed |
| **DEFER** | 2 | ajv v8, express-rate-limit v7 — explicit deferral with reasons |

**"Upgrade automatically" is rare** because upstream abandonment (R10) means there is no safety net: if an auto-upgrade breaks runtime behaviour, it must be caught by the regression checklist (`docs/baseline/regression-checklist.md`), not by the upstream maintainer. Every AUTO upgrade must be followed by a full regression run.
