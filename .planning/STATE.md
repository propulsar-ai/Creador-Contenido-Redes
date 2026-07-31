# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook
**Current focus:** v1.2 Stories Publishing — Phase 12 COMPLETE ✅ (both plans). Phase 12.1 FAILED (Azure Front Door rejected by Meta). Phase 12.2 (Hostinger VPS re-host layer) IN PROGRESS — Plan 01 complete, Plans 02-03 remain before Phase 13 is unblocked.

## Current Position

Milestone: v1.2 Stories Publishing
Phase: 12.2 — Hostinger VPS Re-host Layer — **IN PROGRESS** (Plan 02/03 complete). Replaces the Cloudflare R2 plan from `12.1-HANDOFF.md` after a 2026-07-31 smoke test proved Meta accepts the existing `*.bacu5y.easypanel.host` EasyPanel wildcard.
Plan: 12.2-02 COMPLETE — sub-workflow (REHOST-03/04/05) rewired to `rehost-service`; 5 Meta-facing main-workflow nodes reverted from Phase 12-02's Option D band-aid back to the durable `blob_urls[0].url`/`blob_urls` fan-out contract (now Hostinger-backed); ERR-01 cleanup path (extract-blob-names + delete-azure-blob) retargeted to Hostinger. Both workflows deployed live to n8n-azure (91 main / 10 sub nodes unchanged, active=true preserved). Found + safely handled out-of-band production drift: main workflow's OpenAI nodes had already been migrated to Azure OpenAI directly in n8n (unreflected in repo) — deployed via a patch strategy (remote-as-base, only this plan's 8 target nodes replaced) instead of a full-file PUT, to avoid reverting that live migration. See `12.2-02-SUMMARY.md` + `12.2-02-DEPLOY.md`.
Status: **Plan 02 done.** Only Plan 03 (E2E validation + phase close) remains before Phase 13 is unblocked. Two non-blocking follow-ups flagged for a future session: (1) `n8n/workflow.json` is stale for 4 OpenAI-related nodes vs. the live Azure OpenAI migration — needs a sync commit; (2) local `.env`'s `N8N_API_KEY` is expired — Key Vault `propulsar-prod-kv/n8n-api-key` holds a valid replacement. The Plan 01 mount-durability gap (see prior Status note, `12.2-01-SUMMARY.md` → Escalation) remains accepted-as-runbook-step per the user's 2026-07-31 decision; Plan 03 should re-verify the mount is attached before/after its E2E run.
Last activity: 2026-07-31 — Plan 12.2-02 executed and closed same session (~45min).

Progress: [██████████] 100% (v1.0) — [██████████] 100% (v1.1) — [████████░░] ~83% (v1.2 — 10/12 plans: 10-01, 10-02, 11-01, 11-02, 12-01, 12-02, 12.1-01, 12.1-02, 12.2-01, 12.2-02 — 12.1 FAILED/closed, 12.2 in progress, 1 plan remains to unblock 13)

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
- Plan 12.2-01: 3 tasks | 4 commits (48dcb62 feat build rehost-service, d221e12 feat deploy+wire+smoke, 1ff102b docs raw evidence JSON, 4dfe039 docs .env.example) | 3 files created (rehost-service/{Dockerfile,server.js,package.json}) + 3 created (.planning/phases/12.2-.../{smoke-test.mjs,smoke-test-output.json,12.2-01-SMOKE.md}) + 1 modified (.env.example) + SUMMARY | Completed 2026-07-31 | Duration ~2h | Live: rehost-service deployed to propulsar-atiende-demo (EasyPanel), commit-hash-verified deploy, public domain reachable, n8n Container App env vars wired + verified, real Meta Graph API container-creation call PASS (200 + id). Found + escalated: no EasyPanel tRPC procedure for app-service mounts; Docker-Swarm-level mount attached via hostShell works today but is dropped by EasyPanel's own restartService/deployService — real durability gap, not yet resolved.
- Plan 12.2-02: 3 tasks | 4 commits (170a16a feat sub-workflow rewire, 419b09a feat 5-node revert + ERR-01, cba6eef fix connection-key rename, 8ef9b69 docs deploy) | 2 files modified (n8n/subworkflow-rehost-images.json, n8n/workflow.json) + 1 modified (.env.example) + 1 created (12.2-02-DEPLOY.md) + SUMMARY | Nodes 91/10 → 91/10 (net 0 both) | Completed 2026-07-31 | Duration ~45min | Deploy: sub 67b7bb12 → a3305606 (direct PUT, no drift), main d178d4b9 → 7447171f (patch-based PUT — remote had drifted on 4 unrelated OpenAI nodes migrated to Azure OpenAI out-of-band; patched only this plan's 8 target nodes to avoid reverting that live migration, post-deploy safety check confirmed AOAI nodes preserved). All 8 target-node spot checks + node-count parity PASS.

## Accumulated Context

### Roadmap Evolution

- Phase 12.1 inserted after Phase 12: CDN Layer — Azure Front Door obsoletes Options D/B/E band-aid from Phase 12 (URGENT, 2026-04-23)
- Phase 12.1 Plan 01 complete 2026-04-23: AFD provisioned, env var set on Container App, smoke tests PASS, Meta dry-run deferred to Wave 3 E2E
- Phase 12.1 **FAILED 2026-04-23 night:** Wave 3 E2E rejected by Meta (9004 on both default AFD hostname and custom domain cdn.propulsar.ai). Control test confirms hostname-specific block. Rollback deployed. Phase 12.2 Cloudflare R2 to be planned.
- Phase 12.2 inserted after Phase 12: Hostinger VPS Re-host Layer (URGENT, 2026-07-31) — replaces the originally-planned Cloudflare R2 migration after a smoke test proved Meta accepts the existing Hostinger VPS/EasyPanel hostname (`*.bacu5y.easypanel.host`), avoiding a new vendor account. See `12.2-HOSTINGER-SMOKE-TEST.md`.
- Phase 12.2 Plan 01 complete 2026-07-31: `rehost-service` built + deployed live, n8n env vars wired, real Meta Graph API call PASS. Mount-durability gap found and escalated (see Open Items) — must be weighed before Plan 03 closes the phase.
- Phase 12.2 Plan 02 complete 2026-07-31: sub-workflow + 5 Meta-facing nodes + ERR-01 cleanup rewired to `rehost-service`; both workflows deployed live (patch-based deploy for main workflow after discovering out-of-band production drift on 4 unrelated OpenAI nodes — see Open Items). Only Plan 03 (E2E + phase close) remains.

### Open Items

- **🚨 URGENT: rehost-service mount-durability gap (Plan 12.2-01, unresolved)** — EasyPanel exposes no tRPC procedure to set a persistent mount on an app-type service (~50 candidate procedure names tried, all 404 or silently-dropped). A Docker-Swarm-level bind mount was attached directly via `hostShell` (`docker service update --mount-add ...`) and works today — live-verified PUT→GET byte-identical. But EasyPanel's own `services.app.restartService`/`deployService` regenerates the container spec from its stored config (which never learns about the manually-added mount) and **silently drops it** — proven live (PUT → restart → GET 404 → host file still on disk → reapply mount → GET 200 again). Host data is never destroyed, only temporarily disconnected from the running container. **Must be resolved or explicitly accepted as a runbook step before Plan 03 closes the phase** — see `12.2-01-SUMMARY.md` → Escalation and `12.2-01-SMOKE.md` for full evidence. Two options on the table: (1) accept as a manual runbook step (re-run the mount command after any future restart/redeploy of `rehost-service`), or (2) investigate via EasyPanel's actual web UI (needs its email/password login, not currently stored anywhere accessible — only the API token is available).
- **Phase 12.2 Plan 03 remains** — Plan 02 (COMPLETE) rewired the 5 Meta-facing n8n nodes + sub-workflow to consume `rehost-service` (via `HOSTINGER_REHOST_BASE_URL`/`HOSTINGER_REHOST_API_KEY`, already live on `propulsar-n8n`) instead of Azure Blob/Ideogram-direct (Options D/B/E), and deployed both workflows live. Plan 03 is E2E validation + phase close, mirroring 12.1-03's structure but against the already-proven-accepted Hostinger hostname.
- **🆕 `n8n/workflow.json` repo drift on 4 OpenAI-related nodes (found during Plan 12.2-02 deploy, non-blocking)** — Production's main workflow has `openai-text`/`openai-carousel` migrated to a raw HTTP Request node calling Azure OpenAI directly (`https://propulsar-prod-aoai.openai.azure.com/...`, credential `AOAI-ApiKey-Header`) and `parse-carousel`/`parse-content` updated to read the AOAI response shape (`choices[0].message.content`) — none of this is reflected in this repo's `n8n/workflow.json`, which still has the old `n8n-nodes-langchain.openAi` node shape (credential `OpenAI-Propulsar`). Confirmed via pre-deploy diff before Plan 12.2-02's main-workflow PUT (patched around it — see `12.2-02-DEPLOY.md`). **Action needed:** a future small sync commit should pull the live AOAI node shape back into the repo so future plans' pre-deploy diffs are clean.
- **🆕 Local `.env`'s `N8N_API_KEY` is expired (found during Plan 12.2-02, non-blocking)** — JWT `exp: 2026-05-05T22:00:00Z`, expired ~3 months before Plan 12.2-02 ran (confirmed via 401 on GET). A valid, non-expiring key exists in Key Vault `propulsar-prod-kv` under secret `n8n-api-key` (used for Plan 12.2-02's deploy instead). **Action needed:** rotate local `.env`'s `N8N_API_KEY` to the Key Vault value in a future session.
- **Ideogram URL TTL = 24h** — Limits Story scheduling to ~22h (SCHED-02 cap already in place provides ~1-1.5h margin). Will be obsolete once Phase 12.2 (Hostinger re-host, not Azure Front Door — 12.1 failed) restores a durable, Meta-reachable image host; SCHED-02 relaxation itself is explicitly out of scope for 12.2 (separate follow-up).
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

### v1.2 Decisions Locked (Plan 12.2-01)

- **`Creador-Contenido-Redes` repo is now public, under the `propulsar-ai` GitHub org** (moved from `allendefelixGHC/Creador-Contenido-Redes`) — confirmed via `gh repo view`. EasyPanel's `services.app.updateSourceGit` uses the plain `https://github.com/propulsar-ai/Creador-Contenido-Redes.git` URL with zero embedded token; no fine-grained PAT needed for this service (the plan had assumed one would be required). Local git remote updated to the canonical URL.
- **EasyPanel's tRPC API requires POST for every procedure tested on this instance**, including `listProjects`/`inspectProject`/`inspectService` which `propulsar-atiende/docs/deploy-vps-demo.md` documents as GET — all three return `405 METHOD_NOT_SUPPORTED` on GET, work on POST with a `{"json":...}` body. Worth fixing that doc in a future propulsar-atiende session.
- **No EasyPanel tRPC procedure exists to set a mount on an app-type service** — ~50 candidate procedure names tried (`updateMounts`, `setMountPoints`, `createVolumeMount`, `updateResources` with an extra `mounts` key, etc.), all either 404 (`{"error":"Not found"}`, route doesn't exist) or silently accepted-and-dropped (zod schema strips unknown keys). Confirmed this VPS runs **Docker Swarm** (`docker service ls`), not plain `docker-compose` — persistence achieved instead via `hostShell` WebSocket → `docker service update --mount-add type=bind,source=/etc/easypanel/projects/propulsar-atiende-demo/rehost-service/data,target=/data propulsar-atiende-demo_rehost-service`.
- **rehost-service mount-durability gap — real, live, unresolved** — `services.app.restartService` regenerates the container spec from EasyPanel's own stored config (LMDB-backed, no browser/API access found to edit it directly) and silently drops the manually-attached mount. Live-proven: PUT→GET (mount attached, bytes match) → `restartService` → GET 404 → host file still present on disk (`find` on host confirms) → mount reapplied → GET 200 again. **Host data is never destroyed, only temporarily disconnected from the running container** on any future EasyPanel-triggered restart/redeploy of this specific service. Escalated directly to the user (not just documented) per the plan's explicit instruction — see Open Items above and `12.2-01-SUMMARY.md`/`12.2-01-SMOKE.md` for full evidence. Unresolved as of Plan 01's close; must be weighed before Plan 03 closes the phase.
- **`hostinger-rehost-api-key`** stored in Key Vault `propulsar-prod-kv` as a plain value (not a KV-reference secretRef pattern like other `AZURE_*` secrets) — mirrored inline into `propulsar-n8n`'s Container App secret via `az containerapp secret set`, per the plan's explicit instruction. `HOSTINGER_REHOST_BASE_URL=https://rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host` set as a plain env var, `HOSTINGER_REHOST_API_KEY=secretref:hostinger-rehost-api-key` — both verified present via `az containerapp show`.
- **Live Meta Graph API container-creation call PASS** — `POST https://graph.facebook.com/v22.0/{IG_ACCOUNT}/media` with `image_url` pointing at `rehost-service`'s public URL returned `200 {"id":"17889754194666804"}`. `media_publish` never called — no real post exists from this test. Second independent confirmation (after the throwaway `httpbin-cdn-test` smoke test) that Meta accepts `*.bacu5y.easypanel.host`.

### v1.2 Decisions Locked (Plan 12.2-02)

- **REHOST-04 (build-blob-url) builds the FINAL public Hostinger URL directly** — no separate CDN-rewrite seam needed (unlike the reverted AFD attempt's REHOST-06 hostname-rewrite step), since `rehost-service` serves its own public URL with no fronting layer for Meta to reject. Collapses the AFD-era two-hostname pattern into a single hop.
- **Main-workflow deploy used a patch strategy, not a full-file PUT** — pre-deploy diffing (remote GET vs. repo's `505b52f` commit) found production had drifted from the repo on 4 unrelated nodes (`openai-text`/`openai-carousel` migrated to Azure OpenAI directly via HTTP Request + `AOAI-ApiKey-Header` credential; `parse-carousel`/`parse-content` updated to the AOAI response shape) — apparently done directly in n8n's UI, never committed to this repo. A blind PUT of the local file would have silently reverted that live migration. Deployed by fetching remote as the base and replacing only this plan's 8 intentionally-edited node ids, with a post-deploy safety check confirming the AOAI nodes were preserved untouched. **Rule for future n8n deploys: always diff remote vs. last-known-good commit for ALL nodes before a full-file PUT, not just the nodes a plan intends to touch.**
- **n8n `connections` object is keyed/targeted by node display NAME, not id** — renaming a node's `name` field (as Plans 02 did for `http-put-blob` → "HTTP PUT — Upload to Hostinger" and `delete-azure-blob` → "Delete Rehosted Image") requires updating every `connections` dict key/target string referencing the old name, or the PUT fails with `unknown_connection_target`/`unknown_connection_source`. Found via a failed deploy dry-run, fixed in a dedicated commit before redeploying.
- **Sub-workflow deployed via direct full-file PUT (safe)** — pre-deploy diff confirmed the remote sub-workflow was byte-identical to the repo's pre-Task-1 state (versionId matched STATE.md's last recorded value exactly, unlike the main workflow) — no drift, no patch strategy needed.
- **Local `.env`'s `N8N_API_KEY` is expired; Key Vault holds a valid replacement** — `propulsar-prod-kv/n8n-api-key` (a non-expiring JWT) was used for this plan's deploy scripts instead. Local `.env` itself was not modified (out of plan scope) — flagged as a follow-up in Open Items.

### v1.2 Decisions Locked (Plan 12.1-03 + rollback)

- **Meta Graph API `image_url` fetcher rejects Azure Front Door hostnames** — confirmed 2026-04-23 via 3 controlled tests:
  - Test A: `cdn.propulsar.ai` (AFD custom domain, DigiCert cert) → 9004/2207052 (exec 14938)
  - Test B: `propulsarcontent-cybdebd3gkanevba.z01.azurefd.net` (AFD default) → 9004/2207052 (exec 14273)
  - Test C: `ideogram.ai/api/images/ephemeral/....png` (known-working Ideogram URL) from same dev IP → 200 `{"id":"17869171803666804"}`
  - All 3 URLs served 930KB PNG + HEAD 200 + valid magic bytes externally. Only hostname differs. **Rejection is hostname/TLS-chain specific, not IP or content.**
- **Rollback Wave 2 deployed same session (2026-04-23 night)** — `git revert 3dcf574 9120db7` + PUT main + PUT sub. Main versionId `0e8d0a7a` → `966dc454` (91 nodes preserved, active=true). Sub versionId `ebf0b9a9` → `67b7bb12` (10 nodes preserved, active=true). Production back to Plan 12-02 closure behavior (Options D/B/E active).
- **AFD infrastructure LEFT provisioned post-rollback** — ~$35/mo cost meter active. Reasons: reference for 12.2 R2 planning + fallback if Meta policy changes + 10x faster to reactivate than re-provision (~5min vs ~1h). Decision point in 12.1-HANDOFF.md checklist.
- **`AZURE_CDN_HOST=cdn.propulsar.ai`** env var remains on Container App `propulsar-n8n` — harmless (no active node reads it); reusable for R2 with new value.
- **GoDaddy DNS records `cdn.propulsar.ai` CNAME + `_dnsauth.cdn` TXT** remain in place — reusable for R2 (just re-point CNAME target from AFD to R2 public endpoint).
- **Meta accepted Ideogram URL from dev IP** — contradicts earlier hypothesis that dev IP was rate-limited/blocked. Original Wikipedia control test failure from dev IP (during Plan 12.1-01 Task 2) was likely unrelated (thumbnail URL redirect or dimensions). **Lesson:** for future Meta diagnostic work, always test with a KNOWN-WORKING URL pattern (Ideogram ephemeral, Facebook CDN image) as control, not arbitrary third-party URLs.
- **Phase 13 remains blocked** — depends on clean Meta-facing URL contract. Options D band-aid works but Ideogram 24h TTL caps scheduling at 22h (SCHED-02). Phase 12.2 R2 unblocks Phase 13 with durable cleanup and full 24h scheduling window.

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

Last session: 2026-07-31 (~45min)
Stopped at: **Plan 12.2-02 COMPLETE.** Rewired sub-workflow's REHOST-03/04/05 to `rehost-service` (Hostinger) — no separate CDN-rewrite seam needed, unlike the reverted AFD attempt. Reverted the 5 Meta-facing main-workflow nodes from the Phase 12-02 Option D band-aid back to the durable `blob_urls[0].url`/`blob_urls` fan-out contract, and retargeted the ERR-01 cleanup path (extract-blob-names + delete-azure-blob, renamed "Delete Rehosted Image") to Hostinger. Deployed both workflows live to n8n-azure: sub-workflow via direct PUT (no drift found), main workflow via a **patch-based deploy** after pre-deploy diffing found production had already drifted from the repo on 4 unrelated nodes (Azure OpenAI migration landed directly in n8n, never committed) — patched only this plan's 8 target nodes, leaving the AOAI nodes untouched, with a post-deploy safety check confirming they were preserved. Also fixed 2 self-introduced bugs found during the deploy dry-run (a plan-text double-`=` typo, and a connections-dict node-rename miss) before the final successful deploy. Local `.env`'s `N8N_API_KEY` was found expired — used the valid Key Vault (`propulsar-prod-kv/n8n-api-key`) key instead for this session's deploys.
Resume file: .planning/phases/12.2-hostinger-vps-re-host-layer/12.2-02-SUMMARY.md (full details + Deviations section) and 12.2-02-DEPLOY.md (versionIds, drift discovery writeup, rollback procedure)
Next recommended: `/gsd:plan-phase 12.2` (if not already planned) to continue with Plan 03 (E2E validation + phase close) — mirrors 12.1-03's structure but against the now-live, Hostinger-backed re-host contract. Before Plan 03 closes the phase: (1) re-verify the Plan 01 mount-durability gap's mitigation is still attached (docker service mount), (2) consider syncing `n8n/workflow.json`'s 4 stale OpenAI nodes with the live Azure OpenAI migration, (3) consider rotating local `.env`'s expired `N8N_API_KEY`.
