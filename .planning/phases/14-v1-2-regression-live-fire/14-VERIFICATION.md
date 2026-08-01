---
phase: 14-v1-2-regression-live-fire
verified: 2026-08-01T18:58:30Z
status: passed
score: 3/3 must-haves verified
---

# Phase 14: v1.2 Regression Live-Fire Verification Report

**Phase Goal:** Confirm single-post and carousel formats still work end-to-end after the Postgres migration (v1.2 carry-over), establishing a clean baseline before v1.3s design-engine work begins.

**Verified:** 2026-08-01T18:58:30Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | A live single-post run persists its session correctly in Azure PostgreSQL, WhatsApp SI approval succeeds, and the post publishes to both Instagram and Facebook. | VERIFIED | 14-02-VERIFICATION.md: submission exec 1791764 (Postgres INSERT succeeded), approval exec 1792209 (recovery SELECT succeeded, session 142e1dc7), IG publish media_id 18174505420425505 permalink instagram.com/p/DbgZI2glh3x, FB feed publish post_id 981931321668013_122133764865238849 (first FB feed publish since 2026-04-17). YCloud GET confirmed delivered. User visually confirmed both posts live. |
| 2 | A live carousel run (multi-slide) persists its session correctly, WhatsApp SI approval succeeds, and the carousel publishes to both Instagram and Facebook. | VERIFIED | 14-03-VERIFICATION.md: submission exec 1792549 (5-slide carousel INSERT succeeded), 2 failed approval attempts diagnosed as a real, non-Postgres Meta-fetcher reliability gap (fixed live), 3rd approval exec 1792783 succeeded IG carousel media_id 17966364624135172 permalink instagram.com/p/DbgeOgrlm5S, FB carousel post_id 981931321668013_122133770775238849 (first FB carousel publish since Phase 7, 2026-04-17). Postgres row confirmed format=carousel with 5 image_urls. User visually confirmed both platforms (FB album/grid rendering investigated and accepted as pre-existing Meta platform behavior, not a regression). |
| 3 | No Postgres-migration-related errors surface during either live-fire test, confirming a clean baseline for v1.3 work. | VERIFIED | One real Postgres-migration bug WAS found and fixed within the phase itself (14-02: save-session-supabase INSERT never set format, causing format=NULL for every single-post session since Phase 12.3 fixed, deployed, backfilled). The carousel INSERT/recovery path (14-03) showed zero Postgres-related defects across all 3 approval attempts. 14-03-VERIFICATION.md section 10 phase-level baseline table declares all 3 criteria TRUE with a detailed breakdown per fire. Independently confirmed live in repo: save-session-supabase query now contains the format column set to single in its INSERT column list (see Artifacts below). |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| n8n/workflow.json hashtag-comment error edges | Both main[1] error outputs of the single and carousel hashtag-comment nodes retargeted to their respective Get Permalink nodes | VERIFIED | Independently confirmed via a live parse of the repo file: connections IG Post Hashtag Comment main[1][0].node equals IG Get Permalink, and the carousel counterpart equals IG Get Carousel Permalink. Node count 92. |
| n8n/workflow.json save-session-supabase INSERT | format column set to literal single | VERIFIED | Independently confirmed: node parameters.query contains the format column set to single in the VALUES list. |
| n8n/workflow.json ig-create-child-container retry params | maxTries 2 to 4, waitBetweenTries 3000 to 8000 | VERIFIED | Independently confirmed: node has retryOnFail true, maxTries 4, waitBetweenTries 8000. |
| .planning/phases/14-v1-2-regression-live-fire/14-01-DEPLOY.md | Deploy evidence: pre/post versionId, drift findings, PUT method, spot-check results | VERIFIED | Exists (76 lines), contains full pre/post versionId (83aa7f3c to 81386618), zero-drift finding, patch-based PUT method, complete spot-check table incl. all canary nodes. |
| .planning/phases/14-v1-2-regression-live-fire/14-02-VERIFICATION.md | Full VERIF-01 evidence: exec IDs, IG/FB media IDs, permalinks, raw publish responses, Postgres row, Sheets row, YCloud statuses, cleanup | VERIFIED | Exists (182 lines), all required evidence present, exceeds min_lines 40. |
| .planning/phases/14-v1-2-regression-live-fire/14-03-VERIFICATION.md | Full VERIF-02 evidence plus phase-level baseline statement | VERIFIED | Exists (349 lines), all required evidence present incl. phase-level criteria table (section 10), real-bug investigation/fix narrative, FB album investigation, Task 7 sign-off. Exceeds min_lines 40. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Hashtag Comment node (single) error output | Get Permalink | error output retargeted from Tag IG Error | WIRED | Confirmed in repo file; live-proven in exec 1792209 (hashtag node errored code 10, execution continued into Get Permalink then FB Publish Photo). |
| Hashtag Comment node (carousel) error output | Get Carousel Permalink | error output retargeted from Tag IG Error | WIRED | Confirmed in repo file; live-proven in exec 1792783 (carousel hashtag node errored code 10, execution continued into Get Carousel Permalink then FB Explode Carousel Slides then FB Publish Carousel Feed). |
| save-session-supabase (single-post INSERT) | content_sessions table | n8n Postgres executeQuery | WIRED | Live-proven: exec 1791764 INSERT succeeded; recovery exec 1792209 SELECT found the row; direct psql query in 14-02-VERIFICATION.md section 5 confirms format=single post-fix. |
| save-session-carousel (carousel INSERT) | content_sessions table (image_urls TEXT array) | n8n Postgres executeQuery | WIRED | Live-proven: exec 1792549 INSERT succeeded; recovered identically across all 3 approval attempts; direct query in 14-03-VERIFICATION.md section 6 confirms format=carousel plus 5 populated image_urls. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|---|---|---|
| VERIF-01 (single-post live-fire post-Postgres-migration) | SATISFIED (functionally) | None - evidence complete in 14-02-VERIFICATION.md. REQUIREMENTS.md checkbox and traceability table (line 32, line 70) still show unchecked/Pending - this is a documentation staleness gap, not a functional gap; STATE.md and both VERIFICATION docs correctly declare it satisfied. |
| VERIF-02 (carousel live-fire post-Postgres-migration) | SATISFIED (functionally) | None - evidence complete in 14-03-VERIFICATION.md. Same REQUIREMENTS.md staleness noted above (line 33, line 71). |

### Anti-Patterns Found

None. All three code changes (n8n/workflow.json: 2 connection-edge retargets, 1 INSERT column addition, 1 retry-param adjustment) are surgical, additive, and scoped exactly to their stated purpose, confirmed both by the plans own byte-identical canary spot-checks (14-01-DEPLOY.md, 14-02/14-03-SUMMARY.md deviation logs) and by this verifications independent re-parse of the live repo file. No placeholder code, no stub logic, no TODO/FIXME markers introduced.

### Human Verification Required

None outstanding. All human verification for this phase (WhatsApp SI approvals, visual confirmation of live IG/FB posts, FB album-rendering investigation acceptance, manual IG in-app deletion, final baseline sign-off) was already performed by the user during the phases execution checkpoints, with evidence captured in 14-02-VERIFICATION.md and 14-03-VERIFICATION.md, including programmatic post-deletion confirmation via Graph API code 100/error_subcode 33, not just user self-report.

### Gaps Summary

No gaps blocking phase goal achievement. All three ROADMAP success criteria are independently verified TRUE against live evidence (execution IDs, Meta media/post IDs, Postgres rows, Sheets rows, YCloud delivery statuses) and against the current state of n8n/workflow.json in the repo (all three in-phase fixes, hashtag onError reroute x2, format=single INSERT fix, IG carousel retry-budget raise, are present and correctly scoped).

One minor, non-blocking documentation-hygiene item: REQUIREMENTS.md still lists VERIF-01/VERIF-02 as unchecked/Pending in its checklist and traceability table, despite both being functionally satisfied per this phases evidence. Recommend updating those two lines the next time REQUIREMENTS.md is touched (e.g., at Phase 15 kickoff); does not affect this phases status.

---

Verified: 2026-08-01T18:58:30Z
Verifier: Claude (gsd-verifier)
