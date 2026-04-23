---
phase: 12-ig-story-publishing
verified: 2026-04-23T18:30:00Z
status: passed
score: 6/6 success criteria verified
---

# Phase 12: Instagram Story Publishing -- Verification Report

**Phase Goal:** SI-approved Stories are published to Instagram and the permalink with expiry is retrievable; scheduling guard and error handler wiring complete for IG nodes
**Verified:** 2026-04-23T18:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Live API test confirms graph.facebook.com is correct host for IG Story container creation, documented before production nodes built | PASS | 12-01-SUMMARY Task 1 Tests A/C/D/G/J reproduced live with META_PAGE_TOKEN + IG_USER_ID=17841480004109313; container 17869082274666804 created HTTP 200; expires_at rejected with code 100 confirming fallback required; /photo_stories endpoint reachable code 100 Invalid id semantic not perms error. ROADMAP SC1 rewritten + REQUIREMENTS IGSTORY-02 APPENDED with correction. Production node ig-create-story-container URL graph.facebook.com/v22.0/IG_USER_ID/media. |
| 2 | Story approved via WhatsApp SI appears on IG profile as 9:16 Story not feed within wait window | PASS | Exec 10085 Story IG-only PASS IG Story media_id 17932325328235789. Exec 10647 Story IG+FB PASS 62.9s IG media_id 17932325328235789 + FB post 1290303516541171. Both landed as Stories IG /media with media_type=STORIES; FB /photo_stories endpoint. No caption field in IG Story container body. |
| 3 | After publish workflow retrieves Story permalink AND story_expires_at fallback timestamp + 24h both flow downstream | PASS | ig-get-story-permalink GETs permalink,timestamp,media_product_type against published media_id. ig-compute-story-expiry computes story_expires_at from timestamp + 86400000 fallback Date.now + 86400000. Both ig_story_permalink + story_expires_at referenced in WA Story notify body. Supabase Save Session Story also persists story_expires_at. |
| 4 | Hashtag comment nodes never reached during Story execution Story branch terminates independently | PASS | Forward-walk of 13 Story nodes no edges reach any of 4 hashtag/comment nodes ig-post-hashtag-comment, ig-post-carousel-hashtag-comment, extract-hashtags-single, extract-hashtags-carousel. Story terminal chain notify-wa-story to sheets-log-story to Extract Blob Names cleanup. Exec 10647 evidence all 18 critical nodes OK NO hashtag node fired. |
| 5 | n8n Code node rejects Story executions where wait_seconds > 79200 22h before container creation | PASS | compute-wait-seconds jsCode guard on data.format === story AND wait_seconds > 79200 throws SCHED-02 error. Wizard-layer mirror in wizard/run.js:605-628 rejected at both layers. Exec evidence Task 6 3 unit tests 23.49h case fired exact castellano error from plan. |
| 6 | All IG Story publish nodes have onError wired to existing error handler subgraph | PASS | All 5 Story publish HTTP nodes have onError=continueErrorOutput + main[1] wired to error handler entry ig-create-story-container to Tag IG Error, ig-story-media-publish to Tag IG Error, ig-get-story-permalink to Tag IG Error, fb-upload-story-photo to Tag FB Error, fb-publish-photo-story to Tag FB Error. Option B pattern no separate error key. Plus Option E addition fb-fetch-ideogram-bytes also wired with onError. Both media_publish nodes have retryOnFail=false. |

**Score:** 6/6 truths verified

### Required Artifacts -- IG Story Publish Chain

All 12 new Story nodes present in n8n/workflow.json 91 total matches progression 78 -> 90 -> 91:

| Artifact ID | Expected | Status |
|---|---|---|
| format-story-branch | IF router format === story | PASS TRUE to Create Story Container; FALSE to Create Container |
| ig-create-story-container | POST graph.facebook.com/v22.0/IG/media with media_type=STORIES | PASS URL + jsonBody + Content-Type header confirmed; media_type=STORIES present; no caption field |
| ig-wait-story-container | Wait 45s before media_publish | PASS |
| ig-story-media-publish | POST /media_publish with creation_id | PASS URL correct; retryOnFail=false; onError wired |
| ig-get-story-permalink | GET media with fields=permalink,timestamp,media_product_type | PASS query params correct; onError wired |
| ig-compute-story-expiry | Compute story_expires_at = timestamp + 86400000 | PASS jsCode references 86400000; sets story_expires_at, ig_story_permalink, ig_story_media_id |
| check-platforms-facebook | IF router for FB branch | PASS TRUE to Assert FB URL; FALSE to Notify WA Story |
| assert-fb-story-url | FBSTORY-04 Code v2 node | PASS reads Merge Rehost Output blob_urls[0].url strips SAS sets fb_story_image_url fb_story_source=azure-blob per Option E evolution |
| fb-fetch-ideogram-bytes | HTTP GET binary from Azure Blob intra-cloud | PASS URL = fb_story_image_url responseFormat=file retry 3x onError wired per Option E |
| fb-upload-story-photo | POST /photos multipart source=binary + published=false | PASS contentType=multipart-form-data formBinaryData source from data field published=false onError wired per Option B |
| fb-publish-photo-story | POST /photo_stories with photo_id | PASS URL correct; retryOnFail=false; onError wired |
| notify-wa-story | YCloud WA notify with permalink + expiry | PASS body references ig_story_permalink + story_expires_at inline X-API-Key header matching carousel pattern |
| sheets-log-story | Google Sheets append row | PASS uses XjKteoOTobs1qR55 cred; 13 columns incl. IG_URL |

### Key Link Verification -- Chain Wiring

| From | To | Via | Status |
|---|---|---|---|
| Formato Carrusel FALSE | Formato Story | main[1] | WIRED |
| Formato Story TRUE | IG: Create Story Container | main[0] | WIRED |
| Formato Story FALSE | IG: Create Container | main[1] | WIRED single-path regression preserved |
| Create Story Container | Wait 45s Story Container | main[0] | WIRED |
| Wait | IG: Story media_publish | main[0] | WIRED |
| media_publish | Get Story Permalink | main[0] | WIRED |
| Get Permalink | Compute Story Expiry | main[0] | WIRED |
| Compute Expiry | Plataformas FB | main[0] | WIRED |
| Plataformas FB TRUE | Assert FB Story URL | main[0] | WIRED |
| Plataformas FB FALSE | Notify WhatsApp Story | main[1] | WIRED IG-only path |
| Assert | FB: Fetch Image Bytes Azure | main[0] | WIRED |
| Fetch | FB: Upload Story Photo Unpublished | main[0] | WIRED |
| FB Upload | FB: Publish Photo Story | main[0] | WIRED |
| FB Publish | Notify WhatsApp Story | main[0] | WIRED |
| Notify WA Story | Google Sheets Log Story | main[0] | WIRED |
| Sheets Log Story | Extract Blob Names | main[0] | WIRED cleanup terminal |
| All 5 publish nodes + FB Fetch | Tag IG Error / Tag FB Error | main[1] onError | WIRED |

### Requirements Coverage

| Requirement | Status | Notes |
|---|---|---|
| IGSTORY-01 9:16 container media_type=STORIES | SATISFIED | ig-create-story-container body confirmed |
| IGSTORY-02 correct host graph.facebook.com | SATISFIED | Live API verified + REQUIREMENTS + ROADMAP corrected + production node URL correct |
| IGSTORY-03 container FINISHED + 45s wait | SATISFIED | Wait node + live test confirmed container finishes within 3s |
| IGSTORY-04 media_publish retryOnFail=false | SATISFIED | Both media_publish nodes have retryOnFail=false |
| IGSTORY-05 permalink retrieval + expires_at fallback | SATISFIED | Get Permalink + Compute Story Expiry fallback timestamp + 86400000 |
| IGSTORY-06 no hashtag comment on Story | SATISFIED | Forward-walk confirms no Story chain node reaches any hashtag/comment node |
| SCHED-02 22h cap / 79200s | SATISFIED | n8n-layer + Wizard-layer both implemented; 3 unit tests PASS |
| ERR-01 onError wiring for new Meta HTTP nodes | SATISFIED | All 5 publish HTTP + FB Fetch wired via Option B pattern main[1] |
| FBSTORY-04 strip SAS on FB Story URL scope-shifted from Phase 13 | SATISFIED | Assert FB Story URL Code v2 node installed defense-in-depth semantics |

### Anti-Patterns Found

None. No TODO/FIXME/XXX/HACK/PLACEHOLDER patterns found in any of the 14 Phase 12 touched nodes 12 Story chain + FB Fetch + compute-wait-seconds. Clean implementation.

### Tactical Fix Assessment Options D/B/E

The 3 band-aid fixes applied during E2E were driven by an external Meta policy change 2026-04-17 silent block of propulsarcontent.blob.core.windows.net NOT planning errors:

| Option | Fix | Impact on Phase 12 Goal | Assessment |
|---|---|---|---|
| D 1e686a9 | Meta-facing URLs swapped from Azure Blob to Ideogram direct | Goal still met Stories publish. Invariant broken Phase 4 approved=published contract no longer holds for Meta-facing URLs Phase 4 re-host still runs for audit + cleanup but output not consumed by Meta | Does not compromise Phase 12 goal. Properly escalated to Phase 12.1 CDN Layer urgent tech debt |
| B 1b9365a | FB Story uses multipart source=binary instead of url= param | Durable improvement bypasses Meta URL fetcher strictness error 324 | Strengthens FB Story publishing no goal impact |
| E 5e09970 | FB Fetch Image Bytes from Azure Blob intra-cloud instead of Ideogram single-fetch consumed by IG | Goal met FB Story chain durable | Correct architectural choice intra-cloud works even when Meta to Azure is blocked |

All 3 fixes committed atomically as Rule 1 Bug fix in response to external policy change. SCHED-02 22h cap provides margin against Ideogram 24h TTL. None compromise the 6 Success Criteria.

### Regression Verification

Single + carousel chains preserved:

- **Single regression exec 10786:** IG https://www.instagram.com/p/DXe6CFngHRE/ live. Chain Create Container 200 to Wait 30s to media_publish 200 to Get Permalink to Notify WA to Sheets Log. Formato Story FALSE routed correctly to ig-create-container NO Story nodes fired. Evidence commit 2b96266.
- **Carousel regression exec 10959:** IG carousel https://www.instagram.com/p/DXe7mxnk-qx/ live. Chain Explode Slides to Child Container x3 to Collect to Wait 30s to Parent Container to media_publish to HC. Formato Carrusel TRUE routed correctly NO Story nodes fired. Evidence commit d1ecaa3 + .tmp/poll/task5-exec-10959.json.

### Commit Verification

All 14 commits claimed in SUMMARYs verified in git history: fafe72e, 6f1c703, c7e45b1, c38e50d, 1e686a9, 940f04d, 1b9365a, 5e09970, 01e8ba3, 2b96266, cbc033d, d1ecaa3, fc90a74, d4465e2.

### Human Verification Required

None. Phase 12 is fully verified programmatically against codebase + 4 real live executions 10085, 10647, 10786, 10959 with IG/FB permalinks. User visually confirmed IG permalink DXe6CFngHRE during Task 4.

### Open Items Pre-Existing Out of Phase 12 Scope

- **Hashtag Comment code 10/100 short-circuit** broken since 2026-04-17 exec 147 pre-Phase 12. Blocks FB feed NOT Phase 12 scope which is IG Story + FB Story. Resolves when Susana regenerates token with instagram_manage_comments scope.
- **NOTIF-01 FB reference in WA Story notification** observed during exec 10647 confirmed Phase 13 scope per SUMMARY + STATE.
- **Phase 12.1 CDN Layer urgent pre-Phase 13** Azure Front Door or Cloudflare R2 to obsolete Options D/B/E and restore Phase 4 invariant.

### Minor Evidence Note

SUMMARY 12-02 Artifacts section lists .tmp/poll/exec-10786.json but that specific file is not present on disk other exec JSONs from the SUMMARY artifact list are. However exec 10786 is authoritatively evidenced by commit 2b96266 which documents the IG permalink chain detail and open-item findings. No goal impact.

### Gaps Summary

**No gaps.** All 6 ROADMAP Success Criteria verified against:

1. Production node configuration in n8n/workflow.json 91 nodes all Story IDs present with correct URLs bodies onError wiring retryOnFail settings
2. Live execution evidence 4 PASS execs + 5 failure-injection execs demonstrating full ERR-01 subgraph
3. All 14 claimed git commits verified in history
4. Router integrity preserved single + carousel paths unaltered new Story branch is additive
5. Pre-existing open items properly scoped out HC unrelated missing scope; NOTIF-01 Phase 13
6. Tactical fixes Options D/B/E architecturally sound and reversible via Phase 12.1 CDN Layer

Phase 12 goal achieved: SI-approved Stories publish to IG and FB permalink + expiry retrievable and flow downstream SCHED-02 22h guard active at both layers onError wired to existing handler for all new Meta HTTP nodes.

---

*Verified: 2026-04-23T18:30:00Z*
*Verifier: Claude gsd-verifier*
