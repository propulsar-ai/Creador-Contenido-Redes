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

See below (appended after execution).
