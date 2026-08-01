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

---

# Task 2 + Task 3 — Live-fire evidence, Sheets Log root-cause diagnosis + fix, backfill evidence

## Live fire (real Story, real Meta publish)

Drove the Wizard via the existing scratchpad driver script (same brief pattern as Plan 13-01: "Automatizacion con IA para pymes: 3 procesos que puedes delegar hoy", Educativo, Historia 9:16, Instagram+Facebook, Ideogram v3, "ahora"). Two executions:

| Exec id | Role | Started (UTC) | Status |
|---|---|---|---|
| `1788072` | Wizard webhook submission → GPT-4o text → Ideogram image → Postgres session INSERT → WhatsApp preview send | 2026-08-01T12:14:15.640Z | success |
| `1788142` | WhatsApp "SI" reply webhook → approval path → Meta publish | 2026-08-01T12:19:48.641Z | **error** (Sheets Log node only — see diagnosis below; occurred AFTER both Meta publishes and the WA success notification already succeeded) |

Session id `propulsar_1785586469318`.

### WhatsApp preview delivery (exec `1788072`) — verified via direct YCloud GET

| Message | n8n-reported | YCloud GET status |
|---|---|---|
| Preview image (`6a6de32511c0b20cf5522e20`) | accepted | **delivered** |
| Preview text (`6a6de32540acb4349e38478b`) | accepted | **delivered** |

User replied SI on WhatsApp.

### Node-by-node evidence (execution `1788142`, the SI-approval path)

All 24 nodes ran to `✅ Notify WhatsApp Story` inclusive with success status, in the same order documented in `13-01-VERIFICATION.md`. `📊 Google Sheets Log (Story)` (25th, last node) errored — see below.

**Postgres session recovery:** `🔍 Recuperar sesión Supabase` → `🛡️ Assert Session Found` passed, full session row recovered (`format: story`, `platforms: [instagram, facebook]`).

**IG Story — real publish:** `🚀 IG: Story media_publish` → `{"id": "18095738795636059"}`. `🔗 IG: Get Story Permalink` → permalink `https://www.instagram.com/stories/propulsar_ai/3954111088979999624`, `timestamp: 2026-08-01T12:20:44+0000`. `🔧 IG: Compute Story Expiry` → `story_expires_at: 2026-08-02T12:20:44.000Z`.

**FB Story — real publish:** `📤 FB: Upload Story Photo Unpublished` → `{"id": "122133725631238849"}`. `🌐 FB: Publish Photo Story` → `{"success": true, "post_id": "849471014766044"}`.

**WA success notification (`✅ Notify WhatsApp Story`) — verified via direct YCloud GET:**
- n8n-reported: `status: "accepted"`, message id `6a6de4a544534a2ab9534da7`
- Direct YCloud `GET /v2/whatsapp/messages/6a6de4a544534a2ab9534da7` → **`status: "read"`** (already opened on the phone)
- Message body (verbatim):
  ```
  📲 Story publicada (válido 24h)

  📸 Instagram: https://www.instagram.com/stories/propulsar_ai/3954111088979999624
  ⏳ Expira: dom, 14:20
  📘 Facebook: Story publicada (sin URL permanente — expira junto con Instagram)

  📝 Tema: Automatizacion con IA para pymes: 3 procesos que puedes delegar hoy
  ```
- **NOTIF-01 CONFIRMED working via real production evidence** — Facebook line present and correctly gated, alongside the unchanged IG permalink/expiry text.

## Sheets Log failure — root cause found and fixed (Deviation: Rule 1 - Bug)

**Symptom (unchanged from Plan 13-01's original finding, still present after Plan 13-02's node edits and this plan's deploy):**
```
NodeOperationError: Column names were updated after the node's setup
"Refresh the columns list in the 'Column to Match On' parameter. Missing columns: Error_Msg"
```

**Root cause, found via a disposable harness workflow (pattern from `12.2-03-VERIFICATION.md`):** built `Webhook → Google Sheets (read, range A1:P2)` using the exact same credential (`XjKteoOTobs1qR55`, "Google Sheets account") and document/sheet target (`1HrvFeYgTVrrB4MI7BmHikOo__DvZ1IWiIawGUe8W8Oc`, tab `Log`) as the production log nodes. The read returned the live header-keyed row as a JSON object; comparing its 15 keys against the expected list found **exactly one mismatch**: column M's header cell reads **`Error_Msj`** (typo, "j" instead of "g") instead of `Error_Msg`. All 14 other columns (including `Formato` and `Expires_At`, Plan 13-02's own additions) were present and correctly named — Plan 13-02's checkpoint confirmation was correct for those two; the pre-existing `Error_Msg` column (added by the user alongside them per 13-02's widened checkpoint) had a typo introduced at that time.

**Fix (single-cell, surgical):** via the same harness, added an `HTTP Request` node using `authentication: predefinedCredentialType` / `nodeCredentialType: googleSheetsOAuth2Api` (same credential, attached generically) to call the raw Sheets API directly: `PUT .../values/Log!M1?valueInputOption=RAW` with body `{"values":[["Error_Msg"]]}`. Re-read via the same harness confirmed the header now returns `Error_Msg` as a key. **No other cell was touched** (confirmed by an independent raw-range read of `Log!A24:C28` after all harness activity, showing only the 2 pre-existing production rows with no gaps or extra rows).

**Append re-verified with production-identical node config (no real Meta publish needed):** extended the harness with a `Google Sheets` `append` node configured **identically** to production's `sheets-log-story` node (same `documentId`/`sheetName`/credential/`columns.schema`, only the `columns.value` used static synthetic values instead of upstream-node expressions), with clearly-marked test data (`Tema: "TEST-13-03-harness — borrar"`). Fired: **succeeded with no error**, returned the written row with `Formato: "story"` and `Expires_At` populated — proving the header fix resolves the exact failure class.

**Test row cleanup:** located the synthetic row via a filtered read (`Tema = "TEST-13-03-harness — borrar"` → `row_number: 26`), deleted it via the Sheets API `batchUpdate` `deleteDimension` (sheetId `0`, the `Log` tab's gid, `startIndex: 25, endIndex: 26`) — **HTTP 200**. Verified removal: (a) the same filtered lookup now returns zero matches, (b) a raw range read of `Log!A24:C28` shows only the 2 pre-existing rows at 24-25 and nothing beyond — no orphaned data, no row-shift damage.

**Real-row backfill (not synthetic):** exec `1788142`'s own Sheets Log node never wrote a row (it errored before the append completed), so — despite the mechanism now being proven fixed — there was no actual log row for today's real published Story. Rather than firing a **third** real Meta publish (Meta does not support API deletion of Photo/IG Stories at any lifecycle point, confirmed exhaustively in `13-01-VERIFICATION.md`; two undeletable test Stories already exist from today), backfilled the row using exec `1788142`'s own real captured values (from `🔗 Merge Rehost Output` and `🔧 IG: Compute Story Expiry`'s real node outputs in that execution — not fabricated data): `Tema`, `Tipo`, `Plataformas`, `Modelo_Imagen`, `Imagen_URL` (real Hostinger rehost URL), `IG_URL` (real permalink), `Formato: "story"`, `Expires_At: "2026-08-02T12:20:44.000Z"` (the real computed value), `Fecha`/`Publicado_En` set to `2026-08-01T12:20:53.000Z` (matching the real WA notification's `createTime`, i.e. the moment the Sheets node would have run in the original execution). Appended via the same harness/production-identical node config — **succeeded, HTTP 200, row written with all fields populated correctly**. This row is a permanent, accurate record of today's real Story publish in the live production Log tab (not deleted, unlike the synthetic test row).

**Harness workflow cleanup:** deactivated + deleted both harness workflow instances (`1gGQJcIe787ruaNA`, `yQakUxU5Gchhpour`) — confirmed `404` on GET after each deletion.

**Production main workflow (`Qql7mvYRxKBsPZ5t`) reconfirmed untouched** by any harness activity: `versionId 83aa7f3c-a229-46a7-9920-db9db5696e65` (unchanged from Task 1's deploy), `active: true`, `92` nodes.

## Test Story cleanup (FB + IG, both from today's live fire)

Both real test artifacts from exec `1788142` — FB Photo Story (`post_id 849471014766044`, `photo_id 122133725631238849`) and IG Story (`media_id 18095738795636059`, permalink `.../propulsar_ai/3954111088979999624`) — could not be deleted via the Graph API (re-confirmed: `Unsupported delete request` / `{"success":false}` on FB, matching every prior attempt documented in `13-01-VERIFICATION.md`). **User deleted the IG Story manually in-app. User was instructed to delete the FB Story manually in-app** (or accept ~24h auto-expiry, ~2026-08-02T12:20Z). No further API-based cleanup is possible for either platform — this is a confirmed, permanent Meta Graph API limitation, not specific to this plan's test content.

## Deviations

**1. [Rule 1 - Bug] Live Google Sheet "Log" tab header cell `M1` had a typo (`Error_Msj` instead of `Error_Msg`)**
- **Found during:** Task 2/3 live-fire verification (exec `1788142`, `📊 Google Sheets Log (Story)` node error)
- **Issue:** Despite Plan 13-02's checkpoint where the user confirmed extending the live Sheet header to 15 columns, the `Error_Msg` column was actually typed as `Error_Msj` — a single-character typo. This caused n8n's Google Sheets node schema-change detector to report "Missing columns: Error_Msg" on every append attempt (identical symptom to Plan 13-01's original finding, meaning Plan 13-02's fix never actually took effect for this one column).
- **Fix:** Diagnosed via a disposable harness workflow (read + compare header keys) and fixed via a single-cell raw Sheets API `PUT` to `Log!M1` — no other cell touched.
- **Files modified:** None (live external Google Sheet data fix, not a repo file — same category as Plan 13-02's original live Sheet header edit).
- **Verification:** Harness append with production-identical node config succeeded post-fix (previously failed identically pre-fix); real-row backfill for exec `1788142` succeeded with all fields populated; independent range read confirmed no collateral damage to adjacent rows.
- **Note for future Sheets/Log work:** always verify live Sheet header cell TEXT programmatically (via a disposable read, as done here) rather than trusting a human's visual "looks right" confirmation for exact-match column names — a single-character typo is easy to miss visually but breaks n8n's schema-change guard completely.
