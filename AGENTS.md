# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Rules
See [`BOB-PROJECT-RULES.md`](BOB-PROJECT-RULES.md) for the full safety contract. Key hard stops:
- **Rules 1, 5, 8, 10** require halting and asking — never work around them.
- Rule 1: Preserve externally observable behaviour unless a change is explicitly approved.
- Rule 5: Never remove a failing test to make the build pass.
- Rule 8: Do not access files listed in [`.bobignore`](.bobignore) (secrets, `node_modules/`, `coverage/`, logs, production data).
- Rule 10: Stop and report when a requested change conflicts with a build gate.

## Stack
Node.js API gateway built on Express. Tests use Mocha + `should` + `supertest`. Redis is the backing store; emulation via `ioredis-mock` is **on by default** (`EG_DB_EMULATE` defaults to `true` via YAML interpolation — no real Redis needed unless you explicitly set `EG_DB_EMULATE=false`).

## Commands
```sh
npm test                  # lint + coverage (nyc) — requires codecov, avoid locally
npm run test:all          # all tests (unit + e2e), no coverage
npm run test:unit         # unit + policy tests only (excludes e2e/)
npm run test:e2e          # e2e tests only
npm run lint              # ESLint with --fix
```

**Run a single test file:**
```sh
cross-env EG_HTTP_PORT=0 EG_CONFIG_DIR=lib/config EG_DISABLE_CONFIG_WATCH=true npx mocha test/policies/basic-auth-policy.test.js
```
The three `EG_*` env vars are required for unit/policy test invocations. They are baked into `test:all` and `test:unit`. The `test:e2e` script does NOT include them — e2e tests fork child processes and set `EG_CONFIG_DIR` on those child processes directly.

## Code Style (ESLint: `standard` + `plugin:node/recommended`)
- **Semicolons required** (`semi: always`) — deviates from standard's default of no semicolons.
- **No `var`** (`no-var: error`), **`const` preferred** (`prefer-const: error`).
- **No trailing commas** (`comma-dangle: never`).
- `space-before-function-paren` is disabled (either style is accepted).
- `no-console` is a warning, not an error.
- `no-prototype-builtins` is off.

## Architecture
```
lib/index.js          Entry point — loads config → plugins → gateway + REST admin
lib/config/           Config loader; reads gateway.config.yml + system.config.yml from EG_CONFIG_DIR
lib/policies/         Built-in policies auto-loaded from subdirectories; each exports { policy, schema }
lib/plugins.js        Plugin loader; PluginContext exposes register* methods to external plugins
lib/schemas/index.js  AJV-based schema registry shared by config, policies, and plugins
lib/services/         Redis-backed services: user, application, credential, token, authorizationCode, auth
lib/db.js             Singleton ioredis (or ioredis-mock) instance — initialised at require time
lib/logger.js         Winston; import as require('./logger').gateway|policy|config|db|admin|plugins
```

## Key Non-Obvious Patterns

### Policy structure
Every policy directory must export `{ policy: fn, schema: ajvSchema }`. The schema `$id` field is mandatory — the registry throws without it. Policy params are validated against the schema before the policy function runs.

### Config is set by env var, not CLI arg
`EG_CONFIG_DIR` must point to a directory containing `gateway.config.yml` and `system.config.yml`. Config also supports `.json` variants as fallback. Supports `${ENV_VAR:-default}` interpolation in YAML.

### Redis emulation in tests
`system.config.yml` has `db.redis.emulate: true` by default. Tests rely on `ioredis-mock`; no real Redis needed for unit/policy tests. `lib/db.js` is a singleton — mutations between tests persist unless you flush the mock.

### Test helpers
- `test/common/routing.helper.js` — sets up an in-process gateway (`lib/gateway`), use `helper.setup()` / `helper.cleanup()` in `before`/`after`.
- `test/common/gateway.helper.js` — forks a full gateway child process; used by e2e tests.
- `test/common/server-helper.js` — `findOpenPortNumbers` picks free ports from `3000–3100` on `127.0.0.1`.
- Models directory (`lib/config/models/`) must be copied to the temp config dir when using `gateway.helper.js`.

### Plugin naming convention
Plugins without the `express-gateway-plugin-` prefix are automatically prefixed unless a `package` property is set in `system.config.yml`.
