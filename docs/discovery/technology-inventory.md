# Technology Inventory — express-gateway v1.16.10

## Language & Runtime

| Item | Value |
|---|---|
| **Language** | JavaScript (ES2017 — `async/await`, `const/let`, classes) |
| **Runtime** | Node.js; `package.json` declares `>= 8.3.0`; tested in CI against Node 8, 10, 12 |
| **Actual tested runtime** | Node 24.21.0 (this environment) — **127/484 tests fail** due to removed Node APIs |
| **Type declarations** | `index.d.ts` (TypeScript declaration file for library consumers; source itself is plain JS) |
| **Module system** | CommonJS (`require`) throughout; no ES modules |

## Package Manager

| Item | Value |
|---|---|
| **Manager** | npm (v11.x in environment; `package-lock.json` present) |
| **Install command** | `npm ci` (clean install); `npm install` for dev |
| **Production install** | `npm ci --omit=dev` — 619 packages |
| **Lock file** | `package-lock.json` committed |

## Frameworks & Principal Libraries

| Library | Version (package.json) | Role |
|---|---|---|
| **express** | `^4.17.1` | HTTP server for both gateway and admin API |
| **http-proxy** | `^1.18.0` | Core reverse proxying (`proxy` policy) |
| **passport** | `^0.4.0` | Auth middleware framework |
| **passport-http** | `0.3.0` | Basic auth strategy |
| **passport-http-bearer** | `1.0.1` | Bearer token strategy |
| **passport-jwt** | `^4.0.0` | JWT auth strategy |
| **passport-local** | `1.0.0` | Local (username/password) strategy |
| **passport-oauth2-client-password** | `0.1.2` | OAuth2 client credential strategy |
| **oauth2orize** | `^1.11.0` | OAuth 2.0 server framework |
| **jsonwebtoken** | `^8.5.1` | JWT sign/verify |
| **ioredis** | `^4.14.0` | Redis client |
| **ioredis-mock** | `^4.16.3` | In-process Redis emulator (default in tests/demos) |
| **ajv** | `^6.10.2` | JSON Schema validation (AJV v6) |
| **ajv-keywords** | `^3.4.1` | AJV `instanceof` keyword |
| **js-yaml** | `^3.13.1` | YAML parsing for config files |
| **chokidar** | `^3.0.2` | File watching for config hot-reload |
| **winston** | `3.2.1` | Logging |
| **express-rate-limit** | `^2.14.2` | Rate limiting middleware |
| **rate-limit-redis** | `^1.6.0` | Redis store for rate limits |
| **vhost** | `3.0.2` | Virtual host routing |
| **minimatch** | `^3.0.4` | Glob matching for `hostMatch` condition |
| **uuid** | `^3.3.3` | UUID generation |
| **uuid62** | `1.0.1` | Base-62 UUID for `requestID` |
| **bcryptjs** | `^2.4.3` | Password hashing |
| **yargs** | `^14.0.0` | CLI argument parsing |
| **yeoman-environment** | `^2.4.0` | Yeoman generator runner |
| **yeoman-generator** | `^3.2.0` | Generator base class |
| **superagent** | `^5.1.0` | HTTP client (schema loading, admin client) |
| **clone** | `^2.1.2` | Deep clone for proxy options |
| **find-up** | `^3.0.0` | Config file discovery |
| **semver** | `^6.3.0` | Plugin version compatibility |
| **proxy-agent** | `^4.0.1` | Intermediate proxy support |
| **lodash.flatmap** | `^4.5.0` | Flatten policy middleware arrays |

## Build Tools

| Tool | Version | Role |
|---|---|---|
| **ESLint** | `^6.3.0` | Linting (`eslint-config-standard` + `plugin:node/recommended`) |
| **Mocha** | `^6.2.0` | Test runner |
| **nyc** | `^14.1.1` | Coverage (Istanbul wrapper); reporters: `lcov` |
| **codecov** | `^3.5.0` | Coverage upload (CI only) |
| **husky** | `^3.0.5` | Pre-commit hook: runs lint-staged |
| **lint-staged** | `^9.2.5` | Runs ESLint on staged `.js` files |
| **sinon** | `^7.4.2` | Test spies/stubs |
| **should** | `^13.2.3` | Assertion library |
| **supertest** | `^4.0.2` | HTTP assertion in-process testing |
| **puppeteer** | `^1.19.0` | Headless browser (OAuth implicit flow e2e) |

## Entry Points

| Entry Point | Purpose |
|---|---|
| `lib/index.js` | Main module (programmatic) and direct `node` entry point |
| `bin/index.js` | `eg` CLI entry point |
| `bin/eg.js` | CLI command definitions |

## CI/CD

| Item | Value |
|---|---|
| **CI system** | CircleCI (`.circleci/config.yml`, CircleCI v2 config format) |
| **Node versions in CI** | 8, 10, 12 only — **no Node 14+ in CI** |
| **Real Redis test** | `node-10-real-redis` job: sets `EG_DB_EMULATE=false`, spins up Redis sidecar |
| **Release pipeline** | Tags matching `/v\d+(\.\d+){2}/` trigger npm publish + Docker image build |
| **CI status** | CI configuration targets EOL Node versions; all `circleci/node:*` images referenced are deprecated |

## Docker

| File | Purpose |
|---|---|
| `Dockerfile` | Production image — `FROM node:10-alpine`, `npm ci --only=production` |
| `Dockerfile-master` | Development/master image |

**Node version in Dockerfile:** Node 10 (EOL October 2021).
