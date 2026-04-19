# Architecture Research — v1.2 Stories Publishing

**Project:** Propulsar Content Engine v1.2 Stories Publishing
**Mode:** Architecture — Integration into existing 73-node workflow
**Confidence:** HIGH (codebase analysis) / MEDIUM (Meta API Stories specifics)
**Researched:** 2026-04-18

---

## Key Findings

1. **3-way format selector in Wizard is a clean additive change.** Replace `isCarousel = fmtChoice === "2"` with separate `isCarousel` + `isStory` booleans. The brief needs: `format: "story"`, `aspect_ratio: "9:16"`, `num_images: 1`. No new brief fields beyond these.

2. **Image generation needs 3 NEW story-specific nodes (not conditional patches).** The existing image gen nodes have hardcoded `image_size: "square_hd"` / `ASPECT_1_1` / `"1:1"`. Given IF v1 limitations (binary routing, no expression switching inside node params), the cleanest solution is 3 new parallel nodes with portrait params, preceded by a new `🔀 ¿Story?` IF node.

3. **Publish routing pattern: two chained IFs, not a switch.** After `🔗 Merge Rehost Output`, the existing `🔀 ¿Formato Carrusel?` (FALSE branch) feeds a new `🔀 ¿Formato Story?` IF node. TRUE → story publish chain. FALSE → existing single-post IG/FB chain. This mirrors exactly how carousel routing was added.

4. **WhatsApp preview reuses `📤 Enviar preview imagen` unchanged.** YCloud renders vertical images natively. Only `📱 Preparar mensaje WA` needs a story-format line added.

5. **Scheduling expiry warning lives entirely in Wizard PASO 6, not in n8n.** After `publish_at` is set and `isStory === true`, compute `visibilityHours`. Block with confirmation at `< 4h` visibility; informational only at `< 8h`. Pass `story_expires_at` ISO timestamp in brief so n8n logs it in Sheets without computation.

6. **Existing 9-node error subgraph handles story errors without modification.** Only wire the 4 new story publish nodes' error outputs into existing `🏷️ Tag IG Error` / `🏷️ Tag FB Error` nodes.

7. **Sheets log: add 2 additive columns — `Formato` and `Expires_At`.** Existing log nodes get `Formato` only (backward-compat, blanks in old rows). New `📊 Google Sheets Log (Story)` node handles story success path with both columns.

8. **FB Stories use a DIFFERENT endpoint: `/{page-id}/photo_stories`.** NOT the same as `/{page-id}/photos`. The field name (`url` vs `image_url`) must be verified with a live test before building Phase 4. Highest-risk verification point.

---

## Wizard Changes (wizard/run.js)

**PASO 3 — Format Selector (3-way):**
```
1) Post Individual — una sola imagen
2) Carrusel — múltiples slides
3) Historia — Story vertical 9:16 (expira 24h)
```

Replace:
```js
const isCarousel = fmtChoice === "2";
```
With:
```js
const isCarousel = fmtChoice === "2";
const isStory = fmtChoice === "3";
```

**PASO 5 — Image Model Advice (Story branch):**
- Recommend Flux 2 Pro for fotorealismo vertical
- Ideogram v3 sigue recomendado si texto en imagen
- Skip "has_text_in_image" question si Story (texto solo en imagen — caption Meta ignora)

**PASO 6 — Scheduling Expiry Warning:**
```js
if (isStory && scheduledAt) {
  const visibilityHours = 24 - ((scheduledAt - Date.now()) / 3600000);
  if (visibilityHours < 4) {
    // BLOCK — confirm
  } else if (visibilityHours < 8) {
    // WARN — informational only
  }
}
```

**Brief JSON new fields:**
```json
{
  "format": "story",
  "aspect_ratio": "9:16",
  "num_images": 1,
  "story_expires_at": "2026-04-19T12:00:00.000Z"
}
```

---

## n8n Integration Points (exact node names)

### Entry routing (image generation)

- **MODIFY none in existing path** — story routing inserts downstream
- **NEW `🔀 ¿Story?`** (story-check, IF v1) — inserts AFTER `🖼️ ¿Imagen propia?` FALSE output, BEFORE existing `🎨 ¿Ideogram?` router

### Image generation (all NEW)

- `⚡ Flux 2 Pro — Story` (flux-generate-story) — identical to flux-generate except `image_size: {"width":1080,"height":1920}`
- `🔤 Ideogram v3 — Story` (ideogram-generate-story) — identical to ideogram-generate except `aspect_ratio: "ASPECT_9_16"`
- `🍌 Nano Banana Pro — Story` (nano-banana-generate-story) — identical to nano-banana-generate except `aspect_ratio: "9:16"`
- `🔗 Normalizar URL imagen — Story` (normalize-image-story) — copy of normalize-image
- `💾 Guardar sesión Supabase (Story)` (save-session-story) — mirrors save-session-supabase
- `🔗 Re-attach session data (Story)` (reattach-session-story) — mirrors reattach-session-data

### WhatsApp preview

- **REUSE** `📤 Enviar preview imagen` (send-single-image) unchanged
- **MODIFY** `📱 Preparar mensaje WA` (prepare-whatsapp) — add story-format line: `📖 Story (9:16 — expira 24h)`

### Post-rehost publish routing (NEW)

- `🔀 ¿Formato Story?` (story-format-branch, IF v1) — after `🔀 ¿Formato Carrusel?` FALSE output

### IG Story publish (all NEW)

- `📤 IG: Create Story Container` (ig-create-story-container) — POST /media with `media_type=STORIES`, NO caption field
- `⏳ Wait 30s (Story container ready)` (wait-story-container) — fixed 30s wait
- `🚀 IG: Story media_publish` (ig-story-media-publish) — `retryOnFail=false` (not idempotent)
- `🔗 IG: Get Story Permalink` (ig-get-story-permalink) — GET `/media_id?fields=permalink,expires_at`

### FB Story publish (NEW)

- `🌐 FB: Publish Photo Story` (fb-publish-photo-story) — POST `/{page-id}/photo_stories`, `retryOnFail=false`

### Post-publish (NEW)

- `✅ Notify WhatsApp Story` (notify-wa-story) — text includes "expira en 24h" + permalink
- `📊 Google Sheets Log (Story)` (log-sheets-story) — schema with `Formato` + `Expires_At`

### Existing nodes MODIFIED

- `📱 Preparar mensaje WA` — add story format line
- `📊 Google Sheets Log` — add `Formato` column (value: "single")
- `📊 Google Sheets Log (Carousel)` — add `Formato` column (value: "carousel")
- `📊 Sheets Fail Log` — add `Formato` column

### Nodes REUSED as-is

`📤 Enviar preview imagen`, `📤 Enviar WhatsApp`, `📨 Webhook — Reply WA`, `✅ ¿Aprobado?`, `🔍 Recuperar sesión Supabase`, `🔧 Prep Re-host Input`, `🔁 Re-host Images`, `🔗 Merge Rehost Output`, `🔀 ¿Formato Carrusel?`, all 9 error handler nodes, `🧹 Extract Blob Names`, `🗑️ Delete Azure Blob`, all 3 scheduling nodes.

---

## Data Flow (v1.2 additions)

```
Webhook Receive
  → Supabase Session Store
  → GPT-4o Text
  → 🖼️ ¿Imagen propia? (existing IF v1)
      TRUE → custom URL path (existing, unchanged)
      FALSE → 🔀 ¿Story? (NEW IF v1)
          TRUE → Story image gen (3 NEW nodes, 9:16 AR) → normalize-story → save-session-story → reattach-story → preview WA (reused)
          FALSE → existing 🎨 ¿Ideogram? router (single or carousel image gen, 1:1)

... [SI approval] ...

🔗 Merge Rehost Output
  → 🔀 ¿Formato Carrusel? (existing IF v1)
      TRUE → carousel publish (existing)
      FALSE → 🔀 ¿Formato Story? (NEW IF v1)
          TRUE → IG Story container → wait 30s → IG media_publish → get permalink + expires_at
                → FB photo_stories → Notify WA Story → Sheets Log (Story)
          FALSE → existing single-post IG/FB chain
```

---

## Error Handler Integration

**No changes to 9-node error subgraph.** Wire the 4 new story publish nodes' onError outputs into existing `🏷️ Tag IG Error` / `🏷️ Tag FB Error` nodes:

- `📤 IG: Create Story Container` → onError → Tag IG Error
- `🚀 IG: Story media_publish` → onError → Tag IG Error
- `🌐 FB: Publish Photo Story` → onError → Tag FB Error

Meta error codes (190 = token expired, 2207026 = invalid image, 100 = invalid parameter) apply identically to Stories. No new handler logic needed.

---

## Build Order (4 phases)

### Phase 10 — Wizard Historia format

**Deliverable:** Wizard PASO 3 offers 3 formats; brief includes `format:"story"`, `aspect_ratio:"9:16"`, `num_images:1`, `story_expires_at`. PASO 5 advises for Story. PASO 6 warns if <22h visibility.

**Test in isolation:** Brief with `format:"story"` routes to existing single-post path in n8n (not ideal output, but no crash). Exposes the need for Phase 11.

**Dependencies:** None.

### Phase 11 — n8n Story image generation (9:16)

**Deliverable:** `🔀 ¿Story?` IF + 3 new story image gen nodes + normalize/Supabase/reattach mirrors. Connects into existing WhatsApp preview path.

**Pre-task:** Verify FAL Flux portrait param (`{width:1080,height:1920}` vs named string) and Ideogram `ASPECT_9_16` enum with live calls before wiring production.

**Dependencies:** Phase 10 (brief must set `aspect_ratio`).

### Phase 12 — IG Story publish

**Deliverable:** `🔀 ¿Formato Story?` post-rehost + 4 IG Story nodes + error wiring. Story publishes to IG after SI approval.

**Verification:** `fields=permalink,expires_at` returns usable values for Stories.

**Dependencies:** Phase 11 (image must be 9:16 in Azure Blob).

### Phase 13 — FB Story + Sheets log + WA notification

**Deliverable:** `/{page-id}/photo_stories` endpoint wired, WA Story success notification, Sheets log with `Formato` + `Expires_At` columns.

**Pre-task:** Live test to confirm `photo_stories` field name (`url` vs `image_url`) BEFORE building production node.

**Dependencies:** Phase 12 (IG Story path must work first).

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Existing workflow integration points | HIGH | Full workflow.json analysis — all 73 nodes read |
| Wizard modification points | HIGH | Full wizard/run.js analysis |
| n8n routing pattern (chained IFs) | HIGH | Proven by existing carousel routing |
| IG Stories API (`media_type=STORIES`) | MEDIUM | Documented; verify endpoint during Phase 12 |
| FB Stories API (`/{page-id}/photo_stories`) | MEDIUM | HIGHEST risk — verify field name in live test before Phase 13 |
| FAL portrait image size params | MEDIUM | Verify named size vs width/height in Phase 11 |
| Ideogram `ASPECT_9_16` enum | MEDIUM | Verify against Ideogram v3 API docs in Phase 11 |
| Error subgraph compatibility | HIGH | Verified by code analysis — no new error codes needed |

---

## Open Questions

1. Does `/{ig-user-id}/media?fields=permalink` return a valid shareable URL for Stories, or a placeholder? Confirm during Phase 12.
2. Exact FAL Flux param for 9:16 — named size string or `{width:1080,height:1920}` object? Check FAL docs at `fal.ai/models/fal-ai/flux-pro` during Phase 11.
3. Exact field name for FB `photo_stories` POST — `url` or `image_url`? Budget for live API test in Phase 13 planning.
4. `instagram_manage_comments` gap does NOT affect Story path (Stories don't support comments anyway) — hashtag skip is trivially implemented by bypassing the comment node.
