# G1 Discovery Report — express-gateway v1.16.10

**Stage:** G1 — Codebase Discovery  
**Date:** 2025  
**Status:** Read-only analysis complete

---

## 1. What Is This Application?

Express Gateway is a **microservices API gateway** built on top of Express.js. It sits in front of one or more backend services and handles cross-cutting concerns: routing, authentication, rate-limiting, proxying, OAuth 2.0, and plugin-based extensibility.

It is **deprecated upstream** — the last release was v1.16.10 (Apache-2.0, expressgateway/express-gateway). The project website (express-gateway.io) appears inactive.

---

## 2. What It Does

| Capability | How |
|---|---|
| **API routing** | Declarative `gateway.config.yml`: `apiEndpoints` map host/path patterns to pipelines |
| **Policy chain** | Each pipeline runs an ordered sequence of policy middleware (auth, rate-limit, proxy, etc.) |
| **Auth** | Basic Auth, Key Auth, JWT, OAuth 2.0 (authorization code, client credentials, implicit, password) |
| **Rate limiting** | `rate-limit` policy backed by Redis or in-process memory |
| **Proxying** | `proxy` policy using `http-proxy` with round-robin load balancing across `urls` array |
| **Admin REST API** | HTTP server on :9876 — CRUD for users, apps, credentials, tokens, scopes, pipelines, API/service endpoints |
| **Plugin system** | External npm packages (prefix `express-gateway-plugin-*`) can add policies, conditions, routes, and CLI extensions |
| **Hot-reload** | `chokidar` watches config files; on change, gateway pipelines are rebuilt in-place without restart |
| **CLI** | `eg` binary with Yeoman generators for gateway scaffolding and resource management |

---

## 3. Runtime Architecture

```
                     ┌───────────────────────────────────────────┐
                     │           express-gateway process          │
                     │                                            │
  Client Request ──► │  :8080  Express App                        │
                     │   │                                        │
                     │   ├─ vhost routing (per-host router)       │
                     │   │   └─ path routing → pipeline router    │
                     │   │         └─ policy chain (middleware)   │
                     │   │               auth → rate-limit → proxy──► Backend
                     │   │                                        │
                     │   └─ egContext attached to each request    │
                     │                                            │
  Admin Client ────► │  :9876  Admin Express App                  │
                     │   └─ REST CRUD: users/apps/credentials/... │
                     │        └─ updateGatewayConfig() writes     │
                     │             gateway.config.yml on disk     │
                     │                  │                         │
                     │              chokidar detects change       │
                     │                  └─ hot-reload event       │
                     │                       └─ rebuild pipelines │
                     │                                            │
                     │  Redis (:6379 or ioredis-mock)             │
                     │   └─ users, apps, credentials, tokens      │
                     └───────────────────────────────────────────┘
```

---

## 4. Module Map

| Module | Role |
|---|---|
| `lib/index.js` | Entry point; wires config → plugins → gateway + admin |
| `lib/config/config.js` | Loads/validates/watches `gateway.config.yml` + `system.config.yml`; performs `${VAR:-default}` env interpolation |
| `lib/gateway/index.js` | Bootstraps Express app, registers policies/conditions, builds pipeline router, installs hot-reload listener |
| `lib/gateway/pipelines.js` | Converts `gateway.config.yml` pipelines into Express Router chains; handles vhost routing, method routing, conditions |
| `lib/gateway/context.js` | `EgContextBase` — per-request object attached as `req.egContext`; provides `requestID`, `consumer`, `evaluateAsTemplateString`, `match` (via Node `vm`) |
| `lib/gateway/actionParams.js` | `ActionParams` — mixed into every policy action; provides `getCommonAuthCallback` for Passport-based auth policies |
| `lib/gateway/server.js` | Creates `http.Server` (and optional `https.Server` with SNI support) |
| `lib/policies/index.js` | Policy registry: `register`, `resolve`, `load`; wraps every policy call with AJV param validation |
| `lib/conditions/index.js` + `predefined.js` | Condition registry: `always`, `never`, `pathMatch`, `pathExact`, `hostMatch`, `method`, `expression`, `authenticated`, `anonymous`, `allOf`, `oneOf`, `not`, `jsonSchema`, `tlsClientAuthenticated` |
| `lib/plugins.js` | Loads `express-gateway-plugin-*` packages; provides `PluginContext` with `register*` methods |
| `lib/schemas/index.js` | Singleton AJV instance (`useDefaults: true`, `coerceTypes: true`) used across config, policies, conditions, plugins |
| `lib/services/` | Redis-backed data layer: user, application, credential, token, authorizationCode, auth |
| `lib/services/utils.js` | `encrypt`/`decrypt` using `crypto.createCipher`/`createDecipher` (removed in Node 22 — **broken on Node 24**) |
| `lib/db.js` | Singleton `ioredis` (or `ioredis-mock`) instance; namespace `EG` |
| `lib/rest/index.js` | Admin API Express app on configurable port/host (default :9876 localhost) |
| `lib/rest/routes/` | REST handlers for: users, apps, credentials, tokens, scopes, pipelines, api-endpoints, service-endpoints, policies, schemas |
| `lib/logger.js` | Winston loggers by label; level from `LOG_LEVEL` env var |
| `lib/eventBus.js` | Singleton `EventEmitter`; used for `hot-reload`, `http-ready`, `https-ready`, `admin-ready` |
| `admin/` | Internal admin API *client* module (not a server) — used by the CLI to talk to the admin API |
| `bin/` | `eg` CLI and Yeoman generators for gateway + resource management |

---

## 5. Configuration Model

Two YAML files, resolved from `EG_CONFIG_DIR`:

- **`gateway.config.yml`** — runtime routing: `http.port`, `https`, `admin`, `apiEndpoints`, `serviceEndpoints`, `policies` (whitelist), `pipelines`
- **`system.config.yml`** — infrastructure: Redis connection, session secret, crypto keys, token TTLs, plugin list

Both files support `${VAR:-default}` shell-style env var interpolation. JSON variants (`.json`) are used as fallback if `.yml` is unreadable.

---

## 6. Test Suite Status (Node 24)

Ran: `npm run test:unit`

| Result | Count |
|---|---|
| **Passing** | 357 |
| **Failing** | 127 |
| **Pending** | 0 |

**Root cause of all 127 failures:** `crypto.createCipher` / `crypto.createDecipher` were deprecated in Node 10 and **removed in Node 22**. They are called in `lib/services/utils.js:encrypt()` / `decrypt()`. Any test that exercises token creation, credential encryption, or OAuth flows fails with `TypeError: crypto.createCipher is not a function`.

This is a hard blocker for the services layer on Node 24.

---

## 7. Key Observations for Modernization

1. **Node version mismatch** is the single largest immediate risk. The `engines` field says `>= 8.3.0`; the codebase uses APIs removed in Node 22.
2. **88 vulnerabilities** (14 critical) in the dependency tree — many in direct runtime dependencies (`express`, `jsonwebtoken`, `ejs`, `qs`, `proxy-addr`).
3. **`jsonwebtoken` ≤ 8.5.1** has known signature-bypass vulnerabilities; it is a direct runtime dependency for JWT auth.
4. **No TypeScript** in source; a `index.d.ts` type declaration file exists for library consumers.
5. **No CI currently runs** tests against Node 24 — the CircleCI config targets older Node versions.
6. **Plugin API surface** (`PluginContext`) is the public extension interface; breaking changes here affect all downstream plugins.
7. The `admin/` module is an internal REST client, not a separate project — a common source of confusion.
