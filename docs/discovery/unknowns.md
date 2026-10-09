# Unknowns & Assumptions — express-gateway v1.16.10 (G1)

This log records open questions discovered during G1 discovery. Items are not guessed — they are flagged for resolution in later stages or by the operator.

---

## Assumptions (recorded, not guessed)

| ID | Assumption | Basis |
|---|---|---|
| A01 | Redis emulation (`ioredis-mock`) is acceptable for all unit and policy tests | `system.config.yml` defaults `db.redis.emulate: ${EG_DB_EMULATE:-true}`; test suite passes this way |
| A02 | The codebase is not actively deployed in production at this client | Project is marked deprecated upstream; modernization objective implies migration, not patching a live critical system |
| A03 | `admin/` is an internal client module only | No `package.json`, no `node_modules`; confirmed by code reading |
| A04 | `BOB-PROJECT-RULES.md` rule set applies to all G1+ stages | File checked out from `origin/modernization-factory`; assumed to be the governing contract |

---

## Open Questions

| ID | Question | Why It Matters | How to Resolve |
|---|---|---|---|
| U01 | **Are there active downstream plugins in use?** | Plugin API surface changes (R11) affect external packages. Breaking `PluginContext`, `policies.register()`, or `ActionParams` breaks those plugins. | Inventory consuming repos; check npmjs for packages depending on `express-gateway` |
| U02 | **What is the intended target Node version for modernization?** | Determines which deprecated APIs need replacement and how many test failures must be fixed before gate checks can pass. | Operator decision: Node 20 LTS or Node 22+ |
| U03 | **Is `crypto.createCipher` used for data already stored in Redis?** | If yes, migrating the encryption scheme requires a data migration — stored credentials and tokens cannot be decrypted with `createCipheriv` using the old key. | Inspect Redis data in staging; determine if any tokens/credentials were encrypted with the old scheme |
| U04 | **Is there a staging or test environment with real Redis?** | `npm run test:all` with `EG_DB_EMULATE=false` exercises a different code path. Some tests may pass or fail differently against real Redis. | Run `EG_DB_EMULATE=false npm run test:unit` against a Redis instance |
| U05 | **What is the scope of e2e test failures?** | `npm run test:e2e` was not run (it forks gateway subprocesses that need network ports). It may reveal additional Node 24 incompatibilities beyond `crypto.createCipher`. | Run `npm run test:e2e` in isolation and record results |
| U06 | **Does the `expression` condition / request-transformer policy accept user-controlled input in any real deployment?** | If yes, `vm.runInNewContext` (R13) is an RCE vector. | Audit gateway.config.yml files in all environments; check if `expression` conditions reference `req.body` or other user input |
| U07 | **What is the correct replacement cipher for `createCipher`?** | `createCipheriv` requires an explicit IV; the old `createCipher` derived the IV from the key, which is insecure. Any replacement must be backwards-incompatible with stored ciphertext. | Security review needed; consult `system.config.yml` `crypto.algorithm` (`aes256`) and decide on IV strategy and migration path |
| U08 | **Is `yawn-yaml` (used for config CRUD write path) compatible with the current `js-yaml` v3?** | `yawn-yaml` depends on `js-yaml` internally. If `js-yaml` is upgraded to v4 (breaking API), `yawn-yaml` may break. | Check `yawn-yaml` internals; test `updateGatewayConfig` after any `js-yaml` upgrade |
| U09 | **Are the CircleCI jobs still functional?** | The CircleCI config uses `circleci/node:8-browsers` etc., which are deprecated images. If they have been removed, CI has been broken silently. | Check CircleCI dashboard for last passing build |
| U10 | **Is Puppeteer used only for e2e OAuth implicit flow tests, or anywhere else?** | Puppeteer v1 has critical vulnerabilities. If it can be removed (tests replaced or deleted), that eliminates a large CVE surface. | Search for all `puppeteer` references in test files; confirm scope |
| U11 | **Is `uuid/v4` subpath import in `token.service.js` and `credential.service.js` currently broken?** | `uuid` v3 uses `require('uuid/v4')` subpath. `uuid` v9+ uses named exports. Since `uuid` is pinned to `^3.3.3` this works today, but if `uuid` is upgraded as part of the audit fix, these imports break immediately. | Confirm current import works; note as a required change for any `uuid` upgrade |
| U12 | **What Node version does the Dockerfile target post-modernization?** | `Dockerfile` uses `FROM node:10-alpine` (EOL). Any deployment using this image is already broken. The new base image version must be decided. | Operator decision |
| U13 | **Is `parent-require` (used in `lib/plugins.js`) exercised in any current use case?** | `parent-require` is used only when EG is loaded as a library (after `eg gateway create`). If the scaffold workflow is not used, this dependency can potentially be removed. | Survey use patterns; check if generated server templates use programmatic EG loading |
| U14 | **Coverage baseline** | `npm test` (which runs `nyc`) was not run because it requires `codecov` and a CI token. No coverage percentage is available. | Run `nyc npm run test:unit` locally without `codecov` to get an LCOV baseline |

---

## Deferred to Later Stages

| ID | Item | Deferred To |
|---|---|---|
| D01 | OAuth 2.0 flow correctness under Node 24 (token sign/verify) | G2 — after `crypto.createCipher` fix |
| D02 | AJV v6 → v8 migration plan and schema compatibility | G2 |
| D03 | Plugin API stability contract for external consumers | G2 |
| D04 | Passport session fixation fix impact on session-using policies | G2 |
| D05 | Full e2e test results under Node 24 | G2 (requires ports + longer test run) |
