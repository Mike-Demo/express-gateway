# Evidence Index — express-gateway Modernization Factory

**Branch:** `modernization-factory`  
**Coverage:** Stages G0 through G4  

This index links every evidence artefact — Bob session exports, phase gate results,
and key deliverable commits — to a reachable file or commit reference.

---

## 1. Bob Session Exports

All session exports are stored under [`docs/evidence/bob-sessions/`](../evidence/bob-sessions/).

| File | Date | Contents |
|---|---|---|
| [`g0-g3-all-stages.md`](../evidence/bob-sessions/g0-g3-all-stages.md) | 2026-10-09 | Marathon task export covering G0 (safety contract), G1 (discovery), G2 (baseline), and G3 (planning). Full turn-by-turn agent record. Exported 2026-10-09. |
| [`g0-g3-budget-usage.jpg`](../evidence/bob-sessions/g0-g3-budget-usage.jpg) | 2026-10-09 | Screenshot: Bobcoin budget usage for the G0–G3 session. |
| [`g0-g3-context-breakdown.jpg`](../evidence/bob-sessions/g0-g3-context-breakdown.jpg) | 2026-10-09 | Screenshot: context window breakdown for the G0–G3 session. |
| [`g4-phases-a-through-d.md`](../evidence/bob-sessions/g4-phases-a-through-d.md) | 2026-10-12 | Marathon task (ID 9ec7bda6) re-exported 2026-10-12. Full history /init → G3 → G4 Phases A–D (crypto fix, uuid, AUTO upgrades, CODE upgrades D1–D8). |
| [`g4-phases-e-and-f.md`](../evidence/bob-sessions/g4-phases-e-and-f.md) | 2026-10-12 | Fresh task (ID f2bd7660). G4 Phase E (E0 admin URL fix, E0b CLI isolation, E0c policy loading, E1 CRUD factory) and Phase F (F1 Node 22 alignment, F2 audit remediation + abort). |

All five files are committed at `d074e93` (2026-10-12).

---

## 2. Phase Gate Results

Each row records the phase gate outcome, the final commit hash at which it was
recorded, and the commit date.

| Stage | Gate outcome | Final commit | Date |
|---|---|---|---|
| **G0** | ✅ PASS — Safety contract and access boundaries established | `76aecdb` | 2026-10-04 |
| **G1** | ✅ PASS — Discovery deliverables complete (6 documents) | `e04a950` | 2026-10-09 |
| **G2** | ✅ PASS — Behavioural baseline captured: 357 pass / 127 fail | `df57250` | 2026-10-09 |
| **G3** | ✅ PASS — G4 implementation plan + ADRs + all planning docs complete | `0bf67db` | 2026-10-09 |
| **G4** | ✅ PASS — 551 pass / 32 fail; characterization 31/31; lint 0/0 | `d074e93` | 2026-10-12 |

### G4 Sub-phase Gate Progression

| Sub-phase | Passing | Failing | Commit |
|---|---|---|---|
| Entering G4 (post-G3 baseline) | 357 | 127 | `df57250` |
| After Phase A (crypto fix) | — | — | `e72edb1` ¹ |
| After Phase B (uuid) | — | — | `6a2d158` ¹ |
| After Phase C (AUTO upgrades) | — | — | `4e08cdc` ¹ |
| After Phase D (CODE upgrades) | 427 | 89 | `e62ad74` |
| After E0 (admin URL fix) | 453 | 63 | `33e5679` |
| After E0b (CLI isolation fix) | 551 | 32 | `ad324fc` |
| After E0c (policy loading fix) | 551 | 32 | `058f95e` |
| After E1 (CRUD factory) | 551 | 32 | `eff82e6` |
| After F1 (Node 22 alignment) | 551 | 32 | `43de43d` |
| After F2a (overrides) | 551 | 32 | `7bddaf3` |
| **G4 close** | **551** | **32** | `9968381` |

¹ Intermediate counts for Phases A–D are recorded in the G4 Phases A–D session export
(`g4-phases-a-through-d.md`) but were not separately gate-checked in this index — the
Phase D final count of 427/89 is sourced from the Phase E session export.

---

## 3. Key Deliverable Documents

### Discovery (G1)

| Document | Path |
|---|---|
| Discovery report | [`docs/discovery/discovery-report.md`](../discovery/discovery-report.md) |
| Dependency inventory (88 vulns, 14 critical at baseline) | [`docs/discovery/dependency-inventory.md`](../discovery/dependency-inventory.md) |
| Risk register | [`docs/discovery/risk-register.md`](../discovery/risk-register.md) |
| Unknowns log | [`docs/discovery/unknowns.md`](../discovery/unknowns.md) |
| Request journey walkthroughs | [`docs/discovery/journeys.md`](../discovery/journeys.md) |
| Technology inventory | [`docs/discovery/technology-inventory.md`](../discovery/technology-inventory.md) |

### Baseline (G2)

| Document | Path |
|---|---|
| Test baseline (357/127) | [`docs/baseline/test-baseline.md`](../baseline/test-baseline.md) |
| Known defects (KD-001 through KD-011, updated through G4) | [`docs/baseline/known-defects.md`](../baseline/known-defects.md) |
| Coverage baseline (stmt 62.01%, branch 45.71%, fn 55.06%) | [`docs/baseline/coverage.md`](../baseline/coverage.md) |
| Regression checklist | [`docs/baseline/regression-checklist.md`](../baseline/regression-checklist.md) |

### Planning (G3)

| Document | Path |
|---|---|
| G4 implementation plan | [`docs/plan/plan.md`](../plan/plan.md) |
| ADR U07 — cipher replacement | [`docs/plan/adr/adr-u07-cipher-replacement.md`](../plan/adr/adr-u07-cipher-replacement.md) |
| ADR U03 — stored data migration | [`docs/plan/adr/adr-u03-stored-data-migration.md`](../plan/adr/adr-u03-stored-data-migration.md) |
| Dependency disposition | [`docs/plan/dependency-disposition.md`](../plan/dependency-disposition.md) |
| Refactor selection (D4) | [`docs/plan/refactor-selection.md`](../plan/refactor-selection.md) |

### Security (G4)

| Document | Path |
|---|---|
| Security disposition — 7 unresolved critical CVEs | [`docs/baseline/security-disposition-f2.md`](../baseline/security-disposition-f2.md) |

### Operations

| Document | Path |
|---|---|
| Crypto migration guide | [`docs/ops/migration.md`](../ops/migration.md) |
| Development environment | [`docs/environment.md`](../environment.md) |

---

## 4. All G4 Commits (chronological)

| Hash | Date | Message |
|---|---|---|
| `df116da` | 2026-10-12 | G4/A1: replace crypto.createCipher with AES-256-GCM (ADR U07) |
| `33063fc` | 2026-10-12 | G4/A1: update characterization C8a/C8b/C8c for new cipher (ADR U07 AC6) |
| `e72edb1` | 2026-10-12 | G4/A2: add migration script and ops guide (ADR U03) |
| `b4ab467` | 2026-10-12 | G4/B1: fix uuid sub-path imports and upgrade to uuid@9 (U11, Cluster D2) |
| `6a2d158` | 2026-10-12 | G4/B2: remove uuid62 from lib, move to devDependencies (R08, Option A) |
| `fda95d8` | 2026-10-12 | G4/C0: add scripts/.eslintrc to suppress no-console for CLI scripts |
| `7860738` | 2026-10-12 | G4/C1: upgrade express 4.17.1→4.22.3 and express-session 1.16.2→1.19.0 |
| `7f217fb` | 2026-10-12 | G4/C2: upgrade minimatch 3.0.4→3.1.5, semver 6.3.0→7.8.5, chokidar 3.0.2→3.6.0 |
| `2d48bbf` | 2026-10-12 | G4/C3: upgrade sinon 7.4.2→17.0.1 |
| `545b74a` | 2026-10-12 | G4/C4: upgrade mocha 6.2.0→10.8.2 |
| `4e08cdc` | 2026-10-12 | G4/C5: upgrade eslint 6.3.0→8.57.1 and eslint-plugin-import 2.18.2→2.32.0 |
| `9031ec3` | 2026-10-12 | G4/D1: upgrade jsonwebtoken 8.5.1→9.0.3 (R02, signature-bypass CVEs) |
| `0efda22` | 2026-10-12 | G4/D2: upgrade js-yaml 3.13.1→4.3.2 (R04, prototype pollution CVE) |
| `9786c3f` | 2026-10-12 | G4/D3: upgrade passport 0.4.0→0.7.0 (R15, session fixation CVE) |
| `e993b4b` | 2026-10-12 | G4/D4: remove lodash.flatmap, use native Array.prototype.flatMap (R03) |
| `9466c9a` | 2026-10-12 | G4/D5: upgrade proxy-agent 4.0.1→6.5.0 (R07, SSRF + code injection CVEs) |
| `6b2114f` | 2026-10-12 | G4/D6: upgrade superagent 5.1.0→8.1.2 |
| `11226fd` | 2026-10-12 | G4/D7: replace json-schema-ref-parser with @apidevtools/json-schema-ref-parser 11.9.3 |
| `e62ad74` | 2026-10-12 | G4/D8: chalk 2.4.2→4.1.2 + winston 3.2.1→3.19.0 (coordinated upgrade) |
| `33e5679` | 2026-10-12 | G4/E0: fix admin server IPv6 URL bug (KD-003) + correct known-defects.md |
| `ad324fc` | 2026-10-12 | G4/E0b: fix CLI test isolation in admin-helper.js (KD-002) |
| `058f95e` | 2026-10-12 | G4/E0c: load policies in admin REST server startup (KD-003a) |
| `ac9935d` | 2026-10-12 | G4/E1-housekeeping: delete diagnostic scratch file _probe_admin.js |
| `ba87159` | 2026-10-12 | G4/E1: CRUD factory refactor — api-endpoints (design D4) |
| `e57b50c` | 2026-10-12 | G4/E1: CRUD factory refactor — service-endpoints (design D4) |
| `eff82e6` | 2026-10-12 | G4/E1: CRUD factory refactor — pipelines (design D4) |
| `43de43d` | 2026-10-12 | G4/F1: runtime alignment — Node 22, Dockerfile, CircleCI, package.json engines |
| `7bddaf3` | 2026-10-12 | G4/F2a: bank npm overrides for transitive critical CVEs |
| `9968381` | 2026-10-12 | G4/F2b: security disposition — 7 unresolved critical CVEs (yeoman + puppeteer stack) |
| `d074e93` | 2026-10-12 | evidence: add Bob session exports for G4 (Phases A-D marathon task; Phases E-F task) |
