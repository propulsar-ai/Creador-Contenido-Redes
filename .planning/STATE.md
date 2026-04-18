# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Generate and publish complete social media posts (single or carousel) in one wizard run, with AI-generated images, WhatsApp preview, and automatic publishing to Instagram + Facebook
**Current focus:** v1.2 Stories Publishing — defining requirements

## Current Position

Milestone: v1.2 Stories Publishing
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-17 — Milestone v1.2 started. Research phase next.

Progress: [██████████] 100% (v1.0) — [██████████] 100% (v1.1) — [░░░░░░░░░░] 0% (v1.2)

## Performance Metrics

**Velocity (v1.0):**
- Plans: 7 | Timeline: 2026-04-03 → 2026-04-06 (3 days)

**Velocity (v1.1):**
- Plans: 14 | Commits: 74 | Timeline: 2026-04-10 → 2026-04-17 (7 days)

## Accumulated Context

### Open Items

- **instagram_manage_comments scope:** Must be added to Facebook App; Susana regenerates Meta token. Until then, hashtag comments fail with code 10 (post still publishes, error handler fires WA alert).
- **Meta token lifetime:** Depends on Susana maintaining admin role on Propulsar AI Facebook page.
- **Azure SAS expiry:** 2027-04-10 — renew before that date.
- **Supabase session status:** Never set to "consumed" after publish — accepted as low-risk tech debt.

## Session Continuity

Last session: 2026-04-17
Stopped at: v1.1 milestone archived. Ready for `/gsd:new-milestone`.
