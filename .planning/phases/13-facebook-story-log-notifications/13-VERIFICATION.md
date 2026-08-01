---
phase: 13-facebook-story-log-notifications
verified: 2026-08-01T12:49:27Z
status: passed
score: 5/5 must-haves verified
---

# Phase 13: Facebook Story + Log + Notifications Verification Report

**Phase Goal:** The FB Story chain was already built in Phase 12. This phase's real scope: (1) live-fire CONFIRMATION that the chain works against the Hostinger backend with a Story genuinely appearing on the Facebook Page; (2) extend the Story WhatsApp success notification to mention Facebook (NOTIF-01); (3) add a `Formato` column to all 4 Sheets log nodes + `Expires_At` to the Story log node (LOG-01/LOG-02).

**Verified:** 2026-08-01T12:49:27Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, used directly as truths)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Live API test re-confirms FB Story flow works end-to-end for real, documented before phase close | VERIFIED | Independently pulled n8n execution API for exec 1787647 (13-01) and exec 1788142 (13-03): both show the FB Publish Photo Story node ran ok with real Graph API responses success:true post_id:1454521203100646 and success:true post_id:849471014766044 respectively -- matches SUMMARY claims exactly, pulled fresh from the live API, not copied from docs. |
| 2 | A Story approved via WhatsApp SI appears on the Facebook Page as a Story (not feed) -- real, human-observed execution | VERIFIED (human-attested) | 13-01-SUMMARY.md Task 4 documents explicit user visual confirmation that the Story is live on the real Facebook Page as a proper Story (not a feed post). This is a human-observation claim that cannot be re-observed by the verifier directly; the surrounding automated evidence (real post_id, real Graph API 200 response, no error-tag node fired) is independently consistent with it. |
| 3 | FB Story publish node already has retryOnFail=false and SAS-strip assertion; live behavior re-verified, semantics unchanged | VERIFIED | Pulled live workflow via n8n API (versionId 83aa7f3c, active:true, 92 nodes -- matches expected). Compared fb-publish-photo-story and assert-fb-story-url byte-for-byte between the live-deployed workflow and local n8n/workflow.json: MATCH. Confirmed fb-publish-photo-story.retryOnFail is false. Confirmed assert-fb-story-url jsCode strips SAS query params (sig=, sv=, sp=, se=, st=, sr=, spr=) before use, unchanged since Phase 12. |
| 4 | All 4 Sheets log nodes write Formato without breaking historical rows; Story log node additionally writes Expires_At | VERIFIED (with a noted caveat) | Confirmed in both local repo and live-deployed workflow (byte-identical): log-sheets writes Formato "single", log-sheets-carousel writes Formato "carousel", sheets-log-story writes Formato "story" plus Expires_At bound to the IG Compute Story Expiry node's story_expires_at field, sheets-fail-log writes Formato bound to Parse Meta Error's format field. All 4 have matching columns.schema entries (additive-only; historical rows unaffected). Caveat: no single real execution has yet had its own Sheets Log node succeed organically end-to-end for a Story row -- both real executions (1787647, 1788142) hit a live header typo (Error_Msj instead of Error_Msg) unrelated to Formato/Expires_At. The typo was root-caused and fixed (13-03), the append mechanism was re-verified via a harness node configured identically to production, and the real row for 1788142 was backfilled from that execution's own real captured data (not synthetic) -- user visually confirmed the resulting Sheet row. Judged as acceptable compensating evidence, not a gap: the failure mode was external Sheet data, not workflow config, and the fix is now live. |
| 5 | WhatsApp success notification for Stories includes IG permalink labeled "valido 24h", expiry in CET, and a note that FB Story has no permanent URL | VERIFIED | Independently pulled exec 1788142's WhatsApp Story notification node output directly from the n8n execution API (not from docs). Body text verbatim: Story publicada (valido 24h) ... Instagram: https://www.instagram.com/stories/propulsar_ai/3954111088979999624 ... Expira: dom, 14:20 ... Facebook: Story publicada (sin URL permanente -- expira junto con Instagram) ... Tema: ... Confirms all 3 required elements verbatim in a real production message. The node's jsCode uses toLocaleString with timeZone Europe/Madrid for CET expiry. |

**Score:** 5/5 truths verified

### Required Artifacts (nodes edited/re-verified in n8n/workflow.json)

| Artifact (node id) | Expected | Status | Details |
|---|---|---|---|
| parse-meta-error | Exposes format field for fail-log | VERIFIED | jsCode contains format: mergeData.format or 'single'; matches live deploy byte-for-byte |
| log-sheets | Formato "single" column | VERIFIED | Value + schema present; matches live deploy |
| log-sheets-carousel | Formato "carousel" column | VERIFIED | Value + schema present; matches live deploy |
| sheets-log-story | Formato "story" + Expires_At column | VERIFIED | Both values + schema present; matches live deploy |
| sheets-fail-log | Formato sourced from parse-meta-error | VERIFIED | Expression present + schema; matches live deploy |
| notify-wa-story | Conditional Facebook line | VERIFIED | Present, gated on platforms.includes('facebook'); matches live deploy; confirmed present in real execution output |
| fb-publish-photo-story | retryOnFail=false | VERIFIED | Confirmed false in both repo and live deploy |
| assert-fb-story-url | SAS-strip logic | VERIFIED | Present, unchanged since Phase 12; confirmed in both repo and live deploy |
| check-platforms-facebook, ig-compute-story-expiry, fb-fetch-ideogram-bytes, fb-upload-story-photo (regression set) | Byte-identical, untouched by Phase 13 edits | VERIFIED | All MATCH between repo and live deploy -- no unintended regression |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| Live n8n workflow (Qql7mvYRxKBsPZ5t) | Local n8n/workflow.json | Deploy (versionId f81aeed2 to 83aa7f3c) | WIRED | Independently confirmed live versionId=83aa7f3c, active=true, nodes.length=92 via fresh GET, and all 12 phase-relevant nodes byte-identical to repo |
| sheets-log-story | IG Compute Story Expiry node output | Expires_At expression | WIRED | Expression correctly references upstream node's story_expires_at field |
| notify-wa-story | Merge Rehost Output.platforms | Facebook line conditional | WIRED | Confirmed present and correctly rendered in real exec 1788142 output |
| sheets-fail-log | parse-meta-error.format | Formato expression | WIRED (config-verified; not yet exercised by a real failure execution in this phase's evidence -- acceptable, fail-path logging follows the same established pattern as other fail-log fields) | Expression present in both repo and live deploy |
| FB Story publish chain | Real Meta Graph API | HTTP nodes | WIRED | Two independent real executions (1787647, 1788142) both show real post_id responses pulled fresh from n8n execution API |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|---|---|---|
| FBSTORY-01 | SATISFIED | Live-fire confirmed twice with real Graph API evidence, independently re-pulled from execution API |
| NOTIF-01 | SATISFIED | Real production WA message body confirmed via execution API to include all 3 required elements |
| LOG-01 | SATISFIED | Formato column present/wired on all 4 log nodes, live-deployed, matches repo |
| LOG-02 | SATISFIED | Expires_At column present/wired on Story log node, live-deployed, matches repo; functional append proven via production-identical harness plus real-data backfill |

(REQUIREMENTS.md still shows these as "Pending" -- expected bookkeeping updated after phase verification passes, not a gap.)

### Anti-Patterns Found

None. No TODO/FIXME/placeholder markers, no empty stub handlers, no static returns masking real logic in any of the 12 nodes inspected. The one live issue found during the phase (Sheet header typo Error_Msj) was external Google Sheet data, not a code anti-pattern, and was root-caused and fixed within the phase's own plans (13-03).

### Human Verification Required

None outstanding for goal achievement -- the two items requiring human observation were already performed and documented during phase execution, not deferred to this verifier:
1. Story visually confirmed on FB Page (13-01 Task 4) -- user confirmed in-app the published artifact is a genuine Story, not a feed post.
2. WhatsApp message text + Sheet row visually confirmed (13-03 Task 3) -- user confirmed on their phone (message showed read status via YCloud) and confirmed the backfilled Sheet row in the Google Sheet UI.

Outstanding but non-blocking: the user still needs to manually delete the FB Story in-app (Meta Graph API does not support deleting Photo Stories at any lifecycle stage -- confirmed twice, independently, across both live-fire plans) or let it auto-expire (around 2026-08-02T12:20Z). This is cleanup housekeeping, not a phase-goal blocker.

### Gaps Summary

No gaps blocking phase-goal achievement. All 5 ROADMAP success criteria are independently verified against live systems (not just SUMMARY claims): a fresh GET of the live n8n workflow confirms deployed versionId 83aa7f3c with all 12 phase-relevant nodes byte-identical to the repo; a fresh GET of both live-fire executions (1787647, 1788142) confirms real Meta Graph API responses, real WhatsApp notification bodies with the Facebook line and CET expiry, and confirms the FB/IG error-tag nodes never fired.

One caveat worth carrying forward (not a gap): no single execution has yet had its own sheets-log-story node succeed organically in one pass -- both real fires hit a Sheet header typo, subsequently fixed, with the mechanism re-proven via a production-identical harness append and a real-data backfill (not synthetic). The next real Story publish will be the first fully organic end-to-end proof of the Sheets Log write; worth a quick spot-check whenever that next Story run happens, but does not block closing this phase.

---

*Verified: 2026-08-01T12:49:27Z*
*Verifier: Claude (gsd-verifier)*
