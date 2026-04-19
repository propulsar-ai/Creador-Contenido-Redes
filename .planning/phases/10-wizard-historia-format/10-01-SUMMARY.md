---
phase: 10-wizard-historia-format
plan: 01
subsystem: ui

tags: [wizard, stories, ideogram, image-validation, node-fetch]

requires:
  - phase: 09-scheduling (or prior)
    provides: Wizard PASO structure (topic → type → format → platforms → image → schedule)
provides:
  - PASO 3 three-option menu (Historia [1], Post Individual [2], Carrusel [3])
  - isStory boolean driven by fmtChoice.trim() === "1"
  - isCarousel mapping moved from "2" to "3"
  - PASO 5 Story branch that auto-selects imageModel="ideogram"
  - has_text_in_image defaulting to true in Story flow (Enter/"s" → true)
  - hasOwnImage + imageUrl populated when user supplies a custom Story image
  - validateImageIs916(url, timeoutMs=8000) helper (PNG/JPEG dim parser, WebP/unknown → warning, 9:16 ±5% tolerance)
affects: [10-02-wizard-brief-construction, 11-12-13-stories-publishing]

tech-stack:
  added: [AbortController + native fetch + Buffer magic-byte parser (no new npm deps)]
  patterns: [three-way format branch, retry loop with three-outcome validator (ok/err/warn), auto-model selection for format-locked flows]

key-files:
  modified:
    - wizard/run.js

key-decisions:
  - "Historia gets slot [1] in PASO 3 (Carousel shifted to [3], Post Individual becomes [2]) — aligns with product priority for v1.2 Stories"
  - "Ideogram v3 is auto-selected for Stories (no model menu) — enforces best-practice for 9:16 text-in-image"
  - "has_text_in_image defaults to true in Story flow (Enter treated as 's') — locked decision from CONTEXT.md"
  - "Custom Story image URL validated client-side to 9:16 ±5% before brief is submitted to n8n — fails fast at UX layer"
  - "Three-outcome validator API ({ok:true}, {ok:false,error}, {ok:null,warning}) distinguishes hard failures from non-blocking warnings so WebP/unknown formats don't block the user"
  - "Zero-dependency image parser (native fetch + Buffer) — PNG magic bytes + JPEG SOF marker walk covers 99% of real-world Story uploads"

patterns-established:
  - "Format-locked image selection: when a format mandates a specific model (Carousel → Ideogram, Story → Ideogram), skip the model menu entirely and print an informational line"
  - "Retry-with-fallback loop: client-side validation offers {retry | fallback-to-AI-generated | cancel} on each failure"
  - "Three-state validator return: ok=true (pass), ok=false (hard reject), ok=null (warning requiring user confirmation)"

duration: 1min
completed: 2026-04-19
---

# Phase 10 Plan 01: Wizard Historia Format Summary

**PASO 3 gains a Historia [1] option that auto-selects Ideogram v3 in PASO 5 and validates any user-supplied image URL is 9:16 vertical before submission.**

## Performance

- **Duration:** ~1 min (small, surgical edits to a single file)
- **Started:** 2026-04-19T17:44:43Z
- **Completed:** 2026-04-19T17:46:00Z (approx)
- **Tasks:** 3
- **Files modified:** 1 (wizard/run.js)

## Accomplishments

- Historia is now a first-class format in the Wizard, surfaced as option [1] in PASO 3 with 24h-expiry messaging.
- isStory / isCarousel mapping cleanly drives three separate PASO 5 flows without duplicating Post Individual logic.
- Added a zero-dependency 9:16 image validator (PNG + JPEG dim parser, WebP/unknown fall through to user-confirm) that reuses native Node 18+ fetch.
- Story branch produces the right brief fields (imageModel=ideogram, hasTextInImage default true, hasOwnImage/imageUrl when applicable) ready for Plan 02's brief construction.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update PASO 3 menu to three options and introduce isStory boolean** — `2972285` (feat)
2. **Task 2: Add validateImageIs916() helper function** — `a663fb9` (feat)
3. **Task 3: Add PASO 5 Story branch (auto-select Ideogram + has_text_in_image + custom image 9:16 validation)** — `4b6938d` (feat)

**Plan metadata:** _(to be assigned after this summary is written)_

## Files Created/Modified

- `wizard/run.js` — Three-option PASO 3 menu with isStory/isCarousel booleans; new module-level validateImageIs916() helper; PASO 5 `else if (isStory)` branch (auto-Ideogram, has_text default=true, custom URL validation retry loop).

## Decisions Made

- **Helper placement:** validateImageIs916() is placed just above `async function runWizard()` (right after parsePublishTime and madridLocalToUTC), following the existing cluster of module-level helpers. This keeps all async helpers co-located.
- **Variable naming inside Story branch:** Reused the outer-scope `let` declarations of imageModel / imageUrl / hasOwnImage / hasTextInImage at lines 451–454. No new `let` declarations added inside the new branch — just assignments, matching the existing Carousel branch's style.
- **Range header on fetch:** `'Range': 'bytes=0-2048'` limits network payload to the first 2 KB, which is sufficient for PNG (dims in bytes 16–24) and the vast majority of JPEG SOF markers near the top. Servers that ignore Range still work (we only read what we need from the buffer).

## Deviations from Plan

None — plan executed exactly as written. All three tasks followed the spec verbatim. Verification steps (grep counts, syntax check, ratio math) all passed on the first run.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Plan 02 will construct the brief that carries `isStory` / `imageModel=ideogram` / `hasTextInImage` into n8n; no env vars or dashboards changed in Plan 01.

## Next Phase Readiness

Ready for **Plan 10-02 (Wizard brief construction)**. Plan 02 can rely on:

- `isStory` boolean in scope at brief-construction time
- `imageModel === "ideogram"` when isStory is true
- `hasTextInImage` populated (default true for Stories)
- `hasOwnImage` and `imageUrl` populated only when user supplied a validated 9:16 URL
- `fal_model_id` resolves correctly via existing `IMAGE_MODELS[imageModel]?.falModel` lookup (Ideogram entry already present)

Downstream phases (12-IG-Story, 13-FB-Story) will consume the brief shape that Plan 02 finalizes.

---
*Phase: 10-wizard-historia-format*
*Completed: 2026-04-19*

## Self-Check: PASSED

- wizard/run.js present
- Commit 2972285 present (Task 1 — PASO 3 menu)
- Commit a663fb9 present (Task 2 — validateImageIs916 helper)
- Commit 4b6938d present (Task 3 — PASO 5 Story branch)
- 10-01-SUMMARY.md written
- `node --check wizard/run.js` passed after each task
