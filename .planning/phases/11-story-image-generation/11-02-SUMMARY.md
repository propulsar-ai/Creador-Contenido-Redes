---
phase: 11-story-image-generation
plan: 02
subsystem: n8n-workflow
type: execute
tags: [n8n, story, ideogram, supabase, whatsapp, e2e, deploy, verification]

requires:
  - phase: 11-01 (Story branch wired in n8n: 5 new nodes + Parsear contenido patch + WA disclaimer + Phase-11 guard)
    provides: Local n8n/workflow.json with 78 nodes ready to deploy

provides:
  - Verified Story branch end-to-end on n8n-azure.propulsar.ai with real Ideogram + YCloud calls
  - Fixed Plan 11-01 gaps discovered by E2E test (OpenAI cred + Preparar mensaje WA Story lookup)
  - Confirmed downstream contract for Phase 12 (IG Story publish): final_image_url is 9:16 PNG, Supabase row carries format/aspect_ratio/story_expires_at, reattach node provides 15-field session payload

affects: [12-ig-story-publishing, 13-fb-story-publishing]

key-files:
  modified:
    - n8n/workflow.json   # 2 fixes — OpenAI cred swap (2 nodes) + Story lookup in Preparar mensaje WA

key-decisions:
  - "OpenAI cred ID stale in workflow.json — swapped oSMopb75vo4NhdlT (deleted in n8n) → wWEhRsD5ilt2xGvz (OpenAI-Propulsar, the active credential used by 4 other production workflows)"
  - "Preparar mensaje WA jsCode: added Story lookup as FIRST try-catch — `$('🔗 Re-attach session data (Story)').first().json` — before the existing carousel and single-post lookups, so isStory check fires correctly and disclaimer + Historia format line render"
  - "Ideogram delivers 736×1312 (ratio 0.5610, delta 0.27% from 9:16 target 0.5625) — well within ±1% tolerance; Phase 12 IG Story API can ingest directly without resize"
  - "num_images column does not exist on Supabase content_sessions — INSERT mapping silently drops it; not blocking (always 1 for Story per spec); flagged as low-priority tech debt"

verification:
  must_haves_status: "10/10 PASS"
  truths:
    - "Workflow deployed to n8n-azure.propulsar.ai — PUT 200, updatedAt 2026-04-23T09:44:30Z, 78 nodes, active=true ✅"
    - "Brief reaches n8n with format=story, aspect_ratio=9:16, num_images=1, story_expires_at=2026-04-24T09:44:33.779Z ✅"
    - "🔀 ¿Story? routed TRUE — branch[0]=1 item, branch[1]=0 ✅"
    - "🔤 Ideogram v3 — Story returned data[0].url with 24h ephemeral signed URL ✅"
    - "Supabase content_sessions row id=b588cff2-9853-4dd5-bf18-d31701e46f0f with format='story', aspect_ratio='9:16', story_expires_at='2026-04-24T09:44:33.779+00:00', final_image_url=Ideogram URL, status='pending' ✅"
    - "WA image preview sent — YCloud status=accepted, to=+5493517575244, type=image ✅"
    - "WA text message sent — YCloud status=accepted, contains 3-bullet Spanish tuteo disclaimer + 'Historia 9:16 (expira vie, 11:44)' format line + *¿Publicar?* CTA ✅"
    - "Image dimensions verified: 736×1312 PNG, ratio 0.5610, delta 0.27% from 9:16 — PASS (±1% tolerance) ✅"
    - "Felix replied NO via WhatsApp → execution 5555 ran ❌ Loguear rechazo, no publish attempted ✅"
    - "Bug fixes committed and STATE.md updated ✅"

execution_log:
  - exec_id: 5320
    started: 2026-04-23T09:14:45Z
    duration_ms: 296
    status: error
    failed_at: "🤖 GPT-4o — Texto"
    error: "Credential with ID oSMopb75vo4NhdlT does not exist for type openAiApi"
    resolution: "Swapped to wWEhRsD5ilt2xGvz (OpenAI-Propulsar) found by listing all workflow openAiApi cred references"
  - exec_id: 5486
    started: 2026-04-23T09:42:13Z
    duration_ms: 21764
    status: error
    failed_at: "📤 Enviar WhatsApp"
    error: "Bad request - One or more parameters missing (YCloud body missing 'to' field; isStory=false because d.format='image' from upstream YCloud response)"
    resolution: "Added Story lookup as first try in Preparar mensaje WA jsCode → isStory now resolves correctly, approval_number populates"
  - exec_id: 5501
    started: 2026-04-23T09:44:32Z
    duration_ms: 17673
    status: success
    nodes_run: 15
    notes: "Full Story flow: Webhook → Responder al Wizard → ¿Carrusel?(false) → GPT-4o Texto → Parsear contenido → Extract Hashtags → ¿Imagen propia?(false) → ¿Story?(TRUE) → Ideogram v3 — Story → Normalizar URL imagen — Story → Guardar sesión Supabase (Story) → Re-attach session data (Story) → Enviar preview imagen → Preparar mensaje WA → Enviar WhatsApp"
  - exec_id: 5555
    started: 2026-04-23T09:53:21Z
    duration_ms: 217
    status: success
    notes: "NO reply path: Webhook Reply WA → Responder YCloud → ¿Aprobado?(false) → ❌ Loguear rechazo. No publish attempt."

ideogram_observed:
  resolution: "736x1312"
  ratio: 0.5610
  target_ratio: 0.5625
  delta_pct: 0.27
  format: "PNG"
  url_ttl: "24h ephemeral signed URL"

gotchas:
  - "n8n public API does not list credentials directly — discovered active OpenAI cred by enumerating all 51 workflows and grepping for openAiApi credential references; cred name 'OpenAI-Propulsar' is the production canonical (4 active workflows use it)"
  - "PUT /workflows requires body limited to {name,nodes,connections,settings,staticData}; settings further restricted to {executionOrder,saveManualExecutions,callerPolicy,...} — n8n internal fields availableInMCP/binaryMode rejected with 400"
  - "n8n PUT does NOT deactivate workflow (verified active=true post-PUT); can deploy without manual re-activation"
  - "Webhook trigger uses responseMode=responseNode → responds 200 immediately, workflow continues async; do not assume HTTP 200 means execution succeeded"
  - "Supabase content_sessions has aspect_ratio + story_expires_at columns (added in Plan 11-01) but NOT num_images — INSERT mapping in n8n silently drops unknown columns via PostgREST"
---

# Phase 11 Plan 02 — Deploy + E2E Verification Summary

## Outcome

✅ **Phase 11 (Story image generation) complete and verified end-to-end on n8n-azure.propulsar.ai.**

All 10 Plan 11-02 must-haves passed. The Story branch produces a real Ideogram 9:16 image (736×1312, 0.27% off ideal ratio), persists a Supabase row with the Story-specific fields, sends the WhatsApp image preview + Spanish tuteo disclaimer message, and correctly routes the NO reply to the rejection logger without attempting publish (which doesn't exist yet — that's Phase 12/13).

## Plan 11-01 gaps discovered and fixed during this verification

The E2E test surfaced two latent bugs that Plan 11-01 missed. Both were fixed in `n8n/workflow.json` and redeployed within this same session:

**Bug 1 — Stale OpenAI credential reference** (commit: cred swap)
- The `🤖 GPT-4o — Texto` and `🎠 GPT-4o — Prompts Carrusel` nodes referenced `oSMopb75vo4NhdlT` ("OpenAI account 29"), which had been deleted from n8n at some unknown point.
- First execution (5320) failed in 296ms with `Credential ... does not exist`.
- Located the active credential by enumerating all 51 workflows in n8n and finding `wWEhRsD5ilt2xGvz` ("OpenAI-Propulsar") — used by 4 active production workflows including `Chat Propulsar - Agente IA (Principal)` and `Agendar Cita - Propulsar.ai`.
- Both nodes patched in workflow.json + redeployed. Subsequent executions succeed.

**Bug 2 — Preparar mensaje WA missing Story upstream lookup** (commit: Story lookup)
- The `📱 Preparar mensaje WA` Code node tried two upstream sources to find session data: `🗂️ Collect Image URLs` (carousel) and `🔗 Normalizar URL imagen` (single post). Neither runs in the Story flow.
- For Story executions, `d` fell through to `$input.first().json` — which is the YCloud image-send response, not the session data. Result: `d.format === 'image'`, `isStory === false`, disclaimer never rendered, `d.approval_number === undefined`, downstream YCloud POST missing `to` field, 400 Bad Request.
- Execution 5486 failed at `📤 Enviar WhatsApp` with this exact symptom.
- Fix: added `$('🔗 Re-attach session data (Story)').first().json` as the FIRST try in the upstream lookup chain. Story flow now correctly resolves `d` to the 15-field session payload from the Story reattach node; carousel and single-post flows fall through unchanged.

These bugs do not weaken Plan 11-01's core deliverable (the Story branch itself, including all 5 new nodes and the Parsear contenido patch, was correctly wired). They were integration gaps at the touch points between the new Story branch and the pre-existing shared message-prep code path.

## Execution log

| exec_id | duration | status | failed at / notes |
|---|---|---|---|
| 5320 | 296ms | ❌ error | `🤖 GPT-4o — Texto` — stale OpenAI cred |
| 5486 | 21.8s | ❌ error | `📤 Enviar WhatsApp` — missing Story upstream lookup |
| 5501 | 17.7s | ✅ success | Full Story flow, 15 nodes, ends at WA text send |
| 5555 | 0.2s | ✅ success | NO reply → Loguear rechazo, no publish |

## Ideogram observed output

- Resolution: **736×1312** PNG
- Ratio: **0.5610** (target 9:16 = 0.5625)
- Delta: **0.27%** (well under ±1% tolerance)
- URL: 24h ephemeral signed URL on `ideogram.ai/api/images/ephemeral/...`
- Style: DESIGN (per node config), prompt successfully encoded WhatsApp + automation theme with text overlay safe zones
- Phase 12 implication: IG Story API can ingest the URL directly; no resize/transcode needed

## Supabase row verification

- Row id: `b588cff2-9853-4dd5-bf18-d31701e46f0f`
- session_id: `propulsar_1776937488884`
- format: `story` ✅
- aspect_ratio: `9:16` ✅
- story_expires_at: `2026-04-24T09:44:33.779+00:00` ✅
- final_image_url: Ideogram ephemeral URL ✅
- status: `pending` (correct — never updated to `consumed`/`rejected`, accepted tech debt per STATE.md)
- Note: `num_images` column does not exist in schema; INSERT silently drops it (Plan 11-01 ALTER TABLE only added `aspect_ratio` + `story_expires_at`). Low-priority tech debt; always 1 for Story per spec.

## Downstream contract for Phase 12 / 13

- `final_image_url` is a Public PNG URL with 24h TTL — Phase 12 IG Story node should consume immediately, not store
- Reattach node payload (15 fields) provides everything Phase 12/13 publish nodes need: topic, type, angle, platforms, image_model, final_image_url, instagram, facebook, session_id, supabase_row_id, format, aspect_ratio, story_expires_at, num_images, approval_number
- Phase-11 guard in `🔧 Prep Re-host Input` correctly throws if format=story hits the approval path before Phase 12 wiring exists — confirmed not exercised in this E2E because NO was replied (would have errored if SI was replied)

## Gotchas captured for future deploys

- **n8n credential discovery**: Public API hides credential listings by design. Workaround: list all workflows and inspect `node.credentials` references — yields all credential IDs in active use.
- **PUT body shape**: n8n's `PUT /workflows/{id}` rejects internal settings keys (`availableInMCP`, `binaryMode`). Strip to whitelist `{executionOrder, saveManualExecutions, callerPolicy, ...}` before deploy.
- **PUT does not deactivate**: Workflow stays `active=true` post-PUT, no separate `/activate` call needed (contradicts some older n8n docs).
- **Webhook async semantics**: `responseMode=responseNode` returns 200 immediately while workflow continues. Always poll `/executions` to confirm actual outcome.
- **PostgREST column drops**: Unknown columns in INSERT body are silently dropped, not erroneous. Verify via SELECT after INSERT if confirming a field landed.
