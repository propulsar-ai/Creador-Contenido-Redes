---
phase: 10-wizard-historia-format
plan: 02
subsystem: ui

tags: [wizard, stories, scheduling, brief-validation, 22h-cap]

requires:
  - phase: 10-01 (PASO 3 Historia menu + isStory boolean + validateImageIs916)
    provides: isStory / isCarousel flags, imageModel defaulting to ideogram for Stories, hasOwnImage/imageUrl populated in Story branch
provides:
  - PASO 6 22h scheduling cap for Stories (WIZ-04, SCHED-01) with locked error wording
  - storyExpiresAt ISO-UTC calculation (publishAt + 24h, or now()+24h)
  - Story brief fields via spread: format="story", aspect_ratio="9:16", num_images=1, story_expires_at
  - validateStoryBrief() module-level assert helper
  - Synchronous fail-loud check before sendWebhook(brief)
  - RESUMEN FINAL Story branch (Formato, Imagen/Modelo, Expira Madrid local)
affects: [11-n8n-router-story, 12-ig-story-publishing, 13-fb-story-publishing]

tech-stack:
  added: []
  patterns:
    - "Guarded spread for format-specific brief fields: ...(isStory && {...})"
    - "Fail-loud brief validator: synchronous throw between build and webhook for surface-level structural issues"
    - "Layered scheduling cap: format-specific cap applied AFTER shared parsePublishTime (never modifying the shared helper)"

key-files:
  modified:
    - wizard/run.js

key-decisions:
  - "22h cap applied at BOTH parse points (initial + retry) inside the while(result.error) loop — duplicates ~6 lines but keeps logic local and obvious"
  - "parsePublishTime NOT modified — shared with Post/Carousel, per RESEARCH.md anti-pattern #1"
  - "storyExpiresAt computed ONCE, positioned before the RESUMEN block so it's in scope for both the display and the later brief spread (single source of truth)"
  - "validateStoryBrief placed at module scope right after validateImageIs916 (co-located with other story helpers)"
  - "Story brief validator enforces: aspect_ratio='9:16', num_images=1, story_expires_at required + ends with Z, model must be ideogram unless has_own_image"
  - "Error message wording verbatim from CONTEXT.md including 'Elegí' (Spanish voseo) and 2h margin explanation"
  - "'ahora' / publish_at='now' shortcut bypasses 22h cap (24h full visibility window available)"
  - "Madrid expiry display uses existing Intl.DateTimeFormat pattern (consistent with PASO 6 publishAt display)"

patterns-established:
  - "Format-specific scheduling caps layer on top of shared parsePublishTime — never modify the shared parser"
  - "Per-format brief extensions use spread-with-guard: ...(isCarousel && {...}) and ...(isStory && {...}) are mutually exclusive"
  - "Synchronous assertion before webhook catches structural bugs early and leverages the existing runWizard().catch() handler"

duration: 2min
completed: 2026-04-19
---

# Phase 10 Plan 02: Wizard Brief Construction Summary

**Stories now have a complete end-to-end Wizard flow: 22h scheduling cap, 24h expiry calculation, Story-shaped brief JSON, fail-loud validation, and Madrid-local expiry display in RESUMEN FINAL.**

## Performance

- **Duration:** ~2 min (three surgical edits to a single file)
- **Started:** 2026-04-19T17:49:12Z
- **Completed:** 2026-04-19T17:51:13Z
- **Tasks:** 3
- **Files modified:** 1 (wizard/run.js)

## Accomplishments

- 22h Story scheduling cap enforced in PASO 6 at both parse points (initial attempt + retry after error) — error message locked verbatim from CONTEXT.md.
- `storyExpiresAt` computed once with `.toISOString()` (always ends in Z), positioned before RESUMEN so it's in scope for both display and brief spread — single source of truth.
- Brief JSON now includes format="story", aspect_ratio="9:16", num_images=1, story_expires_at via `...(isStory && {...})` spread — fully parallel to existing `...(isCarousel && {...})` pattern.
- `validateStoryBrief()` helper added at module scope; called synchronously right before `sendWebhook(brief)` — throws with diagnostic message on malformed Story briefs.
- RESUMEN FINAL restructured from two-way to three-way branch: Carrusel unchanged, Historia with three dedicated lines (Formato, Imagen/Modelo, Expira), Post Individual unchanged.
- Phase 10 is now COMPLETE — all four success criteria (WIZ-01 through WIZ-04 + SCHED-01) satisfied end-to-end at the Wizard layer.

## Task Commits

Each task was committed atomically:

1. **Task 1: 22h Story scheduling cap inside PASO 6 validation loop** — `a057220` (feat)
2. **Task 2: storyExpiresAt calc + Story brief spread + validateStoryBrief assert** — `55f0d9c` (feat)
3. **Task 3: Story lines in RESUMEN FINAL display** — `2e71563` (feat)

## Files Created/Modified

- `wizard/run.js` —
  - PASO 6 gains two `if (!result.error && isStory && result.publish_at !== 'now')` checks (after initial parse and retry parse) that reject publish times >22h with the locked error message.
  - New `validateStoryBrief(brief)` helper right after `validateImageIs916`.
  - New `const storyExpiresAt = ...` computed just before the RESUMEN block (in scope for both display and brief).
  - Brief literal gains a `...(isStory && { format, aspect_ratio, num_images, story_expires_at })` spread mirroring the existing Carousel spread.
  - `validateStoryBrief(brief);` call on the line immediately before `await sendWebhook(brief);`.
  - RESUMEN FINAL format branch restructured from `if (isCarousel) / else` to `if (isCarousel) / else if (isStory) / else`.

## Decisions Made

- **22h cap duplication over IIFE:** The cap check is duplicated verbatim at the two parse points rather than extracted into a helper. Task spec called this out explicitly ("Prefer clarity over DRY here — this is a short validation block"). Both copies use identical error text so behavior is consistent on retry.
- **storyExpiresAt position (single declaration):** Placed after PASO 6's publishAt is finalized and BEFORE the RESUMEN `div()` divider. This satisfies Task 3's requirement (in scope for RESUMEN) while keeping a single declaration that's reused by Task 2's brief spread. `grep -c "const storyExpiresAt"` = 1 confirms single source of truth.
- **Error message wording:** Copied verbatim from CONTEXT.md including Spanish voseo ("Elegí"), "margen de 2h" explanation, and the 22h framing. LOCKED.
- **Validator scope:** validateStoryBrief is a no-op for non-Story briefs (`if (brief.format !== 'story') return`), so calling it unconditionally after the brief is built is safe and keeps the call site simple.
- **Madrid expiry display format:** Reuses the existing PASO 6 scheduled-publish display pattern (weekday + HH:MM, Europe/Madrid timezone, Spanish locale, 24h clock, capitalized first letter). Visually consistent with the rest of the Wizard.

## Deviations from Plan

None — plan executed exactly as written. All three tasks followed the spec verbatim. Verification (node --check, grep counts, logic sanity tests for 23h/21h/validator) all passed first try.

## Issues Encountered

None.

## User Setup Required

None. No env vars changed, no new dependencies, no external service configuration. Purely a Wizard-layer enhancement.

## Phase 10 Completion Notes

Phase 10 is now complete. All four success criteria satisfied:

- **[WIZ-01]** Historia visible as option [1] in PASO 3 ✅ (Plan 10-01)
- **[WIZ-02]** Brief JSON for Stories contains format="story", aspect_ratio="9:16", num_images=1, story_expires_at (ISO UTC Z) ✅ (Plan 10-02)
- **[WIZ-03]** PASO 5 only shows Ideogram for Stories; no Flux/Nano Banana offered ✅ (Plan 10-01)
- **[WIZ-04 / SCHED-01]** Wizard rejects Story scheduling >22h with locked error message, re-prompts until valid ✅ (Plan 10-02)

### Downstream Consumers (Phase 11-13)

The finalized Story brief shape is now contracted and validated at the Wizard boundary. Downstream phases will consume:

- **Phase 11 (n8n router):** `format === "story"` routes to the Story sub-workflow; `aspect_ratio` and `num_images` inform the Ideogram node configuration; `story_expires_at` feeds into Supabase session metadata for expiry tracking.
- **Phase 12 (IG Story publishing):** `story_expires_at` drives the 24h TTL messaging in the WhatsApp preview; `has_own_image` + `image_url` skip the Ideogram generation node when user supplied a validated 9:16 image.
- **Phase 13 (FB Story publishing):** Same contract as Phase 12, adapted to the FB Graph API two-step or single-step flow (TBD per FBSTORY-01 live API test).

### Guarantees to Downstream Phases

- `story_expires_at` is GUARANTEED to be ISO 8601 UTC ending in `Z` (enforced by validateStoryBrief).
- `aspect_ratio` is GUARANTEED to be the literal string `"9:16"`.
- `num_images` is GUARANTEED to be the number `1`.
- `image_model` is GUARANTEED to be `"ideogram"` UNLESS `has_own_image === true` (in which case `image_url` is a validated 9:16 URL).
- Scheduled publish time is GUARANTEED to be ≤22h from `now()` at the moment of Wizard execution (or `publish_at === "now"`).

Any brief that violates these guarantees will throw synchronously at the Wizard layer before the webhook fires — Phase 11+ nodes can trust the shape without re-validating.

---
*Phase: 10-wizard-historia-format*
*Completed: 2026-04-19*

## Self-Check: PASSED

- wizard/run.js present
- 10-02-SUMMARY.md written
- Commit a057220 present (Task 1 — 22h Story cap)
- Commit 55f0d9c present (Task 2 — storyExpiresAt + brief spread + validateStoryBrief)
- Commit 2e71563 present (Task 3 — RESUMEN Story lines)
- `node --check wizard/run.js` passed after each task
- All grep verification counts pass (isStory≥6, validateStoryBrief=2, const storyExpiresAt=1, "9:16"≥2, Las Stories expiran=2)
