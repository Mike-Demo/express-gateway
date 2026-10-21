# Security audit 2026-10-21: prioritized remediation backlog

Issue creation is not available in this session, so these drafts are ready to file. The confirmed findings are ordered by real-world risk and reachability, then by fix scope. Neither finding shares a root cause with the other.

## Priority

1. **Critical — unauthenticated admin API and public proxy exposure.** A lower-trust remote caller can reach operator-only admin routes through the shipped public gateway configuration, including configuration writes that can lead to code execution. The smallest safe remediation is narrowly scoped but must protect both the admin app and its shipped proxy path.
2. **Medium — shipped default crypto and session secrets.** The defaults are public and compromise confidentiality/integrity for installations that retain them. The risk depends on deployment configuration, and removing defaults plus startup validation is a separate, contained change.

## Remediation issue draft 1

**Title:** `[security][critical] Protect the admin API and remove unauthenticated proxy exposure`

**Body:**

Parent issue: [Security audit 2026-10-21 — prioritize findings and create remediation issues (#3)](https://github.com/Mike-Demo/express-gateway/issues/3)

### Finding

The admin REST API has no authentication. The shipped gateway configuration exposes it through an unauthenticated public proxy pipeline, allowing a remote caller to reach configuration-write functionality that can lead to code execution.

**Fingerprint:** `unauthenticated-admin-api-config-write-to-code-execution`

### Evidence

- `lib/rest/index.js` mounts `express.json()`, then plugin and operator CRUD/configuration routes without an authentication or authorization middleware.
- `lib/config/gateway.config.yml` defines an `api` endpoint with `host: '*'`, a `backend` service endpoint at `http://localhost:9876` (the admin API), and an `adminAPI` proxy pipeline. Its `key-auth` policy is commented out.

The audit was static source inspection only; no code was executed and no deployed endpoint was probed.

### Root cause

Operator-only routes are mounted without authentication or authorization, and the shipped default gateway configuration proxies unauthenticated public traffic to the admin API.

### Smallest fix

Mount authentication and authorization on the admin Express app before any routes, using an operator credential/API key from system configuration and failing startup if the admin API is enabled without one. Also remove or protect the shipped `adminAPI` proxy pipeline (for example, enable `key-auth`) so the public gateway cannot forward unauthenticated requests to the admin API.

## Remediation issue draft 2

**Title:** `[security][medium] Remove shipped default crypto and session secrets`

**Body:**

Parent issue: [Security audit 2026-10-21 — prioritize findings and create remediation issues (#3)](https://github.com/Mike-Demo/express-gateway/issues/3)

### Finding

Shipped configuration contains public default secrets: crypto `cipherKey: sensitiveKey` and session `secret: keyboard cat`. The crypto scrypt salt also defaults to the public value `eg-scrypt-salt-v1`. The token service uses the derived key to decrypt Redis-stored OAuth2 token material.

**Fingerprint:** `shipped-default-crypto-and-session-secrets`

### Evidence

- `lib/config/system.config.yml` sets the crypto cipher key and session secret to the literals above and defaults the scrypt salt to `eg-scrypt-salt-v1`.
- Both generator templates, `bin/generators/gateway/templates/basic/config/system.config.yml` and `bin/generators/gateway/templates/getting-started/config/system.config.yml`, ship the same cipher key and session secret.
- `lib/services/utils.js` derives the encryption key using `scryptSync(cipherKey, scryptSalt, 32)`.

The audit was static source inspection only.

### Root cause

Concrete secret values are committed as defaults in the shipped configuration and generator templates, and startup does not reject known defaults.

### Smallest fix

Remove the concrete crypto cipher key and session secret from shipped configuration and generator templates. Require them through environment interpolation without fallbacks, and refuse startup (or fatal-log) when values match known shipped defaults (`sensitiveKey`, `keyboard cat`, or the default salt `eg-scrypt-salt-v1`).

## Needs-validation issue draft

**Title:** `[security][needs-validation] Audit leads to validate`

**Body:**

Parent issue: [Security audit 2026-10-21 — prioritize findings and create remediation issues (#3)](https://github.com/Mike-Demo/express-gateway/issues/3)

Checklist of audit leads and the exact missing fact supplied in the parent issue:

- [ ] **OAuth2 login and consent (authorize/decision) POSTs have no CSRF token and the shipped session config sets no SameSite cookie attribute.** Fingerprint: `oauth2-login-and-consent-forms-lack-csrf-protection`. Claimed root cause: State-changing session-backed OAuth2 endpoints lack an unforgeable per-session CSRF token, and the shipped session configuration sets no SameSite cookie attribute to compensate. **Missing fact:** “The actual Set-Cookie attributes emitted for the OAuth2 session in a deployed instance (express-session 1.19 defaults with the shipped config, i.e. no SameSite attribute) combined with the target browsers' SameSite-by-default enforcement for cross-site POSTs to /login and /oauth2/authorize/decision — and, for the consent arm, any way for an attack…”

  The supplied parent-issue text ends at this ellipsis; no omitted detail has been inferred.

Do not assign a severity to this lead until the missing fact is validated.

## Rejected candidate

Do not re-raise `ejs-2x-with-known-critical-advisories-renders-oauth2-pages` without new evidence; it was rejected during independent verification.
