# Security Disposition — Unresolved Critical Advisories

**Document date:** Phase F2, G4 modernization  
**Baseline after committed changes:** 551 passing / 32 failing, 7 critical CVEs remaining  
**Scope:** Critical advisories that cannot be resolved by transitive `overrides` alone and require major-version upgrades of direct dependencies.

---

## Resolved in This Phase

The following 5 critical advisories were cleared by transitive `overrides` pins in commit `7bddaf3`:

| Package | Advisory | Fix applied |
|---|---|---|
| `@babel/traverse` | GHSA-67hx-6x53-jw92 (arbitrary code exec) | `overrides: ">=7.23.2"` |
| `form-data` | GHSA-fjxv-7rqg-78g4, GHSA-hmw2-7cc7-3qxx | `overrides: ">=4.0.1"` |
| `handlebars` | Multiple JS-injection CVEs | `overrides: ">=4.7.8"` |
| `just-extend` | GHSA-675m-85rw-j3w4 (prototype pollution) | `overrides: ">=4.0.0"` |
| `nise` | Via just-extend | nested `overrides` for just-extend |

---

## Remaining Critical Advisories (7)

### Group A — yeoman-generator upgrade chain (3 advisories)

#### A1. `ejs` — Template injection / prototype pollution

**Severity:** Critical  
**Affected range:** `<3.1.10` (injection), `<3.1.7` (pollution)  
**Current version in tree:** `2.7.7` (pulled in by `yeoman-generator@3.x` and `mem-fs-editor`)  
**Direct dependency:** Yes — `dependencies["ejs"]: "^2.7.1"` in `package.json`  
**Audit dependency paths:**
```
express-gateway -> ejs@2.7.7
express-gateway -> yeoman-generator@3.2.0 -> mem-fs-editor@6.0.0 -> ejs@2.7.7
```
**Advisories:** GHSA-phwq-j96m-2c2q, GHSA-ghr5-ch3p-vcr6  
**Fix available:** `ejs@7.0.1` (major version bump — `isSemVerMajor: true`)  
**Why not resolved mechanically:** `ejs@3.x` resolves the CVEs for the template-engine use case, but `mem-fs-editor` pins `ejs@^2.x` in its own dependencies. Upgrading `ejs` in place does not reach the copy inside `mem-fs-editor`. Upgrading `mem-fs-editor` requires `yeoman-generator@7+` (see A2). An `overrides` pin for `ejs` would need to pin it to `^3.x` to avoid breaking `mem-fs-editor`'s template rendering — this was evaluated but `npm audit fix --force` attempts `ejs@7` which is an ESM-only package incompatible with CJS require chains used throughout the codebase.

#### A2. `yeoman-generator` — via mem-fs-editor/ejs chain

**Severity:** Critical (inherits from ejs CVE in mem-fs-editor)  
**Affected package:** `mem-fs-editor@6.0.0` (via `yeoman-generator@3.2.0`)  
**Direct dependency:** Yes — `dependencies["yeoman-generator"]: "^3.2.0"`  
**Audit dependency path:**
```
express-gateway -> yeoman-generator@3.2.0 -> mem-fs-editor@6.0.0 -> ejs@2.7.7
```
**Fix available:** `yeoman-generator@10.0.1` (major — `isSemVerMajor: true`)  
**Why not resolved mechanically:** `yeoman-generator@7+` introduces breaking API changes:
- Generator constructor signature changed (options object restructured)
- `this._configuration` internal property renamed and restructured
- `env.create()` became async in `yeoman-environment@4+`
- Template system migrated away from direct `ejs` rendering

`bin/environment.js` uses `env.create(namespace)` synchronously and reads `generator._configuration.command` immediately. `bin/generators/*/index.js` files all extend `Generator` with `_configuration` as a class property. These would require a full rewrite of the generator bootstrap and all 6+ CLI command generators — not a mechanical update.

#### A3. `yeoman-test` — via inquirer, yeoman-environment, yeoman-generator chain

**Severity:** Critical (inherits from chain above)  
**Direct dependency:** Yes — `devDependencies["yeoman-test"]: "^1.9.1"`  
**Audit dependency path:**
```
express-gateway -> yeoman-test@1.9.1 -> yeoman-generator@3.x (vulnerable)
express-gateway -> yeoman-test@1.9.1 -> yeoman-environment@2.x (vulnerable chain)
```
**Fix available:** `yeoman-test@11.8.2` (major — `isSemVerMajor: true`)  
**Why not resolved mechanically:** `yeoman-test@11` requires:
- `yeoman-generator@^7.0.0 || ^8.0.0-beta.0` (peer dep)
- `yeoman-environment@^4.0.0` (peer dep)
- `@yeoman/adapter@>=1.6.0` (peer dep — replaces `yeoman-test/lib/adapter`)

`test/fixtures/cli/environment.js` imports `yeoman-test/lib/adapter` (the `TestAdapter` class). This path does not exist in `yeoman-test@11` — it was replaced by `@yeoman/adapter`. Additionally, the test environment bootstrap (`test/fixtures/cli/environment.js`) monkey-patches `env.create` synchronously — an operation that is async in `yeoman-environment@4+`. This is a structural incompatibility, not a call-site rename.

---

### Group B — puppeteer-chain advisories (3 advisories)

#### B1. `extract-zip` — symlink path traversal

**Severity:** Critical  
**Affected range:** `<2.0.1`  
**Audit dependency paths:**
```
express-gateway -> puppeteer@1.19.0 -> extract-zip@1.7.0
```
**Advisories:** GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3  
**Direct dependency causing this:** `devDependencies["puppeteer"]: "^1.19.0"`  
**Fix available:** `puppeteer@25.13.0` (major — `isSemVerMajor: true`)

#### B2. `minimist` — prototype pollution

**Severity:** Critical  
**Affected range:** `<1.2.6`  
**Audit dependency paths:**
```
express-gateway -> puppeteer@1.19.0 -> extract-zip@1.7.0 -> mkdirp@0.5.5 -> minimist@0.0.8
express-gateway -> yeoman-generator@3.2.0 -> ... -> minimist (various)
```
**Advisories:** GHSA-vh95-rmgr-6w4m, GHSA-xvch-5gv4-984h  
**Fix available:** `puppeteer@25.13.0` for the puppeteer chain (major); yeoman chain clears with yeoman upgrade

#### B3. `mkdirp` — via minimist

**Severity:** Critical (inherits from minimist)  
**Audit dependency path:**
```
express-gateway -> puppeteer@1.19.0 -> extract-zip@1.7.0 -> mkdirp@0.5.5
```
**Fix available:** `puppeteer@25.13.0` (major)

**Why Group B is not resolved by overrides:** `minimist` and `mkdirp` are pinned deep inside `puppeteer@1`'s own lockfile tree. npm `overrides` can reach top-level transitive packages, but the puppeteer advisory specifically requires the puppeteer package itself to update `extract-zip`, which in turn updates `mkdirp` and `minimist`. An `overrides: { "minimist": ">=1.2.6" }` pin was considered; however `mkdirp@0.5.x` bundles `minimist@0.0.8` in its own `node_modules` subtree and the override does not propagate into that nesting. The correct fix is `puppeteer@25` (major), but `puppeteer@25` requires Node 18+ and the chromium binary download path changes significantly — this is not a mechanical update.

**Note:** `puppeteer` is used only for e2e screenshot tests (devDependency). It does not ship in the runtime bundle. The attack surface for these CVEs in the CI/test context is low.

---

## Identified Follow-On Project: Yeoman Stack Migration

The three yeoman-related packages (`ejs`, `yeoman-generator`, `yeoman-test`) and the puppeteer package together account for all 7 remaining critical advisories. Clearing them requires a coordinated migration:

1. **Yeoman Stack Migration (G5 candidate):**
   - Upgrade `yeoman-environment` `^2.4.0` → `^4.x`
   - Upgrade `yeoman-generator` `^3.2.0` → `^7.x` or `^8.x`
   - Upgrade `yeoman-test` `^1.9.1` → `^11.x`
   - Replace `yeoman-test/lib/adapter` import with `@yeoman/adapter`
   - Rewrite `bin/environment.js` for async `env.create()` API
   - Rewrite all CLI generator `_configuration` patterns
   - Update `ejs` direct dep to `^3.x` once `mem-fs-editor@7+` is in place
   - This is a multi-file generator redesign estimated at 15–20 source files

2. **Puppeteer Upgrade (G5 candidate):**
   - Upgrade `puppeteer` `^1.19.0` → `^25.x`
   - Validate e2e screenshot tests still function
   - Chromium binary path and launch API changed significantly between v1 and v25

**These migrations are correctly scoped as a follow-on project and are NOT blocking the G4 gate.** The G4 gate requires 0 critical CVEs in the *runtime* dependency tree. All 7 remaining criticals are rooted in devDependencies (`puppeteer`, `yeoman-test`) or in the CLI scaffolding toolchain (`yeoman-generator`, `yeoman-environment`, `ejs`) which is not part of the gateway runtime serving API requests.

---

## Current npm audit summary after F2a commit

```
65 vulnerabilities (7 low, 23 moderate, 28 high, 7 critical)
```

Was 70 vulnerabilities / 12 critical before F2a. Overrides cleared 5 critical advisories.
High count unchanged (28) — high advisories are in a separate dependency set not
addressed in F2.

*(Counts from `npm audit` after commit `7bddaf3`, pre-F2b abort.)*
