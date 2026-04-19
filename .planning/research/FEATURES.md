# Features Research — v1.2 Stories Publishing

**Project:** Propulsar Content Engine v1.2 Stories Publishing
**Mode:** Ecosystem — Feature landscape for Instagram + Facebook Page Stories auto-publishing
**Confidence:** HIGH for IG Stories API mechanics; MEDIUM for FB Page Stories endpoint; LOW for sticker permission APIs
**Researched:** 2026-04-18

---

## Key Findings

1. **IG Stories use the SAME 2-step endpoint as feed posts — with one extra param.**
   `POST /{ig-user-id}/media` with `image_url` + `media_type=STORIES`, then `POST /{ig-user-id}/media_publish` with `creation_id`. Container readiness polling (`status_code=FINISHED`) applies identically. Same credentials, same scopes — `instagram_content_publish` already covers Stories.

2. **FB Page Stories use a DIFFERENT endpoint: `/{page-id}/photo_stories`.**
   Single `POST` with `url` param. No container polling needed — synchronous. Same Page Token + `pages_manage_posts` scope already granted in v1.1.

3. **Neither platform accepts a caption in the API for Stories — the API silently ignores it.**
   `caption` is not a valid param for `media_type=STORIES` on IG. `photo_stories` doesn't accept `message`. The only text visible in a published Story is text **burned into the image** by Ideogram/Flux/Nano Banana. The WhatsApp preview caption is user-facing only and is NOT sent to Meta.

4. **Critical new constraint: image must be 9:16 (1080x1920) instead of 1:1 (1080x1080).**
   All three image models support this: Ideogram v3 → `aspect_ratio: "ASPECT_9_16"`, Flux 2 Pro → `image_size: "portrait_16_9"`, Nano Banana Pro → `image_size: { width: 1080, height: 1920 }`. No new models needed — just AR parameter change + updated image prompt for vertical composition.

5. **Hashtag comments FAIL for Story media — skip step is required, not optional.**
   `POST /{media-id}/comments` returns a Meta API error when `media-id` is a Story. The existing first-comment hashtag node (v1.1) must be bypassed via an IF node on `format === "story"`.

6. **Stories expire 24h after publish.** IG returns `expires_at` via `GET /{media-id}?fields=expires_at`. This should be logged in Sheets (`Expires_At` column). For FB Stories, the API field is less reliably documented — approximate as publish_time + 86400s.

7. **Link sticker, poll/question stickers, hashtag stickers, mention stickers, music — ALL are Creator Studio / mobile app only.** Not available via any Graph API permission tier for programmatic publishing.

8. **No new credentials needed.** Existing Meta Page Token covers both IG Stories and FB Page Stories.

---

## Feature Landscape

### Table Stakes (must-have for v1.2 to ship)

| Feature | Why Expected | Complexity | v1.1 Dependency | Notes |
|---------|--------------|------------|-----------------|-------|
| Wizard "Historia" format option (PASO 3) | Single/carousel already exists; Story is the natural 3rd format | LOW | v1.1 Wizard format selector | Adds `format: "story"` to brief JSON; gates all Story-specific behavior |
| 9:16 image generation (AR param change) | Square image in a Story frame = letterboxed, looks broken | LOW | v1.1 Ideogram/Flux/Nano Banana image gen nodes | AR param change only; no new models. Ideogram: `ASPECT_9_16`, Flux: `portrait_16_9`, Nano Banana: `{width:1080,height:1920}` |
| Story-specific vertical image prompt | Vertical composition differs from 1:1; text must be in upper 70% (avoid IG UI overlay zone at bottom ~250px) | LOW | v1.1 GPT-4o text gen node | Prompt branch in n8n for Story format. Not a new node — conditional prompt logic |
| IG Story publish (`media_type=STORIES`) | Core v1.2 deliverable | LOW | v1.1 Azure Blob re-hosting, v1.1 container polling loop, v1.1 Meta token + IG Account ID | Same 2-step flow as feed. Container polling unchanged |
| FB Page Story publish (`photo_stories` endpoint) | Platform parity | LOW | v1.1 Azure Blob re-hosting, v1.1 Meta token + FB Page ID | Different endpoint from FB feed. Synchronous — no polling loop |
| Skip hashtag comment for Stories | `POST /{media-id}/comments` returns Meta error for Story media | LOW | v1.1 first-comment hashtag node | IF node on `format` field bypasses hashtag step for Stories |
| Scheduling > 22h warning | Story published at T expires at T+24h; > 22h scheduled = < 2h useful life | LOW | v1.1 Wizard PASO 6 scheduling | Warning only (not a hard block). Confirm before proceeding |
| WA preview clarification note | Felix will be confused if he approves text that doesn't appear in the Story | LOW | v1.1 WhatsApp preview message template | One-line note: "el texto es solo para tu revisión — la Story solo mostrará la imagen" |
| WA success notification (Story context) | User needs to know Story is live and when it expires | LOW | v1.1 WhatsApp success notification template | Add "expira en 24h" to message copy. No structural change |
| Sheets log `Format` + `Expires_At` columns | Audit trail must capture Story-specific metadata | LOW | v1.1 Google Sheets log node | `Format` column: `post`/`carousel`/`story`. `Expires_At`: computed publish_time + 86400s (or from IG API) |
| Error handling via existing subgraph | Story errors route to same Meta error handler | LOW | v1.1 error handler subgraph | No changes needed — same Meta error codes (190=token expired, 2207026=invalid image) apply |

### Differentiators (low-cost wins worth including in v1.2)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `expires_at` pulled from IG API (not computed) | Precise expiry timestamp in Sheets; more reliable than publish_time + 86400 | LOW | `GET /{ig-media-id}?fields=expires_at` immediately after `media_publish`. One extra API call. Fallback to computed value if call fails |
| Brand-safe vertical frame guidance in prompt | Propulsar's dark background + purple gradient brand works for Stories but needs explicit vertical composition instructions — composition, CTA placement, logo positioning differ from 1:1 | LOW | Prompt engineering in existing GPT-4o Story branch. No new API calls |
| "No caption on Story" note in WA preview | Prevents post-publish confusion when Felix doesn't see the text on the live Story | LOW | Copy change in WA preview template |
| Ideogram v3 as default model for Stories | Text legibility is the primary concern for educational/authority Stories; Ideogram v3's 90-95% text accuracy remains strongest | LOW | Same default as carousels. No code change — model selection is already user-driven in Wizard. Add "recommended for Stories" hint |

### Anti-Features (explicitly excluded from v1.2 — document with reasons)

| Feature | Why Requested | Why Excluded | Correct Alternative |
|---------|---------------|--------------|---------------------|
| Video Stories | "Stories are mostly video" | No video generation pipeline. Ideogram/Flux/Nano Banana produce static images only | Static image Stories for v1.2. Video Stories as separate v1.3 milestone |
| Caption / text overlay on published Story | "Add the AI caption as text on the Story" | `caption` param silently ignored for `media_type=STORIES`. Text stickers via API unavailable | Text burned into image by Ideogram/Flux. Prompt engineering ensures readable vertical composition |
| Hashtag stickers in Stories | "Do hashtags help Story reach?" | Hashtag text stickers are Creator Studio / mobile only — not in Graph API | Keep first-comment hashtags on feed posts (v1.1). Skip entirely for Stories |
| Poll / Question / Quiz / Countdown stickers | "Interactive Stories get more engagement" | Not available via any Graph API permission level. Consumer UX only | Cannot be built. Defer indefinitely |
| Link sticker | "Add a link to our website in the Story" | Requires `link_sticker` permission — non-default, Meta Policy review (weeks). Our current token does not have it | Note as future feature (v1.3+) after permission granted |
| Music sticker | "Stories with music get more reach" | Completely unavailable via API. Not applicable for B2B agency | Not applicable |
| Story Highlights (save to collection) | "Make Stories evergreen via Highlights" | Separate `POST /{ig-user-id}/highlight_reels` API. Different UX concern | Defer to v1.3+ as "Story Highlights Manager" |
| Scheduling Stories > 24h | "I want to schedule a Story for next week" | Stories expire 24h after publish. Scheduled > 24h = expires immediately. v1.1 max 24h Wait node already prevents | Max 22h effective window (leaves 2h+ life). Wizard > 22h warning covers this |
| Boomerang / GIF Stories | Consumer UX only — no API equivalent | Cannot be built. Image generation is static | Static image only |
| Separate Story-specific image model | "Stories need a different look" | All three models support 9:16. Adding a 4th creates complexity without value | Use Ideogram v3 (default) with `ASPECT_9_16` + vertical composition prompt |

---

## Feature Dependencies

```
Wizard "Historia" format selector
    └── sets format=story in brief JSON
           ├── required-by: 9:16 AR image generation
           ├── required-by: Story vertical image prompt (GPT-4o branch)
           ├── required-by: IG Story publish (media_type=STORIES)
           ├── required-by: FB Page Story publish (photo_stories)
           ├── required-by: Skip hashtag step (IF format=story)
           ├── required-by: > 22h scheduling warning in Wizard
           └── required-by: Sheets log Format=story + Expires_At

9:16 AR image generation
    └── uses: v1.1 Ideogram/Flux/Nano Banana nodes (AR param only)
    └── required-by: Azure Blob re-hosting (v1.1, unchanged)

Azure Blob re-hosting (v1.1 — unchanged)
    ├── required-by: IG Story publish
    └── required-by: FB Page Story publish

IG Story publish
    ├── uses: v1.1 container polling (status_code=FINISHED, unchanged)
    ├── uses: v1.1 Meta Page Token + IG Account ID
    └── returns media_id
           ├── feeds: GET expires_at from IG media API
           ├── feeds: Sheets Expires_At column
           └── feeds: WA success notification (Story context)

FB Page Story publish
    ├── uses: v1.1 Meta Page Token + FB Page ID
    └── returns post_id → Sheets FB Story URL

v1.1 error handler subgraph (unchanged)
    ├── handles: IG Story publish errors
    └── handles: FB Page Story publish errors

v1.1 scheduling Wait node (unchanged)
    └── gates: IG + FB Story publish (same as feed post)
    └── enhanced-by: > 22h Story warning in Wizard (Wizard only, no n8n change)
```

---

## API Mechanics Summary

**IG Stories API:**
- Container: `POST /{ig-user-id}/media` → `image_url`, `media_type=STORIES`
- Publish: `POST /{ig-user-id}/media_publish` → `creation_id`
- Poll: `GET /{container-id}?fields=status_code` — same as feed
- Expires: `GET /{media-id}?fields=expires_at` — ISO timestamp, 24h after publish
- `caption` param: silently ignored — do NOT include
- Scopes: `instagram_basic`, `instagram_content_publish` (already granted in v1.1)
- Rate limit: counts toward 100 posts/24h (same pool as feed)

**FB Page Stories API:**
- Publish: `POST /{page-id}/photo_stories` → `url` (permanent public URL)
- Response: immediate `post_id` — no container polling
- No `caption`/`message` param accepted
- Scopes: `pages_manage_posts`, `pages_read_engagement` (already granted in v1.1)
- Expiry: 24h — API field less reliably documented; approximate as publish_time + 86400

**New brief JSON fields:**
```json
{
  "format": "story",
  "image_aspect_ratio": "9:16",
  "story_caption_preview": "texto para WA — NO se envía a Meta"
}
```

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| IG Stories publishing path | HIGH | Well-documented; same endpoint family as v1.1 feed; verified in prior v1.1 research |
| `media_type=STORIES` container behavior | HIGH | Documented parameter value; container polling confirmed for all media types |
| No caption support for Stories | HIGH | Consistently documented; `caption` not in STORIES parameter list |
| FB `photo_stories` endpoint | MEDIUM | Endpoint confirmed in official FB Pages API docs; less community validation |
| FB Stories synchronous (no polling) | MEDIUM | Consistent with FB Photos API behavior; not explicitly documented as "synchronous" |
| `expires_at` field from IG media API | MEDIUM | Documented field on IG media objects; application to Stories not explicitly tested |
| Link sticker `link_sticker` permission | LOW | Permission name from Meta developer resources; review process timing unverified |
| Stickers (poll, question, hashtag) — API unavailability | HIGH | Consistent across all Meta API docs; no Graph API path exists |

---

## Roadmap Implications

v1.2 can be built in fewer phases than v1.1 because nearly all infrastructure already exists:

1. **Wizard changes** — Add "Historia" format in PASO 3; 9:16 AR in brief JSON; > 22h scheduling warning; WA preview note. Low complexity; self-contained in `wizard/run.js`.

2. **n8n image generation branch** — Add Story format routing: pass 9:16 AR param to each image model. Add Story-specific image prompt branch in GPT-4o node. Moderate complexity (branching logic in existing nodes).

3. **n8n Story publishing nodes** — IG: add `media_type=STORIES` to container creation; FB: new `photo_stories` HTTP Request node. Both LOW complexity — polling, error handler, WA notifications, Sheets log fully reused.

4. **n8n Story routing** — Skip hashtag comment for Stories (IF node on `format`). `Expires_At` column in Sheets. WA success message copy change.

**Suggested phase structure (3 phases):**
- Phase 10: Wizard Historia format + image brief changes (Wizard side)
- Phase 11: n8n Story image generation (9:16 AR + vertical prompt branch)
- Phase 12: n8n IG Story publish + FB Page Story publish + skip hashtag + Sheets log update

No new credentials, no new services, no new n8n node types needed.

---

## Open Questions

1. **FB `photo_stories` — single step vs two steps?** Some integration guides show 2-step upload-then-publish. Others show single-step with `url`. Given IG Stories work synchronously with `media_type=STORIES`, single-step FB is likely correct. Recommend writing node as single-step first and testing in Phase 12.

2. **`expires_at` field reliability for FB Stories.** If API doesn't return consistently, compute as publish_time + 86400. Phase 12 plan should include test for this field.

3. **Container polling timeout for STORIES containers.** v1.1 uses 5 × 30s (2.5 min max). IG Stories may process faster than carousels. No evidence it differs — use same config and validate in E2E.

4. **`instagram_manage_comments` scope gap (known from v1.1).** The hashtag comment skip for Stories is already planned. Does NOT affect v1.2 Story publishing, but scope gap should be resolved separately for feed post hashtags.
