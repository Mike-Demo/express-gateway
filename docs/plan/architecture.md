# Current-State Architecture — express-gateway v1.16.10

**Source:** Derived from `docs/discovery/discovery-report.md` (module map), `docs/discovery/journeys.md` (journey traces), and direct source reading of `lib/` during G1.

---

## Component Diagram

```mermaid
graph TD
    subgraph "Process: express-gateway"
        entry["lib/index.js\n(entry point)"]
        config["lib/config/config.js\nConfig + Watcher"]
        plugins["lib/plugins.js\nPlugin Loader / PluginContext"]
        schemas["lib/schemas/index.js\nAJV Singleton"]
        eventBus["lib/eventBus.js\nEventEmitter Singleton"]
        db["lib/db.js\nioredis Singleton"]

        subgraph "Gateway Server (:8080)"
            gwIndex["lib/gateway/index.js\nbootstrap()"]
            gwPipelines["lib/gateway/pipelines.js\nconfigurePipeline()"]
            gwServer["lib/gateway/server.js\nhttp/https Server"]
            gwContext["lib/gateway/context.js\nEgContextBase (per-req)"]
            gwActionParams["lib/gateway/actionParams.js\nActionParams mixin"]
            conditions["lib/conditions/index.js\nCondition Registry"]
        end

        subgraph "Policy Registry"
            policyIndex["lib/policies/index.js\nregister / resolve / load"]
            pBasicAuth["lib/policies/basic-auth/"]
            pKeyAuth["lib/policies/key-auth/"]
            pJWT["lib/policies/jwt/"]
            pOAuth2["lib/policies/oauth2/"]
            pProxy["lib/policies/proxy/proxy.js"]
            pRateLimit["lib/policies/rate-limit/"]
            pOthers["lib/policies/\ncors, expression, headers,\nlog, terminate, transformers"]
        end

        subgraph "Admin Server (:9876)"
            restIndex["lib/rest/index.js\nAdmin Express App"]
            restRoutes["lib/rest/routes/\nusers, apps, credentials,\ntokens, pipelines, endpoints,\nscopes, policies, schemas"]
        end

        subgraph "Services Layer"
            svcIndex["lib/services/index.js"]
            svcUtils["lib/services/utils.js\nencrypt() / decrypt() ⚠️KD-001"]
            svcTokens["lib/services/tokens/\ntoken.service.js"]
            svcCreds["lib/services/credentials/\ncredential.service.js"]
            svcUsers["lib/services/consumers/\nuser.service.js"]
            svcApps["lib/services/consumers/\napplication.service.js"]
            svcAuthCodes["lib/services/authorization-codes/"]
            svcAuth["lib/services/auth.js"]
        end

        passport["passport\n(auth strategies)"]
        logger["lib/logger.js\nWinston"]
    end

    subgraph "External"
        redis[("Redis :6379\n(or ioredis-mock)")]
        backend["Backend Services"]
        pluginPkg["express-gateway-plugin-*\n(npm packages)"]
        cfgFiles[["EG_CONFIG_DIR/\ngateway.config.yml\nsystem.config.yml"]]
    end

    CLIENT["HTTP Client"] -->|:8080| gwServer
    ADMIN["Admin Client"] -->|:9876| restIndex
    OPERATOR["CLI / eg"] -->|HTTP| restIndex

    entry --> config
    entry --> plugins
    entry --> gwIndex
    entry --> restIndex

    config -->|reads/watches| cfgFiles
    config --> schemas
    config --> eventBus

    plugins -->|reads| config
    plugins -->|loads| pluginPkg
    plugins --> schemas
    plugins --> svcIndex

    gwIndex --> gwPipelines
    gwIndex --> gwServer
    gwIndex --> policyIndex
    gwIndex --> conditions
    gwIndex -->|listens hot-reload| eventBus

    gwPipelines --> policyIndex
    gwPipelines --> conditions
    gwPipelines --> gwContext
    gwPipelines --> gwActionParams

    policyIndex --> schemas
    policyIndex --> pBasicAuth
    policyIndex --> pKeyAuth
    policyIndex --> pJWT
    policyIndex --> pOAuth2
    policyIndex --> pProxy
    policyIndex --> pRateLimit
    policyIndex --> pOthers

    pBasicAuth --> passport
    pKeyAuth --> passport
    pJWT --> passport
    pOAuth2 --> passport

    pBasicAuth --> svcAuth
    pKeyAuth --> svcAuth
    pOAuth2 --> svcTokens
    pOAuth2 --> svcCreds

    pProxy -->|http-proxy| backend

    svcAuth --> svcCreds
    svcTokens --> svcUtils
    svcCreds --> svcUtils
    svcUtils -->|crypto.createCipher ⚠️| schemas

    svcIndex --> svcTokens
    svcIndex --> svcCreds
    svcIndex --> svcUsers
    svcIndex --> svcApps
    svcIndex --> svcAuthCodes
    svcIndex --> svcAuth

    svcTokens --> db
    svcCreds --> db
    svcUsers --> db
    svcApps --> db
    svcAuthCodes --> db
    db --> redis

    restIndex --> restRoutes
    restRoutes --> config
    restRoutes --> svcIndex
    restRoutes -->|updateGatewayConfig| cfgFiles

    gwIndex --> logger
    restIndex --> logger
    policyIndex --> logger
    svcIndex --> logger
```

---

## Sequence Diagram — Journey A: Auth → Proxy Pipeline

*Source: `docs/discovery/journeys.md` § Journey A*

```mermaid
sequenceDiagram
    participant C as HTTP Client
    participant GS as lib/gateway/server.js<br/>http.Server
    participant GI as lib/gateway/index.js<br/>Express app
    participant PL as lib/gateway/pipelines.js<br/>configurePipeline()
    participant CTX as lib/gateway/context.js<br/>EgContextBase
    participant KA as lib/policies/key-auth/key-auth.js
    participant SVC as lib/services/auth.js<br/>+ credential.dao.js
    participant DB as lib/db.js<br/>ioredis
    participant AP as lib/gateway/actionParams.js<br/>getCommonAuthCallback()
    participant PX as lib/policies/proxy/proxy.js
    participant BE as Backend Service

    C->>GS: GET /api/resource<br/>Authorization: apiKey keyId:keySecret
    GS->>GI: HTTP request
    GI->>PL: route via vhost/path router
    PL->>CTX: Object.create(new EgContextBase())<br/>req.egContext.requestID = uuid62.v4()
    PL->>CTX: req.egContext.apiEndpoint = route
    PL->>KA: policy(action)(req, res, next)
    KA->>KA: passport.authenticate('localapikey', ...)
    KA->>SVC: authenticateCredential(keyId, keySecret, 'key-auth')
    SVC->>DB: HGET EG:key-auth:<keyId>
    DB-->>SVC: credential hash
    SVC-->>KA: consumer object
    KA->>SVC: authorizeCredential(keyId, 'key-auth', scopes)
    SVC-->>KA: authorized = true
    KA->>AP: getCommonAuthCallback(req, res, next)
    AP->>AP: req.logIn(consumer, ...)<br/>req.headers['eg-consumer-id'] = consumer.id
    AP->>PX: next() → proxy policy
    PX->>PX: balancer.nextTarget() (round-robin)
    PX->>PX: headers['eg-request-id'] = requestID
    PX->>BE: http-proxy.web(req, res, {target})
    BE-->>PX: HTTP response
    PX-->>C: piped response

    note over KA,AP: If auth fails & passThrough:false → res.sendStatus(401)
    note over KA,AP: If passThrough:true → res.set('eg-consumer-id','anonymous'), next()
```

---

## Sequence Diagram — Journey B: Admin API + Hot-Reload

*Source: `docs/discovery/journeys.md` § Journey B*

```mermaid
sequenceDiagram
    participant OP as Admin Client
    participant RI as lib/rest/index.js<br/>Admin Express App
    participant RR as lib/rest/routes/pipelines.js<br/>router.put('/:name')
    participant CF as lib/config/config.js<br/>updateGatewayConfig()
    participant FS as gateway.config.yml<br/>(disk)
    participant CW as chokidar watcher<br/>config.watch()
    participant EB as lib/eventBus.js
    participant GI as lib/gateway/index.js<br/>hot-reload handler
    participant GP as lib/gateway/pipelines.js<br/>pipelines.bootstrap()

    OP->>RI: PUT /pipelines/myPipeline<br/>{apiEndpoints:[...], policies:[...]}
    RI->>RR: route match
    RR->>CF: config.updateGatewayConfig(modifier)
    CF->>FS: fs.readFile(gatewayConfigPath)
    FS-->>CF: YAML string
    CF->>CF: js-yaml.load() → modifier(json) → js-yaml.dump()
    CF->>CF: validate pipelines against policy schemas
    CF->>FS: fs.writeFile(gatewayConfigPath, newYAML)
    RR-->>OP: 201 Created

    FS-->>CW: 'change' event (chokidar detects write)
    CW->>CF: loadConfig('gateway')
    CF->>CF: envReplace() + yaml.load() + schema validate
    CF->>EB: eventBus.emit('hot-reload', {type:'gateway', config})
    EB->>GI: hot-reload handler fires
    GI->>GI: save oldConfig, oldRootRouter (rollback point)
    GI->>GP: pipelines.bootstrap({app: Router(), config: newConfig})
    GP->>GP: rebuild vhost + path routes from new config
    GP-->>GI: new rootRouter
    GI->>GI: rootRouter = newRouter (atomic swap)

    note over GI,GP: On error: restore oldConfig + oldRootRouter, log error
    note over CF,FS: Admin REST server does NOT hot-reload (lib/rest/index.js ignores hot-reload event)
```

---

## Sequence Diagram — Journey C: Plugin Loading and Policy Chain

*Source: `docs/discovery/journeys.md` § Journey C*

```mermaid
sequenceDiagram
    participant IDX as lib/index.js
    participant CFG as lib/config/config.js
    participant PL as lib/plugins.js<br/>pluginsLoader.load()
    participant PKG as express-gateway-plugin-*<br/>(external npm package)
    participant CTX as lib/plugins.js<br/>PluginContext
    participant PI as lib/policies/index.js<br/>register()
    participant SCH as lib/schemas/index.js<br/>AJV singleton
    participant GI as lib/gateway/index.js<br/>bootstrapPolicies()
    participant GP as lib/gateway/pipelines.js<br/>configurePipeline()
    participant AP as lib/gateway/actionParams.js
    participant REQ as Incoming Request

    IDX->>CFG: require('./config') — loads gateway+system config
    IDX->>PL: pluginsLoader.load({config})
    PL->>PL: resolve package name (prefix if needed)
    PL->>PKG: require('express-gateway-plugin-example')
    PKG-->>PL: plugin module {version, schema, init}
    PL->>SCH: schemas.register('plugin', name, plugin.schema)
    PL->>CTX: new PluginContext({settings, config, services})
    PL->>PKG: plugin.init(context)
    PKG->>CTX: context.registerPolicy({name, schema, policy})
    CTX-->>PL: plugins object {policies:[...], conditions:[...]}

    IDX->>GI: gateway({plugins, config})
    GI->>PI: bootstrapPolicies() → plugins.policies.forEach(register)
    PI->>SCH: schemas.register('policy', name, schema) → AJV validate wrapper
    PI->>PI: policies[name] = {name, policy: validatedWrapper}
    GI->>PI: policies.load(config.gatewayConfig.policies) — load built-in policies

    GI->>GP: pipelines.bootstrap({app:Router(), config})
    GP->>GP: validatePipelinePolicies() — checks whitelist
    GP->>PI: policies.resolve('my-policy').policy
    GP->>AP: action = Object.assign({}, policyStep.action, ActionParams.prototype)
    GP->>GP: policyMiddleware = policy(action, config)
    GP->>GP: router.use([condition?, policyMiddleware])

    REQ->>GP: request arrives → pipeline Router executes
    GP->>AP: policyMiddleware(req, res, next)
    note over AP: AJV validates params before calling action
    AP->>REQ: custom logic → next()
```

---

## Boundary Crossings by Journey

| Journey | Boundaries Crossed | Critical Modules |
|---|---|---|
| A (auth→proxy) | Client→Server→Policy→Services→Redis→Backend | `gateway/server.js`, `gateway/pipelines.js`, `policies/key-auth`, `services/auth.js`, `services/credentials/credential.dao.js`, `db.js` |
| B (admin+hotreload) | AdminClient→AdminServer→Config→Disk→Chokidar→EventBus→Gateway | `rest/routes/pipelines.js`, `config/config.js`, `eventBus.js`, `gateway/index.js`, `gateway/pipelines.js` |
| C (plugin chain) | Startup→Plugins→PolicyRegistry→Schemas→Gateway→Request | `plugins.js`, `policies/index.js`, `schemas/index.js`, `gateway/index.js`, `gateway/pipelines.js`, `gateway/actionParams.js` |
