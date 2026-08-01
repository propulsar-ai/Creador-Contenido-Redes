# Propulsar Content Engine

## What This Is

AI-powered content generation and publishing engine for Propulsar.ai's social media (Instagram + Facebook). Interactive Wizard (wizard/run.js) + 92-node n8n workflow on Azure generate posts — single images, multi-slide carousels, and 9:16 vertical Stories — with AI-generated text and images in Propulsar's visual identity. Content is previewed via WhatsApp, approved with SI/NO, and automatically published to Instagram and Facebook with scheduling support, error handling, and full audit trail in Google Sheets.

**Shipped as of v1.2:** Wizard → n8n → GPT-4o (Azure OpenAI) text → Ideogram/Flux/Nano Banana images → Hostinger `rehost-service` re-hosting → WhatsApp preview → SI approval → IG + FB publish (single, carousel, AND Story) → WhatsApp success notification → Sheets log. Session state in Azure PostgreSQL. Scheduling (CET/CEST, max 24h; Stories capped at 22h). Error handler with WA alerts + Sheets fail log + rehost cleanup.

## Core Value

Generate and publish complete social media posts (single, carousel, or story) in one wizard run, each with AI-generated images that include readable Spanish text overlays following Propulsar's brand — previewed via WhatsApp, approved with SI, and automatically published to Instagram + Facebook.

## Current State

**v1.2 shipped 2026-08-01.** Stories publishing live end-to-end: "Historia" format in Wizard (Ideogram v3 auto-selected, 9:16 validated, 22h cap) → IG Story (media_type=STORIES via graph.facebook.com) + FB Story (2-step photo_stories, multipart) → Story-specific WA notification (IG permalink "válido 24h" + FB line) → Sheets log with Formato/Expires_At. Two real production Stories published and human-verified during closeout.

**Two emergency infra replacements landed mid-milestone:** (1) Meta silently blocked `*.blob.core.windows.net` AND rejects all Azure Front Door hostnames — image re-hosting now runs on `rehost-service` (Node/Express) on Propulsar's Hostinger VPS (EasyPanel, `*.bacu5y.easypanel.host`, Meta-accepted). (2) The Supabase project backing `content_sessions` was permanently deleted — session persistence migrated same-day to Azure PostgreSQL (`propulsar-db` server, `content_engine` DB, native n8n Postgres nodes).

**Stack:** Node.js 22 Wizard (~1,940 LOC), n8n 2.14.2 on Azure Container Apps (`propulsar-n8n`, 92 nodes + 10-node re-host sub-workflow), Azure OpenAI (gpt-4o via `propulsar-prod-aoai`), Ideogram v3 / Flux 2 Pro / Nano Banana Pro (FAL.AI), Meta Graph API v22, YCloud WhatsApp, Azure PostgreSQL Flexible Server (session state), Hostinger VPS rehost-service (Meta-facing images), Google Sheets (audit log), Azure Key Vault `propulsar-prod-kv` (secrets).

**Known gaps (see milestones/v1.2-MILESTONE-AUDIT.md):**
- `has_own_image=true` path silently skips session persistence — SI approval dies with zero audit trail (pre-v1.2, unflagged until the v1.2 audit; top backlog item, natural fix inside the Content Studio GUI project)
- `instagram_manage_comments` scope missing from Meta token — hashtag comments + FB feed branch blocked until Susana regenerates token
- WhatsApp 24h customer-service window silently kills approval previews (won't-fix: approval moves to the GUI)
- Single/carousel formats not live-fired since the Postgres migration (identical INSERT pattern proven twice via Story)

## Requirements

### Validated

- ✓ Single-image post generation via Wizard + n8n — pre-v1.0
- ✓ GPT-4o text generation for Instagram + Facebook captions — pre-v1.0
- ✓ Image generation via Flux 2 Pro, Ideogram v3, Nano Banana Pro — pre-v1.0
- ✓ WhatsApp preview and approval flow — pre-v1.0
- ✓ Webhook communication between Wizard and n8n — pre-v1.0
- ✓ Wizard format selector (single post vs carousel) — v1.0
- ✓ Carousel brief with per-slide Ideogram prompts from GPT-4o — v1.0
- ✓ Sequential image generation with Propulsar visual identity — v1.0
- ✓ Individual WhatsApp image previews per slide — v1.0
- ✓ Azure Blob re-hosting (ephemeral URLs → permanent public blobs) — v1.1
- ✓ Instagram single-photo + carousel publishing via Meta Graph API — v1.1
- ✓ Facebook single-photo + carousel publishing via Meta Graph API — v1.1
- ✓ CET/CEST scheduling with Wizard PASO 6 + n8n Wait node — v1.1
- ✓ WhatsApp success notification with IG + FB URLs — v1.1
- ✓ WhatsApp error notification with Meta error details — v1.1
- ✓ Google Sheets log with IG_URL, FB_URL, Publish_Status — v1.1
- ✓ Hashtags as first IG comment (caption stays clean) — v1.1
- ✓ Token-expired WA alert mentioning Susana — v1.1
- ✓ Azure blob cleanup after publish or failure — v1.1
- ✓ Duplicate post prevention (media_publish retry disabled) — v1.1

- ✓ "Historia" 9:16 Story format in Wizard (Ideogram auto-select, 9:16 validation, 22h cap) — v1.2
- ✓ Instagram Story publishing (media_type=STORIES, permalink + computed expiry) — v1.2
- ✓ Facebook Page Story publishing (2-step photo_stories, multipart) — v1.2
- ✓ Story WhatsApp preview with 9:16 disclaimer + Story success notification (IG permalink + FB line) — v1.2
- ✓ Sheets log Formato column (all formats) + Expires_At (Story) — v1.2
- ✓ Durable Meta-facing image re-host (Hostinger rehost-service, replaced Azure Blob after Meta block) — v1.2
- ✓ Session persistence on Azure PostgreSQL (replaced deleted Supabase project) — v1.2

### Active

**Next milestone not yet defined.** Leading candidate: **Content Studio GUI** (separate project `propulsar-content-studio` — see `.planning/research/CONTENT-STUDIO-GUI-SEED.md`): in-app approval replacing WhatsApp SI/NO, Postgres-backed publish history panel, full creation flow in browser. Carry-over backlog for whichever comes next:
- [ ] Fix `has_own_image=true` silent session-persistence gap (top audit item)
- [ ] Live-fire spot-check of single + carousel formats post-Postgres-migration
- [ ] `instagram_manage_comments` scope (needs Susana's token regeneration)

### Out of Scope

- Frontend/dashboard UI — separate project
- Video slides — static images only
- Manual text editing per slide in Wizard — AI decides all content
- Mobile app — server-side pipeline only
- IG Insights analytics — requires 24h post-publish; separate workflow
- A/B testing of captions — requires analytics layer first
<!-- Story publishing MOVED to Active — v1.2 -->
- Multi-account publishing — requires multi-tenant token management
- Scheduling beyond 24h — Azure Container Apps scale-to-zero risk
- IG native `publish_at` parameter — doesn't exist in IG Graph API
- FB `scheduled_publish_time` — would create two parallel scheduling paths

## Context

- **Codebase:** Wizard (wizard/run.js, ~1,940 LOC JS) + n8n main workflow (92 nodes) + re-host sub-workflow (10 nodes) on Azure Container Apps, + `rehost-service/` (Node/Express, deployed on Hostinger VPS via EasyPanel)
- **n8n version 2.14.2 quirks:** IF v2/Switch v3 broken (use IF v1); no `require()` in Code sandbox; Set v3.0 silently drops cross-node refs in fan-out chains; `connections` keyed by node display NAME; PUT rejects `settings.availableInMCP`/`binaryMode`
- **Deployment discipline:** ALWAYS diff remote vs last-known-good before PUT (production drifts out-of-band); patch-based deploy replacing only intended nodes. Credentials (AOAI header, Google Sheets, Postgres) live in n8n's credential store.
- **Session store:** Azure PostgreSQL Flexible Server `propulsar-db` (rg `propulsar-production`), DB `content_engine`, table `content_sessions` (20 cols), n8n credential `Postgres - content_engine` (id `3k4OsKJRGlUcWDrq`)
- **Meta-facing images:** `rehost-service` on Hostinger VPS — public GET, secret-gated PUT/DELETE (`HOSTINGER_REHOST_*` env vars on Container App). Mount durability runbook: re-attach Docker Swarm mount after any EasyPanel restart/redeploy.
- **Meta tokens:** Generated from Susana's admin account. Depend on her maintaining admin role on Propulsar AI Facebook page. Meta blocks `*.blob.core.windows.net` and all `*.azurefd.net`/AFD custom domains as image_url sources; Stories (IG + FB) are NOT deletable via API.
- **WhatsApp:** YCloud. `accepted` ≠ delivered — always verify via `GET /v2/whatsapp/messages/{id}`. Free-form sends fail (131047) outside the 24h customer-service window.
- **Visual brand:** dark background `#1a1a2e`, purple-magenta gradient accents, bold readable Spanish typography.

## Constraints

- **n8n restrictions:** No `$env` in Code nodes, no `require()`. Use HTTP Request nodes or `$helpers.httpRequest`.
- **Conditional routing:** Only IF v1 with string comparisons works reliably in n8n 2.14.2.
- **API costs per carousel:** $0.06 per Ideogram image × N slides. A 7-slide carousel ≈ $0.42.
- **WhatsApp:** YCloud sends images one at a time — carousel preview is N separate messages.
- **Credentials:** Each workflow upload requires manual OpenAI credential linking in n8n UI.
- **Meta token lifetime:** Depends on Susana maintaining admin role.
- **Wait node minimum:** 65s floor — n8n doesn't persist sub-65s waits to DB.
- **Scheduling window:** Max 24h — Azure Container Apps min-replicas=1 but longer waits are risky.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ideogram v3 as default for carousels | 90-95% text-in-image accuracy | ✓ Good |
| AI decides slide structure | Full automation, user never selects | ✓ Good |
| Sequential Ideogram generation | Safer with rate limits, simpler loop | ✓ Good |
| IF v1 everywhere | IF v2/Switch v3 broken in n8n 2.14.2 | ⚠ Workaround until n8n upgrade |
| Meta tokens from Susana's account | Felix's Graph API returned empty data | ✓ Good — tokens verified working |
| Azure Blob public-access container | SAS expiry breaks scheduled posts | ✓ Good |
| Azure SAS container-scoped (sr=c, sp=rwdlc) | One token covers all UUID blob names | ✓ Good |
| Sub-workflow for re-hosting | Clean separation, reusable across single + carousel | ✓ Good |
| media_publish retryOnFail=false | Not idempotent — retry creates duplicate live post | ✓ Good — no duplicates observed |
| Wait "After Time Interval" (seconds) | "At Specified Time" has n8n bug #14723 | ✓ Good — scheduling works |
| 65s minimum wait floor | n8n doesn't persist sub-65s to DB | ✓ Good — prevents lost executions |
| 45s container wait (not 30s) | 30s insufficient for 5-slide carousel | ✓ Good — fixed after exec 117 failure |
| Hashtags as first comment (not caption) | Clean captions, hashtags still discoverable | ✓ Good |
| Tag Error = Code nodes (not Set) | Set v3.4 drops 'error' key from continueErrorOutput | ✓ Good |
| Two-stage JSON decode for Meta errors | AxiosError double-encodes Meta API responses | ✓ Good |
| Fan-in without Merge node | Both Wait and IF FALSE wire to same target | ✓ Good — simpler |
| graph.facebook.com for IG Stories (not graph.instagram.com) | Live test: graph.instagram.com needs OAuth flow unavailable to Page token | ✓ Good — verified twice live |
| Hostinger VPS rehost-service over Azure CDN | Meta rejects ALL Azure Front Door hostnames (proven via 3 controlled tests); accepts `*.bacu5y.easypanel.host` | ✓ Good — 2 real publishes served |
| Azure Postgres over recreating Supabase | Supabase project deleted + explicit stack anti-pattern; `propulsar-db` server already existed (n8n's own DB) | ✓ Good — zero new infra, live-proven |
| Patch-based n8n deploys (diff remote first) | Production drifts out-of-band (AOAI migration found twice); blind PUT would revert live changes | ✓ Good — canonical deploy discipline |
| Reply NO for infra-phase live tests, SI only when publish IS the test | Keeps real publishes scoped to phases whose goal is publishing | ✓ Good |
| No WA-template fix for 24h window | WhatsApp approval is on deprecation path (GUI replaces it) | ✓ Good — avoided dead-end investment |
| Story log via harness + backfill instead of 3rd real publish | Stories aren't API-deletable; harness proved identical node config | ✓ Good — evidence without pollution |

---
*Last updated: 2026-08-01 after v1.2 Stories Publishing milestone*
