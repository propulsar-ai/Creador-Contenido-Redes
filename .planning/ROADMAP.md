# Roadmap: Propulsar Content Engine

## Milestones

- ✅ **v1.0 Carousel Support** — Phases 1-3 (shipped 2026-04-10) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Automatic Publishing** — Phases 4-9 (shipped 2026-04-17) → [archive](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Stories Publishing** — Phases 10-13 (in progress)

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

### 🚧 v1.2 Stories Publishing (In Progress)

**Milestone Goal:** Tras aprobar SI en WhatsApp, publicar Story vertical 9:16 en Instagram + Facebook con imagen AI, scheduling <22h, audit trail — reutilizando pipeline v1.0/v1.1 sin romperlo.

- [ ] **Phase 10: Wizard Historia Format** - Add "Historia" as a third format in Wizard with Story-aware scheduling and model restrictions
- [ ] **Phase 11: Story Image Generation** - Route story briefs to Ideogram 9:16 in n8n with Supabase session persistence and WA preview disclaimer
- [ ] **Phase 12: Instagram Story Publishing** - Create IG Story container, publish, retrieve permalink/expiry, wire error handler; SCHED-02 guard in same phase
- [ ] **Phase 13: Facebook Story + Log + Notifications** - Publish FB Story, extend Sheets log schema, send Story-specific WA success notification

## Phase Details

### Phase 10: Wizard Historia Format
**Goal**: Users can select "Historia" in the Wizard and submit a Story brief with correct 9:16 metadata and scheduling cap enforced before the webhook fires
**Depends on**: Phase 9 (v1.1 complete)
**Requirements**: WIZ-01, WIZ-02, WIZ-03, WIZ-04, SCHED-01
**Success Criteria** (what must be TRUE):
  1. User sees "Historia" as a selectable option in Wizard PASO 3 alongside "Post Individual" and "Carrusel"
  2. Wizard brief JSON sent to webhook includes `format: "story"`, `aspect_ratio: "9:16"`, `num_images: 1`, and `story_expires_at`
  3. Wizard PASO 5 model selector only shows Ideogram v3 when format is Historia (Flux and Nano Banana are not offered)
  4. Wizard rejects scheduling a Story more than 22h in the future with a visible error message explaining the 24h Story expiry constraint
**Plans**: TBD

### Phase 11: Story Image Generation
**Goal**: Approved Story briefs produce a 9:16 vertical image in n8n, the session is persisted with `format: "story"`, and the WhatsApp preview includes the 9:16 vertical disclaimer
**Depends on**: Phase 10
**Requirements**: IMGEN-01, IMGEN-02, IMGEN-03, IMGEN-04, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. n8n routes `format=story` briefs to a new Story-specific image branch without touching the existing Post/Carousel path
  2. Ideogram v3 generates a 1080×1920 (9:16) image for Story briefs
  3. Supabase session record for the Story brief contains `format: "story"` readable by downstream nodes
  4. WhatsApp preview message includes a disclaimer that the image is 9:16 vertical (may appear cropped in WA) and that the caption is for review only and will not be sent to Meta
**Plans**: TBD

### Phase 12: Instagram Story Publishing
**Goal**: SI-approved Stories are published to Instagram and the permalink with expiry is retrievable; scheduling guard and error handler wiring complete for IG nodes
**Depends on**: Phase 11
**Requirements**: IGSTORY-01, IGSTORY-02, IGSTORY-03, IGSTORY-04, IGSTORY-05, IGSTORY-06, SCHED-02, ERR-01
**Success Criteria** (what must be TRUE):
  1. Live API test at phase start confirms the correct host (`graph.instagram.com` vs `graph.facebook.com`) for IG Story container creation and the result is documented before any production node is built
  2. A Story approved via WhatsApp SI appears on the Instagram profile as a 9:16 Story (not in the feed) within the expected wait window
  3. After publish, the workflow retrieves the Story permalink and `expires_at` (or computes `publish_time + 24h` as fallback) and both values flow to downstream nodes
  4. Hashtag comment nodes are never reached during a Story execution — the Story branch terminates independently
  5. n8n Code node rejects Story executions where `wait_seconds > 79200` (22h) before attempting container creation
  6. All IG Story publish nodes (`Create Story Container`, `Story media_publish`) have `onError` wired to the existing error handler subgraph
**Plans**: TBD

### Phase 13: Facebook Story + Log + Notifications
**Goal**: SI-approved Stories are also published to the Facebook Page, all Sheets logs include a Formato column, and the WhatsApp success notification contains Story-specific expiry and permalink information
**Depends on**: Phase 12
**Requirements**: FBSTORY-01, FBSTORY-02, FBSTORY-03, FBSTORY-04, NOTIF-01, LOG-01, LOG-02
**Success Criteria** (what must be TRUE):
  1. Live API test at phase start determines the correct FB Story flow (single-step vs 2-step) and the result is documented before any production node is built
  2. A Story approved via WhatsApp SI appears on the Facebook Page as a Story (not in the feed)
  3. FB Story publish node has `retryOnFail=false` and an assertion rejects Azure Blob URLs containing SAS query params before the FB Story container creation
  4. All existing Sheets log nodes (single, carousel, fail) write a `Formato` column without breaking historical rows; a new Story-specific log node writes `Formato=story` and `Expires_At`
  5. WhatsApp success notification for Stories includes IG Story permalink labeled "válido 24h", expiry timestamp in CET, and a note that FB Story has no permanent URL
**Plans**: TBD

## Progress

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
| 10. Wizard Historia Format | v1.2 | 0/TBD | Not started | - |
| 11. Story Image Generation | v1.2 | 0/TBD | Not started | - |
| 12. Instagram Story Publishing | v1.2 | 0/TBD | Not started | - |
| 13. Facebook Story + Log + Notifications | v1.2 | 0/TBD | Not started | - |
