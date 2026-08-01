# Phase 14: v1.2 Regression Live-Fire - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Two real live-fire runs through the full production pipeline — one single post, one carousel — to confirm the Supabase → Azure Postgres migration (Phase 12.3) didn't break the formats that haven't been live-fired since. Establishes a clean baseline before any v1.3 design-engine work lands. Requirements: VERIF-01, VERIF-02.

Includes ONE small in-phase fix: rerouting the hashtag-comment node's `onError` so its known failure (missing `instagram_manage_comments` scope) stops short-circuiting the FB feed branch — required for the phase's "publishes to both IG and FB" success criteria to be satisfiable at all.

</domain>

<decisions>
## Implementation Decisions

### Test content
- Both posts are **test content, deleted after verification** — not kept as real Propulsar content.
- Topic comes from the **normal Wizard flow** (Perplexity trending + angle selection) — exercises the full pipeline end-to-end like a real run.
- **Claude decides the post type** (educational/authority/case study) based on whatever topic fits at execution time.
- **WhatsApp 24h window checkpoint before each fire:** the plan must include an explicit pre-fire step where the user messages the business number (+34 602 069 187) from the approval number to open the customer-service window. Never trust `accepted` — verify delivery via YCloud GET (established v1.2 lesson).

### FB feed branch (known-broken, in-phase fix)
- **Reroute the hashtag-comment node's `onError` from halt to skip** so the FB feed branch executes despite the missing `instagram_manage_comments` scope. FB feed publishing comes back WITHOUT waiting for Susana's token.
- Hashtag comments themselves keep failing (documented, expected) until Susana regenerates the token — that part stays as-is.
- This fix follows the established deploy discipline: diff remote vs last-known-good before PUT, patch-based deploy touching only the intended nodes.

### Cleanup
- **FB posts (single + carousel): delete via Graph API immediately after full verification** (programmatic + user visual confirmation) in the same session.
- **IG posts: attempt API deletion first** (result is useful evidence either way); if it fails as expected (IG business media historically not API-deletable), **user deletes manually in-app** — end-of-phase checkpoint reminds them with permalinks at hand.
- **Capture evidence BEFORE any deletion:** IG/FB media IDs, permalinks, raw publish-node responses, and the Sheets log row — all into the phase verification doc.
- **Google Sheets log rows from the test runs stay** — they're real regression evidence; Estado/Error_Msg reflect what happened.

### Image model & cost
- **Single post: accept the Wizard's model suggestion** (exercises suggestion logic like a real run).
- **Carousel: accept the Wizard's suggested slide count** (typical 5-7, ~$0.30-0.42 at $0.06/slide).
- **Re-fire policy: fix + re-fire directly** on real bugs, per phases 12.x/13 discipline (patch-based deploys). No per-re-fire consultation.
- **Image budget: ~$1.50 for the whole phase** including re-fires — only escalate to the user if exceeded.

### Verification depth
- **Programmatic + visual per fire:** Postgres `content_sessions` row queried directly; Sheets log row read via API with exact column check (Formato correct — never visual-only column verification, per 13-03 lesson); WhatsApp message status via direct YCloud GET; n8n node outputs inspected. Plus user visual confirmation of the live posts on IG/FB.
- **NO-rejection path NOT re-tested** — already live-verified on Story in Phase 12.3 (exec 1787219), shared code.
- **Both fires publish "ahora"** — scheduling path untouched by the Postgres migration, out of regression scope.

### Claude's Discretion
- Post type choice per test (educational/authority/case study)
- Exact verification query/script shapes
- Order of the two fires (suggest single first — cheaper smoke of shared path before the multi-slide run)

</decisions>

<specifics>
## Specific Ideas

- Re-verification-before-fire pattern applies (locked v1.2 decision): if any deploy lands between pre-flight and fire, re-diff the target chain against the new versionId in the current session.
- The Postgres INSERT/SELECT pattern was proven twice via Story (Phase 12.3/13) — this phase closes the loop on the single (`💾 Guardar sesión` single variant) and carousel (carousel variant + multi-slide loop) paths specifically.

</specifics>

<deferred>
## Deferred Ideas

- `instagram_manage_comments` scope + working hashtag comments — still blocked on Susana's token regeneration (tracked in PROJECT.md, independent of any milestone).
- None new — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-v1-2-regression-live-fire*
*Context gathered: 2026-08-01*
