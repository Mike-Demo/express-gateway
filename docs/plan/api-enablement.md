# API Enablement Opportunities — express-gateway v1.16.10

**Stage:** G3  
**Sources:** `docs/plan/architecture.md`, `docs/plan/analysis.md`, direct source reading of `lib/schemas/index.js`, `lib/policies/index.js`, `lib/rest/routes/schemas.js`, `lib/rest/index.js`.

This document identifies API surface improvements that can be unlocked during G4 modernization work with minimal additional effort. These are not new features — they surface capabilities that already exist internally but are not accessible through the admin REST API.

---

## Opportunity 1 — Schema Discovery Endpoint

### Current state

`lib/schemas/index.js` maintains a registry of all registered schemas: gateway config, system config, every policy's parameter schema, every condition schema, and any plugin-provided schemas. The registry is queryable internally via `schemas.getSchemaByName()` and `schemas.findSchemaById()`.

`lib/rest/routes/schemas.js` already exposes a partial schemas API:
- `GET /schemas/gateway` → returns the gateway config JSON schema
- `GET /schemas/system` → returns the system config JSON schema

However, there is no endpoint to list **all registered schemas** (especially policy parameter schemas), and no endpoint to retrieve a policy schema by policy name.

### What is missing

```
GET /schemas/policies              → { policies: [{ name, $id, schema }] }
GET /schemas/policies/:policyName  → { $id, schema }
GET /schemas/conditions            → { conditions: [{ name, $id, schema }] }
```

These would allow admin tooling, the `eg` CLI, and Yeoman generators to validate policy params client-side without forking a gateway process.

### Why it qualifies for G4

- The schema registry is being touched during the G4 AJV upgrade work (if AJV configuration changes are needed for Node compatibility). Adding these routes while the schemas module is open adds zero extra risk.
- The internal API already exists — `schemas.registered` (or equivalent) is readable in `lib/schemas/index.js`. The routes are thin wrappers.
- **Does not touch** the plugin API surface, services layer, or gateway pipeline.

### Implementation sketch

```js
// in lib/rest/routes/schemas.js (addition only)
const { schemas } = require('../../schemas');

router.get('/policies', (req, res) => {
  const policySchemas = schemas.filter(s => s.$id && s.$id.includes('/policies/'));
  res.json({ schemas: policySchemas });
});

router.get('/policies/:name', (req, res) => {
  const schema = schemas.getSchemaByName(req.params.name);
  if (!schema) return res.sendStatus(404);
  res.json(schema);
});
```

**Note:** Read `lib/schemas/index.js` before implementing — the exact registry access API must be confirmed from source, not assumed.

### Acceptance criteria

1. `GET /schemas/policies` returns a non-empty JSON array when at least one policy with a schema is registered.
2. `GET /schemas/policies/key-auth` returns the key-auth parameter schema.
3. `GET /schemas/policies/nonexistent` returns 404.
4. No change to existing `GET /schemas/gateway` or `GET /schemas/system` behaviour.
5. `npm run lint` passes.

---

## Opportunity 2 — Policy Availability List

### Current state

`lib/policies/index.js` registers all loaded policies in an internal map. There is no admin REST endpoint that lists which policies are currently registered and available in the running gateway. The closest existing endpoint is `GET /policies` in `lib/rest/routes/policies.js`, but inspection is needed to confirm whether this returns the dynamic registry or only the static config-declared policies.

### Why it qualifies for G4

During the G4 policy upgrades (passport, jsonwebtoken, proxy-agent), each upgraded policy will be re-registered. Having a live `/policies` endpoint that reflects the actual registry is a useful diagnostic tool during upgrade verification.

If `GET /policies` already returns the full registered list, this opportunity is already satisfied — confirm and document; no code change needed.

### Investigation required

Read `lib/rest/routes/policies.js` and `lib/policies/index.js` before committing to any change here. This is the only opportunity in this document that requires a pre-implementation investigation step.

---

## Opportunity 3 — Health Check Endpoint

### Current state

The gateway has no health check endpoint. `lib/gateway/server.js` starts an HTTP server; `lib/rest/index.js` starts an admin HTTP server. Neither provides a `/health` or `/status` endpoint that returns whether the gateway is running, which pipelines are active, and whether Redis is reachable.

### Why it qualifies for G4

Container deployments (the `Dockerfile` target is being updated from `node:10-alpine` to `node:20-alpine` per `docs/plan/targets.md`) require a health check for orchestration readiness probes. Adding a minimal health endpoint during the Dockerfile update prevents a container-restart loop on Node 24 deployments.

### Implementation sketch (admin server)

```js
// lib/rest/routes/health.js
'use strict';
const db = require('../../db');

module.exports = (router) => {
  router.get('/health', async (req, res) => {
    try {
      await db.ping();
      res.json({ status: 'ok', redis: 'ok' });
    } catch (err) {
      res.status(503).json({ status: 'degraded', redis: err.message });
    }
  });
};
```

**Scope constraint:** This goes on the admin server (`lib/rest/`), not the gateway server (`lib/gateway/server.js`), to avoid adding a route that conflicts with proxied paths.

### Acceptance criteria

1. `GET /health` on the admin port returns `{"status":"ok","redis":"ok"}` when Redis (or ioredis-mock) is reachable.
2. Returns 503 if Redis is not reachable.
3. No change to gateway server routing.
4. Test added in `test/rest-api/health.test.js`.

---

## Priority and G4 Scoping

| Opportunity | Priority | Effort | Gate dependency |
|---|---|---|---|
| Opportunity 1 — Schema discovery | Medium | Low (1–2 hours) | None; independent |
| Opportunity 2 — Policy list confirmation | Low | Minimal (investigation only) | None |
| Opportunity 3 — Health check | Medium | Low (1–2 hours) | Dockerfile update (G4 item) |

**All three are optional for G4.** They are included in `docs/plan/plan.md` as "stretch items" — they are listed in the G4 work breakdown but are not gating the stage. If any creates unexpected coupling or test failures, it must be dropped from G4 scope without delay.
