# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook
**Current focus:** v1.2 Stories Publishing — Phase 12 COMPLETE ✅ (both plans). Phase 12.1 CDN Layer recommended urgent BEFORE Phase 13 (Meta blocks Azure Blob host; Options D/B/E band-aid active).

## Current Position

Milestone: v1.2 Stories Publishing
Phase: 12 — IG Story Publishing — COMPLETE ✅ (Plan 01 + Plan 02)
Plan: 12-02 COMPLETE — All 7 tasks verified. Task 1 deploy ✓, Task 2 IG-only ✓ (exec 10085), Task 3 IG+FB ✓ (exec 10647 after Options D/B/E), Task 4 single-photo regression ✓ (exec 10786 IG live), Task 5 carousel regression ✓ (exec 10959 IG live), Task 6 cleanup + SCHED-02 ✓ (3 unit tests + FB cleanup), Task 7 SUMMARY ✓.
Status: Phase 12 E2E verified against n8n-azure production. Three tactical fixes landed responding to Meta silent policy change (2026-04-17 domain-wide block of propulsarcontent.blob.core.windows.net): Option D (1e686a9 — Ideogram URL direct for Meta calls), Option B (1b9365a — FB Story multipart binary upload), Option E (5e09970 — FB fetch Azure Blob intra-cloud). Combined stack VERIFIED E2E: exec 10647 IG+FB Story (62.9s), exec 10786 single-photo, exec 10959 carousel. Phase 4 re-host invariant broken for Meta-facing URLs; Phase 12.1 CDN Layer required to restore (Azure Front Door or Cloudflare R2). Phase 13 readiness: recommended after 12.1. NOTIF-01 scope confirmed for Phase 13 (WA Story notification needs FB reference).
Last activity: 2026-04-23 — Plan 12-02 CLOSED. 10 commits across Plan 12-02: deploy (versionId 37cb9c68) + 3 option commits + 4 task commits + 1 STATE pointer + 1 SUMMARY/close. Nodes 90 → 91 (Option B added FB Fetch Image Bytes). Workflow versionId c13b5cb9.

Progress: [██████████] 100% (v1.0) — [██████████] 100% (v1.1) — [███████░░░] ~75% (v1.2 — 6/8 plans: 10-01, 10-02, 11-01, 11-02, 12-01, 12-02)

## Performance Metrics

**Velocity (v1.0):**
- Plans: 7 | Timeline: 2026-04-03 → 2026-04-06 (3 days)

**Velocity (v1.1):**
- Plans: 14 | Commits: 74 | Timeline: 2026-04-10 → 2026-04-17 (7 days)

**Velocity (v1.2 in progress):**
- Plan 10-01: 3 tasks | 3 commits (2972285, a663fb9, 4b6938d) | 1 file (wizard/run.js) | Completed 2026-04-19
- Plan 10-02: 3 tasks | 3 commits (a057220, 55f0d9c, 2e71563) | 1 file (wizard/run.js) | Completed 2026-04-19 | Duration ~2min
- Plan 11-01: 3 tasks | 3 commits (cb5333d, 419011c, 190eb26) | 1 file (n8n/workflow.json) | Completed 2026-04-22 | Duration ~25min (incl. schema migration pause)
- Plan 11-02: 1 task (E2E verification) | 2 fix commits | 1 file (n8n/workflow.json) | Completed 2026-04-23 | Duration ~40min (4 n8n executions, 2 fix-redeploy cycles)
- Plan 12-01: 3 tasks | 4 commits (fafe72e, 6f1c703, c7e45b1, c38e50d) | 3 files (n8n/workflow.json, .planning/REQUIREMENTS.md, .planning/ROADMAP.md) | Nodes 78 → 90 (+12) | Completed 2026-04-23 | Duration ~35min (live Meta API verification + 12-node atomic insert + SCHED-02 patch + Phase-11 guard removal + IGSTORY-02 + FBSTORY-04 APPEND corrections)
- Plan 12-02: 7 tasks | 10 commits (1e686a9 Option D, 940f04d Task 2, 1b9365a Option B, 5e09970 Option E, 01e8ba3 Task 3, 2b96266 Task 4, cbc033d STATE pointer, d1ecaa3 Task 5, fc90a74 Task 6, <final> Task 7) | 3 files (n8n/workflow.json, .planning/STATE.md, .planning/ROADMAP.md) + SUMMARY | Nodes 90 → 91 (+1 FB Fetch Image Bytes) | Completed 2026-04-23 | Duration ~3h 10min (5 execs pre-fix + 5 execs post-fix; Options D/B/E applied to unblock Meta Azure Blob domain block)

## Accumulated Context

### Open Items

- **🚨 URGENT: Phase 12.1 CDN Layer needed** — Meta blocks `propulsarcontent.blob.core.windows.net` domain-wide since 2026-04-17 (silent policy change, verified via 8 curl tests during Task 2 v1 diagnostic). Options D/B/E landed as band-aid in Plan 12-02 (exec 10647 PASS) but Phase 4 "approved image = published image" invariant is broken for Meta-facing URLs. Recommendation: Azure Front Door (~$35/mo, ~2h setup, same container) OR Cloudflare R2 (2-3 days migration, new creds, free egress). Recommended BEFORE Phase 13 so FB-specific work inherits a clean contract. Obsoletes Options D/B/E on restoration.
- **Ideogram URL TTL = 24h** — Limits Story scheduling to ~22h (SCHED-02 cap already in place provides ~1-1.5h margin). Will be obsolete once CDN Phase 12.1 restores Azure Blob reachability from Meta.
- **instagram_manage_comments scope:** Must be added to Facebook App; Susana regenerates Meta token. Until then, hashtag comments fail with code 10 (single-photo, exec 10786) or code 100 (carousel, exec 10959). HC `onError` short-circuits downstream FB feed branch (see next open item).
- **Meta token lifetime:** Depends on Susana maintaining admin role on Propulsar AI Facebook page.
- **Azure SAS expiry:** 2027-04-10 — renew before that date.
- **Supabase session status:** Never set to "consumed" after publish — accepted as low-risk tech debt.
- **WA Story notification only mentions IG permalink** (observed during Plan 12-02 Task 3 exec 10647) — FB Story published successfully but WA preview template does not reference FB. Phase 13 NOTIF-01 scope, NOT a Phase 12 gap. Phase 13 will extend the template to include FB Story reference when `platforms` includes `facebook`.
- **FB feed branch broken since 2026-04-17 (exec 147)** — Hashtag Comment node wired at that point, fails with code 10/100 (missing `instagram_manage_comments` scope). HC `onError` short-circuits downstream FB feed nodes. Observed during Plan 12-02 Task 4 exec 10786 (single-photo) AND Task 5 exec 10959 (carousel): IG chain 100% OK both times, FB feed never reached. Pre-existing, NOT a Phase 12 regression. Resolves when Susana regenerates Meta token with added scope, or dedicated follow-up reroutes HC onError to skip FB instead of halt. Now EXTENDED scope: also blocks FB carousel publishing (same root cause, different error code signature).

### v1.2 Decisions Locked (Plan 10-01)

- **Historia takes slot [1] in PASO 3** (Post Individual → [2], Carrusel → [3]) — keeps product priority visible.
- **Ideogram v3 auto-selected for Stories** — no model menu shown; enforces 9:16 text-in-image best practice.
- **has_text_in_image defaults true for Stories** — Enter or "s" → true; only explicit "n" disables it.
- **Client-side 9:16 validation** (±5% tolerance) before brief submission — PNG + JPEG parsed from magic bytes; WebP/unknown surface a warning that the user can confirm or retry.
- **Zero-dep image validator** — native fetch + Buffer, no new npm packages.

### v1.2 Decisions Locked (Plan 10-02)

- **22h Story scheduling cap layered on top of parsePublishTime** — parsePublishTime NOT modified (shared with Post/Carousel); Story-specific cap applied after every parse inside PASO 6's while(result.error) loop.
- **22h cap duplicated at both parse points (initial + retry)** — ~6 lines repeated; clarity over DRY for a short validation block.
- **'ahora' / publish_at='now' bypasses the 22h cap** — immediate publish gives full 24h visibility window.
- **Error wording LOCKED verbatim from CONTEXT.md** — includes "Elegí" (Spanish voseo) and "margen de 2h" processing explanation.
- **storyExpiresAt = publishAt + 24h (or now()+24h)** — computed once, positioned before RESUMEN block so it's in scope for both display and brief spread (single declaration).
- **Brief Story fields via spread with guard** — `...(isStory && { format, aspect_ratio, num_images, story_expires_at })` parallel to existing Carousel spread; mutually exclusive.
- **validateStoryBrief() fail-loud assert** — synchronous throw right before sendWebhook; catches malformed Story briefs at Wizard boundary so Phase 11+ can trust the contract.
- **Phase 10 downstream contract** — Stories guarantee ISO-UTC-Z story_expires_at, aspect_ratio="9:16", num_images=1, image_model="ideogram" (unless has_own_image with validated 9:16 URL).

### v1.2 Decisions Locked (Plan 11-02)

- **OpenAI credential canonical for Propulsar workflows: `wWEhRsD5ilt2xGvz` (`OpenAI-Propulsar`)** — used by 4 active production workflows (Chat Propulsar Agente IA, Agendar Cita V2, etc.); Content Engine v3 was pointing at stale `oSMopb75vo4NhdlT` ("OpenAI account 29") which had been deleted from n8n. Rule: when wiring new GPT-4o nodes, use OpenAI-Propulsar.
- **Preparar mensaje WA upstream lookup priority: Story → Carousel → Single → $input fallback** — Plan 11-01 added the Story disclaimer template but missed updating the upstream `d` lookup, causing Story flow to fall through to YCloud's image-send response and produce malformed output. Future Code nodes that branch on `d.format` MUST include explicit lookups for every supported format upstream node.
- **Ideogram 9:16 actual output: 736×1312 PNG, ratio 0.5610 (delta 0.27% from 9:16 ideal 0.5625)** — Phase 12 IG Story API can ingest the URL directly; no resize step needed. Image URL is 24h ephemeral signed.
- **Supabase `num_images` column: NOT present on `content_sessions`** — Plan 11-01 ALTER TABLE only added `aspect_ratio` + `story_expires_at`. INSERT mapping silently drops `num_images` via PostgREST. Tech debt: low priority (always 1 for Story per spec).
- **n8n PUT does not deactivate workflow** — confirmed `active=true` post-PUT, no separate `/activate` call needed. Save 1 API call vs. older docs.
- **n8n credential listing workaround** — Public API hides credentials; enumerate all workflows + grep `node.credentials.openAiApi.id` to discover active credential IDs.

### v1.2 Decisions Locked (Plan 12-01)

- **graph.facebook.com is the verified IG Story host (NOT graph.instagram.com)** — live test confirmed POST to graph.facebook.com with Page Access Token returns 200 + container id; graph.instagram.com returns 400 code:190 OAuthException. The workflow IG Story Container node uses `=https://graph.facebook.com/v22.0/{{ $env.INSTAGRAM_ACCOUNT_ID }}/media` with `media_type=STORIES` and NO caption. REQUIREMENTS.md IGSTORY-02 updated with APPEND bracket (audit trail preserved).
- **expires_at does NOT exist as IG Media field** — GET with `?fields=expires_at` returns code:100 "Tried accessing nonexisting field". Downstream `🔧 IG: Compute Story Expiry` Code v2 node computes `story_expires_at = timestamp + 86400000ms` from the GET response on the published media_id.
- **Pre-publish container does NOT expose permalink/timestamp/media_product_type** — these fields exist ONLY on the published media_id returned by `media_publish`. `🔗 IG: Get Story Permalink` runs GET against `$json.id` (the media_publish response id), not the container id.
- **FB /photo_stories reachable with current Page Token perms** — live test confirmed bogus photo_id returns code:100 "Invalid id" (semantically correct endpoint reachable), NOT code:200 OAuthException. No escalation to Susana required.
- **n8n 2.14.2 onError pattern: Option B (main[] second slot, NOT a separate error key)** — verified by `grep -c '"error":' = 0`. All 5 new HTTP Story nodes wired accordingly. This is the canonical pattern for this n8n version — future phase planning should assume Option B unless grep evidence proves otherwise.
- **Azure Blob URL for both IG Story Container AND FB Upload** (BLOCKER-1 resolution) — both consume `$('🔗 Merge Rehost Output').item.json.blob_urls[0].url` (Azure Blob permalink, valid until SAS 2027) rather than raw Ideogram URL (24h ephemeral). Preserves "what user approved = what gets published" invariant across both platforms, and survives SCHED-02's 22h scheduling cap safely.
- **FBSTORY-04 scope-shifted to close in Phase 12** — `🛡️ Assert FB Story URL (no SAS)` Code v2 node inserted between `🔀 ¿Plataformas FB?` TRUE and `📤 FB: Upload Story Photo Unpublished`. Option A "strip" semantics (not reject) — defense-in-depth against future SAS rotations, no-op today because Phase 11 produces bare URLs. REQUIREMENTS.md FBSTORY-04 APPENDED with scope-shift note.
- **YCloud WA Notify uses inline X-API-Key header (no credentials block)** — matching existing `✅ Notify WhatsApp Carousel` pattern. The plan's template referenced a `credentials.httpHeaderAuth.id` block but the real existing node uses `$env.YCLOUD_API_KEY` inline. Aligned with existing pattern.
- **SCHED-02 22h Story cap enforced at `🕐 Compute wait_seconds`** — `throw new Error('SCHED-02: Story scheduling rechazado. ...')` when `data.format === 'story' && wait_seconds > 79200`. Single + carousel flows unchanged (`format !== 'story'` bypasses). Guard added BEFORE the return, after the standard 65s-24h scheduling logic.
- **Phase-11 guard removal completed** — 4-line block deleted from `🔧 Prep Re-host Input` (comment + if-throw). Story now flows naturally through the existing `else if (data.final_image_url)` branch which builds `imageUrls = [{ index: 1, url: <azure_blob> }]`. No new logic needed.
- **Plan 12-01 node count delta: 78 → 90 (+12)** — Plan 12-02 deploy check asserts remote node count === 90 after PUT.

### v1.2 Decisions Locked (Plan 12-02)

- **Option D (band-aid) for Meta Azure Blob block:** All Meta Graph API calls use `$('🎨 Ideogram image').item.json.image_url` (Ideogram direct) instead of `$('🔗 Merge Rehost Output').item.json.blob_urls[0].url` (Azure Blob). Applied to IG Story Container, IG single-photo, IG carousel, FB endpoints. Chosen over Option A/B/C for P0 speed — CDN (Phase 12.1) is the proper fix.
- **Option B (durable) for FB Story URL fetcher strictness:** FB `/photo_stories` switched from `url=` param to multipart/form-data with `source=<binary>`. Bypasses Meta URL fetcher rejection (error 324). New node `📥 FB: Fetch Image Bytes` added; `📤 FB: Upload Story Photo Unpublished` upgraded to formBinaryData.
- **Option E (durable) for Ideogram single-fetch consumption:** FB Fetch Image Bytes sources from Azure Blob (intra-cloud Propulsar→Azure works even while Meta→Azure blocked) instead of Ideogram URL (single-use, consumed by IG Container first). Azure Blob remains the canonical storage, just not Meta-reachable.
- **IG Story keeps Ideogram URL direct** — Meta's IG fetcher accepts Ideogram reliably; no multipart refactor needed until CDN restoration.
- **IG single-photo + carousel keep Ideogram direct pending CDN** — no multipart refactor needed now; obsoleted by Phase 12.1.
- **Hashtag Comment short-circuit is PRE-EXISTING (2026-04-17), NOT a Phase 12 regression** — documented as open item; Task 4/5 FB feed regression deferred to HC scope fix or dedicated follow-up. Phase 12 must-have scope (carousel/single chain integrity + no Story nodes fired on non-Story formats) PASSED.
- **Failure injection via 5 real execs** — more reliable than synthetic injection: exec 9382 (Meta 400 Azure Blob), exec 10198 (FB 324 Ideogram URL), exec 10333 (FB Fetch Ideogram 404), exec 10786 (HC code 10), exec 10959 (HC code 100). Every ERR-01 path covered end-to-end.
- **Re-host sub-workflow (Phase 4) KEPT** — still runs for audit + Azure Blob cleanup via `🗑️ Delete Azure Blob` ERR-01 node. Not consumed by Meta calls while Options D/B/E active. No deletion of Phase 4 logic.
- **SCHED-02 22h cap stays in place** — Ideogram 24h TTL provides ~1-1.5h margin. Wizard-layer enforcement verified via 3 unit tests with exact castellano error: "Las Stories expiran en 24h. No podemos programar a más de 22h vista..."
- **FB Story cleanup: Stories auto-expire via 24h lifecycle** — Graph API DELETE returns code 100 subcode 33 for expired Stories; acceptable. IG posts cleaned manually by user per memory reference.
- **Multipart upload pattern documented for Phase 12.1:** `formBinaryData=true` / `contentType=multipart-form-data` / fields `source` (binary) + `access_token` + `published=false` in body. Reference for future Meta multipart integrations.
- **Plan 12-02 node count delta: 90 → 91 (+1: FB Fetch Image Bytes via Option B)** — versionId c13b5cb9 final.

### v1.2 Decisions Locked (Plan 11-01)

- **Pre-edit n8n node count: 73 | Post-edit: 78** — Plan 11-02 deploy check asserts remote node count === 78.
- **check-is-story uses IF v1 (not v2)** — v2 broken in n8n 2.14.2 per existing STATE.md note; mirrors ¿Carrusel? pattern.
- **normalize-image-story cross-refs 🔧 Parsear contenido** — needed to restore nested brief shape after Ideogram API response replaces the item (same pattern as normalize-image).
- **Supabase INSERT happens before WA preview is sent** — session row exists before user sees the preview (matches carousel pattern; safe on retry because session_id is timestamp-based).
- **reattach-session-data-story maps 15 fields with includeOtherFields:false** — explicit map required for format, aspect_ratio, story_expires_at, num_images; these are needed by disclaimer branch and future Phase 12/13 publish nodes.
- **Story disclaimer text LOCKED** — 3-bullet tuteo es-LA neutral; single ⚠️ emoji; no prohibited buzzwords; divider matches existing template pattern.
- **Phase-11 guard inserts before const format = ...** — checks data.format directly to match Phase 5 precedent and avoid any variable ordering issues.
- **Supabase story_expires_at + aspect_ratio columns added via user-run ALTER TABLE** — probe returned 400 on first run; user migrated in SQL Editor; re-probe returned 201. Both columns now confirmed present.

### v1.2 Research Flags (resolved in roadmap)

- **IG Story host conflict:** `graph.instagram.com` vs `graph.facebook.com` — IGSTORY-02 requires a live API test as the first task of Phase 12 to resolve before any production node is built.
- **FB Story flow conflict:** Single-step vs 2-step — FBSTORY-01 requires a live API test as the first task of Phase 13 to resolve before any production node is built.
- **ERR-01 scope:** Covers wiring `onError` for IG Story nodes (Phase 12) and FB Story nodes (Phase 13) into the existing 9-node error handler subgraph — no changes to subgraph logic.

## Session Continuity

Last session: 2026-04-23
Stopped at: Completed 12-02-PLAN.md. Phase 12 COMPLETE ✅ (both plans). Plan 12-02 executed with 3 tactical band-aid fixes (Options D/B/E) responding to Meta's silent 2026-04-17 domain-wide block of propulsarcontent.blob.core.windows.net discovered during Task 2. E2E verified: Story IG-only (exec 10085), Story IG+FB (exec 10647, 62.9s), regression single-photo (exec 10786, IG live), regression carousel (exec 10959, IG live). SCHED-02 Wizard-layer 22h cap verified via 3 unit tests. FB Story 1290303516541171 auto-expired (24h lifecycle). Tasks 4/5 FB feed not reached due to pre-existing HC scope short-circuit (not a Phase 12 regression). Failure injection covered by 5 real execs demonstrating full ERR-01 subgraph. Workflow n8n-azure @ versionId c13b5cb9, 91 nodes.
Resume file: .planning/phases/12-ig-story-publishing/12-02-SUMMARY.md
Next recommended: `/gsd:insert-phase 12.1` for CDN Layer (Azure Front Door OR Cloudflare R2) — obsoletes Options D/B/E, restores Phase 4 invariant, before Phase 13 FB Story + Log + Notifications.
