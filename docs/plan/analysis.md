# Coupling, Duplication, and Hotspot Analysis — express-gateway v1.16.10

**Sources:** `docs/discovery/discovery-report.md` (module map), `docs/baseline/coverage.md` (coverage data), `docs/baseline/known-defects.md` (defect locations), direct source reading during G1.

---

## 1. Highest Inbound Coupling (Most Depended-Upon)

These modules are imported by the most other modules. Changes here affect the widest surface.

| Module | Imported By | Risk of Change | Associated Defects/Unknowns |
|---|---|---|---|
| `lib/schemas/index.js` | `lib/config/config.js`, `lib/policies/index.js`, `lib/conditions/index.js`, `lib/plugins.js`, `lib/services/credentials/credential.service.js`, every policy's `index.js` (indirectly via `lib/policies/index.js`) | 🔴 Very high — AJV singleton; changing AJV version (v6→v8) ripples to every schema consumer | R16, D02 |
| `lib/config/config.js` (singleton) | `lib/index.js`, `lib/gateway/index.js`, `lib/gateway/server.js`, `lib/rest/index.js`, `lib/rest/routes/*`, `lib/db.js`, `lib/services/utils.js`, `lib/services/tokens/token.service.js`, `lib/services/credentials/credential.service.js` | 🔴 High — config is required at module load time; any change to its shape affects all consumers | R04, U08, KD-003 |
| `lib/services/index.js` | `lib/plugins.js`, `lib/policies/basic-auth/`, `lib/policies/key-auth/`, `lib/policies/oauth2/`, `lib/rest/routes/*` | 🟡 Medium — stable façade; internal service changes are isolated if the façade is unchanged | KD-001, R01 |
| `lib/logger.js` | Every module under `lib/` (gateway, config, policies, services, rest, plugins) | 🟡 Low change risk — Winston interface is stable; upgrading Winston would require testing all log call sites | — |
| `lib/db.js` | Every service DAO file, `lib/services/credentials/`, `lib/services/tokens/`, `test/common/admin-helper.js` | 🟡 Medium — db singleton is required at startup; ioredis v4→v5 upgrade is generally compatible but requires validation | R18 |
| `lib/eventBus.js` | `lib/config/config.js`, `lib/gateway/index.js`, `lib/gateway/server.js`, `lib/rest/index.js`, `lib/plugins.js` | 🟡 Low — simple EventEmitter; no known issues | — |

---

## 2. Highest Outbound Coupling (Most Dependencies)

These modules depend on the most other internal or external modules. They are the most likely to be broken by changes elsewhere.

| Module | Depends On | Migration Risk |
|---|---|---|
| `lib/services/credentials/credential.service.js` | `lib/db.js`, `lib/services/utils.js`, `lib/config`, `lib/schemas/index.js`, `json-schema-ref-parser`, `json-schema-merge-allof`, `uuid62`, `uuid/v4` (sub-path) | 🔴 High — calls `utils.encrypt()` (KD-001); uses `uuid/v4` sub-path (broken on uuid v9+, U11); depends on deprecated `json-schema-ref-parser` v7 |
| `lib/services/tokens/token.service.js` | `lib/db.js`, `lib/services/utils.js`, `lib/config`, `jsonwebtoken`, `uuid/v4` (sub-path) | 🔴 High — calls `utils.encrypt()`/`decrypt()` (KD-001); `jsonwebtoken` ≤8.5.1 CVEs (R02); `uuid/v4` sub-path (U11) |
| `lib/policies/oauth2/oauth2.js` | `lib/services/index.js`, `lib/gateway/actionParams.js`, `oauth2orize`, `passport-oauth2-client-password`, `express-session` | 🟡 Medium — OAuth policy is the most complex policy; depends on `express-session` (vulnerable cookie/on-headers); cascade from KD-001 |
| `lib/gateway/pipelines.js` | `lib/policies/index.js`, `lib/conditions/index.js`, `lib/gateway/context.js`, `lib/gateway/actionParams.js`, `lodash.flatmap`, `vhost` | 🟡 Medium — lodash.flatmap has prototype pollution CVE (R03); vhost is unmaintained; this is the hot path for every request |
| `lib/config/config.js` | `lib/schemas/index.js`, `lib/eventBus.js`, `lib/logger.js`, `js-yaml`, `chokidar`, `yawn-yaml` | 🟡 Medium — `js-yaml` v3 CVEs (R04); `yawn-yaml` unmaintained (R20); upgrade of either has breaking API changes |

---

## 3. Code Duplication Clusters

Duplication identified by pattern inspection during G1. These clusters increase migration risk because a fix applied to one copy must be applied to all copies.

### Cluster D1 — Auth callback pattern

`lib/gateway/actionParams.js:getCommonAuthCallback()` is the common auth callback used by **all four auth policies** (basic-auth, key-auth, JWT, OAuth2). The pattern `passport.authenticate(strategy, actionParams, actionParams.getCommonAuthCallback(...))` is repeated in `lib/policies/basic-auth/basic-auth.js`, `lib/policies/key-auth/key-auth.js`, `lib/policies/jwt/jwt.js`, and `lib/policies/oauth2/oauth2.js`. This is a positive pattern (shared via mixin) but means any fix to the auth callback must be validated against all four policies.

**Risk:** Passport upgrade (R15, session fixation) changes `req.user` access patterns used inside `getCommonAuthCallback`. All four policies must be re-tested.

### Cluster D2 — `uuid/v4` sub-path import

`require('uuid/v4')` appears in both `lib/services/tokens/token.service.js:3` and `lib/services/credentials/credential.service.js:2`. This is a sub-path import that worked in uuid v3 but breaks in v4+. Both files must be changed atomically when uuid is upgraded (U11).

### Cluster D3 — Redis CRUD boilerplate in DAOs

`lib/services/credentials/credential.dao.js`, `lib/services/tokens/token.dao.js`, `lib/services/consumers/user.dao.js`, and `lib/services/consumers/application.dao.js` all follow the same Redis hash CRUD pattern (`HMSET`, `HGETALL`, `HDEL`, with the `EG:type:id` key format). There is no shared DAO base class. An ioredis v4→v5 API change would require updating each DAO file independently.

**Risk:** ioredis v5 has a small number of API changes (Promise resolution behaviour for some commands). Each DAO must be re-validated (R18).

### Cluster D4 — Admin route CRUD pattern

`lib/rest/routes/api-endpoints.js`, `lib/rest/routes/service-endpoints.js`, and `lib/rest/routes/pipelines.js` all implement the same four-method REST pattern (`GET /`, `GET /:name`, `PUT /:name`, `DELETE /:name`) via `config.updateGatewayConfig()`. They are structurally identical save for the config key (`apiEndpoints`, `serviceEndpoints`, `pipelines`). This duplication is safe to refactor (see `docs/plan/refactor-selection.md`) but is not on the critical path.

---

## 4. Change-Frequency Hotspots

Inferred from: number of associated known defects, number of dependencies, coverage gaps.

| Module | Heat | Associated KD / Risk / Unknown | Coverage |
|---|---|---|---|
| `lib/services/utils.js` | 🔴 Maximum | KD-001 (direct cause), R09, U03, U07 | N/A — file itself is 0% exercisable until KD-001 fixed |
| `lib/services/tokens/token.service.js` | 🔴 Maximum | KD-001, R02 (jsonwebtoken), U03, U11 | 33% — blocked by KD-001 |
| `lib/rest/routes/*.js` | 🔴 High | KD-003 (25 failing REST tests), U08 (yawn-yaml compat) | 34% — blocked by KD-003 |
| `lib/config/config.js` | 🟡 High | R04 (js-yaml CVE), U08 (yawn-yaml), KD-003 | 47% — hot-reload path untested in unit suite |
| `lib/policies/oauth2/` | 🟡 High | KD-001 (cascade), KD-011, R15 (passport), R02 | 61% — cascade from KD-001 |
| `lib/services/credentials/credential.service.js` | 🟡 Medium | KD-001 (encrypt call), U11 (uuid sub-path), U03 | 89% — currently passing but uuid upgrade will break |
| `lib/gateway/pipelines.js` | 🟡 Medium | R03 (lodash.flatmap), KD-008 (proxy 502), KD-010 | 83% — well covered but on critical request path |
| `.circleci/config.yml` | 🟡 Medium | R06, R19 — CI targets deprecated Node 8/10/12 images | N/A — CI config, not source |
| `test/fixtures/certs/` | 🟡 Medium | KD-004 (OpenSSL key-too-small) | N/A — test fixture |

---

## 5. Singleton Coupling Risk

Three singletons are required at module load time and shared across all subsystems:

| Singleton | Module | Risk |
|---|---|---|
| AJV instance | `lib/schemas/index.js` | Schema registry is mutated by every call to `schemas.register()`; AJV v8 migration changes this API (R16) |
| Config object | `lib/config/config.js` (module-level export, not class export — `module.exports = Config` — but config is typically required and the same instance is shared) | Config mutations (e.g. test overrides to `config.gatewayConfig`) are visible globally; tests that don't clean up pollute subsequent tests |
| ioredis client | `lib/db.js` | Single connection shared by all services and tests; `flushdb()` in test teardown affects all other tests running in the same process |

The config singleton creates the "global config mutation" pattern seen in test files (e.g. `config.gatewayConfig = {...}` in test `before` hooks). This is noted in `AGENTS.md` (key non-obvious patterns) and is a maintenance hazard — it is **not** a refactor target in this program because it entangles with the plugin API surface (R11).
