---
phase: 14-v1-2-regression-live-fire
plan: 03
subsystem: testing
tags: [n8n, postgres, meta-graph-api, instagram, facebook, ycloud, live-fire, carousel]

# Dependency graph
requires:
  - phase: 12.3-supabase-azure-migration
    provides: "save-session-carousel Postgres INSERT/recovery variant (never live-fired since migration)"
  - phase: 14-01
    provides: "hashtag-comment onError reroute fix (unproven on the carousel chain until this plan)"
  - phase: 14-02
    provides: "VERIF-01 single-post live-fire precedent, phase image budget baseline"
provides:
  - "VERIF-02: live-fire proof that save-session-carousel Postgres INSERT/recovery works end-to-end post-migration"
  - "First-ever live execution of the FB carousel branch (fb-explode-carousel-slides through fb-publish-carousel-feed) since it was written in Phase 7"
  - "Real bug found+fixed: IG carousel child-container creation retry budget too tight for Meta's intermittent fetcher (9004/2207052)"
  - "FB album rendering (vs IG single-frame swipe) classified as pre-existing Meta platform behavior, user-accepted, documented for future work"
  - "Phase 14 CLOSED — clean v1.2/Postgres-migration baseline declared for v1.3 to build on"
affects: [15-diseno-premium-eval, 16-diseno-premium-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synthetic webhook-replay re-fire: replicate YCloud's exact inbound-message payload shape (from/to/text unchanged, only id/wamid regenerated) to re-test the approval path with zero additional image-generation cost, since the flow re-reads the session's already-stored image_urls"
    - "Programmatic post-deletion confirmation via direct Graph API GET, checking for the canonical code 100/error_subcode 33 ('Object does not exist') signature — only meaningful because the same token previously succeeded reading the same objects pre-deletion"

key-files:
  created:
    - .planning/phases/14-v1-2-regression-live-fire/14-03-VERIFICATION.md
  modified:
    - n8n/workflow.json

key-decisions:
  - "Real bug (Meta 9004/2207052 intermittent media fetch on 1-2 of 5 IG carousel child containers) fixed directly per locked re-fire policy: retry budget raised maxTries 2->4, waitBetweenTries 3000ms->8000ms on ig-create-child-container, patch-deployed (versionId f2700b77 -> 48202cdc, exactly 1 node changed)"
  - "FB rendering a multi-photo carousel as an album/grid (not an IG-style single-frame swipe) is classified as pre-existing Meta platform behavior from Phase 7's attached_media design (2026-04-17), not a Phase 14 regression — user explicitly accepted after investigation, no fix possible via any organic Graph API mechanism"
  - "Zero Postgres-migration-related errors across all 3 approval attempts on the carousel session recovery path — Phase 14 Criterion 3 satisfied"
  - "Both IG test posts (14-02 single + 14-03 carousel) deleted manually by the user in-app; deletion verified programmatically via direct Graph API GET returning code 100/error_subcode 33 on both, not just user self-report"

patterns-established:
  - "Programmatic deletion confirmation is required evidence, not user-reported completion alone, whenever an API DELETE call itself is unavailable"

# Metrics
duration: ~55min
completed: 2026-08-01
---

# Phase 14 Plan 03: VERIF-02 Carousel Live-Fire Evidence + Phase Baseline Summary

**Live-fired the carousel Postgres session variant end-to-end (3 approval attempts, 1 real bug found+fixed), live-proved the FB carousel branch for the first time since Phase 7, and closed Phase 14 with a clean v1.2/Postgres-migration baseline for v1.3 to build on.**

## Performance

- **Duration:** ~55 min (across 4 human checkpoints: WhatsApp window reopen, SI approval, visual confirmation, IG manual deletion + sign-off)
- **Started:** 2026-08-01T18:03:00Z (approx, Wizard carousel submission)
- **Completed:** 2026-08-01T18:53:02Z
- **Tasks:** 7 (4 auto/investigation, 3 human checkpoints)
- **Files modified:** 2 (`n8n/workflow.json`, `14-03-VERIFICATION.md`)

## Accomplishments

- Fired a real 5-slide carousel through the full production pipeline (Wizard → n8n → Postgres carousel INSERT → WhatsApp SI approval → IG + FB carousel publish), proving `save-session-carousel`'s INSERT/recovery variant works correctly on all 3 approval attempts — the first live-fire of this variant since Phase 12.3's Supabase→Azure migration.
- Live-proved Plan 14-01's hashtag-comment `onError` reroute fix on the carousel chain: the expected code-10 hashtag failure took its error output and execution continued straight into the FB carousel branch — reaching `fb-publish-carousel-feed` for the first time ever (unreachable since it was written in Phase 7, 2026-04-17).
- Found and fixed a real, reproducible bug live: Meta's media fetcher intermittently failed to download 1-2 of 5 slide URLs from `rehost-service` (`400 code 9004/2207052`) during IG child-container creation, across 2 independent failed attempts with different slides failing each time. Root-caused as a retry-budget gap (not a broken URL — both failed URLs re-fetched clean via curl immediately after). Fixed by raising `ig-create-child-container`'s retry tolerance (`maxTries` 2->4, `waitBetweenTries` 3000ms->8000ms), patch-deployed with exactly 1 node changed, third attempt succeeded fully.
- Investigated a user-reported visual discrepancy (FB showing the carousel as "5 separate photos" instead of a swipeable carousel) via direct Graph API GETs on the post and Page — confirmed backend-side it is genuinely ONE post (`media_type: album`, 5 subattachments), and classified the album-grid rendering as a pre-existing, unfixable Meta platform limitation (no organic Graph API equivalent to IG's single-frame swipe carousel exists) dating to Phase 7's design, not a Phase 14 regression. User accepted after reviewing the evidence.
- Declared Phase 14's clean v1.2/Postgres-migration baseline: all 3 ROADMAP success criteria assessed TRUE across both live-fires (14-02 single + 14-03 carousel), with the one real Postgres bug found (14-02's `format` column) already fixed and the carousel path confirmed defect-free from its first live-fire.
- Closed out all remaining test content: both FB posts deleted via API in their respective plans; both IG posts deleted manually by the user in-app, with deletion confirmed programmatically (not just self-reported) via direct Graph API GET returning the canonical `code 100/error_subcode 33` "Object does not exist" signature on both.

## Task Commits

Tasks 1-6 (prior session segment):
1. **Task 1: Reopen WhatsApp window** - human checkpoint, no commit
2. **Task 2: Fire carousel via Wizard** - evidence captured in VERIFICATION.md (part of subsequent commits)
3. **Task 3: SI approval** - human checkpoint, no commit
4. **Task 4/investigation: full verification + real bug fix** - `5c05cd2` (fix: raise IG carousel child-container retry budget + VERIF-02 evidence)
5. **Task 5 investigation: FB album rendering diagnosis** - `f056635` (docs: investigate Task 5 FB carousel issue report)
6. **Task 5 resolution + Task 6 cleanup** - `8687b23` (docs: VERIF-02 carousel live-fire evidence + cleanup + phase baseline)

This session (Task 7 + close-out):
7. **Task 7: IG manual deletion confirmation + phase baseline sign-off** - appended to `14-03-VERIFICATION.md`, committed as part of this plan's metadata commit.

**Plan metadata:** (this commit, following) `docs(14-03): complete carousel live-fire plan`

## Files Created/Modified

- `.planning/phases/14-v1-2-regression-live-fire/14-03-VERIFICATION.md` - Full VERIF-02 evidence chain (submission, 3 approval attempts, real bug diagnosis+fix, FB album investigation, cleanup, phase baseline table, Task 7 resolution)
- `n8n/workflow.json` - `ig-create-child-container` retry parameters raised (`maxTries` 2->4, `waitBetweenTries` 3000ms->8000ms)

## Decisions Made

See frontmatter `key-decisions`. Summary: (1) Meta fetcher retry-budget bug fixed directly per locked re-fire policy; (2) FB album rendering classified as pre-existing Meta platform behavior, not fixable, user-accepted; (3) Criterion 3 (zero Postgres-migration errors) satisfied on the carousel path from its first live-fire; (4) both remaining IG test posts confirmed deleted programmatically, not just by user report.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed intermittent Meta media-fetch failures on IG carousel child-container creation**
- **Found during:** Task 4/verification (approval attempt 1, exec `1792683`)
- **Issue:** Meta's Graph API media fetcher intermittently returned `400 code 9004/2207052 ("Only photo or video can be accepted as media type")` when creating IG carousel child containers, failing 1-2 of 5 slides per attempt (different slides each time across 2 independent attempts) despite the existing 2-try/3s retry. Root-cause investigation (manual curl re-fetch of the failed URLs immediately after) confirmed the files were valid, reachable, and correctly served — this was a transient Meta-side fetch reliability gap, not a broken URL.
- **Fix:** Raised `ig-create-child-container`'s retry tolerance (`maxTries` 2->4, `waitBetweenTries` 3000ms->8000ms). Additive, single-node parameter change.
- **Files modified:** `n8n/workflow.json`
- **Verification:** Third approval attempt (exec `1792783`) succeeded with all 5 child containers created on the first pass under the new retry budget.
- **Committed in:** `5c05cd2`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for correctness/reliability of the carousel publish path. No scope creep — single-node, additive parameter change only.

## Issues Encountered

- **FB carousel visual rendering discrepancy** (Task 5 checkpoint): user initially reported FB showed the carousel as 5 separate photos rather than a swipeable carousel. Investigated via direct Graph API GETs — confirmed this is a single post (`media_type: album`) with all 5 photos attached, rendered by Meta's native album/grid UI. Classified as a pre-existing Meta platform limitation from Phase 7's design (no organic Graph API mechanism produces an IG-style single-frame swipe carousel for Facebook Page posts), not a Phase 14 regression, not fixable. User reviewed the evidence and explicitly accepted it as expected behavior. Resolved, not a blocker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Phase 14 (v1.2 Regression Live-Fire) is CLOSED.** All 3 ROADMAP success criteria satisfied: (1) single-post live-fire clean, (2) carousel live-fire clean, (3) zero outstanding Postgres-migration-related errors in either fire.
- Cumulative phase image spend: **$0.33** against the ~$1.50 budget ($0.03 single from 14-02 + $0.30 carousel from 14-03).
- All test content across both plans cleaned up: both FB posts deleted via API, both IG posts deleted manually by the user and confirmed programmatically gone (Graph API `code 100/error_subcode 33`).
- One documented, permanent, non-actionable limitation for future reference: Facebook's organic Page feed API has no single-frame swipeable carousel equivalent to Instagram — multi-photo posts always render as an album/grid on Facebook. Worth a note in `CLAUDE.md`/`REQUIREMENTS.md`'s Known Limitations if a future phase touches FB carousel UX expectations again.
- Phase 15 (Diseño Premium engine evaluation) can now proceed on a confirmed-clean production baseline — no lingering Postgres-migration or FB-carousel-branch defects to confuse future debugging.

---
*Phase: 14-v1-2-regression-live-fire*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: `.planning/phases/14-v1-2-regression-live-fire/14-03-SUMMARY.md`
- FOUND: `.planning/phases/14-v1-2-regression-live-fire/14-03-VERIFICATION.md`
- FOUND commit: `5c05cd2` (fix: raise IG carousel child-container retry budget + VERIF-02 evidence)
- FOUND commit: `f056635` (docs: investigate Task 5 FB carousel issue report)
- FOUND commit: `8687b23` (docs: VERIF-02 carousel live-fire evidence + cleanup + phase baseline)
