# Architecture Research — v1.3 Diseño Premium

**Domain:** Integrating a template/design-engine image path (Gamma / Creatomate / Remotion) into an existing n8n 2.14.2 content-publishing pipeline
**Researched:** 2026-08-01
**Confidence:** HIGH (existing codebase — full read of `n8n/workflow.json`, `wizard/run.js`, `rehost-service/server.js`) / MEDIUM (Gamma, Creatomate, Remotion current API behavior — web-verified but not live-tested against this account)

---

## Key Findings

1. **It becomes a 4th branch of the `image_model` router, not a replacement — the replacement decision is a separate, later step.** The router is a chain of `IF v1` nodes keyed on the string field `image_model` (`🎨 ¿Ideogram?` → `🎨 ¿NanoBanana?` → implicit Flux default). Adding a new value (e.g. `"premium"`) is additive and reversible; only *after* the quality comparison declares a winner do you optionally repoint the Wizard's default suggestion and the two hardcoded carousel/story selections away from `"ideogram"`. Building it as a hard replacement first would violate the milestone's own "not predetermined" requirement.

2. **The design engine never needs to be Meta-reachable directly.** Every existing image generator (Flux, Ideogram, Nano Banana) outputs a *provider-hosted* URL that gets normalized (`🔗 Normalizar URL imagen`) and then pushed through the **existing rehost sub-workflow** (`🔁 Re-host Images` → Hostinger `rehost-service`) before Meta ever sees it. This is a critical simplification: Creatomate/Gamma/Remotion output URLs (which expire — Creatomate render URLs die after 30 days, Gamma/Remotion outputs are similarly provider-transient) just need to be *fetchable by n8n*, not Meta-acceptable. They slot into the pipeline at the exact same point as the other three generators, before `🔧 Prep Re-host Input`. Everything downstream of rehost (WhatsApp preview, SI approval, Meta publish, Sheets/Postgres log) is **unchanged**.

3. **Templates live in the design engine's own system, not in n8n or the Wizard.** Creatomate templates are authored in Creatomate's visual editor (cloud-hosted, referenced by `template_id`); Remotion templates are React components shipped inside the render-service codebase; Gamma has no per-element template concept (it generates whole decks from a text prompt against a theme, not brand-precise element placement). Brand identity (`#1a1a2e`, purple-magenta gradient, bold Spanish typography) gets baked into the template/composition once, at design time — not re-specified per request. n8n only ever sends **data** (text fields, image URLs, slide index), never design instructions.

4. **GPT-4o → template-variable mapping requires one new Code node per engine, not a change to GPT-4o's own output shape.** The carousel path already produces exactly the right shape for this (`slides: [{ slide_num, texto_overlay, prompt }]` from `🔧 Parsear prompts carrusel`). A new `🔧 Map to Creatomate modifications` (or `...Remotion props`) Code node transforms that existing structure into the engine's expected key names (Creatomate: `{"Headline": "...", "Subhead": "..."}` keyed by *element name* inside the template; Remotion: a JSON `inputProps` object matching the React component's prop types). Slide count maps to *which template/composition* is invoked, reusing the existing per-slide loop (`🎠 Explode Slides` + `SplitInBatches`) — the design engine node simply replaces `🔤 Ideogram — Slide` inside that same loop, one call per slide, unchanged fan-out structure.

5. **Async rendering (Creatomate, and Gamma if used) should reuse the SI/NO approval pattern already proven in this codebase — not n8n's native "Wait for Webhook" resume mode.** The existing WhatsApp approval flow already solves "external async event resumes a specific in-flight post" via **two independent trigger executions correlated through a Postgres row** (`💾 Guardar sesión` → later `📨 Webhook — Reply WA` → `🔍 Recuperar sesión` → `🛡️ Assert Session Found`), not by holding one execution paused in memory. The identical pattern applies to a render-complete webhook: save a session row in a new `rendering` status *before* firing the async render request, let that execution end, and let Creatomate's callback POST start a **second**, independent webhook-triggered execution that recovers the session by `session_id` and continues into the existing normalize→rehost→preview chain. This sidesteps the 65s Wait-persistence floor entirely (no Wait node holds the execution — nothing is "waiting" in n8n's sense, the session is just sitting in Postgres between two separate executions), and it's a pattern the team has already built, tested, and debugged once.

6. **Remotion needs a render service, and it should be a new Azure Container App — not Remotion Lambda.** Remotion Lambda is AWS-only infrastructure; the project's Azure CLAUDE.md stack rules explicitly forbid other-cloud infra for anything not forced by an external constraint (the Hostinger VPS exception for `rehost-service` was forced by Meta rejecting all Azure hostnames — no equivalent constraint exists for Remotion, since its output never needs to be Meta-facing, see Finding 2). `renderStill()` self-hosted (Node + `@remotion/renderer`, bundled headless Chromium) on a Container App with `min-replicas: 1` (to avoid Chromium cold-start inside a single HTTP call) can respond **synchronously** to an n8n HTTP Request node, exactly like the Flux/Ideogram/Nano Banana nodes do today — no polling, no webhook, no new async pattern needed for this specific engine.

7. **A hybrid two-stage option is worth flagging even though it wasn't explicitly asked for**: the milestone goal is "replace Ideogram's diffusion-model text-in-image with a real design/typography engine" — Creatomate/Remotion can composite typography over a *photorealistic background* generated by the existing Flux or Nano Banana nodes (which already produce excellent non-text imagery). This reuses two already-working branches instead of asking a template engine to also pick/generate photography, and is architecturally trivial: the background generator's normalized URL becomes one of the "modifications"/props passed into the template render call. Flag for the comparison phase, not a hard recommendation — the quality comparison should test both "engine generates everything" and "engine overlays on Flux/Nano Banana background" if time allows.

8. **The eval harness must live entirely outside n8n, Postgres, and Meta** to satisfy "avoid real Meta publishes." A standalone Node.js CLI tool (sibling to `scripts/test-webhook.js`, e.g. `scripts/eval-design-engines.js` or `tools/design-engine-eval/`) that calls Azure OpenAI directly (reusing the exact system prompt already in `n8n/workflow.json`'s `🤖 GPT-4o — Texto` node / `prompts/brand-voice.md`) and then calls Ideogram + candidate engine(s) directly, writing results to local disk (+ optional direct-YCloud-send for mobile review), touches zero shared state (`content_sessions`, Google Sheets) and zero Meta Graph API endpoints. This is the only architecture that has literally no path to an accidental live publish.

---

## Standard Architecture

### System Overview (current pipeline, with the new path highlighted)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Wizard (Node.js CLI)                                                    │
│  IMAGE_MODELS = { flux, ideogram, nanoBanana } + [NEW] premium           │
│  suggestModel(type, hasTextInImage) → adds premium-aware branch          │
└───────────────────────────────┬────────────────────────────────────────-┘
                                 │ POST webhook (brief JSON, image_model field)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  n8n main workflow (Azure Container Apps, 92 nodes)                      │
│  ┌────────────┐   ┌──────────────────┐   ┌────────────────────────────┐ │
│  │ GPT-4o text │──▶│ 🎨 image_model    │──▶│ 🎨 ¿Ideogram?  → Ideogram   │ │
│  │ + prompts   │   │    router (IF v1  │   │ 🎨 ¿NanoBanana? → NanoB.   │ │
│  │             │   │    chain)         │   │ [NEW] ¿Premium? → Creato-  │ │
│  │             │   │                   │   │   mate / Remotion / Gamma  │ │
│  │             │   │                   │   │ (else) → Flux              │ │
│  └────────────┘   └──────────────────┘   └──────────────┬─────────────┘ │
│                                                            │              │
│                    ┌───────────────────────────────────────▼───────────┐ │
│                    │ 🔗 Normalize URL (per-engine variant)             │ │
│                    │  [NEW] 🔗 Normalize — Creatomate/Remotion/Gamma   │ │
│                    └───────────────────────────────────────┬───────────┘ │
│                                    (unchanged from here down)            │
│  💾 Save session (Postgres) → 🔗 Re-attach → WA preview → SI/NO webhook  │
│  → 🔍 Recover session → 🔁 Re-host Images (sub-workflow) → Meta publish  │
│  → Sheets log                                                            │
│                                                                            │
│  [NEW — async engines only] 🎯 Webhook — Render Complete                 │
│    → 🔍 Recover session (status='rendering') → normalize → continue      │
│      into the SAME chain above (WA preview onward)                       │
└───────────────────┬──────────────────────────────────┬───────────────────┘
                     │ (sync HTTP, Remotion)             │ (async, Creatomate/Gamma)
                     ▼                                    ▼
┌────────────────────────────┐         ┌──────────────────────────────────┐
│ Remotion render service    │         │ Creatomate (SaaS) — POST /renders │
│ NEW Azure Container App    │         │  webhook_url → n8n Render-Complete │
│ Node + @remotion/renderer  │         │  (or poll GET /renders/{id})      │
│ min-replicas: 1            │         └──────────────────────────────────┘
│ renderStill() sync         │
└────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  rehost-service (Hostinger VPS, unchanged) — receives ANY normalized URL │
│  from ANY of the 4+ engines, re-hosts to a Meta-acceptable hostname       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  [NEW, standalone, isolated] Eval harness                                │
│  scripts/eval-design-engines.js — direct AOAI + direct Ideogram/         │
│  Creatomate/Remotion/Gamma calls. Zero contact with n8n, Postgres,       │
│  Meta Graph API. Output: local HTML/image grid + optional direct-YCloud  │
│  send for mobile review.                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|-----------------|------------------|
| Wizard `IMAGE_MODELS` object | Adds `premium` (or final chosen name) entry: cost, speed, strength, `bestFor` | Modified |
| Wizard `suggestModel()` | Decide when to recommend the new engine vs existing three | Modified |
| Wizard PASO 5 hardcoded carousel/Story model labels | Currently print `"🔤 Ideogram v3 (fijo para carruseles/Historias)"` | Modified (conditionally, post-decision) |
| `🎨 ¿Premium?` IF node (single-post path) | Route `image_model === "<engine-id>"` to the new branch | New |
| Engine call node(s) (single, per-slide, story variants) | HTTP Request to Creatomate/Remotion, or Code+HTTP for Gamma | New |
| `🔧 Map to <engine> variables` Code node | Transform GPT-4o's caption/slide JSON into the engine's template variable / prop schema | New (one per engine under evaluation) |
| `🔗 Normalize URL — <engine>` Code node | Extract final image URL from the engine's response shape (mirrors `🔗 Normalizar URL imagen`) | New |
| `💾 Guardar sesión` (status enum) | Add `'rendering'` as a valid pre-approval status for async engines | Modified (schema + INSERT value) |
| `🎯 Webhook — Render Complete` | New entry-point webhook, receives Creatomate (or Gamma) callback, correlates by `session_id` | New |
| `🔍 Recuperar sesión` (Postgres) | Reused as-is for the render-complete flow (same node, new entry path into it) | Reused unchanged |
| Remotion render service | Renders a still image synchronously from React composition + props | New (Azure Container App) |
| `rehost-service` | Re-hosts whatever URL it's given (image-agnostic already) | Reused unchanged |
| Meta publish nodes (IG/FB single, carousel, Story) | Publish whatever URL the rehost sub-workflow returns | Reused unchanged |
| `scripts/eval-design-engines.js` | Direct-API side-by-side comparison, human review, zero production contact | New, standalone |

---

## Recommended Project Structure (additions only)

```
CreadorContenido/
├── wizard/
│   └── run.js                          # MODIFIED: IMAGE_MODELS + suggestModel()
├── n8n/
│   └── workflow.json                   # MODIFIED: new router branch + normalize node(s)
│                                        #           + new Render-Complete webhook trigger
├── remotion-templates/                 # NEW — only if Remotion wins or is a finalist
│   ├── package.json                    # @remotion/renderer, @remotion/cli
│   ├── src/
│   │   ├── SinglePost.tsx              # Composition: matches Wizard "single" format
│   │   ├── CarouselSlide.tsx           # Composition: reused once per slide
│   │   ├── Story.tsx                   # Composition: 9:16
│   │   └── brand/tokens.ts             # #1a1a2e, gradient stops, type scale — single source
│   └── server.js                       # Express wrapper exposing POST /render (renderStill)
│                                        #   deploy target: NEW Azure Container App
├── scripts/
│   ├── test-webhook.js                 # existing
│   └── eval-design-engines.js          # NEW — standalone comparison harness
├── eval-output/                        # NEW, gitignored — timestamped comparison runs
│   └── 2026-08-0X_HHMM/
│       ├── index.html                  # side-by-side grid
│       ├── ideogram.png
│       ├── creatomate.png
│       └── remotion.png
└── prompts/
    └── brand-voice.md                  # REUSED as the shared source of truth for
                                         #   both n8n's system prompt AND the eval harness
```

### Structure Rationale

- **`remotion-templates/` as its own package, not inside `wizard/` or `n8n/`:** it has its own toolchain (React, `@remotion/renderer`, Chromium binary) and its own deploy target (Container App), unrelated to the CLI Wizard's Node runtime or n8n's JSON workflow definition. Mirrors how `rehost-service/` already exists as its own deployable unit for the same reason.
- **`eval-output/` gitignored:** these are disposable comparison artifacts (images, HTML), not source — consistent with the global WAT convention that `.tmp/`/generated output never gets committed.
- **`prompts/brand-voice.md` reused, not duplicated:** the project already has a documented risk ("Brand voice duplicado — unificar antes de exponer edición desde la GUI" from `CONTENT-STUDIO-GUI-SEED.md`). Building a *third* copy of the brand voice inside the eval harness would make that debt worse. The harness should load and interpolate the same file n8n's system prompt is derived from (today it's hardcoded inline in the `🤖 GPT-4o — Texto` node's `jsonBody` — extracting it to be readable by both n8n and the harness, even as a manual copy-paste-kept-in-sync step for this milestone, is preferable to a third independent prompt).

---

## Architectural Patterns

### Pattern 1: Session-correlated async resume (reuse, don't reinvent)

**What:** Two independent n8n trigger executions, correlated by a `session_id` row in Postgres, instead of one execution paused on an n8n Wait node.
**When to use:** Any external async callback where the wait could exceed a few tens of seconds and must survive a Container App restart/scale event — exactly the WhatsApp SI/NO approval's existing constraint, and identically Creatomate's render-webhook constraint.
**Trade-offs:** Slightly more moving parts (two webhook trigger nodes, one more Postgres status value) than a single paused execution, but it is **the pattern already proven in this exact codebase**, already has its error-handling shape worked out (`🛡️ Assert Session Found`), and completely avoids the documented 65s Wait-persistence gotcha — because nothing is ever "waiting" inside a single n8n execution.

**Example (conceptual, mirrors existing WA approval nodes):**
```
Execution A (webhook trigger from Wizard):
  ...text+prompt generation...
  → 💾 INSERT content_sessions (status='rendering', session_id=uuid)
  → POST https://api.creatomate.com/v1/renders
       { template_id, modifications, webhook_url: `${N8N_BASE}/webhook/render-complete?session_id=${uuid}` }
  → (respond 200 to Wizard immediately — Wizard already doesn't block on publish completion)
  [execution ends here]

Execution B (NEW webhook trigger, Creatomate calls back):
  🎯 Webhook — Render Complete (reads session_id from query string)
  → 🔍 Recuperar sesión (Postgres, existing node — WHERE session_id = $1 AND status='rendering')
  → 🛡️ Assert Session Found (existing pattern)
  → 🔗 Normalize URL — Creatomate (extract render.url from payload)
  → [rejoin existing chain: reattach → WA preview → ...]
```

### Pattern 2: Data-only handoff to the design engine (no design logic in n8n)

**What:** n8n/GPT-4o produces content (headline text, per-slide copy, image prompt for a background), never layout/design decisions. The template/composition owns every visual decision (colors, type scale, safe zones, gradient direction).
**When to use:** Always, for this integration — it's what keeps brand consistency centralized in one place (the template) instead of re-specified per API call the way the Ideogram/Flux prompts currently do (`"— style: dark background #1a1a2e, purple to magenta gradient..."` repeated as a prompt-string suffix in *three different nodes today* — itself a small piece of the "brand voice duplicated" debt this migration can incidentally clean up).
**Trade-offs:** Requires real template-design work up front (in Creatomate's editor, or as Remotion React components) before any wiring happens — this is why it's Phase 3 in the build order below, after the winner is chosen, not before.

### Pattern 3: Engine-agnostic image-in → rehost-out contract

**What:** Every image-producing branch (Flux, Ideogram, Nano Banana, and now the design engine) must terminate in the exact same shape before hitting `🔧 Prep Re-host Input`: `{ final_image_url, ...passthrough fields }`. The rehost sub-workflow, WhatsApp preview, and Meta publish nodes have zero knowledge of which engine produced the URL.
**When to use:** This is already the existing contract — the only new work is writing one more `🔗 Normalizar URL imagen — <engine>` Code node per new engine, matching the pattern of the three that already exist (`normalize-image`, `normalize-image-story`, and the implicit inline extraction for `custom`).
**Trade-offs:** None — this is the reason the 4th-branch approach (Finding 1) is low-risk: it's additive within a contract the codebase already enforces successfully across three providers.

---

## Data Flow

### Request Flow (single-post, async engine — worst case)

```
Wizard → POST webhook (image_model: "premium")
  → GPT-4o text + prompts (unchanged)
  → 🎨 image_model router: NEW branch matches "premium"
  → 🔧 Map to Creatomate modifications (NEW Code node)
  → POST /renders (Creatomate) with webhook_url?session_id=<uuid>
  → 💾 Save session (status='rendering')          [execution A ends]
  ...
  Creatomate finishes render (seconds to ~1 min for a static image, provider-side)
  ...
  → 🎯 Webhook — Render Complete (NEW)              [execution B starts]
  → 🔍 Recover session (status='rendering')
  → 🔗 Normalize URL — Creatomate
  → 🔗 Re-attach session data (existing pattern)
  → 📤 WhatsApp preview (existing, unchanged)
  → [SI] → 🔍 Recover session (existing) → 🔁 Re-host Images (existing)
  → Meta publish (existing) → Sheets/Postgres log (existing)
```

### Request Flow (single-post, Remotion — sync, simplest case)

```
Wizard → POST webhook (image_model: "remotion")
  → GPT-4o text + prompts (unchanged)
  → 🎨 image_model router: NEW branch matches "remotion"
  → 🔧 Map to Remotion props (NEW Code node)
  → POST https://<remotion-container-app>/render  (HTTP Request node, sync, same shape as Flux node)
  → 🔗 Normalize URL — Remotion (NEW, trivial — response is already { url } or binary→rehost directly)
  → [rejoins existing chain immediately, same execution, no session-status change needed]
```

### Key Data Flows

1. **Carousel per-slide loop is unchanged in shape, only the node inside the loop changes.** `🎠 Explode Slides` → `SplitInBatches` → (today: `🔤 Ideogram — Slide`) → (new: the chosen engine's per-slide call). If the engine is async, the *whole loop* needs to either (a) fire all N slide-render requests and wait for N webhook callbacks correlated by `session_id + slide_num`, or (b) — simpler — only make the design engine's carousel path synchronous-capable a hard requirement, given N async callbacks per post multiplies the correlation complexity. **Recommendation: prefer Remotion (sync) or a synchronous polling loop with short waits for the carousel path specifically**, and reserve the async webhook-resume pattern for single-post and Story (1 image each) where the complexity is justified.
2. **Story path mirrors single-post exactly** (already true today — `🔤 Ideogram v3 — Story` is a near-duplicate of `🔤 Ideogram v3` with a different aspect ratio parameter). The same duplication pattern applies for the new engine: one more "Story variant" node/branch with a 9:16 template ID or Remotion composition.
3. **Eval harness has NO data flow into the production system** — it is a dead-end pipeline that starts and ends in `eval-output/`, deliberately disconnected from `content_sessions`, Google Sheets, and Meta Graph API.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| Current (Propulsar's own posting cadence — a few posts/day) | Sync Remotion Container App at `min-replicas: 1` is cheap and simple; Creatomate's async webhook pattern adds no meaningful cost at this volume. |
| If posting cadence grows 10x+ | Creatomate credits scale linearly with volume ($0.013/image on Growth plan) — reevaluate cost vs Remotion self-hosted (near-zero marginal cost once the Container App is warm). Remotion becomes more attractive at scale. |
| Multi-client (if this pipeline is ever templated for other Propulsar clients) | Brand tokens (`remotion-templates/src/brand/tokens.ts` or Creatomate template IDs) would need to become per-client configuration rather than hardcoded — out of scope for v1.3, flag for the Content Studio GUI project. |

### Scaling Priorities

1. **First bottleneck: Remotion Chromium cold start if `min-replicas: 0`.** Azure Container Apps consumption tier scale-to-zero would add 5-15s of cold-start latency to the first render after idle — acceptable for a low-volume personal pipeline but worth pinning `min-replicas: 1` (same tradeoff already made for `rehost-service`'s persistence mount, and consistent with the Azure stack rule that always-on 24/7 apps use Container Apps over Functions).
2. **Second bottleneck: Creatomate's 30-day URL expiry.** Not a scaling concern per se, but a correctness one — reinforces Finding 2 (must rehost immediately, never store Creatomate's own URL as `Imagen_URL` in any log).

---

## Anti-Patterns

### Anti-Pattern 1: Building the "premium" engine as a hard replacement of Ideogram before the comparison is run

**What people do:** Since the milestone's stated end-state is "replace Ideogram's diffusion-model text-in-image," it's tempting to rip out the `🎨 ¿Ideogram?` branch and rewire directly.
**Why it's wrong:** The milestone explicitly requires the replacement decision to be *driven by* the comparison results, not predetermined — Gamma, Creatomate, and Remotion could all lose to Ideogram on some formats (e.g. Ideogram might still win for quick single posts with simple text, while a design engine wins for carousels with heavy typography). Hardcoding a replacement forecloses a "coexist, pick per-format" outcome.
**Do this instead:** Build strictly as a 4th `image_model` value. Only remove/repoint the Ideogram branch in a follow-up phase once the comparison result is in hand and explicit (per the "Ideogram coexistence/replacement decision" requirement in `PROJECT.md`).

### Anti-Pattern 2: Holding an n8n execution open on a Wait node while polling an async render

**What people do:** POST the render request, then `Wait 10s` → `HTTP GET status` → loop with an `IF` back-edge, all inside the same execution — mirroring how the IG container-readiness waits (`⏳ Wait 30s`) work today.
**Why it's wrong:** IG container-readiness waits are short and bounded (Meta's own container prep is fast and consistent). Creatomate/Gamma render times are provider-side and less predictable; a polling loop inside a single execution either (a) risks exceeding a comfortable Wait duration and hitting the documented sub-65s persistence gap repeatedly, or (b) needs Wait durations *above* 65s per poll, adding real latency to something Creatomate's own webhook would signal instantly.
**Do this instead:** Use the webhook-callback + session-correlation pattern (Pattern 1) for genuinely async engines. Reserve in-execution polling only for cases with a known, short, bounded provider processing time (which is exactly why the existing IG/FB container waits are fine as they are — Meta's behavior there is well-characterized from production experience).

### Anti-Pattern 3: Letting the design engine's output URL go straight to Meta

**What people do:** Since Creatomate/Gamma/Remotion outputs are already public HTTPS URLs, it's tempting to skip the rehost sub-workflow "just for this one engine" to save a hop.
**Why it's wrong:** Two independent reasons this breaks: (1) Meta has already demonstrated it selectively rejects entire hosting providers/hostname patterns (Azure Blob + all Azure Front Door domains, confirmed via three controlled tests in v1.2) — an unverified new provider's hostname is an unknown risk, and (2) Creatomate URLs expire after 30 days, which would silently break the audit trail (`Imagen_URL` / IG_URL columns) for any historical lookups.
**Do this instead:** Every engine's output goes through the identical rehost path already proven for Flux/Ideogram/Nano Banana — no exceptions, no format-specific shortcuts.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| Creatomate | REST API, `POST /v1/renders` with `template_id` + `modifications`, async via `webhook_url` (preferred) or poll `GET /v1/renders/{id}` | Render URLs expire after 30 days — must rehost immediately. Webhook payload includes render status (`succeeded`/`failed`) — wire `failed` into existing error-notification path. |
| Remotion (self-hosted) | Internal HTTP, `POST /render` on a new Azure Container App, synchronous `renderStill()` response | No external account/API key — this is Propulsar's own deployed service, same operational model as `rehost-service`. |
| Gamma | REST API, `X-API-KEY` header, `POST` to Generate API — produces a *deck/presentation*, export as PNG per card | Weakest architectural fit for a single Instagram-post image (deck-oriented, not element-precise template) — evaluate in the comparison phase but expect it to need the most post-processing (crop/select one card) or to lose on brand precision. |
| Azure OpenAI (existing) | Unchanged — same `🤖 GPT-4o — Texto` / `🎠 GPT-4o — Prompts Carrusel` nodes feed all engines identically | No changes needed to the text-generation layer itself, only to what happens with `image_prompt`/`texto_overlay` downstream. |
| `rehost-service` (existing) | Unchanged — image-agnostic PUT/GET/DELETE over any binary | Confirms no changes required here for this milestone. |
| Meta Graph API (existing) | Unchanged | Publish nodes have no knowledge of which engine produced the image. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|-----------------|-------|
| Wizard ↔ n8n | Webhook POST, brief JSON `image_model` field gets one new valid value | Wizard has zero knowledge of Creatomate/Remotion internals — same "delegate everything downstream" boundary that already exists for the other three engines. |
| n8n main workflow ↔ Remotion render service | Synchronous HTTP Request node, same pattern as Flux/Ideogram/Nano Banana HTTP calls | Treat as a 4th "generator," not a special case. |
| n8n main workflow ↔ Creatomate | Fire-and-continue (execution A) + separate webhook trigger (execution B), correlated via `content_sessions.session_id` | New webhook endpoint = new attack surface; needs the same lightweight validation the existing `📨 Webhook — Reply WA` has (verify session exists before trusting payload). |
| `content_sessions` (Postgres) ↔ pipeline | New `status='rendering'` enum value, read/written by two different executions | Schema change: either widen the existing `status` column's implicit contract (it's currently `'pending'` → `'approved'`/`'rejected'`/etc., informal) or add an explicit check — flag for the phase that touches the DDL. |
| Eval harness ↔ everything else | **None, by design** | This is the one boundary that must remain absolutely closed — no shared credentials scope beyond read-only AOAI/Ideogram/Creatomate/Remotion API keys, no Postgres connection, no Meta token. |

---

## Suggested Build Order

Ordered by dependency — each phase produces something independently verifiable before the next begins.

### Phase A — Eval harness (Gamma + Creatomate only; API-only, no deploy needed)
**Deliverable:** `scripts/eval-design-engines.js` runs a fixed test brief through GPT-4o once, then Ideogram (baseline) + Gamma + Creatomate in parallel, writes `eval-output/<timestamp>/index.html`.
**Why first:** Zero infrastructure dependency (pure API calls), produces the comparison data needed for every subsequent decision, and has zero production risk by construction.
**Dependencies:** None beyond obtaining Gamma + Creatomate API keys.

### Phase B — Minimal Remotion render service + harness extension
**Deliverable:** `remotion-templates/` with 1 rough-draft composition (not final brand polish yet — just enough to render *something* comparable), deployed to a throwaway/dev Container App; harness extended to call it as a 4th candidate.
**Why second, not first:** Unlike Gamma/Creatomate, Remotion requires a deployed service to exist before it can even be evaluated — this is the one engine with a build step before comparison is possible.
**Dependencies:** Phase A's harness structure (reuse the same fixed test briefs + output format).

### Phase C — Run comparison, human review, DECISION
**Deliverable:** A recorded decision (in `PROJECT.md` Key Decisions table, or a dedicated decision doc): winning engine, and explicit Ideogram coexist-vs-replace call, per format if they differ.
**Why here:** This is the actual "not predetermined" gate the milestone requires — no production wiring happens before this.
**Dependencies:** Phase A + B outputs.

### Phase D — Production templates/compositions for the winner
**Deliverable:** Brand-final Creatomate template(s) (single/carousel-slide/Story, in the Creatomate editor) OR brand-final Remotion compositions (in `remotion-templates/src/`), matching `#1a1a2e` + gradient + typography exactly.
**Dependencies:** Phase C decision.

### Phase E — n8n wiring: new router branch + normalize node(s) + (if async) Render-Complete webhook + session-status schema change
**Deliverable:** `image_model` router has the new branch; per-format variants (single/carousel-loop/Story) call the winning engine; async correlation pattern (Pattern 1) implemented and tested with a real Creatomate webhook round-trip if applicable.
**Dependencies:** Phase D (needs real template/composition IDs to call).
**Pre-task:** Verify Creatomate webhook payload shape and failure-status handling with a live test call before wiring the failure branch into the existing error-notification path.

### Phase F — Wizard changes
**Deliverable:** New `IMAGE_MODELS` entry, `suggestModel()` updated, carousel/Story hardcoded model labels repointed if the decision was "replace."
**Dependencies:** Phase E (needs the exact `image_model` string value the n8n router now expects).

### Phase G — v1.2 carry-over: live-fire spot-check of single + carousel post-Postgres-migration
**Deliverable:** Confirms the *existing* Ideogram/Flux/Nano Banana paths still work end-to-end after the Supabase→Postgres migration (unrelated to the design engine work).
**Recommendation: sequence this BEFORE Phase E, not after.** It's an independent regression check on infrastructure that changed in v1.2 (Postgres migration) — running it after Phase E's new session-status/webhook changes would make any Postgres-related bug harder to isolate from new design-engine-related bugs. Doing it early also validates that `content_sessions` recovery (the exact mechanism Pattern 1 depends on) is solid before building new logic on top of it.

**Suggested overall ordering: G → A → B → C → D → E → F.**

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Existing pipeline structure (router, normalize, rehost, publish) | HIGH | Full `n8n/workflow.json` read — exact node names, IF conditions, jsonBody templates confirmed |
| Session-correlation pattern reuse for async | HIGH | Directly mirrors the existing, already-shipped WA-approval mechanism in the same codebase |
| Remotion self-hosted sync feasibility | MEDIUM | `renderStill()` is documented for exactly this use case; exact latency for this project's specific composition complexity is unverified until Phase B |
| Creatomate webhook payload shape / failure signaling | MEDIUM | Confirmed webhook + status-field pattern exists via official docs; exact JSON shape needs a live test call before Phase E |
| Gamma architectural fit for single-image brand-precise posts | MEDIUM-LOW | Gamma's Generate API is deck/presentation-oriented (confirmed via official docs); per-element brand precision for a single social post is plausible but unverified — treat as the most likely comparison "loser" going in, not a foregone conclusion |
| 30-day Creatomate URL expiry / rehost necessity | MEDIUM | Reported consistently across secondary sources (pricing/comparison pages), not confirmed directly in Creatomate's own reference docs during this research pass — verify during Phase E, but the "always rehost regardless" recommendation holds even if this specific number is off |

---

## Open Questions

1. **Exact Creatomate webhook JSON shape** (field names for status, output URL, error message) — needs a live test render before building the `🔗 Normalize URL — Creatomate` node and the failure-branch wiring.
2. **Remotion render latency for the actual brand composition** (not a trivial "hello world" still) — determines whether `min-replicas: 1` sync HTTP is comfortably under n8n's HTTP Request node timeout, or whether Remotion also needs the async pattern.
3. **Carousel path for async engines** — flagged as a real complexity risk in Data Flow #1; needs an explicit decision in Phase C/D whether the carousel format is restricted to sync-capable engines only, or whether multi-slide async correlation (session_id + slide_num) gets built.
4. **`content_sessions.status` enum widening** — whether `'rendering'` is added as a first-class value or handled some other way is a small DDL decision that should happen in the same phase as the Postgres-touching work (Phase E), not left implicit.
5. **Gamma per-card PNG export granularity for a single-slide extract** — whether Gamma's export produces one clean image suitable for a single Instagram post, or requires selecting/cropping from a full-deck export, is unverified and should be resolved empirically in Phase A.

---

## Sources

- Direct codebase analysis: `n8n/workflow.json` (4255 lines, all node definitions read), `wizard/run.js` (IMAGE_MODELS, suggestModel, PASO 5/6 flow), `rehost-service/server.js` (full file, 116 lines)
- `.planning/PROJECT.md`, `.planning/research/CONTENT-STUDIO-GUI-SEED.md`, prior-milestone `.planning/research/ARCHITECTURE.md` and `STACK.md` (v1.2 Stories) for established patterns and confirmed constraints
- [Gamma Developer Docs](https://developers.gamma.app/) — Generate API v1.0 GA Nov 2025, image models, `X-API-KEY` auth, PNG-per-card export — MEDIUM confidence (web search + docs pages, not hands-on tested)
- [Creatomate — Create a Render](https://creatomate.com/docs/api/reference/create-a-render), [The render object](https://creatomate.com/docs/api/rest-api/the-render-object), [Webhooks](https://creatomate.com/docs/api/rest-api/webhooks) — MEDIUM confidence, async pattern and `modifications`/`webhook_url` parameters confirmed; exact payload shape not directly retrieved
- Creatomate pricing/URL-expiry — MEDIUM-LOW confidence, secondary comparison sources (not Creatomate's own pricing page directly)
- [Remotion — renderStill()](https://www.remotion.dev/docs/renderer/render-still), [Comparison of server-side rendering options](https://www.remotion.dev/docs/compare-ssr), [Remotion Lambda FAQ](https://www.remotion.dev/docs/lambda/faq) — HIGH confidence for the self-hosted-vs-Lambda tradeoff (official docs), MEDIUM for this project's specific expected render latency (unverified until Phase B)

---
*Architecture research for: Propulsar Content Engine v1.3 — Diseño Premium*
*Researched: 2026-08-01*
