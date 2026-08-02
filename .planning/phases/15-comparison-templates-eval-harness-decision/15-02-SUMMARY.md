---
phase: 15-comparison-templates-eval-harness-decision
plan: 02
subsystem: infra
tags: [gamma, design-engine, api-access, brand-theme, eval-harness]

# Dependency graph
requires:
  - phase: 15-01
    provides: "Precedent for design-engine trial-account setup pattern (Creatomate) and the eval harness's shared brief/scoring approach"
provides:
  - "Active Gamma Pro API access (X-API-KEY, https://public-api.gamma.app/v1.0) — paid upgrade, not a free trial"
  - "Propulsar brand theme in Gamma workspace, themeId ergo9wmo77nbvra, API-verified"
  - "15-02-GAMMA-ACCESS.md — themeId, cost, spec, and blockers for Plan 15-04 and Phase 16 to consume"
  - "15-02-GAMMA-THEME-RUNBOOK.md — Spanish manual runbook for account/theme setup, reusable if a second Gamma workspace is ever needed"
affects: [15-04, 15-05, phase-16]

# Tech tracking
tech-stack:
  added: ["Gamma Generate API (v1.0, X-API-KEY auth)"]
  patterns: ["automation-first-with-manual-fallback: attempt agent-browser, timebox, write a Spanish runbook regardless of outcome, verify final state by API not by visual confirmation alone"]

key-files:
  created:
    - .planning/phases/15-comparison-templates-eval-harness-decision/15-02-GAMMA-THEME-RUNBOOK.md
    - .planning/phases/15-comparison-templates-eval-harness-decision/15-02-GAMMA-ACCESS.md
  modified:
    - .env (local only, GAMMA_API_KEY populated, never committed)

key-decisions:
  - "Automation via agent-browser was blocked at two independent layers (Google OAuth rejects Chrome-for-Testing; Cloudflare Turnstile rejects all CDP-driven interaction on gamma.app even in the user's real authenticated Chrome profile) — both are network/fingerprint-level detections, not selector/ref problems, so no further automation retry was attempted."
  - "User escalation point ('solo pago') was resolved by the user choosing to pay for a Pro upgrade (~18EUR/user/month, ~216EUR/yr annual) rather than by Claude bypassing the free-trials-only rule — the cost is recorded as a rubric input for Plan 15-05's decision, not hidden."
  - "Final state (API access + themeId) was verified programmatically via live GET calls, not accepted on the user's visual confirmation alone."

patterns-established:
  - "For any future locked automation-first rule that hits a hard platform-level block (bot detection, not a tooling gap), timebox the attempt, write the manual fallback regardless of automation outcome, and always close with an API-level verification rather than trusting a screenshot or a user's 'looks right'."

# Metrics
duration: ~25min (this closing segment; full plan spans a prior session's Tasks 1-2 plus this session's Task 3 close-out)
completed: 2026-08-02
---

# Phase 15 Plan 02: Gamma API Access + Propulsar Brand Theme Summary

**Gamma Pro API access (paid upgrade, no free trial available) with a Propulsar brand theme (themeId `ergo9wmo77nbvra`) created manually after Cloudflare blocked all CDP-driven automation — EVAL-02 satisfied.**

## Performance

- **Duration:** ~25 min (this closing segment — writing GAMMA-ACCESS.md, live API verification, SUMMARY, STATE update)
- **Started:** 2026-08-02T17:30:00Z (approx, this segment)
- **Completed:** 2026-08-02T17:55:00Z (approx)
- **Tasks:** 3 (Task 1 human-action checkpoint, Task 2 auto with runbook fallback, Task 3 human-action checkpoint) — all complete across sessions
- **Files modified:** 2 created (`15-02-GAMMA-THEME-RUNBOOK.md`, `15-02-GAMMA-ACCESS.md`), 1 local-only env change

## Accomplishments
- Gamma API access confirmed live: `GET https://public-api.gamma.app/v1.0/themes` returns HTTP 200 with `X-API-KEY` auth (50 standard themes + workspace customs).
- Propulsar brand theme created in Gamma's in-app theme editor and API-verified: `themeId ergo9wmo77nbvra`, `type: custom`, confirmed via `GET /v1.0/themes?query=Propulsar`.
- Theme spec matches canonical brand: background `#070A18`, primary accent `#BA00E0`, secondary accents `#00E5FF`/`#C026D3`/`#E0007A`, headings Syne Bold `#FFFFFF`, body Arimo Regular `#E8EAFF`, accessibility auto-adjust disabled (exact hex preserved), no font substitution needed (Arimo was available), no logo (no logo file exists in repo — non-blocking skip).
- Both automation-blocker layers documented for future reference (Google OAuth vs Chrome-for-Testing; Cloudflare Turnstile vs CDP on the user's real profile) — useful precedent if any future plan attempts browser automation against gamma.app.
- Cost of the paid Pro upgrade (~216EUR/yr) recorded explicitly as an input to Plan 15-05's comparison rubric, not absorbed silently.

## Task Commits

Each task was committed atomically:

1. **Task 1: Acceso a la cuenta Gamma + verificar trial Pro + generar API key** — checkpoint, no code commit (human-action; account access, plan-tier check, and API key generation done directly on Susana's account, key placed in local `.env`)
2. **Task 2: Attempt theme creation via agent-browser; write runbook fallback** — `31e15ce` (docs) — automation blocked by Cloudflare Turnstile, Spanish runbook written documenting the blocker and full manual steps
3. **Task 3: Ejecutar runbook + confirmación final del theme** — `ca33581` (docs) — `15-02-GAMMA-ACCESS.md` written after live API verification of theme + access

**Plan metadata:** `ca33581` also serves as the plan-closing commit for this segment (STATE.md update follows in a separate commit).

## Files Created/Modified
- `.planning/phases/15-comparison-templates-eval-harness-decision/15-02-GAMMA-THEME-RUNBOOK.md` - Spanish click-by-click runbook for account/trial check, API key generation, and theme creation, written after Cloudflare blocked CDP automation
- `.planning/phases/15-comparison-templates-eval-harness-decision/15-02-GAMMA-ACCESS.md` - themeId, API base/auth, theme spec as built, Pro-upgrade cost (rubric input), automation-blocker record, credits balance
- `.env` (local only, not committed) - `GAMMA_API_KEY` populated

## Decisions Made
- Automation attempt was abandoned after hitting two independent, non-tooling blockers (Google OAuth rejecting Chrome-for-Testing, then Cloudflare Turnstile rejecting all CDP interaction on the user's real Chrome profile) rather than continuing to retry — both are platform-level bot detections outside `agent-browser`'s addressable surface, consistent with the plan's own 20-minute timebox guidance.
- The "solo pago" escalation point built into the plan was correctly triggered (no free Pro trial was offered to the existing Plus account) and resolved by the user's own decision to pay for the Pro upgrade — this is documented as a proper escalation-and-resolution, not a rule violation, with the recurring cost flagged for the Plan 15-05 decision rubric.
- Final access and theme state were verified by direct API calls (`GET /v1.0/themes`, `GET /v1.0/themes?query=Propulsar`) rather than relying solely on the user's visual confirmation in-app.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Automation path fully blocked, manual runbook path used for all 3 tasks**
- **Found during:** Task 2 (attempt theme creation via agent-browser)
- **Issue:** The plan's locked decision was "Claude attempts automation first." Two independent platform-level blockers made automation impossible: Google OAuth rejects Chrome-for-Testing sessions, and Cloudflare Turnstile rejects all CDP-driven interaction on gamma.app even in the user's authenticated real-Chrome profile.
- **Fix:** Wrote the Spanish manual runbook (`15-02-GAMMA-THEME-RUNBOOK.md`) documenting the blockers and exact manual steps, as the plan's own fallback instructions required. All three tasks (account/trial check, API key generation, theme creation) were executed manually by the user following the runbook plus live guidance.
- **Files modified:** `15-02-GAMMA-THEME-RUNBOOK.md` (created)
- **Verification:** Final state verified by live API calls (`GET /v1.0/themes`, `GET /v1.0/themes?query=Propulsar`), not by user self-report alone.
- **Committed in:** `31e15ce` (Task 2 commit)

**2. [Rule 4 - Architectural/business, escalated and resolved by user] No free Pro trial available; user chose to pay**
- **Found during:** Task 1 (account access + trial check)
- **Issue:** The plan's locked rule requires free trials only, with escalation before any payment. Susana's existing "Plus" account was only offered a paid "Actualiza a Pro" upgrade (18EUR/user/month annual, ~216EUR/yr) — no free 14-day trial was offered to this existing account.
- **Resolution:** Per the plan's own instructions, this was escalated to the user via the "solo pago" resume-signal path rather than Claude proceeding unilaterally. The user made the decision to pay for the upgrade themselves on 2026-08-02. This is recorded as a properly-escalated business decision, not an automatic fix — the recurring cost is flagged explicitly in `15-02-GAMMA-ACCESS.md` as input for Plan 15-05's comparison rubric (cost criterion), where it will be weighed against Creatomate's continued free-trial status.
- **Files modified:** `15-02-GAMMA-ACCESS.md` (documents the cost and escalation)
- **Verification:** API access confirmed live post-upgrade (`GET /v1.0/themes` → 200).
- **Committed in:** `ca33581` (Task 3 commit)

---

**Total deviations:** 2 (1 blocking-automation fallback, 1 user-escalated business decision — both explicitly anticipated by the plan's own instructions, not silent scope creep)
**Impact on plan:** Both were the plan's own designed escalation/fallback paths firing as intended. No unplanned scope. The one open consequence is a new recurring cost (~216EUR/yr) that must factor into the final engine decision in Plan 15-05.

## Issues Encountered
- Cloudflare Turnstile's rejection of CDP-driven interaction is a hard platform-level block, not a selector/timing issue — confirmed via multiple distinct interaction methods (ref click, role-based find, passive waits, fresh navigation) all failing identically. No workaround exists within `agent-browser`'s scope; documented as a precedent for any future gamma.app automation attempt.

## User Setup Required
None further — all required setup (account access, Pro upgrade, API key, theme creation) is complete. `GAMMA_API_KEY` is in local `.env`.

## Next Phase Readiness
- Plan 15-04 (full comparison matrix) now has everything it needs from the Gamma track: working API access (`GAMMA_API_KEY` in `.env`), a verified `themeId` (`ergo9wmo77nbvra`) to pass into `POST /v1.0/generations`, and no trial-expiry deadline pressure (Pro is a paid subscription, not a 14-day trial).
- Wave 1 of Phase 15 (15-01, 15-02, 15-03) is now fully complete — Wave 2 (15-04, full comparison run across Creatomate/Gamma/Ideogram/hybrid) is unblocked.
- The ~216EUR/yr Gamma Pro cost must be carried into Plan 15-05's scored comparison as a cost-criterion input alongside Creatomate's free-trial status.

---
*Phase: 15-comparison-templates-eval-harness-decision*
*Completed: 2026-08-02*

## Self-Check: PASSED

- FOUND: `.planning/phases/15-comparison-templates-eval-harness-decision/15-02-GAMMA-ACCESS.md`
- FOUND: `.planning/phases/15-comparison-templates-eval-harness-decision/15-02-SUMMARY.md`
- FOUND: commit `31e15ce` (Task 2 - runbook)
- FOUND: commit `ca33581` (Task 3 - access doc)
