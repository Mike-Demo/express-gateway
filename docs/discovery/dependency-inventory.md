# Dependency Inventory — express-gateway v1.16.10

**npm audit result:** 88 vulnerabilities — 14 critical, 38 high, 22 moderate, 14 low  
**Audit date:** 2025 (Node 24.21.0 environment)

---

## Runtime Direct Dependencies (flagged items)

| Package | Declared Version | Installed | Status | Notes |
|---|---|---|---|---|
| **express** | `^4.17.1` | 4.x | 🔴 VULNERABLE | Body-parser DoS, `qs` prototype pollution, `cookie` OOB chars, `path-to-regexp` ReDoS, `send` template injection, `serve-static`. Many high/critical advisories. |
| **jsonwebtoken** | `^8.5.1` | 8.5.1 | 🔴 VULNERABLE + RISKY | Critical: signature validation bypass (GHSA-qwph-4952-7xr6), HMAC/RSA confusion (GHSA-hjrf-2m68-5959), unrestricted key type (GHSA-8cf7-32gw-wr33). Direct runtime dep for JWT auth. |
| **passport** | `^0.4.0` | 0.4.x | 🟡 VULNERABLE | Moderate: session regeneration on login/logout (GHSA-v923-w3x8-wh69). Breaking fix in 0.6.0. |
| **ejs** | `^2.7.1` | 2.x | 🔴 VULNERABLE | Critical: template injection (GHSA-phwq-j96m-2c2q), prototype pollution (GHSA-ghr5-ch3p-vcr6). Used by Yeoman generators. Fix requires v3.x breaking upgrade. |
| **express-session** | `^1.16.2` | 1.x | 🟡 VULNERABLE | Depends on vulnerable `cookie` and `on-headers`. |
| **ioredis** | `^4.14.0` | 4.x | 🟡 DEPRECATED | ioredis v4 is EOL; v5 is current stable. Depends on vulnerable `debug`. |
| **ioredis-mock** | `^4.16.3` | 4.x | 🟡 VULNERABLE | Depends on `fengari` which depends on vulnerable `tmp` and `sprintf-js`. |
| **ajv** | `^6.10.2` | 6.x | 🟡 VULNERABLE | Moderate: prototype pollution (GHSA-v88g-cgmw-v5xw), ReDoS with `$data` option. AJV v6 is EOL (v8 is current). |
| **express-rate-limit** | `^2.14.2` | 2.x | 🔴 DEPRECATED/OBSOLETE | v2 is ancient; current stable is v7. No known CVEs listed but entirely unmaintained. |
| **rate-limit-redis** | `^1.6.0` | 1.x | 🟡 RISKY | Depends on redis@2-3 (see `redis` entry below). |
| **proxy-agent** | `^4.0.1` | 4.x | 🔴 VULNERABLE | High: `@tootallnate/once` incorrect control flow, `pac-resolver` code injection via `degenerator`, `ip` SSRF. Breaking fix at v8. |
| **superagent** | `^5.1.0` | 5.x | 🟡 VULNERABLE | Depends on vulnerable `debug`, `form-data`, `qs`. |
| **uuid** | `^3.3.3` | 3.x | 🟡 VULNERABLE | Moderate: missing buffer bounds check in v3/v5/v6 (GHSA-w5hq-g745-h8pq). Current: v11. Breaking change to upgrade. |
| **uuid62** | `1.0.1` | 1.0.1 | 🔴 VULNERABLE | High: depends on vulnerable `base-x` (homograph attack, GHSA-xq7p-g2vc-g82p) and vulnerable `uuid`. |
| **yawn-yaml** | `1.4.0` | 1.4.0 | 🟡 RISKY | Unmaintained (last publish 2018). Used for config CRUD. No known CVEs. |
| **minimatch** | `^3.0.4` | 3.x | 🔴 VULNERABLE | High: multiple ReDoS vulnerabilities (GHSA-f8q6-p94x-37v3 and others). Direct dep for `hostMatch` condition. |
| **js-yaml** | `^3.13.1` | 3.x | 🔴 VULNERABLE | High: prototype pollution in merge keys (GHSA-mh29-5h37-fv8m), multiple quadratic CPU DoS. Used for all config parsing. v3 EOL; v4 has breaking API changes. |
| **lodash.flatmap** | `^4.5.0` | 4.x | 🟡 VULNERABLE | High: command injection, prototype pollution via template and path functions (GHSA-35jh-r3h4-6jhm, et al). `lodash` transitive dep flagged. |
| **yeoman-environment** | `^2.4.0` | 2.x | 🔴 VULNERABLE | Multiple transitive CVEs: `braces`, `globby`, `inquirer`, `debug`. v2 EOL. |
| **yeoman-generator** | `^3.2.0` | 3.x | 🔴 VULNERABLE | Multiple transitive CVEs. Depends on vulnerable `github-username` → `gh-got` → `got`. |
| **connect-ensure-login** | `0.1.1` | 0.1.1 | 🟡 RISKY | Pinned at very old version; unmaintained. |
| **semver** | `^6.3.0` | 6.x | 🟡 VULNERABLE | High: ReDoS (GHSA-c2qf-rxjj-qqgw). Direct dep used for plugin version checks. |
| **vhost** | `3.0.2` | 3.0.2 | 🟡 RISKY | Pinned; last updated 2015. No known CVEs but unmaintained. |
| **find-up** | `^3.0.0` | 3.x | 🟡 OUTDATED | Current is v7; v3 is ES-modules incompatible. No known CVEs. |
| **form-urlencoded** | `^4.0.0` | 4.x | ⬜ | No known CVEs. |
| **json-schema-ref-parser** | `^7.1.1` | 7.x | 🟡 RISKY | Used in credential service at require time. Deprecated in favour of `@apidevtools/json-schema-ref-parser`. |
| **parent-require** | `^1.0.0` | 1.0.0 | 🟡 RISKY | Unmaintained (last publish 2015). Used for plugin loading when EG is loaded as a library. |
| **color-convert** | `^1.9.3` | 1.x | ⬜ | Transitive; no known CVEs. |
| **chalk** | `^2.4.2` | 2.x | 🟡 OUTDATED | v4+ is current; v2 uses CommonJS only. No CVEs. |
| **chokidar** | `^3.0.2` | 3.x | 🟡 VULNERABLE | Depends on vulnerable `braces`, `glob-parent`. |

---

## Node.js API Incompatibilities (Node 22+)

| API | File | Status |
|---|---|---|
| `crypto.createCipher` | `lib/services/utils.js:20` | **Removed in Node 22** — causes 127 test failures |
| `crypto.createDecipher` | `lib/services/utils.js:25` | **Removed in Node 22** — same |
| `url.parse` | (ESLint ignoreModuleItems) | Deprecated since Node 11; not yet removed but flagged |
| `uuid/v4` (sub-path import) | `lib/services/tokens/token.service.js:3`, `lib/services/credentials/credential.service.js:2` | **Broken on uuid v3**; subpath imports removed in later uuid versions |

> ESLint `.eslintrc` explicitly allows `crypto.createCipher`, `crypto.createDecipher`, and `url.parse` via `node/no-deprecated-api` `ignoreModuleItems` — these suppressions must be removed during modernization.

---

## Dev Dependency Risks (affect CI/test pipeline)

| Package | Version | Issue |
|---|---|---|
| **mocha** | `^6.2.0` | 6.x is EOL; depends on vulnerable `debug`, `js-yaml`, `minimatch`, `diff`. Current: v10. |
| **nyc** | `^14.1.1` | Depends on vulnerable `cross-spawn`, `foreground-child`, `spawn-wrap`, `uuid`, `semver`. |
| **eslint** | `^6.3.0` | 6.x EOL; depends on vulnerable `flatted`→`flat-cache`, `inquirer`, `glob-parent`, `ansi-regex`. Current: v9. |
| **puppeteer** | `^1.19.0` | 1.x critically vulnerable via `extract-zip` (path traversal). Used only for OAuth implicit flow e2e. Current: v22. |
| **sinon** | `^7.4.2` | Transitive: vulnerable `just-extend` (prototype pollution) via `nise`. |
| **husky** | `^3.0.5` | v3 EOL. `install` script blocked by npm's `allowScripts` policy. |

---

## Summary by Severity

| Severity | Count | Key Runtime-Affecting Packages |
|---|---|---|
| 🔴 Critical | 14 | `ejs`, `handlebars` (transitive), `form-data` (transitive), `extract-zip` (puppeteer), `minimist` (transitive), `proxy-addr`, `just-extend` (transitive) |
| 🔴 High | 38 | `jsonwebtoken`, `express` chain (`body-parser`, `qs`, `path-to-regexp`, `send`), `js-yaml`, `minimatch`, `proxy-agent` chain, `uuid62`/`base-x`, `semver`, `ws`, `async` (transitive) |
| 🟡 Moderate | 22 | `ajv`, `passport`, `follow-redirects`, `cookiejar`, `got`, `yargs-parser`, `sprintf-js` |
| ⚪ Low | 14 | Various transitive |

**Runtime-critical vulnerabilities** (in packages directly on the request path): `express`, `jsonwebtoken`, `passport`, `qs`, `js-yaml`, `minimatch`, `proxy-agent`, `uuid62`.
