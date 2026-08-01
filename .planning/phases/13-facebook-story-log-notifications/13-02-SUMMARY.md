---
phase: 13-facebook-story-log-notifications
plan: 02
subsystem: automation
tags: [n8n, google-sheets, whatsapp, ycloud, meta-graph-api, workflow-json]

# Dependency graph
requires:
  - phase: 13-facebook-story-log-notifications (Plan 13-01)
    provides: "Live-confirmed fb-publish-photo-story response shape ({success:true, post_id:<id>}) and the live evidence that the Google Sheet 'Log' tab header row was missing Error_Msg (and by extension Formato/Expires_At)"
provides:
  - "Formato column (LOG-01) on all 4 Google Sheets log nodes (single, carousel, story, fail) — literal 'single'/'carousel'/'story' or read from Parse Meta Error's new format field on failures"
  - "Expires_At column (LOG-02) on the Story log node, sourced from IG: Compute Story Expiry's story_expires_at"
  - "Conditional Facebook line (NOTIF-01) in the Story WhatsApp success notification, gated by the same platforms.includes('facebook') check used elsewhere in the FB Story chain"
  - "Live Google Sheet 'Log' tab header row extended (human-verified) to 15 columns including Formato, Expires_At, and the previously-missing Error_Msg"
affects: ["13-03 (deploy + live-verify)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only Sheets schema edits: new columns appended to columns.value + columns.schema without touching documentId/sheetName/credentials/operation/resource"
    - "Cross-node field exposure: parse-meta-error surfaces format (mirroring its existing platform_failed/approval_number/topic extraction from mergeData) so the shared sheets-fail-log node can read it after any of the 3 publish paths fail"
    - "Static (no-URL) conditional notification line for a platform whose publish artifact has no public permalink, reusing the exact boolean expression from the platform-gate node upstream instead of re-deriving it"

key-files:
  created: []
  modified:
    - n8n/workflow.json

key-decisions:
  - "Live Google Sheet header extended to 15 columns (not just the 2 planned) after Plan 13-01's live-fire proved Error_Msg was also missing from the real header — user re-verified and added Error_Msg alongside Formato/Expires_At in the same checkpoint"
  - "NOTIF-01's Facebook line is static text with no permalink — FB Photo Stories have no public URL to show, and referencing the FB publish node from this onError=stopWorkflow-critical node was avoided per the plan's explicit risk note"

# Metrics
duration: ~15min (this execution segment, post-checkpoint; Task 1 checkpoint wait time excluded)
completed: 2026-08-01
---

# Phase 13 Plan 02: Facebook Story Log Columns + WhatsApp Notification Summary

**Additive Formato/Expires_At columns on all 4 Google Sheets log nodes and a conditional Facebook line in the Story WhatsApp success notification, both scoped to exactly 6 pre-existing n8n nodes with zero FB/IG Story chain edits.**

## Performance

- **Duration:** ~15 min (this execution segment; Task 1's human-action checkpoint wait time is excluded since that spanned a separate coordinator turn)
- **Completed:** 2026-08-01T12:06:23Z
- **Tasks:** 3 (1 checkpoint:human-action + 2 auto)
- **Files modified:** 1 (`n8n/workflow.json`)

## Accomplishments
- **LOG-01:** All 4 Google Sheets log nodes (`log-sheets`, `log-sheets-carousel`, `sheets-log-story`, `sheets-fail-log`) now write a `Formato` value (`single`/`carousel`/`story` literal, or `={{ $('🚨 Parse Meta Error').item.json.format }}` on the shared fail-log node) plus a matching schema entry each.
- **LOG-02:** `sheets-log-story` additionally writes `Expires_At` from `🔧 IG: Compute Story Expiry`'s `story_expires_at` field, already computed upstream.
- **Enabling edit:** `parse-meta-error`'s jsCode now exposes `format: mergeData.format || 'single'` on its returned object (mirrors its existing `platform_failed`/`approval_number`/`topic` extraction pattern), which `sheets-fail-log`'s new `Formato` column reads.
- **NOTIF-01:** `notify-wa-story`'s `jsonBody` now appends a static Facebook line (`📘 Facebook: Story publicada (sin URL permanente — expira junto con Instagram)`) when `platforms` includes `facebook`, reusing the exact `($('🔗 Merge Rehost Output').item.json.platforms || []).includes('facebook')` boolean check from `check-platforms-facebook` — no new node reference, IG-only path unchanged.
- **Human action:** live Google Sheet "Log" tab header row extended to 15 columns by the user (confirmed "listo"), including `Error_Msg` which Plan 13-01's live-fire proved was also missing from the real header, not just the 2 new columns.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Formato + Expires_At header columns to the live Google Sheet** — checkpoint:human-action, resolved by user confirmation ("listo") — no code commit (external Sheet edit, no repo file touched)
2. **Task 2: LOG-01 + LOG-02 — Formato + Expires_At columns** — `407df12` (feat)
3. **Task 3: NOTIF-01 — Facebook line in Story WhatsApp notification** — `10489cb` (feat)

**Plan metadata:** (recorded below, this commit)

## Files Created/Modified
- `n8n/workflow.json` — 6 nodes edited: `parse-meta-error` (new `format` field on return object), `log-sheets`, `log-sheets-carousel`, `sheets-log-story`, `sheets-fail-log` (new `Formato` column value + schema entry each; `sheets-log-story` additionally gets `Expires_At`), `notify-wa-story` (conditional Facebook line + updated notes)

## Decisions Made
- Extended the live Sheet header checkpoint instructions beyond the plan's original 2-column scope to also cover `Error_Msg`, based on the real error captured in Plan 13-01's live-fire (`Missing columns: Error_Msg`) — verified via `13-01-VERIFICATION.md` before presenting the checkpoint.
- Kept NOTIF-01's Facebook addition as static text (no FB permalink) per the plan's explicit risk note about `notify-wa-story`'s `onError: stopWorkflow` — avoids introducing any new node reference or failure mode in an already-fragile position.

## Deviations from Plan

None - plan executed exactly as written (including folding in the important-context override to widen the checkpoint's header-verification scope to the full 15-column list, which was itself explicitly instructed by the coordinator, not an unplanned discovery during execution).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required beyond the Task 1 checkpoint (live Google Sheet header edit), which the user has already completed and confirmed.

## Next Phase Readiness
- `n8n/workflow.json` now has all 3 of this phase's genuinely-missing pieces (NOTIF-01, LOG-01, LOG-02) implemented locally, verified as valid JSON, and scoped-diff-confirmed to touch only the 6 intended nodes (plus the 2 new schema-only node ids `Formato`/`Expires_At`, confirmed via `git diff f4bb418 HEAD -- n8n/workflow.json`).
- Live Google Sheet "Log" tab header row confirmed extended by the user.
- **Ready for Plan 13-03** to deploy `n8n/workflow.json` to production and live-verify: (1) a real Story fire with `platforms: [instagram, facebook]` produces a Sheets log row with correct `Formato`/`Expires_At` values and no `NodeOperationError`, and (2) the WhatsApp success notification includes the new Facebook line.
- No blockers.

---
*Phase: 13-facebook-story-log-notifications*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: `.planning/phases/13-facebook-story-log-notifications/13-02-SUMMARY.md`
- FOUND: commit `407df12` (Task 2)
- FOUND: commit `10489cb` (Task 3)
