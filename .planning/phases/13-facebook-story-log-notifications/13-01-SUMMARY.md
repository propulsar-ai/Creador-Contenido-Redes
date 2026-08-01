---
phase: 13-facebook-story-log-notifications
plan: 01
subsystem: infra
tags: [meta-graph-api, facebook, instagram, n8n, whatsapp, ycloud, postgres, live-fire]

# Dependency graph
requires:
  - phase: 12-facebook-instagram-stories
    provides: FB Story 2-step chain + IG Story chain (built, never live-fired)
  - phase: 12.2-hostinger-rehost
    provides: Durable Meta-facing image host (rehost-service on Hostinger VPS)
  - phase: 12.3-supabase-to-azure-postgres-migration
    provides: Postgres-backed content_sessions (session storage, replacing deleted Supabase project)
provides:
  - Real Meta API evidence that the FB Story 2-step chain (Upload Story Photo Unpublished -> Publish Photo Story) works end-to-end against the Hostinger-backed re-host contract
  - Documented real response shape of fb-publish-photo-story ({success:true, post_id:<id>}), resolving the node's own "esperado" guess
  - First live proof that the Phase 12.3 rewired session-recovery read (Recuperar sesion Supabase -> Assert Session Found) works on the real SI-approval path
  - Human-confirmed evidence a Story is live on the real Facebook Page
  - Confirmation that Meta's Graph API does not support deleting an FB Photo Story or an IG Story via API at any point in its lifecycle (only auto-expiry or manual in-app deletion)
affects: [13-02-notif-01, 13-03-log-fields, future E2E test cleanup runbooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live-fire verification against real Meta accounts, evidence captured via n8n execution API (GET /executions/{id}?includeData=true), not code review"
    - "WhatsApp delivery must always be confirmed via direct YCloud GET, never trusted from n8n's synchronous 'accepted' response"

key-files:
  created:
    - .planning/phases/13-facebook-story-log-notifications/13-01-VERIFICATION.md
  modified: []

key-decisions:
  - "FB Photo Stories are not API-deletable at any point in their lifecycle (code 100/subcode 33 on the post_id, {success:false} on the underlying photo_id) - only auto-expire (~24h) or manual in-app deletion"
  - "IG Stories are not API-deletable at all (code 100 on the permalink numeric id, code 10 insufficient-permissions on the real media_id) - only auto-expire (~24h) or manual in-app deletion"
  - "Google Sheets Log (Story) node's live schema mismatch (missing Error_Msg column) is a pre-existing, unfixed issue found incidentally - deferred to Plan 13-02/13-03 (this phase's own Log scope), not fixed in this verification-only plan"

# Metrics
duration: ~50min (this resumed session: Task 1 re-verification bridge + Task 2 live-fire + Task 3 evidence capture + Task 4 confirmation + cleanup attempts; Task 1's original pre-flight was ~35min in a prior session, see 13-01-BLOCKED.md)
completed: 2026-08-01
---

# Phase 13 Plan 01: FB Story Live-Fire Verification Summary

**Real Meta API round-trip proved the FB Story 2-step chain works end-to-end (`{success:true, post_id:"1454521203100646"}`), a Story is confirmed live on the real Facebook Page, and neither test Story (FB nor IG) can be deleted via API — both require manual in-app deletion or 24h auto-expiry.**

## Performance

- **Duration:** ~50 min (this resumed session, Task 1 Task 2 onward); Task 1's original pre-flight ran ~35 min in a prior session (see `13-01-BLOCKED.md`)
- **Started:** 2026-08-01 (resumed session)
- **Completed:** 2026-08-01T11:51Z
- **Tasks:** 4 of 4 completed (Task 1 pre-flight in prior session + this session's re-verification bridge, Task 2 live-fire, Task 3 evidence capture, Task 4 human confirmation)
- **Files modified:** 1 (`13-01-VERIFICATION.md`, created + appended)

## Accomplishments

- Re-verified the FB Story chain (7 nodes + connections) against the CURRENT live workflow (versionId `f81aeed2`, post-Phase-12.3) with zero drift, bridging the gap left by Task 1's original check against the older `7447171f` versionId
- Fired a real Story through the Wizard (topic "Automatizacion con IA para pymes: 3 procesos que puedes delegar hoy", platforms `[instagram, facebook]`), confirmed both WhatsApp preview messages `delivered` via direct YCloud GET (not n8n's "accepted")
- User replied SI; the full approval-path execution (`1787647`) ran the Postgres session recovery (`Recuperar sesion Supabase` -> `Assert Session Found`) for the first time live on the real SI-approval path (previously only exercised via NO-reply tests in Phase 12.3-03) — passed clean
- FB Story 2-step chain fired for real: `fb-upload-story-photo` returned unpublished `photo_id: "122133722601238849"`, `fb-publish-photo-story` returned `{success:true, post_id:"1454521203100646"}` — resolving the node's own "esperado" guess with the real verbatim response
- IG Story branch succeeded in the same execution with no regression (permalink `instagram.com/stories/propulsar_ai/3954092904642171710`)
- Neither `Tag FB Error` nor `Tag IG Error` fired
- User visually confirmed the Story is live on the real Facebook Page as a proper Story (not a feed post), matching the approved image — **ROADMAP Success Criteria #2 satisfied**
- Attempted API deletion of both test Stories (standing project rule): both failed on all id variants tried; confirmed via GET both remain live; documented as requiring manual in-app deletion or ~24h auto-expiry

## Task Commits

Each task was committed atomically:

1. **Task 3: Fetch and parse execution evidence** - `aeb8e2b` (feat)
2. **Task 4 confirmation + cleanup attempts** - `fa9c1f2` (docs)

_Tasks 1 (re-verification) and 2 (live-fire) were read-only/human-action and produced no code diffs to commit; their evidence is captured inline in `13-01-VERIFICATION.md`._

**Plan metadata:** (this commit)

## Files Created/Modified

- `.planning/phases/13-facebook-story-log-notifications/13-01-VERIFICATION.md` - Execution id, node-by-node evidence for the FB Story chain (real request/response bodies for all 3 HTTP nodes), Postgres session-recovery evidence, IG Story regression check, WhatsApp delivery verification, human confirmation record, and cleanup-attempt evidence

## Decisions Made

- FB Photo Stories cannot be deleted via the Graph API at any point in their lifecycle (not just after expiry, as the Plan 12-02 decision had assumed) — confirmed with a fresh, unexpired Story returning the same code 100/subcode 33 error, plus `{success:false}` on the underlying photo_id
- IG Stories cannot be deleted via the Graph API at all — confirmed via two id-form attempts, both rejected
- The Google Sheets Log (Story) schema-mismatch failure found during this live-fire is deferred to Plan 13-02/13-03 rather than fixed here, since it occurred entirely after the real Meta publishes succeeded and this plan's scope is verification-only for the FB Story chain

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Re-verified FB Story chain against current live versionId before firing**
- **Found during:** Resume, before Task 2
- **Issue:** Task 1's original pre-flight (prior session) checked versionId `7447171f`; Phase 12.3 had since deployed `f81aeed2` (91 -> 92 nodes) to migrate session storage off Supabase. A live-fire against a potentially-drifted chain would have been unsafe.
- **Fix:** Re-fetched the live workflow and diffed all 7 FB Story chain nodes + their connections against the repo; confirmed byte-identical, zero drift.
- **Verification:** `versionId: f81aeed2`, `active: true`, 92 nodes; all 7 target nodes MATCH.
- **Committed in:** n/a (read-only check, documented in `13-01-VERIFICATION.md`)

---

**Total deviations:** 1 auto-fixed (1 blocking — a scope-appropriate re-verification bridge explicitly called for in this plan's resume instructions, not unplanned work)
**Impact on plan:** No scope creep. This was the plan's own resume instruction, not a discovered issue.

## Issues Encountered

- **Google Sheets Log (Story) node errored** on the live-fire execution (`Missing columns: Error_Msg` schema mismatch) — occurred after both real Meta publishes succeeded, so no data was lost or rolled back. Deferred to Plan 13-02/13-03 per this plan's verification-only scope. Documented in `13-01-VERIFICATION.md`.
- **Neither test Story could be deleted via API** — both FB and IG Graph APIs rejected all deletion attempts tried (2 id forms each). Both test Stories remain live on the real production accounts and require either manual in-app deletion (Facebook app / Instagram app, Story menu -> Delete) or will auto-expire ~24h from publish (~2026-08-02T11:44Z). This is a **user action still required** — not resolved by this plan.

## User Setup Required

None - no external service configuration required. However, see "Issues Encountered" above: the user should manually delete the two test Stories in-app if they don't want to wait for the ~24h auto-expiry.

## Next Phase Readiness

- FBSTORY-01 confirmed live. ROADMAP Success Criteria #2 satisfied with real human-observed evidence.
- Real `fb-publish-photo-story` response shape (`{success:true, post_id:<id>}`) is now documented for Plan 13-02 to consume when building NOTIF-01 (WA notification text extension for FB).
- Plan 13-02 (NOTIF-01 — extend WA Story notification to mention FB when platforms includes facebook) and Plan 13-03 (Sheets Log fields for FB) are ready to proceed. Plan 13-03 should also investigate/fix the Google Sheets Log (Story) `Error_Msg` column schema mismatch found in this plan (a live external-data issue, not a workflow-definition bug) since it is directly in that plan's own scope.
- **Outstanding user action:** delete the two test Stories manually in-app, or accept the ~24h auto-expiry (~2026-08-02T11:44Z) — no further automation is possible for this cleanup.

---
*Phase: 13-facebook-story-log-notifications*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: `.planning/phases/13-facebook-story-log-notifications/13-01-VERIFICATION.md`
- FOUND: `.planning/phases/13-facebook-story-log-notifications/13-01-SUMMARY.md`
- FOUND: commit `aeb8e2b` (Task 3 evidence capture)
- FOUND: commit `fa9c1f2` (Task 4 confirmation + cleanup attempts)
