# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook
**Current focus:** v1.2 Stories Publishing — Phase 12 COMPLETE ✅ (both plans). Phase 12.1 CDN Layer recommended urgent BEFORE Phase 13 (Meta blocks Azure Blob host; Options D/B/E band-aid active).

## Current Position

Milestone: v1.2 Stories Publishing
Phase: 12.1 — CDN Layer (Azure Front Door) — IN PROGRESS (Plans 01 + 02 complete, Plan 03 next: E2E exec gate)
Plan: 12.1-02 COMPLETE — REHOST-06 (`collect-blobs`) rewrites blob hostname to AFD via `$env.AZURE_CDN_HOST` with safe fallback; 5 Meta-facing nodes reverted from Phase 12-02 Option D band-aid (3 Tier A direct jsonBody reverts: ig-create-container, fb-publish-photo, ig-create-story-container; 2 Tier B Code fan-out source swaps: ig-carousel-explode, fb-carousel-explode). Deployed to n8n-azure via PUT: main versionId `c13b5cb9` → `0e8d0a7a`, sub versionId `bf1321d2` → `ebf0b9a9`. 10/10 post-deploy spot checks PASS (node counts preserved 91+10, active=true preserved, Tier B inheritance intact, Option B multipart + Option E intra-cloud fetch preserved).
Status: Workflow code and deployed state now in Phase 12.1 configuration. Phase 4 "approved image = published image" invariant RESTORED — Meta-facing URLs point at AFD fronting the same Blob container the user approved via WA preview. Options D/B/E no longer in active code paths (Option B multipart + Option E intra-cloud fetch retained intentionally for FB Story durable paths; separate failure modes). Workflow active=true preserved across deploy. Custom domain `cdn.propulsar.ai` deferred to v1.3 polish; current AFD default endpoint in use.
Last activity: 2026-04-23 — Plan 12.1-02 CLOSED (3 commits: 9120db7 feat subworkflow REHOST-06, 3dcf574 feat main 5-node revert, c72c7c1 docs DEPLOY.md versionId capture). Deploy artifact committed so Plan 12.1-03 can be resumed from a clean reference point. Validation gate still open: Plan 12.1-03 Task 2 is the first real exec from n8n-azure Container App egress IP calling Meta Graph API against AFD URLs — returns 9004 → Scenario 1 rollback (~10 min), success → Phase 12.1 proven E2E.

Progress: [██████████] 100% (v1.0) — [██████████] 100% (v1.1) — [████████░░] ~82% (v1.2 — 8/11 plans: 10-01, 10-02, 11-01, 11-02, 12-01, 12-02, 12.1-01, 12.1-02)

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
- Plan 12.1-01: 2 tasks | 2 commits (24ae98a feat AFD provision + smoke, 5c180fe docs close) | 6 files created (provision-afd.ps1, provision-afd-output.json, smoke-test.mjs, smoke-test-output.json, 12.1-01-SMOKE.md, 12.1-01-SUMMARY.md) + 1 modified (.env.example) | Completed 2026-04-23 | Duration ~3h 10min (~58min dominated by AFD edge cold-start propagation)
- Plan 12.1-02: 2 tasks | 3 commits (9120db7 feat REHOST-06 AFD rewrite, 3dcf574 feat 5-node Option D revert, c72c7c1 docs DEPLOY.md) | 2 files modified (n8n/subworkflow-rehost-images.json, n8n/workflow.json) + 2 created (12.1-02-DEPLOY.md, 12.1-02-SUMMARY.md) | Nodes 91 → 91 (text-only edits) | Completed 2026-04-23 | Duration ~20min | Deploy: main c13b5cb9 → 0e8d0a7a, sub bf1321d2 → ebf0b9a9, active=true preserved, 10/10 post-deploy spot checks PASS

## Accumulated Context

### Roadmap Evolution

- Phase 12.1 inserted after Phase 12: CDN Layer — Azure Front Door obsoletes Options D/B/E band-aid from Phase 12 (URGENT, 2026-04-23)
- Phase 12.1 Plan 01 complete 2026-04-23: AFD provisioned, env var set on Container App, smoke tests PASS, Meta dry-run deferred to Wave 3 E2E

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

### v1.2 Decisions Locked (Plan 12.1-01)

- **AFD Standard SKU ($35/mo)** over Premium ($330/mo) — RESEARCH-aligned, adequate for v1.2 single-domain fronting of blob container.
- **Default hostname `propulsarcontent-cybdebd3gkanevba.z01.azurefd.net`** — custom domain `cdn.propulsar.ai` deferred to v1.3 polish PR.
- **Host header override = origin hostname** — AFD origin config sends `propulsarcontent.blob.core.windows.net` as Host header to Blob, preserving SNI and anon-read semantics.
- **WAF explicitly OFF** (no policy attached to endpoint) — prevents Meta fetcher being silently bot-blocked (Pitfall 1 RESEARCH).
- **Route accepts HTTP+HTTPS** — initial HTTPS-only + https-redirect Enabled config caused internal conflict; dropping redirect + allowing HTTP cleared edge propagation.
- **Health probe: HEAD https /posts/12.1-smoke/smoke-test.png every 240s** — probes a known-present blob (plain `/` returns 400 on Blob Storage, marked origin unhealthy).
- **Container ACL = Blob anon-read already in place from Phase 4** — no flip needed in 12.1.
- **n8n runs on Azure Container Apps** `propulsar-n8n` in `propulsar-production` (NOT EasyPanel) — discovered via MCP; AZURE_CDN_HOST set via `az containerapp update --set-env-vars`. Sibling verification: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `AZURE_STORAGE_ACCOUNT=propulsarcontent`, `AZURE_CONTAINER=posts`.
- **AFD Standard cold-start edge propagation took ~58 min** (vs plan assumption 5-15 min) — within Azure extended SLA window but longer than typical; noted for future profile-create timing.
- **Task 2 Meta dry-run NOT executable from Felix's dev IP** — token/scopes valid (verified via `/debug_token`), IG account reads 200, but ALL POST `/{IG_ACCOUNT}/media` calls (6 tested with 4 URLs + 2 content-types) return `code 9004 / 2207052` identically, **including a Wikipedia control URL** known to be a valid image. Inferred: Meta IP-restricts POST /media to app-registered source IPs. Real validation gate moved to Wave 3 (Plan 12.1-03 Task 2 IG-only exec from n8n Container App egress IP).
- **Plan 12.1-01 Task 2 gate cleared by user decision (A) 2026-04-23 ~21:55 UTC** — proceed to Wave 2 with Wave 3 E2E as real validation. Revert path if Wave 3 first exec returns 9004 from production IP: revert workflow PUT to versionId `c13b5cb9`.

### v1.2 Decisions Locked (Plan 12.1-02)

- **REHOST-06 (`collect-blobs`) one-seam AFD rewrite** — hostname swap via `$env.AZURE_CDN_HOST` in the aggregate Code node means all 5 downstream Meta-facing consumers inherit the AFD URL transparently; no caller needs to be env-aware. Safe fallback: `cdnHost ? rawUrl.replace(rawBlobHost, cdnHost) : rawUrl` — when env var unset, behavior degrades to pre-12.1 (raw Blob URL in blob_urls[0].url, same as Phase 4 original). No crash, no throw.
- **Tier A vs Tier B revert separation** — 3 Meta-facing HTTP nodes have direct jsonBody edits (`ig-create-container`, `fb-publish-photo`, `ig-create-story-container`); 2 Code fan-out nodes have source swaps only (`ig-carousel-explode`, `fb-carousel-explode`). Downstream children (`ig-create-child-container`, `fb-upload-photo-unpublished`) are NOT edited — they read `$json.blob_url` emitted by their explode upstream, so swapping the explode source propagates AFD URL to children automatically. Editing children would break fan-out symmetry.
- **Option B + Option E preserved intentionally** — `fb-upload-story-photo` keeps multipart `formBinaryData` (Option B durable), `fb-fetch-ideogram-bytes` keeps intra-cloud Azure Blob fetch (Option E durable). FB /photo_stories URL fetcher strictness (error 324 path) is a SEPARATE failure mode from the Meta domain block (RESEARCH Open Q #4); multipart is the durable path regardless of CDN availability. The intra-cloud fetch now pulls from AFD-backed `blob_urls[0].url` automatically via REHOST-06 rewrite feeding `assert-fb-story-url`.
- **Sub-workflow node count is 10** (not 11 as plan text suggested) — both local and remote agree at 10. Plan text slightly stale; no correctness impact because spot checks use parity, not hardcoded counts. Observed in Plan 12.1-02 Task 2 pre-deploy state fetch.
- **n8n webhook HEAD returns 404** (not 200/405) — webhook is POST-only by configuration. Non-blocking for deploy verification; real smoke path is E2E exec in Plan 12.1-03. Future verify-criteria should not require 200/405 on HEAD.
- **Rollback procedures documented (2 scenarios, ~10/~15 min recovery)** — Scenario 1 (Meta 9004 on real exec): `git revert 3dcf574` + re-PUT main, KEEP REHOST-06 rewrite. Scenario 2 (AFD outage): revert both commits + re-PUT both workflows. Anti-pattern: unsetting AZURE_CDN_HOST alone does NOT roll back because Option D/B code is not env-driven.
- **Deploy artifact pattern** — `12.1-02-DEPLOY.md` committed as a separate small docs commit right after deploy succeeds. Captures pre/post versionIds for both workflows in git so deployed state is traceable even if next plan is interrupted mid-session.
- **Plan 12.1-02 node count delta: 91 → 91 (net 0)** — pure text edits. Plan 12.1-03 deploy check (if any) asserts remote node count === 91.
- **Plan 12.1-02 versionId delta: main c13b5cb9 → 0e8d0a7a, sub bf1321d2 → ebf0b9a9** — both preserve `active=true` (n8n PUT pattern confirmed for 3rd time).

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
Stopped at: Completed 12.1-02-PLAN.md. Phase 12.1 IN PROGRESS (Plans 01+02 done, Plan 03 next). Plan 12.1-02 executed cleanly in 2 tasks: REHOST-06 seam + 5 Meta-facing node reverts + PUT deploy to n8n-azure. Main workflow versionId c13b5cb9 → 0e8d0a7a (91 nodes, active=true preserved); Sub workflow versionId bf1321d2 → ebf0b9a9 (10 nodes, active=true preserved). 10/10 post-deploy spot checks PASS. Options B (FB Story multipart) and E (FB fetch bytes intra-cloud) preserved as durable fixes for separate failure modes (per RESEARCH Open Q #4). Tier B fan-out inheritance verified: children (`ig-create-child-container`, `fb-upload-photo-unpublished`) still read `$json.blob_url` and inherit AFD URL transparently through `$json.blob_url` propagation from explode Code nodes. Deploy artifact (12.1-02-DEPLOY.md) committed so Plan 12.1-03 can be resumed from a clean reference point.
Resume file: .planning/phases/12.1-cdn-layer-azure-front-door-obsoletes-options-d-b-e/12.1-02-SUMMARY.md
Next recommended: `/gsd:execute-plan 12.1-03` for E2E validation — IG Story smoke exec from n8n-azure Container App egress IP against AFD URLs. This is the real validation gate for Phase 12.1 (Meta dry-run from dev IP was blocked in Plan 12.1-01). If exec succeeds: Phase 12.1 proven, Phase 13 unblocked. If exec returns 9004: Scenario 1 rollback (`git revert 3dcf574` + re-PUT, ~10 min).
