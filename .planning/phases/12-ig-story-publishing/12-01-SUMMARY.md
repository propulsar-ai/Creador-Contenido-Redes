---
phase: 12-ig-story-publishing
plan: 01
subsystem: n8n-workflow
type: execute
tags: [n8n, ig-story, fb-story, meta-graph-api, live-verification, sched-02, err-01, fbstory-04]

requires:
  - phase: 11-02 (Story branch E2E verified — 🔗 Re-attach session data (Story) emits 15-field payload; Phase-11 guard in 🔧 Prep Re-host Input pending removal here)
    provides: Story flow delivers final_image_url + aspect_ratio + story_expires_at + format='story' to the approval path

provides:
  - IG Story publish chain (IGSTORY-01 through IGSTORY-06)
  - FB Photo Story chain (partial FBSTORY wiring; full FB Story requirements shipped in Phase 13)
  - FBSTORY-04 closed in Phase 12 via 🛡️ Assert FB Story URL (no SAS) Code v2 node
  - SCHED-02 guard in 🕐 Compute wait_seconds
  - ERR-01 onError wiring for 5 new Meta HTTP nodes
  - Phase-11 guard removal from 🔧 Prep Re-host Input
  - REQUIREMENTS.md / ROADMAP.md IGSTORY-02 text correction (graph.instagram.com → graph.facebook.com)

affects: [13-fb-story-publishing]

tech-stack:
  added: []
  patterns:
    - "n8n 2.14.2 onError pattern: Option B (second slot in main[] — NO separate error key)"
    - "Azure Blob URL consumption via $('🔗 Merge Rehost Output') cross-ref (same URL in IG + FB for approval invariant)"
    - "Meta IG Story: graph.facebook.com/v22.0/{IG_USER_ID}/media with media_type=STORIES (Page Access Token, NOT Instagram User Access Token)"
    - "Meta FB Story: two-step /photos?published=false → /photo_stories with photo_id"
    - "expires_at NOT a field on IG Media — compute story_expires_at = timestamp + 86400000ms downstream"

key-files:
  created: []
  modified:
    - n8n/workflow.json (12 new nodes + 11 new connection blocks + 1 rewired + 2 Code node patches)
    - .planning/REQUIREMENTS.md (IGSTORY-02 + FBSTORY-04 APPEND corrections)
    - .planning/ROADMAP.md (Phase 12 Success Criterion 1 host correction)

decisions:
  - "graph.facebook.com is the correct host for IG Story container (Page Access Token works here, fails on graph.instagram.com) — verified LIVE in Task 1 Test A"
  - "expires_at does NOT exist as IG Media field — compute downstream from timestamp (verified LIVE in Task 1 Test D)"
  - "FB /photo_stories endpoint reachable with current Page Token perms (no OAuth perms error — verified LIVE in Task 1 Test J)"
  - "IG Story Container consumes Azure Blob URL (not raw Ideogram) — BLOCKER 1 fix: both IG and FB must consume the approved URL; Ideogram URLs expire in 24h while SCHED-02 allows 22h wait, leaving thin margin"
  - "FBSTORY-04 closed in Phase 12 via 🛡️ Assert FB Story URL — Option A (strip, not reject) semantics; currently no-op because Phase 11 Azure Blob URLs are bare permalinks, but defense-in-depth against future SAS rotations"
  - "n8n 2.14.2 onError wired via main[] second slot (Option B) — confirmed by zero occurrences of 'error:' key in workflow.json"
  - "Pre-publish container does NOT expose permalink/timestamp/media_product_type — these fields only exist on the published media_id returned by media_publish (production GET runs there, as designed)"

metrics:
  duration: ~35min
  completed: 2026-04-23
  commits: 4
  nodes_delta: +12 (78 → 90)
  files_modified: 3 (n8n/workflow.json, .planning/REQUIREMENTS.md, .planning/ROADMAP.md)
  tasks_completed: 3 / 3

---

# Phase 12 Plan 01 — Build Summary

## One-liner

IG Story publish chain + FB Photo Story branch + Assert FB SAS Code node wired atomically into n8n workflow, with ERR-01 onError routing, SCHED-02 22h cap, and Phase-11 guard removed — node count 78→90.

## Task 1 — Live API Verification (executed 2026-04-23)

All 5 live API tests reproduced with real credentials (`META_PAGE_TOKEN` + `INSTAGRAM_ACCOUNT_ID=17841480004109313` + `FACEBOOK_PAGE_ID=981931321668013`) to refresh the evidence from the RESEARCH.md (also dated 2026-04-23, but re-run here so the SUMMARY reflects execution-day state).

### Test A — graph.facebook.com IG Story container

```
POST https://graph.facebook.com/v22.0/17841480004109313/media
Content-Type: application/json
{
  "image_url": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1080&h=1920&fit=crop",
  "media_type": "STORIES",
  "access_token": "<META_PAGE_TOKEN>"
}
```

**Response:**
```
{"id":"17869082274666804"}
HTTP_STATUS:200
```

**Verdict:** PASS — host `graph.facebook.com` confirmed for IG Story container creation with current Page Access Token.

### Test C — container readiness

```
GET https://graph.facebook.com/v22.0/17869082274666804?fields=status_code,status&access_token=<TOKEN>
```

**Response:**
```
{"status_code":"FINISHED","status":"Finished: Media has been uploaded and it is ready to be published.","id":"17869082274666804"}
HTTP_STATUS:200
```

**Verdict:** PASS — container reaches `FINISHED` within 3s of creation. Confirms the 45s wait in `⏳ IG: Wait 45s Story Container` is ~15× conservative, consistent with carousel wait pattern.

### Test D — expires_at NOT a valid field

```
GET https://graph.facebook.com/v22.0/17869082274666804?fields=expires_at,permalink&access_token=<TOKEN>
```

**Response:**
```
{"error":{"message":"(#100) Tried accessing nonexisting field (expires_at)","type":"OAuthException","code":100,"fbtrace_id":"AF2BACCXp8R1MdKrpr2rAD2"}}
HTTP_STATUS:400
```

**Verdict:** PASS — `expires_at` is NOT a documented field on IG Media (code:100). Fallback compute (`timestamp + 86400000ms`) is required downstream, as designed in `🔧 IG: Compute Story Expiry`.

### Test G — permalink+timestamp+media_product_type on pre-publish container

```
GET https://graph.facebook.com/v22.0/17869082274666804?fields=permalink,timestamp,media_product_type&access_token=<TOKEN>
```

**Response:**
```
{"error":{"message":"(#100) Tried accessing nonexisting field (permalink)","type":"OAuthException","code":100,"fbtrace_id":"AtjC9grub0SRgS0iUaXzvmc"}}
HTTP_STATUS:400
```

**Individual field isolation (Test G' and G''):**
- `fields=timestamp` → `(#100) Tried accessing nonexisting field (timestamp)`
- `fields=media_product_type` → `(#100) Tried accessing nonexisting field (media_product_type)`

**Verdict:** PASS with refined understanding. Pre-publish **container** does NOT expose `permalink`, `timestamp`, or `media_product_type`. These fields ONLY exist on the **published media_id** returned by `media_publish`. This is consistent with the plan's downstream design: `🔗 IG: Get Story Permalink` runs a GET against the `$json.id` returned by `🚀 IG: Story media_publish` (the published media ID), NOT against the container ID. The GET fields=permalink,timestamp,media_product_type will succeed in production flow because it queries the published media, not the container.

**Key insight for Plan 12-02 E2E:** if `🔗 IG: Get Story Permalink` ever fails with code 100, check whether it's accidentally pointing at the container id instead of the media_publish response id.

### Test J — FB /photo_stories reachable + perms

```
POST https://graph.facebook.com/v22.0/981931321668013/photo_stories
Content-Type: application/json
{
  "photo_id": "99999999999999999",
  "access_token": "<META_PAGE_TOKEN>"
}
```

**Response:**
```
{"error":{"message":"(#100) Invalid id.","type":"OAuthException","code":100,"fbtrace_id":"A1g2M54Fk_I7NZv5WFnZvE0"}}
HTTP_STATUS:400
```

**Verdict:** PASS — endpoint exists in v22 AND current Page Token has sufficient perms. Error is semantic (code:100 "Invalid id" = bogus photo_id rejected, endpoint reachable + token valid). NOT a perms error (which would be code:200 OAuthException about `pages_manage_posts`). **No escalation to Susana required.**

### Overall Verdict — Task 1

**PASS — all 5 tests confirm:**
1. `graph.facebook.com` is the correct host for IG Story (NOT `graph.instagram.com`)
2. `expires_at` fallback compute required (field does not exist)
3. FB `/photo_stories` reachable with current Page Token perms
4. Pre-publish container DOES NOT expose `permalink`/`timestamp`/`media_product_type` — these surface only after `media_publish` on the published media_id (informs downstream GET node design)

Safe to proceed to Task 2 (workflow.json edits).

## Task 2 — Workflow.json edits

- **Pre-flight A — onError pattern observed:** Option B confirmed. `grep -c '"error":' n8n/workflow.json` returned 0 matches, i.e. all existing carousel/single onError wiring uses `main[]` second slot. Example verified at lines 3049-3065 (`🖼️ IG: Create Child Container` has `main: [[happy], [Tag IG Error]]`, no separate `error` key). All 5 new HTTP Story nodes wired accordingly (Option B via `main[1]`).
- **Pre-flight B — env vars confirmed:** `$env.INSTAGRAM_ACCOUNT_ID`, `$env.META_PAGE_TOKEN`, `$env.FACEBOOK_PAGE_ID`, `$env.YCLOUD_API_KEY`, `$env.YCLOUD_WHATSAPP_NUMBER`, `$env.GOOGLE_SHEETS_ID` all used consistently with carousel/single nodes.
- **Pre-edit node count:** 78 | **Post-edit:** 90 | **Delta:** +12 (exact match for Story publish-chain)
- **Connection keys:** 73 → 85 (+12 new blocks)
- **12 nodes added:** `format-story-branch`, `ig-create-story-container`, `ig-wait-story-container`, `ig-story-media-publish`, `ig-get-story-permalink`, `ig-compute-story-expiry`, `check-platforms-facebook`, `assert-fb-story-url`, `fb-upload-story-photo`, `fb-publish-photo-story`, `notify-wa-story`, `sheets-log-story`
- **1 connection rewired:** `🔀 ¿Formato Carrusel?` FALSE output changed from `📤 IG: Create Container` → `🔀 ¿Formato Story?` (single path restored byte-for-byte via `🔀 ¿Formato Story?` FALSE → `📤 IG: Create Container`)
- **Credentials reused:** `XjKteoOTobs1qR55` ("Google Sheets account") for `sheets-log-story`; YCloud WA uses inline `X-API-Key` header with `$env.YCLOUD_API_KEY` (matching `notify-wa-carousel` pattern — NO `credentials.httpHeaderAuth` block)
- **Validations 1-11 all passed first run** (JSON parse, node count, router rewire, ERR-01 Option B wiring, terminal Sheets Log → Extract Blob Names, IGSTORY-06 no hashtag comment, retryOnFail=false on both media_publish, BLOCKER-1 Azure Blob URL consumption, FBSTORY-04 Assert install, FB Upload consumes Assert output, Assert wired in FB chain, caption NOT in Story body, Carousel TRUE path intact)
- **Commit SHA (workflow.json):** `6f1c703`

## Task 3 — SCHED-02 patch + Phase-11 guard removal + docs

- **Edit 1/4:** `🕐 Compute wait_seconds` (id `compute-wait-seconds`) — SCHED-02 guard added before `return` statement. Rejects `data.format === 'story' && wait_seconds > 79200` (22h) with a descriptive castellano error explaining the Story 24h expiry window and suggesting either earlier scheduling or replying NO. Single + carousel flows unchanged (`format !== 'story'` bypasses).
- **Edit 2/4:** `🔧 Prep Re-host Input` (id `prep-rehost-input`) — Phase-11 guard block removed (4 lines: comment + `if (data.format === 'story') { throw ... }`). Story now flows through the existing `else if (data.final_image_url)` branch, building `imageUrls = [{ index: 1, url: <azure_blob_url> }]` with no additional logic required.
- **Edit 3/4:** `.planning/REQUIREMENTS.md` — IGSTORY-02 APPENDED with `[CORRECTED 2026-04-23 in Phase 12 Plan 01 Task 1: actual host is graph.facebook.com ... verified live with container ID 17869082274666804]`. Original text with `graph.instagram.com` preserved (1 occurrence remains, as intended — audit trail). FBSTORY-04 APPENDED with `[SCOPE SHIFTED 2026-04-23 in Phase 12 Plan 01 Task 2: implemented in Phase 12 via 🛡️ Assert FB Story URL Code v2 node — Option A strip semantics]`. Traceability table updated: IGSTORY-01..06 + SCHED-02 + ERR-01 + FBSTORY-02..04 all marked `Phase 12 Plan 01 | Done (build)`.
- **Edit 4/4:** `.planning/ROADMAP.md` — Phase 12 Success Criterion 1 rewritten to affirm `graph.facebook.com` as the verified host (replacing the ambiguous "host vs" wording from pre-research).
- **Node count stable at 90** (no new nodes — these are Code node jsCode patches + doc edits).
- **Commit 1 SHA (workflow.json):** `c7e45b1`
- **Commit 2 SHA (docs):** `c38e50d`

## Commits Summary

| # | SHA | Type | Scope |
|---|---|---|---|
| 1 | `fafe72e` | chore | Task 1 — live Meta Graph API verification |
| 2 | `6f1c703` | feat | Task 2 — IG Story chain + FB Photo Story + Assert FB SAS + ERR-01 wiring |
| 3 | `c7e45b1` | feat | Task 3 — SCHED-02 guard + Phase-11 guard removal |
| 4 | `c38e50d` | docs | Task 3 — REQUIREMENTS.md + ROADMAP.md corrections |

## Open Items for Plan 12-02 (E2E)

- **Deploy to n8n-azure:** PUT the workflow to the live n8n instance and verify `active=true` post-PUT (settings whitelist pattern established in Phase 11-02).
- **E2E Story-only test** (`platforms: ['instagram']`): generate Story → WA SI → verify Story in IG profile + Sheets row `Estado=Publicado` + Supabase `story_expires_at` populated + blob cleanup.
- **E2E Story IG+FB test** (`platforms: ['instagram', 'facebook']`): verify Story appears on both IG profile AND FB Page Story (not feed). Inspect FB WA notification for permalink format (Open Q #2 from RESEARCH: does `https://www.facebook.com/<post_id>` work for Stories, or does FB surface a `/stories/...` URL?).
- **Regression:** 1× carousel + 1× single to prove new branches did not disturb carousel TRUE path nor the `🔀 ¿Formato Story?` FALSE → Create Container restoration.
- **Failure injection:** revoke token momentarily or use bogus `creation_id` to prove onError → `🏷️ Tag IG Error` → error subgraph → `📊 Sheets Fail Log` → blob cleanup all fire as designed.
- **Test post cleanup:** delete FB test Story via Graph API (MEMORY reference `feedback_delete_test_posts.md`).

## Gotchas & Learnings

1. **Option B onError confirmed empirically.** `grep -c '"error":' n8n/workflow.json` returned 0 — all existing onError wiring is via `main[]` second slot. Applied Option B to all 5 new HTTP Story nodes. No adaptation needed from the plan's snippets.
2. **YCloud WA notify pattern: inline X-API-Key header, NOT credentials block.** The plan's Edit 11 template suggested a `credentials.httpHeaderAuth.id` block with a `<REUSE_YCLOUD_CRED_ID>` placeholder, but the existing `✅ Notify WhatsApp Carousel` node uses inline `X-API-Key` header via `$env.YCLOUD_API_KEY`. I aligned the new `✅ Notify WhatsApp Story` node with the existing pattern — no credential block.
3. **Pre-publish container does NOT expose permalink/timestamp/media_product_type.** Test G returned code:100 "Tried accessing nonexisting field (permalink)" for all three fields against a fresh container. This is expected — those fields only exist on the *published* media_id returned by `media_publish`. `🔗 IG: Get Story Permalink` correctly GETs against `$json.id` which at that point in the flow is the media_publish response id (not the container id). Added an explanatory note to the node's `notes` field so future maintainers don't confuse the two.
4. **FBSTORY-04 scope shift was a good call.** The Assert node was trivial to add (<1ms Code v2), adds defense-in-depth at zero ongoing cost, and closes the requirement in Phase 12 instead of Phase 13. Current Azure Blob URLs from Phase 11 are bare permalinks (no SAS query), so the strip is a no-op in practice — but the guardrail is in place for future SAS rotations.
5. **Azure Blob URL canonicalization via `🔗 Merge Rehost Output`.** Both IG Story Container AND FB Upload consume `$('🔗 Merge Rehost Output').item.json.blob_urls[0].url` (BLOCKER-1 closed). This preserves the "what the user approved is what gets published" invariant across both platforms, and aligns with SCHED-02 safety (Azure Blob SAS valid until 2027; Ideogram URLs expire in 24h — risky when wait approaches the 22h cap).
6. **Meta Graph API test account "Unsplash photo": safe for container creation, unsafe for media_publish.** Test A created a real container with an Unsplash image — totally benign because we stopped there. Running `media_publish` on that container would have published a real Story of an Unsplash landscape on Propulsar's IG profile. The plan correctly warned against this.

## Self-Check: PASSED

### Files verified on disk
- FOUND: `n8n/workflow.json` (90 nodes, 85 connection keys, JSON parse valid)
- FOUND: `.planning/REQUIREMENTS.md` (IGSTORY-02 + FBSTORY-04 APPEND corrections, traceability table updated)
- FOUND: `.planning/ROADMAP.md` (Phase 12 SC1 rewritten)
- FOUND: `.planning/phases/12-ig-story-publishing/12-01-SUMMARY.md` (this file)

### Commits verified in git log
- FOUND: `fafe72e` (Task 1 — live API verification)
- FOUND: `6f1c703` (Task 2 — 12 nodes + connections + ERR-01)
- FOUND: `c7e45b1` (Task 3 — SCHED-02 + Phase-11 guard removal)
- FOUND: `c38e50d` (Task 3 — REQUIREMENTS + ROADMAP docs)

### Workflow invariants verified
- Final node count: 90 (exact delta +12 from baseline 78)
- All 12 Story publish-chain node IDs present
- Router graph preserves single + carousel paths byte-for-byte
- ERR-01 Option B wiring intact for all 5 new Meta HTTP nodes (3 IG → Tag IG Error, 2 FB → Tag FB Error)
- SCHED-02 guard installed in `🕐 Compute wait_seconds`
- Phase-11 guard removed from `🔧 Prep Re-host Input`
- FBSTORY-04 closed via `🛡️ Assert FB Story URL` Code v2 node
- BLOCKER-1 closed: IG + FB Story both consume Azure Blob URL (no raw Ideogram refs)
- `retryOnFail=false` on both media_publish endpoints (IGSTORY-04 + FBSTORY-03)
- No `caption` field in IG Story container body (pitfall #2 avoided)
- No Story chain node connects to any hashtag comment node (IGSTORY-06)
