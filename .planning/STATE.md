# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Generate and publish complete social media posts (single, carousel, or story) in one wizard run, with AI-generated images, WhatsApp preview, SI approval, and automatic publishing to Instagram + Facebook
**Current focus:** v1.2 Stories Publishing — Phase 11 Plan 01 COMPLETE ✅, Plan 11-02 (deploy + E2E) next

## Current Position

Milestone: v1.2 Stories Publishing
Phase: 11 — Story Image Generation (n8n router)
Plan: 11-01 complete ✅ — Plan 11-02 (deploy + E2E) next
Status: Plan 11-01 shipped (3 tasks, 3 commits). n8n Story branch fully wired. Workflow ready for deploy to Azure.
Last activity: 2026-04-22 — Plan 11-01 shipped (Story branch: 5 new nodes + parse-content patch + WA disclaimer + Phase-11 guard)

Progress: [██████████] 100% (v1.0) — [██████████] 100% (v1.1) — [███░░░░░░░] ~38% (v1.2 — 3/8 plans)

## Performance Metrics

**Velocity (v1.0):**
- Plans: 7 | Timeline: 2026-04-03 → 2026-04-06 (3 days)

**Velocity (v1.1):**
- Plans: 14 | Commits: 74 | Timeline: 2026-04-10 → 2026-04-17 (7 days)

**Velocity (v1.2 in progress):**
- Plan 10-01: 3 tasks | 3 commits (2972285, a663fb9, 4b6938d) | 1 file (wizard/run.js) | Completed 2026-04-19
- Plan 10-02: 3 tasks | 3 commits (a057220, 55f0d9c, 2e71563) | 1 file (wizard/run.js) | Completed 2026-04-19 | Duration ~2min
- Plan 11-01: 3 tasks | 3 commits (cb5333d, 419011c, 190eb26) | 1 file (n8n/workflow.json) | Completed 2026-04-22 | Duration ~25min (incl. schema migration pause)

## Accumulated Context

### Open Items

- **instagram_manage_comments scope:** Must be added to Facebook App; Susana regenerates Meta token. Until then, hashtag comments fail with code 10 (post still publishes, error handler fires WA alert).
- **Meta token lifetime:** Depends on Susana maintaining admin role on Propulsar AI Facebook page.
- **Azure SAS expiry:** 2027-04-10 — renew before that date.
- **Supabase session status:** Never set to "consumed" after publish — accepted as low-risk tech debt.

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

Last session: 2026-04-22
Stopped at: Completed 11-01-PLAN.md (3 tasks, 3 commits). n8n Story branch fully wired. Ready for Plan 11-02 (deploy workflow.json to n8n Azure + E2E test with real story brief).
Resume file: .planning/phases/11-story-image-generation/11-01-SUMMARY.md
