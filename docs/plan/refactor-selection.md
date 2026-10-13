# Refactor Selection — express-gateway v1.16.10

**Stage:** G3  
**Sources:** `docs/plan/analysis.md` (Cluster D4, hotspot table), `docs/baseline/known-defects.md` (KD-003), direct source reading of `lib/rest/routes/`.

This document identifies, justifies, and scopes the **one refactor** selected for inclusion in the G4 implementation plan. All other refactor candidates are explicitly rejected with reasons.

---

## Selection Criteria

A refactor is eligible for G4 only if it meets **all three** of:

1. **Unblocks a known defect or reduces migration risk for a G4 CODE-class upgrade** — the change must have a traceable outcome (fewer failing tests, reduced coupling, safer upgrade path).
2. **Is bounded** — the change can be completed in one commit, verified by existing tests, and rolled back without affecting any other G4 work item.
3. **Does not touch the plugin API surface** — `PluginContext`, `policies.register()`, `ActionParams`, and `lib/services/index.js` façade are off-limits without an explicit plugin-compatibility review (R11).

---

## Selected Refactor: D4 — Admin Route CRUD Consolidation

### What

`lib/rest/routes/api-endpoints.js`, `lib/rest/routes/service-endpoints.js`, and `lib/rest/routes/pipelines.js` each implement an identical four-method REST pattern:

```
GET    /                → config.gatewayConfig.<key>
GET    /:name           → config.gatewayConfig.<key>[name]
PUT    /:name           → config.updateGatewayConfig(<key>, name, body)
DELETE /:name           → config.updateGatewayConfig(<key>, name, null)
```

The three files differ only in the config key (`apiEndpoints`, `serviceEndpoints`, `pipelines`) and the route prefix at which they are mounted in `lib/rest/index.js`. No business logic differs between them.

### Why it qualifies

1. **KD-003 (25 failing REST tests):** `test/rest-api/*.test.js` tests fail because the admin server returns 404 on all routes. The root cause is being investigated separately (see KD-003 fix target in `known-defects.md`). Consolidation brings the three route files under a single code path, so a KD-003 fix applies once rather than three times — reducing the risk of inconsistency.
2. **Bounded:** The public route interface (`GET /`, `GET /:name`, `PUT /:name`, `DELETE /:name`) is unchanged. The `lib/rest/index.js` mount calls are unchanged. Tests test the HTTP surface, not the internal implementation.
3. **No plugin API surface contact:** `lib/rest/routes/` is not exposed through `PluginContext`. Plugins register policies and conditions — not admin REST routes.

### Scope

**Files to change:**

| File | Action |
|---|---|
| `lib/rest/routes/admin-route-factory.js` | **Create new** — exports `createCrudRouter(configKey)` |
| `lib/rest/routes/api-endpoints.js` | Replace body with `module.exports = createCrudRouter('apiEndpoints')` |
| `lib/rest/routes/service-endpoints.js` | Replace body with `module.exports = createCrudRouter('serviceEndpoints')` |
| `lib/rest/routes/pipelines.js` | Replace body with `module.exports = createCrudRouter('pipelines')` |

**Files unchanged:** `lib/rest/index.js`, all test files, all other `lib/rest/routes/` files.

### Implementation Specification

```js
// lib/rest/routes/admin-route-factory.js
'use strict';

const express = require('express');
const config = require('../../config');

function createCrudRouter(configKey) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const data = config.gatewayConfig[configKey] || {};
    res.json(data);
  });

  router.get('/:name', (req, res) => {
    const items = config.gatewayConfig[configKey] || {};
    const item = items[req.params.name];
    if (!item) {
      return res.sendStatus(404);
    }
    res.json(item);
  });

  router.put('/:name', (req, res) => {
    config.updateGatewayConfig(configKey, req.params.name, req.body);
    res.json(req.body);
  });

  router.delete('/:name', (req, res) => {
    const items = config.gatewayConfig[configKey] || {};
    if (!items[req.params.name]) {
      return res.sendStatus(404);
    }
    config.updateGatewayConfig(configKey, req.params.name, null);
    res.sendStatus(204);
  });

  return router;
}

module.exports = { createCrudRouter };
```

The above is a reference implementation. The actual 404-handling behaviour must match the existing per-file implementations exactly — read each source file before committing to confirm the current 404 path.

### Acceptance Criteria for G4

1. `lib/rest/routes/admin-route-factory.js` exists and is the sole location of the CRUD logic.
2. `lib/rest/routes/api-endpoints.js`, `service-endpoints.js`, and `pipelines.js` each contain only the one-line delegation to `createCrudRouter`.
3. After the KD-003 fix is applied, REST API tests (`test/rest-api/*.test.js`) pass at the same rate as before (no regression introduced by consolidation).
4. `npm run lint` passes.
5. No changes to `lib/rest/index.js` mount calls or to any test file.

---

## Rejected Refactor Candidates

### D3 — Redis DAO base class

**Why rejected:** The four DAO files (`credential.dao.js`, `token.dao.js`, `user.dao.js`, `application.dao.js`) have identical CRUD boilerplate, but the ioredis v4→v5 upgrade (CODE-class in `dependency-disposition.md`) already requires touching each of them individually for API validation. Introducing a new DAO base class in the same G4 cycle would conflate two changes, making it harder to attribute test failures. Defer to G5 post-ioredis-upgrade.

### D2 — uuid/v4 sub-path import

**Why rejected:** This is a 2-line change in exactly 2 files, driven entirely by the uuid upgrade (CODE-class). It is not a refactor — it is a required code change for the upgrade, tracked as U11. It belongs in the uuid upgrade work item, not as a standalone refactor.

### D1 — Auth callback consolidation

**Why rejected:** `getCommonAuthCallback()` in `lib/gateway/actionParams.js` is already shared via mixin across all four auth policies — this is a positive existing pattern. The passport upgrade (CODE-class, R15) will require touching all four policies regardless. Adding a structural change here increases the blast radius of the passport upgrade without a commensurate benefit. No change.

### Config singleton globalisation (analysis.md §5)

**Why rejected:** The config mutation pattern (tests directly setting `config.gatewayConfig`) is deeply embedded in ~50 test files and ties into the plugin API surface (R11). Refactoring it would require changing test helpers, plugin API surface, and potentially breaking plugin consumers. This is a design constraint, not a safe refactor target for G4.
