# Feature Research

**Domain:** Template/design-engine-based image generation for automated social media pipelines (v1.3 "Diseño Premium")
**Researched:** 2026-08-01
**Confidence:** MEDIUM — official docs verified for Creatomate, Gamma, Bannerbear (as reference pattern), and Remotion; WebSearch-only findings flagged individually. No Context7 coverage for any of the three candidate engines (Gamma, Creatomate, Remotion are not in Context7's index) — all findings sourced from official docs + WebFetch + WebSearch cross-checks.

## Scope Note

This supersedes the prior v1.2 FEATURES.md (Stories publishing — already shipped, archived in `.planning/milestones/v1.2-REQUIREMENTS.md`). This research covers ONLY the new capability for v1.3: replacing/augmenting Ideogram's diffusion-model text-in-image with a template/design-engine approach (Gamma, Creatomate, Remotion), plus the comparison methodology to choose between them. Existing pipeline features (GPT-4o text gen, WhatsApp approval, IG/FB publishing, scheduling, Flux/Nano Banana for non-text images) are already shipped and are NOT re-evaluated here — they appear only where a new feature depends on or must integrate with them.

## Feature Landscape

### Table Stakes (Users Expect These)

Features any credible template/design-engine integration must have. Missing these = the "premium design" swap doesn't actually work in the existing pipeline.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Brand kit application (colors, fonts, logo) applied per render | This IS the value proposition of the milestone — Propulsar's dark `#1a1a2e` + purple-magenta gradient identity must render consistently, not be re-specified via prompt engineering each time like Ideogram requires | LOW-MEDIUM | Creatomate: defined once in the template editor, referenced by `template_id`, not re-sent per API call (HIGH confidence, official docs). Gamma: `themeId` param on Generate API, theme holds colors/fonts/logo, requires Plus plan for custom logo/font upload (HIGH confidence — [Gamma Help Center](https://help.gamma.app/en/articles/11029150-can-i-add-my-own-colors-and-fonts-to-gamma), [Generate API docs](https://developers.gamma.app/guides/generate-api-parameters-explained)). Remotion: brand kit is just React props/constants in your own component — full code control, zero SaaS lock-in, but you build the "kit" yourself (MEDIUM confidence). |
| Dynamic text insertion via API (caption/headline swapped per call, template structure fixed) | Direct replacement for what Ideogram prompt-engineering does today — GPT-4o output must flow into the image without manual editing | LOW | Creatomate: POST with `modifications` object keyed by element name, official docs confirm ([creatomate.com/how-to/create-social-media-posts-by-api](https://creatomate.com/how-to/create-social-media-posts-by-api)) — HIGH confidence. Gamma: `textMode: "preserve"` retains exact `inputText` without AI rewriting — required since GPT-4o already wrote the caption (HIGH confidence, official docs). Remotion: text is a prop passed to `renderStill()`/`renderMedia()` — direct code-level control (MEDIUM confidence). |
| Auto-fit / overflow handling for variable-length Spanish captions | GPT-4o caption length varies per post; without auto-fit, long educational-post headlines either overflow the canvas or get silently clipped mid-word | MEDIUM | Creatomate: 5 documented text-sizing modes incl. "auto-sized text with fixed dimensions" with explicit min/max font size scaling, and an optional Clip+ellipsis mode for hard overflow (HIGH confidence — [creatomate.com/docs/fundamentals/template-editor/text-sizing](https://creatomate.com/docs/fundamentals/template-editor/text-sizing)). Bannerbear (reference pattern, not a v1.3 candidate but same product category): "Text Fit" auto-sizing + Truncate/Line Clamp — confirms this is a standard category feature, not a Creatomate-specific edge case (HIGH confidence — [bannerbear.com/help/text-fitting](https://www.bannerbear.com/help/articles/23-text-fitting/)). Remotion has no built-in text-fit primitive — must be hand-rolled with canvas text-measurement in React (e.g. binary-search font size against a `<canvas>` `measureText()` pass) — MEDIUM confidence, this is a real implementation cost, not a solved problem. |
| Spanish diacritics render correctly (á, é, í, ó, ú, ñ) every time | Brand voice mandates natural Spanish; a post with "años" rendering as "aos" or "público" rendering with a dropped accent is an instant credibility failure and the whole reason to consider leaving Ideogram | LOW for template engines / MEDIUM-HIGH risk for Ideogram baseline | Template engines render actual system/web fonts via HTML/CSS or vector text layers — diacritics are 100% reliable because it's real typography, not pixel-guessing (HIGH confidence, structural fact about how template engines work). Ideogram: diacritics are a documented weak point of diffusion-model text rendering generally — "diacritics like á, é, í, ó, ú, ñ being particularly challenging," though Spanish "with standard accents work most of the time" per Ideogram's own docs (MEDIUM confidence — [Ideogram docs](https://docs.ideogram.ai/using-ideogram/prompting-guide/2-prompting-fundamentals/text-and-typography), cross-referenced with multiple industry articles). This is the single most concrete, testable differentiator for the comparison. |
| Multi-format output from one template design (1:1 feed, 4:5 portrait, 9:16 story) | Pipeline already supports single/carousel/story formats; the design engine must cover all 3 without maintaining 3 unrelated templates by hand | MEDIUM | Gamma: native `format: "social"` with `cardOptions.dimensions` of `1x1`, `4x5` (default), `9x16` — but **custom pixel dimensions are NOT supported**, only these 3 presets (HIGH confidence, official docs — this is close enough to IG's 1080×1080 / 1080×1350 / 1080×1920 aspect ratios but not pixel-exact, needs verification against Meta's actual accepted tolerances). Creatomate/Bannerbear pattern: no single template auto-adapts across ratios — you build a "template set" (Bannerbear's term) of N linked templates (one per ratio) sharing the same variable names, and one API call fans out to all of them (HIGH confidence for Bannerbear — [bannerbear.com/help/template-sets](https://www.bannerbear.com/help/articles/16-image-collection-template-set/); Creatomate confirmed as same conceptual pattern via WebSearch, MEDIUM confidence since not found in Creatomate's own docs directly). Remotion: format is just a composition's `width`/`height` — three separate compositions per format, full control, no SaaS constraint. |
| Carousel slide series with visual consistency (shared background/style, incrementing content) | Existing carousel feature (v1.0) requires N sequential images with a coherent visual thread — this must survive the engine swap | MEDIUM-HIGH | **Important negative finding:** Creatomate has no dedicated carousel/multi-slide endpoint — each slide is rendered as a separate API call against the same template with different `modifications`, same pattern as today's sequential Ideogram calls (MEDIUM confidence — WebSearch finding, not found explicitly in Creatomate's own docs, but consistent with how Creatomate's RenderScript/track model works for slideshows). This means carousel support is NOT a single-call feature in any of the 3 candidates — it's N calls to the same template with per-slide variables, identical integration shape to what the n8n workflow already does for Ideogram. Low re-architecture risk, but don't expect a "give me 7 slides" endpoint. |
| Programmatic API/HTTP access usable from n8n (no browser automation, no manual UI steps per render) | Non-negotiable — the entire pipeline is n8n orchestrated; anything requiring a human in a web UI per post breaks automation | LOW | All 3 confirmed: Creatomate REST API (official n8n integration guide + community n8n workflow templates exist — HIGH confidence, [creatomate.com/docs/tutorials/n8n](https://creatomate.com/docs/tutorials/n8n)). Gamma Generate API v1.0 is GA since Nov 2025, plain REST (HIGH confidence, official docs). Remotion: no hosted API by default — `renderStill`/`renderMedia` runs as a Node process or Lambda/Cloud Run function that n8n would call via HTTP Request node against your own deployed renderer (MEDIUM confidence — requires you to stand up the render service yourself, this is architecture work, not a plug-in API). |
| Output format compatible with existing rehost-service → Meta Graph API flow | v1.2 already solved "how do we get an image Meta will accept" (Hostinger rehost-service, PNG/JPEG public URLs) — the design engine's output must slot into that same re-hosting step, not require a new delivery mechanism | LOW | All 3 output standard raster images (PNG at minimum; Gamma's PNG export is "zip with one image per card" for multi-card outputs — needs an unzip step if generating a Gamma "deck" per carousel, HIGH confidence). Creatomate and Remotion output direct PNG/JPEG URLs or buffers, no unzip step needed (MEDIUM confidence, inferred from API shape). This is a real integration-complexity difference: Gamma's zip-based multi-card export adds a node to the n8n workflow that Creatomate/Remotion wouldn't need for a single image. |

### Differentiators (Competitive Advantage)

Features that set the winning approach apart — where this milestone actually earns its "premium" label, not just parity with Ideogram.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Structured side-by-side quality comparison methodology (its own deliverable, not just a build step) | The milestone explicitly requires the *decision* to be evidence-driven, not predetermined — a documented, repeatable comparison protocol is what makes "Ideogram coexistence/replacement decision driven by comparison results" defensible later if Susana or a client asks "why did we switch?" | MEDIUM | Recommended criteria set (synthesized from category research, MEDIUM confidence — no single authoritative source defines "the" evaluation rubric for this comparison, this is a judgment call): **(1) Text legibility** — 100% correct Spanish text incl. diacritics, no dropped/duplicated characters, readable at IG feed thumbnail size; **(2) Brand consistency** — exact `#1a1a2e` background + purple-magenta gradient reproduced pixel-consistently across renders, not "close enough" AI reinterpretation; **(3) Layout quality** — text placement respects safe zones (IG UI overlays avatar/caption at top and bottom), no overlapping elements, consistent margins across the 3 aspect ratios; **(4) Diacritics stress test specifically** — a dedicated test set of Spanish strings with á/é/í/ó/ú/ñ in headline position, since this is the most concrete, binary-scorable differentiator found in research; **(5) Render latency** — matters because the pipeline is synchronous up to the WhatsApp preview step, a 30s+ render blocks the user-facing flow; **(6) Cost per image** — Ideogram is $0.06/image today; template engines have a different cost shape (subscription + credits, or self-hosted compute) that needs a real per-post cost comparison, not just sticker price; **(7) Integration complexity with n8n** — number of new nodes, new credentials, new failure modes added to the 92-node workflow. |
| AI-generated background + typographic overlay as a two-stage pipeline (FAL.AI image gen feeding into template engine text layer) | Combines Flux/Nano Banana's photorealistic backgrounds (already proven strong in the existing pipeline for non-text posts) with a template engine's 100%-reliable typography — potentially the actual best-quality outcome, better than either approach alone | MEDIUM-HIGH | This pattern is explicitly named in current industry practice: generate background via diffusion model, then typeset text as a separate overlay layer, avoiding diffusion models' text-rendering weakness entirely (MEDIUM confidence — [ALM Corp 2026 AI design workflow guide](https://almcorp.com/blog/how-to-use-ai-for-graphic-design/) describes this as a "traditional workflow" pattern: "generate concept in Midjourney/Firefly/Ideogram, then typeset... over the AI background"). For this project: FAL.AI (Flux/Nano Banana) generates the background image, that image URL is passed into Creatomate/Remotion as a template background layer, template engine adds the guaranteed-legible Spanish text on top. This is NOT what Gamma does (Gamma's own AI image generation is bundled, less composable with an external background). Creatomate and Remotion both support "image element as background + text elements on top" natively — this is their core template model, not a workaround. |
| Self-hosted rendering control (Remotion specifically) | No per-render vendor cost, no SaaS rate limits, full custom React/CSS control over layout — matches the project's existing pattern of owning infrastructure (Hostinger rehost-service, Azure Postgres) rather than depending on third-party SaaS uptime | HIGH | Remotion's commercial license for automated/server rendering is "$0.01 per render with a $100/month minimum" for the "Automators" tier (MEDIUM confidence — WebSearch finding, not independently verified against current Remotion pricing page, flag for validation before committing). Self-hosting requires standing up a render service (Lambda, Cloud Run, or a container) — given this project's Azure-first stack, this would be an Azure Container App running Remotion's Node renderer, consistent with the project's existing "own the infra" pattern (rehost-service precedent). This is real engineering work (HIGH complexity) but removes an external dependency and per-render vendor cost entirely — the highest-effort, highest-control option of the three. |
| Reusable template versioning (one template definition, referenced by ID across single/carousel/story) | Reduces "prompt drift" risk that Ideogram has today — where visual identity depends on re-stating brand instructions in every GPT-4o-generated prompt and can silently degrade | LOW-MEDIUM | Creatomate and Gamma both use a persistent template/theme ID referenced by API calls rather than re-specifying design instructions in natural language per request (HIGH confidence, both official docs). This structurally eliminates the class of bug where an LLM-generated Ideogram prompt "forgets" to mention the purple-magenta gradient. Remotion achieves the same thing via a fixed React component — arguably even stronger consistency since it's code, not a stored config a UI could accidentally drift. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that would seem natural to add during this milestone but would blow the scope or duplicate existing, working pipeline pieces.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Full drag-and-drop template editor / visual design tool inside the pipeline | "Let me tweak the template myself without touching code" feels natural once you're evaluating design tools that all ship a web editor | This is a GUI/UX feature, not a pipeline feature — building or exposing one is out of scope per PROJECT.md ("Frontend/dashboard UI — separate project"). Templates can be authored once, manually, in each engine's own web editor (Creatomate's editor, Gamma's app) — that authoring step does not need to be replicated in Propulsar's own tooling | Design/edit templates directly in the vendor's own editor (one-time, manual, per template) or in Remotion's React code; the n8n pipeline only ever calls the render API with dynamic data. Template *creation* is a one-time human task, not a pipeline feature. |
| Video/motion design output (Creatomate and Remotion both support video) | Both candidate engines are primarily video tools with image generation as a secondary capability — easy to get pulled into "since Creatomate can also do intro/outro animations for Reels..." | Explicit out-of-scope per PROJECT.md: "Video slides — static images only." Video adds render time, format complexity (Meta video specs, encoding), and a completely different QA/approval flow than the existing WhatsApp static-image preview | Stay on static image output only from whichever engine is chosen; revisit video as a future milestone if/when Reels become a stated goal. |
| Real-time collaborative / live-preview editing during the Wizard run | Once a design engine is in the loop, it's tempting to let the user nudge text position or resize elements interactively before approval | The approval mechanism is already WhatsApp SI/NO on a rendered image — adding interactive editing means either a new UI (out of scope) or overloading WhatsApp with impossible controls. It also reintroduces per-post manual design work, which is exactly what the whole pipeline exists to eliminate | Keep the fixed-template + dynamic-data model: if a render looks wrong, the fix is regenerating with adjusted GPT-4o text/brief inputs (NO on WhatsApp triggers regeneration in the existing flow), not manual layout editing. |
| Multi-tenant / per-client brand kit management | Natural extension once you build "a brand kit," a reasonable next thought is "we could sell this to Propulsar's clients" | Explicit out-of-scope per PROJECT.md: "Multi-account publishing — requires multi-tenant token management." This milestone is scoped to Propulsar's own single brand identity | Build the brand kit as a single hardcoded Propulsar template/theme for now; multi-tenant templating is a Content Studio GUI or separate-product concern, not v1.3. |
| Abandoning Ideogram before the comparison is actually run | Given the strong "diffusion models struggle with diacritics" research signal, it's tempting to treat the outcome as a foregone conclusion and skip straight to integration | PROJECT.md is explicit: "Ideogram coexistence/replacement decision driven by the comparison results (not predetermined)." Ideogram remains genuinely strong for non-text-heavy, high-impact imagery (that's why Flux/Nano Banana/Ideogram already coexist in the router) — a template engine may not beat it on every content type (e.g., photorealistic case-study imagery) | Run the actual side-by-side comparison across all 3 content types (educational, authority, case study) before deciding whether the design engine fully replaces Ideogram or coexists in the router (e.g., design engine for text-heavy educational posts, Ideogram/Flux/Nano Banana retained for others). |
| Building a custom font-licensing / font-hosting system | Brand kit setup naturally raises "which font do we use, and is it licensed for programmatic rendering at scale" | This is a real question but it's a one-time procurement/legal task, not a recurring pipeline feature — don't build tooling around it | Pick a licensed or open web font (e.g., Google Fonts has an OFL-licensed catalog importable into Creatomate/Gamma/Remotion) once during template setup; verify licensing terms allow programmatic/commercial rendering, then treat the font choice as a fixed template property like any other brand asset. |

## Feature Dependencies

```
Brand kit application (colors/fonts/logo)
    └──requires──> Template/theme created once in chosen engine (manual, one-time)

Dynamic text insertion via API
    └──requires──> Brand kit application (template must exist before data can be injected)
    └──requires──> GPT-4o caption text already generated (existing pipeline feature)

Auto-fit / overflow handling
    └──enhances──> Dynamic text insertion (makes it safe for variable-length AI-generated text)

Spanish diacritics correctness
    └──is a property of──> Dynamic text insertion (font rendering, not a separate feature to build)

Multi-format output (1:1, 4:5, 9:16)
    └──requires──> Brand kit application
    └──requires──> Auto-fit / overflow handling (text must still fit when aspect ratio changes)

Carousel slide series
    └──requires──> Dynamic text insertion (N sequential calls, same template, different data)
    └──requires──> Multi-format output is NOT a dependency — carousel format is fixed at 1:1 or 4:5 today

AI background + typographic overlay (two-stage pipeline)
    └──requires──> Existing FAL.AI image generation (Flux/Nano Banana — already shipped)
    └──requires──> Template engine background-layer support (Creatomate/Remotion; NOT Gamma)
    └──enhances──> Brand kit application (background becomes part of the branded template)

Self-hosted rendering (Remotion path only)
    └──requires──> New Azure Container App render service (net-new infra, not needed for Gamma/Creatomate)
    └──conflicts with──> "fast to integrate" — highest complexity of the 3 candidate paths

Side-by-side quality comparison methodology
    └──requires──> At minimum one working integration per candidate engine (enough to render real test images)
    └──gates──> Ideogram coexistence/replacement decision (decision cannot precede this)

Winning engine wired into n8n image router
    └──requires──> Side-by-side quality comparison methodology (decision output)
    └──requires──> Output format compatible with rehost-service (existing v1.2 infra)
```

### Dependency Notes

- **Everything requires a one-time manual template/theme creation step first.** None of the three engines are "zero-setup" — Creatomate and Gamma need a template/theme built in their web editor before any API call can render against it; Remotion needs the React component written. This is template *authoring*, done once by a human, separate from the automated *rendering* the n8n pipeline calls repeatedly. Budget this as a real task in the phase plan, not a footnote.
- **The comparison methodology gates the integration decision, not the other way around.** Per PROJECT.md, the winning-engine integration cannot be scoped/built until the comparison produces a result — this is a genuine sequencing dependency for phase ordering, not just a nice-to-have order of operations.
- **Multi-format output and carousel support are independent features that both depend on the same underlying primitives** (brand kit + auto-fit), but do not depend on each other. A carousel does not need to also be multi-aspect-ratio-aware; a single-format template reused N times per slide is sufficient, consistent with how the existing Ideogram carousel already works.
- **Remotion's self-hosted path conflicts with the project's implicit "prefer the simplest option that already ships" pattern** seen in past decisions (e.g., "Azure Postgres over recreating Supabase" — reuse existing infra over building new). Flag this explicitly for the comparison: Remotion may win on design quality/control but lose on integration cost relative to Creatomate/Gamma's hosted APIs, which need zero new Azure infrastructure.
- **Gamma's zip-based PNG export for multi-card decks conflicts, in complexity terms, with the "output format compatible with rehost-service" table-stakes item** for any carousel-style use of Gamma specifically — a carousel rendered as a single Gamma "deck" would need an unzip step in n8n that Creatomate/Remotion (which render one image per API call) don't need. This is a real integration-cost difference to weigh, not just a preference.

## MVP Definition

### Launch With (v1.3 — this milestone)

Minimum viable scope to make an evidence-based decision and ship a working replacement/augmentation.

- [ ] One template/theme per candidate engine (Gamma, Creatomate, Remotion), matching Propulsar's brand kit (dark `#1a1a2e` background, purple-magenta gradient, bold Spanish typography) — required to render anything comparable
- [ ] Dynamic text insertion wired for at least one format (single post, 1:1 or 4:5) per candidate — enough to run the comparison
- [ ] Spanish-diacritics stress test set (headline strings with á/é/í/ó/ú/ñ) rendered through all 3 candidates + Ideogram baseline — the most concrete, binary-scorable evaluation criterion found in research
- [ ] Documented comparison scoring against the 7 criteria (legibility, brand consistency, layout quality, diacritics, latency, cost/image, n8n integration complexity) — this is the actual deliverable the milestone is graded on
- [ ] Winning engine's render step wired into the n8n image router for single, carousel, and story formats — replacing or coexisting with the Ideogram branch per the comparison's outcome
- [ ] Auto-fit/overflow handling configured for the winning engine's template(s), tuned against real GPT-4o caption-length variance (not just short test strings)
- [ ] Output piped through the existing rehost-service → WhatsApp preview → Meta publish flow unchanged (no new delivery mechanism)
- [ ] Live-fire spot-check of single + carousel formats post-Postgres-migration (v1.2 carry-over item, unrelated to the design-engine work but bundled into this milestone per MILESTONES.md)

### Add After Validation (v1.3.x / next milestone)

- [ ] Multi-format template set (1:1/4:5/9:16) for the winning engine if not already covered by MVP — trigger: MVP only proved single-format; story/carousel formats need their own template variants tuned per aspect ratio's safe zones
- [ ] AI-background + typographic-overlay two-stage pipeline (FAL.AI background + template-engine text layer) — trigger: if pure template-engine output (solid color/gradient background) is judged visually flatter than Ideogram/Flux for case-study or authority posts specifically
- [ ] Formal per-content-type routing (design engine for educational/text-heavy, Ideogram/Flux/Nano Banana retained for photorealistic case studies) — trigger: comparison results show no single engine wins across all 3 content types

### Future Consideration (v2+ / Content Studio GUI)

- [ ] Template editing/preview UI for non-technical brand tweaks — defer to the separate Content Studio GUI project; explicitly out of scope per PROJECT.md
- [ ] Multi-tenant brand kits for client work beyond Propulsar's own content — defer until there's a validated need to productize this beyond Propulsar.ai's own social accounts
- [ ] Video/motion output via Creatomate or Remotion's video capabilities — defer until Reels/video becomes a stated content goal

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Brand kit template creation (1 per candidate engine) | HIGH | LOW-MEDIUM | P1 |
| Dynamic text insertion (single format) | HIGH | LOW | P1 |
| Spanish diacritics stress test + scoring | HIGH | LOW | P1 |
| Documented comparison methodology (7 criteria) | HIGH | MEDIUM | P1 |
| Winning engine wired into n8n router (all 3 formats) | HIGH | MEDIUM-HIGH | P1 |
| Auto-fit/overflow tuning for real caption variance | HIGH | MEDIUM | P1 |
| Live-fire spot-check single+carousel (v1.2 carry-over) | MEDIUM | LOW | P1 |
| Multi-format template set (1:1/4:5/9:16) | MEDIUM-HIGH | MEDIUM | P2 |
| AI-background + typography overlay two-stage pipeline | MEDIUM-HIGH | MEDIUM-HIGH | P2 |
| Per-content-type engine routing | MEDIUM | LOW (if P1 router already supports branching) | P2 |
| Self-hosted Remotion render service on Azure | MEDIUM (control/cost) | HIGH | P3 (only if Remotion wins comparison) |
| Template editing UI | LOW (for this milestone) | HIGH | P3 — deferred to Content Studio GUI |
| Multi-tenant brand kits | LOW (for this milestone) | HIGH | P3 — deferred |
| Video/motion output | LOW (for this milestone) | HIGH | P3 — explicitly out of scope |

**Priority key:**
- P1: Must have for v1.3 launch
- P2: Should have, add once P1 comparison results are in and a winner is confirmed
- P3: Future consideration, likely a different milestone or project entirely

## Competitor / Candidate-Engine Feature Analysis

| Feature | Gamma | Creatomate | Remotion |
|---------|-------|-----------|----------|
| Brand kit (colors/fonts/logo) | Theme system, `themeId` param, requires Plus plan for custom logo/font upload (HIGH confidence) | Template editor, defined once, referenced by `template_id` (HIGH confidence) | Hand-coded React constants/props — full control, zero vendor lock-in, but self-built (MEDIUM confidence) |
| Dynamic text (preserve exact GPT-4o output) | `textMode: "preserve"` (HIGH confidence) | `modifications` object per element (HIGH confidence) | Direct prop passing to component (MEDIUM confidence) |
| Auto-fit/overflow | Not clearly documented for social format specifically — needs validation | 5 sizing modes incl. min/max font scaling + clip/ellipsis (HIGH confidence, most mature of the 3) | No built-in primitive — must hand-roll with canvas text measurement (MEDIUM confidence, real cost) |
| Multi-format from templates | Native presets: 1x1, 4x5, 9x16 — but no custom pixel dimensions (HIGH confidence) | No native multi-format single-template; requires a "template set" pattern (N linked templates) — MEDIUM confidence, inferred from category pattern (Bannerbear confirmed, Creatomate not explicitly documented) | Separate composition per format — full control, no SaaS constraint (MEDIUM confidence) |
| Carousel / multi-slide | Native "deck" concept (cards), exports as zip of PNGs (HIGH confidence) | No dedicated carousel endpoint — N sequential API calls to same template (MEDIUM confidence, WebSearch) | N sequential renders, fully custom (MEDIUM confidence) |
| API maturity / n8n fit | v1.0 GA since Nov 2025, plain REST (HIGH confidence) | REST API + official n8n tutorial + community n8n templates exist (HIGH confidence — most n8n-proven of the 3) | No hosted API — requires self-deployed render service called via HTTP from n8n (MEDIUM confidence) |
| Background image + text overlay composability | Bundled AI image gen, less composable with external FAL.AI backgrounds (MEDIUM confidence) | Native — image element as background layer + text elements on top is the core template model (MEDIUM-HIGH confidence) | Native — any image can be a layer, full CSS/React compositing control (HIGH confidence, structural fact about React) |
| Cost model | Plan-based (Pro/Plus) + presumably per-generation limits (LOW confidence — pricing not fully verified) | Credit-based, ~$41/mo starting tier for 2,000 credits per one comparison source (LOW-MEDIUM confidence, needs current-pricing verification) | $0.01/render + $100/mo minimum (Automators tier) + your own cloud compute cost (LOW-MEDIUM confidence, needs current-pricing verification) |
| Infra footprint added | None (SaaS API call) | None (SaaS API call) | New Azure Container App or Function needed to host the renderer (HIGH confidence — structural, Remotion has no hosted API) |
| Ideogram (baseline) | — | — | 90-95% text-in-image accuracy per existing project decisions log; diacritics are a documented weak point specifically (MEDIUM confidence per multiple industry sources); already integrated, zero migration cost |

## Sources

- [Creatomate — Text sizing modes](https://creatomate.com/docs/fundamentals/template-editor/text-sizing) — official docs, HIGH confidence
- [Creatomate — Create social media posts by API](https://creatomate.com/how-to/create-social-media-posts-by-api) — official docs, HIGH confidence
- [Creatomate — n8n integration tutorial](https://creatomate.com/docs/tutorials/n8n) — official docs, HIGH confidence
- [Creatomate — Generate an image slideshow](https://creatomate.com/docs/api/quick-start/generate-an-image-slideshow) — official docs, referenced via WebSearch summary
- [Gamma — Generate API parameters explained](https://developers.gamma.app/guides/generate-api-parameters-explained) — official docs, HIGH confidence
- [Gamma — Does Gamma have an API?](https://help.gamma.app/en/articles/11962420-does-gamma-have-an-api) — official help center, HIGH confidence
- [Gamma — Can I add my own colors and fonts?](https://help.gamma.app/en/articles/11029150-can-i-add-my-own-colors-and-fonts-to-gamma) — official help center, HIGH confidence
- [Bannerbear — Text Fitting](https://www.bannerbear.com/help/articles/23-text-fitting/) — official docs, used as category-pattern reference (not a v1.3 candidate), HIGH confidence
- [Bannerbear — What are Image Collections and Template Sets?](https://www.bannerbear.com/help/articles/16-image-collection-template-set/) — official docs, category-pattern reference, HIGH confidence
- [Remotion — Comparison of server-side rendering options](https://www.remotion.dev/docs/compare-ssr) — official docs, referenced via WebSearch summary, MEDIUM confidence (not directly WebFetched, needs deeper validation before phase planning)
- [Remotion Pro — Terms and Conditions](https://www.remotion.pro/terms) — pricing/licensing terms, MEDIUM confidence, referenced via WebSearch summary
- [Ideogram — Text and Typography prompting guide](https://docs.ideogram.ai/using-ideogram/prompting-guide/2-prompting-fundamentals/text-and-typography) — official docs, HIGH confidence on diacritics limitation
- [ALM Corp — How to Use AI for Graphic Design in 2026](https://almcorp.com/blog/how-to-use-ai-for-graphic-design/) — industry workflow pattern (background+overlay), MEDIUM confidence, single source
- Project-internal: `.planning/PROJECT.md`, `.planning/MILESTONES.md` — existing pipeline architecture, brand identity, and prior decisions

---
*Feature research for: Propulsar Content Engine v1.3 "Diseño Premium" — template/design-engine image generation*
*Researched: 2026-08-01*
