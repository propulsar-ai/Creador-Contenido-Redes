# Pitfalls Research — v1.2 Stories Publishing

**Project:** Propulsar Content Engine v1.2 Stories Publishing
**Mode:** Pitfalls (Stories-specific + integration gotchas)
**Confidence:** HIGH (Meta live docs + full codebase analysis) / MEDIUM (FB photo_stories specifics — official docs 404)
**Researched:** 2026-04-18

---

## Key Findings

**CRITICAL 1 — Wrong API host for IG Stories.** Meta's official content publishing guide (live, HTTP 200, 2026-04-18) explicitly states *"Reels and stories are not supported"* on `graph.facebook.com`. Instagram Stories require a **different host**: `graph.instagram.com`. Every IG Story node must use this host or receive `(#100) Unsupported media type`. This **contradicts Stack/Features research claims** that said "same endpoint as FEED" — Pitfalls agent validated live docs.

**CRITICAL 2 — Routing silently misroutes `format=story`.** The existing `🔀 ¿Formato Carrusel?` binary IF will route Stories to the FEED single-post path with NO ERROR. A second `🔀 ¿Formato Story?` IF must be inserted on the FALSE output of the carousel router.

**CRITICAL 3 — Hashtag comment on Stories burns API quota.** `💬 IG: Post Hashtag Comment` runs unconditionally after `media_publish`. Stories don't support comments → `(#200) Does not support Comments`. Currently swallowed by `continueErrorOutput`, but wastes quota and contributes to rate limits. Stories branch must terminate BEFORE hashtag comment nodes.

**CRITICAL 4 — Scheduling cap mismatch.** Stories expire 24h post-publish. Wizard's 24h cap means scheduling at 23h = 1h visibility. Max should be **22h for Stories** (guarantees ≥2h visibility). Both `parsePublishTime` (Wizard) and `🕐 Compute wait_seconds` (n8n Code node) need format-aware caps. Session must store `format=story` so Code node can read it.

**CRITICAL 5 — FB Page Story may need 2-step flow (CONFLICT with Stack/Features research).** Pitfalls agent inferred `POST /{PAGE_ID}/photos?published=false` → `POST /{PAGE_ID}/photo_stories?photo_id=X` by analogy with v1.1 FB carousel flow. Stack/Features agents said single-step `POST /photo_stories` with `url` param. Official `photo_stories` docs returned 404 for Pitfalls agent. **This must be verified with a live API test in Phase 13.**

---

## Full Pitfall Catalogue

### CRITICAL Pitfalls

#### Pitfall 1: Wrong API host for IG Stories

- **What goes wrong:** `POST graph.facebook.com/{IG_ID}/media?media_type=STORIES` → `(#100) Unsupported media type` or `(#200) Permissions error`.
- **Why:** v1.1 uses `graph.facebook.com` throughout. Developer assumes only `media_type=STORIES` changes.
- **Source:** Meta content publishing docs (live, 2026-04-18) — *"Reels and stories are not supported"* on the standard chain.
- **How to avoid:** IG Story nodes use `https://graph.instagram.com/v22.0/{IG_ID}/media` and `…/media_publish`. Do not copy-paste existing FEED nodes.
- **Warning signs:** `(#100) Unsupported media type` or `(#200)` from `graph.facebook.com`.
- **Phase:** Phase 12 (IG Story container creation).

#### Pitfall 2: Fixed 30s wait insufficient for Story containers

- **What goes wrong:** Vertical 9:16 re-encode on Meta side can keep `status_code=IN_PROGRESS` beyond 30s → `media_publish` fires → `2207027` ("Media container is not ready").
- **How to avoid:** Use 45s Wait node for Stories (matching carousel pattern). Polling deferred to future milestone.
- **Warning signs:** Error `2207027` on `media_publish` for Stories.
- **Phase:** Phase 12.

#### Pitfall 3: FB Page Story wrong endpoint (copy `/{PAGE_ID}/photos`)

- **What goes wrong:** Using `POST /{PAGE_ID}/photos` (without `published=false`) publishes a FEED photo, not a Story. Image appears letterboxed in Feed; no Story published.
- **How to avoid:** Two-step flow (CONFIRM with live test in Phase 13):
  1. `POST /{PAGE_ID}/photos` with `url={blob_url}` + `"published": false` → `{ id: "<PHOTO_ID>" }`
  2. `POST /{PAGE_ID}/photo_stories` with `photo_id={PHOTO_ID}` → `{ success: true }`
- **Warning signs:** No Story on Page; square/portrait image in Feed; missing `photo_stories` from topology.
- **Phase:** Phase 13 (FB Story publish).

#### Pitfall 4: `photo_stories` not idempotent — orphaned photos on retry

- **What goes wrong:** Step 1 success + step 2 fail → retry step 1 → orphaned unpublished photo. Step 2 retry after success → duplicate Story.
- **How to avoid:** Step 1 `retryOnFail=true` (orphans invisible, deletable via `DELETE /{PHOTO_ID}`). Step 2 `retryOnFail=false`.
- **Warning signs:** Two Stories on Page within 5min; multiple `GET /{PAGE_ID}/photos?published=false` entries.
- **Phase:** Phase 13.

#### Pitfall 5: Story scheduling >22h — Story effectively invisible

- **What goes wrong:** Wizard 24h cap for Stories → schedule at 23h = only 1h visibility. No error.
- **How to avoid:** For `format=story`, apply **22h cap** in `parsePublishTime` + `🕐 Compute wait_seconds`. Wizard warning:
  > Las Historias expiran 24h después de publicarse. Para ≥2h de visibilidad, máximo 22h de anticipación.
- **Phase:** Phase 10 (Wizard) + Phase 12 (Code node guard).

#### Pitfall 6: Aspect ratio rejection — 9:16 must be exact

- **What goes wrong:** Flux `portrait_4_3` = 896×1152 (ratio 0.778 ≠ 0.5625) → rejection. Nano Banana `9:16` observed 1080×1918 (ratio 0.5636, Δ=0.0011) — borderline.
- **How to avoid:** **Default Stories to Ideogram `ASPECT_9_16` only in v1.2.** Ideogram consistently produces 1080×1920 exact. Don't offer Flux or Nano Banana for Stories until empirically verified.
- **Warning signs:** `(#100) Image ratio not supported`; `(#2207001) Image size not supported`; `status_code=ERROR`.
- **Phase:** Phase 11 (image gen for Stories).

#### Pitfall 7: Hashtag comment node runs on Story media_id

- **What goes wrong:** `💬 IG: Post Hashtag Comment` calls `POST /{STORY_MEDIA_ID}/comments` → `(#200) Does not support Comments`. Swallowed by `continueErrorOutput` but wastes quota.
- **How to avoid:** Stories publish chain MUST be a separate terminal branch. Never share hashtag comment nodes with Story path.
- **Phase:** Phase 12 (topology design).

#### Pitfall 8: WA success notification with expiring Story permalink

- **What goes wrong:** `instagram.com/stories/{username}/{media_id}/` works during Story lifetime, 404s after 24h. FB `photo_stories` returns only `{success:true}` — no URL.
- **How to avoid:** Story-specific notification:
  ```
  ✅ Historia publicada en Instagram y Facebook.
  ⏰ Expira: {publish_timestamp + 24h in CET}
  📸 Instagram: {permalink} (válido 24h)
  📘 Facebook: Historia publicada (sin URL permanente)
  📝 Tema: {topic}
  ```
- **Phase:** Phase 13 (Story notification).

---

### MODERATE Pitfalls

#### Pitfall 9: `format=story` falls through to FEED path

- **What goes wrong:** `🔀 ¿Formato Carrusel?` FALSE output routes to single-post FEED. Story publishes as square FEED post.
- **How to avoid:** Add `🔀 ¿Formato Story?` IF v1 on FALSE output. Check `$json.format == 'story'`.
- **Phase:** Phase 12 (routing).

#### Pitfall 10: Azure Blob URL with SAS params rejected

- **What goes wrong:** If `blob_urls[0].url` contains SAS query params (`?sv=&sig=...`), Meta Story container fetcher may fail → `FAILED_DOWNLOAD_IMAGE`. Story containers more sensitive than FEED.
- **How to avoid:** Assertion guard: `if (url.includes('?')) throw new Error('Story URL has query params')`.
- **Phase:** Phase 12 (container creation assertion).

#### Pitfall 11: YCloud WA preview renders 9:16 as padded/cropped

- **What goes wrong:** WhatsApp renders in ~4:3 or 1:1 container. 9:16 image shows with black bars or extreme crop. Preview doesn't represent Instagram full-screen view.
- **How to avoid:** WA disclaimer: *"(Imagen vertical 9:16 — en Instagram se verá a pantalla completa)"*.
- **Phase:** Phase 11 (WA preview for Stories).

#### Pitfall 12: IG Story permalink dead after 24h in Sheets `IG_URL`

- **What goes wrong:** `instagram.com/stories/...` written to Sheets `IG_URL`. Dead after 24h. `Expires_At` column not populated.
- **How to avoid:** Populate `Expires_At = new Date(Date.now() + 86400000).toISOString()`. Consider renaming column to `IG_Story_URL_24h`. Skip `GET permalink` to save one API call.
- **Phase:** Phase 13 (Sheets log).

#### Pitfall 13: Code node guard doesn't know format

- **What goes wrong:** `🕐 Compute wait_seconds` reads `publish_at` only, not `format`. Story scheduled at 23h passes guard (under 24h cap) → Wait node → Story has 1h visibility.
- **How to avoid:** Guard reads `const format = data.format; if (format === 'story' && diffMs > 79200000) { /* error or immediate */ }`. Requires `format` to survive Supabase session.
- **Phase:** Phase 12 (Code node guard).

#### Pitfall 14: Supabase session `format=story` not stored

- **What goes wrong:** If Supabase session save doesn't include `format: 'story'`, retrieved session has `format=null` → `🔀 ¿Formato Story?` FALSE → FEED path.
- **How to avoid:** Supabase session save for Stories includes `format: 'story'` in JSON body (analogous to carousel). Verify post-save in E2E.
- **Phase:** Phase 11 (Supabase session save for Stories).

---

## Technical Debt Patterns

| Shortcut | Benefit | Cost | Acceptable? |
|----------|---------|------|-------------|
| Fixed 45s wait (no polling) | No extra nodes | Fails under heavy Meta load | Yes — polling deferred to future |
| Skip FB Story URL in WA | Simpler message | No FB URL in logs/WA | Yes — API design limitation |
| Ideogram-only for Stories | Avoids AR errors | No model diversity | Yes — verify Flux/NanoBanana dims before enabling |
| Separate Stories terminal branch | Prevents hashtag bug; simpler | More nodes; duplicated common logic | Correct — not a shortcut |
| Sessions never marked consumed | — | Accumulated leaks | Existing debt; no new risk |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| IG Story API host | `graph.facebook.com/{IG_ID}/media?media_type=STORIES` | `graph.instagram.com/v22.0/{IG_ID}/media?media_type=STORIES` |
| FB Page Story | Copy `/{PAGE_ID}/photos` node | 2-step: `/photos?published=false` → `/photo_stories?photo_id=X` |
| Ideogram for 9:16 | Reuse existing `ASPECT_1_1` | Change to `ASPECT_9_16` |
| Flux for 9:16 | Use `portrait_4_3` (wrong ratio) | DO NOT use Flux for Stories in v1.2 |
| n8n routing | Extend `¿Formato Carrusel?` to 3 outputs | Add new `¿Formato Story?` IF v1 on FALSE output |
| WA preview | Send 9:16 without disclaimer | Add vertical format disclaimer |

---

## "Looks Done But Isn't" Checklist

- [ ] IG Story container node URL starts with `graph.instagram.com` (not `graph.facebook.com`)
- [ ] IG Story `media_publish` node: `retryOnFail=false`
- [ ] FB Story step 1 body: `"published": false`
- [ ] FB Story step 2 URL ends in `/photo_stories` (not `/photos`)
- [ ] FB Story step 2: `retryOnFail=false`
- [ ] Story Wait node amount = 45 (not 30)
- [ ] Hashtag comment nodes NOT in Stories execution path
- [ ] `🔀 ¿Formato Story?` wired on FALSE output of `🔀 ¿Formato Carrusel?`
- [ ] Wizard scheduling cap = 22h for Stories, not 24h
- [ ] Ideogram body: `"aspect_ratio": "ASPECT_9_16"`
- [ ] Supabase session save: `"format": "story"` in JSON body
- [ ] Code node guard reads `format` and applies 22h cap
- [ ] WA success: no Story permalink URL; includes expiry timestamp
- [ ] Sheets log `Expires_At` populated for Stories rows

---

## Pitfall-to-Phase Mapping

| Pitfall | Phase | Verification |
|---------|-------|--------------|
| 1. Wrong IG API host | 12 | Node URL starts with `graph.instagram.com` |
| 2. 30s wait insufficient | 12 | Wait node amount=45 |
| 3. FB Story wrong endpoint | 13 | Step 2 URL ends `/photo_stories` |
| 4. `photo_stories` not idempotent | 13 | `retryOnFail=false` on step 2 |
| 5. Scheduling >22h for Stories | 10 + 12 | Wizard rejects >22h; Code node checks `format=story` |
| 6. Aspect ratio rejection | 11 | `aspect_ratio=ASPECT_9_16` in Ideogram body |
| 7. Hashtag comment on Stories | 12 | Comment nodes not in Stories path |
| 8. Expiring permalink in WA | 13 | WA message has expiry, no `instagram.com/stories/...` |
| 9. Format falls through to FEED | 12 | `¿Formato Story?` wired |
| 10. SAS params in blob URL | 12 | Assertion rejects `?` in URL |
| 11. WA preview misleading | 11 | Disclaimer in WA message |
| 12. Dead permalink in Sheets | 13 | `Expires_At` column populated |
| 13. Code node guard no format awareness | 12 | Guard reads `data.format` |
| 14. Supabase session missing format | 11 | `format: 'story'` in session save body |

---

## Sources

- Meta official content publishing guide (developers.facebook.com/docs/instagram-api/guides/content-publishing, HTTP 200, 2026-04-18): *"Reels and stories are not supported"* — HIGH
- v1.1 n8n/workflow.json full read (73 nodes) — HIGH
- v1.1 PROJECT.md decisions — HIGH
- FB Page Story 2-step flow: inferred from v1.1 FB carousel child container pattern — MEDIUM (official `photo_stories` docs 404 during research)
- Ideogram `ASPECT_9_16`: from existing carousel workflow + Ideogram v3 docs — MEDIUM
- Flux AR limitations: math inference (896×1152=0.778 ≠ 0.5625) — MEDIUM

---

## Open Conflicts for Synthesizer

1. **IG Stories host:** Stack/Features say `graph.facebook.com` (same as FEED). Pitfalls says `graph.instagram.com` per live Meta docs 2026-04-18. **Pitfalls is likely correct** — requires Phase 12 live test to confirm before production.

2. **FB Stories flow:** Stack/Features say single-step `POST /photo_stories?url=X`. Pitfalls says 2-step `POST /photos?published=false` → `POST /photo_stories?photo_id=X`. Official docs 404 for both agents. **Requires live test in Phase 13 planning.**
