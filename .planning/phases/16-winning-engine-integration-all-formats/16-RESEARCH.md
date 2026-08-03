# Phase 16: Winning-Engine Integration (All Formats) - Research

**Researched:** 2026-08-03
**Domain:** n8n workflow integration — chaining 2 external APIs (FAL Flux, Creatomate) to replace a single-call image provider (Ideogram) across 3 format branches, GPT-4o prompt-schema rework
**Confidence:** HIGH (codebase architecture — read directly) / MEDIUM-LOW (Creatomate/FAL current $ pricing — official pages are JS-rendered, third-party aggregators disagree)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Creatomate plan & budget**
- Claude researches current Creatomate pricing at phase start and presents a recommendation (monthly cost computed from real posting volume) at a checkpoint — the user contracts with card only then.
- Contracting happens AT PHASE START (user preference — don't interrupt mid-phase). Spending cap: up to ~$50/month.
- Flux backgrounds ($0.03 via FAL) budgeted separately: ~$3 total for this phase's tests including re-fires — escalate only if exceeded (Phase 14 pattern).
- ~5 trial credits remain — usable for early dev smoke tests before the paid plan lands.

**Replacement behavior (router)**
- `image_model: "ideogram"` routes to the Hybrid pipeline — transparent replacement. The Ideogram code stays dormant in the workflow, restorable manually as emergency fallback only.
- Validation period: 10 real published posts with the Hybrid — after that, the Ideogram code may be deleted (likely at v1.3 close or v1.4).
- Gamma stays available STANDALONE, on demand — NOT wired into the n8n router. The eval harness (`scripts/eval-design-engines.js`), Propulsar theme (`themeId ergo9wmo77nbvra`), and GAMMA_API_KEY remain working and documented so the user can generate Gamma images ad-hoc "para algo en particular". Zero pipeline maintenance burden.
- Flux and Nano Banana router branches stay untouched — they serve photorealism WITHOUT text; the Hybrid replaces only Ideogram's text-in-image role.

**Backgrounds & the castellano rule**
- HARD RULE (user emphasized): any chat/phone screen shown in a generated image must have LEGIBLE text, always in castellano. Implementation mechanic (Claude's): chat content is NEVER left to Flux generation — when a chat appears, it is COMPOSED as a design element (Creatomate overlay with real text bubbles, or a real mockup asset). Flux renders the scene; Creatomate renders ALL legible text.
- Flux prompts therefore avoid asking the model to draw readable text of its own; screens that appear incidentally in backgrounds must not carry fake/illegible text.
- Background prompt sourcing — all three paths coexist: (1) a pre-populated prompt bank (by post type/slide position), (2) user-provided prompt in the brief (optional field), (3) GPT-4o-generated with a hardened system template (brand atmosphere + no-illegible-text rules). The Wizard surface for choosing among these lands in Phase 17; this phase implements the n8n support.
- Atmosphere follows slide position (replicating the real July carousels): slide 1 warm/emotional (person, situation), middle slides tech/modern, closing slide text-only without image.
- Rejection path for a bad background THIS PHASE: the existing WhatsApp preview + NO → regenerate. No automatic vision-based detection.

**Live-fires & cleanup**
- Identical protocol to Phase 14 (locked): test content deleted after verification; evidence captured BEFORE deletion (media IDs, permalinks, raw responses, Sheets row); WhatsApp 24h-window checkpoint + YCloud GET delivery verification before each fire; programmatic verification (Postgres content_sessions, Sheets exact-column check, YCloud, n8n node outputs) + user visual confirmation; FB posts deleted via Graph API; IG posts manual in-app deletion at end-of-phase checkpoint; Sheets rows stay as evidence.
- 3 sequential fires: single first (cheapest smoke of the shared path) → carousel (multi-slide + visual consistency) → story (9:16). Each with its own checkpoints.
- Auto-fit: batch offline FIRST (INTEG-05). Generate ~10 real GPT-4o captions (long, accented, punctuation-heavy) and render them offline against the templates BEFORE touching production — live-fires run already tuned.
- Test story: immediate manual deletion checkpoint — user deletes it in-app (IG and FB) as soon as verified (stories aren't API-deletable).

### Claude's Discretion
- Replacement mechanics details within "ideogram routes to Hybrid" (node wiring, patch-based deploys per established discipline)
- Chat-mockup composition technique (Creatomate bubbles vs mockup asset)
- Prompt bank contents and GPT-4o template hardening
- Exact offline auto-fit test set and tuning thresholds
- Fire scheduling/order details within single → carousel → story

### Deferred Ideas (OUT OF SCOPE)
- In-app review/approval UI replacing the WhatsApp phone preview — user restated this desire explicitly. This is GUI-02 of the separate Content Studio GUI project. This phase keeps WhatsApp SI/NO as the approval path.
- Wizard surfacing of the prompt-bank/user-prompt/GPT choice — Phase 17 (INTEG-07 territory).
- Deleting Ideogram code — after the 10-real-posts validation period, v1.3 close or v1.4.
</user_constraints>

## Summary

Phase 16 wires the Phase 15 winner (FAL Flux 2 Pro background + Creatomate typographic overlay, "Hybrid") into `n8n/workflow.json` as the new implementation behind `image_model: "ideogram"`. The codebase investigation surfaced a critical architectural fact the planner must design around: **the current router only exists for the single-post format.** Carousel and Story do NOT branch on `image_model` at all today — both are hardcoded to call Ideogram directly, bypassing the flux/nanoBanana/ideogram IF-chain entirely. This means Phase 16 touches three separate call sites (single, story, carousel-per-slide), not one router branch feeding three downstream renderers.

The second major finding is a GPT-4o prompt-schema gap: today's three text-generation call sites (`🤖 GPT-4o — Texto` for single/story, `🎠 GPT-4o — Prompts Carrusel` for carousel) only produce a single natural-language `image_prompt`/`prompt` string per unit (Ideogram/Flux/NanoBanana's native input shape). The Creatomate templates from Phase 15 (`creatomate/templates/*.json`) require four **separate** fields — `HEADLINE`, `BODY`, `BADGE`, `CTA` — plus, for the Hybrid's Flux stage, a text-free `background_prompt`. None of today's production GPT-4o system prompts emit this shape. This is the largest net-new build surface in the phase, not the FAL/Creatomate API integration itself (both engines are already live-proven end-to-end in `scripts/eval-design-engines.js` and Plan 15-01/15-04).

The third finding is a genuine bug/simplification in the Phase 15 eval harness that must NOT be carried into production: `callHybrid()`'s carousel path returns `{skipped: true}` for any slide with no `background_prompt` (i.e. every closing slide) — meaning the eval literally produced zero images for closing slides (12 vs 17 renders for other engines). The brief data's own documentation (`background_prompt_note` in `eval-briefs.json`) says the *intended* behavior is a Creatomate-only render (skip Flux, still render text on the brand gradient via `carousel-closing.json`, which has no `BACKGROUND_URL` token at all). Production must implement the intended behavior, not the harness's skip-shortcut.

**Primary recommendation:** Build the Hybrid image generation as a single reusable n8n sub-workflow (FAL call → Creatomate render-create → Wait/poll loop → return `imageUrl`), parametrized by `{layout, headline, body, badge, cta, backgroundPrompt, width, height}`, called via `Execute Workflow` from 3 sites (single, story, per-carousel-slide) — mirroring the existing `🔁 Re-host Images` sub-workflow pattern already proven in this codebase. Harden all 3 GPT-4o prompt nodes to emit the new field schema (headline/body/badge/cta/background_prompt/layout) while preserving the legacy `image_prompt` field for the dormant Flux/NanoBanana/Ideogram-fallback branches. Confirm Creatomate's exact live-checkout price before contracting (official pricing page is JS-rendered and third-party aggregators disagree by ~30%).

## Standard Stack

### Core (already proven in this repo — no new libraries)
| Component | Version/Endpoint | Purpose | Evidence |
|---|---|---|---|
| FAL Flux 2 Pro | `fal-ai/flux-pro/v1.1`, sync endpoint `https://fal.run/fal-ai/flux-pro/v1.1` | Background image generation, text-free | Already in production (`⚡ Flux 2 Pro (FAL.AI)` node, `flux-generate`), byte-identical params reused in `eval-design-engines.js` |
| Creatomate REST API | `/v1` (NOT `/v2` — confirmed 404 on this account) | Typographic overlay render (headline/body/badge/cta + optional background image) | Confirmed live in Plan 15-01/15-04; `POST /v1/renders` with body `{output_format, width, height, source: {elements}}`, poll `GET /v1/renders/{id}` until `status === "succeeded"` |
| Creatomate RenderScript templates | `creatomate/templates/{single,carousel-opening,carousel-middle,carousel-closing,story}.json` | 5 brand-locked layouts, placeholder substitution (`{{HEADLINE}}`, `{{BODY}}`, `{{BADGE}}`, `{{CTA}}`, `{{BACKGROUND_URL}}`) | Built + user-approved in Plan 15-01, EVAL-01 satisfied |
| Azure OpenAI GPT-4o | deployment `gpt-4o`, api-version `2024-10-21`, endpoint `propulsar-prod-aoai.openai.azure.com` | Caption + image-prompt generation | Existing nodes `🤖 GPT-4o — Texto`, `🎠 GPT-4o — Prompts Carrusel`; credential `AOAI-ApiKey-Header` (id `Ee94gCuHBqdFr2wy`) |
| n8n HTTP Request node | typeVersion 4.2 | All external API calls | Existing convention throughout `n8n/workflow.json` |
| n8n Execute Workflow node | typeVersion 1.2, `waitForSubWorkflow: true` | Sub-workflow reuse pattern | Existing precedent: `🔁 Re-host Images` (`execute-rehost-subflow`, workflow ID `BIaG266Q6AZpv4Sq`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| n8n-native poll loop (HTTP Request + Wait + IF) | Dedicated Azure Function/Container App orchestrating FAL+Creatomate | Rejected — fails the 8-señales test (Regla 4, global CLAUDE.md): no special libraries needed, <30 lines of actual orchestration logic, latency (~10-13s) is acceptable for a human-approval-gated flow (not real-time), and the poll-loop pattern is "new-but-simple" per `STATE.md`'s own assessment. Stay in n8n. |
| Single shared sub-workflow (Hybrid call, 3 call sites) | 3 separate inline HTTP-node chains (mirroring today's 3 separate inline Ideogram nodes) | Recommended: sub-workflow. Today's 3 Ideogram call sites are each a single HTTP node (cheap to triplicate). The Hybrid call is FAL + Creatomate-create + poll-loop (4-5 nodes) — tripling that is real duplication risk (a poll-loop bug fixed in one branch but not the other two). A sub-workflow keeps one canonical implementation, consistent with the existing `Re-host Images` precedent and CLAUDE.md anti-pattern #7 ("no reimplementar la misma lógica en múltiples contextos"). |

**No new npm/package installation required** — this is pure n8n workflow JSON + Azure OpenAI prompt changes. The only new *credential* is `CREATOMATE_API_KEY`, currently local-.env-only (used by the disposable eval harness); it must be added as a production env var (likely `secretRef` backed by Key Vault, matching the existing `FAL_API_KEY`/`IDEOGRAM_API_KEY` pattern — both are referenced as `$env.FAL_API_KEY` / `$env.IDEOGRAM_API_KEY` in `n8n/workflow.json`, i.e. plain Container App env vars, not n8n credential entities).

## Architecture Patterns

### Finding #1 (HIGH confidence, read directly from `n8n/workflow.json`): the router only governs the single-post format

```
🎯 Webhook Trigger
  └─▶ 🔀 ¿Carrusel? (checks $json.body.format === 'carousel')
        ├─ TRUE  ─▶ 🎠 GPT-4o — Prompts Carrusel ─▶ ... ─▶ 🎠 Explode Slides ─▶ 🔤 Ideogram — Slide (HARDCODED, no model check)
        └─ FALSE ─▶ 🤖 GPT-4o — Texto ─▶ 🔧 Parsear contenido ─▶ ✂️ Extract Hashtags (Single)
                      ─▶ 🖼️ ¿Imagen propia? ─ FALSE ─▶ 🔀 ¿Story?
                            ├─ TRUE  ─▶ 🔤 Ideogram v3 — Story (HARDCODED, no model check)
                            └─ FALSE ─▶ 🎨 ¿Ideogram? ── TRUE ─▶ 🔤 Ideogram v3
                                            └─ FALSE ─▶ 🎨 ¿NanoBanana? ── TRUE ─▶ 🍌 Nano Banana Pro
                                                              └─ FALSE ─▶ ⚡ Flux 2 Pro
```

- `parse-carousel` (the code node right after the carousel GPT-4o call) **hardcodes `image_model: 'ideogram'`** in its output regardless of what the Wizard brief actually sent — carousels have never respected `image_model` selection.
- `check-is-story`'s TRUE branch feeds `🔤 Ideogram v3 — Story` directly, never reaching `🎨 ¿Ideogram?`/`🎨 ¿NanoBanana?` — Stories have never respected `image_model` selection either, they've always been Ideogram-only regardless of what the brief requested.
- Only the plain single-post, non-story path (`check-own-image` FALSE → `check-is-story` FALSE) actually evaluates the 3-way `image_model` router.

**Implication for the plan:** "wire Hybrid behind `image_model: 'ideogram'`" is really three separate rewiring jobs (single-router-branch, story-hardcoded-branch, carousel-hardcoded-branch), not one shared branch feeding three renderers. The simplest, lowest-diff correct move — consistent with how these 3 call sites are already independently hardcoded to Ideogram today — is to repoint each of the 3 existing call sites (`🔤 Ideogram v3`, `🔤 Ideogram v3 — Story`, `🔤 Ideogram — Slide`) to the new Hybrid sub-workflow call, leaving the surrounding IF-topology (including the fact that story/carousel bypass the 3-way router) exactly as-is. This is a scoped, low-risk change matching the project's established patch-based deploy discipline (Phase 12.2/12.3/13 precedent: diff remote vs last-known-good, avoid unrelated refactors).

### Finding #2 (HIGH confidence): 3 call-site nodes must be updated to point at the Hybrid pipeline

| Format | Node to repoint | Currently calls | New target |
|---|---|---|---|
| Single | `🎨 ¿Ideogram?` TRUE branch (currently → `🔤 Ideogram v3`) | Ideogram `/generate`, 1:1 | Hybrid sub-workflow (`layout: "single"`) |
| Story | `🔀 ¿Story?` TRUE branch (currently → `🔤 Ideogram v3 — Story`) | Ideogram `/generate`, 9:16 | Hybrid sub-workflow (`layout: "story"`) |
| Carousel (per slide) | `🎠 Explode Slides` output (currently → `🔤 Ideogram — Slide`) | Ideogram `/generate`, 1:1, once per exploded slide item | Hybrid sub-workflow (`layout: carousel-opening/middle/closing` per slide position) |

The old Ideogram nodes (`ideogram-generate`, `ideogram-generate-story`, `ideogram-slide`) must be **left in the canvas, disconnected** (not deleted) — per the locked CONTEXT.md decision that Ideogram stays as a manual, reconnect-to-restore emergency fallback during the 10-post validation window.

### Finding #3 (HIGH confidence): downstream URL-extraction nodes are Ideogram-response-shape-specific and must be updated

Three code nodes currently parse the RAW Ideogram JSON response shape (`{ data: [{ url }] }`) and will break silently (or worse, extract `undefined`) once the upstream node's response shape changes to whatever the Hybrid sub-workflow returns:

1. **`🔗 Normalizar URL imagen`** (`normalize-image`) — branches on `model === 'ideogram'` and does `imageData.data?.[0]?.url`. Since `image_model` stays the string `"ideogram"` for logging/backward-compat (per CONTEXT: transparent replacement), this branch's *extraction logic* must change to read the Hybrid sub-workflow's actual output shape (e.g. `imageData.imageUrl`), while the `model === 'ideogram'` branch condition itself stays.
2. **`🔗 Normalizar URL imagen — Story`** (`normalize-image-story`) — has NO branching at all, unconditionally does `imageData.data?.[0]?.url`. Same fix needed.
3. **`🗂️ Collect Image URLs`** (`collect-carousel-urls`) — does `item.json.data?.[0]?.url` per exploded-slide item in the loop. Same fix needed.

These are small, scoped, single-line-per-node changes, but easy to miss if the plan only focuses on "add the Hybrid API calls" — the existing Ideogram-shape assumptions are baked into 3 separate downstream nodes.

### Finding #4 (HIGH confidence): everything AFTER these extraction nodes is confirmed provider-agnostic — zero downstream changes needed (satisfies INTEG-06)

Traced the full chain from `final_image_url`/`image_urls` through to Meta publish:
- `💾 Guardar sesión Supabase` (Postgres) stores whatever URL string is present — no provider-specific logic.
- `🔧 Prep Re-host Input` normalizes both single (`final_image_url`) and carousel (`image_urls` array) into the sub-workflow's `{index, url}` shape — already provider-agnostic (works identically for Ideogram/Flux/NanoBanana/custom URLs today).
- `🔁 Re-host Images` sub-workflow (workflow ID `BIaG266Q6AZpv4Sq`) takes any public HTTPS URL and re-hosts it on `rehost-service` (Hostinger VPS) — confirmed durable, Meta-accepted (Phase 12.2). No provider assumptions.
- `⬇️ FB: Fetch Image Bytes (Azure)` node's name is a stale leftover from the pre-rehost Azure Blob era — its actual behavior fetches from `$json.fb_story_image_url` (whatever URL is present post-rehost), retry-safe (`maxTries: 3`, `waitBetweenTries: 2000`). Confirmed provider-agnostic despite the misleading name.
- IG/FB container-creation, carousel child-container loop, and Story publish chains all consume the rehosted Hostinger URL — none reference Ideogram/Flux/NanoBanana by name.

**Conclusion: as long as the Hybrid sub-workflow's final output is a public HTTPS image URL (same contract every other engine already satisfies), INTEG-06 ("zero downstream changes") is achievable by construction** — the only required changes are the 3 call-site repoints (Finding #2) and the 3 extraction-node fixes (Finding #3), all of which sit strictly upstream of `🔧 Prep Re-host Input`.

### Finding #5 (HIGH confidence): GPT-4o prompt-schema gap — the real build surface of this phase

None of the 3 GPT-4o text-generation call sites emit the fields the Creatomate templates need:

- **`🤖 GPT-4o — Texto`** (single + story format, node `openai-text`) — system prompt only requests `instagram.caption`, `instagram.image_prompt`, `facebook.caption`. `parse-content` only extracts `image_prompt` as a single string. Creatomate's `single.json`/`story.json` need `HEADLINE`, `BODY`, `BADGE`, `CTA` as **separate** fields, plus a text-free `background_prompt` for the Flux stage.
- **`🎠 GPT-4o — Prompts Carrusel`** (carousel format, node `openai-carousel`) — system prompt requests `slides[].texto_overlay` (≤6-8 words) and `slides[].prompt` (Ideogram's `Text says: "..."` pattern). No `badge`, `body`, `cta`, `layout` (opening/middle/closing), or `background_prompt` fields exist in the current schema at all.
- The `layout` classification (opening/middle/closing) that `eval-design-engines.js`'s `layoutForSlide()` relies on to pick the right Creatomate template does not exist anywhere in production's carousel data today (`eval-briefs.json` hand-authored it manually per slide). **Recommendation: compute `layout` deterministically by slide position in n8n code** (`slide_num === 1` → opening, `slide_num === num_images` → closing, else middle) rather than asking GPT-4o to self-classify — this is a Regla-1 fixed-rule decision (global CLAUDE.md: deterministic logic → code, not LLM judgment), removing one source of GPT-4o schema-compliance risk.

**Both single/story and carousel prompt-generation nodes need a hardened rewrite** (explicitly flagged as Claude's discretion in CONTEXT.md — "Prompt bank contents and GPT-4o template hardening"). The rewrite must also fold in:
- **Palette drift fix:** production's current prompt suffixes still reference the *old* palette (`#1a1a2e` background, `#6B46C1`→`#EC4899` gradient, no cyan accent) — see `flux-generate`, `ideogram-generate`, `openai-carousel`'s system prompt. The Creatomate templates (already brand-locked, Plan 15-01) use the *canonical* palette (`#070A18`→`#13082B`→`#08031A` background, `#8000A8`→`#BA00E0` gradient, `#00E5FF` cyan accent, `#C026D3` badge). Flux background prompts generated for the Hybrid must target the canonical palette (as `eval-design-engines.js`'s `callFalFluxBackground` already does) or Flux-generated backgrounds will visually clash with the fixed-color Creatomate text overlay — a direct risk to INTEG-03's "visual consistency across slides" success criterion.
- **The castellano/legible-chat hard rule:** background prompts must never ask Flux to render its own readable text; any phone/chat mockup must be composed via Creatomate (real text elements), not drawn by Flux. This is the root-caused fix for the only quality gap the human reviewers found in Phase 15 (legibility 8.4/10 vs Gamma's 10/10, `15-DECISION.md` §5/§8.5).
- **Atmosphere-by-slide-position:** slide 1 = warm/emotional (person, situation), middle slides = tech/modern, closing slide = no `background_prompt` at all (text-only render).
- **Prompt bank + user-provided-prompt + GPT-4o-generated — 3 coexisting sources.** This phase only needs to implement n8n-side *support* for all 3 (e.g. accept an optional `background_prompt` field on the incoming brief and prefer it over GPT-4o generation when present; maintain a small static prompt bank keyed by `type`+slide-position as a fallback/reference set). The Wizard UI to let the user choose among them is explicitly Phase 17 scope.

### Finding #6 (HIGH confidence — this is a real bug, not a design choice): eval harness's carousel closing-slide handling must NOT be copied into production

`scripts/eval-design-engines.js`'s `callHybrid()` (called from `renderOneUnit()`) does this for the carousel path:

```javascript
} else if (engine === "hybrid") {
    const backgroundPrompt = fields.background_prompt;
    if (!backgroundPrompt) {
      return { skipped: true, reason: "no background_prompt for this slide (closing/no-image layout)" };
    }
    const r = await callHybrid({ layout, values, backgroundPrompt, format, width, height });
    ...
```

This means the Phase 15 eval **produced zero rendered images for closing slides under the Hybrid engine** (12 hybrid renders vs 17 for the other 3 engines — `15-DECISION.md` §1 confirms this explicitly as "el híbrido omite legítimamente las slides de cierre sin imagen"). But `eval-briefs.json`'s own annotation on the same data says the *intended* design is different:

```
"background_prompt_note": "Closing slide has no image in the canonical layout — hybrid variant should render this slide as a pure typographic overlay on the brand gradient background (no Flux call needed)."
```

`creatomate/templates/carousel-closing.json` was built exactly for this — it has **no `BACKGROUND_URL` token at all**, it's a pure text-on-gradient template. **Production's carousel-per-slide Hybrid call must skip stage 1 (FAL Flux) when `background_prompt` is null/absent, and always run stage 2 (Creatomate) against `carousel-closing.json`.** Do not port the harness's `{skipped: true}` shortcut — every carousel needs a complete slide deck including its closing slide, or the carousel publish chain (`🎠 IG: Explode Carousel Slides` expects `num_images` slides, `collect-carousel-urls` throws if the count doesn't match) will hard-fail.

### Recommended Project Structure (n8n artifacts)

```
n8n/
├── workflow.json                        # main workflow — 3 call sites repointed, 3 extraction nodes fixed, 3 GPT-4o nodes hardened
└── subworkflow-hybrid-image.json        # NEW — mirrors subworkflow-rehost-images.json's existing pattern
                                          # input: { layout, headline, body, badge, cta, background_prompt, width, height }
                                          # steps: [conditional] FAL Flux background → Creatomate render-create →
                                          #         Wait node → Creatomate render-poll (loop until succeeded, ~120s budget
                                          #         matching eval-design-engines.js's own poll timeout) → return { imageUrl }
                                          # output: { imageUrl }
```

### Pattern: n8n-native poll loop (Creatomate render status)

**What:** Creatomate renders are async — `POST /v1/renders` returns `202` with a render `id` and (often) `status: "planned"`/`"processing"`; must `GET /v1/renders/{id}` until `status === "succeeded"`.
**When to use:** Any async job-creation API without a synchronous "wait for completion" option (Creatomate has none as of this research).
**Example (proven live in `scripts/eval-design-engines.js`, adapt to n8n HTTP Request + Wait + IF nodes):**
```javascript
// Source: scripts/eval-design-engines.js callCreatomate(), live-proven Plan 15-01/15-04
let res = await httpJson(`${base}/renders`, { method: "POST", headers, body: renderBody }); // POST create
let status = res.json?.status;
const start = Date.now();
while (status !== "succeeded" && Date.now() - start < 120000) {   // 120s budget
  if (status === "failed") throw new Error(`Creatomate render ${renderId} failed`);
  await sleep(3000);                                              // n8n: Wait node, 3s
  const poll = await httpJson(`${base}/renders/${renderId}`, { headers }); // n8n: HTTP Request GET
  status = poll.json?.status;                                      // n8n: IF node checks status, loops back to Wait if not succeeded
}
```
In n8n this becomes: `HTTP Request (POST create)` → `IF (status === succeeded)` → [true: continue] / [false: `Wait (3s)` → `HTTP Request (GET poll)` → loop back to the IF]. This exact pattern (bounded retry + Wait node) has no direct precedent elsewhere in `n8n/workflow.json` today (Meta container-ready waits are fixed-duration, not poll-until-done), so it is new build surface, but architecturally simple — no code node needed beyond trivial status extraction.

### Anti-Patterns to Avoid
- **Reusing `image_model === 'ideogram'` extraction branches verbatim:** the string stays `'ideogram'` for backward-compatible logging, but the *code inside* that branch must change (Finding #3) — don't assume "same model string" means "same code path is correct."
- **Porting the eval harness's carousel closing-slide skip logic:** production needs every slide rendered (Finding #6).
- **Asking GPT-4o to self-classify carousel slide layout (opening/middle/closing):** compute it deterministically from `slide_num`/`num_images` in a code node instead (Regla 1, global CLAUDE.md).
- **Leaving Flux background prompts on the old `#1a1a2e` palette:** will visually clash with the Creatomate overlay's fixed canonical-palette colors.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Text auto-fit / overflow prevention | Custom text-measurement/truncation code | Creatomate's native `font_size: null` + `font_size_minimum`/`font_size_maximum` (already set on every variable text element in all 5 templates) | Already proven against the real production "veterinaria s." overflow bug in Plan 15-01; vendor-native, zero custom code |
| Async job completion | A custom queue/worker service | n8n HTTP Request + Wait + IF poll loop (see pattern above) | Fits the 8-señales test — no special libraries, <30 lines of logic, acceptable latency for a non-real-time human-approval flow |
| Hybrid pipeline reuse across 3 formats | 3x duplicated FAL+Creatomate+poll node chains | 1 shared sub-workflow, `Execute Workflow` node called 3x | Matches existing `Re-host Images` sub-workflow precedent; avoids triplicated poll-loop bugs |
| Carousel slide-position classification | GPT-4o self-reported `layout` field (schema-compliance risk) | Deterministic n8n code (`slide_num === 1` → opening, etc.) | Fixed rule, no judgment needed — Regla 1 |

**Key insight:** Nothing in this phase requires new infrastructure or a new service tier (no Azure Function/Container App beyond what already exists) — it's entirely n8n workflow JSON + Azure OpenAI prompt engineering + one new credential. The temptation to hand-roll shows up in text-fit (already solved) and async orchestration (solvable with plain n8n nodes, not a new microservice).

## Common Pitfalls

### Pitfall 1: Story and Carousel silently ignore `image_model` today
**What goes wrong:** Assuming "route `ideogram` to Hybrid in the router" is a single change point.
**Why it happens:** The router (`🎨 ¿Ideogram?`/`🎨 ¿NanoBanana?`) only sits in the single-post, non-story path. Story and Carousel each hardcode a direct call to Ideogram's endpoint, never touching the router.
**How to avoid:** Treat this as 3 independent call-site repoints (Finding #2), not 1 router-branch change.
**Warning signs:** A plan that only mentions "update the `🎨 ¿Ideogram?` IF node" without also touching `🔀 ¿Story?`'s true branch and `🎠 Explode Slides`'s output connection.

### Pitfall 2: Ideogram-response-shape extraction left unfixed
**What goes wrong:** `final_image_url` ends up `undefined`/`null` after switching the upstream call, because `normalize-image`/`normalize-image-story`/`collect-carousel-urls` still do `imageData.data?.[0]?.url` (Ideogram's raw shape).
**Why it happens:** These 3 code nodes were written when Ideogram was the only story/carousel provider; nobody expected the upstream node's output shape to change while the `image_model` string stayed `"ideogram"`.
**How to avoid:** Explicitly update all 3 extraction nodes (Finding #3) to read the Hybrid sub-workflow's actual return shape.
**Warning signs:** Live-fire smoke test where the WhatsApp preview shows a broken image / no image, or `prep-rehost-input` throws "no image URL found."

### Pitfall 3: Carousel closing slides silently missing
**What goes wrong:** Following the eval harness's `{skipped: true}` pattern for slides with no `background_prompt` — production carousels end up with N-1 slides, and `collect-carousel-urls` throws `Se generaron X imagenes, se esperaban Y` (a real, already-existing guard in that node).
**Why it happens:** Copy-pasting `callHybrid()`'s logic from `eval-design-engines.js` without noticing its eval-only shortcut (Finding #6).
**How to avoid:** Implement "skip Flux stage 1, always run Creatomate stage 2" for null-`background_prompt` slides, not "skip the slide entirely."
**Warning signs:** Auto-fit offline batch test (INTEG-05) or a live-fire carousel render coming back short one image.

### Pitfall 4: Palette/brand drift between Flux prompts and fixed Creatomate overlay colors
**What goes wrong:** Flux-generated backgrounds use the old `#1a1a2e`/`#6B46C1`→`#EC4899` palette (still present in production's current prompt suffixes) while the Creatomate overlay renders fixed `#070A18`/`#8000A8`→`#BA00E0`/`#00E5FF`/`#C026D3` — visually inconsistent composite images.
**Why it happens:** Production's GPT-4o/Flux prompt suffixes were never updated when Plan 15-01 locked the canonical palette for the Creatomate templates; only the eval harness's `callIdeogram`/`callFalFluxBackground` (Ideogram-baseline replica) got the corrected palette, per `eval-design-engines.js`'s own documented deviation comment.
**How to avoid:** When hardening the GPT-4o background-prompt template, target the canonical palette explicitly (copy the suffix pattern from `eval-design-engines.js`'s `callFalFluxBackground`).
**Warning signs:** Visual QA during the offline auto-fit batch or the carousel live-fire shows background/overlay color mismatch.

### Pitfall 5: Creatomate/FAL official pricing pages don't render dollar amounts to non-JS fetchers
**What goes wrong:** Trusting a single scraped/aggregator number for the phase-start budget checkpoint.
**Why it happens:** Both `creatomate.com/pricing` and `fal.ai/models/...` render pricing client-side (React); automated fetches return "price not specified" or third-party aggregator numbers that disagree with each other by ~20-30%.
**How to avoid:** Before the user contracts a Creatomate plan (locked checkpoint), have them (or an authenticated session) open the live checkout page directly to confirm the exact $/month and credit allocation — do not commit a card based solely on aggregator-sourced numbers. See Open Questions below for the specific numbers found and their confidence levels.
**Warning signs:** None avoidable purely by research — this is a live-verification requirement, not a code fix.

### Pitfall 6: New `CREATOMATE_API_KEY` env var missing from the production Container App
**What goes wrong:** Live-fire fails at the Creatomate render-create call with an auth error, because the key only exists in local `.env` (used by the disposable eval harness) and was never added to the `propulsar-n8n` Container App's environment.
**Why it happens:** Plan 15-01 only needed the key locally for the eval harness; nobody added it to production infra since this phase didn't exist yet.
**How to avoid:** Add `CREATOMATE_API_KEY` as a Container App env var (likely `secretRef` backed by an Azure Key Vault secret, matching the existing `FAL_API_KEY`/`IDEOGRAM_API_KEY` pattern referenced via `$env.*` in `n8n/workflow.json`) as an explicit deployment task before any live-fire.
**Warning signs:** First `Execute Workflow` call to the Hybrid sub-workflow in a real n8n execution (not local harness) fails on the Creatomate leg specifically.

## Code Examples

### FAL Flux background call (production-proven params, adapt prompt suffix to canonical palette)
```javascript
// Source: n8n/workflow.json flux-generate node (production) + scripts/eval-design-engines.js
// callFalFluxBackground() (canonical-palette-corrected variant)
POST https://fal.run/fal-ai/flux-pro/v1.1
Headers: { Authorization: "Key {FAL_API_KEY}", "Content-Type": "application/json" }
Body: {
  "prompt": "{background_prompt} — style: dark background #070A18, purple to magenta gradient accents (#8000A8 to #BA00E0), professional high-quality social media graphic, ultra detailed, 4K",
  "image_size": "square_hd",          // or {width:1080, height:1920} for story
  "num_inference_steps": 28,
  "guidance_scale": 3.5,
  "num_images": 1,
  "enable_safety_checker": true
}
// Response: { images: [{ url }] } — vendor does NOT reliably honor output_format:"png" for this model
// (eval harness detects actual format via magic bytes rather than trusting the request param)
```

### Creatomate render create + placeholder substitution
```javascript
// Source: scripts/eval-design-engines.js callCreatomate(), live-proven Plan 15-01/15-04
POST https://api.creatomate.com/v1/renders   // NOT /v2 — 404s on this account
Headers: { Authorization: "Bearer {CREATOMATE_API_KEY}", "Content-Type": "application/json" }
Body: {
  "output_format": "png",
  "width": 1080, "height": 1080,      // 1080x1920 for story
  "source": {
    "elements": /* template's elements array, with {{HEADLINE}}/{{BODY}}/{{BADGE}}/{{CTA}}/{{BACKGROUND_URL}}
                   string-replaced by caller before POSTing — NOT Creatomate's native "modifications" API */
  }
}
// Response: 202, { id, status, url? } — poll GET /v1/renders/{id} until status === "succeeded"
```

### Placeholder substitution helper (reusable as-is or as an n8n Code-node reference)
```javascript
// Source: scripts/eval-design-engines.js substitutePlaceholders()
function substitutePlaceholders(obj, values) {
  const json = JSON.stringify(obj);
  return JSON.parse(json.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (m, key) => {
    const v = values[key];
    return v == null ? "" : String(v).replace(/"/g, '\\"');
  }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Ideogram v3 diffusion-rendered text-in-image | Creatomate vector-text overlay on Flux-generated photorealistic background ("Hybrid") | 2026-08-03, `15-DECISION.md` dual-signed | Text legibility, brand consistency, diacritics, layout all move from "degrades with length" to "deterministic, vendor-native auto-fit" |
| `#1a1a2e` / `#6B46C1`→`#EC4899` legacy palette (still live in production prompts) | `#070A18`→`#13082B`→`#08031A` / `#8000A8`→`#BA00E0` / `#00E5FF` cyan / `#C026D3` badge canonical palette | Locked in Plan 15-01's Creatomate templates, 2026-08-01/02 | Production's Flux/GPT-4o prompt suffixes have NOT yet been updated to match — this phase must close that gap (Pitfall 4) |
| Single-string `image_prompt` per unit | Structured `headline`/`body`/`badge`/`cta`/`background_prompt` per unit | This phase (net-new) | Enables template-driven typography instead of diffusion-drawn text |

**Deprecated/outdated:**
- Ideogram is NOT deleted this phase — it becomes dormant/disconnected fallback code per the locked validation-period decision, not deprecated-and-removed.
- Remotion was formally closed as a paper-only candidate in Phase 15 (EVAL-07) — not relevant to Phase 16's build, only as a future-reconsideration trigger if video/Reels becomes a stated goal.

## Open Questions

1. **Exact Creatomate live $/month price for the Essential tier**
   - What we know: Official pricing page (`creatomate.com/pricing`) confirms "1 image = 1 credit," Essential tier = 2,000 credits/month, free trial = 50 credits (no card). These facts are HIGH confidence (official docs, fetched directly).
   - What's unclear: The actual dollar price. Third-party aggregators disagree: SaaSworthy reports Essential $41/mo (implying annual billing), a general web search reports $54/mo (implying monthly billing) — a ~30% spread consistent with "2 months free" annual discount math, but not confirmed against the live checkout page (which renders pricing client-side and isn't fetchable by this research's tools).
   - Recommendation: At the phase-start checkpoint, have the user open `creatomate.com/pricing` directly (or the checkout flow) to read the exact figure before contracting. Given Propulsar's real posting volume (sporadic, not daily — per `PROJECT.md`'s "Current focus"), the Essential tier's 2,000 credits/month is almost certainly enough (a single post = 1 credit, a 5-slide carousel = ~5 credits, a story = 1 credit — even generous dev/testing usage stays in the low hundreds/month), so the tier choice itself is low-risk; only the exact price-vs-$50-cap needs live confirmation.

2. **Exact FAL Flux 2 Pro (`flux-pro/v1.1`) per-image cost**
   - What we know: Production's own node notes and the eval harness/decision doc consistently cite `~$0.03/img` (Ideogram-comparable) — this figure appears repeated across `n8n/workflow.json`, `scripts/eval-design-engines.js`, `15-DECISION.md`, and `STATE.md`, suggesting it reflects Propulsar's own observed billing (first-party, empirical), not a single unverified guess.
   - What's unclear: Two independent third-party sources (Costbench, general web search) report FAL's official rate as `$0.04-$0.055 per megapixel`, which would put a 1080×1080 render (1.166 MP) at `$0.047-$0.064` — 50-100% higher than the `$0.03` figure used throughout this project's cost planning.
   - Recommendation: This doesn't block Phase 16 (the ~$3 Flux test budget is small either way, and Flux is already in production so real billing history exists), but the planner/user should spot-check the FAL dashboard's actual per-call cost before assuming `$0.03` holds at higher production volume — the discrepancy is large enough to matter if volume ever scales beyond "sporadic" posting.

3. **Should Story ever support Flux/NanoBanana (not just Ideogram→Hybrid)?**
   - What we know: Today, Story is 100% hardcoded to Ideogram regardless of what `image_model` the brief specifies — this is pre-existing behavior, not something Phase 16 needs to fix.
   - What's unclear: Whether this hardcoding is an intentional design choice or a v1.2-era oversight nobody revisited. CONTEXT.md doesn't address it, and it's out of this phase's stated scope (INTEG-04 only asks for a working Story via the winning engine).
   - Recommendation: Preserve the existing hardcoded-to-Ideogram(now Hybrid) structure for Story with no `image_model` branching added — matches the "scoped diff" deploy discipline and avoids scope creep. Flag as a note for Phase 17/future Wizard work if the user wants Story to support photorealism-only formats later.

4. **Badge/CTA default conventions for single/story posts (currently carousel-only concept)**
   - What we know: Carousel briefs always carry a `badge` (e.g. "CASO: VETERINARIA") tied to `content_type`; single/story format's current GPT-4o output has no badge concept at all (Ideogram never needed one — it draws whatever text is in `image_prompt`).
   - What's unclear: What badge text single/story posts should default to when hardening the GPT-4o `openai-text` prompt (e.g. derive from `type`: `case_study` → "CASO: {tema}", `educational` → something else, `authority` → something else).
   - Recommendation: Claude's discretion per CONTEXT.md ("Prompt bank contents and GPT-4o template hardening") — design a `type`-keyed badge convention consistent with the carousel pattern already established and validated by the human reviewers in Phase 15.

5. **Should the validation-period counter (10 real posts) be tracked with an explicit marker, given `image_model` stays the string `"ideogram"` in logs?**
   - What we know: CONTEXT.md requires counting "10 real published posts with the Hybrid" before Ideogram code may be deleted. `image_model` will read `"ideogram"` in Google Sheets/Postgres for every Hybrid-generated post (transparent replacement, by design), making it indistinguishable at a glance from any hypothetical future manual-fallback-to-real-Ideogram run.
   - What's unclear: Whether existing logging (Sheets/Postgres) is sufficient to count the 10 posts, or whether a small additive marker (e.g. an internal note, or reusing the `"hybrid"` identifier internally while still accepting `"ideogram"` as the brief's input value) would make the validation period auditable without ambiguity.
   - Recommendation: Low-risk, cheap addition — consider logging an internal `engine_actual: "hybrid"` value alongside the public-facing `image_model: "ideogram"` for traceability during the validation window. Not blocking; flag for the planner's discretion.

## Sources

### Primary (HIGH confidence — read directly from the codebase)
- `n8n/workflow.json` — full node list (92 nodes), router IF-chain topology, all connections traced for router/story/carousel/rehost paths, Ideogram/Flux/NanoBanana node bodies, extraction code nodes
- `scripts/eval-design-engines.js` — full 866-line harness, all 4 engine callers, Creatomate/FAL/Gamma/Ideogram request/response shapes, poll-loop implementation, carousel closing-slide skip logic (Finding #6)
- `creatomate/templates/{single,carousel-closing,story}.json` — placeholder names, auto-fit config, aspect ratios, canonical palette values
- `scripts/eval-briefs.json` — frozen real-post-derived brief data showing intended headline/body/badge/cta/background_prompt/layout schema and the closing-slide design intent
- `.planning/phases/15-comparison-templates-eval-harness-decision/15-DECISION.md` — dual-signed final decision, replacement rule, hard requirement (castellano chat legibility), cost/latency figures
- `.planning/phases/15-comparison-templates-eval-harness-decision/15-01-SUMMARY.md` — Creatomate account setup, `/v1` base URL confirmation, auto-fit proof against the real "veterinaria s." bug
- `.planning/STATE.md` — Phase 12-15 decisions locked, rehost-service architecture, Meta 9004 fetcher fix history, deploy discipline precedent
- `.planning/phases/16-winning-engine-integration-all-formats/16-CONTEXT.md` — locked decisions (verbatim, reproduced above)
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — INTEG-01..06 exact requirement text (note: ROADMAP's phrasing "additive branch... coexist" is superseded by the later `15-DECISION.md` full-replacement call; CONTEXT.md's "transparent replacement" is the authoritative instruction)
- `creatomate.com/docs/account/how-does-the-pricing-work`, `creatomate.com/pricing` (fetched) — "1 image = 1 credit," Essential = 2,000 credits/month, 50-credit no-card trial confirmed as official-doc facts; exact $ amounts NOT retrievable (client-side rendered)

### Secondary (MEDIUM confidence)
- WebSearch aggregation (Costbench, general web search) on FAL `flux-pro/v1.1` pricing: `$0.04-$0.055/megapixel`, conflicting with this project's own long-standing `~$0.03/img` figure — flagged as Open Question 2, not asserted as fact

### Tertiary (LOW confidence — flagged, not used as fact)
- SaaSworthy/G2/Capterra/apis.io aggregator pages citing Creatomate Essential at `$41` or `$54`/month, Growth at `$99`/`$129`/month, Beyond at `$249`/month — internally inconsistent across sources, likely monthly-vs-annual-billing confusion; must be live-verified before the phase-start Creatomate checkpoint

## Metadata

**Confidence breakdown:**
- Standard stack / architecture (n8n topology, node wiring, extraction shapes): HIGH — read directly from `n8n/workflow.json` and `scripts/eval-design-engines.js`, cross-checked against connection graphs
- GPT-4o prompt-schema gap and required hardening: HIGH — current prompts read verbatim, gap against Creatomate template placeholders is unambiguous
- Common pitfalls (router topology, closing-slide bug, palette drift): HIGH — each traced to specific line-level evidence in the codebase
- Creatomate/FAL current $ pricing: LOW-MEDIUM — official pages don't expose numbers to non-JS fetchers; third-party sources disagree; explicitly flagged for live verification at the user checkpoint, not asserted as fact anywhere in this document's planning-relevant claims

**Research date:** 2026-08-03
**Valid until:** ~30 days for the codebase-architecture findings (stable until Phase 16 itself changes them); ~7 days for the pricing figures specifically (fast-moving, unverified — re-check immediately before the phase-start Creatomate checkpoint rather than trusting this document's numbers)
