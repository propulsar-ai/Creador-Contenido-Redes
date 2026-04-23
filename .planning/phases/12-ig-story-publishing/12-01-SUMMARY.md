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
  duration: TBD
  completed: TBD

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
- **Commit SHA (workflow.json):** `<pegar acá tras el commit de abajo>`

## Task 3 — SCHED-02 patch + Phase-11 guard removal + docs

[Task 3 completes this section]
