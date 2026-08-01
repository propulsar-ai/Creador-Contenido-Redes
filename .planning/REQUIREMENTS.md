# Requirements: Propulsar Content Engine — Milestone v1.3 Diseño Premium

**Defined:** 2026-08-01
**Core Value:** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook

## v1.3 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Evaluación (EVAL)

- [ ] **EVAL-01**: Propulsar brand template created in Creatomate (dark `#1a1a2e` background, purple-magenta gradient, bold Spanish typography) — one-time manual authoring in the vendor editor
- [ ] **EVAL-02**: Propulsar brand theme created in Gamma (equivalent brand kit: colors, fonts, logo)
- [ ] **EVAL-03**: Standalone eval harness script (`scripts/`) renders the same brief through Creatomate, Gamma, and Ideogram v3 (baseline) — zero contact with n8n, `content_sessions`, Google Sheets, or Meta Graph API
- [ ] **EVAL-04**: Spanish diacritics stress test set (á/é/í/ó/ú/ñ/¿¡ in headline position) rendered through all candidate engines + Ideogram baseline
- [ ] **EVAL-05**: Two-stage hybrid variant (Flux/Nano Banana AI background + design-engine typographic overlay) included as a comparison contender
- [ ] **EVAL-06**: Documented comparison scored against the 7-criteria rubric (text legibility, brand consistency, layout quality, diacritics, render latency, cost/image, n8n integration complexity) + human review → written decision: winning engine AND Ideogram coexistence/replacement
- [ ] **EVAL-07**: Remotion paper analysis (Automators license $100/month minimum for programmatic rendering, regardless of headcount) documented in the decision report as cost-rejected, with an explicit reconsideration trigger (video/Reels milestone)

### Integración (INTEG)

- [ ] **INTEG-01**: Winning engine wired as a NEW branch of the n8n `image_model` router (coexists with flux/ideogram/nanoBanana; replacement only if EVAL-06 decides it)
- [ ] **INTEG-02**: User can generate and publish a single post with the winning engine end-to-end (Wizard → n8n → WhatsApp SI → IG+FB)
- [ ] **INTEG-03**: User can generate and publish a carousel (N slides, visual consistency across slides) with the winning engine
- [ ] **INTEG-04**: User can generate and publish a 9:16 Story with the winning engine
- [ ] **INTEG-05**: Auto-fit/overflow handling tuned against real GPT-4o caption-length variance (not just short test strings)
- [ ] **INTEG-06**: Winning engine's output flows through the existing rehost-service → WhatsApp preview → Meta publish chain with zero downstream changes
- [ ] **INTEG-07**: Wizard offers/suggests the premium engine (`IMAGE_MODELS` object + `suggestModel()` logic updated)

### Verificación carry-over v1.2 (VERIF)

- [ ] **VERIF-01**: Live-fire spot-check of single post format post-Postgres-migration (session persists, SI approval works, publishes to IG+FB)
- [ ] **VERIF-02**: Live-fire spot-check of carousel format post-Postgres-migration (same checks)

## Future Requirements

Deferred to a later milestone or the Content Studio GUI project. Tracked but not in current roadmap.

### Diseño Premium follow-ups

- **PREM-01**: Per-content-type engine routing (design engine for text-heavy educational posts; Ideogram/Flux/Nano Banana retained for photorealistic case studies) — trigger: comparison shows no single engine wins across all content types
- **PREM-02**: Remotion render service — trigger: video/Reels becomes a stated content goal
- **PREM-03**: SCHED-02 22h Story cap relaxation to 24h (Hostinger URLs don't expire; cap reason is moot)

### Content Studio GUI (separate project)

- **GUI-01**: Fix `has_own_image=true` silent session-persistence gap (top v1.2 audit item)
- **GUI-02**: In-app approval replacing WhatsApp SI/NO
- **GUI-03**: Template editing/preview UI

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Remotion real renders in the comparison | $100/month Automators-license floor + a new Azure render service just to evaluate — paper analysis (EVAL-07) suffices; user decision 2026-08-01 |
| Custom template editor / design UI | GUI feature — belongs to the separate Content Studio GUI project |
| Video/motion output | PROJECT.md: static images only; both Creatomate and Remotion tempt scope creep here |
| Multi-tenant brand kits | Single Propulsar brand only; multi-tenant is a productization concern |
| Interactive layout editing pre-approval | Approval is WhatsApp SI/NO on a rendered image; NO → regenerate is the existing correction path |
| `instagram_manage_comments` scope | Blocked on Susana's token regeneration — independent of any milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmap) | | |

**Coverage:**
- v1.3 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 ⚠️ (roadmap pending)

---
*Requirements defined: 2026-08-01*
*Last updated: 2026-08-01 after initial definition*
