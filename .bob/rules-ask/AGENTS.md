# Ask Mode Context

## Codebase layout surprises
- `lib/config/` is both the runtime config loader **and** the default config directory shipped with the package. Tests override `EG_CONFIG_DIR` to point here.
- `admin/` is an **internal admin API client module** (JS-only, no `package.json`, no `node_modules`). It is NOT a separate sub-project. The `.eslintignore` entry `admin/node_modules` is defensive — that directory doesn't currently exist, and `admin/` source files ARE linted.
- `bin/` contains the `eg` CLI and Yeoman generators for gateway scaffolding **and** resource management (users, apps, credentials, scopes, tokens, plugins).
- Policy schemas live alongside each policy in `lib/policies/<name>/index.js`, not in `lib/schemas/`.

## Config system
- Config files support `${VAR:-default}` shell-style interpolation — processed by a custom `envReplace()` in `lib/config/config.js` before YAML parsing.
- Both `.yml` and `.json` config files are supported; YAML is tried first, JSON is the fallback.
- Config is watched for changes at runtime via `chokidar`; `EG_DISABLE_CONFIG_WATCH=true` disables it.

## Data store
- All persistent data (users, apps, credentials, tokens) lives in Redis under the `EG` namespace. In tests and demos this is emulated by `ioredis-mock` (controlled by `system.config.yml` `db.redis.emulate`).
