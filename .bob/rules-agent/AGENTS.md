# Agent Coding Rules

## Policy authoring
- Policy file must export `{ policy: fn, schema }`. If a `schema` object is provided, it **must** have a `$id` property (full URI, e.g. `http://express-gateway.io/schemas/policies/<name>.json`) — omitting `$id` throws at registration. Omitting `schema` entirely is allowed and disables validation with a warning.
- Register shared base schemas with `schemas.register('internal', ...)` in `lib/policies/index.js`, not inside individual policy files.

## Schema validation
- Use `lib/schemas/index.js` for all AJV operations — never instantiate a second AJV. `ajv` has `coerceTypes: true` and `useDefaults: true`, so defaults in schemas are applied in-place and type coercion happens silently.

## Services
- All Redis operations go through `lib/services/` — never call `lib/db.js` directly from policies or REST handlers.
- `lib/db.js` is initialised at `require` time; importing it triggers Redis connection. Don't import it in test setup files unless you intend to connect.

## Logging
- Import logger as `require('../logger').gateway` (or the relevant label). Don't create ad-hoc Winston loggers.

## Tests
- Required env vars for every test run: `EG_HTTP_PORT=0 EG_CONFIG_DIR=lib/config EG_DISABLE_CONFIG_WATCH=true`.
- Use `test/common/routing.helper.js` for in-process policy tests. Call `helper.setup()` in `before` and `helper.cleanup()` in `after` — cleanup closes the Express server and unwatches config.
- Mocha global timeout is 60 s (`--exit` is set); tests that fork a gateway subprocess rely on `gateway.helper.js`, not the in-process helper.
