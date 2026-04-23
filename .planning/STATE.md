# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook
**Current focus:** v1.2 Stories Publishing — Phase 12 Plan 01 COMPLETE ✅, Plan 12-02 IN PROGRESS (Task 5 carousel regression verified IG, Task 6 cleanup + SCHED-02 next)

## Current Position

Milestone: v1.2 Stories Publishing
Phase: 12 — IG Story Publishing — Plan 01 COMPLETE ✅ / Plan 02 IN PROGRESS
Plan: 12-02 in progress — Task 1 deploy ✓, Task 2 IG-only ✓, Task 3 IG+FB ✓, Task 4 single-photo regression ✓ (IG pass, FB pre-existing HC short-circuit), Task 5 carousel regression ✓ (IG pass, FB same short-circuit), Task 6 next (cleanup + SCHED-02)
Status: Plan 12-02 halfway. Three tactical fixes landed on top of 12-01 build: Option D (band-aid: Ideogram URL direct for IG — Meta blocks Azure Blob domain), Option B (multipart form upload for FB Story — url= param rejected with 324), Option E (fetch Azure Blob bytes then multipart — Ideogram URL rejected by FB Story with 404/324). Combined stack VERIFIED E2E: exec 10647 published Story to IG (media_id 17932325328235789) + FB Story (post_id 1290303516541171) in 62.9s, user visual-confirmed both live. Critical watch for Task 4: FB feed single-photo uses `/photos?url=` with Ideogram URL direct (Option D pattern); FB endpoints have shown strictness on image URL sources, so this may need Option E pattern extended. Observed Phase 13 scope item: WA Story notification template only mentions IG permalink — will extend in NOTIF-01.
Last activity: 2026-04-23 — Plan 12-02 Task 3 PASS via exec 10647. Option D (1e686a9) + Option B (1b9365a) + Option E (5e09970) combined, 25-node Story chain with 18 critical nodes OK. FB post 1290303516541171 flagged for Task 6 cleanup. Supabase session 893df3d6-3764-4e01-b36d-eb615c2bf10a. Two pre-fix failures documented for Task 5 failure-injection reference (exec 9382 Meta 400 Azure Blob rejected, exec 10198 FB 324 Ideogram URL rejected, exec 10333 FB Fetch Ideogram 404).

Progress: [██████████] 100% (v1.0) — [██████████] 100% (v1.1) — [██████░░░░] ~63% (v1.2 — 5/8 plans)

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

## Accumulated Context

### Open Items

- **instagram_manage_comments scope:** Must be added to Facebook App; Susana regenerates Meta token. Until then, hashtag comments fail with code 10 (post still publishes, error handler fires WA alert).
- **Meta token lifetime:** Depends on Susana maintaining admin role on Propulsar AI Facebook page.
- **Azure SAS expiry:** 2027-04-10 — renew before that date.
- **Supabase session status:** Never set to "consumed" after publish — accepted as low-risk tech debt.
- **WA Story notification only mentions IG permalink** (observed during Plan 12-02 Task 3 exec 10647) — FB Story published successfully but WA preview template does not reference FB. This is Phase 13 NOTIF-01 scope, NOT a Phase 12 gap. Phase 13 will extend the template to include FB Story reference when `platforms` includes `facebook`.
- **FB feed branch broken since 2026-04-17 (exec 147)** — Hashtag Comment node wired at that point, fails with code 10 (missing `instagram_manage_comments` scope per above blocker). HC `onError` short-circuits downstream FB feed nodes. Observed during Plan 12-02 Task 4 exec 10786 (single-photo regression): IG chain 100% OK, FB feed never reached. Pre-existing, NOT a Phase 12 regression. Resolves when Susana regenerates Meta token with added scope (see `instagram_manage_comments scope` blocker above), or dedicated follow-up to reroute HC onError to skip FB instead of halt.

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
Stopped at: Completed 12-01-PLAN.md. Phase 12 Plan 01 (build) complete — 4 atomic commits, 12 new nodes, 3 files changed (n8n/workflow.json + REQUIREMENTS.md + ROADMAP.md). IG Story publish chain + FB Photo Story branch + Assert FB SAS + ERR-01 onError wiring + SCHED-02 guard + Phase-11 guard removal all landed locally. Live Meta Graph API verification re-run 2026-04-23 (container 17869082274666804 against graph.facebook.com = 200, against graph.instagram.com = 400 code:190). Not yet deployed to n8n-azure — Plan 12-02 handles deploy + E2E IG Story-only + E2E IG+FB + regression carousel/single + failure injection + test post cleanup.
Resume file: .planning/phases/12-ig-story-publishing/12-01-SUMMARY.md
