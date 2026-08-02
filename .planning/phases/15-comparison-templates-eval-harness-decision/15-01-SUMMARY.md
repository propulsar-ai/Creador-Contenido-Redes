---
phase: 15-comparison-templates-eval-harness-decision
plan: 01
subsystem: testing
tags: [creatomate, renderscript, template-as-code, brand-templates, eval-harness]

# Dependency graph
requires:
  - phase: 15-comparison-templates-eval-harness-decision (15-03)
    provides: scripts/eval-design-engines.js's callCreatomate() caller and layoutForSlide() naming convention, coded ahead of these templates existing
provides:
  - "5 Propulsar brand template JSONs (creatomate/templates/*.json) implementing the canonical dark-gradient/purple-magenta/Syne-Arimo brand as repo-committed RenderScript (template-as-code)"
  - "Working Creatomate free-trial account + CREATOMATE_API_KEY (local .env only) + confirmed working API base URL (/v1, not /v2)"
  - "Auto-fit text mode proven against the real 'veterinaria s.' production overflow bug"
  - "User-approved test renders vs brand/referencias/ — EVAL-01 satisfied"
affects: [15-04-comparison-run-and-decision, 16-diseno-premium-integration]

# Tech tracking
tech-stack:
  added: [creatomate (RenderScript template-as-code, /v1 REST API)]
  patterns:
    - "RenderScript source posted inline via POST body's `source` field — no visual-editor-authored template needed, fully repo-controlled"
    - "Placeholder-substitution convention for dynamic fields ({{HEADLINE}}, {{BODY}}, {{BADGE}}, {{IMAGE_URL}}) done by the calling harness before POSTing `source`, not via Creatomate's own [dynamic elements] modifications API"
    - "All variable-content text elements use vendor-native auto-fit (font_size: null + font_size_minimum + font_size_maximum) instead of hand-rolled text measurement — the direct fix for the veterinaria-class overflow bug"
    - "Template filenames follow eval-design-engines.js's existing layoutForSlide() convention (carousel-${slide.layout}: carousel-opening/middle/closing) rather than the plan draft's carousel-slide1 naming — resolved during authoring to keep the harness caller and templates in sync"

key-files:
  created:
    - creatomate/templates/single.json
    - creatomate/templates/carousel-opening.json
    - creatomate/templates/carousel-middle.json
    - creatomate/templates/carousel-closing.json
    - creatomate/templates/story.json
  modified:
    - scripts/eval-design-engines.js
    - .env (local only, not committed — CREATOMATE_API_KEY)

key-decisions:
  - "Working Creatomate API base URL is /v1 (https://api.creatomate.com/v1/renders) — /v2 404s on this account, resolving Open Question 3 from 15-RESEARCH.md for Plan 15-04/16 reuse"
  - "Template filenames renamed from the plan draft's carousel-slide1.json to carousel-opening.json to match eval-design-engines.js's pre-existing layoutForSlide() convention, avoiding a mismatch between harness and templates"
  - "~14 of 50 trial credits spent on the 5 smoke renders + bug-fix iterations, leaving ~36 for Plan 15-04's full comparison matrix — recommend confirming the exact live balance in the Creatomate dashboard before that run"

# Metrics
duration: ~45min active (spread across 2026-08-01 authoring + 2026-08-02 approval checkpoint)
completed: 2026-08-02
---

# Phase 15 Plan 01: Creatomate Brand Templates & EVAL-01 Approval Summary

**5 Propulsar brand templates authored as repo-committed Creatomate RenderScript JSON, live-render-verified via the `/v1` API, auto-fit proven against the real production overflow bug, and user-approved against brand references — EVAL-01 satisfied.**

## Performance

- **Duration:** ~45 min active work (Task 1 account setup + Task 2 authoring/smoke-render on 2026-08-01, Task 3 checkpoint approval received 2026-08-02)
- **Started:** 2026-08-01 (session, Task 1 checkpoint)
- **Completed:** 2026-08-02 (Task 3 user approval: "aprobado")
- **Tasks:** 3/3 (1 human-action checkpoint, 1 auto, 1 human-verify checkpoint)
- **Files modified:** 6 (5 template JSONs created + 1 harness script fixed)

## Accomplishments
- Created a Creatomate free-trial account for Propulsar (50 trial credits, no card required), API key stored in local `.env` as `CREATOMATE_API_KEY` (project id `1b59ad98-657b-4e95-b56d-fa6116279e3a`)
- Authored all 5 canonical brand template JSONs (single, carousel-opening/middle/closing, story) implementing the dark-gradient (`#070A18` → `#13082B` → `#08031A`) / magenta (`#BA00E0`) / cyan (`#00E5FF`) / Syne-Arimo brand spec from `15-CONTEXT.md`
- Proved vendor-native auto-fit (`font_size: null` + min/max) against the real 2026-07-20 veterinaria overflow headline that broke as "veterinaria s." in production — renders full text, shrunk, not clipped
- Resolved 15-RESEARCH.md's Open Question 3 empirically: Creatomate's working render-creation base URL is `/v1`, not `/v2` (which 404s on this account)
- Fixed a bug in the wave-1 sibling harness (`scripts/eval-design-engines.js`, built ahead of these templates in Plan 15-03): its render-status poll was hardcoded to `/v2` regardless of which base the create call used
- User approved all 5 test renders against `brand/referencias/` July 2026 references (veterinaria 2026-07-20, estética 2026-07-15, gym/HVAC singles) on 2026-08-02

## Task Commits

1. **Task 1: Crear cuenta Creatomate + obtener API key** - human-action checkpoint, no repo commit (`.env` is local-only, not tracked)
2. **Task 2: Author 5 brand template JSONs + smoke renders** - `5310bbe` (feat)
3. **Task 3: Aprobar renders vs referencias de marca** - human-verify checkpoint, approved 2026-08-02, no additional repo changes required (renders already matched on first review)

**Plan metadata:** this SUMMARY + STATE.md update (committed together per orchestrator's final-commit step)

## Files Created/Modified
- `creatomate/templates/single.json` - 1:1 single post: background image (cover) + darkening overlay + centered auto-fit headline + "CASO:" badge
- `creatomate/templates/carousel-opening.json` - carousel opening slide (renamed from the plan's draft `carousel-slide1.json` to match the harness's `layoutForSlide()` naming)
- `creatomate/templates/carousel-middle.json` - carousel middle slide: image right (~45% width), auto-fit headline+body left — this is the template that renders the real veterinaria overflow headline cleanly
- `creatomate/templates/carousel-closing.json` - carousel closing slide: no image, dark gradient bg, centered text + CTA line
- `creatomate/templates/story.json` - 9:16 story: safe zones top/bottom 14% kept text-free, strengthened overlay + translucent text scrim for legibility over busy photos
- `scripts/eval-design-engines.js` - `callCreatomate()` base-URL fix: confirmed `/v1` for render creation, corrected the render-status poll (was hardcoded to `/v2`) to follow the same base

## Decisions Made
- **Creatomate API base URL is `/v1`** (`https://api.creatomate.com/v1/renders`) — `/v2` returns 404 on this trial account. Locked for Plan 15-04's full comparison run and any future Phase 16 integration code.
- **Template naming aligned to the harness's existing convention** (`carousel-opening/middle/closing`, not the plan's draft `carousel-slide1`) rather than the reverse — cheaper to rename 1 file than touch the already-committed, already-tested `eval-design-engines.js` naming logic.
- **Placeholder substitution (`{{HEADLINE}}`, `{{BODY}}`, `{{BADGE}}`, `{{IMAGE_URL}}`) chosen over Creatomate's native dynamic-elements modifications API** — simplest, fully repo-controlled, no extra API surface to learn; the calling harness does a plain string replace before POSTing the `source` JSON.
- **Auto-fit (`font_size: null` + `font_size_minimum`/`font_size_maximum`) used on every variable-content text element** — this is the vendor-native, correct fix for the overflow-bug class that produced "veterinaria s." in production; no custom text-measurement code was written.
- **~14 of 50 trial credits spent on smoke renders + iteration** (5 templates × 1 successful render each, plus a few discarded iterations while fixing the story legibility and border-radius bugs below) — leaves an estimated ~36 credits for Plan 15-04's full comparison matrix. Recommend the user/next plan confirm the exact live balance in the Creatomate dashboard rather than trusting this estimate, since exact per-iteration spend during authoring wasn't individually logged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Creatomate API base URL: plan assumed /v2, real working base is /v1**
- **Found during:** Task 2, first smoke-render attempt
- **Issue:** `15-RESEARCH.md`'s Open Question 3 left the v1-vs-v2 base URL undetermined; the harness's draft `callCreatomate()` (built in Plan 15-03 ahead of this plan) assumed `/v2/renders`, which returned 404 on this trial account
- **Fix:** Switched the render-creation call to `/v1/renders`; also fixed the render-status poll (previously hardcoded to `/v2/renders/{id}` regardless of which base created the render) to follow the same base
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Live smoke render succeeded end-to-end (create → poll → download PNG) for all 5 templates after the fix
- **Committed in:** `5310bbe` (Task 2 commit)

**2. [Rule 1 - Bug] RenderScript payload must be nested under a top-level `source` field**
- **Found during:** Task 2, template authoring/first render attempts
- **Issue:** An early template JSON iteration posted the RenderScript body directly as the request payload; Creatomate's `/v1/renders` endpoint requires it nested under a `source` key
- **Fix:** Wrapped every template's RenderScript in `{"source": {...}}` in the harness's request-building code
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Renders succeeded after the fix (previously returned a validation error)
- **Committed in:** `5310bbe` (Task 2 commit)

**3. [Rule 1 - Bug] `border_radius` must be expressed as a percentage, not a raw pixel number**
- **Found during:** Task 2, badge/pill element authoring (the "CASO:" badge and CTA container)
- **Issue:** An early template draft set `border_radius` as a bare number (pixel-style), which Creatomate's RenderScript schema rejects — badge/pill corners require a percentage string
- **Fix:** Converted `border_radius` values to percentage strings on all badge/pill shape elements across the 5 templates
- **Files modified:** `creatomate/templates/single.json`, `carousel-opening.json`, `carousel-closing.json`
- **Verification:** Re-render succeeded with correctly rounded badge corners, visually confirmed against brand references
- **Committed in:** `5310bbe` (Task 2 commit)

**4. [Rule 1 - Bug] Story template body text illegible over busy test photos**
- **Found during:** Task 2, first story.json smoke render (before Task 3's approval checkpoint)
- **Issue:** The initial darkening overlay + body-text contrast were insufficient against a busy test photo, making body copy hard to read — would likely have failed Task 3's approval
- **Fix:** Strengthened the overlay opacity and added a translucent scrim shape directly behind the body-text element; re-rendered and re-verified before presenting to the user for Task 3
- **Files modified:** `creatomate/templates/story.json`
- **Verification:** Re-render confirmed legible body text over the same busy test photo
- **Committed in:** `5310bbe` (Task 2 commit)

**5. [Rule 3 - Blocking] Template filenames mismatched the harness's existing naming convention**
- **Found during:** Task 2, before first commit
- **Issue:** The plan's draft filename `carousel-slide1.json` didn't match `scripts/eval-design-engines.js`'s pre-existing `layoutForSlide()` function (built in the parallel wave-1 Plan 15-03), which constructs template names as `carousel-${slide.layout}` (i.e. `carousel-opening`/`carousel-middle`/`carousel-closing`) — a mismatch would have made Plan 15-04's harness runs silently fail to find the opening-slide template
- **Fix:** Named the file `carousel-opening.json` to match the harness convention instead of renaming the harness's already-tested logic
- **Files modified:** `creatomate/templates/carousel-opening.json` (filename only; plan text referred to this as `carousel-slide1.json`)
- **Verification:** Harness smoke render for the "carousel-opening" layout found and rendered the file correctly
- **Committed in:** `5310bbe` (Task 2 commit)

---

**Total deviations:** 5 auto-fixed (3 bugs, 2 blocking)
**Impact on plan:** All 5 were necessary for the templates to actually render correctly via the live API and to integrate cleanly with the already-built harness. No scope creep — the canonical brand spec, layouts, and dynamic-field convention specified in the plan were followed exactly; only implementation-level API/schema details and one filename were adjusted based on what the live API and existing harness code actually required.

## Issues Encountered

None beyond the deviations documented above — all findings were resolved inline during Task 2 before the smoke-render verification passed.

## User Setup Required

None remaining. The one external-service setup this plan required (Creatomate account creation, Task 1) is complete: free-trial account created, `CREATOMATE_API_KEY` present in local `.env` (not committed), no payment made. Trial started with 50 credits; an estimated ~36 remain after this plan's smoke-render spend — recommend confirming the exact balance in the Creatomate dashboard before Plan 15-04 budgets its full comparison matrix.

## Next Phase Readiness

- All 5 template JSONs are locked as the Creatomate assets Plan 15-04's comparison matrix will render through — no further changes anticipated unless Plan 15-04's blind review surfaces a brand-fidelity issue.
- `scripts/eval-design-engines.js`'s `callCreatomate()` is now fully live-tested end-to-end (not just coded-against-documentation as it was at the end of Plan 15-03) — base URL, `source` nesting, and polling are all confirmed working.
- EVAL-01 (Creatomate brand template exists, API-renderable, user-approved) is satisfied. Plan 15-04 can proceed with Creatomate as a fully-ready candidate.
- Wave 1 status: 15-01 (this plan) COMPLETE, 15-03 (harness/briefs) COMPLETE, 15-02 (Gamma account/theme) still open at its Task 1 human-action checkpoint — Plan 15-04 needs 15-02 to close (or an explicit "Gamma unavailable" decision) before it can run the FULL 4-engine matrix, though it could partially run Ideogram/Creatomate/hybrid today.
- Credit budget note for Plan 15-04: ~36 of 50 Creatomate trial credits remain (estimate, not a live dashboard read) — worth a quick balance check before committing to the full brief × format × engine matrix.

---
*Phase: 15-comparison-templates-eval-harness-decision*
*Completed: 2026-08-02*

## Self-Check: PASSED

- FOUND: `creatomate/templates/single.json`
- FOUND: `creatomate/templates/carousel-opening.json`
- FOUND: `creatomate/templates/carousel-middle.json`
- FOUND: `creatomate/templates/carousel-closing.json`
- FOUND: `creatomate/templates/story.json`
- FOUND: `scripts/eval-design-engines.js`
- FOUND commit `5310bbe` (Task 2)
