---
phase: 16-winning-engine-integration-all-formats
plan: 06
subsystem: infra
tags: [n8n, creatomate, fal-flux, deploy, api]

# Dependency graph
requires:
  - phase: 16-01
    provides: CREATOMATE_API_KEY wired live in the production n8n Container App
  - phase: 16-02
    provides: authored Hybrid image sub-workflow (n8n/subworkflow-hybrid-image.json)
  - phase: 16-04
    provides: main workflow repo definition wired to 3 executeWorkflow call sites (HYBRID_SUBWORKFLOW_ID placeholder)
  - phase: 16-05
    provides: offline auto-fit-tuned prompts/templates proven against real GPT-4o variance
provides:
  - Live Hybrid sub-workflow (id YegOtsUONrRx7v2J) in production, same project as the main workflow
  - Production main workflow deployed with the full Phase 16 definition (versionId 8b87219d), all downstream subsystems canary-proven untouched
  - Standalone live proof (both Flux-background and Flux-skip/Creatomate-only paths) via a disposable harness, zero real-pipeline execution
affects: [16-07, 16-08, 16-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "n8n instance requires referenced sub-workflows to have a published/active version when called from an active parent workflow (source:'database' Execute Workflow) -- activate sub-workflows before deploying the caller, not after"
    - "Disposable harness pattern extended: Webhook nodes wrap POST bodies under $json.body -- any harness feeding a webhook payload into an Execute Workflow node with mappingMode:'passthrough' needs an Extract Body step first"

key-files:
  created:
    - .planning/phases/16-winning-engine-integration-all-formats/16-06-DEPLOY.md
  modified:
    - n8n/workflow.json
    - n8n/subworkflow-hybrid-image.json

key-decisions:
  - "Activated the Hybrid sub-workflow (active=true) rather than leaving it inactive, after the PUT on the main workflow 400'd requiring a published sub-workflow version -- contradicts the plan's stated assumption but is a pure prerequisite fix, not a behavior change"
  - "Deployed the full repo n8n/workflow.json as the PUT payload (not a manual field-by-field patch) after confirming live was byte-identical to the pre-Phase-16 baseline -- safe because zero real drift existed to preserve"

patterns-established:
  - "Sub-workflow activation is now a required step before/during main-workflow deploy on this n8n instance, not an optional nicety"

# Metrics
duration: 12min
completed: 2026-08-03
---

# Phase 16 Plan 06: Production Deploy + Standalone Smoke Summary

**Deployed the Hybrid image engine (FAL Flux 2 Pro + Creatomate) to production n8n end-to-end — live sub-workflow, patch-based main-workflow deploy with 6/6 canary checks PASS, and a standalone smoke proving both the Flux-background and Flux-skip/Creatomate-only render paths — with zero real pipeline execution.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-03T15:06:54Z (approx, prior commit)
- **Completed:** 2026-08-03T15:17:51Z
- **Tasks:** 3
- **Files modified:** 2 repo files (`n8n/workflow.json`, `n8n/subworkflow-hybrid-image.json`) + 1 doc created (`16-06-DEPLOY.md`)

## Accomplishments
- Created the Hybrid Image sub-workflow live in production (`YegOtsUONrRx7v2J`), same project as the main workflow and the existing rehost sub-workflow, and substituted its real ID everywhere the repo referenced the `HYBRID_SUBWORKFLOW_ID` placeholder
- Deployed the main workflow (`Qql7mvYRxKBsPZ5t`) patch-based after confirming zero real drift against the pre-Phase-16 baseline — versionId `48202cdc` → `8b87219d`, nodes 92 → 98, `active:true` preserved
- Ran 6 byte-level canary checks (Postgres session nodes, rehost chain, Flux/NanoBanana + router IFs, dormant Ideogram node bodies + zero incoming connections, node count, real sub-workflow ID on all 3 call sites) — all PASS
- Proved the live sub-workflow end-to-end standalone via a disposable harness: a real Flux-background single-post render (headline/body/badge/cta all correct, no legible text drawn into the photo) and a real Flux-skip carousel-closing render (confirmed via sub-execution trace that `⚡ Flux Background` never ran) — harness deleted and 404-confirmed afterward

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the live sub-workflow and substitute its real ID** - `1edba83` (feat)
2. **Task 2: Patch-based deploy of the main workflow + canary checks** - `6349764` (feat)
3. **Task 3: Standalone live smoke via disposable harness** - `094e9ca` (feat)

_Note: Task 2 and Task 3's primary artifact is the same evidence doc (`16-06-DEPLOY.md`), appended to across both commits — matching the plan's own `files_modified` list._

## Files Created/Modified
- `n8n/workflow.json` - substituted the real Hybrid sub-workflow ID (`YegOtsUONrRx7v2J`) into all 3 `executeWorkflow` nodes' `workflowId.value` and their descriptive notes; this is the exact state now live in production
- `n8n/subworkflow-hybrid-image.json` - added the `id` field and `callerPolicy` setting to match the live deploy, keeping future pre-deploy diffs clean
- `.planning/phases/16-winning-engine-integration-all-formats/16-06-DEPLOY.md` - full deploy evidence: sub-workflow creation, drift check, PUT payload construction, canary results, standalone smoke payloads/responses/visual verdicts, harness cleanup, spend

## Decisions Made
- Activated the Hybrid sub-workflow rather than pursuing any alternative — the plan's assumption ("sub-workflows do NOT need active=true") does not hold on this n8n instance/version; activation is a required prerequisite for an active caller to reference it, not a functional change to the sub-workflow itself
- Deployed the repo's current `n8n/workflow.json` verbatim as the main-workflow PUT payload rather than manually re-applying each change onto a fresh GET, since the pre-deploy drift check proved live was byte-identical to the pre-Phase-16 baseline (zero out-of-band changes to preserve)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Activated the Hybrid sub-workflow before the main-workflow PUT would succeed**
- **Found during:** Task 2 (patch-based deploy)
- **Issue:** First PUT attempt on the main workflow returned HTTP 400: `Cannot publish workflow: Node "🎨 Hybrid — Single" references workflow YegOtsUONrRx7v2J ... which is not published`. The plan explicitly stated sub-workflows don't need `active=true`, but this instance enforces a published/active version on any sub-workflow referenced by an active parent's `source:"database"` Execute Workflow node.
- **Fix:** `POST /api/v1/workflows/YegOtsUONrRx7v2J/activate` (confirmed by checking the existing rehost sub-workflow, which is also `active:true`), then retried the PUT — succeeded.
- **Files modified:** None (live-only state change, no repo diff)
- **Verification:** PUT returned 200 after activation; all 6 canary checks PASS afterward
- **Committed in:** `6349764` (documented in `16-06-DEPLOY.md`, no code change needed)

**2. [Rule 1 - Bug] Fixed the disposable smoke harness's webhook-body unwrapping**
- **Found during:** Task 3 (standalone smoke)
- **Issue:** First smoke fire errored inside the sub-workflow (`unknown layout "undefined"`) because n8n's Webhook node (typeVersion 2) wraps the POST body under `$json.body` — the harness's Execute Workflow node with `mappingMode:'passthrough'` was passing the wrong shape (the whole `{headers,params,query,body}` envelope, not the body itself).
- **Fix:** Inserted an `Extract Body` Code node (`return $input.all().map(item => ({ json: item.json.body }))`) between the Webhook and Execute Workflow nodes in the harness, then re-PUT it (harness-only fix, no production impact).
- **Files modified:** None (disposable harness workflow, deleted at the end of Task 3, not committed)
- **Verification:** Both smoke payloads succeeded after the fix, imageUrls returned and visually confirmed
- **Committed in:** `094e9ca` (documented in `16-06-DEPLOY.md`)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were prerequisites for the plan's own success criteria to be provable — no scope creep, no architectural change, no behavior change to the sub-workflow's actual rendering logic.

## Issues Encountered
None beyond the 2 deviations above, both resolved within the plan's own tasks.

## User Setup Required
None - no external service configuration required (Creatomate/FAL keys already wired in Plan 16-01).

## Next Phase Readiness
- INTEG-01 is live in production: all 3 formats (single/story/carousel) route through the Hybrid engine when `image_model:"ideogram"`, downstream subsystems (Postgres sessions, rehost chain, Meta/WA publishing) proven byte-identical/untouched.
- The dormant Ideogram nodes remain in production with zero incoming connections — the locked validation-period manual-fallback path from Plan 16-04 is intact.
- No real pipeline execution occurred this plan (no WhatsApp sends, no Meta publishes) — Plans 16-07/16-08/16-09 (real live-fires across formats) can now proceed against this proven-live foundation.

---
*Phase: 16-winning-engine-integration-all-formats*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: `.planning/phases/16-winning-engine-integration-all-formats/16-06-DEPLOY.md`
- FOUND: `.planning/phases/16-winning-engine-integration-all-formats/16-06-SUMMARY.md`
- FOUND: commit `1edba83` (Task 1)
- FOUND: commit `6349764` (Task 2)
- FOUND: commit `094e9ca` (Task 3)
- Confirmed 6 occurrences of the real sub-workflow ID `YegOtsUONrRx7v2J` in `n8n/workflow.json` (3 `workflowId.value` + 3 notes) and 1 in `n8n/subworkflow-hybrid-image.json` (`id` field)
