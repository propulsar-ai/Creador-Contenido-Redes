---
phase: 15-comparison-templates-eval-harness-decision
plan: 05
subsystem: content-design-engine-decision
tags: [design-engine, decision-doc, blind-review, creatomate, gamma, flux, remotion, rubric]

# Dependency graph
requires:
  - phase: 15-04
    provides: "63/63-render comparison matrix, blind gallery (A/B/C/D anonymized), Claude's proposed evidence-cited rubric scores (rubric-scores.json)"
provides:
  - "Dual-signed 15-DECISION.md: winner = Hybrid (FAL Flux 2 Pro background + Creatomate typographic overlay), full replacement of Ideogram with a production-validation-period fallback safeguard"
  - "Human blind-vote data (human-scores.json) showing real engagement preference: Hybrid 11/17 groups (65%), Gamma 5/17 (29%), Ideogram 1/17 (6%, legibility-only), Creatomate standalone 0/17 (rejected)"
  - "New hard requirement for Phase 16: any phone/chat mockup in a generated background must be castellano + legible (root cause of Hybrid's only legibility gap)"
  - "Two explicit pending decisions handed to Felix/Susana (not resolved here): Creatomate real post-trial pricing, Gamma Pro (~216EUR/yr, already paid) keep-or-cancel"
  - "Remotion EVAL-07 paper analysis closed: cost-rejected ($100/month Automators floor), reconsideration trigger = video/Reels milestone (PREM-03)"
  - "Auditable evidence archive (evidence/) with 8 representative renders + both raw score JSONs, independent of gitignored eval-output/"
affects: [16-integration-image-router, 17-wizard-image-models-update]

# Tech tracking
tech-stack:
  added: []
  patterns: ["human-blind-vote-overrides-claude-proposal: reviewers' engagement pattern (only score what they'd actually choose) treated as legitimate rejection signal, not missing data", "tie-break-by-explicit-criteria: when weighted rubric ties exactly (92/110), break using named non-rubric criteria (real engagement %, structural layout conformity, operational cost/risk) rather than arbitrary judgment call"]

key-files:
  created:
    - .planning/phases/15-comparison-templates-eval-harness-decision/evidence/human-scores.json
    - .planning/phases/15-comparison-templates-eval-harness-decision/evidence/rubric-scores.json
    - .planning/phases/15-comparison-templates-eval-harness-decision/evidence/{hybrid,gamma,creatomate,ideogram}/*.png (8 files)
    - .planning/phases/15-comparison-templates-eval-harness-decision/15-05-SUMMARY.md
  modified:
    - .planning/phases/15-comparison-templates-eval-harness-decision/15-DECISION.md

key-decisions:
  - "Winner: Hybrid (FAL Flux 2 Pro background + Creatomate typographic overlay) — tied Gamma at 92/110 weighted, broken by 3 explicit criteria (real engagement 65% vs 29%, structural layout conformity, lower operational cost/risk), all favoring Hybrid"
  - "Call: FULL REPLACEMENT of Ideogram (not coexist) — Hybrid dominates Ideogram on all 4 individual visual criteria with wide margins (min +4.4/10), clearing the locked domination bar for total replacement"
  - "Risk-management condition attached to the replace call (not a rule override): Phase 16 keeps Ideogram code as a manual fallback during a production-validation period before full removal, since Hybrid has zero production history"
  - "Creatomate standalone excluded from winner candidacy despite numerically beating Ideogram (48 vs 28 visual-weighted) — 0/17 real engagement votes (worse rejection than Ideogram's 1/17) contradicts using the rubric formula literally; its typography engine still lives on inside the winning Hybrid"
  - "New Phase 16 hard requirement: phone/chat mockups in generated backgrounds must always render in castellano and be legible — root cause of Hybrid's only quality gap, diagnosed as a Flux prompt-engineering issue, not a Creatomate text-engine defect"
  - "Ideogram's single vote (gimnasio-gpt4o_story, legibility only) explicitly NOT used to override its low aggregate score — treated as selection bias from an easy/short-text outlier case, consistent with (not contradicting) the other 16 unscored Ideogram renders"
  - "Router identifier for Phase 16 to reuse: \"hybrid\" (from the harness) — friendlier Wizard-facing name left to Phase 16's discretion"

# Metrics
duration: ~25min (this closing segment — sign-off + evidence archive + SUMMARY/STATE; Tasks 1-3 scoring/decision work completed in prior sessions)
completed: 2026-08-03
---

# Phase 15 Plan 05: Blind Human Review + Signed Engine Decision Summary

**Hybrid (FAL Flux 2 Pro + Creatomate overlay) wins Phase 15's design-engine comparison by real human engagement (65% vs Gamma's 29%, tied on raw rubric at 92/110) and replaces Ideogram entirely, with a production-validation fallback safeguard and one new hard requirement (castellano/legible phone mockups) carried into Phase 16.**

## Performance

- **Duration:** ~25 min (this final segment: Task 4 sign-off + evidence archival + close-out docs). Tasks 1-3 (draft, blind review session, score finalization) executed across prior sessions on 2026-08-02/03.
- **Completed:** 2026-08-03
- **Tasks:** 4/4 (Task 1 draft, Task 2 blind-review checkpoint, Task 3 finalize+decide, Task 4 sign-off — all complete)
- **Files modified:** 1 (15-DECISION.md, sign-off block) + 10 created (evidence/ archive: 8 PNGs + 2 JSONs) + 1 SUMMARY

## Accomplishments

- **EVAL-06 and EVAL-07 both satisfied** — Phase 15's gate deliverable (`15-DECISION.md`) is complete, internally consistent, and dual-signed.
- **Winner named with full traceability:** blind votes → tabulated preference pattern → rubric reconciliation → tie-break → domination check → replace-with-safeguard call. Every step shows its work in the committed doc.
- **Real human preference data captured and honored as-is** — the reviewers' actual voting behavior (score only what you'd choose; unscored = rejected) was treated as legitimate signal per their own explicit rule, not smoothed over or treated as missing data. This directly overturned Claude's proposed favorite (Creatomate standalone, 99/110 proposed) via 0/17 real votes — the single most consequential correction human review made to Claude's analysis in this phase.
- **Auditable evidence trail independent of the disposable eval harness** — 8 representative renders (2 per engine, covering the specific cases cited in the decision's prose) plus both raw score JSONs now live under version control in `evidence/`, so the decision remains verifiable even after `eval-output/` (gitignored) is eventually cleaned up.
- **Remotion (EVAL-07) closed cleanly on paper** — no service built, cost case documented ($100/month Automators floor), explicit reconsideration trigger tied to a real future milestone (PREM-03 video/Reels) rather than left open-ended.

## Task Commits

Tasks 1-3 were committed in prior sessions (see below); this session closed Task 4:

1. **Task 1: Draft decision doc** - `a6658d9` (docs) — rubric, proposed scores, Remotion analysis
2. **Task 2: Blind review session infra** - `a55a510` (feat) — interactive blind-scoring gallery + local vote server (deviation: built to actually run the checkpoint's blind-review protocol)
3. **Task 3: Finalize scores, apply winner rule, name Hybrid** - `6c4d60f` (docs)
4. **Task 4: Dual sign-off + evidence archive** - `691864f` (feat, this session)

**Plan metadata:** (this commit, see below)

## Files Created/Modified

- `.planning/phases/15-comparison-templates-eval-harness-decision/15-DECISION.md` — sign-off block filled (Felix direct, Susana relayed, 2026-08-03); status line updated to FIRMADO
- `.planning/phases/15-comparison-templates-eval-harness-decision/evidence/hybrid/{veterinaria-caso-exito_single,estetica-educativo_carousel_slide1}.png` — winning-favorite case + the phone-mockup legibility issue case (root of the new hard requirement)
- `.planning/phases/15-comparison-templates-eval-harness-decision/evidence/gamma/{diacritics-2_single,veterinaria-caso-exito_single}.png` — paraphrase-under-textMode:preserve case + a representative high-quality render
- `.planning/phases/15-comparison-templates-eval-harness-decision/evidence/creatomate/{veterinaria-caso-exito_carousel_slide2,diacritics-1_single}.png` — the real overflow-bug case resolved by auto-fit + a technically-perfect-but-rejected-standalone diacritics case
- `.planning/phases/15-comparison-templates-eval-harness-decision/evidence/ideogram/{diacritics-2_single,veterinaria-caso-exito_carousel_slide2}.png` — baseline diacritics corruption + baseline overflow-adjacent case
- `.planning/phases/15-comparison-templates-eval-harness-decision/evidence/human-scores.json`, `evidence/rubric-scores.json` — full raw score data, copied verbatim for auditability

## Decisions Made

- **Winner: Hybrid.** Tied Gamma exactly at 92/110 on the reconciled weighted rubric; broken by three explicit, stated criteria (all favoring Hybrid): real engagement preference (65% vs 29%), structural conformity to the locked canonical layout typology (Gamma's own card-based layout engine overrides the spec; Hybrid's Creatomate templates honor it in 100% of renders), and operational cost/risk (Hybrid is pay-per-use with no subscription floor and reuses two already-production-proven integration patterns; Gamma requires the paid Pro plan with no free tier, higher latency, and undocumented zip-export integration overhead).
- **Call: full replacement, not coexist.** Hybrid dominates Ideogram on all 4 individual visual criteria with wide margins (minimum +4.4/10, not a borderline case) — clears the locked bar for total replacement rather than the coexist default.
- **Risk mitigation attached, not a rule exception:** Phase 16 should retain Ideogram's code as a manual fallback during an in-production validation period (volume TBD by Felix/Susana) before fully removing it, since Hybrid — unlike Ideogram — has zero production run history.
- **Creatomate standalone explicitly excluded from winner candidacy** despite outscoring Ideogram numerically (48 vs 28 weighted-visual) — its 0/17 real vote count (the single worst engagement result of all 4 candidates, worse than Ideogram's 1/17) directly contradicts naming it a winner under a rubric built to proxy real satisfaction. Its typography engine remains fully validated and lives on inside the Hybrid winner.
- **New Phase 16 hard requirement:** any phone/chat mockup appearing in a Flux-generated background must always be in castellano and legible. Diagnosed root cause of the one quality gap in Hybrid's otherwise-strong human scores; it's a background-generation (Flux prompt) issue, not a defect in the Creatomate text engine, which scored 5.00/5.00 on brand and near-perfect on diacritics wherever it appeared.
- **Two decisions explicitly deferred to Felix/Susana, not resolved in the decision doc:** (1) confirm Creatomate's real per-render production pricing before Phase 16 commits volume — this evaluation ran entirely on free trial credits; (2) decide whether to keep or cancel the already-paid Gamma Pro subscription (~216EUR/yr, activated 2026-08-02) now that Gamma is not the integrated engine.
- **Router identifier:** Phase 16 should reuse `"hybrid"` (the harness's own internal name) for the `image_model` router branch for traceability, with a friendlier Wizard-facing display name left to Phase 16's own discretion.

## Deviations from Plan

None in this closing segment — Task 4 executed exactly as specified (fill sign-off block with both names + date, archive 1-2 representative renders per engine plus both score JSONs, commit doc + evidence together, skip phase-level verification for the orchestrator).

One deviation was recorded earlier in this plan's execution (documented in the doc itself, section 7): a **Rule 1 (bug) arithmetic correction** — the Hybrid operational raw score in the section 3.3 draft table said "17" but the actual sum of its three proposed operational scores (latency 6 + cost 6 + complexity 4) is 16. Corrected in section 7's reconciliation table; the original section 3.3 draft table was left untouched for traceability. Does not change any conclusion or the tie-break outcome.

## Issues Encountered

None this session. The prior sessions' human blind-review pattern (only 17 of 68 possible engine×group scores cast, by explicit reviewer design) required careful reconciliation logic in Task 3 (documented in the doc's section 7) to avoid treating unscored engines as neutral rather than rejected — that logic was already finalized and committed before this closing session began; this session verified it was internally consistent and did not need to revisit it.

## User Setup Required

None - no external service configuration required. Both pending items (Creatomate pricing confirmation, Gamma Pro keep/cancel) are decisions, not setup steps, and are explicitly deferred to the user per section 8.6 of `15-DECISION.md`.

## Next Phase Readiness

**Phase 16 (integration) is fully unblocked and has a defensible, signed mandate to execute against:**
- Engine to integrate: Hybrid (FAL Flux 2 Pro background + Creatomate overlay), router identifier `"hybrid"`
- Call: full replacement of Ideogram, with Ideogram code retained as a manual fallback during a production-validation period (Phase 16 to define the specific validation volume/duration with Felix/Susana)
- New hard requirement to design into the Flux prompt templates: phone/chat mockups always castellano + legible
- Two external decisions to resolve before or during Phase 16: Creatomate real pricing confirmation, Gamma Pro subscription keep/cancel — neither blocks starting Phase 16's build, but the pricing one should be resolved before committing real production volume
- No Remotion work of any kind is in scope; reconsider only if/when video/Reels (PREM-03) becomes a stated goal

No blockers. Phase 15 is complete (5/5 plans).

---
*Phase: 15-comparison-templates-eval-harness-decision*
*Completed: 2026-08-03*

## Self-Check: PASSED

All claimed files verified present on disk (15-DECISION.md, this SUMMARY, evidence/human-scores.json, evidence/rubric-scores.json, 4 representative render PNGs sampled across all 4 engines). All 4 cited commit hashes (a6658d9, a55a510, 6c4d60f, 691864f) verified present in git log.
