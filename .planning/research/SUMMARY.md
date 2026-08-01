# Project Research Summary

**Project:** Propulsar Content Engine — v1.3 "Diseño Premium"
**Domain:** Template/design-engine image generation added to an existing n8n-orchestrated social publishing pipeline (replacing/augmenting diffusion-model text-in-image)
**Researched:** 2026-08-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

v1.3 adds a real typography/design layer on top of the shipped v1.0-v1.2 pipeline (Wizard → n8n on Azure → GPT-4o text → Ideogram/Flux/Nano Banana image → WhatsApp approval → Meta publish). The problem being solved is specific: Ideogram v3's diffusion-model text rendering tops out at 90-95% accuracy and struggles with Spanish diacritics (á, é, í, ó, ú, ñ) — a credibility risk for a brand voice that mandates natural Spanish. Three candidates were researched — **Gamma** (AI deck/presentation API repurposed for social cards), **Creatomate** (template-based render API with real text layers), and **Remotion** (React/CSS programmatic rendering library) — against the existing Ideogram baseline.

**Creatomate is the clear default recommendation** for the primary integration path: it renders real, deterministic text layers (not diffusion pixels) at a per-image cost (~$0.05-0.06 combined with a Flux background) roughly comparable to or below Ideogram's current $0.06, has a mature REST API with a documented n8n integration pattern, supports native webhooks (fits this codebase's proven session-correlation async pattern), and requires zero new Azure infrastructure. Gamma is architecturally the weakest fit (deck/presentation-first, not element-precise, no webhooks, cost scales per-generation not per-image, needs a custom bounded polling loop against n8n's 65-second Wait-persistence floor) and should be evaluated but not favored going in. Remotion is technically the most capable (full CSS/React control, real differentiator for future *animated* content) but is cost-prohibitive at Propulsar's current volume: its "Automators" automation license applies to any programmatic call from n8n regardless of company size, at $0.01/render with a **$100/month minimum** — effectively $1-3/image at ~30-90 posts/month, 15-50x current spend. Remotion should be deferred until/unless video/Reels enters scope.

**Key risks to mitigate:** (1) the milestone explicitly requires the Ideogram replace-vs-coexist decision to be evidence-driven, not predetermined — build the new engine as an additive 4th branch of the existing `image_model` router, never a hard rip-and-replace, until a documented comparison names a winner; (2) PNG alpha-channel transparency (new to this pipeline — diffusion models never produced alpha) can silently flatten to the wrong fill color on Meta's side and go unnoticed for months on lighter template variants; (3) auto-fit/font choices must be stress-tested against real, worst-case GPT-4o Spanish output (long headlines, `¿¡`, stacked accents) not short demo copy, or the "premium typography" promise breaks in production; (4) every new engine's output must route through the existing `rehost-service` — this project has direct prior-incident proof (Azure Blob/Front Door rejection) that a vendor's own CDN URL cannot be assumed Meta-compatible.

## Key Findings

### Recommended Stack

Recommended: **Creatomate REST API** (`v1`, `api.creatomate.com/v1/renders`) as the text/typography compositing layer, fed by the **existing Flux 2 Pro** (via FAL.AI) as the background-art generator — a two-stage pipeline where Flux produces photorealistic art with no text-rendering burden, and Creatomate composites 100%-accurate Spanish typography on top via a pre-built brand template (`template_id`). No new npm packages are required — integration is a plain HTTP Request node in n8n, matching the existing FAL/Ideogram bearer-token auth pattern. **Ideogram v3 stays in place** as the quality baseline and fallback for non-premium/quick-post flows.

**Core technologies:**
- **Creatomate REST API** — deterministic real-text-layer compositing over a background image — recommended because it's the only candidate with guaranteed pixel-exact Spanish typography *and* a per-image cost at or below current Ideogram spend, with zero new Azure infrastructure
- **Flux 2 Pro (existing, unchanged)** — background art generation — already integrated at $0.03/img, now freed from needing to render legible text itself
- **Gamma API** (secondary/optional evaluation candidate) — `format: "social"`, native 1x1/4x5/9x16 support, `themeId` brand control — viable for a future "AI-varied layout" mode but not the default path; per-generation (not per-image) billing and no webhooks make it architecturally awkward at this milestone
- **Remotion** (evaluated, not adopted this milestone) — full React/CSS render control, best differentiator for future animated content, but its Automators license ($100/month floor) makes it 15-50x more expensive than Creatomate at current volume

### Expected Features

**Must have (table stakes):**
- Brand kit applied per render (dark `#1a1a2e` bg, purple-magenta gradient, bold Spanish typography) baked into a template/theme once, not re-specified via prompt engineering each call
- Dynamic text insertion via API — GPT-4o's already-generated caption flows straight into the render, no manual editing
- Auto-fit/overflow handling tuned to real (not demo) GPT-4o caption-length variance, including long headlines with accents and `¿¡`
- 100%-reliable Spanish diacritics — the single most concrete, binary-scorable differentiator vs. Ideogram found in research
- Multi-format output (1:1, 4:5, 9:16) and carousel-slide support, matching the pipeline's existing per-format/per-slide patterns
- Programmatic API access usable from a plain n8n HTTP Request node (no browser automation, no community-node install)
- Output compatible with the existing rehost-service → Meta publish flow, unchanged

**Should have (competitive):**
- A documented, repeatable side-by-side comparison methodology (7 criteria: legibility, brand consistency, layout quality, diacritics stress test, latency, cost/image, n8n integration complexity) — this is itself a deliverable, not just a build step, since the milestone requires the decision to be defensible later
- AI-background + typographic-overlay two-stage pipeline (Flux/Nano Banana art + template-engine text) — likely the actual best-quality outcome, reusing two already-proven branches
- Reusable template/theme IDs (vs. re-stating brand instructions in every LLM-generated prompt) — structurally eliminates "prompt drift" that Ideogram is exposed to today

**Defer (v2+):**
- Template editing/preview UI for non-technical tweaks (Content Studio GUI project, explicitly out of scope)
- Multi-tenant/per-client brand kits (Propulsar's own brand only for v1.3)
- Video/motion output (static images only per PROJECT.md; revisit if Reels becomes a goal — this is exactly when Remotion's licensing cost becomes justified)
- Formal per-content-type engine routing — only if the comparison shows no single engine wins across all 3 content types

### Architecture Approach

The new engine is wired as a **4th branch of the existing `image_model` IF-node router** (alongside Ideogram/Flux/Nano Banana), terminating in the same `{final_image_url, ...passthrough}` contract before the unchanged rehost → WhatsApp preview → Meta publish chain. Async engines (Creatomate, Gamma) reuse the codebase's **already-proven session-correlation pattern** from WhatsApp SI/NO approval (two independent webhook-triggered executions correlated via a Postgres `session_id` row) instead of n8n's native Wait-for-webhook, sidestepping the documented 65-second Wait-persistence floor entirely. Remotion, if adopted, would run as a new **Azure Container App** (`min-replicas: 1`, self-hosted headless Chromium) responding synchronously — never AWS Lambda, per this project's Azure-only stack rules — but is out of scope for v1.3's build.

**Major components:**
1. **Engine call node(s) per format** (single/carousel-per-slide/story variants) — new HTTP Request nodes replacing/joining the image-generation step inside the existing per-slide loop
2. **`🔧 Map to <engine> variables` Code node** — transforms GPT-4o's existing caption/slide JSON into the engine's template-variable schema (one per candidate engine)
3. **`🎯 Webhook — Render Complete`** (async engines only) — new entry-point webhook correlating a `status='rendering'` Postgres session row back into the existing chain
4. **`scripts/eval-design-engines.js`** — standalone comparison harness with zero contact with n8n/Postgres/Meta, calling AOAI + Ideogram + candidate engines directly for side-by-side human review

### Critical Pitfalls

1. **Building the new engine as a hard Ideogram replacement before the comparison runs** — violates the milestone's own "not predetermined" requirement; build strictly as an additive 4th router branch, repoint only after a documented decision.
2. **Gamma's polling-only async model vs. n8n's 65s Wait-persistence floor** — a naive 5s poll loop either loses in-flight executions on Container App restarts or requires a bounded Wait≥65s + IF loop with an explicit timeout branch; don't copy vendor docs' polling cadence literally.
3. **Remotion Automators-license misclassification** — 2-person headcount does NOT exempt programmatic n8n-triggered rendering from the $0.01/render + $100/month-minimum "Automators" tier; budget this explicitly in any cost comparison, don't treat Remotion as "$0" because of company size.
4. **PNG alpha-channel flattening to an unpredictable fill color on Meta's side** — new risk class (diffusion models never produced alpha); force fully-opaque/flattened export (or JPEG output where available) rather than trusting Meta's undocumented conversion behavior, and verify specifically on lighter/alternate template variants, not just the dark background.
5. **Vendor CDN URL bypassing `rehost-service`** — this project has direct prior-incident proof (Azure Blob/Front Door Meta rejection) that a new provider's "publicly accessible" URL cannot be assumed Meta-compatible; every engine's output must route through the existing rehost hop, no exceptions, and Creatomate render URLs additionally expire after ~30 days so this is also a correctness (not just compatibility) requirement.

## Implications for Roadmap

Based on combined research, the architecture doc's suggested build order (**G → A → B → C → D → E → F**) is well-reasoned and dependency-driven — the comparison must produce a decision before any production template or router wiring is built, and the unrelated v1.2 Postgres-migration regression check should run first so it doesn't get conflated with new design-engine bugs. Suggested phase structure:

### Phase 1: v1.2 Regression Check (Postgres carry-over)
**Rationale:** Independent of the design-engine work; validates `content_sessions` recovery (the exact mechanism the async session-correlation pattern below depends on) is solid before new logic is built on top of it. Isolates any lingering Postgres-migration bug from new v1.3-introduced bugs.
**Delivers:** Confirmed live-fire spot-check of single + carousel formats through the existing Ideogram/Flux/Nano Banana paths post-migration.
**Addresses:** MVP item "Live-fire spot-check of single + carousel formats post-Postgres-migration."
**Avoids:** Debugging confusion from conflating infra regressions with new-feature bugs.

### Phase 2: Eval Harness — Gamma + Creatomate (API-only)
**Rationale:** Zero infrastructure dependency, pure API calls, produces the comparison data every later decision depends on, with zero production risk by construction (standalone harness, no contact with n8n/Postgres/Meta).
**Delivers:** `scripts/eval-design-engines.js` running a fixed test brief through GPT-4o once, then Ideogram (baseline) + Gamma + Creatomate in parallel, writing a side-by-side `eval-output/<timestamp>/index.html`.
**Addresses:** "Documented comparison scoring against 7 criteria" and "Spanish-diacritics stress test set" MVP items.
**Avoids:** Pitfall 8 (cherry-picked single-output bias) by using a fixed batch of ≥5 real briefs, not one showcase render each.

### Phase 3: Minimal Remotion Render Service + Harness Extension
**Rationale:** Unlike Gamma/Creatomate, Remotion requires a deployed service before it can even be evaluated — this is the one candidate with a build step before comparison is possible.
**Delivers:** `remotion-templates/` with a rough-draft composition (not final brand polish) deployed to a throwaway/dev Azure Container App; harness extended to call it as a 4th candidate.
**Uses:** `@remotion/renderer`, self-hosted on Azure (never Lambda) per stack research.
**Implements:** Standalone eval-harness architecture component.

### Phase 4: Comparison Run, Human Review, Decision
**Rationale:** This is the actual "not predetermined" gate the milestone requires — no production wiring happens before this.
**Delivers:** A recorded decision (PROJECT.md Key Decisions table or dedicated doc): winning engine, explicit Ideogram coexist-vs-replace call, per-format if results differ.
**Addresses:** "Ideogram coexistence/replacement decision driven by comparison results (not predetermined)" per PROJECT.md.
**Avoids:** Pitfall 1 (Gamma per-generation cost assumptions), Pitfall 3 (Remotion license misclassification), Pitfall 6/7 (auto-fit and font glyph failures) — all must be explicitly scored in this phase, not discovered later.

### Phase 5: Production Templates for the Winner
**Rationale:** Real template-design work must happen before any wiring — templates live in the engine's own system (Creatomate editor / Remotion React components), not in n8n.
**Delivers:** Brand-final template(s) for single/carousel-slide/Story matching `#1a1a2e` + gradient + typography exactly, with auto-fit and Spanish-glyph coverage locked in.
**Uses:** Winning engine from STACK.md's cost/capability comparison.
**Implements:** Architecture Pattern 2 (data-only handoff — n8n sends only text/URLs, never design decisions).

### Phase 6: n8n Wiring — Router Branch + Normalize Node(s) + Async Pattern
**Rationale:** Needs real template/composition IDs to call; this is where the additive 4th-branch router change, the engine-specific normalize Code node, and (if async) the Render-Complete webhook + `content_sessions.status='rendering'` schema change all land together.
**Delivers:** `image_model` router has the new branch; per-format variants call the winning engine; async correlation pattern implemented and tested with a real webhook round-trip if applicable.
**Implements:** Architecture Patterns 1 (session-correlated async resume) and 3 (engine-agnostic image-in/rehost-out contract).
**Avoids:** Pitfall 9 (vendor CDN bypassing rehost-service), Pitfall 5 (PNG alpha-channel), Pitfall 10 (community-node/webhook assumptions on locked-down Azure n8n) — all named as hard checklist items for this phase.

### Phase 7: Wizard Changes
**Rationale:** Needs the exact `image_model` string value the n8n router now expects — must follow, not precede, Phase 6.
**Delivers:** New `IMAGE_MODELS` entry, updated `suggestModel()`, carousel/Story hardcoded model labels repointed if the decision was "replace."
**Addresses:** Wizard-side surface of the winning-engine integration.

### Phase Ordering Rationale

- **Comparison (Phases 2-4) strictly precedes production build (Phases 5-7)** — this is a genuine sequencing dependency per PROJECT.md's "not predetermined" requirement, not just a nice-to-have order.
- **The v1.2 regression check (Phase 1) is sequenced first**, even though it's unrelated to the design-engine work, specifically to avoid conflating an infra bug with a new-feature bug once Phase 6's Postgres schema changes land.
- **Remotion's build step (Phase 3) is sequenced after Gamma/Creatomate's zero-infra eval (Phase 2)** because it's the only candidate that can't be evaluated via pure API calls — this avoids blocking the cheaper, faster comparisons on Remotion's deploy time.
- **This ordering directly avoids Pitfall 8** (cherry-picked comparison bias) by making the comparison phase a real, scoped deliverable (Phase 4) rather than an implicit side-effect of building the "obvious" winner first.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Comparison/Decision):** Creatomate webhook JSON payload shape and failure-status signaling is unverified (needs a live test render before Phase 6 builds on it) — flagged as Open Question #1 in ARCHITECTURE.md.
- **Phase 3 (Remotion):** Actual render latency for the real brand composition (not a trivial "hello world") is unverified — determines whether Remotion can stay synchronous or also needs the async pattern.
- **Phase 6 (n8n wiring):** Carousel path for async engines (N async callbacks per post vs. correlation complexity) needs an explicit decision — may require restricting carousel format to sync-capable engines only.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Regression check):** Pure verification of already-shipped v1.2 functionality, no new research needed.
- **Phase 7 (Wizard changes):** Mechanical extension of the existing `IMAGE_MODELS` object pattern, well-understood from three prior engine integrations.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Official docs verified via WebFetch for Gamma/Remotion/Creatomate; exact dollar pricing has minor cross-source conflicts (Creatomate Essential tier $41 vs $54/mo) flagged for pre-budget verification |
| Features | MEDIUM | No Context7 coverage for any of the 3 candidate engines (not in Context7's index); all findings from official docs + WebFetch + WebSearch cross-checks, individually flagged by confidence level |
| Architecture | HIGH (existing pipeline) / MEDIUM (vendor async behavior) | Full direct read of `n8n/workflow.json`, `wizard/run.js`, `rehost-service/server.js` gives HIGH confidence on integration points; Creatomate webhook payload shape and Remotion real-composition latency are web-verified but not hands-on tested against this account |
| Pitfalls | MEDIUM-HIGH | Licensing terms (Gamma/Creatomate/Remotion) verified against official docs; project-specific integration risks are HIGH confidence, grounded directly in this repo's own n8n 2.14.2 constraints and the documented Azure Blob/Front Door Meta-rejection precedent |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Creatomate webhook exact JSON shape** (status/URL/error field names) — unverified, needs a live test render before Phase 6 builds the Normalize/failure-branch nodes.
- **Remotion render latency for the actual brand composition** — unverified until Phase 3's deploy; determines sync-vs-async architecture for that candidate specifically.
- **Carousel path for async engines** — real complexity risk (N async callbacks per post); needs an explicit decision in Phase 4/5, not left implicit.
- **`content_sessions.status` enum widening** (`'rendering'` as a new value) — small DDL decision that should happen in the same phase as the Postgres-touching work (Phase 6), not left as an afterthought.
- **Gamma per-card PNG export granularity** — whether a single-slide extract from Gamma's zip export is clean or requires crop/select, unverified; resolve empirically in Phase 2.
- **Exact Creatomate/Gamma dollar pricing** — minor cross-source conflicts noted in STACK.md and PITFALLS.md; confirm live pricing pages before finalizing the cost line in the Phase 4 decision.
- **Meta's exact alpha-channel fill-color behavior on PNG-to-JPEG conversion** — undocumented by Meta; should be verified empirically (not assumed) during Phase 6's flatten/opaque-export verification step.

## Sources

### Primary (HIGH confidence)
- `developers.gamma.app/*` (get-started, guides, reference) — Generate API params, `format: social`, `cardOptions.dimensions`, `themeId`, `textMode: preserve`, auth
- `creatomate.com/docs/*` — REST API reference, `template_id`/`modifications` pattern, text-sizing modes, webhooks, n8n tutorial, authentication
- `remotion.dev/docs/license/faq`, `remotion.pro/license`, `github.com/remotion-dev/remotion/blob/main/LICENSE.md` — Automators license definition and exact pricing ($0.01/render, $100/mo minimum), independent of company size
- `docs.ideogram.ai/using-ideogram/prompting-guide/2-prompting-fundamentals/text-and-typography` — diacritics limitation confirmed by vendor's own docs
- `developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media` — Meta media container requirements
- Direct codebase analysis: `n8n/workflow.json` (4255 lines, full read), `wizard/run.js`, `rehost-service/server.js` — existing pipeline structure, router shape, session-correlation pattern already proven in production

### Secondary (MEDIUM confidence)
- `bannerbear.com/help/*` — text-fitting and template-set patterns, used as category-reference (not a v1.3 candidate) to confirm multi-format template patterns are industry-standard
- WebSearch-aggregated Gamma rate limits (50 gen/hour, `x-ratelimit-*` headers), Creatomate 30-day render URL expiry, Creatomate/Gamma pricing figures — not independently fetched from primary pricing pages in this session, flagged for pre-budget verification
- `almcorp.com/blog/how-to-use-ai-for-graphic-design/` — background+overlay two-stage workflow pattern, single industry source

### Tertiary (LOW confidence)
- PNG alpha-channel-to-JPEG flattening fill-color behavior — general image-processing knowledge, not Meta-specific documentation; Meta's own behavior is undocumented and needs empirical verification

---
*Research completed: 2026-08-01*
*Ready for roadmap: yes*
