# Stack Research — v1.2 Stories Publishing

**Domain:** Meta Graph API — Instagram Stories + Facebook Page Stories
**Researched:** 2026-04-18
**Confidence:** MEDIUM-HIGH (training knowledge Aug 2025 + codebase verification; web search unavailable in this session)
**Milestone:** v1.2 — Stories Publishing (IG + FB)

---

## Context

This is an additive research document. The existing stack (Node.js 22 Wizard, n8n 2.14.2 on Azure Container Apps, GPT-4o, Flux/Ideogram/Nano Banana, YCloud WhatsApp, Supabase, Azure Blob, Google Sheets, Meta Graph API v22) is validated and locked in. This document covers ONLY what changes or is added for Stories publishing.

**Codebase baseline verified:** 73-node n8n workflow with these confirmed API patterns:
- IG publishing: `POST graph.facebook.com/v22.0/{IG_USER_ID}/media` → `media_publish`
- FB publishing: `POST graph.facebook.com/v22.0/{PAGE_ID}/photos` (single) + `attached_media` feed (carousel)
- All image generation currently uses 1:1 aspect ratio (`ASPECT_1_1` / `square_hd` / `1:1`)

---

## Question 1: Instagram Stories — Does `media_type=STORIES` work on existing endpoints?

**Answer: YES — same 2-step endpoint, new `media_type` parameter.**

The existing `/{IG_USER_ID}/media` → `/{IG_USER_ID}/media_publish` flow supports Stories by adding `media_type=STORIES`. No new endpoint.

**Step 1 — Create Story container:**
```
POST https://graph.facebook.com/v22.0/{IG_USER_ID}/media
Body: {
  "image_url": "<PUBLIC_HTTPS_URL>",
  "media_type": "STORIES",
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
Returns: { "id": "<CONTAINER_ID>" }
```

**Step 2 — Publish (identical to FEED):**
```
POST https://graph.facebook.com/v22.0/{IG_USER_ID}/media_publish
Body: {
  "creation_id": "<CONTAINER_ID>",
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
Returns: { "id": "<IG_STORY_MEDIA_ID>" }
```

**Key differences vs FEED posts:**
| Parameter | FEED (current) | STORIES |
|-----------|---------------|---------|
| `media_type` | absent (defaults to IMAGE) | `"STORIES"` (required) |
| `caption` | supported | **ignored** — captions are not supported for Stories via API |
| `is_carousel_item` | used for carousel | not applicable |
| Container wait | 30s current + 45s carousel | same 30s wait sufficient |
| `media_publish` retry | disabled per ERR-02 | keep disabled (same non-idempotent behavior) |

**CRITICAL: No captions on IG Stories.** The caption field is silently ignored. Any text that needs to appear on the Story must be embedded in the image itself. This drives the prompt engineering requirement: the Story image prompt must include visible text or the concept must be self-explanatory without caption.

**Confidence:** MEDIUM-HIGH. `media_type=STORIES` is documented in Meta Graph API content publishing reference as of mid-2025. The URL structure is confirmed consistent with existing codebase patterns.

---

## Question 2: Facebook Page Stories — Correct Endpoint?

**Answer: Use `/{PAGE_ID}/photo_stories` — 1-step publish (no container/publish split).**

Facebook Page Stories use a dedicated endpoint that differs from the Feed publishing pattern:

```
POST https://graph.facebook.com/v22.0/{PAGE_ID}/photo_stories
Body: {
  "url": "<PUBLIC_HTTPS_URL>",
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
Returns: { "post_id": "<STORY_POST_ID>" }
```

**How this differs from existing FB patterns:**
| Pattern | FB Feed Photo (current) | FB Photo Stories |
|---------|------------------------|-----------------|
| Endpoint | `/{PAGE_ID}/photos` | `/{PAGE_ID}/photo_stories` |
| Steps | 1-step (published=true) | 1-step |
| `message`/`caption` | supported | **not supported** (same as IG — no captions via API) |
| `attached_media` | used for carousel | not applicable |
| Return field | `id` + `post_id` | `post_id` |

**No 2-step upload-then-publish pattern for FB Stories.** Unlike FB carousel (which uses unpublished photos + feed post), `photo_stories` is atomic.

**No `attached_media` needed.** That pattern is only for multi-photo feed posts.

**Confidence:** MEDIUM. The `/photo_stories` endpoint is documented in Meta's Pages API reference. However, the exact parameter name (`url` vs `photo_id`) and return shape should be verified with a test call before building the n8n nodes. Flag for verification task in the plan.

---

## Question 3: Image Requirements for Stories

**Answer: 9:16 aspect ratio (1080x1920px). ALL three image generators need their aspect_ratio parameter changed for Stories.**

### Canonical Stories image spec (from Meta docs):
| Property | Value |
|----------|-------|
| Aspect ratio | 9:16 (vertical) |
| Recommended resolution | 1080 x 1920 px |
| Minimum resolution | 500 x 888 px |
| Max file size | 8 MB for images |
| Formats | JPEG, PNG |
| Safe zone | Keep key content within center 1080x1420px (avoids UI overlays at top/bottom) |

### Current vs Required per image generator:

**Ideogram v3** (primary generator):
- Current: `"aspect_ratio": "ASPECT_1_1"` (square)
- Required for Stories: `"aspect_ratio": "ASPECT_9_16"`
- Confidence: HIGH — Ideogram API documents `ASPECT_9_16` as a valid enum value alongside `ASPECT_1_1`, `ASPECT_16_9`, etc.
- No other parameter changes needed.

**Flux 2 Pro via FAL.AI:**
- Current: `"image_size": "square_hd"` (1024x1024)
- Required for Stories: `"image_size": { "width": 1080, "height": 1920 }` OR `"image_size": "portrait_16_9"` if FAL supports named portrait sizes
- Confidence: MEDIUM — FAL.AI supports custom `{"width": N, "height": N}` objects for image_size. Whether `portrait_9_16` or similar named size exists needs verification. Use custom object `{"width": 1080, "height": 1920}` as the safe fallback.
- Named sizes confirmed on FAL: `square_hd`, `landscape_4_3`, `landscape_16_9`, `portrait_4_3`, `portrait_16_9` — use `"portrait_16_9"` (1080x1920 equivalent). Confidence: MEDIUM (training knowledge).

**Nano Banana Pro via FAL.AI:**
- Current: `"aspect_ratio": "1:1"`
- Required for Stories: `"aspect_ratio": "9:16"`
- Confidence: MEDIUM — Nano Banana uses string aspect_ratio values; `"9:16"` is the expected format based on existing `"1:1"` pattern.

### Implementation approach — no cropping needed:

Generate at native 9:16 directly. Do NOT generate at 1:1 and crop — cropping square to vertical loses ~44% of the image content and produces visually poor results. The correct approach is to change `aspect_ratio`/`image_size` in the generator call.

**This means Stories require a parallel image generation path** — the same prompt with different aspect ratio parameters. The n8n router for image generators needs Stories-aware variants of each image generation node (or dynamic aspect_ratio injection).

---

## Question 4: Additional Meta Permissions Required

**Current confirmed scopes (from v1.1 setup):**
- `pages_read_engagement`
- `pages_manage_posts`
- `instagram_basic`
- `instagram_content_publish` (legacy path — still functional)
- Missing: `instagram_manage_comments` (known gap from v1.1)

**Stories-specific permission analysis:**

| Permission | Required for | Status |
|------------|-------------|--------|
| `instagram_content_publish` | IG Stories via `media_type=STORIES` | Already present |
| `pages_manage_posts` | FB Page Stories via `/photo_stories` | Already present |
| `pages_read_engagement` | Read FB page data (already used) | Already present |
| `instagram_manage_insights` | NOT required for publishing | N/A |

**Conclusion: No new permissions required for Stories publishing.** The existing token (derived from Susana's session with `instagram_content_publish` + `pages_manage_posts`) covers both IG and FB Stories publishing.

**Caveat:** If Meta has added a specific `pages_manage_stories` permission in a recent API update (post-Aug 2025), this research would not catch it. Flag as a verification task: test the Stories endpoint with the current token and check if a 403 with permission error is returned.

**Confidence:** MEDIUM. Based on training data through August 2025. Permission requirements can change with Meta API version bumps.

---

## Question 5: New npm Packages for Vertical Image Preview in Wizard?

**Answer: No new npm packages needed.**

The Wizard currently sends image URLs to YCloud for WhatsApp preview — it does not do any local image processing. For Stories, the same pattern applies: the vertically-generated image URL gets sent to YCloud as a WhatsApp image message. YCloud renders it in the preview, and the vertical format will display correctly in WhatsApp (portrait images display fine in WA image messages).

**The only Wizard changes needed:**
1. Add `"stories"` as a selectable format alongside `"single"` and `"carousel"` in PASO 1 (format selector)
2. Add Stories-specific prompt context hint (remind user text must be in the image)
3. Include `format: 'stories'` in the brief JSON sent to n8n webhook

**No preview library (sharp, jimp, canvas, etc.) is needed.** The image generators produce the 9:16 image directly. There is no local image manipulation in the Wizard today and none is required for v1.2.

**Confidence:** HIGH — confirmed by reading the existing wizard/run.js pattern and understanding the Wizard's role as a brief-collector that delegates all image work to n8n.

---

## Question 6: Stories-Specific Scheduling Considerations — `expires_at`?

**Answer: Stories expire after 24 hours. `expires_at` is returned but no special handling required at publish time.**

Instagram Stories have a built-in 24-hour expiry. The `expires_at` timestamp is available via:
```
GET https://graph.facebook.com/v22.0/{IG_STORY_MEDIA_ID}?fields=id,permalink,expires_at&access_token={TOKEN}
```

**However:** This is read-only metadata. The Story expires automatically on Meta's side — the n8n workflow does not need to track or enforce this. There is no action to take when a Story expires (unlike scheduled posts where the window matters).

**What this means for v1.2:**
- No scheduling gate changes needed for Stories — the existing scheduling infrastructure works the same way
- `expires_at` can optionally be included in the success WhatsApp notification ("Tu Story expira en 24h") but is not required
- No new Supabase fields needed for Stories expiry tracking
- The 24-hour scheduling cap from v1.1 (`SCHED-04`) is unrelated to Stories expiry — they are independent concepts

**Scheduling conflict to avoid:** If a Story is scheduled to publish in 23.5 hours, it will go live for only 30 minutes before expiring. This is a user awareness issue, not a technical one. The Wizard success message should note "Las Stories expiran a las 24h de publicarse."

**Facebook Page Stories expiry:** Same 24-hour behavior on FB side.

**Confidence:** HIGH — Stories 24h expiry is a well-established platform characteristic, not a recent API change.

---

## New Components Needed (Delta from v1.1)

### n8n Workflow Additions

| Component | Type | Purpose | Integration Point |
|-----------|------|---------|------------------|
| Format router: Stories branch | IF node (typeVersion 1) | Route `format=stories` separately from `single`/`carousel` | After session recovery, before rehost |
| IG Story image generators (3 nodes) | HTTP Request nodes | Ideogram+Flux+Nano Banana with 9:16 aspect_ratio | Parallel to existing image gen nodes |
| IG Story container creation | HTTP Request node | `POST /{IG_USER_ID}/media` with `media_type=STORIES` | After Azure Blob rehost |
| IG Story Wait 30s | Wait node | Container readiness (same as single post) | After container creation |
| IG Story media_publish | HTTP Request node | `POST /{IG_USER_ID}/media_publish` | After wait |
| FB Page Story publish | HTTP Request node | `POST /{PAGE_ID}/photo_stories` | Parallel to IG Story publish |
| Notify WhatsApp Stories | HTTP Request node (YCloud) | Success notification with 24h expiry note | After both IG+FB publish |

### Wizard Additions

| Component | Type | Purpose |
|-----------|------|---------|
| Format option "stories" | PASO 1 selector | Let user choose Stories as format |
| Stories caption warning | Console output | Inform user text must be in the image |
| `format: 'stories'` in brief JSON | Field addition | Signals n8n to use Stories pipeline |

### No New npm Packages

The `package.json` currently has only `dotenv: ^16.4.5`. No new dependencies for v1.2. Image generation at 9:16 is handled by changing parameters in existing API calls.

---

## API Endpoints — Complete Reference for v1.2

### Instagram Stories Publish (2-step, same as FEED)

```
Step 1 — Create Story container:
POST https://graph.facebook.com/v22.0/{IG_USER_ID}/media
Body: {
  "image_url": "<PUBLIC_BLOB_URL>",
  "media_type": "STORIES",
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
Returns: { "id": "<CONTAINER_ID>" }

Wait 30s (same as single post — container readiness)

Step 2 — Publish:
POST https://graph.facebook.com/v22.0/{IG_USER_ID}/media_publish
Body: {
  "creation_id": "<CONTAINER_ID>",
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
Returns: { "id": "<IG_STORY_MEDIA_ID>" }
```

### Facebook Page Stories Publish (1-step)

```
POST https://graph.facebook.com/v22.0/{PAGE_ID}/photo_stories
Body: {
  "url": "<PUBLIC_BLOB_URL>",
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
Returns: { "post_id": "<STORY_POST_ID>" }
```

### Stories Metadata (optional — for `expires_at` in notification)

```
GET https://graph.facebook.com/v22.0/{IG_STORY_MEDIA_ID}
  ?fields=id,permalink,expires_at
  &access_token={PAGE_ACCESS_TOKEN}
```

---

## Image Generation Parameter Changes

### Ideogram v3 — Stories variant

Change only `aspect_ratio`:
```json
{
  "image_request": {
    "prompt": "...",
    "aspect_ratio": "ASPECT_9_16",
    "model": "V_2_TURBO",
    "magic_prompt_option": "OFF",
    "style_type": "DESIGN"
  }
}
```

### Flux 2 Pro via FAL.AI — Stories variant

Change `image_size` from named square to portrait:
```json
{
  "prompt": "...",
  "image_size": "portrait_16_9",
  "num_inference_steps": 28,
  "guidance_scale": 3.5,
  "num_images": 1
}
```

If `portrait_16_9` is not accepted, fallback:
```json
{
  "image_size": { "width": 1080, "height": 1920 }
}
```

### Nano Banana Pro via FAL.AI — Stories variant

Change `aspect_ratio` string:
```json
{
  "prompt": "...",
  "num_images": 1,
  "aspect_ratio": "9:16",
  "output_format": "png",
  "safety_tolerance": "4"
}
```

---

## Alternatives Considered

| Decision | Chosen Approach | Alternative | Why Not |
|----------|----------------|-------------|---------|
| Stories image | Generate native 9:16 | Generate 1:1 + server-side crop | Cropping loses 44% content; needs `sharp` npm package; output looks bad |
| FB Stories | `/{PAGE_ID}/photo_stories` | Reel video format | Video Stories require video generation pipeline — out of scope v1.2 |
| Stories caption | Embed text in image via prompt | Pass caption to API | IG Stories API ignores caption field; text must be in the image |
| IG Stories path | `media_type=STORIES` on existing endpoint | Dedicated Stories-only node set | Same endpoint as FEED — reusing pattern is simpler and consistent |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `caption` parameter on IG Stories | Silently ignored by Meta API | Embed text in image via the generation prompt |
| `message` parameter on FB `/photo_stories` | Not supported | Text must be in the image |
| 1:1 generated image for Stories | Wrong aspect ratio — displayed with black bars or cropped | Generate at `ASPECT_9_16` / `portrait_16_9` / `9:16` natively |
| Midjourney | No official API | Ideogram v3 (default), Flux 2 Pro, Nano Banana Pro |
| `graph.instagram.com` host | v1.1 already uses `graph.facebook.com` for IG endpoints | Keep consistent with existing: `graph.facebook.com/v22.0/` |
| 3-step carousel flow for Stories | Stories are single images only | 2-step single flow with `media_type=STORIES` |
| `sharp` or any image manipulation library | Would add npm dependency just to crop/resize | Generate at correct aspect ratio from the start |

---

## Version Compatibility

| Component | Version | Stories Notes |
|-----------|---------|---------------|
| Meta Graph API | v22.0 (pinned) | `media_type=STORIES` confirmed supported in v22 |
| n8n | 2.14.2 | No new node types — same HTTP Request (typeVersion 4.2) + Wait (typeVersion 1) + IF (typeVersion 1) patterns |
| Ideogram API | v2 Turbo model | `ASPECT_9_16` is a documented enum value |
| FAL.AI Flux | fal-ai/flux-pro/v1.1 | `portrait_16_9` named size or custom `{width,height}` object |
| Nano Banana Pro | fal-ai/nano-banana | `aspect_ratio: "9:16"` string format |
| YCloud WhatsApp | v2 | Vertical images render fine in WA preview — no API changes |
| Azure Blob | Current (SAS 2027-04-10) | Same public URL pattern; Stories images are just 9:16 blobs |
| Node.js | v22.20.0 | No new packages needed |

---

## Brief JSON Changes for v1.2

The Wizard sends this additional field for Stories:

```json
{
  "topic": "...",
  "type": "educational | authority | case_study",
  "angle": "...",
  "platforms": ["instagram", "facebook"],
  "image_model": "ideogram | flux | nanoBanana | custom",
  "fal_model_id": "...",
  "format": "stories",
  "has_own_image": false,
  "image_url": null,
  "has_text_in_image": true,
  "approval_number": "34612345678",
  "publish_at": "now | <ISO_UTC>",
  "timestamp": "2026-04-18T..."
}
```

The only new field is `format: 'stories'`. The `has_text_in_image: true` is already in the schema and should default to true for Stories (since captions are embedded in the image).

---

## Verification Tasks (Phase Plan Should Include)

1. **Test `media_type=STORIES` on IG endpoint** with current token before building full pipeline. A failing test reveals permission gaps early. Expected response: `{ "id": "<container_id>" }`.

2. **Test `/{PAGE_ID}/photo_stories`** with current FB token. Verify exact return shape (`post_id` vs `id`). This endpoint shape may vary slightly from training data.

3. **Test `portrait_16_9`** on Flux 2 Pro — if it returns a 400, switch to `{ "width": 1080, "height": 1920 }` custom object.

4. **Test `aspect_ratio: "9:16"`** on Nano Banana Pro — if it returns a 400, try `"16:9"` (reversed) as some APIs flip convention.

5. **Confirm no new Meta permission prompt** needed — if `/photo_stories` returns OAuthException with permission error, Susana will need to reauthorize with additional scope.

---

## Open Questions

1. **FB `/photo_stories` exact parameter names.** Training knowledge says `url` — but Meta sometimes uses `photo_id` (upload first, then reference). The verification test call in Question 2 resolves this.

2. **FB `/photo_stories` response shape.** Returns `post_id` per training knowledge. Verify during initial test.

3. **`instagram_manage_stories` permission.** Some Meta developer community posts (pre-Aug 2025) mention this scope for reading stories. It may or may not be required for *publishing* Stories. The current token may already have implicit access via `instagram_content_publish`. Only a live test resolves this definitively.

4. **FAL.AI `portrait_16_9` named size for Flux.** Needs a test call to confirm. If unsupported, custom `{width, height}` is the fallback.

5. **Stories permalink availability.** Unlike Feed posts which return a stable permalink, IG Stories permalinks may not be publicly accessible (Stories are ephemeral). The GET `/{STORY_ID}?fields=permalink` may return null or a temporary URL. Success notification should handle null permalink gracefully.

---

## Sources

### High Confidence (training knowledge through Aug 2025, consistent with codebase)
- Meta Graph API Content Publishing Reference — `media_type` parameter for `/{IG_USER_ID}/media` endpoint, Stories support
- Meta Graph API Pages Reference — `/{PAGE_ID}/photo_stories` endpoint
- Existing n8n workflow (`n8n/workflow.json`) — confirmed IG/FB endpoint patterns, typeVersions, body structures
- Ideogram API Reference — `ASPECT_9_16` enum value documented
- v1.1-research/STACK.md — permissions, token type, endpoint patterns (HIGH confidence, verified against official Meta docs during v1.1 research)

### Medium Confidence (training knowledge, requires live verification)
- FAL.AI Flux `portrait_16_9` named size — needs test call
- Nano Banana `aspect_ratio: "9:16"` — inferred from `"1:1"` existing pattern
- FB `/photo_stories` parameter name `url` vs `photo_id` — needs test call
- No new permissions required — inferred from `instagram_content_publish` scope coverage, but requires live verification

### Requires Live Testing
- All 5 verification tasks listed above
- Actual Stories permalink shape (null vs URL)

---

*Stack research for: Propulsar Content Engine v1.2 — Stories Publishing*
*Researched: 2026-04-18*
*Additive: builds on v1.1-research/STACK.md*
