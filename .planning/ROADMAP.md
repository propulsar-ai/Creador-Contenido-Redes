# Roadmap: Propulsar Content Engine

## Milestones

- ✅ **v1.0 Carousel Support** — Phases 1-3 (shipped 2026-04-10) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Automatic Publishing** — Phases 4-9 (shipped 2026-04-17) → [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Stories Publishing** — Phases 10-13 + inserted 12.1/12.2/12.3 (shipped 2026-08-01) → [archive](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 Diseño Premium** — Phases 14-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 Carousel Support (Phases 1-3) — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Wizard Carousel Flow (2/2 plans) — completed 2026-04-04
- [x] Phase 2: n8n Content Generation (2/2 plans) — completed 2026-04-06
- [x] Phase 3: n8n Image Generation + WhatsApp Preview (3/3 plans) — completed 2026-04-06

See [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.1 Automatic Publishing (Phases 4-9) — SHIPPED 2026-04-17</summary>

- [x] Phase 4: Azure Blob Re-hosting (2/2 plans) — completed 2026-04-16
- [x] Phase 5: Instagram Single-Photo Publishing (2/2 plans) — completed 2026-04-16
- [x] Phase 6: Facebook Single-Photo Publishing (2/2 plans) — completed 2026-04-17
- [x] Phase 7: Carousel Publishing IG + FB (3/3 plans) — completed 2026-04-17
- [x] Phase 8: Scheduling (2/2 plans) — completed 2026-04-17
- [x] Phase 9: Error Hardening + Hashtags + Token Alerts (3/3 plans) — completed 2026-04-17

See [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) for full phase details.

</details>

<details>
<summary>✅ v1.2 Stories Publishing (Phases 10-13 + 12.1/12.2/12.3) — SHIPPED 2026-08-01</summary>

- [x] Phase 10: Wizard Historia Format (2/2 plans) — completed 2026-04-19
- [x] Phase 11: Story Image Generation (2/2 plans) — completed 2026-04-23
- [x] Phase 12: Instagram Story Publishing (2/2 plans) — completed 2026-04-23
- [x] Phase 12.1 (INSERTED): CDN Layer / Azure Front Door — FAILED 2026-04-23 (Meta rejects AFD hostnames), rolled back, superseded by 12.2
- [x] Phase 12.2 (INSERTED): Hostinger VPS Re-host Layer (3/3 plans) — completed 2026-07-31
- [x] Phase 12.3 (INSERTED): Supabase → Azure Postgres Migration (3/3 plans) — completed 2026-08-01
- [x] Phase 13: Facebook Story + Log + Notifications (3/3 plans) — completed 2026-08-01

See [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) for full phase details, [v1.2-MILESTONE-AUDIT.md](milestones/v1.2-MILESTONE-AUDIT.md) for the audit.

</details>

### 🚧 v1.3 Diseño Premium (In Progress)

**Milestone Goal:** Replace Ideogram's diffusion-model text-in-image with a real design/typography engine — chosen by evidence-driven comparison (Gamma vs Creatomate vs Remotion-paper vs Ideogram baseline) — integrated into the existing n8n pipeline for all 3 formats (single, carousel, story), plus a v1.2 carry-over live-fire regression check.

- [x] **Phase 14: v1.2 Regression Live-Fire** - Confirm single + carousel formats still work end-to-end after the Postgres migration, before any new design-engine work lands (completed 2026-08-01)
- [ ] **Phase 15: Comparison, Templates, Eval Harness & Decision** - Build brand templates in Creatomate/Gamma, render a standalone comparison (incl. diacritics stress test + hybrid variant) against Ideogram baseline, score against the 7-criteria rubric, and produce the winning-engine + Ideogram coexist/replace decision (Remotion stays paper-only)
- [ ] **Phase 16: Winning-Engine Integration (All Formats)** - Wire the Phase 15 winner into the n8n `image_model` router as an additive branch and prove it publishes real single/carousel/story posts through the unchanged rehost → WhatsApp → Meta chain
- [ ] **Phase 17: Wizard Update & Milestone Close** - Wizard surfaces/suggests the winning engine to the user, completing the milestone's user-visible surface

## Phase Details

### Phase 14: v1.2 Regression Live-Fire
**Goal**: Confirm single-post and carousel formats still work end-to-end after the Postgres migration (v1.2 carry-over), establishing a clean baseline before v1.3's design-engine work begins.
**Depends on**: Nothing (first phase of v1.3 — deliberately sequenced before new-feature work per research, to isolate pre-existing Postgres-migration bugs from new v1.3 bugs)
**Requirements**: VERIF-01, VERIF-02
**Success Criteria** (what must be TRUE):
  1. A live single-post run persists its session correctly in Azure PostgreSQL, WhatsApp SI approval succeeds, and the post publishes to both Instagram and Facebook.
  2. A live carousel run (multi-slide) persists its session correctly, WhatsApp SI approval succeeds, and the carousel publishes to both Instagram and Facebook.
  3. No Postgres-migration-related errors surface during either live-fire test, confirming a clean baseline for v1.3 work.
**Plans**: 3 plans

Plans:
- [ ] 14-01-PLAN.md — Reroute hashtag-comment onError (skip, not halt) + patch-based production deploy, unblocking the FB feed branch
- [ ] 14-02-PLAN.md — VERIF-01: single-post live-fire (Wizard → Postgres session → WhatsApp SI → IG+FB publish), full verification + cleanup
- [ ] 14-03-PLAN.md — VERIF-02: carousel live-fire (multi-slide), full verification + cleanup + clean-baseline phase close

### Phase 15: Comparison, Templates, Eval Harness & Decision
**Goal**: Produce a defensible, evidence-based decision on which design engine (if any) replaces or coexists with Ideogram, backed by real rendered output scored against a documented rubric — not predetermined.
**Depends on**: Phase 14 (clean regression baseline)
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07
**Success Criteria** (what must be TRUE):
  1. A Propulsar brand template/theme exists in both Creatomate and Gamma, matching the dark `#1a1a2e` background, purple-magenta gradient, and bold Spanish typography brand.
  2. A standalone eval harness script (`scripts/`) renders the same test brief(s) through Creatomate, Gamma, and Ideogram v3 (baseline) with zero contact with n8n, `content_sessions`, Google Sheets, or Meta Graph API.
  3. A Spanish-diacritics stress test set (á/é/í/ó/ú/ñ/¿¡ in headline position) and a two-stage hybrid variant (AI background + typographic overlay) are both included among the rendered comparison outputs.
  4. A written decision document scores all candidates against the 7-criteria rubric (legibility, brand consistency, layout quality, diacritics, latency, cost/image, n8n integration complexity) and names the winning engine plus an explicit Ideogram coexist-vs-replace call.
  5. Remotion is documented as cost-rejected (paper analysis only, Automators license floor cited) with an explicit reconsideration trigger, with no Remotion render service built.
**Plans**: TBD

### Phase 16: Winning-Engine Integration (All Formats)
**Goal**: The winning engine named by Phase 15's decision is fully wired into the n8n pipeline and can publish real content across all 3 formats through the existing, unchanged downstream chain.
**Depends on**: Phase 15 (decision gates all integration work — engine identity is not known until Phase 15 completes)
**Requirements**: INTEG-01, INTEG-02, INTEG-03, INTEG-04, INTEG-05, INTEG-06
**Success Criteria** (what must be TRUE):
  1. The winning engine is callable as a new, additive branch of the n8n `image_model` router, coexisting with the existing flux/ideogram/nanoBanana branches (hard replacement only if Phase 15 explicitly decided that).
  2. A single post generated with the winning engine flows Wizard → n8n → WhatsApp SI approval → live publish to Instagram + Facebook.
  3. A carousel (N slides, visually consistent) generated with the winning engine publishes live to Instagram + Facebook.
  4. A 9:16 Story generated with the winning engine publishes live to Instagram + Facebook.
  5. Auto-fit/overflow handling is tuned against real (long, accented, punctuation-heavy) GPT-4o caption variance without visual breakage, and the winning engine's output flows through the existing rehost-service → WhatsApp preview → Meta publish chain with zero downstream changes.
**Plans**: TBD

### Phase 17: Wizard Update & Milestone Close
**Goal**: The Wizard surfaces the winning engine as a real user-facing choice, completing the milestone's user-visible surface and closing v1.3.
**Depends on**: Phase 16 (needs the exact `image_model` string value the n8n router now expects)
**Requirements**: INTEG-07
**Success Criteria** (what must be TRUE):
  1. The Wizard's `IMAGE_MODELS` object includes the winning engine with correct identifier/cost metadata.
  2. `suggestModel()` recommends the winning engine for the appropriate content type/post type during a Wizard run.
  3. A user running the Wizard end-to-end can accept the suggested premium engine and receive a live-published post without manually overriding the suggestion.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 14 → 15 → 16 → 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Wizard Carousel Flow | v1.0 | 2/2 | Complete | 2026-04-04 |
| 2. n8n Content Generation | v1.0 | 2/2 | Complete | 2026-04-06 |
| 3. n8n Image Generation + WhatsApp Preview | v1.0 | 3/3 | Complete | 2026-04-06 |
| 4. Azure Blob Re-hosting | v1.1 | 2/2 | Complete | 2026-04-16 |
| 5. Instagram Single-Photo Publishing | v1.1 | 2/2 | Complete | 2026-04-16 |
| 6. Facebook Single-Photo Publishing | v1.1 | 2/2 | Complete | 2026-04-17 |
| 7. Carousel Publishing (IG + FB) | v1.1 | 3/3 | Complete | 2026-04-17 |
| 8. Scheduling | v1.1 | 2/2 | Complete | 2026-04-17 |
| 9. Error Hardening + Hashtags + Token Alerts | v1.1 | 3/3 | Complete | 2026-04-17 |
| 10. Wizard Historia Format | v1.2 | 2/2 | Complete | 2026-04-19 |
| 11. Story Image Generation | v1.2 | 2/2 | Complete | 2026-04-23 |
| 12. Instagram Story Publishing | v1.2 | 2/2 | Complete | 2026-04-23 |
| 12.1. CDN Layer | v1.2 | 2/3 | FAILED — Meta rejects AFD hostnames, rolled back (superseded by 12.2) | 2026-04-24 |
| 12.2. Hostinger VPS Re-host Layer | v1.2 | 3/3 | Complete | 2026-07-31 |
| 12.3. Supabase → Azure Postgres Migration | v1.2 | 3/3 | Complete | 2026-08-01 |
| 13. Facebook Story + Log + Notifications | v1.2 | 3/3 | Complete | 2026-08-01 |
| 14. v1.2 Regression Live-Fire | v1.3 | Complete    | 2026-08-01 | - |
| 15. Comparison, Templates, Eval Harness & Decision | v1.3 | 0/TBD | Not started | - |
| 16. Winning-Engine Integration (All Formats) | v1.3 | 0/TBD | Not started | - |
| 17. Wizard Update & Milestone Close | v1.3 | 0/TBD | Not started | - |
