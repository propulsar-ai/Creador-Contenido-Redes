# Milestones

## v1.0 Carousel Support (Shipped: 2026-04-10)

**Phases:** 3 | **Plans:** 7 | **Timeline:** 2026-04-03 → 2026-04-06 (3 days)

**Delivered:** Multi-slide Instagram carousel support with AI-generated images, text overlays, and WhatsApp preview — while preserving the existing single-post pipeline untouched.

**Key accomplishments:**
1. Wizard format selector (single post vs carousel) with suggested slide count based on topic/type
2. Carousel-specific brief JSON with `num_images` and per-slide Ideogram prompts from GPT-4o
3. AI-chosen carousel structure (narrative/listicle/step-by-step) — user never selects manually
4. Sequential Ideogram v3 generation with Propulsar visual identity embedded in every slide prompt
5. Individual WhatsApp image previews (one message per slide) + text summary with SI/NO approval
6. Single-post path now also sends image preview before text (quality improvement discovered during verification)
7. Full workaround suite for n8n 2.14.2 bugs: IF v1 chains instead of IF v2/Switch v3, SplitInBatches removed

**Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---

## v1.1 Automatic Publishing (Shipped: 2026-04-17)

**Phases:** 6 (4-9) | **Plans:** 14 | **Commits:** 74 | **Timeline:** 2026-04-10 → 2026-04-17 (7 days)

**Delivered:** Full automated publishing pipeline — after WhatsApp SI approval, single posts and carousels publish automatically to Instagram + Facebook via Meta Graph API, with CET/CEST scheduling, Azure Blob re-hosting, error handling with WhatsApp alerts, and blob cleanup.

**Key accomplishments:**
1. Azure Blob re-hosting sub-workflow: ephemeral Ideogram/FAL URLs → permanent public Azure Blob URLs (no SAS for reads)
2. Instagram single-photo + carousel publishing via Meta Graph API (2-step single, 3-step carousel with 45s container wait)
3. Facebook single-photo + carousel publishing via attached_media pattern, combined IG+FB WhatsApp success notification
4. Scheduling system: Wizard PASO 6 (CET/CEST → UTC), n8n Wait node with 65s minimum floor and past-time guard
5. Hashtags as first IG comment (caption stays clean), automatic extraction from GPT-4o captions
6. 9-node error handler: Meta error code/fbtrace_id extraction, token-expired WA alert (mentions Susana), Sheets fail log, Azure blob cleanup
7. 73-node n8n workflow deployed to Azure Container Apps, 24 bugs fixed during E2E testing across 6 phases

**Known gap:** `instagram_manage_comments` scope missing from Meta token — hashtag comments blocked until Susana regenerates token.

**Archive:** [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) | [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---


## v1.2 Stories Publishing (Shipped: 2026-08-01)

**Phases:** 7 (10-13, incl. inserted 12.1/12.2/12.3) | **Plans:** 17 executed | **Commits:** ~102 | **Timeline:** 2026-04-19 → 2026-08-01 (active: Apr 19-24 + Jul 31-Aug 1; paused in between)

**Delivered:** After WhatsApp SI approval, a 9:16 vertical Story with an AI-generated image publishes automatically to Instagram AND Facebook, with <22h scheduling, Story-specific WhatsApp notifications, and Formato/Expires_At audit columns — plus two emergency infrastructure replacements (image re-host backend and session store) executed mid-milestone without breaking the v1.0/v1.1 pipeline.

**Key accomplishments:**
1. "Historia" as third Wizard format: Ideogram v3 auto-selected, client-side 9:16 validation, 22h scheduling cap (Story expires 24h post-publish)
2. IG Story publish chain (graph.facebook.com host verified live, media_type=STORIES, permalink + computed expiry) and FB Story 2-step chain (upload unpublished → photo_stories, multipart) — both proven with real production publishes, human-confirmed on both platforms
3. Hostinger VPS `rehost-service` (Node/Express on EasyPanel) replaced Azure Blob as the Meta-facing image host after Meta's domain-wide block — including the valuable negative finding that Meta rejects ALL Azure Front Door hostnames (Phase 12.1 FAILED by evidence, rolled back cleanly)
4. Emergency same-day Supabase → Azure PostgreSQL migration of `content_sessions` after the Supabase project was found permanently deleted (full pipeline outage discovered, diagnosed, migrated, deployed, and live-verified in one session)
5. Story WhatsApp success notification extended with Facebook line; Sheets log gained Formato (all 4 nodes) + Expires_At (Story) columns — shipping this found and fixed a real live Sheet header typo (`Error_Msj`) that had been silently breaking Story log rows
6. n8n workflow grew 73 → 92 nodes; deploy discipline hardened: always diff remote vs last-known-good before PUT, patch-based deploys preserving out-of-band production changes (Azure OpenAI migration preserved twice)

**Known debt (see [audit](milestones/v1.2-MILESTONE-AUDIT.md)):** `has_own_image=true` path silently skips session persistence (SI approval dies with zero audit trail) — top backlog item, natural fix inside the Content Studio GUI project; single/carousel formats not live-fired since the Postgres migration; WhatsApp 24h-window silently kills approval previews (won't-fix — approval moves to GUI); FB feed branch still blocked on `instagram_manage_comments` scope (pre-v1.2).

**Archive:** [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) | [v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md) | [v1.2-MILESTONE-AUDIT.md](milestones/v1.2-MILESTONE-AUDIT.md)

---

