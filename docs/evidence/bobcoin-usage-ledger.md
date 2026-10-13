# Bob Usage Ledger

Fill one row per stage as it completes. This ledger is the primary evidence for
the 30%-weighted judging criterion **Tool Usage & Depth of Adoption** ("did the
team actually build with IBM Bob as a core part of their workflow, not just bolt
it on at the end?").

Commit the Bob-generated artifacts it references (modes, skills, rules, review
outputs, PR description) to the submission repo.

| Stage | Bob capability used (mode / skill / rule / feature) | What Bob did | Coins spent | Budget | Evidence |
|---|---|---|---|---:|---:|---|
| G0 | | | | 10 | |
| G1 | | | | 30 | |
| G2 | | | | 30 | |
| G3 | | | | 15 | |
| G4 | | | | 40 | |
| G5 | | | | 25 | |
| G6 | | | | 20 | |
| G7 | | | | 15 | |
| G8 | | | | 10 | |
| G9 | | | | 5 | |
| **Total** | | | | **200** | |

Reconcile actual spend against `BOBCOIN-BUDGET.md` before opening the next gate.
If a stage trends 25% over budget, narrow scope instead of borrowing from later gates.

## Notes
- 2026-10-09 (user-reported, after G1 pushed): ~~**65% remaining (130/200)**, i.e. ~70 spent to date~~ — **CORRECTED 15:10 CT: the "65%" was the context window (90.6k/270k tokens, 34% full), NOT Bobcoins.** Actual trial state per Bob IDE screenshot: budget **50.00**, usage **48.00**, **3% remaining (~2 coins)**. The single /init→G3 task session cost 47.41 coins. Trial essentially exhausted; G4+ requires the hackathon-provisioned account.
- 2026-10-12: Promo code redeemed — **Bob Pro+ active** (first month free, $0 charged), budget **180 coins**. G4 Phase A + Phase B consumed ~34 coins; IDE budget panel showed **81% remaining (~146 coins)** at 19:39 CT after the Phase B gate. Trial account (~2 coins) retired from use. Pro+ auto-renews at $60/mo around Nov 12, 2026 — cancel after submission. Per-phase coin splits were not reported by Bob despite gate-report requirements; figures here are panel-derived totals.
- 2026-10-12 19:56 CT: Panel showed **72% remaining (~130 coins)** after Phase C, before Phase D start. Derived Phase C cost: ~16 coins (81% → 72%). Cumulative Pro+ spend after Phases A–C: ~50 coins of 180.
- 2026-10-12 20:15 CT: Panel showed **63% remaining (~113 coins)** during the Phase D continuation run (D2–D9 in progress; D1 session + partial D2–D9 ≈ 16 coins so far). Cumulative Pro+ spend: ~67 coins.
- 2026-10-12 20:23 CT: Panel at **54% remaining (~97 coins)** with the D2–D9 run still in progress. Cumulative Pro+ spend: ~83 coins. Projection at current burn: E + F + G8 + G9 fit with ~30 coins to spare.
- 2026-10-12 20:27 CT: IDE screenshot gives exact figures — **86.63 coins used / 180 (51% remaining, ~93 left)**. Plan renews **Nov 4** (not ~Nov 12 as previously estimated) — cancel-by date corrected to Nov 4, 2026. Screenshot also shows the G4 work is running in the original marathon task session: context 232.9k/270k (86% full) — fresh task recommended for Phase E.
- 2026-10-12 20:30 CT: Screenshot — **99.06 used / 180 (44% remaining, ~81 left)**; context 240.9k/270k. Burn is accelerating in the bloated session (~12 coins in ~4 min of D8/D9 diagnosis). Phase E must start in a fresh task.
- 2026-10-12 20:41 CT: Bob admin page (authoritative) — **102 coins spent of 180; 78 remaining**. Budget renews Nov 4, 2026 (confirmed on admin page). Phase D total cost ≈ 52 coins (129.6 left pre-D → 78). Projection tightened: if E costs like D, ~28 remain for F + G8 + G9 — feasible, Phase G stretch is the flex item. Premium add-ons (IBM i, Java Modernization) NOT added — no extra charges. Overage limit toggle appears off; semantics unverified.

- 2026-10-12 21:52 CT: Panel at **27% remaining (~49 coins)** after Phase E completed. Phase E total ≈ 22 coins (fresh-task discipline cut burn vs Phase D's ~52). Runway for F + G8 + G9 adequate; Phase G stretch remains the flex item.

- 2026-10-12 22:13 CT: Panel at **17% remaining (~31 coins)** at G4 completion. Phase F cost ≈ 18 coins. Total Pro+ spend ≈ 149 of 180 across G4 Phases A–F. Remaining budget reserved for G8 (docs) + G9 (PR/submission); Phase G stretch dropped for budget.
- 2026-10-12 22:47 CT: Panel at **11% remaining — 159.54 used / 180 (~20.5 left)** during G9 (PR creation). G8 (docs) cost ≈ 9 coins. PR #1 opened from the branch head.
- 2026-10-12 23:07 CT: Panel at **8% remaining — 164.00 used / 180 (~16 left)** during the post-PR Copilot P1 fix task (migration-script scan pattern). Remaining work after this fix: session exports + submission filing only.
- 2026-10-12 23:12 CT: **7% remaining (~12–13 coins)** after the P1 fix completed (commit d3b8ca2, verified by Cane: scan patterns fixed, 11-test migration suite added, suites 562/32 + 31/31 + lint 0/0). P1 fix task cost ≈ 3–4 coins. No further Bob spend planned — closing steps (exports, PR description paste, AngelHack filing) are all manual/UI actions.
