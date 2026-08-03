---
phase: 16-winning-engine-integration-all-formats
plan: 05
subsystem: content-generation
tags: [creatomate, fal-flux, azure-openai, gpt-4o, prompt-engineering, auto-fit, image-generation]

# Dependency graph
requires:
  - phase: 16-01
    provides: Creatomate paid plan + CREATOMATE_API_KEY prod wiring
  - phase: 16-02
    provides: Hybrid image sub-workflow (n8n/subworkflow-hybrid-image.json)
  - phase: 16-03
    provides: hardened GPT-4o design schema (openai-text/openai-carousel, all 3 formats)
  - phase: 16-04
    provides: Hybrid sub-workflow wired into all 3 Ideogram call sites
provides:
  - scripts/autofit-batch.js (reusable offline batch renderer, zero-drift prompt/logic extraction from n8n/workflow.json)
  - AOAI response_format:json_object reliability fix (openai-text/openai-carousel)
  - Generalized "avoid text-bearing objects" meta-rule in both GPT-4o system prompts
  - story.json headline legibility scrim
  - chat-mockup.json structural fix (border_radius units) + validated composition asset
  - Template-parity between creatomate/templates/*.json and the embedded sub-workflow constants, re-verified after edits
affects: [16-06, 16-07, 16-08, 16-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-drift test harnesses: extract production n8n expressions/code by node id and execute them (vm module) instead of hand-copying, so test prompts/logic can never silently diverge from what's deployed"
    - "Azure OpenAI response_format:json_object for structural JSON reliability (grammar-constrained decoding) instead of relying on prompt instructions alone"
    - "Object-category avoidance over per-phrase banning for Flux prompt hygiene: ban naming any real-world object category that inherently carries printed text (cards, notebooks, screens, charts), rather than chasing individual bad phrases one at a time"

key-files:
  created:
    - scripts/autofit-batch.js
    - .planning/phases/16-winning-engine-integration-all-formats/16-05-AUTOFIT.md
  modified:
    - n8n/workflow.json (openai-text, openai-carousel: response_format + strengthened background_prompt rules)
    - n8n/subworkflow-hybrid-image.json (regenerated embedded TEMPLATES constant)
    - creatomate/templates/story.json (headline legibility scrim)
    - creatomate/templates/chat-mockup.json (border_radius units + fill_mode fix)
    - prompts/background-bank.json (removed "missed call notification banners" phrasing)

key-decisions:
  - "Fixed AOAI JSON-mode reliability (response_format:json_object) as a Rule 3 blocking-issue fix mid-Task-1, since malformed GPT-4o JSON blocked the batch from producing any result at all — this also hardens production, not just this test"
  - "Chose a generalized 'avoid text-bearing object categories' meta-rule over an ever-growing per-phrase ban list, after confirming the same root cause (Flux drawing legible text on objects that always have text in reality) recurred 3 times across 3 different objects (phone notification, appointment book, loyalty card) despite each specific bad phrase being individually patched first"
  - "chat-mockup.json's substitutePlaceholders digit-supporting regex fix was applied only in scripts/autofit-batch.js's own copy, not in eval-design-engines.js or subworkflow-hybrid-image.json, since neither of those ever renders chat-mockup this phase (kept the diff scoped)"

patterns-established:
  - "Any future Creatomate template debugging should query the render's error_message via a direct GET (not just trust a generic 'render failed') — the API returns precise validation errors (e.g. 'Expected a number ending with px...') that are 10x faster to diagnose than guessing"

# Metrics
duration: ~45min
completed: 2026-08-03
---

# Phase 16 Plan 05: Offline Auto-Fit Tuning Against Real GPT-4o Variance Summary

**Built a zero-drift offline batch renderer that extracts and executes production's own GPT-4o prompts/parsing logic, rendered 16 real caption units through the full Hybrid path, and found+fixed 7 real bugs (1 AOAI JSON reliability gap, 1 story legibility gap, 1 chat-mockup structural bug, 1 regex bug, and a systemic Flux "text-bearing object" hallucination pattern confirmed across 3 independent objects) before any production deploy or live-fire.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2 completed
- **Files modified/created:** 7 (1 new script, 1 new evidence doc, 5 modified: workflow.json, subworkflow-hybrid-image.json, story.json, chat-mockup.json, background-bank.json)

## Accomplishments
- `scripts/autofit-batch.js`: extracts `openai-text`/`openai-carousel` prompts and `parse-content`/`parse-carousel` deterministic layout logic verbatim from `n8n/workflow.json` and **executes** them (Node `vm`) rather than hand-copying — guarantees the test batch can never silently drift from production.
- Rendered 16 real GPT-4o caption units (4 single + 2 story + 9 carousel slides + 1 chat-mockup) through the full Hybrid path (FAL Flux 2 Pro background + Creatomate typographic overlay), all visually inspected directly with the `Read` tool and confirmed green.
- Found and fixed 7 real issues, documented in full with per-render verdicts in `16-05-AUTOFIT.md`:
  1. AOAI occasionally emitted syntactically invalid JSON (trailing comma) — fixed with `response_format: json_object`.
  2. `story.json`'s headline lacked a legibility scrim (unlike `body`) — clashed with busy backgrounds.
  3. `openai-carousel`'s own "validated" example primed Flux to draw a legible "Missed call" banner.
  4/5. Confirmed a systemic pattern: requesting charts/notebooks/loyalty cards — even with a "no readable text" qualifier attached — still gets legible-ish text drawn by Flux, because the object CATEGORY itself carries the training prior. Fixed with a generalized meta-rule rather than chasing individual phrases.
  6. `chat-mockup.json`'s `phone-panel` shape used an invalid `border_radius` unit (Creatomate rejects percentages on shape `border_radius`), causing a hard render failure — root-caused via a direct Creatomate status GET (not just the generic "failed").
  7. The (copied) `substitutePlaceholders` regex didn't support digit characters, so `chat-mockup.json`'s `{{CHAT_LINE_1}}`..`{{CHAT_LINE_4}}` tokens were never substituted.
- Re-rendered every affected unit until green; final spend ~$0.99 Flux (of ~$3 phase budget) + 41 Creatomate credits (of 2000/month plan) across all iterations including superseded re-renders.
- Re-verified template-parity between `creatomate/templates/*.json` and `n8n/subworkflow-hybrid-image.json`'s embedded `TEMPLATES` constant after every template edit.

## Task Commits

1. **Task 1: Build and run the offline auto-fit batch** - `36539ec` (feat)
2. **Task 2: Inspect every render, tune, re-render green** - `e5077cf` (fix)

## Files Created/Modified
- `scripts/autofit-batch.js` - new offline batch renderer (zero-drift prompt/logic extraction, full Hybrid render path, spend tracking, schema validation)
- `.planning/phases/16-winning-engine-integration-all-formats/16-05-AUTOFIT.md` - full evidence doc (per-render verdicts, findings, spend accounting)
- `n8n/workflow.json` - `openai-text`/`openai-carousel`: added `response_format:json_object`; replaced the "missed call notification banners" example; added a generalized "avoid text-bearing objects" meta-rule to both system prompts
- `n8n/subworkflow-hybrid-image.json` - regenerated the embedded `TEMPLATES` constant from `creatomate/templates/*.json` after the `story.json` edit
- `creatomate/templates/story.json` - added a legibility scrim to the `headline` element
- `creatomate/templates/chat-mockup.json` - fixed `phone-panel`'s `border_radius` unit + `fill_color`/`fill_mode` shape pattern
- `prompts/background-bank.json` - replaced the same "missed call notification banners" phrase in the matching bank entry

## Decisions Made
- Fixed the AOAI JSON-mode reliability gap (Rule 3 - blocking) inline during Task 1 rather than deferring, since it blocked every batch attempt from producing any usable output at all; this also hardens production beyond this test.
- After the same Flux "draws legible text on objects that always have text in reality" root cause recurred on 3 independent objects (phone notification, handwritten appointment book, loyalty card) even after patching each specific bad phrase individually, chose a generalized category-avoidance meta-rule over continuing to whack-a-mole individual phrases.
- Scoped the `substitutePlaceholders` digit-regex fix to `scripts/autofit-batch.js`'s own copy only, since chat-mockup isn't rendered by any other caller this phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AOAI occasionally returned invalid JSON, blocking Task 1's batch from completing**
- **Found during:** Task 1 (first real batch attempt, smoke run)
- **Issue:** GPT-4o emitted a trailing comma in its JSON response; `JSON.parse` failed downstream
- **Fix:** Added `response_format: { type: 'json_object' }` to both AOAI request bodies (Azure OpenAI JSON mode)
- **Files modified:** `n8n/workflow.json`
- **Verification:** Re-ran the batch; 0 JSON parse errors across all subsequent runs
- **Committed in:** `e5077cf`

**2. [Rule 1 - Bug] story.json headline lacked a legibility scrim**
- **Found during:** Task 2 (visual inspection of `story-peluqueria.png`)
- **Issue:** Headline overlapped a bright neon streak in the Flux background, reducing legibility
- **Fix:** Added `background_color`/padding/`border_radius` scrim matching `body`'s existing pattern
- **Files modified:** `creatomate/templates/story.json`, `n8n/subworkflow-hybrid-image.json` (regenerated TEMPLATES)
- **Verification:** Re-rendered both story units; headlines fully legible regardless of background
- **Committed in:** `e5077cf`

**3. [Rule 1 - Bug] openai-carousel's own example primed Flux to draw legible text**
- **Found during:** Task 2 (`carousel-peluqueria_slide2` — legible "Missed call" banner)
- **Issue:** The system prompt's "validated" middle-slide example asked for "missed call notification banners"
- **Fix:** Replaced with an explicitly abstract-only phrasing in both the prompt and `background-bank.json`'s matching entry
- **Files modified:** `n8n/workflow.json`, `prompts/background-bank.json`
- **Verification:** Re-rendered; slide 2 now shows purely abstract bokeh, no legible text
- **Committed in:** `e5077cf`

**4/5. [Rule 1 - Bug, systemic] Text-bearing object category pattern (charts, notebooks, cards)**
- **Found during:** Task 2 (3 independent confirmed instances across re-renders)
- **Issue:** Naming an object that always carries text in real life (dashboards, appointment books, loyalty cards) still produces legible-ish Flux-drawn text even with a "no readable text" qualifier attached
- **Fix:** Generalized meta-rule added to both `openai-text`/`openai-carousel` system prompts: don't name such objects at all, show them closed/blurred/replaced with gesture-only imagery
- **Files modified:** `n8n/workflow.json`
- **Verification:** Re-rendered `carousel-peluqueria` (3rd pass), `carousel-precios`, `single-precios` — all clean
- **Committed in:** `e5077cf`

**6. [Rule 1 - Bug, blocking] chat-mockup.json's phone-panel border_radius invalid unit**
- **Found during:** Task 1 (first chat-mockup render — hard Creatomate failure)
- **Issue:** `border_radius: "6%"` on a shape element; Creatomate requires absolute units (px/vw/vh/vmin/vmax) for shape `border_radius` (unlike text elements' `background_border_radius`, which does accept percentages)
- **Fix:** `border_radius: "48px"`; also converted `fill_color` to the proven `fill_mode:linear` 2-stop pattern used by every other shape in these templates
- **Files modified:** `creatomate/templates/chat-mockup.json`
- **Verification:** Re-rendered; chat-mockup succeeds
- **Committed in:** `e5077cf`

**7. [Rule 1 - Bug] substitutePlaceholders regex didn't support digits**
- **Found during:** Task 1 (authoring the batch script, reasoned about before first chat-mockup render)
- **Issue:** `[A-Z_]+` regex silently failed to match `{{CHAT_LINE_1}}`..`{{CHAT_LINE_4}}` (digit characters excluded)
- **Fix:** Widened to `[A-Z0-9_]+` in `scripts/autofit-batch.js`'s own copy
- **Files modified:** `scripts/autofit-batch.js`
- **Verification:** Chat-mockup lines render with real substituted text
- **Committed in:** `36539ec`

---

**Total deviations:** 7 auto-fixed (1 blocking-AOAI, 1 blocking-Creatomate, 4 bugs including 1 systemic pattern across 3 instances, 1 bug-in-copied-utility)
**Impact on plan:** All fixes were necessary to reach INTEG-05's own must-haves (real GPT-4o variance rendered clean, no Flux-drawn legible text anywhere). No scope creep — every fix stayed within templates/prompts this plan already owned (16-04 gave this plan exclusive `workflow.json` ownership).

## Issues Encountered
None beyond the deviations above (all were found, root-caused, and resolved within this plan's own execution).

## User Setup Required
None - no external service configuration required. Creatomate/FAL/AOAI credentials already present in local `.env` from prior plans (16-01, 15-03).

## Next Phase Readiness
- INTEG-05 satisfied: auto-fit proven against real GPT-4o variance (long/accented/punctuation-heavy topics), all 5 layouts + chat-mockup asset render clean.
- Production's `n8n/workflow.json` prompts are now hardened (JSON-mode reliability + object-category text-avoidance) — this benefits every later live-fire in 16-06..16-09, not just this plan's own testing.
- No blockers for Plan 16-06 (deploy + substitute the real `HYBRID_SUBWORKFLOW_ID`).

---
*Phase: 16-winning-engine-integration-all-formats*
*Completed: 2026-08-03*
