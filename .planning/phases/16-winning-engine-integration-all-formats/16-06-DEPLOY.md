# Plan 16-06 — Deploy artifact

**Deployed:** 2026-08-03
**Deployer:** Plan 16-06 (n8n POST + PUT via `/api/v1/workflows`)
**Base URL:** https://n8n-azure.propulsar.ai
**Main workflow ID:** `Qql7mvYRxKBsPZ5t` (Propulsar — Content Engine v3)
**Sub-workflow ID:** `YegOtsUONrRx7v2J` (🎨 Hybrid Image — Flux + Creatomate)

---

## Task 1 — Live sub-workflow creation

`POST /api/v1/workflows` with `{name, nodes, connections, settings}` built from `n8n/subworkflow-hybrid-image.json`. Settings mirrored the rehost sub-workflow's caller policy: `{executionOrder:"v1", callerPolicy:"workflowsFromSameOwner"}`.

**Result:** HTTP 200, new workflow `id: YegOtsUONrRx7v2J`.

| Check | Result |
|---|---|
| `GET /api/v1/workflows/YegOtsUONrRx7v2J` node count | `15` — matches repo exactly |
| Node names (spot-checked) | `▶️ Execute Sub-workflow Trigger`, `🔁 Loop Over Items`, `🧩 Prep Render`, `🔀 ¿Necesita Flux?`, `⚡ Flux Background`, `🧩 Insertar Fondo (Flux)`, `🧩 Insertar Fondo (Skip)`, `🖌️ Creatomate Create`, `⏱️ Check Status`, `✅ ¿Render Completo?`, `✅ Return`, `⏳ Espera 3s`, `🔎 Poll GET Creatomate`, `🔧 Fusionar Resultado Poll`, `🗂️ Collect Results` — all 15 present |
| Project isolation (known gotcha) | `shared[0].projectId = V0T0adLvlGtXOEKf` — **identical** to the main workflow's project and the rehost sub-workflow's (`🔁 Re-host Images`, `BIaG266Q6AZpv4Sq`) project. This n8n instance is single-user with one personal project, so any workflow created by the same API key lands in the same project automatically — no move/share action was needed. |
| `grep -c HYBRID_SUBWORKFLOW_ID n8n/workflow.json` | `0` — placeholder fully replaced in all 3 `executeWorkflow` nodes' `workflowId.value` AND their descriptive `notes` strings |
| `n8n/subworkflow-hybrid-image.json` | `id` field added (`YegOtsUONrRx7v2J`), `settings.callerPolicy` added to match the live deploy |

Commit: `1edba83` (feat(16-06): create live Hybrid sub-workflow and substitute real ID)

---

## Task 2 — Patch-based deploy of the main workflow + canary checks

### Pre-deploy state

- **versionId:** `48202cdc-ffe1-496f-81cd-491d9b875a5d` — matches the expected last-known-good value from Plan 14-03 exactly.
- **active:** `true`
- **Node count:** `92`

### Drift check (remote vs. repo pre-Phase-16 baseline)

Diffed all 92 remote nodes (by id) against `git show 5c05cd2:n8n/workflow.json` (the last commit touching `n8n/workflow.json` before Phase 16's schema work began):

- **Node id parity:** 92 = 92, zero ids only-in-remote, zero ids only-in-baseline.
- **Node-level diff (`type`, `typeVersion`, `parameters`, `credentials`) across all 92 nodes:** **0 diffs.**
- **Connections object:** byte-identical (`JSON.stringify` comparison, `true`).
- **Settings object:** byte-identical.

**Conclusion: zero real drift.** Production and the pre-Phase-16 repo baseline were in perfect byte-identical sync — no out-of-band changes to patch around this time.

### PUT payload construction

Since live == pre-Phase-16 baseline exactly, the current repo `n8n/workflow.json` (baseline + all of Phase 16's own commits through this plan's Task 1) IS the correct patch-based payload — no manual merge needed. Diffed repo vs. baseline to confirm the change-set matches exactly what the plan specified:

**Changed node bodies (7):** `🎠 GPT-4o — Prompts Carrusel`, `🔧 Parsear prompts carrusel`, `🤖 GPT-4o — Texto`, `🔧 Parsear contenido` (16-03 schema hardening) + `🔗 Normalizar URL imagen`, `🔗 Normalizar URL imagen — Story`, `🗂️ Collect Image URLs` (16-04 extraction-node fixes).

**Added nodes (6):** `🧩 Map Hybrid Input (Single)`, `🎨 Hybrid — Single`, `🧩 Map Hybrid Input (Story)`, `🎨 Hybrid — Story`, `🧩 Map Hybrid Input (Slides)`, `🎨 Hybrid — Slides`.

**Removed nodes:** 0.

**Changed connection keys (3):** `🎠 Explode Slides`, `🎨 ¿Ideogram?`, `🔀 ¿Story?` (the 3 retargets, exactly matching the plan's "3 connection retargets").

Node count: 92 → 98 (matches the running total from 16-04's summary).

`settings` trimmed to the 3 PUT-accepted keys (`executionOrder`, `saveManualExecutions`, `callerPolicy`) per the known gotcha (`12.3-03-DEPLOY.md`).

### Deviation found during PUT (Rule 3 — Blocking, auto-fixed)

First PUT attempt returned **HTTP 400**:

> `Cannot publish workflow: Node "🎨 Hybrid — Single" references workflow YegOtsUONrRx7v2J ("🎨 Hybrid Image — Flux + Creatomate") which is not published; ... Please publish all referenced sub-workflows first.`

This n8n instance enforces that any sub-workflow referenced by `source:"database"` Execute Workflow nodes on an **active** caller workflow must itself have a **published (active) version** — contradicting the plan's stated assumption ("Sub-workflows do NOT need `active=true`"). Confirmed by checking the rehost sub-workflow (`BIaG266Q6AZpv4Sq`): it is `active:true` with `activeVersionId` set, matching this pattern.

**Fix:** `POST /api/v1/workflows/YegOtsUONrRx7v2J/activate` → HTTP 200, sub-workflow now `active:true`, `activeVersionId` set. Retried the PUT — succeeded. Purely additive (blocking, not architectural): the sub-workflow's own definition/behavior is unaffected by `active` status; only its callability from an active parent changed.

### PUT result

- **HTTP status:** 200
- **New versionId:** `8b87219d-69e3-41b1-bd63-9af9e3369ec9`
- **active:** `true` (preserved)
- **Node count:** `98`

### Canary checks (byte-level, pre-deploy live vs. post-deploy live)

| Check | Nodes | Result |
|---|---|---|
| (a) Postgres session nodes | `save-session-supabase`, `retrieve-session`, `save-session-carousel`, `save-session-supabase-story` | **PASS** — all 4 byte-identical |
| (b) Rehost chain | `prep-rehost-input`, `execute-rehost-subflow`, `merge-rehost-output`, `delete-azure-blob` | **PASS** — all 4 byte-identical |
| (c) Flux/Nano Banana + router IFs | `flux-generate`, `nano-banana-generate`, `router-if-ideogram`, `router-if-nano` | **PASS** — all 4 byte-identical |
| (d) Dormant Ideogram node bodies | `ideogram-slide`, `ideogram-generate`, `ideogram-generate-story` | **PASS** — all 3 byte-identical (only their incoming connections differ, confirmed separately below) |
| (e) Node count matches repo | — | **PASS** — 98 = 98 |
| (f) 3 executeWorkflow nodes carry the real sub-workflow ID | `hybrid-single`, `hybrid-story`, `hybrid-slides` | **PASS** — all 3 `workflowId.value === "YegOtsUONrRx7v2J"` |
| Dormant Ideogram nodes have zero incoming connections (post-deploy live) | `🔤 Ideogram — Slide`, `🔤 Ideogram v3`, `🔤 Ideogram v3 — Story` | **PASS** — `{0, 0, 0}` incoming edges confirmed by scanning every connection output in the live post-deploy `connections` object |

**All canary checks PASS.** Production main workflow `Qql7mvYRxKBsPZ5t` now carries the full Phase 16 definition (versionId `8b87219d`) with every downstream subsystem proven byte-identical to its pre-deploy state.

Commit: `1edba83` covers Task 1's repo edits; this DEPLOY.md documents Task 2's live deploy (no further repo edits were needed for Task 2 — the deploy consumed the repo state as-is).

---

## Task 3 — Standalone live smoke via disposable harness

### Harness

Created a throwaway workflow (`ZZ-SMOKE-16-06-hybrid (disposable)`, id `IEvrjfQIxumRmI6W`) via `POST /api/v1/workflows`: `Webhook → Extract Body (Code) → Execute Workflow (real Hybrid sub-workflow id, waitForSubWorkflow:true) → Respond to Webhook (allIncomingItems)`. Activated via `POST /activate`.

**Deviation found (Rule 1 — Bug, auto-fixed):** first fire (execution `1826884`) errored inside the sub-workflow's `🧩 Prep Render` node — `unknown layout "undefined"`. Root cause: n8n's Webhook node (typeVersion 2) wraps the POST body under `$json.body` (alongside `headers`/`params`/`query`), so passing the webhook's raw output straight into the Execute Workflow node with `mappingMode:'passthrough'` sent the wrong shape. Fixed by inserting an `Extract Body` Code node (`return $input.all().map(item => ({ json: item.json.body }))`) between the Webhook and the Execute Workflow node, then re-PUT the harness (still `active:true`). This is a harness-only bug — the production main workflow's own `🧩 Map Hybrid Input (*)` nodes already shape their input correctly and were never affected.

### Smoke payload (a) — single layout, real Flux background

Payload: `{index:0, layout:"single", headline:"Automatización para tu clínica veterinaria", body:"Atendé consultas 24/7 sin contratar más personal. Así funciona.", badge:"CASO: VETERINARIA", cta:"Escribinos → propulsar.ai", background_prompt:"Man sitting on a dark blue couch late at night, comforting a sick dog resting on his lap, warm lamp light in background, phone visible on side table, emotional atmosphere, photorealistic, no text overlays, dark background #070A18, purple and magenta gradient accents", width:1080, height:1080}` (fired via a Node `https` request — Windows Git Bash curl+heredoc UTF-8 mangling avoided per the known gotcha; diacritics/em-dash/arrow all confirmed intact in the live execution's captured webhook body).

- **Response:** HTTP 200, `[{"index":0,"imageUrl":"https://f002.backblazeb2.com/file/creatomate-c8xg3hsxdu/1f741d1a-49ce-4ebe-af19-9e9fb76c0828.png"}]`
- **`curl -sI` on the URL:** `200`, `Content-Type: image/png`, `Content-Length: 986146`
- **Visual read (direct image inspection):** headline/body/badge/cta all correct verbatim Spanish text, correct brand palette (dark background, magenta badge pill, cyan CTA pill), photorealistic Flux background (man + dog on a couch, warm lamp) with **no legible text drawn into the photo itself** — confirms the text-bearing-object avoidance rule from Plan 16-05 held on a real render.
- **Sub-execution trace (id `1826902`):** `runData` includes `⚡ Flux Background` — confirms the Flux leg fired for this layout, as expected (`needs_flux:true`).

### Smoke payload (b) — carousel-closing layout, Flux-skip / Creatomate-only

Payload: `{index:0, layout:"carousel-closing", headline:"Empezá hoy con Propulsar", body:"Automatizá tu negocio con IA, sin complicaciones técnicas.", badge:"RESULTADOS REALES", cta:"Escribinos → propulsar.ai", background_prompt:null, width:1080, height:1080}`

- **Response:** HTTP 200, `[{"index":0,"imageUrl":"https://f002.backblazeb2.com/file/creatomate-c8xg3hsxdu/37e9cf58-1c80-418c-a0b2-96ccd18d0e58.png"}]`
- **`curl -sI` on the URL:** `200`, `Content-Type: image/png`, `Content-Length: 50760` (≈19x smaller than payload (a)'s render — consistent with a flat gradient background instead of a photographic Flux image)
- **Visual read (direct image inspection):** headline/body/badge/cta all correct verbatim Spanish text, correct brand palette (near-black gradient background per the `carousel-closing` template's `#070A18`→`#13082B`→`#08031A` stops, magenta badge pill, cyan CTA pill) — no photographic background present, consistent with the Flux-skip path.
- **Sub-execution trace (id `1826916`):** `runData` does **NOT** include `⚡ Flux Background` — took `🧩 Insertar Fondo (Skip)` instead — **proves Flux was skipped for the closing layout**, exactly the intended `needs_flux:false` behavior. Duration 4.5s vs. payload (a)'s 13.2s, consistent with skipping the FAL round-trip.

### Cleanup

- `DELETE /api/v1/workflows/IEvrjfQIxumRmI6W` → HTTP 200
- `GET /api/v1/workflows/IEvrjfQIxumRmI6W` → HTTP 404 (`{"message":"Not Found"}`) — harness confirmed gone.

### Spend (this task)

- 1 Flux call (payload a) ≈ $0.03 — cumulative Phase 16 Flux spend now ≈ $1.02 of the ~$3 budget (never approached).
- 2 Creatomate renders (payload a + b) — cumulative Phase 16 Creatomate credits now ≈ 43 of 2000/month (Essential plan).

**Both smokes PASS. INTEG-01 is now proven live end-to-end via the real production sub-workflow, standalone (no WhatsApp sends, no Meta calls, no real pipeline execution occurred) — live-fires (Plans 16-07..16-09) can proceed.**
