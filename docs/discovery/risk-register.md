# Risk Register — express-gateway v1.16.10 Modernization

| ID | Risk | Likelihood | Impact | Notes |
|---|---|---|---|---|
| R01 | **Node API removal breaks services layer** | 🔴 Certain (already broken) | 🔴 Critical | `crypto.createCipher`/`createDecipher` removed in Node 22. `lib/services/utils.js` encrypt/decrypt fail on Node 24. 127/484 unit tests fail. All token, credential, and OAuth flows affected in production on modern Node. |
| R02 | **`jsonwebtoken` ≤ 8.5.1 signature bypass** | 🔴 High | 🔴 Critical | Three published CVEs including signature validation bypass and HMAC/RSA key confusion. JWT policy is a core auth mechanism. Upgrade to ≥9.0.0 is breaking (no `algorithm: none` fallback). |
| R03 | **88 npm vulnerabilities, 14 critical** | 🔴 High | 🔴 Critical | Critical vulns in `express`, `ejs`, `proxy-addr`, `form-data`, `minimist`, `handlebars`, `extract-zip`. Several are on the live request path. `npm audit fix --force` would install breaking-change versions of multiple packages. |
| R04 | **`js-yaml` v3 prototype pollution + DoS** | 🟡 Medium | 🔴 Critical | Config files are parsed by `js-yaml` v3 on every hot-reload and at startup. Prototype pollution via YAML merge keys is exploitable if config comes from untrusted input. Upgrade to v4 requires API changes (`.safeLoad` removed). |
| R05 | **`ejs` template injection (Yeoman generators)** | 🟡 Medium | 🔴 Critical | `ejs` < 3.1.10 has critical template injection. Used by Yeoman generators (`bin/generators/`). Not on the live request path, but present in the gateway process. |
| R06 | **No test coverage for Node 24** | 🔴 Certain | 🟡 High | CircleCI config targets Node 8/10/12 only. No CI gating against current LTS. Test failures are discovered only at runtime or manually. |
| R07 | **`proxy-agent` v4 SSRF + code injection** | 🟡 Medium | 🔴 Critical | `pac-resolver` code injection (GHSA-9j49-mfvp-vmhm), `ip` SSRF (GHSA-2p57-rm9w-gvfp). The `proxy` policy can route through an intermediate proxy; if `proxyUrl` is user-controlled, this is exploitable. Breaking fix requires v8+. |
| R08 | **`uuid62` homograph attack** | 🟡 Medium | 🟡 High | `base-x` vulnerability allows lookalike Unicode characters to bypass base-62 validation. `uuid62` generates `requestID` on every request. |
| R09 | **`crypto.createCipher` is not authenticated encryption** | 🔴 Certain | 🟡 High | Even before removal: `createCipher` (non-IV version) is insecure by design — it uses a static IV and no authentication. Token encryption in `lib/services/utils.js` uses this. All stored credentials and tokens are encrypted with a broken scheme. |
| R10 | **Upstream abandonment** | 🔴 Certain | 🟡 High | Project is deprecated with no active maintainers. No security patches will come from upstream. All fixes must be in-house. |
| R11 | **Plugin API surface coupling** | 🟡 Medium | 🟡 High | External plugins depend on `PluginContext` interface and `index.d.ts` types. Any refactor of `lib/plugins.js`, `lib/policies/index.js`, or `ActionParams` is a breaking change for plugin consumers. Extent of downstream plugin usage unknown. |
| R12 | **No drain on hot-reload** | 🟡 Medium | 🟡 Medium | When the pipeline router is rebuilt on hot-reload, in-flight requests on the old router are not drained. Under high traffic this causes mid-request 404s or connection resets. |
| R13 | **`vm.runInNewContext` in egContext** | 🟡 Medium | 🟡 High | `egContext.run()` and `match()` use `vm.runInNewContext` to execute arbitrary JS expressions. Node's `vm` module is not a security boundary. If expression conditions or request-transformer policies accept user-supplied expressions, RCE is possible. |
| R14 | **`express-rate-limit` v2 is very old** | 🟡 Medium | 🟡 Medium | v2 (2016) has no maintained security support. Rate-limit bypass techniques may exist. Current stable is v7. Breaking upgrade. |
| R15 | **`passport` session fixation** | 🟡 Medium | 🟡 Medium | `passport < 0.6.0` does not regenerate session on login/logout (GHSA-v923-w3x8-wh69). Session fixation attacks possible. Fix is breaking (changes `req.user` access patterns). |
| R16 | **AJV v6 EOL** | 🟡 Medium | 🟡 Medium | AJV v6 is EOL; v8+ has breaking API changes (no `coerceTypes` default, schema format changes). The schema registry is used by all policies, conditions, config, and plugins. Migration affects the entire validation layer. |
| R17 | **ESLint `ignoreModuleItems` masking broken APIs** | 🔴 Certain | 🟡 Medium | `.eslintrc` ignores lint errors for `crypto.createCipher`, `crypto.createDecipher`, `url.parse`. This actively suppressed warnings that would have flagged the Node 24 breakage. |
| R18 | **ioredis v4 EOL** | 🟡 Medium | 🟡 Medium | ioredis v4 has no security updates. v5 is current. Migration is generally compatible but requires testing. |
| R19 | **CircleCI v2 config with deprecated images** | 🟡 Medium | 🟡 Low | All `circleci/node:*` images referenced are deprecated. CI may stop functioning when CircleCI removes them. |
| R20 | **`yawn-yaml` unmaintained** | 🟡 Low | 🟡 Medium | Used for config CRUD (write path). Last updated 2018. No replacement or fork. If it breaks on a future Node/YAML version, the admin write path fails silently. |
| R21 | **`parent-require` unmaintained** | 🟡 Low | 🟡 Low | Used when EG is loaded as a library (post-scaffold). Last updated 2015. No known CVEs but no maintenance. |
| R22 | **Test suite gap: e2e tests not run in standard CI** | 🟡 Medium | 🟡 Medium | `npm run test:e2e` is a separate command from `test:all` in CI. E2e tests fork real child processes; if they are never run in CI, regressions in inter-process behaviour go undetected. |

---

## Risk Matrix

```
Impact →    Low         Medium       High         Critical
Likelihood ↓
Certain     R17,R19     R06          R09,R10      R01
High        R21         R22          R08          R02, R03
Medium      R20         R12,R14,R15  R11,R13,R16  R04,R05,R07
Low                     R18                        
```

## Prioritised Remediation Order (Modernization)

1. **R01** — Fix `crypto.createCipher` → `crypto.createCipheriv` with proper IV (unblocks test suite)
2. **R02** — Upgrade `jsonwebtoken` to ≥9.0.0 (security critical on auth path)
3. **R03/R04** — Patch `express`, `js-yaml`, `qs`, `minimatch`, `proxy-addr` (request-path vulns)
4. **R06** — Add Node 18/20/22 to CI matrix
5. **R09** — Replace encrypt/decrypt with authenticated cipher (`createCipheriv` + auth tag)
6. **R15** — Upgrade `passport` to ≥0.6.0
7. **R16** — Plan AJV v6 → v8 migration (schema-wide change)
8. **R13** — Audit all `expression` condition and request-transformer uses for user-controlled input
