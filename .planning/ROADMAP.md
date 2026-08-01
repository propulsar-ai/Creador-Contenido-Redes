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

- [x] **Phase 10: Wizard Historia Format** - Add "Historia" as a third format in Wizard with Story-aware scheduling and model restrictions (completed 2026-04-19)
- [x] **Phase 11: Story Image Generation** - Route story briefs to Ideogram 9:16 in n8n with Supabase session persistence and WA preview disclaimer (completed 2026-04-23)
- [x] **Phase 12: Instagram Story Publishing** - Create IG Story container, publish, retrieve permalink/expiry, wire error handler; SCHED-02 guard in same phase (completed 2026-04-23; Options D/B/E band-aid applied — Phase 12.1 CDN Layer required)
- [x] **Phase 12.1 (NEW, URGENT): CDN Layer** - Azure Front Door Standard fronting Azure Blob restores Phase 4 re-host invariant broken by Meta 2026-04-17 domain-wide block. **FAILED 2026-04-23** — Meta rejects all AFD hostnames (default + custom domain), rolled back. Superseded by Phase 12.2.
- [x] **Phase 12.2 (NEW, URGENT): Hostinger VPS Re-host Layer** - Self-hosted upload/serve/delete microservice on the existing Hostinger VPS (EasyPanel wildcard domain, proven accepted by Meta via 2026-07-31 smoke test) replaces Azure Blob as the re-host backend. Same Options D revert pattern as 12.1, new backend. **COMPLETE 2026-07-31** — live E2E verification: real sub-workflow success + injected-failure execs, 5/5 Meta container-creation calls PASS.
- [x] **Phase 12.3 (NEW, URGENT): Supabase → Azure Postgres Migration** - Supabase project backing `content_sessions` permanently deleted (discovered 2026-08-01, full pipeline outage). Migrated session persistence to Azure PostgreSQL + rewired all 4 Supabase n8n nodes. **COMPLETE 2026-08-01** — patch-based deploy live (versionId `f81aeed2`, 92 nodes), 2 real Wizard Story fires proved the rewired Postgres INSERT works end-to-end (the exact node that failed pre-migration), WhatsApp preview delivered and user replied NO, zero Meta-facing nodes ran, dead Supabase Container App config retired. Unblocks Phase 13.
- [ ] **Phase 13: Facebook Story + Log + Notifications** - Live-fire re-confirm the already-built FB Story chain (Phase 12) against the Hostinger backend, extend Sheets log schema (Formato/Expires_At), send Story-specific WA success notification (depends on 12.2 for clean contract; **UNBLOCKED 2026-08-01 — resume from 13-01 Task 2**)

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
**Plans**: 2 plans
- [ ] 10-01-PLAN.md — PASO 3 Historia menu + PASO 5 Story branch (Ideogram auto-select) + validateImageIs916 helper
- [ ] 10-02-PLAN.md — PASO 6 22h cap + story_expires_at + brief spread + validateStoryBrief assert + RESUMEN Story display

### Phase 11: Story Image Generation
**Goal**: Approved Story briefs produce a 9:16 vertical image in n8n, the session is persisted with `format: "story"`, and the WhatsApp preview includes the 9:16 vertical disclaimer
**Depends on**: Phase 10
**Requirements**: IMGEN-01, IMGEN-02, IMGEN-03, IMGEN-04, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. n8n routes `format=story` briefs to a new Story-specific image branch without touching the existing Post/Carousel path
  2. Ideogram v3 generates a 1080×1920 (9:16) image for Story briefs
  3. Supabase session record for the Story brief contains `format: "story"` readable by downstream nodes
  4. WhatsApp preview message includes a disclaimer that the image is 9:16 vertical (may appear cropped in WA) and that the caption is for review only and will not be sent to Meta
**Plans**: 2 plans
- [ ] 11-01-PLAN.md — Supabase schema probe + 5 new Story branch nodes + Parsear contenido patch + WA disclaimer + Phase-11 guard
- [ ] 11-02-PLAN.md — Deploy to n8n-azure + E2E Historia brief + verify Ideogram 9:16 dimensions + Supabase format=story row + WA disclaimer

### Phase 12: Instagram Story Publishing
**Goal**: SI-approved Stories are published to Instagram and the permalink with expiry is retrievable; scheduling guard and error handler wiring complete for IG nodes
**Depends on**: Phase 11
**Requirements**: IGSTORY-01, IGSTORY-02, IGSTORY-03, IGSTORY-04, IGSTORY-05, IGSTORY-06, SCHED-02, ERR-01
**Success Criteria** (what must be TRUE):
  1. Live API test at phase start confirms `graph.facebook.com` is the correct host for IG Story container creation (not `graph.instagram.com` — the latter requires Instagram User Access Token OAuth flow not available to the current Page Access Token) and the result is documented in 12-01-SUMMARY.md before any production node is built
  2. A Story approved via WhatsApp SI appears on the Instagram profile as a 9:16 Story (not in the feed) within the expected wait window
  3. After publish, the workflow retrieves the Story permalink and `expires_at` (or computes `publish_time + 24h` as fallback) and both values flow to downstream nodes
  4. Hashtag comment nodes are never reached during a Story execution — the Story branch terminates independently
  5. n8n Code node rejects Story executions where `wait_seconds > 79200` (22h) before attempting container creation
  6. All IG Story publish nodes (`Create Story Container`, `Story media_publish`) have `onError` wired to the existing error handler subgraph
**Plans**: 2 plans
- [ ] 12-01-PLAN.md — Live verification + IG Story publish chain + FB Photo Story branch + ERR-01 onError wiring + SCHED-02 guard + Phase-11 guard removal + REQUIREMENTS/ROADMAP IGSTORY-02 text correction
- [ ] 12-02-PLAN.md — Deploy to n8n-azure + E2E Story IG-only + E2E Story IG+FB + regression single/carousel + failure injection + cleanup + STATE.md + SUMMARY

### Phase 12.3: Supabase to Azure Postgres Migration (INSERTED)

**Goal:** Restore the full Content Engine pipeline after the Supabase project (`wcjyayeyamyhrjqujhyv`) backing `content_sessions` was discovered **permanently deleted** on 2026-08-01 (exec `1786295`, NXDOMAIN confirmed via independent DNS + user dashboard check — full outage: single/carousel/Story all fail at the session-save node before the WhatsApp preview sends). Replace Supabase with Azure PostgreSQL (Flexible Server per the Propulsar stack default, or a new database on an existing server in `propulsar-production` if one is already provisioned — consistency tiebreaker applies), recreate the `content_sessions` schema (DDL baseline in `SETUP.md` FASE 4 + Phase 11's `aspect_ratio`/`story_expires_at` columns; `num_images` optionally added since the old store silently dropped it), and rewire every n8n node that reads/writes Supabase PostgREST to the new Postgres backend. Data migration is NOT needed — all old rows are lost and were transient session state never read back after publish (accepted). Supabase will NOT be recreated (user decision 2026-08-01; also an explicit global-CLAUDE.md anti-pattern). Out of scope: Sheets-log migration and everything else from `CONTENT-STUDIO-GUI-SEED.md` (stays future scope). Unblocks Phase 13 (paused at Plan 13-01 Task 2).
**Depends on:** Phase 12 (inserted urgently during Phase 13 execution — blocks Phase 13 resumption)
**Requirements**: infra-level (no new REQUIREMENTS entries — restores the session-persistence assumption every phase since 4 relies on)
**Success Criteria** (what must be TRUE):
  1. An Azure PostgreSQL database holds a `content_sessions` table with the full current schema, reachable from the `propulsar-n8n` Container App, with credentials sourced from Key Vault `propulsar-prod-kv` (never hardcoded)
  2. Every n8n node that previously targeted `*.supabase.co` (session INSERT for single/carousel/Story + the approval-path session recovery reads) now reads/writes the Azure Postgres backend, and zero references to the dead Supabase hostname remain in the deployed workflow
  3. A real Wizard→webhook fire reaches the WhatsApp preview again (the exact step that failed in exec `1786295`) for at least the Story format, proving the outage is over end-to-end
  4. `SETUP.md`/`.env.example` updated — Supabase env vars retired, new Postgres connection vars documented

**Plans:** 3/3 plans executed — **PHASE COMPLETE 2026-08-01**

Plans:
- [x] 12.3-01-PLAN.md — Provision `content_engine` DB + `content_sessions` table on existing `propulsar-db` + n8n credential `Postgres - content_engine` (API-first, UI fallback checkpoint) — COMPLETE 2026-08-01, credential id `3k4OsKJRGlUcWDrq`
- [x] 12.3-02-PLAN.md — Rewire the 4 Supabase PostgREST nodes to native Postgres executeQuery + add empty-result guard node + retire Supabase from .env.example/SETUP.md/CLAUDE.md — COMPLETE 2026-08-01, node count 91 → 92
- [x] 12.3-03-PLAN.md — Patch-based deploy to production n8n + real Wizard Story fire reaching the WhatsApp preview (user replied NO — nothing published) + Container App env cleanup — COMPLETE 2026-08-01, versionId `f81aeed2`, 92 nodes live. 2 live fires (exec `1787106`, `1787184`) proved the Postgres INSERT node works end-to-end; NO-reply exec `1787219` confirmed rejection path with zero Meta-facing nodes touched. `SUPABASE_URL`/`SUPABASE_ANON_KEY` env vars + `supabase-anon-key` secret removed from `propulsar-n8n` Container App. Diagnostic bonus: found + resolved a WhatsApp 24h customer-service-window delivery failure (errorCode 131047), unrelated to migration scope — see STATE.md Open Items.

### Phase 12.2: Hostinger VPS Re-host Layer (INSERTED)

**Goal:** Restore the Phase 4/5/6/7/12 durable re-host invariant broken by Meta's 2026-04-17 Azure Blob domain block and Phase 12.1's AFD failure (2026-04-23), using a small self-hosted upload/serve/delete HTTP microservice deployed on the Hostinger VPS Propulsar already operates (via EasyPanel, `*.bacu5y.easypanel.host` wildcard — proven accepted by Meta via a 2026-07-31 smoke test, zero new vendor accounts). Re-point the sub-workflow's upload/verify chain and revert the 5 Meta-facing nodes from the Options D band-aid (`final_image_url`, raw Ideogram, 24h TTL) back to the durable re-hosted URL — now Hostinger-backed instead of Azure-Blob-backed. Unblocks Phase 13 with a clean, non-ephemeral Meta-facing URL contract.
**Depends on:** Phase 12
**Requirements**: infra-level (no new REQUIREMENTS entries — restores Phase 4, 5, 6, 7, 12 re-host assumptions, same as Phase 12.1's scope)
**Success Criteria** (what must be TRUE):
  1. A new HTTP microservice (upload/serve/delete) is deployed as a sibling service inside the existing `propulsar-atiende-demo` EasyPanel project (3-project plan cap confirmed full — no new top-level project), exposed on the `*.bacu5y.easypanel.host` wildcard, with GET routes fully public and PUT/DELETE routes gated behind a shared-secret header (Meta's fetcher cannot send custom headers, so GET must never require auth)
  2. Sub-workflow `subworkflow-rehost-images.json`'s PUT/build-URL/HEAD-verify nodes (REHOST-03/04/05) target the new Hostinger service instead of Azure Blob, with `build-blob-url` emitting the final public URL directly — no separate CDN-rewrite hop needed (unlike the AFD attempt), since the service serves its own public URL
  3. 5 Meta-facing nodes in `n8n/workflow.json` reverted from Option D `final_image_url` back to `blob_urls[0].url`/fan-out `blob_url` — `ig-create-container` (single IG), `fb-publish-photo` (single FB), `ig-create-story-container` (IG Story), `ig-carousel-explode` + `fb-carousel-explode` (Code fan-out sources)
  4. ERR-01 cleanup path (`extract-blob-names` hardcoded prefix + `delete-azure-blob` URL/auth) updated in lockstep to parse and delete against the Hostinger backend instead of the hardcoded `propulsarcontent.blob.core.windows.net` string
  5. Options B (FB Story `/photo_stories` multipart `formBinaryData`) and E (`⬇️ FB: Fetch Image Bytes` sourcing from `blob_urls[0].url` intra-cloud) preserved unchanged — separate failure modes from the domain block, not touched by this phase
  6. Live verification proves the change works end-to-end via container-creation-only Meta Graph API calls (never `media_publish` — same discipline as the 2026-07-31 smoke test and all prior 12.1 control tests) for every restored URL shape (IG single, IG Story, IG carousel child, FB single, FB carousel unpublished), plus a real (edited) sub-workflow execution proving both the success path and the injected-failure/abort path work against the new backend
**Plans**: 3 plans
- [x] 12.2-01-PLAN.md — Build rehost-service (Node/Express) + deploy to EasyPanel `propulsar-atiende-demo` + expose on wildcard domain + live smoke test (upload/serve/delete/Meta container-creation) — infrastructure only, no workflow edits
- [x] 12.2-02-PLAN.md — Rewire sub-workflow REHOST-03/04/05 to Hostinger + revert 5 Meta-facing nodes from Option D + update ERR-01 cleanup + deploy both workflows to n8n-azure
- [x] 12.2-03-PLAN.md — Real sub-workflow executions (success + injected-failure) + Meta container-creation verification for all 5 restored URL shapes + cleanup + STATE.md/ROADMAP.md close-out

### Phase 12.1: CDN Layer - Azure Front Door obsoletes Options D-B-E (INSERTED)

**Goal:** Restore Phase 4 re-host invariant broken by Meta's 2026-04-17 silent domain-wide block of `propulsarcontent.blob.core.windows.net`. Deploy Azure Front Door Standard ($35/mo) fronting the existing Azure Blob container; re-point 5 Meta-facing nodes from Options D band-aid back to `blob_urls[0].url` (now AFD hostname via REHOST-06 seam rewrite). Keep Options B+E (FB Story multipart + intra-cloud fetch — separate failure modes). 5-exec E2E verification matching Plan 12-02 pattern. Phase 13 inherits clean CDN contract.
**Depends on:** Phase 12
**Requirements**: infra-level (no new REQUIREMENTS entries — restores Phase 4, 5, 6, 7, 12 re-host assumptions)
**Success Criteria** (what must be TRUE):
  1. Azure Front Door Standard endpoint (`*.z01.azurefd.net`) serves Azure Blob bytes to external clients (curl HTTP/2 200 + image content-type) including requests with `facebookexternalhit/1.1` user-agent
  2. Container `propulsarcontent` ACL is flipped to Blob anonymous-read (blob names are UUIDs = unguessability; eliminates SAS+cache-key complexity)
  3. Sub-workflow `subworkflow-rehost-images.json` REHOST-06 `🗂️ Collect blob_urls` Code node rewrites hostname from `<account>.blob.core.windows.net` to `$env.AZURE_CDN_HOST` when env var set (falsy-fallback to raw Blob URL for safe degradation)
  4. 5 Meta-facing nodes in `n8n/workflow.json` reverted from Option D `final_image_url` back to `blob_urls[0].url` — `ig-create-container` (single IG), `fb-publish-photo` (single FB), `ig-create-story-container` (IG Story), `ig-carousel-explode` + `fb-carousel-explode` (Code fan-out sources)
  5. Options B (FB Story `/photo_stories` multipart `formBinaryData`) and E (`⬇️ FB: Fetch Image Bytes` sourcing from `blob_urls[0].url` intra-cloud) preserved — separate failure modes from the domain block
  6. 5-exec E2E verification: Story IG-only, Story IG+FB, regression single-photo, regression carousel, failure injection — all execs prove Meta Graph API calls consume AFD hostname (request body inspection in n8n UI shows `azurefd.net` in image_url field); failure exec proves error subgraph + Delete Azure Blob cleanup (against origin, not AFD) still work
**Plans**: 3 plans
- [ ] 12.1-01-PLAN.md — AFD provisioning + container anonymous-read flip + smoke test (infrastructure-only, no workflow edits)
- [ ] 12.1-02-PLAN.md — REHOST-06 seam hostname rewrite + 5 Meta-facing node reverts from Option D + n8n PUT deploy (code edits + deploy)
- [ ] 12.1-03-PLAN.md — 5-exec E2E verification + Options D comment final sweep + STATE.md + ROADMAP.md + 12.1-SUMMARY.md

### Phase 13: Facebook Story + Log + Notifications
**Goal**: [CORRECTED 2026-07-31 during planning — see RESEARCH.md] The FB Story publish chain (2-step upload+publish, `retryOnFail=false`, SAS-strip assertion, `onError` wiring into the shared error subgraph) was already fully built and wired during **Phase 12 Plan 01** — FBSTORY-02/03/04 and ERR-01 are Done, confirmed by direct inspection of `n8n/workflow.json`. This phase does NOT rebuild that chain. Real scope: (1) a live-fire CONFIRMATION that the already-built chain still works against the Phase 12.2 Hostinger-backed re-host contract (it has never actually been fired end-to-end — Phase 12's own "live test" only proved the endpoint was reachable with a bogus id) and that a Story genuinely appears on the Facebook Page; (2) extend the Story WhatsApp success notification to mention Facebook; (3) add a `Formato` column to all 4 Sheets log nodes and an `Expires_At` column to the Story log node.
**Depends on**: Phase 12.2 (clean re-host contract — Phase 12.1 FAILED and was superseded)
**Requirements**: FBSTORY-01, FBSTORY-02 (Done, Phase 12), FBSTORY-03 (Done, Phase 12), FBSTORY-04 (Done, Phase 12), NOTIF-01, LOG-01, LOG-02
**Success Criteria** (what must be TRUE):
  1. A live API test **re-confirms** (the single-step vs 2-step decision was already made and built in Phase 12 as 2-step — this is a re-verification against the new Hostinger backend, not a design-discovery task) that the FB Story flow works end-to-end for real, and the result is documented before this phase closes
  2. A Story approved via WhatsApp SI appears on the Facebook Page as a Story (not in the feed) — verified with a real, human-observed execution, not a synthetic harness
  3. FB Story publish node **already has** `retryOnFail=false` and **already has** an assertion that strips Azure/Hostinger URL query params before FB Story container creation (built in Phase 12, Option A "strip" semantics — not "reject"; this phase only re-verifies it still behaves correctly live, does not change its semantics)
  4. All 4 existing Sheets log nodes (single, carousel, story, fail) write a `Formato` column without breaking historical rows; the Story-specific log node additionally writes `Expires_At`
  5. WhatsApp success notification for Stories includes IG Story permalink labeled "válido 24h", expiry timestamp in CET, and a note that FB Story has no permanent URL
**Plans**: 3 plans
- [ ] 13-01-PLAN.md — Live-fire re-verification of the already-built FB Story chain against the Hostinger backend (real Wizard→WhatsApp→SI Story fire, execution evidence capture, human-confirmed Story on the FB Page)
- [ ] 13-02-PLAN.md — NOTIF-01 (Facebook line in Story WA notification) + LOG-01/LOG-02 (Formato + Expires_At Sheets columns) code edits, plus the manual Google Sheet header-column checkpoint
- [ ] 13-03-PLAN.md — Deploy to n8n-azure + post-deploy real Story fire + human-confirmed WhatsApp message + Sheet row evidence, closing the phase

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
| 10. Wizard Historia Format | v1.2 | 2/2 | Complete | 2026-04-19 |
| 11. Story Image Generation | v1.2 | 2/2 | Complete | 2026-04-23 |
| 12. Instagram Story Publishing | v1.2 | Complete    | 2026-04-23 | 2026-04-23 |
| 12.1. CDN Layer | v1.2 | 3/3 | FAILED — Meta rejects AFD hostnames, rolled back (superseded by 12.2) | 2026-04-24 |
| 12.2. Hostinger VPS Re-host Layer | v1.2 | 3/3 | Complete | 2026-07-31 |
| 12.3. Supabase → Azure Postgres Migration | v1.2 | 3/3 | Complete | 2026-08-01 |
| 13. Facebook Story + Log + Notifications | v1.2 | 0/3 | Unblocked — resume from 13-01 Task 2 | - |
