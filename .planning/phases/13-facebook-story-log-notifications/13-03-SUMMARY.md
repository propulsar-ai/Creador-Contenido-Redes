---
phase: 13-facebook-story-log-notifications
plan: 03
subsystem: automation
tags: [n8n, google-sheets, whatsapp, ycloud, meta-graph-api, workflow-json, deploy]

# Dependency graph
requires:
  - phase: 13-facebook-story-log-notifications (Plan 13-02)
    provides: "Local-only NOTIF-01/LOG-01/LOG-02 edits to 6 n8n nodes (parse-meta-error, log-sheets, log-sheets-carousel, sheets-log-story, sheets-fail-log, notify-wa-story), not yet deployed"
provides:
  - "Plan 13-02's edits deployed live to production n8n (versionId f81aeed2 -> 83aa7f3c, 92 nodes, active=true, direct full-file PUT with zero real drift)"
  - "NOTIF-01 confirmed via real production evidence: Story WA success notification includes the Facebook line, verified delivered+read via direct YCloud GET"
  - "LOG-01/LOG-02 confirmed working after fixing a live Google Sheet header typo (Error_Msj -> Error_Msg) found via a disposable harness workflow, not visible to human visual review"
  - "Real backfilled Sheet log row for today's actual published Story (exec 1788142), Formato=story + Expires_At populated, human-confirmed"
  - "Phase 13 (FBSTORY-01, NOTIF-01, LOG-01, LOG-02) all requirements proven with real production evidence, not code review"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Disposable harness workflow for live diagnosis (Webhook -> Google Sheets read/HTTP Request) — same pattern as 12.2-03, extended here to precisely diagnose a single-cell header mismatch invisible to human visual review, fix it surgically via a raw Sheets API PUT, then re-verify with a production-identical node config using synthetic test data, deleted after use"
    - "Real-data backfill in lieu of a redundant real Meta publish — when a downstream logging step fails after the real external side-effect already succeeded, recover the accurate log row from the same execution's own captured node outputs rather than re-firing a non-idempotent, undeletable real publish just to re-test logging"

key-files:
  created:
    - .planning/phases/13-facebook-story-log-notifications/13-03-DEPLOY.md
  modified: []

key-decisions:
  - "Direct full-file PUT deploy (not patch-based) — zero real drift found vs. pre-13-02 baseline (only 4 benign auto-generated webhookId fields on Wait nodes, same pattern as 12.3-03)"
  - "Diagnosed the Sheets Log failure programmatically via a harness workflow instead of trusting the user's prior visual header confirmation — found a single-character typo (Error_Msj vs Error_Msg) invisible to casual visual review"
  - "Backfilled the real log row for exec 1788142 using its own real captured data instead of firing a third real Meta publish, since Meta Stories are not API-deletable and two were already live from today's testing"

patterns-established:
  - "Never trust a human's visual 'looks right' confirmation for exact-match external column names — verify programmatically via a disposable read, since single-character typos break n8n's Google Sheets schema-change guard completely"

# Metrics
duration: ~35min
completed: 2026-08-01
---

# Phase 13 Plan 03: Deploy + Live-Verify Facebook Story Log/Notification Changes Summary

**Deployed Plan 13-02's NOTIF-01/LOG-01/LOG-02 edits to production n8n (versionId f81aeed2 → 83aa7f3c), fired two real Story publishes to prove them, found and fixed a live Google Sheet header typo (`Error_Msj`→`Error_Msg`) that was silently blocking every Story log row, and backfilled the real log entry — closing Phase 13 with real production evidence for every requirement.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-01T12:09:00Z (approx, immediately after Plan 13-02's close)
- **Completed:** 2026-08-01T12:42:58Z
- **Tasks:** 3 (1 auto deploy + 1 checkpoint:human-action live-fire + 1 checkpoint:human-verify)
- **Files modified:** 1 created (`13-03-DEPLOY.md`); `n8n/workflow.json` unchanged in this plan (already fully edited by Plan 13-02, only deployed here)

## Accomplishments

- **Task 1 — Diff-checked deploy:** diffed all 92 remote nodes vs. the pre-13-02 baseline commit (`f4bb418`) — zero real drift (4 benign auto-generated `webhookId` fields on Wait nodes, identical pattern to `12.3-03-DEPLOY.md`). Deployed via a **direct full-file PUT** (settings trimmed to the 3 PUT-accepted keys) — `versionId f81aeed2 → 83aa7f3c`, node count 92 → 92, `active: true` preserved. Post-deploy spot checks confirmed all 6 of Plan 13-02's target nodes are live, and that the 4 AOAI nodes, 4+1 Postgres session nodes, and 6 untouched FB/IG Story chain nodes remain byte-identical to pre-deploy (no regression).
- **Task 2 — Real live fire:** drove the Wizard end-to-end (Historia 9:16, Instagram+Facebook, Ideogram v3, "ahora") producing exec `1788072` (submission) and, after the user replied SI on WhatsApp, exec `1788142` (approval path). Both WhatsApp preview messages independently confirmed `delivered` via direct YCloud GET (not n8n's "accepted").
- **Real Meta publishes (exec `1788142`):** IG Story `media_id 18095738795636059` (permalink `.../propulsar_ai/3954111088979999624`), FB Story `post_id 849471014766044`. Full 24-node SI-approval chain succeeded through `✅ Notify WhatsApp Story` — session recovery, IG chain, FB chain, WA notification all clean.
- **NOTIF-01 confirmed live:** WA success notification (msg id `6a6de4a544534a2ab9534da7`) verified `delivered`→`read` via direct YCloud GET, body includes the new Facebook line (`📘 Facebook: Story publicada (sin URL permanente — expira junto con Instagram)`) alongside the unchanged IG permalink/expiry text. **User visually confirmed on their phone.**
- **Sheets Log failure diagnosed and fixed (real bug, not a false alarm):** `📊 Google Sheets Log (Story)` errored again with the same "Missing columns: Error_Msg" symptom seen in Plan 13-01, despite Plan 13-02's checkpoint where the user confirmed extending the live header to 15 columns. Built a disposable harness workflow (`Webhook → Google Sheets read`, same credential/document/tab as production) and found the **actual** root cause: header cell `Log!M1` read `Error_Msj` (single-character typo) instead of `Error_Msg` — invisible to a quick visual check, but a hard schema mismatch to n8n's Google Sheets node. Fixed via a surgical single-cell raw Sheets API `PUT` (no other cell touched, verified via range read). Re-verified the fix with a harness `append` node configured **identically** to production's `sheets-log-story` (same credential/schema, synthetic marked test data) — succeeded cleanly; deleted the test row and confirmed zero residue.
- **LOG-01/LOG-02 confirmed live:** since exec `1788142`'s own Sheets node never wrote a row (failed pre-fix), backfilled the real row using that execution's own real captured data (real IG permalink, real topic, real `story_expires_at` — not synthetic) rather than firing a third real Meta publish. `Formato: "story"`, `Expires_At: "2026-08-02T12:20:44.000Z"` populated correctly. **User visually confirmed the row in the Google Sheet "Log" tab.**
- **Cleanup:** both harness workflow instances deleted (404 confirmed on GET); production main workflow reconfirmed untouched throughout (`versionId 83aa7f3c`, 92 nodes, `active: true`).
- **Test Story disposition:** IG Story deleted manually in-app by the user. FB Story deletion re-attempted via API (all 4 id variants) — failed identically to every prior attempt documented in `13-01-VERIFICATION.md` (`Unsupported delete request` / `{"success":false}`) — confirmed as a permanent Meta Graph API limitation (Stories are not API-deletable at any lifecycle point). User instructed to delete the FB Story manually in-app or accept ~24h auto-expiry (~2026-08-02T12:20Z) — **manual FB deletion still pending on the user.**

## Task Commits

Each task was committed atomically:

1. **Task 1: Diff-checked deploy** — `8a5799e` (feat)
2. **Task 2/3: Live-fire diagnosis, root-cause fix, and evidence** — `035dee9` (fix)

**Plan metadata:** (this commit)

_Note: Task 2 and Task 3 (checkpoints) share one documentation commit since the diagnosis/fix work discovered during Task 2's verification directly produced Task 3's evidence — no separate code change was needed for Task 3 itself._

## Files Created/Modified

- `.planning/phases/13-facebook-story-log-notifications/13-03-DEPLOY.md` — full deploy evidence (pre/post versionId, drift check, spot checks) plus the Sheets Log root-cause diagnosis, fix, harness evidence, and backfill record.
- `n8n/workflow.json` — unchanged in this plan (Plan 13-02 already made all code edits; this plan only deployed them).
- **Live external state changed (not repo files):** Google Sheet "Log" tab, cell `M1`, corrected from `Error_Msj` to `Error_Msg`; one new real data row appended (backfill of exec `1788142`'s Story publish).

## Decisions Made

- **Direct full-file PUT, not patch-based** — zero real drift found vs. the pre-13-02 baseline, unlike Plans 12.2-02/12.3-03 which found genuine unrelated drift requiring a patch strategy.
- **Diagnosed the Sheets Log failure programmatically instead of re-asking the user to "look again"** — a disposable harness workflow (read-only Google Sheets node against the live header) found the exact root cause (one mistyped character) in minutes, versus relying on repeated human visual inspection which had already missed it once in Plan 13-02.
- **Backfilled the real log row instead of firing a third real Meta publish** — Meta Stories are permanently non-deletable via the Graph API (reconfirmed again this plan); two were already live from today's testing. Recovering the accurate row from the same execution's own real captured node outputs gives equally strong evidence without adding a third undeletable artifact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Live Google Sheet "Log" tab header cell `M1` had a typo (`Error_Msj` instead of `Error_Msg`)**
- **Found during:** Task 2/3 live-fire verification (exec `1788142`, `📊 Google Sheets Log (Story)` node error — same symptom as Plan 13-01's original finding, meaning Plan 13-02's checkpoint fix never actually corrected this one column)
- **Issue:** n8n's Google Sheets append node schema-change detector reported "Missing columns: Error_Msg" on every append attempt because the live header's actual text was `Error_Msj`, not `Error_Msg` — a single-character typo invisible to a quick visual scan.
- **Fix:** Diagnosed via a disposable harness workflow (`Webhook → Google Sheets read`) reading the live header row and comparing keys against the expected 15-column list; fixed via a single-cell raw Sheets API `PUT` to `Log!M1` (no other cell touched).
- **Files modified:** None (live external Google Sheet data fix, same category as Plan 13-02's original header-extension checkpoint — not a repo file).
- **Verification:** Harness `append` node with production-identical config succeeded post-fix (previously failed identically pre-fix); real-row backfill for exec `1788142` succeeded with all fields populated; independent raw-range read confirmed no collateral damage to adjacent rows; user visually confirmed the resulting row.
- **Committed in:** `035dee9`

---

**Total deviations:** 1 auto-fixed (1 bug — live external data, not code)
**Impact on plan:** Necessary to actually prove LOG-01/LOG-02 work in production — without this fix, the plan's must-have truth about the Sheet row would have remained false despite two real Story publishes succeeding. No scope creep — the fix was surgical (one cell) and the verification approach (harness with production-identical config, no extra real Meta publish) minimized additional risk/waste.

## Issues Encountered

- The Google Sheets node's `deleteRows` operation errored with "Could not get parameter 'sheetName'" when called from a bare harness node — worked around by using the raw Sheets API `batchUpdate`/`deleteDimension` endpoint directly (via `HTTP Request` + `predefinedCredentialType`) instead, which succeeded cleanly. Not investigated further since a working alternative was found immediately; noted here in case a future plan needs `deleteRows` from this node type.

## User Setup Required

None — the live Google Sheet header fix and row backfill were both performed by Claude via API/harness, not manual user steps. The user's only remaining manual action is deleting the FB Story in-app (or letting it auto-expire ~2026-08-02T12:20Z) — tracked in STATE.md Open Items, not a setup blocker.

## Next Phase Readiness

- All 3 plans in Phase 13 complete. FBSTORY-01 (Plan 13-01), NOTIF-01/LOG-01/LOG-02 (Plans 13-02/13-03) all proven with real production evidence — two real Story publishes today (execs `1787647` and `1788142`), both with real Meta IG+FB publishes, real WhatsApp delivery confirmed via YCloud, and a real (backfilled) Sheet log row.
- Production `n8n/workflow.json` deployed and live at `versionId 83aa7f3c`, 92 nodes, `active: true`.
- Live Google Sheet "Log" tab header now correctly has all 15 columns (the `Error_Msj` typo was the last latent gap from Plan 13-02's checkpoint).
- **Outstanding, not blocking:** user still needs to manually delete the FB Story in-app (Propulsar.ai Page → Stories → ⋯ → Delete) or let it auto-expire ~2026-08-02T12:20Z — same permanent Meta API limitation documented since Plan 13-01, tracked in STATE.md Open Items.
- Phase itself not marked "Complete" in ROADMAP.md by this plan — per the orchestrator's phase-completion step, that happens after the phase verifier passes.

---
*Phase: 13-facebook-story-log-notifications*
*Completed: 2026-08-01*
