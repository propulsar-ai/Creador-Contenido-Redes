# Plan 14-01 Task 2 — Deploy artifact

**Deployed:** 2026-08-01 (this session)
**Deployer:** Plan 14-01 Task 2 (n8n PUT /api/v1/workflows/{id})
**Base URL:** https://n8n-azure.propulsar.ai
**Workflow ID:** `Qql7mvYRxKBsPZ5t` (Propulsar — Content Engine v3)

## Pre-deploy state (re-verified this session, per the "re-verification-before-fire" pattern)

- **versionId:** `83aa7f3c-a229-46a7-9920-db9db5696e65` — matches the expected last-known-good value from 14-RESEARCH.md / STATE.md exactly (zero deploys landed since Phase 13-03's close).
- **active:** `true`
- **Node count:** `92`
- **updatedAt:** `2026-08-01T12:12:29.470Z`

## Drift check (remote vs. repo baseline)

Diffed all 92 remote nodes (by id) against the repo's pre-fix commit (`HEAD~1` at deploy time, i.e. the commit immediately before Task 1's connection-edge fix).

- **Node id parity:** 92 = 92, zero ids only-in-remote, zero ids only-in-baseline.
- **Node-level diff (`parameters`, `type`, `typeVersion`, `credentials`) across all 92 nodes:** **0 diffs.**
- **Connections object:** byte-identical between remote and repo pre-fix baseline (`JSON.stringify` comparison, `true`).

**Conclusion: zero real drift.** Repo and production were in perfect sync before this deploy — this exactly matches 14-RESEARCH.md's live-GET finding from a few hours earlier in the same day.

## Deploy method: patch-based PUT (locked decision, applied regardless of drift)

Per CONTEXT.md's locked decision, this fix uses a patch-based deploy strategy regardless of the drift outcome above (a 2-edge connections-only change carries no reason to risk a full-file PUT):

1. Fetched remote via GET as the base payload.
2. Applied ONLY the 2 connection-edge retargets from Task 1 directly onto the remote `connections` object:
   - `💬 IG: Post Hashtag Comment`.main[1] → `🏷️ Tag IG Error` replaced with `🔗 IG: Get Permalink`
   - `💬 IG: Post Carousel Hashtag Comment`.main[1] → `🏷️ Tag IG Error` replaced with `🔗 IG: Get Carousel Permalink`
3. Trimmed `settings` to the 3 keys the PUT schema accepts (`executionOrder: "v1"`, `saveManualExecutions: true`, `callerPolicy: "workflowsFromSameOwner"`) — GET's extra `availableInMCP`/`binaryMode` keys omitted per the known PUT-schema gotcha (`12.3-03-DEPLOY.md`).
4. PUT body top-level keys: `name`, `nodes` (all 92, verbatim from remote GET — zero node bodies touched), `connections` (with the 2 edges retargeted), `settings` (trimmed).

Payload built and PUT in-session via a scratch Node.js script (not committed — one-off deploy tooling, consistent with prior phases' pattern).

## PUT result

- **HTTP status:** 200
- **New versionId:** `81386618-f8ba-4db2-abac-f2972c1abe07`
- **active:** `true`
- **Node count:** `92`

## Post-deploy spot checks (all PASS)

| Check | Result |
|---|---|
| `versionId` changed (new ≠ pre-deploy) | **true** (`83aa7f3c...` → `81386618...`) |
| `active` preserved | `true` |
| Node count | `92` (unchanged) |
| `connections["💬 IG: Post Hashtag Comment"].main[1][0].node === "🔗 IG: Get Permalink"` | **true** |
| `connections["💬 IG: Post Carousel Hashtag Comment"].main[1][0].node === "🔗 IG: Get Carousel Permalink"` | **true** |
| Total connection keys with any diff (pre vs post) | **2** (exactly the 2 intended keys — `💬 IG: Post Hashtag Comment`, `💬 IG: Post Carousel Hashtag Comment`) |
| Node-level diff across all 92 nodes (pre vs post, full JSON) | **0** — zero node bodies changed |
| Canary: `openai-text` byte-identical pre/post | **true** |
| Canary: `openai-carousel` byte-identical pre/post | **true** |
| Canary: `parse-content` byte-identical pre/post | **true** |
| Canary: `parse-carousel` byte-identical pre/post | **true** |
| Canary: `save-session-supabase` byte-identical pre/post | **true** |
| Canary: `save-session-carousel` byte-identical pre/post | **true** |
| Canary: `retrieve-session` byte-identical pre/post | **true** |
| Canary: `assert-session-found` byte-identical pre/post | **true** |
| Canary: all 16 FB/IG Story-chain nodes byte-identical pre/post | **true** |
| `🏷️ Tag IG Error` still receives error edges from all 10 OTHER Meta-facing nodes | **true** (📤 IG: Create Story Container, 🚀 IG: Story media_publish, 🔗 IG: Get Story Permalink, 🖼️ IG: Create Child Container, 🎠 IG: Create Parent Container, 🚀 IG: Carousel media_publish, 🔗 IG: Get Carousel Permalink, 📤 IG: Create Container, 🚀 IG: media_publish, 🔗 IG: Get Permalink) |

**All spot checks from the plan's `<verify>` block PASS.** Production workflow `Qql7mvYRxKBsPZ5t` now carries the 2-edge hashtag-comment `onError` reroute live, with zero collateral changes to any other node or connection — confirmed both by exact key-diff counting and by a full byte-identical comparison of every one of the 92 node bodies.

## Rollback

If Plan 14-02/14-03's live fires uncover a problem: `git revert cc266b9` (this plan's connections-editing commit) restores the pre-fix connection targets locally, then re-run the same patch-based PUT approach used here (re-check for drift first, per the established pattern).

## Next

Plans 14-02 (single post live-fire) and 14-03 (carousel live-fire) exercise this fix live — a hashtag-comment failure should now flow through to the FB feed branch instead of dead-ending at the error-notification subgraph.
