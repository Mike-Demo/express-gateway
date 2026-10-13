# Bob IDE Session Reports — Modernization Factory

This directory is reserved for the Bob IDE task-session export files for stages G1, G2, and G3.

## Export status

| Stage | File | Status |
|---|---|---|
| G1 — Codebase discovery | `g1-discovery.html` (or `.json`) | ⏳ Pending manual export |
| G2 — Behavioral baseline | `g2-baseline.html` | ⏳ Pending manual export |
| G3 — Planning | `g3-planning.html` | ⏳ Pending manual export |

## How to export

The Bob IDE session report export is a **manual UI action** — it cannot be triggered programmatically by an agent.

Steps:
1. Open the Bob IDE task panel for the target session (G1, G2, or G3).
2. Click the **Export** or **Save** button in the top-right of the task tile.
3. Save the downloaded file to this directory with the filename shown in the table above.
4. `git add docs/evidence/bob-sessions/`
5. `git commit -m "evidence: add Bob session reports for G1, G2, G3"`
6. `git push origin modernization-factory`

## What the reports contain

Each session report is the full turn-by-turn record of the Bob agent interaction for that stage, including:
- Tool calls made and their results
- Files read and written
- Commands executed and their output
- Reasoning and decisions recorded in the conversation

These reports are the required judging evidence for the modernization-factory program.

## Why this file exists

The agent attempted to export these reports programmatically but confirmed that the Bob IDE export
function is only available through the UI. The code artifacts for all three stages are fully committed
to `origin/modernization-factory`. See the commit history for the complete deliverable record.

## Exports on file (updated 2026-10-12)

| File | Contents |
|---|---|
| `g0-g3-all-stages.md` | Marathon task export as of G3 (exported 2026-10-09) |
| `g0-g3-budget-usage.jpg`, `g0-g3-context-breakdown.jpg` | Budget/context screenshots for the G0–G3 session |
| `g4-phases-a-through-d.md` | Marathon task (ID 9ec7bda6) re-exported 2026-10-12 — full history /init → G3 → G4 Phases A–D |
| `g4-phases-e-and-f.md` | Fresh task (ID f2bd7660) — G4 Phase E (E0/E0b/E0c + E1 refactor) and Phase F (runtime alignment + audit remediation) |

The two G4 exports together with the G0–G3 export cover the complete Bob task history
for stages G0–G4. Both G4 exports were scanned before commit: no passwords, tokens,
API keys, or host addresses are present (matches are package names and concepts in
code and documentation).
