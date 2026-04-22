---
phase: 11-story-image-generation
plan: 01
subsystem: n8n-workflow

tags: [n8n, story, ideogram, supabase, router, whatsapp, phase-guard]

requires:
  - phase: 10-02 (Story brief contract — format=story, aspect_ratio=9:16, num_images=1, story_expires_at ISO-UTC-Z)
    provides: Wizard-side brief shape that n8n nodes trust without re-validating

provides:
  - Story image-generation branch in n8n (IMGEN-01 through IMGEN-04)
  - 5 new Story nodes: check-is-story, ideogram-generate-story, normalize-image-story, save-session-supabase-story, reattach-session-data-story
  - parse-content now carries format / aspect_ratio / num_images / story_expires_at from the brief
  - WhatsApp Story disclaimer with 3-bullet tuteo es-LA neutral text (NOTIF-02)
  - Phase-11 guard in Prep Re-host Input (throws descriptive error if format=story hits approval path before Phase 12)
  - Supabase content_sessions confirmed compatible with Story schema (story_expires_at + aspect_ratio columns)

affects: [12-ig-story-publishing, 13-fb-story-publishing]

tech-stack:
  added: []
  patterns:
    - "Ideogram V_2_TURBO with ASPECT_9_16 for 9:16 Story image generation (mirrors ideogram-generate node exactly)"
    - "IF v1 (not v2) for check-is-story — matches existing ¿Carrusel? router pattern"
    - "Set v3.4 with includeOtherFields:false in reattach — explicitly maps all 15 fields including 4 Story-specific ones"
    - "Phase guard pattern: throw before any publish attempt when format not yet supported (mirrors Phase 5 carousel guard)"
    - "Supabase probe-then-delete for schema validation before wiring production nodes"

key-files:
  modified:
    - n8n/workflow.json

key-decisions:
  - "Pre-edit node count: 73 | Post-edit node count: 78 | Delta: +5 (used by Plan 11-02 for dynamic deploy comparison)"
  - "check-is-story uses IF v1 not v2 — v2 broken in n8n 2.14.2 per STATE.md"
  - "normalize-image-story cross-refs 🔧 Parsear contenido (not its direct input) to carry brief fields through — same pattern as normalize-image"
  - "save-session-supabase-story position: after normalize-image-story, before reattach-session-data-story — Supabase INSERT happens before WA preview"
  - "reattach-session-data-story maps 15 fields (11 from original reattach + 4 Story-specific: format, aspect_ratio, story_expires_at, num_images)"
  - "Story disclaimer injected BETWEEN imageStatus and *¿Publicar?* CTA — never between IG/FB caption blocks"
  - "Phase-11 guard checks data.format directly (before const format assignment) — matches Phase 5 carousel guard precedent"
  - "Story branch terminal node: 📤 Enviar preview imagen (same as single-post path) — n8n allows multiple inbound connections"

metrics:
  duration: ~25min (continuation run after schema migration pause)
  completed: 2026-04-22
  tasks: 3
  commits: 3
  files_modified: 1
---

# Phase 11 Plan 01: Story Image Branch Summary

**5 new n8n nodes route format=story briefs through Ideogram 9:16 generation, Supabase session with story_expires_at + aspect_ratio, and a WhatsApp preview with a locked 3-bullet Spanish tuteo disclaimer — without touching any existing Post, Carousel, or Custom-Image path.**

## Performance

- **Duration:** ~25 min (including schema migration pause)
- **Completed:** 2026-04-22
- **Tasks:** 3
- **Files modified:** 1 (n8n/workflow.json)
- **Commits:** 3 atomic commits

## Accomplishments

### Task 1: Supabase Schema Probe

The probe INSERT (HTTP 201 expected) returned HTTP 400 on first run — `aspect_ratio` and `story_expires_at` columns were missing from `content_sessions`. User ran:

```sql
ALTER TABLE content_sessions ADD COLUMN IF NOT EXISTS story_expires_at TIMESTAMPTZ;
ALTER TABLE content_sessions ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;
```

Re-probe returned 201. Probe row `probe_phase11_202604220935` deleted (HTTP 204). Schema confirmed compatible.

### Task 2: Story Branch Nodes + Patch Parsear contenido

**Pre-edit node count: 73** (confirmed via `node -e "JSON.parse(...).nodes.length"`)
**Post-edit node count: 78** (+5 exactly)

**Edit 1/7:** `parse-content` jsCode patched to carry `format`, `aspect_ratio`, `num_images`, `story_expires_at` from `b` (the webhook body). Without this, `🔀 ¿Story?` downstream would see `$json.format === undefined` and always route FALSE.

**Edit 2/7:** New node `🔀 ¿Story?` (id `check-is-story`) — IF v1, checks `$json.format === 'story'`. Position: after `🖼️ ¿Imagen propia?` in the FALSE branch.

**Edit 3/7:** New node `🔤 Ideogram v3 — Story` (id `ideogram-generate-story`) — HTTP POST to `api.ideogram.ai/generate` with `ASPECT_9_16` and `V_2_TURBO`. Position: [1232, 640].

**Edit 4/7:** New node `🔗 Normalizar URL imagen — Story` (id `normalize-image-story`) — Code v2, extracts `data[0].url`, cross-refs `🔧 Parsear contenido` to restore full brief shape plus `final_image_url`. Position: [1456, 640].

**Edit 5/7:** New node `💾 Guardar sesión Supabase (Story)` (id `save-session-supabase-story`) — HTTP POST to Supabase REST API with `format='story'`, `aspect_ratio`, `story_expires_at`. `retryOnFail=true`, `maxTries=3`. Position: [1632, 720].

**Edit 6/7:** New node `🔗 Re-attach session data (Story)` (id `reattach-session-data-story`) — Set v3.4, `includeOtherFields: false`, maps 15 fields including Story-specific: `format`, `aspect_ratio`, `story_expires_at`, `num_images`. Position: [1744, 720].

**Edit 7/7:** Connections rewired:
- `🖼️ ¿Imagen propia?` FALSE → `🔀 ¿Story?` (was → `🎨 ¿Ideogram?`)
- `🔀 ¿Story?` TRUE → `🔤 Ideogram v3 — Story`
- `🔀 ¿Story?` FALSE → `🎨 ¿Ideogram?` (Post path preserved byte-for-byte)
- Full Story chain: Ideogram → Normalizar → Guardar → Reattach → `📤 Enviar preview imagen`

### Task 3: WA Disclaimer + Phase-11 Guard

**`📱 Preparar mensaje WA`:**
- Added `const isStory = d.format === 'story';` after `isCarousel`
- Extended `imageStatus` ternary: Story → `📲 ✅ Imagen 9:16 generada` / `⚠️ Sin imagen`
- Extended `formatLine` ternary: Story → `📲 *Formato:* Historia 9:16 (expira <Madrid local time>)`
- Added `const storyDisclaimer` (3-bullet locked text, tuteo es-LA neutral, single ⚠️ emoji)
- Spliced `${storyDisclaimer}` between `${imageStatus}` and `*¿Publicar?*` CTA

Locked disclaimer text (NOTIF-02):
- La imagen es vertical 9:16 — acá se ve recortada, pero en Instagram ocupa toda la pantalla.
- El texto del caption es *solo para tu revisión*: las Stories de Meta NO aceptan caption, así que todo el texto visible queda dentro de la imagen.
- Una vez publicada, la Story expira en 24h.

**`🔧 Prep Re-host Input`:**
- Phase-11 guard inserted immediately after `const data = $input.first().json;`
- Throws descriptive Spanish error with: Phase 12 arrival note, "Reply NO" instruction, Supabase cleanup guidance

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | cb5333d | chore(11-01): probe Supabase — ALTER TABLE added story_expires_at + aspect_ratio |
| Task 2 | 419011c | feat(11-01): add Story image branch (IF + Ideogram 9:16 + Supabase + reattach) + patch Parsear contenido |
| Task 3 | 190eb26 | feat(11-01): Story WA disclaimer + Phase-11 guard in Prep Re-host Input |

## Node Count for Plan 11-02 Reference

| Metric | Value |
|--------|-------|
| Pre-edit node count | 73 |
| Post-edit node count | 78 |
| Delta | +5 |
| Pre-edit connection count | 68 |
| Post-edit connection count | 73 |

Plan 11-02 deploy check should assert `remote.nodes.length === 78` (not hardcoded — read from this file dynamically or compare to a fresh local parse).

## Deviations from Plan

None — plan executed exactly as written. All 7 node edits, all connection rewires, all 5 validation scripts passed first run. The only deviation was an expected schema migration pause at Task 1 (documented in plan as the designed handling path).

## Open Questions for Plan 11-02

1. **Ideogram output ratio:** The API call specifies `ASPECT_9_16` but Plan 11-02 should confirm the returned image URL actually resolves to a 9:16 image (or close to it). Ratio-check via image metadata — absolute dimensions are informational.
2. **Node positions in n8n canvas:** The 5 new nodes use manually assigned positions ([1008,640], [1232,640], [1456,640], [1632,720], [1744,720]). After import to n8n Azure, verify they appear in the canvas without overlapping existing nodes. If overlap, nudge positions in n8n UI and re-export.
3. **Supabase `story_expires_at` column type:** Confirmed as TIMESTAMPTZ. The Wizard sends ISO-UTC-Z strings; PostgREST will coerce them correctly. No issue expected.
4. **`📤 Enviar preview imagen` dual-inbound:** This node now receives from both `🔗 Re-attach session data` (single-post path) and `🔗 Re-attach session data (Story)`. n8n handles multiple inbound connections via fan-in — verify this is correct in n8n 2.x after deploy (no known issues, but worth confirming once).

## Self-Check: PASSED

- n8n/workflow.json present and valid JSON ✅
- node count: 78 (pre: 73, delta: +5) ✅
- All 5 Story node IDs: check-is-story, ideogram-generate-story, normalize-image-story, save-session-supabase-story, reattach-session-data-story ✅
- parse-content carries format / aspect_ratio / num_images / story_expires_at ✅
- ¿Imagen propia? FALSE → ¿Story? ✅
- ¿Story? FALSE → ¿Ideogram? (Post path preserved) ✅
- Full Story chain terminates at 📤 Enviar preview imagen ✅
- prepare-whatsapp has isStory, storyDisclaimer, Historia 9:16, tuteo bullets ✅
- prep-rehost-input has Phase 11 guard with data.format === 'story' ✅
- Commit cb5333d present (Task 1 schema probe) ✅
- Commit 419011c present (Task 2 Story branch) ✅
- Commit 190eb26 present (Task 3 disclaimer + guard) ✅
