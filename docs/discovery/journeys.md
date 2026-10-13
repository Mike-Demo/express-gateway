# Business Journeys — express-gateway v1.16.10

Traced from source code. Three journeys cover all critical runtime paths.

---

## Journey A — API Request Through an Auth → Proxy Pipeline

**Scenario:** Client sends `GET /api/resource` with `Authorization: apiKey abc123`. Gateway has a `key-auth` → `proxy` pipeline configured.

### Step-by-step trace

```
1. CLIENT sends HTTP request to :8080
   GET /api/resource
   Authorization: apiKey abc123

2. lib/gateway/server.js
   → http.createServer(app) receives the request
   → passes to the Express app built in lib/gateway/index.js:bootstrap()

3. lib/gateway/pipelines.js: Express router (vhost or global)
   → vhost() checks Host header (if apiEndpoint has a host other than '*')
   → inner Express.Router matches path /api/resource

4. generatePipelineHandler() wraps request:
   req.egContext = Object.create(new EgContextBase())
   req.egContext.req = req
   req.egContext.res = res
   req.egContext.apiEndpoint = route  ← includes scopes, paths, host
   → calls pipeline(req, res, next)

5. pipeline = Express.Router built by configurePipeline()
   Contains two policy steps chained as middleware:

   Step 5a — key-auth policy
   ─────────────────────────
   lib/policies/key-auth/key-auth.js
     → passport.authenticate('key-auth', actionParams, callback)
     → lib/services/credentials/credential.dao.js:  looks up apiKey in Redis
         HGET EG:key-auth:<apiKey>  →  consumerId
     → on success: calls req.logIn(user, ...) which sets req.user
     → actionParams.getCommonAuthCallback (lib/gateway/actionParams.js):
         req.headers['eg-consumer-id'] = req.egContext.consumer.id
         calls next()

   Step 5b — proxy policy
   ──────────────────────
   lib/policies/proxy/proxy.js (returned middleware closure)
     → balancer.nextTarget()  ← round-robin over serviceEndpoint urls
     → sets header: 'eg-request-id': req.egContext.requestID
     → calls stripPathFn(req) if stripPath: true
     → http-proxy.web(req, res, { target, headers, agent })
       Forwards request to backend, streams response back to client

6. Backend responds → http-proxy pipes response back → CLIENT receives response
```

### Condition evaluation (optional)

If a policy step has a `condition:` block (e.g. `pathMatch`):

```
configurePipeline() → createConditionAndActionMiddleware()
  → conditionFn = conditions[conditionConfig.name](conditionConfig)
     e.g. pathMatch: req => req.url.match(new RegExp(config.pattern))
  → wrapper middleware:
      if (conditionFn(req)) → run policyMiddleware
      else → call next()  (skip this policy step)
```

### Auth failure path

If key-auth fails (key not found or invalid):
- `getCommonAuthCallback`: if `passThrough: true` → sets `eg-consumer-id: anonymous`, calls `next()`
- if `passThrough: false` (default): responds `401` or `403 Forbidden`

---

## Journey B — Gateway Reconfiguration via Admin API with Hot-Reload

**Scenario:** Operator adds a new pipeline via `PUT /pipelines/myPipeline` to the admin API, triggering a hot-reload of the gateway routing.

### Step-by-step trace

```
1. OPERATOR sends HTTP request to :9876
   PUT /pipelines/myPipeline
   Content-Type: application/json
   Body: { "apiEndpoints": ["myEndpoint"], "policies": [...] }

2. lib/rest/index.js
   → Express app on admin port receives request
   → routes to: app.use('/pipelines', require('./routes/pipelines')({ config }))

3. lib/rest/routes/pipelines.js: router.put('/:name')
   → calls config.updateGatewayConfig(modifier)

4. lib/config/config.js: updateGatewayConfig()
   a. Reads current gateway.config.yml from disk (fs.readFile)
   b. Applies modifier function: sets json.pipelines[name] = req.body
   c. Serialises result back to YAML (js-yaml.dump)
   d. Validates all pipelines against policy schemas (prevents invalid writes)
   e. Writes updated YAML to disk (fs.writeFile)
   → responds 201 Created (new) or 204 No Content (update)

5. lib/config/config.js: chokidar watcher (config.watch())
   → detects 'change' event on gateway.config.yml
   → calls this.loadConfig('gateway'):
       reads file, runs envReplace(), validates against JSON Schema
       updates this.gatewayConfig in memory
   → emits: eventBus.emit('hot-reload', { type: 'gateway', config: this })

6. lib/gateway/index.js: eventBus.on('hot-reload', handler)
   → saves old config/plugins/rootRouter for rollback
   → calls bootstrapPolicies({ app, plugins: pluginsLoader.load(newConfig), config: newConfig })
       re-registers policies from new config's policy whitelist
   → calls pipelines.bootstrap({ app: express.Router(), config: newConfig })
       rebuilds entire pipeline router from new gateway.config.yml
   → reassigns rootRouter = new router
   → app.use() wrapper in bootstrap() now delegates to new rootRouter
   → on error: rolls back to old config + router, logs error

7. NEW requests immediately routed through updated pipelines
   (in-flight requests complete on old router — no drain mechanism)
```

### Important constraints
- Hot-reload only rebuilds **gateway pipelines**. The admin REST server does NOT hot-reload.
- If the new config is invalid (schema or policy validation fails), the gateway rolls back silently and logs the error.
- `EG_DISABLE_CONFIG_WATCH=true` disables the watcher; used in all unit/policy tests.
- **No drain:** in-flight requests on the old router are not drained before replacement.

---

## Journey C — Plugin Loading and Custom Policy Chain Execution

**Scenario:** An external plugin `express-gateway-plugin-example` is listed in `system.config.yml`. It registers a custom policy `my-policy`. A pipeline uses `my-policy` → `proxy`.

### Step-by-step trace

```
1. STARTUP: lib/index.js
   → config = require('./config')   ← loads + validates both config files
   → plugins = pluginsLoader.load({ config })

2. lib/plugins.js: pluginsLoader.load()
   For each plugin in config.systemConfig.plugins:
   a. Resolves package name:
      - if name starts with 'express-gateway-plugin-': use as-is
      - else: prepend 'express-gateway-plugin-'
      - override with settings.package if present
   b. require(requireName) — tries main module require, then parent-require
   c. Validates plugin settings against plugin.schema (AJV)
   d. Creates: context = new PluginContext({ settings, config, services })
   e. Calls plugin.init(context)

3. Plugin's init(context) function:
   context.registerPolicy({
     name: 'my-policy',
     schema: { $id: 'http://...', type: 'object', ... },
     policy: (actionParams, config) => (req, res, next) => { ... }
   })

4. lib/gateway/index.js: bootstrapPolicies({ app, plugins, config })
   → plugins.policies.forEach(policy => policies.register(policy))
      lib/policies/index.js:register():
        - calls schemas.register('policy', name, schema) → AJV validation wrapper
        - wraps policy function: validate(params) before calling action(params, ...args)
        - stores in policies[name]
   → policies.load(config.gatewayConfig.policies)
      loads core built-in policies (only those in the whitelist)

5. lib/gateway/pipelines.js: configurePipeline()
   For each policy step in the pipeline config:
   a. policyName = Object.keys(policyConfig)[0]   ← 'my-policy'
   b. validatePipelinePolicies() — verifies 'my-policy' in gateway.config policies whitelist
   c. policies.resolve('my-policy').policy  ← retrieves wrapped function
   d. For each action step:
      action = Object.assign({}, policyStep.action, ActionParams.prototype)
      policyMiddleware = policy(action, config)
      ← AJV validates action params; throws POLICY_PARAMS_VALIDATION_FAILED on error
   e. Wraps in condition middleware if conditionConfig present
   f. router.use(middlewares)  ← installs into pipeline Express.Router

6. REQUEST arrives → pipeline router executes:
   my-policy middleware(req, res, next):
     → custom logic runs
     → calls next() to proceed to proxy policy

   proxy middleware(req, res):
     → http-proxy forwards to backend

7. req.egContext available throughout:
   → requestID (uuid62): unique per-request ID
   → consumer: req.user (set by auth policy via passport.logIn)
   → evaluateAsTemplateString(expr): executes JS template literal via Node vm
   → match(expr): evaluates JS boolean expression via Node vm
```

### Policy execution invariants
- **Param validation always runs** before the policy function for every call (not just at startup).
- **`passThrough` pattern** for auth policies: if `passThrough: true`, auth failure sets `eg-consumer-id: anonymous` and continues; if `false` (default), returns 401/403.
- **Policy must be in the `policies` whitelist** in `gateway.config.yml`, or `POLICY_NOT_DECLARED` is thrown at pipeline build time.
- **`egContext.run()`** uses `vm.runInNewContext` — this is a sandboxed but not fully secure execution context.
