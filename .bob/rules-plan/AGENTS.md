# Plan Mode — Architectural Constraints

## Singleton hazards
- `lib/db.js` and `lib/schemas/index.js` are module-level singletons. Side effects occur at first `require`. Multiple gateway instances in the same process share the same schema registry and Redis connection — the schema registry guards against double-registration but silently re-registers on schema ID collision.

## Plugin architecture
- `PluginContext` (in `lib/plugins.js`) is the only interface plugins may use; they must not reach into internal modules. Each plugin gets its own context instance but shares the global schema registry and event bus.
- Plugin names without the `express-gateway-plugin-` prefix are automatically prefixed — designing plugin names without the prefix requires setting `package` explicitly in `system.config.yml`.

## Policy loading
- Core policies are loaded lazily from `lib/policies/` subdirectories only when listed in `gateway.config.yml` → `policies`. Policies not listed are never registered.
- Policy param validation wraps every call; validation failure throws `POLICY_PARAMS_VALIDATION_FAILED` synchronously — the Express error handler catches it.

## Config watch and hot-reload
- Config is watched at runtime; changes emit `hot-reload` on `eventBus`. **Only `lib/gateway/index.js` listens** — it rebuilds pipeline routes. The REST admin server (`lib/rest/`) does NOT hot-reload. E2e tests fork a child process and explicitly **delete** `EG_DISABLE_CONFIG_WATCH` from the child's env so the forked gateway can watch.

## Test isolation
- `ioredis-mock` is a shared in-memory store per process. Tests that mutate data (create users/credentials) must clean up in `after` hooks or risk leaking state into later tests. The `routing.helper.js` cleanup does **not** flush Redis.
