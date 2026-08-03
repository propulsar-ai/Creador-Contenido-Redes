---
phase: 16-winning-engine-integration-all-formats
plan: 03
subsystem: content-generation
tags: [gpt-4o, azure-openai, n8n, creatomate, flux, prompt-engineering, design-schema]

# Dependency graph
requires:
  - phase: 15-comparison-templates-eval-harness-decision
    provides: 5 approved Creatomate templates + Hybrid engine decision (Flux background + Creatomate overlay)
  - phase: 16-winning-engine-integration-all-formats (16-02)
    provides: n8n/subworkflow-hybrid-image.json (repo-only Hybrid sub-workflow expecting headline/body/badge/cta/background_prompt/layout input contract)
provides:
  - GPT-4o text-generation layer (single/story + carousel) emitting the structured design schema the Hybrid sub-workflow needs to render
  - 3-source background_prompt precedence (brief field > GPT-4o > static bank) implemented n8n-side for single/story, plus brief-field precedence for carousel opening slides
  - Deterministic (code-computed, not GPT-classified) carousel slide layout with guaranteed text-only closing slides
  - Canonical #070A18/#8000A8-BA00E0/#00E5FF palette fully purged of legacy #1a1a2e/#6B46C1/#EC4899 residue in the touched prompt nodes
  - prompts/background-bank.json (canonical static bank) and creatomate/templates/chat-mockup.json (composed-chat asset, not yet wired)
affects: [16-04 (node wiring into the Hybrid router), 16-05 (offline auto-fit tuning), 16-06 (deploy), 17 (Wizard surfacing of background_prompt sources)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "3-source background_prompt precedence: optional brief field (user override) > GPT-4o design.background_prompt (hardened) > static prompts/background-bank.json fallback, applied identically wherever background_prompt is resolved"
    - "Deterministic layout classification by array position in code (slide_num===1 -> opening, last -> closing, else middle), never trusting a model-emitted layout field (Regla 1 anti-pattern avoidance)"
    - "Legacy fields (instagram.image_prompt, texto_overlay/prompt) preserved verbatim alongside new design fields so dormant Flux/NanoBanana/Ideogram fallback branches keep working untouched"

key-files:
  created:
    - prompts/background-bank.json
    - creatomate/templates/chat-mockup.json
  modified:
    - n8n/workflow.json (4 nodes: openai-text, parse-content, openai-carousel, parse-carousel — repo only, not yet deployed)

key-decisions:
  - "Badge convention: case_study -> 'CASO: {SECTOR/TEMA}', educational -> 'GUIA'/'TIP', authority -> 'DATO'/'PROPULSAR' (documented in both GPT-4o system prompts)"
  - "Carousel brief-field background_prompt precedence applies ONLY to the opening slide, not middle slides, since the brief carries one scene, not one per slide (documented via code comment in parse-carousel)"
  - "Closing slide background_prompt is forced null in code regardless of what GPT-4o returns (belt-and-braces for the text-only closing rule)"
  - "Legacy palette (#1a1a2e/#6B46C1/#EC4899) removed even from 'prohibited' references in the new prompts, since the verification check greps for absence of the literal hex strings, not just semantic intent"

patterns-established:
  - "Editing giant n8n expression/jsCode string parameters safely: build the new JS source as a plain string in a throwaway Node script, JSON.stringify() it to get the correctly file-encoded line, then splice it in as a single-line replacement (anchored on the node's own 'id' line) rather than hand-retyping escaped JSON by hand"

# Metrics
duration: ~50min
completed: 2026-08-03
---

# Phase 16 Plan 03: Hardened GPT-4o Design Schema Summary

**Rewrote GPT-4o's text-generation prompts (single/story + carousel) to emit structured headline/body/badge/cta/background_prompt design fields with a hardened, text-free, canonical-palette background_prompt and deterministic (code-computed) carousel slide layout — the schema the Hybrid engine's Creatomate templates actually consume.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files modified:** 1 (`n8n/workflow.json`, 4 nodes)
- **Files created:** 2 (`prompts/background-bank.json`, `creatomate/templates/chat-mockup.json`)

## Accomplishments
- `openai-text`/`parse-content` (single + story) now produce a `design` object (headline/body/badge/cta/background_prompt) alongside the pre-existing `instagram`/`facebook`/`image_prompt` fields, with a 3-source background_prompt precedence (brief field > GPT-4o > static bank) resolved in code
- `openai-carousel`/`parse-carousel` now produce per-slide design fields with atmosphere tied to slide position (opening=warm/emotional, middle=tech/modern, closing=text-only) and layout computed deterministically from array position in code, never trusted from the model
- Canonical palette (#070A18 / #8000A8→#BA00E0 / #00E5FF) fully replaces the legacy #1a1a2e/#6B46C1/#EC4899 palette in all 4 touched nodes — verified by direct string search, not just spot-reading
- New `prompts/background-bank.json` canonical bank (type x position, no carousel-closing entries) reconciled byte-identical (first entry per type/position) with the inline fallback embedded in `parse-content`
- New `creatomate/templates/chat-mockup.json` composed-chat asset (4 alternating bubbles, auto-fit typography) implementing the castellano/legibility hard rule — not wired into the router this phase, per 16-CONTEXT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden the single/story GPT-4o schema (openai-text + parse-content)** - `3644a61` (feat)
2. **Task 2: Harden the carousel GPT-4o schema (openai-carousel + parse-carousel) with deterministic layout** - `fc8af8f` (feat)
3. **Task 3: Background-prompt bank + composed-chat template** - `9582df3` (feat)

_No plan-metadata docs commit needed beyond the STATE.md update below (this plan has no separate deploy/USER-SETUP artifact)._

## Files Created/Modified
- `n8n/workflow.json` - 4 nodes edited: `openai-text` (system prompt now requests a `design` object), `parse-content` (extracts design.* fields + 3-source background_prompt precedence + inline bank), `openai-carousel` (per-slide design schema, atmosphere-by-position, legacy palette purged), `parse-carousel` (deterministic layout computation, closing-slide null-forcing, brief-field precedence on opening slide only)
- `prompts/background-bank.json` - canonical background_prompt bank (educational/authority/case_study x single/story/carousel-opening/carousel-middle), with a `_rules` key documenting the hard constraints
- `creatomate/templates/chat-mockup.json` - composed chat-conversation template (phone-panel + 4 alternating CHAT_LINE bubbles), derived from `single.json`'s canvas

## Decisions Made
- Badge convention documented and applied consistently across both GPT-4o system prompts (see key-decisions above)
- Carousel background_prompt brief-field override scoped to the opening slide only, with the reasoning documented inline as a code comment (the brief carries one scene, not per-slide scenes)
- All literal legacy hex codes (#1a1a2e, #6B46C1, #EC4899) removed entirely from the new prompt text, including from "prohibited" reference sentences, since the plan's own verification step asserts their literal absence

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Trailing-comma JSON corruption during initial apply script run**
- **Found during:** Task 1/2 (applying the 4 line replacements to `n8n/workflow.json`)
- **Issue:** The line-replacement helper script unconditionally appended a trailing comma to every replaced parameter line. This is correct for `jsonBody` (followed by an `options` key in the same object) but wrong for `jsCode` in `parse-content`/`parse-carousel`, where `jsCode` is the sole key in `parameters` — the extra comma produced invalid JSON (`Expected double-quoted property name`) when the file was written.
- **Fix:** `git checkout -- n8n/workflow.json` to revert to the last-known-good committed state, fixed the script to omit the trailing comma for sole-key `jsCode` lines, regenerated the replacement lines, and reapplied. Caught before any commit — the working tree was never left in a broken state across a commit boundary.
- **Files modified:** `n8n/workflow.json` (same 4 nodes, corrected)
- **Verification:** `JSON.parse()` of the full file succeeds; `git diff --stat` confirms exactly 2 lines changed per task commit
- **Committed in:** `3644a61`, `fc8af8f` (the corrected versions — the broken intermediate state was never committed)

---

**Total deviations:** 1 auto-fixed (1 bug, caught pre-commit)
**Impact on plan:** No scope creep; the bug was in the executor's own tooling (a throwaway Node script), not in the plan's design, and was caught and fixed before any commit captured the broken state.

## Issues Encountered
- n8n's expression/jsCode string parameters use a subtle double-purpose escaping scheme (the parameter value, once JSON-decoded, is itself literal JS *source code* text — including its own `\n`/`\"`/`\uXXXX` escapes — which n8n's runtime evaluates a second time). Hand-retyping ~2-5KB prompt strings with this scheme risks silent corruption. Resolved by building each new prompt as a plain JS string in a throwaway script, letting `JSON.stringify()` handle the file-level encoding automatically, and validating the result three ways before writing: (1) `JSON.parse()` on the whole file, (2) executing the reconstructed JS expression/jsCode via `new Function()` with stubbed `$json`/`$input`/`$()`, and (3) a full functional simulation of `parse-carousel`'s logic against a fake 5-slide GPT response, asserting the exact layout sequence (opening/middle/middle/middle/closing) and the closing-slide `background_prompt` null-forcing.
- Found (not touched, out of scope) an unrelated pending state from Plan 16-02 at this plan's start: `.planning/STATE.md` had uncommitted edits and `.planning/phases/16-winning-engine-integration-all-formats/16-02-SUMMARY.md` was untracked, apparently left over from a prior session that hadn't reached its final commit yet. Left untouched during this plan's task commits (deliberately unstaged after an accidental `git stash pop` re-staged them). Resolved itself concurrently during this session — a `docs(16-02): complete Hybrid image sub-workflow plan` commit (`b00e3be`) landed (from a separate concurrent process) before this plan's own STATE.md update, so no further action was needed here.

## User Setup Required

None - no external service configuration required. This plan is repo-only (n8n/workflow.json changes are not deployed to production — deploy is Plan 16-06's job per the plan's own `<objective>`).

## Next Phase Readiness
- The design-field schema (headline/body/badge/cta/background_prompt/layout) now matches the Hybrid sub-workflow's input contract from Plan 16-02 exactly (verified by direct grep of `n8n/subworkflow-hybrid-image.json`'s own field references) — Plan 16-04 can wire `parse-content`/`parse-carousel`'s output directly into the sub-workflow call without further schema translation.
- No live deploy occurred (repo-only per plan scope) — Plan 16-06 will need a fresh pre-deploy diff against current production before any PUT.
- Carry-forward note: 16-02's own STATE.md/SUMMARY.md gap (see Issues Encountered) resolved itself concurrently this session (commit `b00e3be`) — nothing further needed before Phase 16's eventual phase-level verification.

---
*Phase: 16-winning-engine-integration-all-formats*
*Completed: 2026-08-03*

## Self-Check: PASSED

- FOUND: `n8n/workflow.json`
- FOUND: `prompts/background-bank.json`
- FOUND: `creatomate/templates/chat-mockup.json`
- FOUND: `.planning/phases/16-winning-engine-integration-all-formats/16-03-SUMMARY.md`
- FOUND: commit `3644a61` (Task 1)
- FOUND: commit `fc8af8f` (Task 2)
- FOUND: commit `9582df3` (Task 3)
