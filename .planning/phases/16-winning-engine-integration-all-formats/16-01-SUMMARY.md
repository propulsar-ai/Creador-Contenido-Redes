---
phase: 16-winning-engine-integration-all-formats
plan: 01
subsystem: infra
tags: [creatomate, azure-container-apps, key-vault, managed-identity, pricing]

# Dependency graph
requires:
  - phase: 15-comparison-templates-eval-harness-decision
    provides: "Hybrid (FAL Flux 2 Pro + Creatomate) named as the winning design engine; Creatomate trial account + API key created in Plan 15-01"
provides:
  - "Creatomate paid Essential plan contracted (EUR57.86/mes, monthly, 2000 credits/mes)"
  - "CREATOMATE_API_KEY live in production n8n Container App via Key Vault + Managed Identity, resolvable as $env.CREATOMATE_API_KEY"
  - "Live pricing evidence doc distinguishing confirmed facts from unverified aggregator numbers"
affects: [16-04, 16-05, 16-06, 16-07, 16-08, 16-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Key Vault secretRef + system Managed Identity for Container App secrets (mirrors FAL_API_KEY/IDEOGRAM_API_KEY/etc. — no plain secret values, no local passwords)"]

key-files:
  created: []
  modified:
    - ".env.example"
    - ".planning/phases/16-winning-engine-integration-all-formats/16-01-PRICING.md"

key-decisions:
  - "Contracted Creatomate Essential tier at EUR57.86/month (monthly billing) despite being above the ~$50 USD paper cap — accepted knowingly given the ~20x volume safety margin (real usage ~90 credits/month generous ceiling vs 2,000 allocated) and the VAT-driven USD-vs-EUR discrepancy discovered only at live checkout"
  - "Wired CREATOMATE_API_KEY via Key Vault secretRef + system Managed Identity, exactly mirroring FAL_API_KEY's existing pattern, rather than a plain Container App secret value"
  - "API key was not rotated on plan upgrade — verified the same key remains active, avoiding an unnecessary local/.env churn"

patterns-established:
  - "Azure secret gotcha reconfirmed: az CLI directly (not the Azure MCP keyvault tool) for all Key Vault reads/writes in this environment"

# Metrics
duration: ~20min (this resumed segment; Task 1 pricing research was a prior session)
completed: 2026-08-03
---

# Phase 16 Plan 01: Creatomate Contracting + Production Key Wiring Summary

**Creatomate Essential plan contracted live (EUR57.86/mes, 2000 credits/mes) and `CREATOMATE_API_KEY` wired into production n8n via Key Vault + Managed Identity, unblocking all later Phase 16 live Hybrid renders.**

## Performance

- **Duration:** ~20min (this resumed segment, Tasks 3 + checkpoint resolution; Task 1 pricing research completed in a prior session, commit `bfaba93`)
- **Tasks:** 3 (1 auto research, 1 human-action checkpoint, 1 auto wiring)
- **Files modified:** 2 (`.env.example`, `16-01-PRICING.md`)

## Accomplishments
- Live-verified Creatomate pricing distinguished confirmed first-party facts (credit unit, tier credit allocations, trial terms, a first-party $54/mo docs-page figure) from unverified third-party aggregator numbers, computed Propulsar's real volume need (~90 credits/month generous ceiling), and recommended Essential tier — all before any card was charged (Task 1).
- User confirmed the live checkout price (EUR57.86/month, monthly, 2000 credits) and contracted the plan; verified the existing API key remained active and unrotated (Task 2 checkpoint, resolved by user).
- Wired `CREATOMATE_API_KEY` into the production `propulsar-n8n` Container App using the exact same Key-Vault-secretRef + system-Managed-Identity pattern already used for `FAL_API_KEY`, verified 0 running executions before the restart-triggering update, and confirmed n8n healthy (`GET /api/v1/workflows` → 200) afterward (Task 3).

## Task Commits

Each task was committed atomically:

1. **Task 1: Live pricing research + volume-based recommendation** - `bfaba93` (docs)
2. **Task 2: CHECKPOINT — User verifies live price and contracts the Creatomate plan** - resolved by user, no commit (pure human-action)
3. **Task 3: Wire CREATOMATE_API_KEY into production n8n Container App** - `c3a553c` (feat)

_Note: Task 2 is a `checkpoint:human-action` — no code/repo change, only a user decision + external dashboard action._

## Files Created/Modified
- `.planning/phases/16-winning-engine-integration-all-formats/16-01-PRICING.md` - Live pricing research, volume math, recommendation (Task 1); contracted-plan record + env-var wiring evidence (Task 3)
- `.env.example` - `CREATOMATE_API_KEY` annotated as required both locally and in production, with the Key Vault wiring pattern documented

## Decisions Made
- Contracted at EUR57.86/month despite exceeding the ~$50 USD paper cap by a small margin — accepted given the ~20x volume safety margin and the VAT explanation for the USD/EUR gap; no over-cap escalation was needed since the delta was well-justified and non-material relative to margin.
- Monthly billing chosen (not annual) for flexibility during the 10-post Hybrid validation window, as originally recommended.
- Mirrored `FAL_API_KEY`'s exact wiring pattern (Key Vault secretRef + system Managed Identity) for `CREATOMATE_API_KEY` rather than introducing a new pattern (e.g. plain Container App secret) — keeps the Container App's secret configuration internally consistent.

## Deviations from Plan

None - plan executed exactly as written. Task 3's Azure CLI steps followed the plan's own prescribed sequence (inspect existing pattern → mirror it → guard against in-flight executions → update → verify) with no substitutions.

## Issues Encountered

None. The pre-checkout price research (Task 1) had correctly flagged the exact number as unconfirmed pending live checkout — the live EUR57.86 figure differing from the ~$54 paper estimate was anticipated as a possible outcome (currency/VAT), not a surprise requiring problem-solving.

## User Setup Required

None further - the one external service action this plan required (contracting the Creatomate plan) was completed by the user at the Task 2 checkpoint. No additional dashboard configuration remains.

## Next Phase Readiness

- Production `$env.CREATOMATE_API_KEY` resolves inside any n8n node — the Hybrid sub-workflow authored in Plan 16-02 (`n8n/subworkflow-hybrid-image.json`, not yet deployed) can now be deployed and live-fired without an auth failure.
- Creatomate paid plan active with 2,000 credits/month — ample for the remaining Phase 16 plans (auto-fit batch tuning, smoke tests, 3 live-fires) and beyond.
- No blockers remain from this plan. The only open Phase 16 items carried forward are unrelated to this plan (see STATE.md Open Items for 16-02/16-03 carry-overs already logged).

---
*Phase: 16-winning-engine-integration-all-formats*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: `.planning/phases/16-winning-engine-integration-all-formats/16-01-SUMMARY.md`
- FOUND: `.planning/phases/16-winning-engine-integration-all-formats/16-01-PRICING.md`
- FOUND: commit `bfaba93` (Task 1)
- FOUND: commit `c3a553c` (Task 3)
