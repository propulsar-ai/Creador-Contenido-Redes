# Requirements: v1.2 Stories Publishing

**Defined:** 2026-04-19
**Milestone Goal:** Tras aprobar SI en WhatsApp, publicar Story vertical 9:16 en Instagram + Facebook con imagen AI, scheduling <22h, audit trail — reutilizando pipeline v1.0/v1.1 sin romperlo.
**Core Value (from PROJECT.md):** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook.

## v1.2 Requirements

### Wizard (WIZ)

Changes to `wizard/run.js` so users can pick Historia format and set Story-aware scheduling.

- [ ] **WIZ-01**: User can choose "Historia" as a third format option in Wizard PASO 3 (alongside Post Individual and Carrusel)
- [ ] **WIZ-02**: Wizard brief JSON for Stories includes `format: "story"`, `aspect_ratio: "9:16"`, `num_images: 1`, and `story_expires_at` (ISO timestamp of publish_time + 24h)
- [ ] **WIZ-03**: Wizard PASO 5 recommends Ideogram v3 for Stories and excludes Flux / Nano Banana from the Story model selector (aspect ratio not verified for those models in v1.2)
- [ ] **WIZ-04**: Wizard PASO 6 rejects Story scheduling > 22h with a user-facing warning explaining Story 24h expiry (guarantees ≥2h visibility)

### Image Generation (IMGEN)

New n8n image generation branch for 9:16 vertical Stories.

- [ ] **IMGEN-01**: n8n workflow routes `format=story` briefs through a new `🔀 ¿Story?` IF v1 node inserted on FALSE output of `🖼️ ¿Imagen propia?`
- [ ] **IMGEN-02**: New `🔤 Ideogram v3 — Story` node generates 9:16 images via `aspect_ratio: "ASPECT_9_16"` (produces 1080×1920)
- [ ] **IMGEN-03**: Supabase session save for Stories persists `format: "story"` so downstream routing and scheduling guards can read it
- [ ] **IMGEN-04**: WhatsApp preview for Stories reuses existing preview node; the caption text message includes a disclaimer that the image is 9:16 vertical and that the preview caption is NOT sent to Meta

### Instagram Story Publishing (IGSTORY)

Publish approved Stories to Instagram via Meta Graph API.

- [ ] **IGSTORY-01**: n8n routes SI-approved Stories via a new `🔀 ¿Formato Story?` IF v1 node inserted on FALSE output of `🔀 ¿Formato Carrusel?` (after Azure Blob re-hosting)
- [ ] **IGSTORY-02**: IG Story container is created via `POST graph.instagram.com/v22.0/{IG_USER_ID}/media` with `media_type=STORIES` and no caption (verified host via live API test as first task of IG Story phase)
- [ ] **IGSTORY-03**: n8n waits 45 seconds for the Story container to become ready before calling `media_publish`
- [ ] **IGSTORY-04**: IG Story `media_publish` node has `retryOnFail=false` (endpoint not idempotent — retry creates duplicate Story)
- [ ] **IGSTORY-05**: After publish, Story permalink and `expires_at` are retrieved via `GET /{media-id}?fields=permalink,expires_at` (fallback to `publish_time + 86400000` if `expires_at` not populated)
- [ ] **IGSTORY-06**: Stories publish chain is a separate terminal branch — existing hashtag comment nodes (`💬 IG: Post Hashtag Comment`) are NOT reached by Story executions

### Facebook Page Story Publishing (FBSTORY)

Publish approved Stories to Facebook Page via Meta Graph API.

- [ ] **FBSTORY-01**: Before building production node, a live API test determines whether FB Story flow is single-step (`POST /{PAGE_ID}/photo_stories?url=X`) or 2-step (`POST /photos?published=false` → `POST /photo_stories?photo_id=X`) and the result documented
- [ ] **FBSTORY-02**: FB Page Story publishes successfully via `/{PAGE_ID}/photo_stories` endpoint (exact flow from FBSTORY-01) using existing Meta Page Token
- [ ] **FBSTORY-03**: FB Story publish step has `retryOnFail=false` (not idempotent)
- [ ] **FBSTORY-04**: Before FB Story container creation, an assertion rejects Azure Blob URLs containing SAS query params (Meta Story fetcher is stricter than FEED fetcher)

### Scheduling (SCHED)

Story-aware scheduling caps.

- [ ] **SCHED-01**: Wizard `parsePublishTime` caps Story scheduling at 22h (not 24h), with a user-facing error if user attempts beyond this
- [ ] **SCHED-02**: n8n `🕐 Compute wait_seconds` Code node reads `format` from the session and routes to error if `format=story && wait_seconds > 79200` (22h)

### Notifications (NOTIF)

Story-specific WhatsApp messaging.

- [ ] **NOTIF-01**: WhatsApp success notification for Stories includes publish confirmation, expiry timestamp in CET (`publish_time + 24h`), IG Story permalink labeled "válido 24h", and note that FB Story has no permanent URL
- [ ] **NOTIF-02**: WhatsApp preview message for Stories includes a disclaimer explaining that the image is 9:16 vertical (may appear cropped in WA but will display full-screen in Instagram) and that the caption text is user-facing review only (not sent to Meta)

### Logging (LOG)

Sheets schema extension for Story audit trail.

- [ ] **LOG-01**: Existing Sheets log nodes (`📊 Google Sheets Log`, `📊 Google Sheets Log (Carousel)`, `📊 Sheets Fail Log`) add a `Formato` column with values `single`, `carousel`, or `story` (blanks acceptable in historical rows — backward-compatible)
- [ ] **LOG-02**: New `📊 Google Sheets Log (Story)` node writes Story success rows with `Formato=story` and populates `Expires_At` column (ISO timestamp from IG API or computed `publish_time + 86400000`)

### Error Handling (ERR)

Reuse v1.1 error subgraph for Story publishing failures.

- [ ] **ERR-01**: All new Story publish nodes (`📤 IG: Create Story Container`, `🚀 IG: Story media_publish`, `🌐 FB: Publish Photo Story`) have their `onError` outputs wired into the existing 9-node error handler subgraph via `🏷️ Tag IG Error` or `🏷️ Tag FB Error` (no changes to subgraph logic)

---

## v2 Requirements (deferred to future milestones)

### Stories Extended (STORYX)

- **STORYX-01**: Flux 2 Pro supports Stories 9:16 generation (requires empirical verification of portrait dimensions)
- **STORYX-02**: Nano Banana Pro supports Stories 9:16 generation (requires empirical verification — current output 1080×1918, borderline)
- **STORYX-03**: Video Stories (requires video generation pipeline — no current path)
- **STORYX-04**: Story container status polling (replaces fixed 45s wait — more robust under Meta load)
- **STORYX-05**: Link sticker support (requires `link_sticker` permission from Meta Policy review)
- **STORYX-06**: Story Highlights management (separate `highlight_reels` API — distinct feature set)

### Analytics (ANLY-v2)

- **ANLY-01**: IG Story reach, impressions, taps forward/back, exits (requires analytics layer + 24h post-publish query window)
- **ANLY-02**: FB Story views metric (if FB Insights API supports it)

---

## Out of Scope (v1.2)

| Feature | Reason |
|---------|--------|
| Video Stories | No video generation in Propulsar stack — static images only |
| Caption/text overlay on published Story via API | `caption` param silently ignored by Meta for `media_type=STORIES`; text burned in image by Ideogram |
| Hashtag stickers in Stories | API unavailable for all tiers (Creator Studio / mobile only) |
| Poll, Question, Quiz, Countdown stickers | API unavailable |
| Link sticker | Requires `link_sticker` permission — multi-week Meta Policy review |
| Music sticker | API completely unavailable |
| Story Highlights (save to collection) | Separate `highlight_reels` API — deferred to future milestone |
| Scheduling Stories > 24h from now | Story expires immediately on publish — Wizard caps at 22h |
| Boomerang / GIF Stories | Consumer UX only — no API equivalent |
| Flux 2 Pro for Stories in v1.2 | `portrait_4_3` produces 896×1152 (ratio 0.778, wrong) — not verified |
| Nano Banana Pro for Stories in v1.2 | Produces 1080×1918 (ratio 0.5636, borderline vs 0.5625 target) — not verified |
| Separate Story-specific image generation model | All 3 existing models claim support — no new model needed |
| Extended container polling for Stories | 45s fixed Wait matches v1.1 carousel pattern — sufficient for v1.2 |
| IG native `publish_at` parameter | Doesn't exist in IG Graph API — scheduling via Wait node only |
| FB `scheduled_publish_time` for Stories | Would create parallel scheduling paths — stick with Wait node |
| Multi-account Story publishing | Requires multi-tenant token management — out of scope for v1.2 |
| Frontend dashboard for Stories | Separate project |

---

## Traceability

*Empty — populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIZ-01 | — | Pending |
| WIZ-02 | — | Pending |
| WIZ-03 | — | Pending |
| WIZ-04 | — | Pending |
| IMGEN-01 | — | Pending |
| IMGEN-02 | — | Pending |
| IMGEN-03 | — | Pending |
| IMGEN-04 | — | Pending |
| IGSTORY-01 | — | Pending |
| IGSTORY-02 | — | Pending |
| IGSTORY-03 | — | Pending |
| IGSTORY-04 | — | Pending |
| IGSTORY-05 | — | Pending |
| IGSTORY-06 | — | Pending |
| FBSTORY-01 | — | Pending |
| FBSTORY-02 | — | Pending |
| FBSTORY-03 | — | Pending |
| FBSTORY-04 | — | Pending |
| SCHED-01 | — | Pending |
| SCHED-02 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| LOG-01 | — | Pending |
| LOG-02 | — | Pending |
| ERR-01 | — | Pending |

**Coverage:**
- v1.2 requirements: 25 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 25

---

*Requirements defined: 2026-04-19*
*Last updated: 2026-04-19 after research synthesis*
