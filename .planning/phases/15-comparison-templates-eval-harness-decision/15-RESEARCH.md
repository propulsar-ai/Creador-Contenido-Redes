# Phase 15: Comparison, Templates, Eval Harness & Decision - Research

**Researched:** 2026-08-01
**Domain:** Design-engine (Creatomate, Gamma) template authoring + standalone image-render comparison harness vs. Ideogram v3 baseline
**Confidence:** MEDIUM-HIGH (official docs verified via WebFetch/WebSearch for Creatomate/Gamma/Remotion/FAL; some vendor account-specific behaviors — trial-on-existing-account, exact template-import UX — remain unverified until hands-on)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Template authoring & vendor accounts**
- Claude attempts template creation FIRST for both vendors (API and/or browser automation via agent-browser). If the vendor's editor genuinely blocks automation, fall back to a detailed step-by-step runbook the user executes in the editor.
- Gamma: account already EXISTS (Susana's account — regular account, NO API plan contracted). Coordinate with the user for credentials/access; API access may need enabling or working within the existing plan's limits.
- Creatomate: NO account exists — create fresh with Propulsar credentials.
- Budget: free trials only. The whole evaluation runs on free trials/free credits. If a vendor's trial can't produce what the comparison needs, ESCALATE to the user before paying anything.

**Test briefs**
- All 3 formats per engine: the same brief renders as single (1:1), carousel slides, and story (9:16) — the decision must cover everything Phase 16 will integrate.
- Content source: real published Propulsar posts — reuse texts/topics from actual IG posts (proven style, directly comparable with what Ideogram produced for the same kind of content).
- Text inside images: mixed approach. Fixed hand-written texts for the base comparison (identical input across all engines) + at least 1 brief using real GPT-4o pipeline output to exercise auto-fit/overflow with realistic length variance.
- Hybrid variant background model: Claude's choice (Flux $0.03 vs Nano Banana $0.15 per brief, documented rationale).
- The diacritics stress set (EVAL-04: á/é/í/ó/ú/ñ/¿¡ in headline position) rides on top of these briefs per requirements.

**Scoring & decision rule**
- Weighting: visual quality counts double. Text legibility, brand consistency, and diacritics weigh 2x; latency, cost/image, and n8n integration complexity weigh 1x; layout quality 2x (visual criterion). Weighted rubric documented in the decision doc.
- Claude proposes scores with evidence; user validates. User reviews the gallery, adjusts any score they disagree with — user's adjustment is final.
- Winner rule: must beat Ideogram clearly. A winner exists only if it beats the Ideogram baseline on the weighted visual criteria. If nobody clearly beats Ideogram, the decision is "stay with Ideogram" — a valid phase outcome.
- Coexist by default. A winning engine enters the router as a NEW branch; Ideogram stays available. Full replacement only if the winner dominates on ALL visual criteria.

**Visual review**
- Side-by-side HTML gallery (local page): renders grouped by brief/format, engines in columns, click-to-zoom.
- Blind first: first scoring pass with engines anonymized (A/B/C/D labels); names revealed afterwards, scores adjustable then.
- Susana co-reviews: the gallery is shared with Susana; final engine decision needs sign-off from BOTH Felix and Susana.

**Brand identity (canonical spec — supersedes the roadmap's `#1a1a2e` approximation)**
- Backgrounds: deep night blue base `#070A18` → `#0E122B`; dark purple shadows `#13082B`; top magenta/purple glow `#4A025D`. Typical gradient: `linear-gradient(180deg, #070A18 0%, #13082B 50%, #08031A 100%)` with a magenta light touch (`#A200D6`) top/center.
- Primary colors: brand purple/magenta `#8000A8`→`#BA00E0` (logo/isotype/gradients); neon cyan `#00E5FF` (or `#00D2ED`) for `.AI` accent/CTA borders; pure white `#FFFFFF` for main headlines on dark.
- Secondary: pearl blue/lavender `#6B7AFF`→`#8FA2FF` (keyword highlights); dark purple container `#1E0C42` (badges like "CASO: X" / "SIGUE LEYENDO 👇" / secondary buttons).
- In-post accent palette (as used in real posts): labels/main accents `#C026D3`; cold highlighted words `#38BDF8`; highlighted titles `#E0007A`; alt cold keywords `#00BFFF`; neon accents `#00FFFF` + `#FF00FF`.
- YAML summary: Primary_White `#FFFFFF`, Cyan_Neon_Accent `#00E5FF`, Brand_Purple_Magenta `#BA00E0`, Text_Highlight_Blue `#788BFF`, Dark_Container_Purple `#1E0C42`, Dark_Background `#070A18`.
- Typography: titles **Syne bold**; body **Arimo regular**; custom subtitles defined per content.
- Image style: photorealistic AI-generated; warm/emotional atmosphere for opening slides, tech/modern for middle slides.
- Canonical layouts (from real carousels): slide 1 = image behind with centered text + "CASO:" badge; middle slides = image right, text left; closing slide = no image (blank dark bg), centered text + CTA line.
- The templates must NOT deviate from this typology — this is the existing, working Propulsar visual language.

### Claude's Discretion
- Hybrid variant background model choice (Flux vs Nano Banana) per brief
- Exact number of briefs (within "real posts, all 3 formats, mixed texts" constraints)
- Gallery implementation details
- Exact rubric point scale and score presentation
- How to attempt vendor automation (API vs browser) and when to fall back to runbook

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Reels/video style was mentioned in passing as an existing content type, but video remains out of scope per REQUIREMENTS.md — Remotion paper-only.)

### Reference material called out by the user
- **`brand/referencias/`** — 28 real Propulsar IG images (2026-04 → 2026-07). July 2026 posts are the target aesthetic: veterinaria carousel (2026-07-20, 4 slides, shows all 3 canonical layouts), estética carousel (2026-07-15), gym/HVAC singles.
- **Real overflow bug as test case**: slide 2 of the 2026-07-20 veterinaria carousel shows "veterinaria s." breaking badly — a genuine auto-fit failure from the current pipeline. Use this exact headline length as one of the stress inputs.
- More reference images can be pulled from IG via Graph API (`/{ig-user-id}/media` with `media_url`, `children` for carousels) — method already proven this session.
</user_constraints>

---

## Summary

This phase builds two vendor brand templates (Creatomate, Gamma) and a standalone Node.js eval harness that renders identical briefs through Ideogram v3 (baseline), Creatomate, Gamma, and a Flux/Nano-Banana+overlay hybrid, then scores everything on a 7-criteria rubric to make a defensible engine decision. This phase does **not** touch n8n, Postgres, Sheets, or Meta — it is a pure, disposable side-pipeline (`scripts/eval-design-engines.js` + `eval-output/`).

Prior milestone-level research already exists at `.planning/research/{STACK,ARCHITECTURE,PITFALLS}.md` (2026-08-01) and is directly reusable — this document narrows and updates it for Phase 15's actual scope (Remotion is now paper-only per EVAL-07, not a live render candidate) and fills gaps the milestone research left open (free-trial terms, whether templates can be created via API vs. editor-only, current Gamma API version, font availability, and the exact Ideogram production call to replicate as baseline).

**Key new finding since the milestone research:** Creatomate's `/v2/renders` endpoint accepts a `source` field carrying full inline **RenderScript JSON** as an alternative to `template_id` + `modifications`. This means Claude can define the entire "template" — every element, position, color, font — as a JSON document checked into the repo and rendered directly via API, without ever touching Creatomate's visual editor. The formal `/templates` REST endpoint is GET-only (cannot programmatically create a *named* template object), but that's not actually needed: a repo-committed RenderScript JSON file *is* the template, callable from `source` on every render. This substantially de-risks EVAL-01 (Creatomate) — the "attempt API first" path is very likely to succeed outright, no browser automation or runbook needed.

Gamma is the opposite case: brand themes (`themeId`) can only be **created** in-app (the API's own docs say "design a template once in the Gamma app and reuse it programmatically" — `GET /v1.0/themes` is read/list-only, no theme-creation endpoint exists). EVAL-02 will very likely require either agent-browser automation against Gamma's in-app theme editor, or a runbook for the user to build the theme by hand. Also material: Susana's existing Gamma account is NOT on a plan that includes API access (Free/Plus don't; Pro/Ultra/Team/Business do) — the API path requires starting Gamma's 14-day no-card Pro trial (confirm during execution whether an *existing* account can trial-upgrade; if not, this needs explicit user escalation per the "free trials only" budget rule).

**Primary recommendation:** Build the Creatomate template first via a committed RenderScript JSON source file (API-only, no editor dependency) — start there because it's the highest-confidence, lowest-risk path and produces reusable eval-harness code fastest. Attempt Gamma via agent-browser second; expect to fall back to a user-executed runbook for theme creation given the in-app-only constraint, then drive rendering via the v1.0 Generate API once the theme exists. Build the eval harness as a single Node.js CLI script mirroring `scripts/test-webhook.js`'s `.env`-loading/HTTP-helper style, calling Azure OpenAI (or reusing fixed texts) + Ideogram + Creatomate + Gamma + FAL (Flux/Nano Banana) directly — zero webhook, zero n8n, zero Postgres.

---

## Standard Stack

### Core

| Component | Version/Endpoint | Purpose | Why Standard |
|---|---|---|---|
| Creatomate REST API | `https://api.creatomate.com/v2/renders` (current base is v2, not the v1 the milestone research cited — verify live) | Render engine: real text-layer compositing (image or video), `output_format: "jpg"\|"png"` for stills | Only candidate offering deterministic, non-diffusion text rendering; RenderScript `source` field enables full programmatic template definition |
| Gamma Generate API | `v1.0` (`developers.gamma.app`) — **v0.2 was sunset/disabled 2026-01-16**, must use v1.0 | AI-orchestrated deck/card generation, `format: "social"`, `cardOptions.dimensions` (`1x1`/`4x5`/`9x16`) | Native support for all 3 target aspect ratios; `themeId` param carries brand color/font once a theme exists |
| Ideogram v3 (baseline) | `POST https://api.ideogram.ai/generate`, `model: "V_2_TURBO"`, `magic_prompt_option: "OFF"`, `style_type: "DESIGN"` | Quality baseline every candidate must clearly beat | **This is the exact call production already makes** — see Codebase Findings below. The eval harness's Ideogram baseline must replicate this exactly (same endpoint, model, params) to be a fair, production-representative comparison, not the separate "true" `/v1/ideogram-v3/generate` multipart endpoint (which production does NOT use) |
| FAL.AI (Flux 2 Pro / Nano Banana Pro) | `fal-ai/flux-pro/v1.1`, `fal-ai/nano-banana-pro` | Hybrid-variant background art generator (EVAL-05) | Already integrated/proven in production; both support `aspect_ratio: "9:16"` natively for the Story format |
| Node.js | v22.20.0 (existing, no change) | Eval harness runtime | Matches `scripts/test-webhook.js` / `wizard/run.js` — no new runtime |

### Supporting

| Library | Purpose | When to Use |
|---|---|---|
| None required (plain `https`/`fetch`) | All 4 engines are called via plain HTTPS REST, exactly like the existing `scripts/test-webhook.js` pattern | Default — no new npm dependency needed for API calls |
| `agent-browser` (global skill, already installed) | Attempt template/theme creation in the vendor's web editor when no API path exists (primarily Gamma) | Only for the "attempt automation before runbook" step per CONTEXT.md locked decision |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| Building the Ideogram baseline via the harness's own prompt logic | Copy the exact `jsonBody` template from `n8n/workflow.json`'s `🔤 Ideogram v3` node | Use the exact copy — anything else isn't actually a "production baseline" |
| Creatomate `template_id` (editor-authored) | Creatomate `source` (inline RenderScript JSON, repo-committed) | `source` is programmatic, versionable in git, and requires zero manual editor work — strongly preferred for this phase; `template_id` remains an option if the API-first attempt on the editor itself is desired for visual WYSIWYG convenience, but is not required |

### Installation

No new packages. The harness is plain Node.js + `.env`:

```bash
# Local .env additions needed for the harness (NOT n8n's server-side env — separate, per CONTEXT.md "keys in .env")
CREATOMATE_API_KEY=
GAMMA_API_KEY=
# FAL_API_KEY, IDEOGRAM_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY already documented in .env.example
# (FAL_API_KEY/IDEOGRAM_API_KEY currently live server-side in n8n only — the harness needs its own local copies)
```

---

## Architecture Patterns

### Recommended Project Structure

```
scripts/
├── test-webhook.js                 # existing, unchanged
└── eval-design-engines.js          # NEW — standalone comparison harness
creatomate/
└── templates/
    ├── single.json                 # RenderScript source — 1:1, canonical slide-1/standalone layout
    ├── carousel-slide.json         # RenderScript source — 1:1, canonical middle-slide layout
    ├── carousel-closing.json       # RenderScript source — 1:1, canonical closing-slide layout (no image)
    └── story.json                  # RenderScript source — 9:16
eval-output/                        # gitignored — timestamped comparison runs
└── 2026-08-0X_HHMM/
    ├── index.html                  # blind-first side-by-side gallery (A/B/C/D → engine names on reveal)
    ├── briefs.json                 # the exact brief set used (for reproducibility)
    ├── rubric-scores.json          # Claude's proposed scores + evidence notes
    ├── ideogram/*.png
    ├── creatomate/*.png
    ├── gamma/*.png
    ├── hybrid/*.png
    └── decision.md                 # EVAL-06 written decision doc (or committed to .planning/)
```

### Pattern 1: Ideogram baseline must be a byte-for-byte replica of the production call

**What:** Copy the exact request shape from `n8n/workflow.json`'s Ideogram nodes — do not invent a new "fairer" or "improved" Ideogram call.
**When to use:** Building the harness's baseline candidate.
**Example (from the actual n8n workflow — `🔤 Ideogram v3` node, single/carousel path):**
```json
POST https://api.ideogram.ai/generate
Headers: { "Api-Key": "<IDEOGRAM_API_KEY>", "Content-Type": "application/json" }
Body:
{
  "image_request": {
    "prompt": "<image_prompt> — professional design, dark background #1a1a2e, purple and magenta gradient elements, bold readable typography, social media post",
    "aspect_ratio": "ASPECT_1_1",
    "model": "V_2_TURBO",
    "magic_prompt_option": "OFF",
    "style_type": "DESIGN"
  }
}
```
Story variant uses `"ASPECT_9_16"` and an extended prompt suffix (`vertical 9:16 Story composition, subject centered in upper-middle third, safe zone top and bottom 14% for UI...`). See Codebase Findings below for the full text.
**Open decision for the plan:** the production prompt suffix hardcodes the OLD `#1a1a2e` palette approximation. CONTEXT.md's canonical brand spec (`#070A18`→`#13082B`→`#08031A` gradient, `#A200D6` magenta glow) supersedes it. Recommend updating the Ideogram baseline's prompt-suffix colors to the canonical palette for the comparison (so all 4 candidates are judged against the SAME target aesthetic) while keeping every other param (`model`, `magic_prompt_option`, `style_type`, endpoint) identical to production — flag this explicitly as a documented harness decision, not a silent change.

### Pattern 2: Creatomate template-as-code (RenderScript `source`, not `template_id`)

**What:** Define the full composition (background image element, headline text element with auto-fit, badge/CTA elements) as a JSON file committed to the repo, passed via the render request's `source` field instead of referencing a pre-built `template_id`.
**When to use:** EVAL-01 template creation — this is the "attempt API first" path and is expected to succeed without browser automation.
**Example structure (image render, single post):**
```json
POST https://api.creatomate.com/v2/renders
Headers: { "Authorization": "Bearer <CREATOMATE_API_KEY>", "Content-Type": "application/json" }
Body:
{
  "output_format": "jpg",
  "width": 1080,
  "height": 1080,
  "elements": [
    { "type": "image", "source": "<background_url>", "width": "100%", "height": "100%", "fit": "cover" },
    {
      "type": "text",
      "text": "<headline>",
      "font_family": "Syne",
      "font_weight": "700",
      "fill_color": "#FFFFFF",
      "width": "80%", "height": "40%",
      "x": "10%", "y": "30%",
      "font_size": null,
      "font_size_minimum": "24px",
      "font_size_maximum": "64px"
    }
  ]
}
```
**Trade-offs:** `font_size: null` + min/max = Creatomate's "auto-sized text, fixed dimensions" mode — the officially recommended mode for variable-length text that must not overflow (confirmed via official docs, `creatomate.com/docs/fundamentals/template-editor/text-sizing`). This directly targets the veterinaria carousel's real "veterinaria s." overflow bug as a regression test.
**Fonts:** Creatomate's official docs state the platform includes "more than a thousand fonts from the Google Font project" built-in — Syne and Arimo are both Google Fonts, so `font_family: "Syne"` / `"Arimo"` should work directly by name with no custom font upload needed (verify empirically on first render; if a family name doesn't resolve, Creatomate also supports custom font declarations via a `fonts` array with `family`/`weight`/`style`/`source` URL fields as a fallback).

### Pattern 3: Gamma theme = in-app only, generation = API

**What:** `GET /v1.0/themes` lists existing standard + custom workspace themes, but there is no documented `POST /themes` to create one. Brand theme creation (EVAL-02) happens in Gamma's UI; once a `themeId` exists, every subsequent `format: "social"` generation call can reference it via API.
**When to use:** EVAL-02 — attempt agent-browser automation against the theme editor first; if blocked (canvas-based UI, non-standard DOM, or ToS concern), produce a runbook for Susana/Felix to execute manually (5-10 min, one-time).
**Example (generation, once theme exists):**
```json
POST https://api.gamma.app/v1.0/generations
Headers: { "X-API-KEY": "sk-gamma-...", "Content-Type": "application/json" }
Body:
{
  "inputText": "<headline / brief content>",
  "format": "social",
  "themeId": "<theme_id_from_editor>",
  "cardOptions": { "dimensions": "1x1" },
  "textOptions": { "amount": "concise" },
  "imageOptions": { "source": "noImages" }
}
```
Response is async — poll `GET /v1.0/generations/{id}` (5s interval per vendor docs). Export as PNG produces a `.zip` with one image per card — for single-card social generations this yields exactly one file; for carousel, verify empirically whether one generation call can produce N distinct cards mapped to N carousel slides, or whether N separate generation calls are needed (unverified in this research pass — flag as an open question to resolve in Phase A of the harness build).
**`imageOptions.source: "noImages"`** is the correct setting for the hybrid variant (Gamma composites text/layout only over a background you already generated with Flux/Nano Banana) — mirrors EVAL-05's two-stage design.

### Anti-Patterns to Avoid
- **Assuming Gamma's `themeId` can be created via API:** it cannot — don't burn time searching for a theme-creation endpoint that doesn't exist; go straight to agent-browser or runbook.
- **Rendering the Ideogram baseline through a different endpoint/model than production uses:** the `/v1/ideogram-v3/generate` "true v3" endpoint exists but production does NOT call it — using it would make the baseline unrepresentative of what's actually shipping today.
- **Polling Gamma aggressively:** stick to ~5s intervals per vendor docs; this is a standalone script (no n8n Wait-node 65s-floor constraint applies here, unlike the later n8n-integration phase), but tight polling still risks rate-limit friction.
- **Trusting a vendor's own CDN URL as final:** irrelevant for this phase (harness never touches Meta), but keep all four engines' raw output URLs local/disk-saved (`eval-output/`) since Creatomate render URLs expire after ~30 days (per prior milestone research, MEDIUM confidence) and Gamma/FAL outputs are similarly provider-transient.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Text auto-fit/shrink-to-fit for variable-length Spanish headlines | Custom canvas-measurement/font-shrinking JS | Creatomate's native `font_size: null` + `font_size_minimum`/`font_size_maximum` auto-size mode | Vendor-native, already solves exactly the veterinaria-carousel overflow bug class; hand-rolling this in a comparison harness (vs. testing the vendor's real capability) would defeat the purpose of the evaluation |
| Side-by-side visual review UI | A web app / React gallery | A single static `index.html` (vanilla HTML/CSS/JS, generated by the harness script) with click-to-zoom and an A/B/C/D→name reveal toggle | This is a disposable, one-time internal review tool — a full app is over-engineering; a static file opened locally satisfies "local page" from CONTEXT.md exactly |
| Rubric scoring math | A scoring library/framework | A simple weighted-sum in the harness script (visual criteria ×2, others ×1, per CONTEXT.md) | Trivial arithmetic, no library needed |

**Key insight:** Everything genuinely hard here (real text-layer rendering, auto-fit, brand theming) is exactly what Creatomate/Gamma are being evaluated FOR — building workarounds inside the harness would corrupt the comparison's validity.

---

## Common Pitfalls

### Pitfall 1: Ideogram baseline drifts from production behavior
**What goes wrong:** The harness's Ideogram call uses different params (different model, magic_prompt on, different aspect enum) than what actually ships, making the "must clearly beat Ideogram" comparison invalid.
**Why it happens:** It's tempting to use Ideogram's newer/"true" v3 endpoint since it's the vendor's current flagship, unaware production is pinned to the older `V_2_TURBO` synchronous endpoint.
**How to avoid:** Copy the exact `jsonBody` from `n8n/workflow.json`'s `🔤 Ideogram v3` / `🔤 Ideogram v3 — Story` nodes verbatim (endpoint, headers, model, magic_prompt_option, style_type). Only deliberately change the hardcoded `#1a1a2e` color reference to the canonical palette, and document that single change.
**Warning signs:** Decision doc references an Ideogram endpoint/model string that doesn't appear anywhere in `n8n/workflow.json`.

### Pitfall 2: Gamma theme creation blocked by canvas/non-standard DOM
**What goes wrong:** agent-browser's accessibility-tree snapshot approach may not surface Gamma's theme editor controls cleanly if it's canvas-rendered or uses heavy custom components (common for design tools), causing automation attempts to fail silently or partially.
**Why it happens:** Gamma's editor is a rich visual design surface, not a standard form-heavy web page — the exact category `agent-browser` is weakest on per its own docs (works best on standard DOM with accessible roles/labels).
**How to avoid:** Budget for the runbook fallback from the start rather than treating it as a rare escape hatch; attempt agent-browser first (per CONTEXT.md), but don't let a stuck automation attempt consume excessive time — timebox it, then hand off to Susana/Felix with a written click-by-click runbook.
**Warning signs:** `agent-browser snapshot -i` on the theme editor returns few/no interactive refs, or refs go stale faster than actions can be taken.

### Pitfall 3: Existing Gamma account can't get a fresh Pro trial
**What goes wrong:** The 14-day no-card Pro trial is confirmed for new signups; it is NOT confirmed whether an *existing* (older, Free/Plus-tier) account can start that same trial via in-app upgrade, or whether upgrading an existing account requires immediate payment.
**Why it happens:** Vendor marketing pages describe trials from the acquisition-funnel perspective (new users), not the upgrade-path perspective (existing users).
**How to avoid:** Check this early and explicitly during execution — log into Susana's account, go to the billing/upgrade page, and see whether "start free trial" appears or only "subscribe now." If only paid upgrade is offered, this trips the CONTEXT.md "free trials only... ESCALATE to the user before paying anything" rule — stop and ask before charging anything to Susana's account.
**Warning signs:** Billing page shows a price + "Subscribe" button with no trial framing.

### Pitfall 4: Cherry-picked single render per engine biases the decision
**What goes wrong:** Running each engine once on its best-case brief and calling it a comparison (same failure mode flagged in the prior milestone `PITFALLS.md`, Pitfall 8).
**Why it happens:** Time pressure, wanting to "just see it work."
**How to avoid:** CONTEXT.md already locks in the shape that avoids this: real posts, all 3 formats, mixed fixed+GPT-4o text, diacritics stress set, hybrid variant — treat that as the minimum test matrix, not a ceiling. Suggest at minimum: 2-3 real-post-derived briefs × 3 formats × (Ideogram, Creatomate, Gamma, Hybrid) = 24-36+ renders, plus the dedicated diacritics stress headline(s) layered on top of at least one brief per format.
**Warning signs:** Fewer than ~2 distinct briefs represented in the gallery per format.

### Pitfall 5: PNG alpha-channel / export format inconsistency across 4 engines
**What goes wrong:** Gamma exports PNG-only (per-card, in a zip); Creatomate can export `jpg` or `png`; Ideogram/FAL return whatever their API defaults to. Side-by-side comparison images with inconsistent format/compression can visually bias perception (JPEG artifacts vs. crisp PNG) independent of actual engine quality.
**Why it happens:** Each vendor has its own default.
**How to avoid:** Normalize all four engines' outputs to the same file format (PNG recommended, since Gamma forces it) before placing them in the gallery, and note this normalization step in the harness/decision doc so the visual comparison is apples-to-apples.
**Warning signs:** Visibly different compression artifacts between columns in the gallery that aren't attributable to the engine's actual rendering quality.

### Pitfall 6: Carousel-to-cards mapping unverified for Gamma
**What goes wrong:** Assuming one Gamma `generation` call naturally produces N separate card images matching N carousel slide briefs, when the actual behavior (single-generation multi-card vs. one-generation-per-card) is unconfirmed.
**Why it happens:** Gamma's Generate API is deck-first; "cards" and "carousel slides" are conceptually similar but not proven to have a clean automatic mapping for this use case.
**How to avoid:** Resolve empirically, early: run one small test generation (2-3 cards) through the Generate API with `format: "social"` before building the full carousel test matrix, and inspect the actual export .zip contents.
**Warning signs:** Carousel test briefs get skipped or stubbed for Gamma specifically because the mapping was never verified.

---

## Code Examples

### Ideogram v3 baseline call (exact production replica — single/carousel-slide, from `n8n/workflow.json`)
```javascript
// Source: n8n/workflow.json, node "🔤 Ideogram v3" (id: ideogram-generate)
const body = {
  image_request: {
    prompt: `${imagePrompt} — professional design, dark background #070A18, purple and magenta gradient elements (#8000A8 to #BA00E0), cyan accent #00E5FF, bold readable typography, social media post`,
    // NOTE: color reference intentionally updated from production's "#1a1a2e" to the
    // CONTEXT.md canonical palette — document this single deliberate deviation.
    aspect_ratio: "ASPECT_1_1",
    model: "V_2_TURBO",
    magic_prompt_option: "OFF",
    style_type: "DESIGN",
  },
};
// POST https://api.ideogram.ai/generate
// Headers: { "Api-Key": process.env.IDEOGRAM_API_KEY, "Content-Type": "application/json" }
```

### Ideogram v3 — Story variant (9:16, from `n8n/workflow.json`)
```javascript
// Source: n8n/workflow.json, node "🔤 Ideogram v3 — Story" (id: ideogram-generate-story)
const body = {
  image_request: {
    prompt: `${imagePrompt} — vertical 9:16 Story composition, subject centered in upper-middle third, safe zone top and bottom 14% for UI, dark background #070A18, purple and magenta gradient accents, bold readable typography`,
    aspect_ratio: "ASPECT_9_16",
    model: "V_2_TURBO",
    magic_prompt_option: "OFF",
    style_type: "DESIGN",
  },
};
```

### Creatomate render via inline RenderScript (`source`, no editor-authored template needed)
```javascript
// Source: creatomate.com/docs/api/quick-start/create-a-video-by-render-script (adapted for stills)
const body = {
  output_format: "png",       // or "jpg" — normalize to PNG for gallery consistency (Pitfall 5)
  width: 1080,
  height: 1080,
  elements: [
    { type: "image", source: backgroundUrl, width: "100%", height: "100%", fit: "cover" },
    {
      type: "text",
      text: headline,
      font_family: "Syne",
      font_weight: "700",
      fill_color: "#FFFFFF",
      width: "80%", height: "40%", x: "10%", y: "30%",
      font_size: null,
      font_size_minimum: "24px",
      font_size_maximum: "64px",
    },
  ],
};
// POST https://api.creatomate.com/v2/renders
// Headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`, "Content-Type": "application/json" }
```

### FAL.AI Flux 2 Pro / Nano Banana Pro — 9:16 support (hybrid-variant background)
```javascript
// fal-ai/flux-pro/v1.1 and fal-ai/nano-banana-pro both accept aspect_ratio directly
const body = {
  prompt: backgroundPrompt,
  aspect_ratio: format === "story" ? "9:16" : "1:1",
  // Nano Banana Pro's enum also includes 4:5, 3:4, etc. if ever needed later
};
```

---

## State of the Art

| Old Approach (milestone research, 2026-08-01 morning) | Current Approach (this document) | When Changed | Impact |
|---|---|---|---|
| Creatomate `template_id` authored in web editor, driven via `modifications` | RenderScript `source` JSON committed to the repo, no editor dependency | Discovered during Phase 15 research (same day) | De-risks EVAL-01 significantly — API-first attempt is very likely to succeed with zero browser automation |
| Gamma API `v0.2` referenced in some milestone-era secondary sources | Gamma API `v1.0` (v0.2 sunset/disabled 2026-01-16) | Confirmed via official Gamma developer docs during this research pass | Any lingering v0.2 endpoint references in earlier notes are stale — use v1.0 paths (`/v1.0/generations`, `/v1.0/themes`) exclusively |
| "Creatomate `v1`" base URL cited in milestone `STACK.md` | Official docs examples now show `api.creatomate.com/v2/renders` | Unclear exact date; verify live at execution time (docs may show both during a transition window) | Confirm the correct current base URL empirically on the first real API call before committing it to harness code |

**Deprecated/outdated:**
- Gamma API v0.2 — fully disabled since 2026-01-16, do not reference.
- The `#1a1a2e` brand color used throughout the existing n8n workflow's Ideogram prompts — CONTEXT.md's canonical palette (`#070A18` etc.) supersedes it; carry the canonical palette into every new template/prompt this phase produces.

---

## Open Questions

1. **Does Susana's existing Gamma account get offered a Pro trial on upgrade, or only a paid subscribe flow?**
   - What we know: New-signup Pro trials are 14 days, no credit card.
   - What's unclear: Whether that trial path is also shown to an already-registered account attempting to upgrade.
   - Recommendation: Check first thing when starting EVAL-02 execution; if only a paid path is shown, stop and escalate to the user per the locked "free trials only" budget rule before proceeding.

2. **Gamma carousel-to-cards mapping**: does one `format: "social"` generation produce N distinct card images cleanly usable as N carousel slides, or is one generation call needed per slide?
   - What we know: `format: "social"` + PNG export yields "one image per card" in a zip.
   - What's unclear: Whether card count/content is controllable enough to map 1:1 onto a specific pre-written 4-slide carousel brief, or whether Gamma's deck-generation nature makes this approximate at best.
   - Recommendation: Resolve empirically with one small test call before building the full carousel test matrix; this is exactly the kind of "architecturally weakest fit" risk the milestone research already flagged for Gamma.

3. **Exact current Creatomate base URL (`v1` vs `v2`)** — docs excerpts fetched during this research showed `v2` in some example curl commands; prior milestone research cited `v1`. Confirm on the first live test call and use whatever the API actually accepts (some SaaS APIs keep both live during a migration window).

4. **Whether Creatomate's `Syne`/`Arimo` font names resolve directly from its bundled Google Fonts library** without any font upload — HIGH confidence they will (vendor states 1000+ Google Fonts bundled) but not verified against this specific account; test with a text element on the very first render.

5. **agent-browser viability against Gamma's theme editor specifically** — unverified until attempted; the SKILL.md notes accessibility-tree snapshots work best on standard DOM, and design-tool canvases are a known weak spot for this class of tool. Budget the runbook fallback as the likely real path, not a rare edge case.

---

## Codebase Findings (for planner reference)

- **`scripts/test-webhook.js`** is the pattern to mirror for `scripts/eval-design-engines.js`: `require("dotenv").config({ path: ... "../.env" })`, plain `https`/`http` module POST helper (no `axios`/`node-fetch` dependency), CLI flags via `process.argv`, colored console output is optional (wizard/run.js has a `C`/`c()` helper worth reusing for readability).
- **`wizard/run.js` `IMAGE_MODELS`** object shape (`id`, `name`, `provider`, `cost`, `speed`, `strength`, `bestFor`, `bestForLabel`, `emoji`, `falModel`) is the shape Phase 17 will extend with the winning engine — worth keeping the eval harness's own candidate-metadata structure loosely compatible (same field names) to ease that later hand-off, though this phase does not modify `wizard/run.js` itself.
- **Ideogram v3 in production (`n8n/workflow.json`)**: THREE near-duplicate nodes call `https://api.ideogram.ai/generate` (not FAL, despite `wizard/run.js`'s `falModel: "fal-ai/ideogram/v3"` field being misleading/unused for this engine) — `🔤 Ideogram — Slide` (older, per-carousel-slide, prompt built differently), `🔤 Ideogram v3` (single-post canonical), `🔤 Ideogram v3 — Story` (9:16). All three use `model: "V_2_TURBO"` with an explicit code comment noting this is **NOT** the true Ideogram v3 endpoint (`/v1/ideogram-v3/generate` has a different, multipart-based, request shape). The harness baseline should replicate `🔤 Ideogram v3` / `🔤 Ideogram v3 — Story` exactly (see Code Examples above).
- **`prompts/brand-voice.md`** already documents the production Ideogram prompting convention (`Text says: "..."` pattern, `magic_prompt_option: OFF`, `V_2_TURBO`) and the old `#1a1a2e` reference — useful as a starting point, but its color references need the canonical-palette update per CONTEXT.md.
- **`brand/referencias/`** contains 28 real post images; the July 2026 ones (`2026-07-15_carousel_18183218272396844_*`, `2026-07-20_carousel_17981827086045232_*`, `2026-07-17_single_*`, `2026-07-21_single_*`) are the explicit visual "norte" to match. The 2026-07-20 carousel's slide 2 (`..._slide2.jpg`) contains the real "veterinaria s." overflow bug referenced in CONTEXT.md — use as a literal visual reference when building the Creatomate auto-fit test case.
- **`.env.example`** currently lists `FAL_API_KEY`/`IDEOGRAM_API_KEY`/`OPENAI_API_KEY` as n8n-server-side-only (set on the Azure Container App, not local `.env`). The eval harness needs its OWN local copies of these (plus new `CREATOMATE_API_KEY`/`GAMMA_API_KEY`) in the project's local `.env` — this is a deliberate, harness-specific addition, not a change to the n8n-side configuration.
- **No existing Creatomate or Gamma credentials/keys anywhere in the repo** — both are greenfield for this phase, consistent with CONTEXT.md ("Creatomate: no account exists"; "Gamma: existing account, no API plan").
- **`agent-browser` skill** (`~/.claude/skills/agent-browser/SKILL.md`) is installed globally and ready to use for the "attempt automation first" step — core loop is `open` → `snapshot -i` → `click`/`fill` by `@eN` ref → re-snapshot. Best suited to standard-DOM sites with accessible form/button semantics; canvas-heavy design-tool UIs (a real risk for both Creatomate's and especially Gamma's visual editors) are its documented weak spot, reinforcing the runbook-fallback expectation above.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `n8n/workflow.json` (Ideogram nodes: `🔤 Ideogram — Slide`, `🔤 Ideogram v3`, `🔤 Ideogram v3 — Story`, router `🎨 ¿Ideogram?`) — exact production API call shapes
- Direct codebase read: `scripts/test-webhook.js`, `wizard/run.js`, `.env.example`, `prompts/brand-voice.md` — existing patterns and env-var conventions
- Direct codebase read: `.planning/phases/15-comparison-templates-eval-harness-decision/15-CONTEXT.md` — all locked decisions and brand spec
- `creatomate.com/docs/api/quick-start/create-a-video-by-render-script`, `.../render-script/json-structure`, `.../reference/create-a-render`, `.../reference/get-all-templates-in-a-project`, `.../fundamentals/template-editor/text-sizing`, `.../rest-api/authentication` — official docs, confirmed RenderScript `source` field, `/templates` GET-only behavior, auto-size text mode, font_family Google Fonts bundling claim
- `developers.gamma.app/get-started/access-and-pricing`, `.../get-started/understanding-the-api-options` — official docs, plan-gating for API access, `themeId`/`GET /v1.0/themes` read-only theme behavior, social export format
- `help.gamma.app/en/articles/11962420-does-gamma-have-an-api` — official help center, API key generation steps, `X-API-KEY` header format, plan requirement
- `www.remotion.dev/docs/license/faq`, `remotion.pro/license` (re-confirmed, unchanged from prior milestone research) — Automators license, $0.01/render + $100/month minimum, independent of headcount
- `fal.ai/models/fal-ai/flux-pro/new/api`, `fal.ai/models/fal-ai/nano-banana-pro/api` (via WebSearch aggregation of fal.ai docs) — confirmed `aspect_ratio` enum including `9:16` for both models

### Secondary (MEDIUM confidence)
- WebSearch-aggregated Creatomate free trial terms (50 credits, no credit card; exact duration in days not found in this pass) — cross-referenced across `creatomate.com/pricing` fetch + multiple third-party pricing trackers, directionally consistent
- WebSearch-aggregated Gamma pricing tiers (Free/Plus $12/Pro $25 (or $18/seat per another source — minor conflict)/Ultra $100/Team/Business) and Pro's 14-day no-card trial — third-party pricing-tracker sites, not Gamma's own pricing page directly (which returned HTTP 403 to WebFetch); confirm live before committing
- Gamma API v0.2 sunset date (2026-01-16) — WebSearch result citing Gamma's own changelog page, not independently re-fetched in this pass
- Creatomate base URL `v2` vs `v1` — inconsistency between milestone-era research (`v1`) and this pass's docs excerpts (`v2`); flagged as Open Question #3, resolve on first live call

### Tertiary (LOW confidence, carried from prior milestone research, unresolved)
- Creatomate render-URL 30-day expiry — not independently re-verified this pass, carried from `.planning/research/STACK.md`
- Meta's PNG alpha-channel-to-JPEG fill-color behavior — irrelevant to THIS phase (harness never touches Meta) but relevant context for Phase 16, carried forward unchanged

---

## Metadata

**Confidence breakdown:**
- Standard stack (Creatomate/Gamma/Ideogram/FAL API shapes): MEDIUM-HIGH — official docs confirmed, some fields (exact base URL version, exact trial duration in days) need live-call verification during execution
- Architecture (harness structure, template-as-code pattern): HIGH — directly derived from codebase patterns already proven in this repo, plus officially documented vendor capabilities
- Pitfalls: MEDIUM-HIGH — vendor-specific risks (Gamma theme-creation gap, trial-on-existing-account uncertainty) are well-reasoned from official docs but not hands-on confirmed against Susana's actual account yet

**Research date:** 2026-08-01
**Valid until:** ~30 days for Creatomate/FAL/Ideogram (stable, mature APIs); ~14 days for Gamma specifically (API v1.0 is young, post-v0.2-sunset, pricing/plan details showed minor cross-source conflicts — re-verify pricing/trial terms if planning is delayed)
