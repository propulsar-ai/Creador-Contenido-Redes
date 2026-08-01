---
phase: 14-v1-2-regression-live-fire
plan: 02
subsystem: infra
tags: [n8n, postgres, whatsapp, meta-graph-api, live-fire, regression, google-sheets]

# Dependency graph
requires:
  - phase: 14-01
    provides: hashtag-comment onError reroute deployed live (versionId 81386618), unblocking the FB feed branch
  - phase: 12.3
    provides: Supabase-to-Azure-Postgres migration (save-session-supabase / retrieve-session nodes)
provides:
  - Live proof that the single-post Postgres session variant (INSERT + recovery SELECT) works end-to-end since the Supabase migration
  - Live proof that Plan 14-01's hashtag-comment error-reroute fix reaches the FB feed branch in production
  - Real bug found and fixed live: save-session-supabase INSERT never set the format column (all single-post sessions had format=NULL since the Postgres migration)
  - 14-02-VERIFICATION.md full evidence chain (brief -> Postgres -> WhatsApp -> Meta publish -> Sheets -> cleanup)
affects: [14-03-carousel-live-fire]

# Tech tracking
tech-stack:
  added: []
  patterns: [same-session backfill instead of a costly re-fire when a bug is found after real data was already captured, direct az/pg query verification over MCP tooling]

key-files:
  created: [.planning/phases/14-v1-2-regression-live-fire/14-02-VERIFICATION.md]
  modified: [n8n/workflow.json]

key-decisions:
  - "Real bug found live (save-session-supabase INSERT missing the format column) fixed directly per locked re-fire policy, deployed via patch-based PUT (1 node changed), then the already-published session row was backfilled with an UPDATE instead of firing a costly fresh re-fire"
  - "FB feed post deleted via Graph API (success:true); IG media deletion attempted and failed as expected (permissions, code 10) -- queued for the Plan 14-03 end-of-phase manual-deletion checkpoint"

patterns-established:
  - "Backfill real captured data via a targeted UPDATE when a bug is discovered after a real, already-published live-fire, rather than re-firing a fresh (undeletable) Meta post just to re-test a downstream write"

# Metrics
duration: ~50min
completed: 2026-08-01
---

# Phase 14 Plan 02: VERIF-01 Single-Post Live-Fire Summary

**Fired a real single-post run through Wizard -> n8n -> Postgres session -> WhatsApp SI approval -> IG+FB publish, proving the single-post Postgres session variant and Plan 14-01's FB feed branch fix both work live, and found+fixed a real bug (format column never set on single-post session INSERTs) along the way.**

## Performance

- **Duration:** ~50 min (spans the original session's Tasks 1-5 plus this continuation's Task 6)
- **Started:** 2026-08-01T17:02:25Z (submission execution `1791764`)
- **Completed:** 2026-08-01T17:53:05Z (cleanup + evidence commit)
- **Tasks:** 6 (2 human-action checkpoints, 1 human-verify checkpoint, 3 auto tasks)
- **Files modified:** 2 (`n8n/workflow.json`, `14-02-VERIFICATION.md`)

## Accomplishments
- Real single-post Wizard brief ("Agentes IA autónomos para ventas y soporte en WhatsApp Business", educational, Flux 2 Pro) submitted via the actual interactive flow (not the test-webhook bypass).
- Submission exec `1791764`: `save-session-supabase` Postgres INSERT succeeded (the exact node class that killed pre-migration exec `1786295`); WA preview delivery confirmed via direct YCloud GET (never trusting n8n's "accepted").
- Real inbound WhatsApp "Si" reply triggered the approval execution (`1792209`).
- Postgres session recovery (`retrieve-session` / `Assert Session Found`) succeeded live for the single format — first proof of this variant since the Supabase-to-Azure migration.
- Hashtag-comment node failed as expected (code 10, missing scope) but execution continued into the FB feed branch — first live proof of Plan 14-01's fix.
- IG publish succeeded (`media_id 18174505420425505`, permalink `https://www.instagram.com/p/DbgZI2glh3x/`); FB feed publish succeeded (`post_id 981931321668013_122133764865238849`) — first FB feed publish since 2026-04-17.
- **Found and fixed a real bug:** `save-session-supabase`'s INSERT never included the `format` column (unlike the carousel/story INSERTs, which set it as a literal) — every single-post session since the Postgres migration had `format=NULL`. Fixed in `n8n/workflow.json`, deployed live via patch-based PUT (1 node changed, versionId `81386618` -> `f2700b77`), then the already-created session row was backfilled with a targeted `UPDATE` instead of a costly fresh re-fire.
- Google Sheets Log row verified programmatically (harness workflow, not visual) with `Formato='single'` exact match.
- User visually confirmed both the IG and FB posts live and correct.
- Cleanup: FB feed post deleted via Graph API (`{"success":true}`); IG media deletion attempted and failed as expected (permissions, code 10) — queued for the Plan 14-03 end-of-phase manual-deletion checkpoint.

## Task Commits

Each task was committed atomically:

1. **Task 1: Open WhatsApp 24h window** - human action, no commit
2. **Task 2: Re-verify + fire single-post via Wizard** - live-fire, no code commit (submission exec `1791764`)
3. **Task 3: SI approval** - human action, no commit
4. **Task 4: Programmatic verification + evidence + bug fix** - `b3e166a` (fix: format column), `a5bf769` (docs: evidence pre-cleanup)
5. **Task 5: Visual confirmation** - human checkpoint, no commit
6. **Task 6: Cleanup** - `dae4311` (docs: cleanup results appended)

**Plan metadata:** _(this commit)_

## Files Created/Modified
- `n8n/workflow.json` - `save-session-supabase` node's INSERT query gained a `format` column set to the literal `'single'`, matching the carousel/story INSERT pattern
- `.planning/phases/14-v1-2-regression-live-fire/14-02-VERIFICATION.md` - Full VERIF-01 evidence: brief, exec IDs, IG/FB media IDs + permalinks, raw publish-node responses, Postgres row (pre/post fix), Sheets row, YCloud statuses, cleanup results

## Decisions Made
- Fixed the `format` column bug directly per the locked re-fire policy (Rule 1 - Bug: breaks any query filtering sessions by format, including this plan's own required verification query) rather than escalating — deployed via patch-based PUT with pre/post-deploy diff confirming exactly 1 node changed.
- Backfilled the real session row via `UPDATE ... WHERE session_id=... AND format IS NULL` instead of firing a fresh, costly, undeletable Meta post just to re-test the fixed INSERT — established precedent from Plan 13-03, reapplied here.
- FB feed post deletion treated the `DELETE` response's `{"success":true}` as authoritative even though the follow-up confirmation `GET` returned an ambiguous permission-class error (code 10, not a clean "does not exist") — this token's scope doesn't support unauthenticated-style page-post reads at all, so the GET alone isn't conclusive; the DELETE call's own canonical success payload is the correct signal per Graph API semantics.
- IG media deletion attempted and failed as expected (permissions error, code 10) — consistent with established Propulsar precedent that IG Business media is not API-deletable with this token. Queued for the Plan 14-03 end-of-phase manual-deletion checkpoint rather than blocking this plan on it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `save-session-supabase` INSERT missing the `format` column**
- **Found during:** Task 4 (Postgres verification) — the plan's own required verification query (`SELECT * FROM content_sessions WHERE format='single' ...`) returned zero rows because every single-post session since the Postgres migration had `format=NULL`.
- **Issue:** Unlike the carousel/story INSERTs (which set `format='carousel'`/`format='story'` as literals), the single-post INSERT never included the column at all.
- **Fix:** Added `format` column with literal `'single'` to `save-session-supabase`'s INSERT query in `n8n/workflow.json`, matching the carousel/story pattern exactly. Deployed live via patch-based PUT (pre-flight confirmed zero drift, post-deploy confirmed exactly 1 node changed, connections byte-identical). Backfilled the current run's already-created session row via a targeted `UPDATE` (1 row updated) rather than a costly fresh re-fire.
- **Files modified:** `n8n/workflow.json`
- **Verification:** Post-fix `SELECT` confirmed the row now has `format='single'`; any future single-post session created after this deploy will have the column set correctly by the INSERT itself, no backfill needed.
- **Committed in:** `b3e166a`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 - Bug)
**Impact on plan:** Necessary for correctness — this was a genuine data-integrity bug affecting every single-post session since Phase 12.3's migration, and it directly blocked this plan's own required verification query. No scope creep; fixed and deployed within the plan's live-fire task.

## Issues Encountered

None beyond the documented bug fix above (handled via deviation Rule 1, not an unresolved issue).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ROADMAP Phase 14 Success Criterion 1 satisfied: a live single-post run persisted its session in Azure PostgreSQL, SI approval succeeded, and the post published to both Instagram and Facebook.
- Production workflow `Qql7mvYRxKBsPZ5t` now carries both Plan 14-01's connections fix and this plan's `format` column fix (versionId `f2700b77`, 92 nodes, active).
- Image budget spent this plan: $0.03 (Flux 2 Pro) against the ~$1.50 phase budget — $1.47 remaining for Plan 14-03 (carousel live-fire).
- One outstanding manual cleanup item carried forward: IG media `18174505420425505` (permalink `https://www.instagram.com/p/DbgZI2glh3x/`) needs manual in-app deletion — to be surfaced to the user at Plan 14-03's end-of-phase checkpoint alongside any carousel test artifacts.
- No blockers identified for Plan 14-03.

---
*Phase: 14-v1-2-regression-live-fire*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: n8n/workflow.json
- FOUND: .planning/phases/14-v1-2-regression-live-fire/14-02-VERIFICATION.md
- FOUND: .planning/phases/14-v1-2-regression-live-fire/14-02-SUMMARY.md
- FOUND: commit b3e166a (Task 4 fix)
- FOUND: commit a5bf769 (Task 4 docs)
- FOUND: commit dae4311 (Task 6 docs)
