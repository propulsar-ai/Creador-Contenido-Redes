# Stack Research — v1.3 Diseño Premium

**Domain:** Real typography/design engine for social image generation (replacing/augmenting diffusion-model text-in-image)
**Researched:** 2026-08-01
**Confidence:** MEDIUM-HIGH (official docs verified via WebFetch for Gamma/Remotion/Creatomate; exact dollar pricing has minor source conflicts noted inline)

---

## Context

This is an **additive** research document for the v1.3 milestone. The existing stack (Node.js 22 Wizard, n8n 2.14.2 on Azure Container Apps, GPT-4o text, Ideogram v3 / Flux 2 Pro / Nano Banana Pro image generation, Meta Graph API v22 publishing, YCloud WhatsApp, Azure PostgreSQL sessions, Hostinger VPS rehost-service, Google Sheets log) is validated and locked in — see `.planning/milestones/v1.1-research/`, `.planning/milestones/v1.2-ROADMAP.md`.

This document covers ONLY the new capability: a design/typography engine to beat Ideogram v3's 90-95% text accuracy and produce genuinely brand-consistent output (dark `#1a1a2e` background, purple-magenta gradient accents, bold Spanish typography) instead of diffusion-approximated text.

**Three candidates evaluated per user request:** Gamma (gamma.app API), Creatomate (template render API), Remotion (React-based programmatic rendering library).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Creatomate REST API** | `v1` (`api.creatomate.com/v1/renders`) | Template-based compositing engine — renders **real text layers** (not diffusion pixels) over a background image, at exact IG pixel dimensions | Only candidate offering deterministic, 100%-accurate Spanish typography (real font rendering, not AI approximation) at a per-image cost *below* current Ideogram spend. Templates are designed once visually in Creatomate's web editor, then driven entirely via API — matches the existing "design once, automate forever" pattern already used for prompts in the Wizard. |
| **Flux 2 Pro (existing, via FAL.AI)** | `fal-ai/flux-pro/v1.1` | Generates the **background art** (photorealistic scene, no text needed) that Creatomate composites text onto | Already integrated in the n8n workflow at $0.03/img. Removing the "render legible text" burden from the diffusion model (Creatomate's job now) means the cheapest/best photorealism model can be used unconditionally — no need for Ideogram's text-specialized (and pricier) generation for the art layer. |
| **Ideogram v3 (existing)** | current | Fallback/alternative background generator when Flux art doesn't fit; kept as baseline for comparison and for `has_own_image=false` + "quick post" flows that don't need the premium pipeline | Already integrated, zero migration cost. Confidence: HIGH — this is the existing, shipped component. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required in Node.js/Wizard | — | Creatomate is called via plain HTTPS REST — same `fetch`/HTTP pattern the Wizard already uses for its webhook POST | Default path: n8n HTTP Request node, not Wizard-side |
| `creatomate` (official Node SDK) | latest (npm) | Optional convenience wrapper (`Client.render()`) if template orchestration logic ever moves server-side (e.g., into a future Content Studio GUI backend) instead of n8n | Only if a persistent Node service is built later — not needed for the n8n-only integration path recommended here |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Creatomate web template editor (app.creatomate.com) | Design the brand templates visually (dark bg, gradient accents, text placeholders, logo) | One-time setup per template variant (1:1 single, 4:5 single, 9:16 story, carousel slide). Produces a `template_id` used by every subsequent API call — this is the "brand kit" mechanism (no separate brand-kit API object; the template itself IS the brand kit). |

---

## Installation

```bash
# No new npm packages required for the recommended n8n-only integration path.
# Creatomate is called exactly like Ideogram/FAL today: HTTP Request node with header auth.

# Optional — only if building a standalone Node service later:
npm install creatomate
```

n8n integration: new **HTTP Request node**, `Authorization: Bearer <CREATOMATE_API_KEY>` header (same auth pattern already used for FAL/Ideogram bearer tokens), `POST https://api.creatomate.com/v1/renders`, body:
```json
{
  "template_id": "<TEMPLATE_UUID>",
  "modifications": {
    "Background-Image.source": "<FAL/Ideogram generated art URL>",
    "Headline-Text.text": "<GPT-4o generated Spanish headline>",
    "Subtext-Text.text": "<optional subcopy>"
  }
}
```
Response is async (returns `id` + `status: planned`); poll `GET /v1/renders/{id}` — same polling pattern already implemented in the workflow for IG Story container readiness (Wait node + status check loop). Rate limit: 30 requests / 10-second window (429 on excess) — far above Propulsar's post cadence.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Creatomate (fixed template = guaranteed brand consistency) | **Gamma API** (`developers.gamma.app`, `format: "social"`, `cardOptions.dimensions: 1x1 \| 4x5 \| 9x16`) | Use Gamma when you want AI to **vary the layout** per post (different card structures, auto-selected image placement) rather than a fixed brand template — e.g., for a future "surprise me" content mode. Gamma's `themeId` param does give color/font brand control, and it natively supports all three IG aspect ratios needed (1x1, 4x5, 9x16) — technically viable. But it is a *presentation* engine repurposed for social, so exact pixel-for-pixel repeatability across posts is not guaranteed the way a fixed Creatomate template is, and per-image cost is higher (see cost table below). |
| Creatomate (SaaS API, pay-per-render, zero infra to run) | **Remotion** (`remotion`, `@remotion/renderer`, `@remotion/lambda`, current major v4.x) | Use Remotion only if/when: (a) volume grows to justify its licensing minimum (see Pitfalls below), or (b) the roadmap adds **animated** Stories/Reels — Remotion's real differentiator is programmatic **video**, where React/CSS-level control over motion graphics has no equivalent in Creatomate/Gamma at this design fidelity. For static-image typography today, Remotion is technically capable (`renderStill()` produces PNG/JPEG/WebP directly from a React component) but its licensing model makes it the most expensive option at Propulsar's current post volume. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Remotion for the v1.3 static-image use case** | Any *programmatic* call to `renderMedia()`/`renderStill()` (i.e., anything triggered from n8n, exactly Propulsar's use case) falls under the "**Remotion for Automators**" license track, **regardless of company size** (the free ≤3-employee tier only covers manual use inside Remotion Studio, not automation). Automators pricing: **$0.01/render, billed in 1,000-render increments, $100/month minimum spend.** At Propulsar's current volume (~30-90 images/month), that is effectively a **flat $100/month tax** (~$1.10-$3.30 per image), 15-50x more expensive than Ideogram today and 30-80x more than the recommended Creatomate approach. This applies whether rendering runs on Remotion Lambda (AWS) or self-hosted on Azure Container Apps/Hostinger VPS — the license is about *usage*, not *hosting location*. | Creatomate (pay-per-render at ~$0.02/image, no minimum-spend floor at entry tier) |
| Gamma as the **primary/default** pipeline replacing Ideogram | AI-orchestrated layout (even with `themeId`) means the exact same brand template isn't guaranteed to render identically post-to-post the way a hand-built Creatomate template does; also costlier per image at typical quality tiers (see cost table) and rate-limited to 50 generations/hour (fine for volume, but confirms it's tuned for occasional deck generation, not a high-frequency content-factory primitive) | Creatomate for the deterministic default path; keep Gamma as an optional "variety" mode later |
| Midjourney (carried over rule, still applies) | No official API, ToS risk | Flux 2 Pro / Ideogram v3 / Nano Banana Pro (unchanged) |
| Cropping a 1:1 image to 4:5/9:16 to avoid a second render | Loses ~20-44% of composed content, defeats the purpose of "premium design" | Generate/composite natively at the target aspect ratio (Creatomate template per format, exactly like the existing per-format Ideogram `aspect_ratio` pattern from v1.2) |
| Building a self-hosted headless-Chromium render service (Puppeteer/Playwright + custom HTML/CSS templates) as a Remotion-avoidance workaround | Reinvents exactly what Creatomate already sells as a maintained SaaS API, adds real Azure Container Apps hosting + Chromium-in-Docker maintenance burden the company doesn't currently carry (no existing headless-browser infra in the stack) | Creatomate (someone else runs and patches the renderer) |

---

## Stack Patterns by Variant

**If the post format is single (1:1 or 4:5) or Story (9:16):**
- Use one Creatomate `render` call per image: background art URL (from Flux/Ideogram, unchanged generation call) + GPT-4o headline/subtext text modifications + format-specific `template_id`.
- Because each format needs its own template (text placement/safe-zone differs meaningfully between square and 9:16), not just a different render `modifications` value.

**If the post format is carousel (multi-slide):**
- Creatomate has no dedicated "carousel" endpoint — send N sequential (or batched) `render` calls, one per slide, each referencing the carousel-slide template with that slide's background + text modifications.
- Because this mirrors the existing v1.0 carousel pattern exactly (n8n already loops Ideogram generation per slide) — no new orchestration concept, just swap the per-slide image-generation node for a per-slide Creatomate node downstream of it.

**If a future milestone adds animated/video Stories or Reels:**
- Re-evaluate Remotion at that point — its per-render licensing model and React/CSS/animation timeline model become genuinely differentiated (no diffusion or template-SaaS competitor does frame-accurate motion graphics), and the $100/month minimum is easier to justify once video (a fundamentally more expensive medium everywhere) is in scope.
- Because introducing Remotion today, for static images only, pays its full licensing/hosting cost for a capability (animation) the product doesn't yet use.

---

## Version Compatibility

| Component | Version | v1.3 Notes |
|-----------|---------|------------|
| n8n | 2.14.2 (pinned, existing) | New Creatomate node is a plain HTTP Request node (typeVersion 4.2, same as every other API call in the workflow) — no new node types, no IF v2/Switch v3 needed |
| Creatomate API | `v1` (`api.creatomate.com/v1/renders`) | Stable REST API; template editor is a separate web app, not versioned per-call |
| FAL.AI Flux 2 Pro | `fal-ai/flux-pro/v1.1` (existing) | Unchanged — now used purely for background art, no text-rendering burden |
| Ideogram v3 | current (existing) | Unchanged — remains available as baseline/fallback per user's explicit framing ("Ideogram v3 stays as the quality baseline to beat") |
| Gamma API | `v0.2` per `developers.gamma.app/v0.2/...` docs (evaluate as secondary option only) | `format: "social"` + `cardOptions.dimensions` supports `1x1`/`4x5`/`9x16` natively — matches all three IG targets if adopted later |
| Remotion | v4.x current (NOT adopted this milestone) | If revisited for video: requires `remotion`, `@remotion/cli`, `@remotion/renderer` (self-host on Azure Container Apps with Chromium) or `@remotion/lambda` (AWS) — either way, Automators licensing applies |
| Node.js | v22.20.0 (existing) | No runtime change |

---

## Cost Comparison (per single image, at Propulsar's current low-to-medium volume)

| Approach | Per-image cost | Basis | Text accuracy |
|----------|----------------|-------|----------------|
| **Ideogram v3 only (current baseline)** | $0.06 | Existing production cost | 90-95% (diffusion-approximated) |
| **Flux 2 Pro (art) + Creatomate (text overlay) — RECOMMENDED** | ~$0.03 (Flux) + ~$0.02-0.03 (Creatomate, 1 credit/image, Essential plan `$41/mo ÷ ~2,000 credits ≈ $0.0205/credit`) = **~$0.05-0.06 total** | Two API calls per image; Creatomate Essential plan is the entry tier | ~100% (real text layer, not diffusion) |
| **Gamma (`format: social`, budget image model e.g. Ideogram 3 Turbo = 6 credits)** | Pro plan `$25/mo ÷ 4,000 credits`= $0.00625/credit → ~1 card (1-3 credits) + 6-credit image ≈ 7-9 credits ≈ **$0.04-0.06/image** at cheapest model; up to **$0.70-0.80/image** at premium/ultra image models (75-125 credits) | Highly variable by chosen image model tier; social-format card overhead is small | Real card-layout text (high) for the text portions Gamma composes; image portion still diffusion if `imageOptions.source=aiGenerated` |
| **Remotion (Automators license)** | $0.01/render **but $100/month minimum spend regardless of volume** → at ~30-90 images/month, effective **$1.10-$3.33/image** | Confirmed via official pricing page (`remotion.pro/license`, `remotion.dev/docs/license/pricing`) | 100% (full CSS/React control) — but cost-prohibitive at this volume |

**Note on Creatomate plan pricing:** sources showed minor conflicts on the exact Essential-tier monthly price (`$41/mo` per one source, `$54/mo` per another — likely reflects monthly-vs-annual billing or a recent price change). Confirm the live number at `creatomate.com/pricing` before committing budget; the credit-cost-per-image ($0.0205-0.027/image at Essential tier) is consistent either way and remains cheaper than Ideogram regardless of which base price is current.

---

## Sources

- `developers.gamma.app/get-started/access-and-pricing` — plan tiers requiring API access (Pro/Ultra/Teams/Business), credit-based model (MEDIUM-HIGH, official docs)
- `developers.gamma.app/guides/generate-api-parameters-explained` — `format: "social"`, `cardOptions.dimensions` (1x1/4x5/9x16), `textOptions.language`, `themeId` brand support (HIGH, official docs, directly answers the aspect-ratio requirement)
- `developers.gamma.app/reference/image-model-accepted-values` — full image-model credit-cost table, confirms Ideogram 3/Ideogram 3 Turbo/Ideogram 3 Quality are available *inside* Gamma too (MEDIUM-HIGH, official docs)
- `developers.gamma.app/get-started/understanding-the-api-options` — `X-API-KEY` auth header, `textMode: preserve` for exact copy, `imageOptions.source: noImages` to supply own art (HIGH, official docs)
- WebSearch (Gamma rate limits) — 50 generations/hour, 429 + backoff pattern, async polling via `x-ratelimit-*` headers (MEDIUM, WebSearch-derived, consistent across sources)
- `creatomate.com/docs/api/reference/introduction`, `.../post-v1-renders`, `.../the-render-object` — REST API shape, `template_id` + `modifications` pattern, `output_format` param (HIGH, official docs)
- `creatomate.com/docs/api/reference/limits-and-concurrency` — 30 req/10s rate limit, concurrency tied to plan (MEDIUM-HIGH, WebSearch of official docs)
- `creatomate.com/docs/api/rest-api/authentication` — `Authorization: Bearer <API_KEY>` header (HIGH, official docs)
- `creatomate.com/pricing` — Essential/Growth/Beyond tiers, 1 credit = 1 image, 50-credit free trial (MEDIUM — exact dollar figures conflicted across mirrored sources, flagged above)
- `creatomate.com/docs/fundamentals/getting-started/template-modifications`, `.../how-to/create-images-by-api` — dynamic `source` URL for image elements, AI-image-generation provider option inside Creatomate too (MEDIUM-HIGH, WebSearch of official docs)
- `remotion.dev/docs/license/faq` (fetched twice, cross-checked) — automation via `renderMedia()`/`renderStill()`/CLI/`<Player>` triggers "Remotion for Automators" **regardless of company size**; free ≤3-employee tier covers manual Studio use only (HIGH, official docs, directly resolves the licensing question the user flagged)
- `github.com/remotion-dev/remotion/blob/main/LICENSE.md` — free-tier eligibility criteria (individual / ≤3-employee for-profit / non-profit / evaluation) (HIGH, official license text)
- `remotion.pro/license` — exact Automators pricing: $0.01/render, 1,000-render billing increments, $100/month minimum, "one render = one video/audio/still image/image sequence" (HIGH, official pricing page)
- `remotion.dev/docs/lambda/cost-example` — AWS Lambda compute cost examples (separate from and additional to the licensing fee above) (HIGH, official docs)
- WebSearch (Remotion `renderStill()`) — confirms still-image (PNG/JPEG/WebP) rendering is a first-class, documented use case for social media cards (MEDIUM, multiple community + official sources agree)

---

*Stack research for: Propulsar Content Engine v1.3 — Diseño Premium*
*Researched: 2026-08-01*
*Additive: builds on v1.0/v1.1/v1.2 research in `.planning/milestones/`*
