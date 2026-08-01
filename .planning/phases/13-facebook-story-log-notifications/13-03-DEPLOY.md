# Plan 13-03 Task 1 — Deploy artifact

**Deployed:** 2026-08-01T12:12:29.470Z
**Deployer:** Plan 13-03 Task 1 (n8n PUT /api/v1/workflows/{id})
**Base URL:** https://n8n-azure.propulsar.ai
**Workflow ID:** `Qql7mvYRxKBsPZ5t` (Propulsar — Content Engine v3)

## Pre-deploy state

- **versionId:** `f81aeed2-c621-4127-857c-99b537f8c314` — matches the expected last-known-good value from `13-01-VERIFICATION.md` / STATE.md exactly (no deploys landed between Phase 12.3-03 and this plan; Plans 13-01/13-02 deployed nothing).
- **active:** `true`
- **Node count:** 92

## Drift check (remote vs. repo's pre-13-02 baseline)

Diffed all 92 remote nodes (by id) against the repo's `f4bb418` commit (`docs(13-01): complete FB Story live-fire verification plan` — the last commit before Plan 13-02's edits, i.e. the correct pre-13-02/pre-13-03 baseline).

- **Node id parity:** 92 = 92, zero ids only-in-remote, zero ids only-in-baseline.
- **Connections identical:** true (byte-for-byte, `json.dumps(sort_keys=True)` comparison).
- **Settings identical:** true (both `{executionOrder, saveManualExecutions, callerPolicy, availableInMCP, binaryMode}`, same values).
- **4 node-level "diffs" found, all benign (confirmed non-substantive by inspection — identical pattern to Plan 12.3-03's finding):**
  - `wait-container-ready`, `ig-wait-story-container`, `ig-wait-carousel`, `wait-scheduled-publish` — remote has an extra `webhookId` field n8n auto-generates server-side for Wait nodes (internal resume-webhook id, assigned at runtime). Not present in the repo's static JSON. Not a real config diff — every other field on these 4 nodes matched exactly.

**Conclusion: zero real drift** (matches the "Repo synced with pre-existing Azure OpenAI drift" Open Item's resolution — the 4 AOAI-related nodes are already correctly synced into the repo since `498701b`, confirmed again below via byte-identical spot checks). Safe to proceed with a **direct full-file PUT** of the local `n8n/workflow.json` (which already contains Plan 13-02's 6-node edits on top of this same baseline) — no patch strategy needed this time, unlike Plan 12.2-02/12.3-03 which found real unrelated drift.

## Deploy method: direct full-file PUT

Built the PUT payload directly from the repo's post-13-02 `n8n/workflow.json`:

- `name`: `Propulsar — Content Engine v3`
- `nodes`: all 92 nodes from the local file (verbatim, including Plan 13-02's 6 edited node bodies)
- `connections`: local file's connections object (unchanged by Plan 13-02, additive-only edits)
- `settings`: trimmed to the 3 keys the PUT schema accepts (`executionOrder: "v1"`, `saveManualExecutions: true`, `callerPolicy: "workflowsFromSameOwner"`) — per the known PUT-schema gotcha documented in `12.3-03-DEPLOY.md` (`availableInMCP`/`binaryMode` are present in GET responses but rejected as "additional properties" on PUT). Stripped proactively this time — no 400 encountered.

Payload archived at `.tmp/deploy-13-03-payload.json` (gitignored, local evidence only, also mirrored to the session scratchpad).

## PUT result

- **HTTP status:** 200
- **New versionId:** `83aa7f3c-a229-46a7-9920-db9db5696e65`
- **Deploy timestamp (remote `updatedAt`):** `2026-08-01T12:12:29.470Z`

## Post-deploy spot checks (all PASS)

Re-GET archived at scratchpad `remote-post-deploy.json`.

| Check | Result |
|---|---|
| `versionId` recorded | `83aa7f3c-a229-46a7-9920-db9db5696e65` |
| `active` preserved | `true` |
| Node count | `92` (unchanged — Plan 13-02 only edited existing nodes, added 0) |
| `sheets-log-story` contains `Expires_At` | **true** |
| `sheets-log-story` contains `Formato` | **true** |
| `notify-wa-story` contains `Facebook` line | **true** |
| `notify-wa-story` contains `platforms...includes('facebook')` reused check | **true** |
| `log-sheets` contains `Formato` | **true** |
| `log-sheets-carousel` contains `Formato` | **true** |
| `sheets-fail-log` contains `Formato` | **true** |
| `parse-meta-error` jsCode contains `format: mergeData.format \|\| 'single'` | **true** |
| AOAI safety check: `openai-text` byte-identical pre/post | **true** |
| AOAI safety check: `openai-carousel` byte-identical pre/post | **true** |
| AOAI safety check: `parse-content` byte-identical pre/post | **true** |
| AOAI safety check: `parse-carousel` byte-identical pre/post | **true** |
| Postgres session node `save-session-supabase` byte-identical pre/post | **true** |
| Postgres session node `save-session-carousel` byte-identical pre/post | **true** |
| Postgres session node `save-session-supabase-story` byte-identical pre/post | **true** |
| Postgres session node `retrieve-session` byte-identical pre/post | **true** |
| Postgres session node `assert-session-found` byte-identical pre/post | **true** |
| FB/IG Story chain node `ig-compute-story-expiry` byte-identical pre/post | **true** |
| FB/IG Story chain node `check-platforms-facebook` byte-identical pre/post | **true** |
| FB/IG Story chain node `assert-fb-story-url` byte-identical pre/post | **true** |
| FB/IG Story chain node `fb-fetch-ideogram-bytes` byte-identical pre/post | **true** |
| FB/IG Story chain node `fb-upload-story-photo` byte-identical pre/post | **true** |
| FB/IG Story chain node `fb-publish-photo-story` byte-identical pre/post | **true** |

**All spot checks from the plan's `<verify>` block PASS.** Production workflow `Qql7mvYRxKBsPZ5t` now serves Plan 13-02's NOTIF-01/LOG-01/LOG-02 edits live, with the 4 AOAI nodes, 4+1 Postgres session nodes (including the guard node), and the full FB/IG Story chain (minus `notify-wa-story`, intentionally edited) all confirmed byte-identical to their pre-deploy state — no unrelated regression.

## Rollback

If Task 2/3's live fire uncovers a problem: `git revert 10489cb 407df12` (Plan 13-02's 2 workflow-editing commits, in reverse order) restores the pre-13-02 node shapes locally, then re-run the same direct-PUT approach used here (re-check for drift first, per the established pattern — a live fire between now and any rollback could introduce new drift).

## Next

Task 2 (human checkpoint): a real Wizard → webhook → WhatsApp-preview Story fire (platforms = instagram + facebook), approved with SI. Task 3 verifies the WhatsApp message text and the Google Sheet row via human visual confirmation.
