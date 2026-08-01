---
phase: 14-v1-2-regression-live-fire
plan: 01
subsystem: infra
tags: [n8n, connections-graph, deploy, meta-graph-api, hashtag-comment, onError]

# Dependency graph
requires:
  - phase: 12-ig-story-publishing
    provides: hashtag-comment nodes with onError=continueErrorOutput (mis-wired connections)
provides:
  - Live production fix unblocking the FB feed branch (single + carousel formats)
  - 14-01-DEPLOY.md deploy evidence artifact
affects: [14-02-single-post-live-fire, 14-03-carousel-live-fire]

# Tech tracking
tech-stack:
  added: []
  patterns: [patch-based PUT deploy with remote-as-base, connections-object-only surgical edit]

key-files:
  created: [.planning/phases/14-v1-2-regression-live-fire/14-01-DEPLOY.md]
  modified: [n8n/workflow.json]

key-decisions:
  - "Patch-based deploy applied regardless of drift outcome (locked decision) even though pre-flight diff found zero real drift"
  - "Error output (main[1]) of both hashtag-comment nodes retargeted to same destination as their success output (main[0]), bypassing the shared error-notification subgraph entirely for this non-blocking failure"

patterns-established:
  - "Connections-object-only edit: node bodies (onError/retryOnFail) never needed to change — the bug was purely in the connections graph, not node config"

# Metrics
duration: ~20min
completed: 2026-08-01
---

# Phase 14 Plan 01: Hashtag-Comment onError Reroute + Deploy Summary

**Retargeted the hashtag-comment nodes' error-output edges from the dead-end error-notification subgraph to their own success-output destination (Get Permalink / Get Carousel Permalink), unblocking the FB feed branch that has been unreachable since 2026-04-17, and deployed the 2-edge fix to production via a patch-based PUT with zero collateral changes.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-01T16:51:00Z
- **Tasks:** 2
- **Files modified:** 2 (n8n/workflow.json, 14-01-DEPLOY.md created)

## Accomplishments
- Diagnosed-and-fixed bug confirmed live: both hashtag-comment nodes' `main[1]` (error output) previously routed to `🏷️ Tag IG Error`, a dead end for this non-blocking failure (missing `instagram_manage_comments` scope). Retargeted to the same node as `main[0]` (success output), matching the node's own (previously false) inline claim that "onError=continueErrorOutput so publish chain continues".
- Repo edit verified surgical: `git diff` showed exactly 2 changed lines, nothing else touched.
- Error-notification subgraph (`🏷️ Tag IG Error` → `🚨 Parse Meta Error` → ...) confirmed still wired for all 10 other Meta-facing nodes (programmatically enumerated, not assumed).
- Deployed live via patch-based PUT: pre-flight GET confirmed zero drift (versionId `83aa7f3c`, active, 92 nodes matched repo exactly), then PUT applied only the 2 connection-edge retargets on top of the remote GET base.
- Post-deploy verification found zero node-body diffs across all 92 nodes and exactly 2 connection-key diffs (the intended ones) — including byte-identical checks on the full canary set (4 AOAI nodes, 4 Postgres session nodes, 16 FB/IG Story-chain nodes).

## Task Commits

Each task was committed atomically:

1. **Task 1: Retarget both hashtag-comment error edges in the repo workflow** - `cc266b9` (fix)
2. **Task 2: Patch-based deploy to production + spot checks + deploy doc** - `8d2bcd7` (feat)

**Plan metadata:** _(pending final commit)_

## Files Created/Modified
- `n8n/workflow.json` - 2 connection-object edges retargeted (hashtag-comment error outputs now point to their own success destination instead of the shared error subgraph)
- `.planning/phases/14-v1-2-regression-live-fire/14-01-DEPLOY.md` - Deploy evidence: pre/post versionId, drift findings (zero), PUT strategy (patch-based), full spot-check results table

## Decisions Made
- Applied the locked decision to use a patch-based PUT deploy strategy regardless of the drift-check outcome — even though this session's pre-flight found zero real drift (perfect repo/production sync), a full-file PUT was avoided in favor of the lower-risk patch approach for a 2-edge connections-only change.
- No architectural changes were needed — this confirmed the research's diagnosis that the bug lived entirely in the `connections` object, not in either node's own configuration (`onError`, `retryOnFail` untouched on both nodes).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. n8n API key was already present and valid in local `.env`.

## Next Phase Readiness

- Production workflow `Qql7mvYRxKBsPZ5t` (versionId `81386618-f8ba-4db2-abac-f2972c1abe07`) now carries the fix live: a single/carousel execution can flow error-output → Get Permalink → FB feed branch instead of dead-ending.
- Plans 14-02 (single post live-fire) and 14-03 (carousel live-fire) can now proceed to prove this live — the hashtag-comment node itself is still expected to show an `error` status (its own failure, documented/expected, unrelated to this fix), but the FB feed branch (`🌐 FB: Publish Photo` / `🖼️ FB: Explode Carousel Slides`) should now be reached for the first time since 2026-04-17.
- No blockers identified.

---
*Phase: 14-v1-2-regression-live-fire*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: n8n/workflow.json
- FOUND: .planning/phases/14-v1-2-regression-live-fire/14-01-DEPLOY.md
- FOUND: commit cc266b9 (Task 1)
- FOUND: commit 8d2bcd7 (Task 2)
