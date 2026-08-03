---
phase: 16-winning-engine-integration-all-formats
plan: 04
subsystem: infra
tags: [n8n, executeWorkflow, image-generation, creatomate, fal-flux, ideogram-replacement]

# Dependency graph
requires:
  - phase: 16-winning-engine-integration-all-formats (16-02)
    provides: n8n/subworkflow-hybrid-image.json (Hybrid sub-workflow, input/output contract)
  - phase: 16-winning-engine-integration-all-formats (16-03)
    provides: hardened GPT-4o design schema (headline/body/badge/cta/background_prompt/layout) on parse-content and parse-carousel
provides:
  - All 3 Ideogram call sites (single router branch, hardcoded Story branch, per-slide carousel branch) repointed to the Hybrid sub-workflow via 3 new executeWorkflow nodes + 3 mapper Code nodes
  - 3 dormant Ideogram nodes (zero incoming connections, outgoing intact, DORMANTE notes) as manual-reconnect emergency fallback
  - 3 fixed extraction nodes reading the Hybrid contract (imageUrl) instead of Ideogram's data[0].url, now fail-loud on missing URL
  - engine_actual: 'hybrid' traceability marker on all 3 extraction outputs (null for flux/nanoBanana/custom)
affects: [16-05, 16-06, 16-07, 16-08, 16-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-shape mapper Code node (mode runOnceForAllItems) immediately before an executeWorkflow node when the node's own workflowInputs mapping can't cleanly express a reshape — mirrors this repo's existing convention of a Set/Code node after an Execute Workflow call (🔗 Merge Rehost Output) rather than before, but the principle (small dedicated reshape node, not inline expression gymnastics) is the same"
    - "workflowId placeholder string (HYBRID_SUBWORKFLOW_ID) substituted at deploy time, exactly mirroring 🔁 Re-host Images' hardcoded real ID pattern"
    - "Dormant node fallback: sever only incoming connections, keep outgoing connections and add an explicit DORMANTE note naming the exact reconnect point — restores in one edit"

key-files:
  created: []
  modified:
    - n8n/workflow.json (6 new nodes: 3 executeWorkflow + 3 mapper Code nodes; 3 connection retargets + 6 new connection entries; 3 extraction node bodies fixed; DORMANTE notes on 3 Ideogram nodes)

key-decisions:
  - "Carousel per-slide design fields (layout/headline/body/badge/cta/background_prompt) are NOT threaded through 🎠 Explode Slides (which only forwards legacy Ideogram fields: texto_overlay/prompt) — instead, 🧩 Map Hybrid Input (Slides) reads them directly from 🔧 Parsear prompts carrusel's own `slides` array (16-03's design_slides), matched by slide_num. This keeps 🎠 Explode Slides byte-identical (satisfying the plan's own diff-scope constraint) and preserves its legacy fields for the dormant Ideogram fallback if manually reconnected."
  - "engine_actual is set to 'hybrid' unconditionally in normalize-image-story and collect-carousel-urls (both nodes are 100% dedicated to what was always the Ideogram-only path), but conditionally (model === 'ideogram' ? 'hybrid' : null) in normalize-image, which is shared across flux/nanoBanana/ideogram/custom — an unconditional marker there would mislead the 10-post validation audit trail into counting non-Hybrid runs."
  - "Changed the 3 extraction nodes from console.warn-and-continue to throw-on-missing-url (house fail-loud pattern) per the plan's explicit action item 5 — previously normalize-image/normalize-image-story only warned, letting a null final_image_url silently propagate downstream."
  - "collect-carousel-urls now explicitly re-sorts items by the sub-workflow's returned `index` before building image_urls, as defense-in-depth on top of the sub-workflow's own internal re-sort (🗂️ Collect Results) — belt-and-braces per the plan's own risk framing for the closing-slide-missing bug class."

patterns-established:
  - "Mapper-node-before-executeWorkflow: when an Execute Workflow node's input needs a specific shape distinct from the current item, insert a small Code node immediately upstream rather than trying to express the reshape in workflowInputs itself."

# Metrics
duration: ~25min
completed: 2026-08-03
---

# Phase 16 Plan 04: Wire Hybrid Sub-workflow Into All 3 Ideogram Call Sites Summary

**All 3 Ideogram call sites (single, Story, carousel) now route `image_model: "ideogram"` through the Hybrid (FAL Flux + Creatomate) sub-workflow via 3 new executeWorkflow nodes, with Ideogram itself demoted to a disconnected-input manual fallback.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-03 (this session)
- **Completed:** 2026-08-03T14:28:06Z
- **Tasks:** 2/2 completed
- **Files modified:** 1 (`n8n/workflow.json`)

## Accomplishments
- Added 3 `executeWorkflow` nodes (🎨 Hybrid — Single/Story/Slides) carrying the `HYBRID_SUBWORKFLOW_ID` placeholder (substituted at deploy by Plan 16-06), each preceded by a dedicated mapper Code node that reshapes upstream design fields into the Hybrid sub-workflow's `{index, layout, headline, body, badge, cta, background_prompt, width, height}` input contract
- Retargeted all 3 independent Ideogram call sites (Research Finding 1's trap: Story and Carousel hardcode Ideogram directly, bypassing the `image_model` router entirely) to the new Hybrid nodes
- Demoted the 3 Ideogram nodes to dormant (zero incoming connections, verified programmatically; outgoing connections untouched) with an explicit Spanish "restore = reconnect" note naming the exact upstream node
- Fixed the 3 downstream extraction nodes to read the Hybrid contract (`imageUrl`) instead of Ideogram's `data[0].url`, converted them to fail-loud (throw) on missing URL, and added an `engine_actual` traceability marker for the 10-post validation window
- Verified the entire retarget graph, the fixed extraction logic (including sort-by-index and the count guard), and the fail-loud paths via disposable `node -e`/`vm` simulation scripts (not committed) — not just static inspection

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 3 Hybrid call sites and retarget the 3 Ideogram connections** - `d537b5c` (feat)
2. **Task 2: Fix the 3 Ideogram-shape extraction nodes + traceability marker** - `f3f3d46` (feat)

_No separate plan-metadata commit was requested for this execution; STATE.md/SUMMARY.md land in the final docs commit below._

## Files Created/Modified
- `n8n/workflow.json` - 6 new nodes (3 `executeWorkflow` + 3 mapper `code` nodes), 3 connection retargets + 6 new connection entries, 3 extraction node bodies rewritten to the Hybrid contract, DORMANTE notes added to the 3 Ideogram nodes. Node count 92 → 98.

## Decisions Made
- Carousel per-slide design fields sourced from `🔧 Parsear prompts carrusel`'s own `slides` array inside the new mapper node (matched by `slide_num`) rather than modifying `🎠 Explode Slides` itself — keeps that node byte-identical and its legacy Ideogram fields (`texto_overlay`/`prompt`) intact for the dormant fallback.
- `engine_actual` is unconditional `'hybrid'` in the two Ideogram-only-dedicated nodes (Story extraction, carousel collect) but conditional in the shared single-post extraction node (`model === 'ideogram' ? 'hybrid' : null`) to avoid mislabeling Flux/NanoBanana/custom runs.
- Extraction nodes converted from `console.warn`-and-continue to `throw` on missing URL, per the plan's explicit fail-loud requirement (action item 5) — this is a behavior change beyond a pure string-shape fix, applied to all 3 nodes uniformly.
- `collect-carousel-urls` now explicitly sorts by `index` before building `image_urls`, defense-in-depth on top of the sub-workflow's own internal re-sort.

## Deviations from Plan

None requiring a Rule 4 (architectural) escalation. Two implementation refinements made within Task 1/Task 2's own stated bounds, both documented above under "Decisions Made" and both necessary for correctness (Rule 1/Rule 3 territory, auto-applied per the deviation rules — no user permission needed, fully reversible, scoped to `n8n/workflow.json` only):

**1. [Rule 3 - Blocking] Carousel design fields sourced via cross-node lookup instead of threading through Explode Slides**
- **Found during:** Task 1 (carousel call site wiring)
- **Issue:** `🎠 Explode Slides` only forwards legacy Ideogram fields (`slide_num`, `texto_overlay`, `prompt`, `approval_number`, `num_images`, `topic`, `type`) — it does NOT carry the `layout`/`headline`/`body`/`badge`/`cta`/`background_prompt` fields that `🔧 Parsear prompts carrusel` (16-03) already computes per slide. Without a fix, `🧩 Map Hybrid Input (Slides)` would have nothing to map.
- **Fix:** `🧩 Map Hybrid Input (Slides)` reads `$('🔧 Parsear prompts carrusel').first().json.slides` directly and matches each Explode Slides item by `slide_num`, instead of requiring Explode Slides to be modified.
- **Files modified:** `n8n/workflow.json` (new node only — `🎠 Explode Slides` itself is byte-identical, confirmed via scoped diff)
- **Verification:** Scoped `git diff` confirms `🎠 Explode Slides`'s own node body has zero changes; the new mapper node's cross-reference lookup was validated by the connection-graph assertion script (Task 1 verify) and is structurally identical to the repo's existing cross-node-reference convention (e.g. `normalize-image` reading `$('🔧 Parsear contenido')`).
- **Committed in:** `d537b5c` (Task 1 commit)

**2. [Rule 1 - Bug] Extraction nodes changed from console.warn to fail-loud throw**
- **Found during:** Task 2 (extraction node fixes)
- **Issue:** The plan's action item 5 explicitly required fail-loud behavior ("if imageUrl is missing/empty, throw... existing house pattern"), but `normalize-image` and `normalize-image-story` previously only `console.warn`'d and let a `null` `final_image_url` silently propagate downstream (a latent bug independent of this plan's shape-change).
- **Fix:** Both nodes (plus `collect-carousel-urls`, which already threw on count mismatch) now `throw new Error(...)` with a Spanish message naming the node when the URL can't be extracted.
- **Files modified:** `n8n/workflow.json` (3 extraction node bodies)
- **Verification:** Simulated all 3 nodes with a fake missing-URL input via a disposable `vm`-based harness (not committed) — all 3 threw with the expected message; the ideogram/flux/story/carousel success paths were also simulated and returned the correct `final_image_url`/`image_urls` and `engine_actual` values.
- **Committed in:** `f3f3d46` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug) — both required by the plan's own action items, not scope creep.
**Impact on plan:** Both refinements were necessary to make the plan's stated data flow actually work end-to-end; no architectural change, no new dependency, no file outside `n8n/workflow.json` touched.

## Issues Encountered
None beyond the deviations above.

## User Setup Required

None - no external service configuration required. This plan is repo-only (no deploy); the `HYBRID_SUBWORKFLOW_ID` placeholder is substituted at deploy time by Plan 16-06.

## Next Phase Readiness

- The main workflow's repo definition (`n8n/workflow.json`) now has all 3 Ideogram call sites wired to the Hybrid sub-workflow, with the Ideogram nodes preserved as a dormant, single-reconnect fallback for the validation window.
- Not yet deployed to production, and the Hybrid sub-workflow itself (`n8n/subworkflow-hybrid-image.json`) has not yet been created as a live n8n workflow — both are later Phase 16 plans' jobs (per the roadmap, deploy is Plan 16-06).
- `HYBRID_SUBWORKFLOW_ID` placeholder must be substituted with the real sub-workflow ID once it's imported/created in production n8n, before any live execution can succeed.
- No blockers for Plan 16-05 onward.

## Self-Check: PASSED

- FOUND: `.planning/phases/16-winning-engine-integration-all-formats/16-04-SUMMARY.md`
- FOUND: commit `d537b5c` (Task 1)
- FOUND: commit `f3f3d46` (Task 2)

---
*Phase: 16-winning-engine-integration-all-formats*
*Completed: 2026-08-03*
