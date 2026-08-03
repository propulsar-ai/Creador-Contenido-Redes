---
phase: 16-winning-engine-integration-all-formats
plan: 02
subsystem: infra
tags: [n8n, creatomate, fal-flux, image-generation, sub-workflow]

# Dependency graph
requires:
  - phase: 15-comparison-templates-eval-harness-decision
    provides: 5 approved Creatomate brand templates (creatomate/templates/*.json) + proven Flux+Creatomate hybrid pipeline (scripts/eval-design-engines.js)
provides:
  - "n8n/subworkflow-hybrid-image.json — reusable Hybrid image sub-workflow (FAL Flux 2 Pro background + Creatomate typographic overlay + bounded poll loop), contract-compatible with 3 future call sites"
affects: [16-03, 16-04, 16-05, 16-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "n8n poll-loop idiom: HTTP create -> Code (tracks poll_count, throws loud on failed/timeout) -> IF succeeded -> Wait 3s -> HTTP GET -> Code (recovers dropped fields via $('NodeName').item.json) -> loop back to the tracking Code node"
    - "splitInBatches(1) + loop-back-to-self pattern for processing items strictly one-at-a-time when a poll loop can't have multiple items in flight, done-branch accumulates all looped-back results for final re-sort"
    - "Placeholder-preserving substitution: pass a token's own {{TOKEN}} text back as its 'substitution value' to intentionally leave it unresolved for a later pass"

key-files:
  created:
    - n8n/subworkflow-hybrid-image.json
  modified: []

key-decisions:
  - "Closing-slide behavior (null/absent background_prompt) renders Creatomate-only via a genuine Flux-skip branch, NOT the eval harness's early no-image-marker shortcut — this was an explicit must-have, verified by direct code simulation, not just code review"
  - "Sub-workflow input contract is MULTIPLE n8n items (one per image), not one item wrapping an array — unlike the rehost sub-workflow's explode-then-process pattern — because the poll loop requires strict one-at-a-time processing from the first node"
  - "All 5 Creatomate templates' 'elements' arrays are embedded verbatim as a JS constant in the Prep Render Code node (generated programmatically from the repo template files, not hand-copied) — documented as needing regeneration if the source templates change"

patterns-established:
  - "Bounded async poll loop in n8n without relying on ambiguous self-referencing node runs: persist loop state (poll_count) explicitly through the item's JSON, recovering fields dropped by HTTP Request nodes via $('OriginalNode').item.json, mirroring the established pattern in n8n/subworkflow-rehost-images.json's '🔧 Build blob URL' node"

# Metrics
duration: ~15min
completed: 2026-08-03
---

# Phase 16 Plan 02: Hybrid Image Sub-workflow Summary

**Authored `n8n/subworkflow-hybrid-image.json` — a 15-node reusable n8n sub-workflow implementing FAL Flux 2 Pro background generation (conditional) + Creatomate typographic overlay + a bounded ~120s poll loop, translating the proven `scripts/eval-design-engines.js` API integrations into n8n nodes while explicitly fixing the eval harness's closing-slide early-return bug.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-03
- **Tasks:** 2 (2 auto tasks)
- **Files modified:** 1 created (`n8n/subworkflow-hybrid-image.json`)

## Accomplishments
- One canonical Hybrid image sub-workflow authored, matching the input/output contract `{layout, headline, body, badge, cta, background_prompt, width, height}` in → `{index, imageUrl}` out, ready to be called from 3 future sites (single/carousel/story) in Plan 16-06 without triplicating the poll loop (CLAUDE.md anti-pattern 7 avoided)
- Closing-slide behavior (null `background_prompt`) proven — via direct code simulation, not just inspection — to skip ONLY the Flux stage and still render a real Creatomate-only image, with the eval harness's `{skipped:true}` early-return shortcut deliberately NOT ported
- All 5 Creatomate brand templates' `elements` arrays embedded byte-identical to the repo source files (verified via deep-equality check, not just visual diff)
- Bounded poll loop (3s interval, ~120s / 40-try budget) that fails loud (`throw`) on a Creatomate `failed` status or timeout, never silently returning a broken image

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the Hybrid sub-workflow JSON** - `af72c7d` (feat)
2. **Task 2: Static validation of the sub-workflow** - `a19b370` (fix — one issue found and corrected during validation)

_Note: Task 2's validation script itself was a throwaway (scratchpad only, not committed), per the plan's own instruction._

## Files Created/Modified
- `n8n/subworkflow-hybrid-image.json` - New "🎨 Hybrid Image — Flux + Creatomate" sub-workflow: `executeWorkflowTrigger` → `splitInBatches(1)` → `🧩 Prep Render` (template pick + HEADLINE/BODY/BADGE/CTA substitution, BACKGROUND_URL deliberately left unresolved) → `🔀 ¿Necesita Flux?` IF → (`⚡ Flux Background` HTTP POST fal.run + `🧩 Insertar Fondo (Flux)`) or (`🧩 Insertar Fondo (Skip)`) → `🖌️ Creatomate Create` HTTP POST → `⏱️ Check Status` → `✅ ¿Render Completo?` IF → (`✅ Return`, loops back to `🔁 Loop Over Items`) or (`⏳ Espera 3s` → `🔎 Poll GET Creatomate` → `🔧 Fusionar Resultado Poll` → back to `⏱️ Check Status`) → done-branch → `🗂️ Collect Results` (re-sorts by index)

## Decisions Made
- **Input contract shape:** the sub-workflow expects the caller to already supply one n8n item per image (not a single wrapper item with an array field like the rehost sub-workflow's `image_urls`) — required because the poll loop must process renders strictly one at a time from the very first node, so there's no fan-out/explode step here.
- **BACKGROUND_URL two-pass substitution:** `🧩 Prep Render` substitutes HEADLINE/BODY/BADGE/CTA but deliberately preserves the literal `{{BACKGROUND_URL}}` token (by passing its own placeholder text back as the "substitution value" for that key) so a second, later substitution pass (post-Flux, or immediately on the skip branch) can fill it with either the real Flux URL or an empty string.
- **Poll-loop state recovery:** since n8n's HTTP Request node replaces `$json` with the raw response body, `poll_count` would be silently dropped every time the GET-poll node runs. Fixed by adding a dedicated `🔧 Fusionar Resultado Poll` Code node that recovers `poll_count` from `⏱️ Check Status`'s own most recent output via `$('⏱️ Check Status').item.json`, mirroring the exact recovery pattern already proven in `n8n/subworkflow-rehost-images.json`'s `🔧 Build blob URL` node.
- **Generation method:** rather than hand-writing ~500 lines of JSON (high risk of transcription errors in the 5 embedded template `elements` arrays and escaped Code-node strings), a disposable Node.js generator script (scratchpad-only, not committed) programmatically read the real `creatomate/templates/*.json` files and `JSON.stringify`'d the whole workflow object — guaranteeing byte-exact template embedding and correct JSON escaping by construction rather than by manual care.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Literal legacy palette hex string tripped the "no #1a1a2e" contract check**
- **Found during:** Task 2 (static validation, contract check 3)
- **Issue:** The `⚡ Flux Background` node's `notes` field documented the canonical-palette decision by explicitly naming the legacy `#1a1a2e` hex it replaces (mirroring how `scripts/eval-design-engines.js` documents the same decision in a comment) — this is accurate documentation, but it made the literal "legacy hex ABSENT" grep-style check fail even though the hex was never used functionally anywhere in the actual node parameters.
- **Fix:** Reworded the note to describe the replaced palette without repeating its hex value ("NOT the pre-Phase-15 dark-navy palette").
- **Files modified:** `n8n/subworkflow-hybrid-image.json` (1 line)
- **Verification:** Re-ran the Task 2 validation script — all 4 checks (template parity, connection graph lint, contract checks, closing-slide simulation) PASS.
- **Committed in:** `a19b370` (Task 2 commit)

Also worth noting (not a deviation, but a similar near-miss caught pre-commit during Task 1 itself): three explanatory comments in the generated code originally described the closing-slide fix by literally writing `{skipped:true}` (the eval harness's actual return shape) — this tripped Task 1's own "no occurrence of `skipped`" verify check before the first commit was made, so it was corrected in the same generation pass and never landed in a commit as a failure.

---

**Total deviations:** 1 auto-fixed (1 bug — documentation string, zero functional impact)
**Impact on plan:** No scope creep; the fix was a one-line wording change to satisfy a literal-string contract check, not a behavioral change.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required. This plan produces a repo-only JSON file; live deployment (importing it into n8n, wiring `FAL_API_KEY`/`CREATOMATE_API_KEY` env vars on the Container App) is explicitly Plan 16-06's job per this plan's own scope note.

## Next Phase Readiness
- `n8n/subworkflow-hybrid-image.json` is ready to be imported and wired as an Execute Workflow call from the single/carousel/story branches in a later plan (16-06 per the phase's numbering)
- Not yet deployed live — no n8n API calls, no env vars consumed, no Meta/FAL/Creatomate spend incurred by this plan
- Template drift risk: if `creatomate/templates/*.json` change before Plan 16-06 deploys this sub-workflow, the embedded `TEMPLATES` constant in `🧩 Prep Render` must be regenerated (documented in the node's own header comment)

---
*Phase: 16-winning-engine-integration-all-formats*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: `n8n/subworkflow-hybrid-image.json`
- FOUND: commit `af72c7d` (Task 1)
- FOUND: commit `a19b370` (Task 2)
