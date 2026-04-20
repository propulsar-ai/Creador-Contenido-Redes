# Phase 11: Story Image Generation — Research

**Researched:** 2026-04-20
**Domain:** n8n workflow extension — Story-specific image generation branch + Supabase session persistence + WA preview disclaimer
**Confidence:** HIGH (n8n patterns + existing workflow + Ideogram node shape); MEDIUM (Ideogram v3 true endpoint — existing node uses the v2 endpoint labeled "v3"); HIGH (Supabase JSONB session — backward-compatible additive write)

---

## User Constraints

No `CONTEXT.md` exists for Phase 11 (user did not run `/gsd:discuss-phase`). Per orchestrator input, all areas are **Claude's Discretion** unless pinned by Success Criteria in ROADMAP.md / REQUIREMENTS.md or by Phase 10's downstream contract locked in STATE.md.

### Locked by Requirements + STATE.md (NOT negotiable)

- **IMGEN-01**: A new `🔀 ¿Story?` IF v1 node must be inserted on the **FALSE output** of `🖼️ ¿Imagen propia?` (node id `check-own-image`).
- **IMGEN-02**: A new `🔤 Ideogram v3 — Story` HTTP Request node must call Ideogram with `aspect_ratio: "ASPECT_9_16"` (produces 1080×1920 per REQUIREMENTS.md target).
- **IMGEN-03**: Supabase session save for Stories must persist `format: "story"` so downstream SCHED-02 (Phase 12) and routing guards can read it.
- **IMGEN-04**: WhatsApp preview **reuses** the existing preview node — no new preview node. The existing text message (composed in `📱 Preparar mensaje WA`) gains a Story disclaimer when `format=story`.
- **NOTIF-02**: Disclaimer text must explain (a) 9:16 vertical may appear cropped in WA but displays full-screen in Instagram, (b) caption text is user-facing review only — NOT sent to Meta.
- **IF v1 only**: IF v2 and Switch v3 are broken in n8n 2.14.2 (STATE.md v1.1 note).
- **Ideogram-only for Stories**: Flux / Nano Banana 9:16 not empirically verified → hidden in Wizard → never arrives at Phase 11 (SUMMARY.md research finding #3).
- **Separate terminal branch**: The Story image branch must NOT touch the existing Post (`🎨 ¿Ideogram?` router) or Carousel (pre-fan-out) paths. All three paths (Post, Carousel, Story) converge at `📱 Preparar mensaje WA`.
- **Stories have num_images=1**: No fan-out / SplitInBatches needed. Single item through the branch.
- **Phase 10 downstream contract** — briefs arriving with `format=story` guarantee: `aspect_ratio="9:16"`, `num_images=1`, `story_expires_at` (ISO UTC with Z), `image_model="ideogram"` unless `has_own_image=true` with a validated 9:16 URL.

### Claude's Discretion

- Exact n8n node placement coordinates and whether Story branch mirrors the single-post normalize+save chain or the carousel save chain (recommendation below).
- Whether Supabase save is a brand-new `💾 Guardar sesión Supabase (Story)` node (parallel to the existing `save-session-supabase` + `save-session-carousel`) or the existing single-post save is extended to also handle Stories (recommendation: new node — matches carousel precedent).
- Exact Spanish disclaimer wording for the WA preview (recommendation below).
- Whether the `📱 Preparar mensaje WA` Code node gains Story branches inline or whether a new Story-specific preview Code node is added (recommendation: inline — same node already handles single vs carousel).
- Test strategy: Phase 12 / 13 do not exist yet. The Story branch must reach `📱 Preparar mensaje WA` but downstream SI-approval path assumes format=single or carousel. Recommendation below.

### Out of Scope (deferred to Phases 12 / 13 or v2)

- IG Story publishing (Phase 12 — IGSTORY-02 resolves `graph.instagram.com` vs `graph.facebook.com` host via live test).
- FB Story publishing (Phase 13 — FBSTORY-01 resolves single-step vs 2-step flow).
- 22h scheduling guard enforced in n8n (`SCHED-02` — Phase 12, reads `format` from Supabase session).
- Sheets log `Formato` column (Phase 13, LOG-01).
- Story success WhatsApp notification with expiry (Phase 13, NOTIF-01).

---

## Summary

Phase 11 is a **pure n8n workflow extension** — no Wizard changes, no code outside `n8n/workflow.json`, no new npm packages, no new env vars, no Supabase schema change (JSONB write is additive). Five new nodes get added; three existing nodes are extended with one new connection each.

The branch is short and mirrors the single-post chain almost verbatim: `🔀 ¿Story?` IF → `🔤 Ideogram v3 — Story` HTTP Request → `🔗 Normalizar URL imagen — Story` Code → `💾 Guardar sesión Supabase (Story)` HTTP Request → `🔗 Re-attach session data (Story)` Set → `📤 Enviar preview imagen` (existing node, new connection). The existing `📱 Preparar mensaje WA` Code node is extended to detect `format === 'story'` and append the disclaimer text. Nothing in the Post or Carousel paths is touched — regression risk is limited to the one new IF node sitting on the FALSE output of `🖼️ ¿Imagen propia?`.

The only non-obvious concern is the **Ideogram API version mismatch**: REQUIREMENTS.md says `aspect_ratio: "ASPECT_9_16"` (v2 Turbo enum). The existing `🔤 Ideogram v3` node in `n8n/workflow.json` (line 277) is labeled "v3" but actually calls the **v2 endpoint** `https://api.ideogram.ai/generate` with `model: "V_2_TURBO"` + `ASPECT_1_1`. The true v3 endpoint at `https://api.ideogram.ai/v1/ideogram-v3/generate` uses `9x16` format (with `x`) + `multipart/form-data` + no model param. **Recommendation: mirror the existing node exactly — keep `api.ideogram.ai/generate`, `V_2_TURBO`, `magic_prompt_option: "OFF"`, `style_type: "DESIGN"`, JSON body — only change `ASPECT_1_1` → `ASPECT_9_16`.** This is the lowest-risk path: it matches the existing carousel slide loop that is already producing reliable 1080×1080 images, it matches REQUIREMENTS.md enum literally, and it avoids introducing a second Ideogram API flavor into the codebase.

**Primary recommendation:** Mirror the single-post image generation chain (5 new nodes) on the FALSE output of `🖼️ ¿Imagen propia?`, inject a `🔀 ¿Story?` IF router before the existing `🎨 ¿Ideogram?` router, extend `📱 Preparar mensaje WA` with a Story branch that emits the disclaimer. Do NOT modify the existing `🎨 ¿Ideogram?` / `🎨 ¿NanoBanana?` / Flux-Nano-Ideogram-v2 nodes.

---

## n8n Workflow Structure

### Existing nodes relevant to Phase 11

All coordinates and IDs read from `n8n/workflow.json` (3306 lines, as of 2026-04-20):

| Node ID | Node Name | Type | Position | Role in Phase 11 |
|---------|-----------|------|----------|------------------|
| `check-own-image` | `🖼️ ¿Imagen propia?` | `n8n-nodes-base.if` v1 | [864, 368] | **Insertion point for IMGEN-01** — FALSE output currently goes to `🎨 ¿Ideogram?`. Phase 11 inserts `🔀 ¿Story?` IF **between** these two. |
| `router-if-ideogram` | `🎨 ¿Ideogram?` | IF v1 | [1088, 448] | First node of existing Post image-model router (Ideogram / NanoBanana / Flux). Story branch bypasses this. |
| `ideogram-generate` | `🔤 Ideogram v3` | httpRequest v4.2 | [1312, 448] | **Template to clone for IMGEN-02.** `url=api.ideogram.ai/generate`, body `aspect_ratio=ASPECT_1_1, model=V_2_TURBO`. Story variant changes `ASPECT_1_1` → `ASPECT_9_16`. |
| `normalize-image` | `🔗 Normalizar URL imagen` | Code v2 | [1520, 448] | **Template to clone.** Reads response `data[0].url` for ideogram. Story variant is identical (same Ideogram response shape). |
| `save-session-supabase` | `💾 Guardar sesión Supabase` | httpRequest v4.2 | [1632, 600] | **Template to clone for IMGEN-03.** Single-post session save. Story variant adds `format: 'story'` + `story_expires_at` + `aspect_ratio` to the JSONB body. |
| `reattach-session-data` | `🔗 Re-attach session data` | Set v3.4 | [1744, 600] | **Template to clone.** Set node that re-attaches session fields lost by the Supabase insert response. Story variant adds format/story_expires_at assignments. |
| `send-single-image` | `📤 Enviar preview imagen` | httpRequest v4.2 | [1200, 464] | **Reused unchanged.** YCloud sendDirectly image node. Story branch ultimately connects into this. |
| `prepare-whatsapp` | `📱 Preparar mensaje WA` | Code v2 | [1744, 448] | **Extended in IMGEN-04 / NOTIF-02.** Currently branches on `isCarousel`. Add a third branch for `isStory` that appends the disclaimer. |

### Existing connections in the single-post path (reference)

```
✂️ Extract Hashtags (Single)
  → 🖼️ ¿Imagen propia?
      ├─ TRUE  → 📎 Imagen propia → 📱 Preparar mensaje WA
      └─ FALSE → 🎨 ¿Ideogram?
                    ├─ TRUE  → 🔤 Ideogram v3 → 🔗 Normalizar URL imagen
                    └─ FALSE → 🎨 ¿NanoBanana?
                                  ├─ TRUE  → 🍌 Nano Banana Pro → 🔗 Normalizar URL imagen
                                  └─ FALSE → ⚡ Flux 2 Pro → 🔗 Normalizar URL imagen
  → 🔗 Normalizar URL imagen → 💾 Guardar sesión Supabase
      → 🔗 Re-attach session data → 📤 Enviar preview imagen → 📱 Preparar mensaje WA
      → 📤 Enviar WhatsApp → (webhook reply flow…)
```

### Required connection rewires for Phase 11

**Remove ONE existing connection:**
- `🖼️ ¿Imagen propia?` FALSE output → ~~`🎨 ¿Ideogram?`~~ (will be replaced by connection to new Story IF)

**Add FIVE new connections:**
1. `🖼️ ¿Imagen propia?` FALSE output → `🔀 ¿Story?` (new IF)
2. `🔀 ¿Story?` FALSE output → `🎨 ¿Ideogram?` (preserves existing Post path)
3. `🔀 ¿Story?` TRUE output → `🔤 Ideogram v3 — Story` (new HTTP Request)
4. `🔤 Ideogram v3 — Story` → `🔗 Normalizar URL imagen — Story` (new Code)
5. `🔗 Normalizar URL imagen — Story` → `💾 Guardar sesión Supabase (Story)` (new HTTP Request)
6. `💾 Guardar sesión Supabase (Story)` → `🔗 Re-attach session data (Story)` (new Set)
7. `🔗 Re-attach session data (Story)` → `📤 Enviar preview imagen` (existing node — second inbound connection)

Note: `📤 Enviar preview imagen` currently has exactly ONE inbound connection (from `🔗 Re-attach session data`, the single-post path). After Phase 11 it has TWO (the second from the Story re-attach). This is fine — n8n happily accepts multiple inbound connections to a single node.

### Proposed new node coordinates (below the single-post row at y=448, y=528)

To keep the Story branch visually distinct and avoid colliding with Post (y≈448) or Carousel (y≈528):

```
🔀 ¿Story?                    [1008, 640]
🔤 Ideogram v3 — Story        [1232, 640]
🔗 Normalizar URL imagen — Story   [1456, 640]
💾 Guardar sesión Supabase (Story) [1632, 720]
🔗 Re-attach session data (Story)  [1744, 720]
```

These coordinates place the Story branch below the Carousel row (y=528, y=600, y=700). Exact positions are cosmetic — orchestrator can nudge them during planning.

---

## Ideogram v3 API (for `🔤 Ideogram v3 — Story`)

### Recommendation: Mirror the existing `🔤 Ideogram v3` node exactly

**Why:** The existing node in `n8n/workflow.json` (id `ideogram-generate`, line 276–305) is a confirmed-working integration that has been producing images for Post and Carousel (via `🔤 Ideogram — Slide` at line 113–144) across v1.0 / v1.1 / v1.2 so far. It uses the **v2 Turbo API** under a "v3" display name. Introducing the actual v3 endpoint would add risk (different Content-Type, different parameter format `9x16` instead of `ASPECT_9_16`, no model param, multipart body in n8n) with zero benefit to Phase 11 Success Criteria.

### Node config template (for IMGEN-02)

```json
{
  "method": "POST",
  "url": "https://api.ideogram.ai/generate",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "Api-Key", "value": "={{ $env.IDEOGRAM_API_KEY }}" },
      { "name": "Content-Type", "value": "application/json" }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={\n  \"image_request\": {\n    \"prompt\": \"{{ $json.image_prompt.replaceAll('\"', '\\\\\"') }} — vertical 9:16 Story composition, subject centered in upper-middle third, safe zone top and bottom 14% for UI, dark background #1a1a2e, purple and magenta gradient accents, bold readable typography\",\n    \"aspect_ratio\": \"ASPECT_9_16\",\n    \"model\": \"V_2_TURBO\",\n    \"magic_prompt_option\": \"OFF\",\n    \"style_type\": \"DESIGN\"\n  }\n}",
  "options": {}
}
```

### Response shape (confirmed from existing `normalize-image` Code at line 340)

```json
{
  "data": [
    { "url": "https://ideogram.ai/ephemeral-url/...signed_until=X" }
  ]
}
```

Image URL is at `response.data[0].url`. Note: this URL is ephemeral/signed (auth params in query string) — the existing `normalize-image` Code keeps the full URL with auth params. The Azure Blob re-host sub-workflow (Phase 4) handles re-hosting to a permanent URL downstream (Phase 12 calls re-host after SI approval).

### Auth + pricing (HIGH confidence — v2 Turbo)

- **Auth header:** `Api-Key: <key>` (NOT `Authorization: Bearer …`). Confirmed from existing node. Uses `IDEOGRAM_API_KEY` env var (already in `.env`).
- **Pricing:** ~$0.06/image for V_2_TURBO (per CLAUDE.md table). Same as existing Ideogram calls.
- **Rate limits:** No project-level issues observed in v1.0/v1.1 — single image per Story (`num_images=1`) is well under any tier limit.
- **Output resolution:** REQUIREMENTS.md states 1080×1920. Ideogram v2 Turbo with `ASPECT_9_16` documented to produce this dimension (MEDIUM confidence — needs one-time verification in E2E test; Phase 10 research wrote "1080×1920 exact").

### Negative claim flagged for validation

**Claim:** "v2 Turbo `ASPECT_9_16` produces 1080×1920 exactly."

- **Source:** `.planning/research/SUMMARY.md` line 72 and REQUIREMENTS.md line 23. Both internal docs.
- **Verification path:** After Phase 11 deploys, run one Wizard Story brief, capture the Ideogram response in n8n execution trace, and verify dimensions. If not exactly 1080×1920, document actual dimensions in STATE.md — Meta Stories accept a range of vertical dimensions (9:16 ratio is what matters) but the REQUIREMENTS.md literal claim should be updated.

---

## Supabase Session Schema (for IMGEN-03)

### Current schema state (confirmed)

From `SETUP.md` line 129 (initial schema):
```sql
CREATE TABLE content_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  topic TEXT,
  type TEXT,
  platforms TEXT[],
  instagram_caption TEXT,
  facebook_caption TEXT,
  image_url TEXT,
  approval_number TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Phase 7 extended this** (per `07-RESEARCH.md` and `save-session-carousel` node at workflow.json line 1336–1382):
- Added `format TEXT` (values: `carousel`, implicit `single` for NULL)
- Added `image_urls JSONB` (array for carousel)
- Added `final_image_url TEXT` (single-post)
- Added `image_model TEXT`
- Added `angle TEXT`
- Added `publish_at TEXT`

**Evidence the `format` column already exists:** The carousel Supabase save node (line 1361) writes `format: 'carousel'` directly in the JSON body to the `/rest/v1/content_sessions` REST endpoint. If the column didn't exist, Supabase would reject with 400. The fact that Phase 7 E2E tests passed end-to-end (ROADMAP line 28 completed 2026-04-17) confirms `format` column exists.

### Recommendation: NO schema migration needed

**Phase 11 just needs to INSERT a row with `format: 'story'` and `story_expires_at: <ISO>` into the existing table.** Since Supabase (PostgREST) accepts any JSON fields that match existing columns and silently ignores unknown fields only if configured so… actually, PostgREST REJECTS unknown fields by default with a 400.

**Safer sub-recommendation (VERIFY in Plan):** Confirm via a schema introspection query (e.g., `GET /rest/v1/?select=*` with `Prefer: resolution=merge-duplicates` on a dry run, or log the first 400 response) whether `story_expires_at`, `aspect_ratio`, and `story_format`-adjacent columns exist. If not:

- **Option A (recommended):** Persist Story-only extra fields inside an existing JSONB column. The `image_urls JSONB` column is a natural home (already JSONB, carousel-only today, unused for Stories). Repurposing is clean but semantic-confusing.
- **Option B:** Persist inside a NEW `metadata JSONB` column via a one-time `ALTER TABLE content_sessions ADD COLUMN metadata JSONB;` migration. Phase 11 Plan 01 could include this DDL as a pre-task (same pattern as Phase 7 did for `format`/`image_urls`).
- **Option C (simplest):** Just include `story_expires_at` and `aspect_ratio` as top-level columns in the insert body. If Supabase rejects → fall back to B.

**Decision to delegate to Plan:** Plan-01 of Phase 11 should start with a "Schema probe" task that sends a test POST with the Story fields and inspects the response. If 400, add `ALTER TABLE` migration. If 201, skip. This keeps the plan resilient.

### Story session save body (template — extend `save-session-supabase` shape)

```javascript
JSON.stringify({
  session_id: 'propulsar_' + Date.now(),
  approval_number: $json.approval_number,
  topic: $json.topic,
  type: $json.type,
  angle: $json.angle || null,
  platforms: $json.platforms || [],
  image_model: $json.image_model || 'ideogram',
  image_url: $json.image_url || null,
  final_image_url: $json.final_image_url,
  instagram_caption: ($json.instagram && $json.instagram.caption) || null,
  facebook_caption: ($json.facebook && $json.facebook.caption) || null,
  status: 'pending',
  publish_at: $json.publish_at || 'now',
  format: 'story',                              // IMGEN-03 — REQUIRED
  aspect_ratio: $json.aspect_ratio || '9:16',   // Phase 10 contract
  story_expires_at: $json.story_expires_at      // Phase 10 contract (ISO UTC Z)
})
```

---

## WhatsApp Preview Extension (IMGEN-04 / NOTIF-02)

### Current state of `📱 Preparar mensaje WA` (Code v2, line 484–496)

The node already branches on format:

```javascript
const isCarousel = d.format === 'carousel';
// …
const formatLine = isCarousel
  ? `\n🎠 *Formato:* Carrusel (${d.num_images} slides)`
  : '';
// …
const imageStatus = isCarousel
  ? `🎠 ${d.image_urls?.length || 0} imágenes generadas (carrusel)`
  : `🖼️ ${d.final_image_url ? '✅ Imagen generada' : '⚠️ Sin imagen'}`;
```

### Recommendation: Extend the same node with an `isStory` branch

**Why a single node:** Avoids adding a conditional third Preparar WA Code node. The existing pattern is already dual-format aware; adding Story is additive.

### Proposed edits to `📱 Preparar mensaje WA`

```javascript
const isCarousel = d.format === 'carousel';
const isStory    = d.format === 'story';

// formatLine — add Story variant
const formatLine = isCarousel
  ? `\n🎠 *Formato:* Carrusel (${d.num_images} slides)`
  : isStory
    ? `\n📲 *Formato:* Historia 9:16 (expira ${new Date(d.story_expires_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit' })})`
    : '';

// imageStatus — add Story variant
const imageStatus = isCarousel
  ? `🎠 ${d.image_urls?.length || 0} imágenes generadas (carrusel)`
  : isStory
    ? `📲 ${d.final_image_url ? '✅ Imagen 9:16 generada' : '⚠️ Sin imagen'}`
    : `🖼️ ${d.final_image_url ? '✅ Imagen generada' : '⚠️ Sin imagen'}`;

// disclaimer — NEW block, Story-only, placed BEFORE the *¿Publicar?* line
const storyDisclaimer = isStory
  ? `\n━━━━━━━━━━━━━━━━\n⚠️ *Importante sobre la Historia:*\n· La imagen es vertical 9:16 — acá se ve recortada, pero en Instagram ocupa toda la pantalla.\n· El texto del caption es *solo para tu revisión*: las Stories de Meta NO aceptan caption, así que todo el texto visible queda dentro de la imagen.\n· Una vez publicada, la Story expira en 24h.\n`
  : '';

// Insert $storyDisclaimer into the msg template right before the "*¿Publicar?*" line
```

### Proposed disclaimer text (LOCKED recommendation — Spanish voseo, <3 emojis, Propulsar voice)

```
━━━━━━━━━━━━━━━━
⚠️ Importante sobre la Historia:
· La imagen es vertical 9:16 — acá se ve recortada, pero en Instagram ocupa toda la pantalla.
· El texto del caption es solo para tu revisión: las Stories de Meta NO aceptan caption, así que todo el texto visible queda dentro de la imagen.
· Una vez publicada, la Story expira en 24h.
```

**Rationale:**
- **3 bullets** covers NOTIF-02's 3 concerns (9:16 crop in WA, full-screen in IG, caption is review-only).
- **No buzzwords** per CLAUDE.md ("revolucionario", "disruptivo" absent).
- **Voseo**: "acá se ve recortada" (not "aquí se verá"), "tu revisión" (not "su revisión") — consistent with Phase 10's locked voseo.
- **Single emoji (⚠️)** at the disclaimer header — stays under the 3-emoji cap and signals "heads-up" without being alarming.
- **Divider `━━━━━━━━━━━━━━━━`** matches the existing template's divider pattern (used in IG/FB preview separators).
- **24h expiry mentioned inline** — ties back to the `formatLine` "expira <timestamp>" so the user has both a timestamp AND a general expiry reminder.

### Alternative considered (rejected)

- **Separate WA message for disclaimer:** Two messages (preview + disclaimer) would fragment attention and add YCloud API cost for no value. Single message with inline disclaimer is cleaner.
- **Disclaimer AFTER the `*¿Publicar?*` CTA:** Rejected — the CTA should be the last thing the user reads. Disclaimer goes BEFORE it.

---

## IF v1 Node Pattern (`🔀 ¿Story?`)

### Recommendation: Clone the shape of the existing `🔀 ¿Carrusel?` node (line 1018–1037)

The project already proves this pattern works for format-based routing. Three-format world only requires one more IF.

### Node config template

```json
{
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.format }}",
          "value2": "story"
        }
      ]
    }
  },
  "id": "check-is-story",
  "name": "🔀 ¿Story?",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [1008, 640]
}
```

### Semantics

- **Input:** `$json` at this point is the output of `🖼️ ¿Imagen propia?` FALSE branch. Phase 10 guarantees that `format=story` is present in the brief body; the brief body is spread into `$json` by `🔧 Parsear contenido` (line 184–195). **However, `🔧 Parsear contenido` does NOT currently carry `format` forward** — it builds a new object with only the fields it wants. This is a gap.
- **Remediation:** Plan-01 Task N must add `format: b.format || null` and `aspect_ratio: b.aspect_ratio || null`, `num_images: b.num_images || null`, `story_expires_at: b.story_expires_at || null` to the `return [{ json: … }]` in `🔧 Parsear contenido` (line 184–195). Otherwise `🔀 ¿Story?` will always see `format === undefined` and route to FALSE, silently breaking the feature.
- **Also** the downstream `✂️ Extract Hashtags (Single)` Code node (line 196–208) uses `...data` spread — so as long as `format` enters the pipeline, it propagates.

### Existing precedent for this pattern

`🔀 ¿Carrusel?` at line 1018 already routes on `$json.body.format === 'carousel'` BUT it sits at the top of the workflow (right after the Webhook Trigger), reading from `body.*`. `🔀 ¿Story?` sits further downstream, so it reads `$json.format` (unprefixed) after `🔧 Parsear contenido`.

### Regression risk: LOW

- Only one existing connection is rewired: `🖼️ ¿Imagen propia?` FALSE output. Its new destination is `🔀 ¿Story?`.
- On FALSE output of `🔀 ¿Story?`, we restore the original connection to `🎨 ¿Ideogram?`. The existing Post flow is fully preserved.
- Carousel path is not touched at all (routes via `🔀 ¿Carrusel?` at webhook level).
- Custom image path (`has_own_image=true`) is fully preserved (TRUE branch of `🖼️ ¿Imagen propia?` → `📎 Imagen propia` — unchanged).

---

## Test Strategy for Phase 11 (without Phases 12 / 13)

### Core question

Phase 11 generates a Story image and sends the WA preview. After the user replies SI in WhatsApp, the workflow enters the SI-approval path: `✅ ¿Aprobado?` → `🔍 Recuperar sesión Supabase` → `🕐 Compute wait_seconds` → `⏰ ¿Programado?` → `🔧 Prep Re-host Input` → `🔁 Re-host Images` → `🔗 Merge Rehost Output` → `🔀 ¿Formato Carrusel?` → single-post IG/FB chain (FALSE branch).

If a Story-format session reaches `🔀 ¿Formato Carrusel?`, it routes to FALSE and enters the **single-post IG/FB publish chain** — which will try to `POST /{IG_USER_ID}/media` with `media_type=IMAGE` (not `STORIES`) and publish a regular feed post, NOT a Story. This is a latent bug that Phase 12 will resolve by adding `🔀 ¿Formato Story?` on the FALSE output of `🔀 ¿Formato Carrusel?`.

### Recommended test strategy

**For Phase 11 acceptance testing (no SI approval):**

1. Run Wizard with `format=story` → brief goes to webhook → n8n generates 9:16 image → Supabase row inserted with `format='story'` → WA image + disclaimer preview arrive on Felix's phone.
2. **STOP HERE.** Do NOT reply SI. Verify:
   - n8n execution trace shows `🔀 ¿Story?` TRUE branch taken.
   - `🔤 Ideogram v3 — Story` returned `data[0].url`.
   - Image downloaded from URL is 9:16 (use any image inspector or the browser preview).
   - Supabase `content_sessions` row exists with `format='story'` (psql or Supabase Dashboard verification).
   - WhatsApp message includes the disclaimer text, the format line shows "Historia 9:16 (expira …)", and the `*¿Publicar?*` CTA is present.
   - Reply **NO** to cancel the session cleanly.

**If the user DOES reply SI accidentally during Phase 11 testing:**

- The workflow WILL enter the single-post IG publish chain and attempt to publish the 9:16 image as a regular IG feed post.
- IG feed posts accept 9:16 images (they display with wide letterboxing in feed grid). So the post will succeed as a regular IG post, NOT a Story.
- This is **not catastrophic** but is noise. To prevent this, add a **temporary safeguard in `🔧 Prep Re-host Input`** (Code node, line 642–655): throw if `$json.format === 'story'`. This mirrors the Phase 05 precedent where `🔧 Prep Re-host Input` threw on `format=carousel` until Phase 7 removed the guard.

### Recommended safeguard code (for `🔧 Prep Re-host Input`)

```javascript
// Phase 11 temporary guard — remove in Phase 12
if (data.format === 'story') {
  throw new Error('Phase 11 guard: Story publishing not yet supported (Phase 12). Reply NO to cancel, or wait for v1.2 Phase 12 ship.');
}
```

This guard:
- Prevents accidental mispublish if Felix replies SI prematurely.
- Is removed cleanly by Phase 12 (mirrors Phase 05 Plan 01 carousel guard → Phase 7 removal — documented project precedent).
- Throws with a descriptive error so the n8n execution trace is clear.
- Does NOT block Phase 11 E2E test (the test stops at WA preview, never triggers SI approval).

---

## Gotchas & Risks

### 1. `🔧 Parsear contenido` drops `format` / `aspect_ratio` / `story_expires_at`

**What goes wrong:** The Code node at line 184 hand-builds the outgoing object field-by-field. It does NOT include `format`, `aspect_ratio`, `num_images`, or `story_expires_at` from `b` (webhook body). Phase 11's `🔀 ¿Story?` IF reads `$json.format` and will always see `undefined` → always route FALSE → Story branch never executes.

**Detection:** The existing trace for a Story brief shows `format === 'story'` in `🎯 Webhook Trigger` body but missing in `🔧 Parsear contenido` output.

**Fix:** Add these fields to the returned object:
```javascript
format:            b.format || null,
aspect_ratio:      b.aspect_ratio || null,
num_images:        b.num_images || null,
story_expires_at:  b.story_expires_at || null,
```

**Where:** In `🔧 Parsear contenido` return statement (workflow.json line 185 jsCode).

**Verify:** grep the Code node's `return` for those four keys.

### 2. n8n Code node sandbox

Per MEMORY.md (`n8n_code_node_gotchas.md`) and STATE.md:

- `require('crypto')` BLOCKED — if Phase 11 needs a unique session_id, use `'propulsar_' + Date.now()` (existing pattern at line 378).
- `binary` drops unless forwarded — not an issue for Phase 11 (no binary image handling in Code nodes; the HTTP Request nodes handle the Ideogram response directly).
- `Set v3.0` cross-refs in fan-outs — not an issue for Phase 11 (no fan-out; Story has num_images=1). **BUT**: the new `🔗 Re-attach session data (Story)` Set node uses cross-ref to `🔗 Normalizar URL imagen — Story` — this is the non-fan-out case, which works reliably (same pattern as the existing `🔗 Re-attach session data` at line 398–483).

### 3. Set node drops unmapped fields when `includeOtherFields: false`

**Risk:** If `🔗 Re-attach session data (Story)` uses `includeOtherFields: false` (matches the existing reattach node at line 471), any field NOT explicitly assigned is dropped. The existing reattach has 11 assignments (a1–a11). Phase 11's Story reattach must explicitly include `format`, `aspect_ratio`, `story_expires_at` in its assignments — otherwise they get dropped before reaching `📤 Enviar preview imagen` / `📱 Preparar mensaje WA`, and the disclaimer branch (which reads `d.format === 'story'`) fails.

**Fix:** In the new Set node, add these assignments beyond the 11 in the template:
- `format` (string) ← `{{ $('🔗 Normalizar URL imagen — Story').item.json.format }}`
- `aspect_ratio` (string) ← same
- `story_expires_at` (string) ← same
- `final_image_url` (string) ← same
- `num_images` (number) ← same

### 4. Supabase schema mismatch (covered above)

Could fail insert with 400 if `story_expires_at` column doesn't exist. Plan-01 must probe and potentially ALTER TABLE first.

### 5. WhatsApp preview does NOT represent IG Story final output

Known quirk (documented in SUMMARY.md): YCloud renders 9:16 images in a ~4:3 container → visible crop in WA preview. The disclaimer addresses this head-on, so it's a communicated-risk not a silent-bug.

### 6. Ideogram dimensions may not be exactly 1080×1920

MEDIUM confidence on the claim. Safe because Meta Stories accept any 9:16 image within a reasonable dimension range (officially 1080×1920 ideal, but 720×1280 and 1440×2560 also accepted). The `validateImageIs916` helper in Wizard already tolerates ±5% — the Ideogram output will either be exact or close enough. Plan verification step should document actual dimensions after first successful generation.

### 7. Regression risk to Post / Carousel paths: LOW

Only one pre-existing connection is rewired (`🖼️ ¿Imagen propia?` FALSE → … was `🎨 ¿Ideogram?`, becomes `🔀 ¿Story?` → FALSE → `🎨 ¿Ideogram?`). Functionally identical for non-Story briefs. Carousel path unmodified. Custom-image path (TRUE of `🖼️ ¿Imagen propia?`) unmodified.

### 8. Azure Blob assertion (deferred)

SAS param issue with Meta Story fetcher (MEMORY.md + SUMMARY.md pitfall #9 on Phase 13). NOT a Phase 11 concern — no Meta Story API call is made in Phase 11.

---

## Open Questions

1. **Does `content_sessions.story_expires_at` column exist?**
   - What we know: Phase 7 added `format`, `image_urls`, `final_image_url`, `image_model`, `angle`, `publish_at` columns based on `save-session-carousel` writing them. No documented `story_expires_at` column.
   - What's unclear: whether Phase 7 or any earlier phase anticipated this.
   - **Recommendation:** Plan-01 starts with a schema probe task that sends a dry-run POST, inspects response, and conditionally adds an `ALTER TABLE content_sessions ADD COLUMN story_expires_at TIMESTAMPTZ;` step. Same pattern as Phase 7 Plan 01 schema extension.

2. **Does Ideogram v2 Turbo `ASPECT_9_16` consistently produce 1080×1920?**
   - What we know: internal docs claim yes. External API docs don't specify exact pixel dimensions for v2 Turbo at 9:16.
   - **Recommendation:** Log actual dimensions in Phase 11 verification step. Update STATE.md with observed dimensions. Downstream (Phase 12/13) accepts any 9:16 image within Meta spec anyway.

3. **Should `num_images` column be added to Supabase?**
   - What we know: Carousel save already writes `image_urls JSONB` (array length = num_images implicitly). Story save will write `final_image_url TEXT` + num_images could be redundant (always 1).
   - **Recommendation:** Skip. `final_image_url IS NOT NULL AND format='story'` implies `num_images=1`.

4. **Disclaimer wording — approved?**
   - What we know: Proposed above. No user locked-decision exists.
   - **Recommendation:** Plan-01 uses the proposed text. If user wants changes during review, edit in Plan-02 or via a quick patch.

---

## Recommended Plan Breakdown

### Recommendation: Split Phase 11 into TWO plans

**Plan 01 — Workflow JSON edits (local only)**
- Task 1: Probe Supabase schema → add any missing columns via SQL if needed (`story_expires_at`).
- Task 2: Patch `🔧 Parsear contenido` Code (line 184) to carry `format`, `aspect_ratio`, `num_images`, `story_expires_at` through.
- Task 3: Add `🔀 ¿Story?` IF v1 node + rewire `🖼️ ¿Imagen propia?` FALSE output.
- Task 4: Add `🔤 Ideogram v3 — Story` HTTP Request (ASPECT_9_16, mirrors existing Ideogram node).
- Task 5: Add `🔗 Normalizar URL imagen — Story` Code + `💾 Guardar sesión Supabase (Story)` HTTP Request + `🔗 Re-attach session data (Story)` Set, all with `format='story'` + `story_expires_at` flowing through.
- Task 6: Wire `🔗 Re-attach session data (Story)` → `📤 Enviar preview imagen` (second inbound connection).
- Task 7: Extend `📱 Preparar mensaje WA` Code with `isStory` branch + disclaimer text.
- Task 8: Add Phase-11 guard to `🔧 Prep Re-host Input` (`throw if format==='story'`).
- Verify: `node --check` equivalent (JSON schema validation / n8n import dry-run), grep checks on connection additions.

**Plan 02 — Deploy to n8n-azure + E2E test**
- Task 1: Import updated `workflow.json` into n8n-azure.propulsar.ai.
- Task 2: Activate workflow.
- Task 3: Run Wizard with a real Story brief (`node wizard/run.js`, pick Historia, pick Ideogram auto, set publish_at='now').
- Task 4: Verify n8n execution trace: `🔀 ¿Story?` TRUE taken, `🔤 Ideogram v3 — Story` response `data[0].url` present, Supabase row written with `format='story'`, WA preview received with disclaimer.
- Task 5: Capture Ideogram image dimensions (download URL, inspect); document in 11-SUMMARY.md.
- Task 6: Reply **NO** to WhatsApp to cancel session. Verify `❌ Loguear rechazo` executed, no publish attempt.
- Task 7: Update STATE.md with actual dimensions + any observed gotchas.

### Why two plans

- Plan 01 is pure file-editing — fast (~10 min), fully verifiable locally via JSON parse + grep, low risk.
- Plan 02 is the "live deploy + manual E2E" layer — depends on n8n-azure being up, Felix's phone receiving the WA message, Ideogram API being available. Failure here doesn't roll back Plan 01 commits.
- Matches the Phase 7 / Phase 10 precedent (workflow edits → deploy + test as separate plans).

### Dependency order

Plan 01 tasks must be ordered: 1 (schema probe) → 2 (Parsear contenido patch) → 3 (IF node + rewire) → 4 (Ideogram) → 5 (Normalize + Save + Reattach) → 6 (connection to Enviar preview imagen) → 7 (Preparar WA disclaimer) → 8 (Prep Re-host guard). Each task can be committed atomically.

---

## Sources

### Primary (HIGH confidence)

- `n8n/workflow.json` (3306 lines) — **ground truth** for existing node names, IDs, positions, connections, Code logic. Read in full.
- `.planning/phases/10-wizard-historia-format/10-02-SUMMARY.md` — Phase 10 downstream contract (guaranteed brief fields).
- `.planning/REQUIREMENTS.md` — IMGEN-01..04 + NOTIF-02 literal requirements.
- `.planning/STATE.md` — locked decisions from Phase 10 (22h cap, voseo wording, Ideogram-only for Stories).
- `.planning/research/SUMMARY.md` — project-level v1.2 research (integration architecture, pitfall inventory).
- `.planning/research/STACK.md` — Stories API reference (Ideogram `ASPECT_9_16`, Meta endpoints for Phase 12/13 context).
- `.planning/phases/07-carousel-publishing-ig-fb/07-RESEARCH.md` — precedent for Supabase schema extension and IF v1 routing in n8n 2.14.2.
- `SETUP.md` line 129 — initial `content_sessions` schema.

### Secondary (MEDIUM confidence)

- https://developer.ideogram.ai/api-reference/api-reference/generate — official v2 Turbo endpoint doc; confirms `ASPECT_9_16` enum and `V_2_TURBO` model.
- https://fal.ai/docs/model-api-reference/image-generation-api/ideogram-v3 — fal.ai Ideogram v3 (different endpoint, `9:16` format, multipart body). Cross-reference only; not used in Phase 11.
- https://developer.ideogram.ai/api-reference/api-reference/generate-v3 — true Ideogram v3 endpoint (`/v1/ideogram-v3/generate`, `9x16` format, multipart). Documented but NOT used in Phase 11 (existing node uses v2 under "v3" label).
- https://docs.ideogram.ai/using-ideogram/generation-settings/aspect-ratio-and-dimensions — Ideogram aspect ratio docs (resolution table — MEDIUM, exact 9:16 dimension varies by endpoint).

### Tertiary (LOW confidence — flagged for validation)

- Claim "v2 Turbo `ASPECT_9_16` = 1080×1920 exact" — sourced from internal research docs only (SUMMARY.md, STACK.md). Not verified against external Ideogram docs (which focus on v3). Validate by inspecting one actual Story generation in Plan-02.

---

## Metadata

**Confidence breakdown:**
- n8n workflow structure + insertion points: **HIGH** — full read of 3306-line workflow.json, all node IDs / positions / connections indexed.
- Ideogram node config: **HIGH** for v2 Turbo endpoint mirror (the existing `🔤 Ideogram v3` is already production-tested for `ASPECT_1_1` and the `🔤 Ideogram — Slide` node for per-slide carousel generation — changing `ASPECT_1_1` → `ASPECT_9_16` is a one-character semantic change within a working pattern).
- Supabase schema: **MEDIUM** — `format` column confirmed exists; `story_expires_at` column NOT confirmed. Plan-01 schema probe task mitigates.
- WhatsApp preview extension: **HIGH** — existing `📱 Preparar mensaje WA` already has a working `isCarousel` branch; adding `isStory` follows the identical pattern.
- Gotchas & regression risk: **HIGH** — n8n sandbox gotchas well documented in MEMORY.md; regression boundary is one rewired connection.
- Disclaimer text: **MEDIUM** — proposed verbatim but user hasn't approved; user can edit in Plan-02 review cycle.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stable; n8n / Ideogram / Supabase all stable APIs. Re-validate if Ideogram deprecates v2 Turbo or if n8n releases 2.15+).

---

## RESEARCH COMPLETE

**Phase:** 11 — Story Image Generation
**Confidence:** HIGH (workflow patterns, node shapes, regression boundary)

### Key Findings

1. **Five new nodes, one rewired connection** — minimal workflow surgery. Story branch mirrors the single-post chain verbatim, sits below y=640 to visually separate from Post (y≈448) and Carousel (y≈528) rows.
2. **Use the EXISTING "Ideogram v3" node shape** (`api.ideogram.ai/generate`, `V_2_TURBO`, `ASPECT_9_16`) — the node name says "v3" but actually calls v2 Turbo. REQUIREMENTS.md's `ASPECT_9_16` enum maps correctly to this endpoint. Do NOT switch to the true Ideogram v3 endpoint (`/v1/ideogram-v3/generate`) — different Content-Type, different aspect format (`9x16`), zero benefit for Phase 11.
3. **Hidden gap in `🔧 Parsear contenido`** — it currently does NOT carry `format`, `aspect_ratio`, `story_expires_at` from the webhook body. Without patching this, `🔀 ¿Story?` IF will always route FALSE and the feature is silently dead. Plan-01 Task 2 fixes.
4. **Supabase `story_expires_at` column likely doesn't exist** — Phase 7 added `format` and `image_urls`, no documented column for Story expiry. Plan-01 Task 1 probes and conditionally runs `ALTER TABLE content_sessions ADD COLUMN story_expires_at TIMESTAMPTZ;`.
5. **Phase-11 Prep Re-host Input guard (mirrors Phase 5 pattern)** — if Felix accidentally replies SI before Phase 12 exists, throw a descriptive error in `🔧 Prep Re-host Input`. This is additive and removed cleanly by Phase 12.

### File Created

`C:/Felix/Automatizaciones/Propulsar/Proyectos/CreadorContenido/.planning/phases/11-story-image-generation/11-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack (n8n + Ideogram v2 Turbo mirror + Supabase REST + YCloud) | HIGH | All nodes have production precedents in workflow.json; Ideogram response shape confirmed by existing `normalize-image` Code. |
| Architecture (5 new nodes + 1 rewire + 1 Parsear patch + 1 Preparar WA extension + 1 guard) | HIGH | Mirrors Phase 5 / Phase 7 precedents literally. |
| Pitfalls (Parsear contenido drop, Set v3 fan-out, Supabase schema) | HIGH | Documented in MEMORY.md, STATE.md, and prior phase research. |
| Ideogram ASPECT_9_16 → 1080×1920 exact | MEDIUM | Internal claim only; validate in Plan-02 E2E test. |

### Open Questions

- `content_sessions.story_expires_at` column existence (resolved by Plan-01 Task 1 schema probe).
- Actual Ideogram output dimensions for `ASPECT_9_16` + `V_2_TURBO` (resolved by Plan-02 E2E measurement).
- Final disclaimer text sign-off (Plan-01 uses proposed text; user can edit in review).

### Ready for Planning

Research complete. Planner can now create PLAN.md files (recommend 2 plans: 11-01 workflow edits, 11-02 deploy + E2E).
