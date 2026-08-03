# Phase 16: Winning-Engine Integration (All Formats) - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Phase 15 winner — the **Hybrid engine** (FAL Flux 2 Pro background + Creatomate typographic overlay, per the dual-signed 15-DECISION.md) — into the n8n `image_model` router as the replacement for Ideogram, and prove it publishes real single/carousel/story posts through the unchanged rehost → WhatsApp → Meta chain. Includes auto-fit tuning against real GPT-4o caption variance. Requirements: INTEG-01..06.

Key inputs from Phase 15: 5 approved Creatomate templates (`creatomate/templates/`), proven hybrid pipeline in `scripts/eval-design-engines.js`, hard requirement on chat legibility, dual-signed full-replacement decision with validation-period fallback.

</domain>

<decisions>
## Implementation Decisions

### Creatomate plan & budget
- **Claude researches current Creatomate pricing at phase start** and presents a recommendation (monthly cost computed from real posting volume) at a checkpoint — the user contracts with card only then.
- **Contracting happens AT PHASE START** (user preference — don't interrupt mid-phase). Spending cap: **up to ~$50/month**.
- **Flux backgrounds ($0.03 via FAL) budgeted separately: ~$3 total for this phase's tests** including re-fires — escalate only if exceeded (Phase 14 pattern).
- ~5 trial credits remain — usable for early dev smoke tests before the paid plan lands.

### Replacement behavior (router)
- **`image_model: "ideogram"` routes to the Hybrid pipeline** — transparent replacement. The Ideogram code stays dormant in the workflow, restorable manually as emergency fallback only.
- **Validation period: 10 real published posts** with the Hybrid — after that, the Ideogram code may be deleted (likely at v1.3 close or v1.4).
- **Gamma stays available STANDALONE, on demand** — NOT wired into the n8n router. The eval harness (`scripts/eval-design-engines.js`), Propulsar theme (`themeId ergo9wmo77nbvra`), and GAMMA_API_KEY remain working and documented so the user can generate Gamma images ad-hoc "para algo en particular". Zero pipeline maintenance burden.
- **Flux and Nano Banana router branches stay untouched** — they serve photorealism WITHOUT text; the Hybrid replaces only Ideogram's text-in-image role.

### Backgrounds & the castellano rule
- **HARD RULE (user emphasized): any chat/phone screen shown in a generated image must have LEGIBLE text, always in castellano.** Implementation mechanic (Claude's): chat content is NEVER left to Flux generation — when a chat appears, it is COMPOSED as a design element (Creatomate overlay with real text bubbles, or a real mockup asset). Flux renders the scene; Creatomate renders ALL legible text.
- Flux prompts therefore avoid asking the model to draw readable text of its own; screens that appear incidentally in backgrounds must not carry fake/illegible text.
- **Background prompt sourcing — all three paths coexist:** (1) a pre-populated prompt bank (by post type/slide position), (2) user-provided prompt in the brief (optional field), (3) GPT-4o-generated with a hardened system template (brand atmosphere + no-illegible-text rules). The Wizard surface for choosing among these lands in Phase 17; this phase implements the n8n support.
- **Atmosphere follows slide position** (replicating the real July carousels): slide 1 warm/emotional (person, situation), middle slides tech/modern, closing slide text-only without image.
- Rejection path for a bad background THIS PHASE: the existing WhatsApp preview + NO → regenerate. No automatic vision-based detection.

### Live-fires & cleanup
- **Identical protocol to Phase 14 (locked):** test content deleted after verification; evidence captured BEFORE deletion (media IDs, permalinks, raw responses, Sheets row); WhatsApp 24h-window checkpoint + YCloud GET delivery verification before each fire; programmatic verification (Postgres `content_sessions`, Sheets exact-column check, YCloud, n8n node outputs) + user visual confirmation; FB posts deleted via Graph API; IG posts manual in-app deletion at end-of-phase checkpoint; Sheets rows stay as evidence.
- **3 sequential fires:** single first (cheapest smoke of the shared path) → carousel (multi-slide + visual consistency) → story (9:16). Each with its own checkpoints.
- **Auto-fit: batch offline FIRST (INTEG-05).** Generate ~10 real GPT-4o captions (long, accented, punctuation-heavy) and render them offline against the templates BEFORE touching production — live-fires run already tuned.
- **Test story: immediate manual deletion checkpoint** — user deletes it in-app (IG and FB) as soon as verified (stories aren't API-deletable).

### Claude's Discretion
- Replacement mechanics details within "ideogram routes to Hybrid" (node wiring, patch-based deploys per established discipline)
- Chat-mockup composition technique (Creatomate bubbles vs mockup asset)
- Prompt bank contents and GPT-4o template hardening
- Exact offline auto-fit test set and tuning thresholds
- Fire scheduling/order details within single → carousel → story

</decisions>

<specifics>
## Specific Ideas

- The deploy discipline from Phases 12.x/13/14 applies: diff remote vs last-known-good before PUT, patch-based deploys, re-verification-before-fire if any deploy lands between pre-flight and fire.
- Re-fire policy on real bugs: fix + re-fire directly, budget-tracked, no per-re-fire consultation (Phase 14 pattern).
- Pending user decision (independent, non-blocking): keep or cancel Gamma Pro (~216€/yr, already paid) — keeping Gamma standalone-available does NOT require Pro beyond the API key working; revisit at milestone close.

</specifics>

<deferred>
## Deferred Ideas

- **In-app review/approval UI replacing the WhatsApp phone preview** — user restated this desire explicitly ("ya no va a existir más el preview desde el celular; la herramienta UX/UI debería mostrar el review y desde ahí decidir"). This is GUI-02 of the separate Content Studio GUI project. REINFORCED as a priority for that project; this phase keeps WhatsApp SI/NO as the approval path.
- Wizard surfacing of the prompt-bank/user-prompt/GPT choice — Phase 17 (INTEG-07 territory).
- Deleting Ideogram code — after the 10-real-posts validation period, v1.3 close or v1.4.

</deferred>

---

*Phase: 16-winning-engine-integration-all-formats*
*Context gathered: 2026-08-03*
