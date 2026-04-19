# Project Research Summary — v1.2 Stories Publishing

**Project:** Propulsar Content Engine — v1.2 Stories Publishing
**Domain:** Instagram + Facebook Page Stories auto-publishing via Meta Graph API
**Researched:** 2026-04-18
**Confidence:** HIGH for integration architecture; MEDIUM for IG Stories API host and FB `photo_stories` flow (require live verification)

---

## Executive Summary

v1.2 Stories Publishing is a **targeted extension** to the existing v1.0/v1.1 pipeline — adding a third format ("Historia") alongside single post and carousel. Nearly all infrastructure is reused: Azure Blob re-hosting, WhatsApp preview, scheduling, error handler, Supabase sessions, Google Sheets log. The new work is: Wizard format selector + 9:16 image generation + IG Story publish chain + FB Page Story publish + Sheets schema extension (`Formato`, `Expires_At`).

The recommended 4-phase build order — Wizard format → n8n image gen for 9:16 → IG Story publish → FB Story publish + Sheets/notifications — matches existing GSD pipeline patterns. Researchers converged on reusing existing infrastructure (routing via chained IF v1 nodes, separate terminal branch for Stories to avoid hashtag comment bug, WA preview reused unchanged).

**Three critical conflicts emerged between researchers** that require live API verification before production build:

1. **IG Stories API host — HIGHEST RISK.** Stack and Features research claimed `graph.facebook.com/{IG_ID}/media?media_type=STORIES` (same endpoint as FEED). Pitfalls agent validated Meta's live content publishing docs (HTTP 200, 2026-04-18) which state *"Reels and stories are not supported"* on that chain and require `graph.instagram.com` host. **Resolution:** plan for `graph.instagram.com` with a live API verification task as the first task in Phase 12. Highest-confidence signal points to Pitfalls being correct (it's the only claim grounded in live docs).

2. **FB Page Story flow.** Stack and Features claimed single-step `POST /{PAGE_ID}/photo_stories?url=X`. Pitfalls inferred 2-step `POST /photos?published=false` → `POST /photo_stories?photo_id=X` by analogy with v1.1 FB carousel. Official `/photo_stories` docs returned 404 for all agents. **Resolution:** Phase 13 must begin with a live API test task that determines the correct flow before building production nodes.

3. **Image model 9:16 compatibility.** All three models claim support, but Pitfalls flagged Flux `portrait_4_3` = 896×1152 (wrong ratio 0.778) and Nano Banana borderline at 1080×1918. **Resolution:** v1.2 ships with Ideogram-only for Stories (`ASPECT_9_16` = 1080×1920 exact). Flux and Nano Banana for Stories deferred until empirically verified in a later milestone.

Secondary risks: Stories don't support caption/text overlays via API (text must be burned into the image by Ideogram), hashtag comments must be completely bypassed for Stories (separate terminal branch), and scheduling cap for Stories is 22h (not 24h) to guarantee ≥2h visibility.

---

## Key Findings

### 1. Integration Architecture (HIGH confidence)

- **Wizard PASO 3** becomes 3-way (single / carousel / story). Adds `format: "story"`, `aspect_ratio: "9:16"`, `num_images: 1`, `story_expires_at` to brief JSON.
- **Wizard PASO 6** adds 22h cap warning for Stories (Story expires 24h after publish; scheduling >22h = <2h visibility).
- **n8n routing** uses chained IF v1 nodes: after `🖼️ ¿Imagen propia?` FALSE → new `🔀 ¿Story?` IF routes to Story image gen or existing Ideogram router. Post-rehost: new `🔀 ¿Formato Story?` IF on FALSE output of existing `🔀 ¿Formato Carrusel?`.
- **Stories branch is a separate terminal path** — MUST NOT share hashtag comment nodes with FEED (Stories don't support comments).
- **WhatsApp preview reused unchanged** (`📤 Enviar preview imagen`). Only `📱 Preparar mensaje WA` modified to add story format line + vertical-image disclaimer.
- **Error handler subgraph (9 nodes) reused unchanged** — Meta error codes (190, 2207026, 100) apply identically. Only wire new Story publish nodes' `onError` outputs into existing Tag IG/FB Error nodes.
- **Sheets log:** 2 new additive columns (`Formato`, `Expires_At`). Existing log nodes get `Formato` only (backward-compat, blanks in old rows). New `📊 Google Sheets Log (Story)` node for Story success path.

### 2. Stories API Mechanics (MEDIUM confidence — requires Phase 12/13 verification)

**IG Stories (highest-risk assumption):**
- Host: `graph.instagram.com` (NOT `graph.facebook.com`) — per Pitfalls live-docs validation
- Container: `POST /v22.0/{IG_ID}/media` with `media_type=STORIES`, no `caption`
- Publish: `POST /v22.0/{IG_ID}/media_publish` with `creation_id`
- Container wait: **45s** (not 30s — matches carousel pattern for safety margin)
- `media_publish` NOT idempotent → `retryOnFail=false`
- Permalink + expiry: `GET /{media-id}?fields=permalink,expires_at`
- Scopes: `instagram_content_publish` + `instagram_basic` (already granted in v1.1)

**FB Page Stories (flow uncertain — Phase 13 live test required):**
- Likely 2-step: `POST /{PAGE_ID}/photos?published=false` → `POST /{PAGE_ID}/photo_stories?photo_id=X`
- Alternative: single-step `POST /{PAGE_ID}/photo_stories?url=X`
- Step 2 NOT idempotent → `retryOnFail=false`
- No stable public URL returned (API returns only `{ success: true }` per Pitfalls inference)
- Scopes: `pages_manage_posts` + `pages_read_engagement` (already granted in v1.1)

**Caption / text behavior (HIGH confidence):**
- Neither platform accepts `caption`/`message` for Stories — parameters silently ignored
- All text must be **burned into the image** by Ideogram/Flux/Nano Banana
- WA preview caption is user-facing review only — NOT sent to Meta
- WA preview must include disclaimer: *"el texto es solo para tu revisión — la Story solo mostrará la imagen"*

**Stories don't support:**
- Comments (hashtag-as-first-comment must be bypassed)
- Link stickers, poll/question/quiz/countdown stickers (API unavailable for all tiers)
- Music, boomerangs, GIFs (API unavailable)
- Scheduling >24h from now (expires immediately — Wizard caps at 22h)

### 3. Image Generation for 9:16 (MEDIUM confidence)

- **Ideogram v3:** `aspect_ratio: "ASPECT_9_16"` → 1080×1920 exact (0.5625 ratio) — **SAFE for v1.2**
- **Flux 2 Pro:** Available `portrait_4_3` = 896×1152 (ratio 0.778, WRONG) — **NOT safe** for Stories without custom `{width:1080,height:1920}` verification
- **Nano Banana Pro:** `"9:16"` produced 1080×1918 (ratio 0.5636) — **borderline**, Δ=0.0011 from target

**v1.2 decision:** Default Stories to **Ideogram only**. Wizard model selector hides Flux and Nano Banana for Stories (or warns "no verificado para Historias"). Flux/Nano Banana Story support deferred to future milestone pending verification.

### 4. Scheduling for Stories (HIGH confidence)

- Story expires 24h after publish. `expires_at` metadata only — auto-expiry on Meta side.
- Wizard cap: 22h for Stories (leaves ≥2h visibility)
- Two-layer enforcement:
  - Wizard PASO 6: `parsePublishTime` rejects >22h for Stories with user-facing warning
  - n8n Code node `🕐 Compute wait_seconds`: reads `format` from session, applies 22h cap
- Session storage: Supabase session save MUST include `format: 'story'` so Code node can read it

### 5. WhatsApp Preview for Vertical Images (MEDIUM confidence)

- YCloud renders 9:16 images in ~4:3 / 1:1 container → black bars or extreme crop possible
- Preview DOES NOT represent full-screen Instagram view
- WA preview message must include disclaimer text: *"(Imagen vertical 9:16 — en Instagram se verá a pantalla completa)"*

### 6. Success Notification + Sheets Log (HIGH confidence)

- WA notification for Stories:
  ```
  ✅ Historia publicada en Instagram y Facebook.
  ⏰ Expira: {publish_time + 24h in CET}
  📸 Instagram: {permalink} (válido 24h)
  📘 Facebook: Historia publicada (sin URL permanente)
  📝 Tema: {topic}
  ```
- Sheets new columns:
  - `Formato`: `single` / `carousel` / `story`
  - `Expires_At`: ISO timestamp (`publish_time + 86400000` or from IG `GET expires_at`)
- IG_URL column for Stories contains ephemeral permalink (dead after 24h) — acceptable since `Expires_At` flags it

---

## Consolidated Feature Landscape

### Table Stakes (v1.2 must ship)

| Feature | Complexity | v1.1 Reuse |
|---------|------------|------------|
| Wizard "Historia" format option (PASO 3) | LOW | Format selector pattern |
| 9:16 image gen (Ideogram `ASPECT_9_16`) | LOW | Existing Ideogram node |
| Story-specific vertical image prompt | LOW | Existing GPT-4o node (branch) |
| IG Story publish (`media_type=STORIES`) | LOW-MED | Azure Blob rehost, container polling, Meta token |
| FB Page Story publish | LOW-MED | Azure Blob rehost, Meta token |
| Skip hashtag comment for Stories | LOW | Separate terminal branch |
| Scheduling >22h warning (Wizard + n8n guard) | LOW | PASO 6, Code node |
| WA preview vertical-image disclaimer | LOW | `📱 Preparar mensaje WA` modified |
| WA success notification with expiry | LOW | Notification node template |
| Sheets log: `Formato` + `Expires_At` columns | LOW | Log nodes |
| Error handling via existing subgraph | LOW | 9-node subgraph unchanged |

### Anti-Features (explicitly excluded from v1.2)

- **Video Stories** — no video generation pipeline; deferred to future milestone
- **Text overlays via API** — `caption` ignored; text lives in image only
- **Link stickers, poll/question stickers, music, boomerangs** — API unavailable for all tiers
- **Story Highlights** — separate `highlight_reels` API; deferred
- **Scheduling >24h for Stories** — expires immediately; capped at 22h
- **Flux / Nano Banana for Stories in v1.2** — aspect ratio not empirically verified; Ideogram-only

---

## Watch Out For (Top 10 Pitfalls)

| # | Pitfall | Phase | Verification |
|---|---------|-------|--------------|
| 1 | Wrong IG API host (`graph.facebook.com`) | 12 | Node URL starts with `graph.instagram.com` |
| 2 | FB Page Story wrong endpoint or flow | 13 | Live test before building production node |
| 3 | Ideogram-only for Stories; Flux/Nano Banana hidden | 10-11 | Wizard excludes non-verified models |
| 4 | `format=story` falls through to FEED path | 12 | `🔀 ¿Formato Story?` wired on FALSE of carousel router |
| 5 | Hashtag comment runs on Story media_id | 12 | Stories branch terminates before hashtag comment nodes |
| 6 | Scheduling >22h for Stories | 10 + 12 | Wizard rejects >22h; Code node reads `format` |
| 7 | Aspect ratio rejection (9:16 must be exact 0.5625) | 11 | Ideogram `ASPECT_9_16` only; image is 1080×1920 |
| 8 | WA preview misleading (9:16 padded in WA) | 11 | Disclaimer text in WA message |
| 9 | IG Story permalink dead in Sheets after 24h | 13 | `Expires_At` column populated |
| 10 | FB Story retry creates orphaned photo | 13 | Step 2 `retryOnFail=false` |

Additional operational pitfalls (5-10 minor):
- 30s Wait too short for Story containers (use 45s)
- Azure Blob URL with SAS params rejected by Meta Story fetcher (add assertion)
- Supabase session missing `format=story` breaks routing (verify in E2E)
- Code node guard no format-awareness (reads `data.format` → 22h cap for Stories)
- WA success notification includes expiring permalink (OK — expiry timestamp clarifies)

---

## Recommended Phase Structure (4 phases)

**Phase 10 — Wizard Historia format selector**
- PASO 3: 3-way format picker
- PASO 5: Ideogram-recommended for Stories; Flux/Nano Banana hidden
- PASO 6: >22h scheduling warning
- Brief JSON: `format`, `aspect_ratio`, `num_images=1`, `story_expires_at`
- Test in isolation: brief routes through existing pipeline (suboptimal output but no crash)
- **Dependencies:** none
- **Risk:** LOW (self-contained in Wizard)

**Phase 11 — n8n image generation for 9:16**
- `🔀 ¿Story?` IF v1 on FALSE of `🖼️ ¿Imagen propia?`
- `🔤 Ideogram v3 — Story` node (`aspect_ratio: ASPECT_9_16`)
- `🔗 Normalizar URL imagen — Story`, `💾 Guardar sesión Supabase (Story)`, `🔗 Re-attach session data (Story)` mirror nodes
- Supabase session includes `format: 'story'`
- WA preview with vertical disclaimer
- **Dependencies:** Phase 10 (brief sets `format=story`)
- **Risk:** LOW (parallel to existing carousel image gen)

**Phase 12 — IG Story publish**
- **Pre-task:** Live API test — verify `graph.instagram.com` host works with `media_type=STORIES`
- `🔀 ¿Formato Story?` IF v1 on FALSE of `🔀 ¿Formato Carrusel?`
- `📤 IG: Create Story Container` (host: `graph.instagram.com`)
- `⏳ Wait 45s (Story container ready)`
- `🚀 IG: Story media_publish` (`retryOnFail=false`)
- `🔗 IG: Get Story Permalink + Expires_At`
- Error handler wiring (`🏷️ Tag IG Error`)
- Code node guard: reads `format` → 22h cap for Stories
- **Dependencies:** Phase 11 (9:16 image in Azure Blob)
- **Risk:** MEDIUM-HIGH (API host assumption pending live test)

**Phase 13 — FB Story publish + Sheets log + notifications**
- **Pre-task:** Live API test — determine FB Story flow (single-step `/photo_stories?url=X` vs 2-step with `published=false`)
- `🌐 FB: Publish Photo Story` (or 2-step) with `retryOnFail=false` on publish step
- Blob URL assertion (reject SAS params)
- `✅ Notify WhatsApp Story` (expiry timestamp; no dead permalinks from FB)
- `📊 Google Sheets Log (Story)` with `Formato` + `Expires_At`
- Existing Sheets log nodes: add `Formato` column (backward-compat)
- **Dependencies:** Phase 12 (IG path proven first)
- **Risk:** MEDIUM (FB Story flow pending live test)

---

## Open Questions (for Phase plans)

1. **IG Stories host:** Does `graph.instagram.com/v22.0/{IG_ID}/media?media_type=STORIES` work with current Meta Page Token? (Phase 12 pre-task)
2. **FB Page Story flow:** Single-step `/photo_stories?url=X` or 2-step with `published=false`? (Phase 13 pre-task)
3. **IG Story permalink:** Does `GET /{media-id}?fields=permalink` return a usable URL during Story lifetime? (Phase 12)
4. **IG Story `expires_at`:** Is the field reliably populated? Fallback to `publish_time + 86400000` if not. (Phase 12)
5. **FB Story URL:** Does `photo_stories` return any usable URL, or only `{success:true}`? (Phase 13)
6. **Ideogram `ASPECT_9_16` output dims:** Exactly 1080×1920? (Phase 11 test)
7. **`instagram_manage_comments` scope:** Doesn't affect Stories (no comments), but should be resolved separately for FEED hashtags to work.

---

## Dependencies on v1.1 Infrastructure

Reused as-is:
- Wizard base flow (PASO 1-7 structure)
- n8n webhook entry, Supabase session store/retrieve
- GPT-4o text generation node
- Azure Blob re-hosting sub-workflow
- WhatsApp preview flow (YCloud) + SI/NO approval wait
- Meta Page Token + IG Account ID + FB Page ID
- Error handler subgraph (9 nodes)
- Scheduling Wait node (65s-22h for Stories)
- Google Sheets log (additive column changes only)

No changes required:
- Existing carousel publishing path
- Existing single-photo publishing path
- Existing hashtag comment nodes (Stories terminal branch never reaches them)
- Error handler logic (Meta error codes apply identically)

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Existing v1.1 integration points | HIGH | Full workflow.json + wizard/run.js codebase analysis |
| n8n routing pattern (chained IFs) | HIGH | Proven by existing carousel routing |
| Wizard modification scope | HIGH | Self-contained in wizard/run.js |
| IG Stories API host | MEDIUM | Live Meta docs point to `graph.instagram.com` but not yet verified with actual API call using our token |
| FB Page Story flow (1-step vs 2-step) | LOW-MED | Official `/photo_stories` docs 404; researchers disagreed |
| Ideogram `ASPECT_9_16` for Stories | MEDIUM | Documented Ideogram v3 enum; not tested with actual Meta Story container |
| Caption silently ignored for Stories | HIGH | Consistently documented across Meta resources |
| 45s Wait node sufficient for Story containers | MEDIUM | Matches v1.1 carousel pattern; not Story-specific tested |
| Hashtag comment bypass via separate branch | HIGH | Clearly correct architecture choice |
| Scheduling 22h cap for Stories | HIGH | Simple math: 24h expiry - 2h visibility minimum |

---

## What NOT to Add (Explicit Exclusions)

- New npm packages in Wizard (no image manipulation libs; just brief JSON)
- New credentials (existing Meta Page Token + Azure + YCloud + Supabase cover everything)
- New services (no new Azure resources, no new APIs beyond Meta `/photo_stories`)
- New image model for Stories (3 existing cover it; Ideogram-only in v1.2)
- Switch v3 or IF v2 nodes (broken in n8n 2.14.2 — use IF v1 only)
- Extended container polling (deferred to future milestone; 45s Wait sufficient)
- IG `publish_at` native parameter (doesn't exist — scheduling via Wait node only)
- FB `scheduled_publish_time` (would create parallel scheduling paths — stick with Wait node)
- Video/Reel support in v1.2 — deferred
- Link stickers — requires `link_sticker` permission review (weeks); deferred
