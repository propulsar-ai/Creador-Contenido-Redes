# Phase 15: Comparison, Templates, Eval Harness & Decision - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce a defensible, evidence-based decision on which design engine (if any) replaces or coexists with Ideogram: Propulsar brand template/theme in Creatomate and Gamma, standalone eval harness in `scripts/` (zero contact with n8n, `content_sessions`, Google Sheets, or Meta Graph API), Spanish-diacritics stress test, two-stage hybrid variant, 7-criteria rubric scoring, and a written decision document. Remotion stays paper-only (EVAL-07). Requirements: EVAL-01..07.

</domain>

<decisions>
## Implementation Decisions

### Template authoring & vendor accounts
- **Claude attempts template creation FIRST for both vendors** (API and/or browser automation via agent-browser). If the vendor's editor genuinely blocks automation, fall back to a detailed step-by-step runbook the user executes in the editor.
- **Gamma:** account already EXISTS (Susana's account — regular account, NO API plan contracted). Coordinate with the user for credentials/access; API access may need enabling or working within the existing plan's limits.
- **Creatomate:** NO account exists — create fresh with Propulsar credentials.
- **Budget: free trials only.** The whole evaluation runs on free trials/free credits. If a vendor's trial can't produce what the comparison needs, ESCALATE to the user before paying anything.

### Test briefs
- **All 3 formats per engine:** the same brief renders as single (1:1), carousel slides, and story (9:16) — the decision must cover everything Phase 16 will integrate.
- **Content source: real published Propulsar posts** — reuse texts/topics from actual IG posts (proven style, directly comparable with what Ideogram produced for the same kind of content).
- **Text inside images: mixed approach.** Fixed hand-written texts for the base comparison (identical input across all engines) + at least 1 brief using real GPT-4o pipeline output to exercise auto-fit/overflow with realistic length variance.
- **Hybrid variant background model: Claude's choice** (Flux $0.03 vs Nano Banana $0.15 per brief, documented rationale).
- The diacritics stress set (EVAL-04: á/é/í/ó/ú/ñ/¿¡ in headline position) rides on top of these briefs per requirements.

### Scoring & decision rule
- **Weighting: visual quality counts double.** Text legibility, brand consistency, and diacritics weigh 2x; latency, cost/image, and n8n integration complexity weigh 1x; layout quality 2x (visual criterion). Weighted rubric documented in the decision doc.
- **Claude proposes scores with evidence; user validates.** User reviews the gallery, adjusts any score they disagree with — user's adjustment is final.
- **Winner rule: must beat Ideogram clearly.** A winner exists only if it beats the Ideogram baseline on the weighted visual criteria. If nobody clearly beats Ideogram, the decision is "stay with Ideogram" — a valid phase outcome.
- **Coexist by default.** A winning engine enters the router as a NEW branch; Ideogram stays available. Full replacement only if the winner dominates on ALL visual criteria.

### Visual review
- **Side-by-side HTML gallery** (local page): renders grouped by brief/format, engines in columns, click-to-zoom.
- **Blind first:** first scoring pass with engines anonymized (A/B/C/D labels); names revealed afterwards, scores adjustable then.
- **Susana co-reviews:** the gallery is shared with Susana; final engine decision needs sign-off from BOTH Felix and Susana.

### Brand identity (canonical spec — supersedes the roadmap's `#1a1a2e` approximation)
- **Backgrounds:** deep night blue base `#070A18` → `#0E122B`; dark purple shadows `#13082B`; top magenta/purple glow `#4A025D`. Typical gradient: `linear-gradient(180deg, #070A18 0%, #13082B 50%, #08031A 100%)` with a magenta light touch (`#A200D6`) top/center.
- **Primary colors:** brand purple/magenta `#8000A8`→`#BA00E0` (logo/isotype/gradients); neon cyan `#00E5FF` (or `#00D2ED`) for `.AI` accent/CTA borders; pure white `#FFFFFF` for main headlines on dark.
- **Secondary:** pearl blue/lavender `#6B7AFF`→`#8FA2FF` (keyword highlights); dark purple container `#1E0C42` (badges like "CASO: X" / "SIGUE LEYENDO 👇" / secondary buttons).
- **In-post accent palette (as used in real posts):** labels/main accents `#C026D3`; cold highlighted words `#38BDF8`; highlighted titles `#E0007A`; alt cold keywords `#00BFFF`; neon accents `#00FFFF` + `#FF00FF`.
- **YAML summary:** Primary_White `#FFFFFF`, Cyan_Neon_Accent `#00E5FF`, Brand_Purple_Magenta `#BA00E0`, Text_Highlight_Blue `#788BFF`, Dark_Container_Purple `#1E0C42`, Dark_Background `#070A18`.
- **Typography:** titles **Syne bold**; body **Arimo regular**; custom subtitles defined per content.
- **Image style:** photorealistic AI-generated; warm/emotional atmosphere for opening slides, tech/modern for middle slides.
- **Canonical layouts (from real carousels):** slide 1 = image behind with centered text + "CASO:" badge; middle slides = image right, text left; closing slide = no image (blank dark bg), centered text + CTA line.
- **The templates must NOT deviate from this typology** — this is the existing, working Propulsar visual language.

### Claude's Discretion
- Hybrid variant background model choice (Flux vs Nano Banana) per brief
- Exact number of briefs (within "real posts, all 3 formats, mixed texts" constraints)
- Gallery implementation details
- Exact rubric point scale and score presentation
- How to attempt vendor automation (API vs browser) and when to fall back to runbook

</decisions>

<specifics>
## Specific Ideas

- **Reference images (visual ground truth): `brand/referencias/`** — 28 images pulled from Propulsar's real IG account (2026-04 → 2026-07). **The July 2026 posts are the target aesthetic** ("el norte"): veterinaria carousel (2026-07-20, 4 slides showing all 3 canonical layouts), estética carousel (2026-07-15), gym/HVAC singles.
- **Real overflow bug as test case:** slide 2 of the 2026-07-20 veterinaria carousel shows "veterinaria s." breaking badly — a genuine auto-fit failure from the current pipeline. Use this exact headline length as one of the stress inputs.
- User can pull more reference images from IG via Graph API (method proven this session: `/{ig-user-id}/media` with `media_url`, children for carousels).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Reels/video style was mentioned in passing as existing content types, but video remains out of scope per REQUIREMENTS.md — Remotion paper-only.)

</deferred>

---

*Phase: 15-comparison-templates-eval-harness-decision*
*Context gathered: 2026-08-01*
