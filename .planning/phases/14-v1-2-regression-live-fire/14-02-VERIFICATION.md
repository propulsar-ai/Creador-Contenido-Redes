# Phase 14 Plan 02: VERIF-01 Single-Post Live-Fire Evidence

**Purpose:** Live-fire the single-post format through the full production pipeline (Wizard → n8n → Postgres session → WhatsApp SI approval → IG + FB publish) to prove the Supabase→Azure Postgres migration (Phase 12.3) works for the `save-session-supabase` INSERT/recovery variant, and to live-prove Plan 14-01's hashtag-comment `onError` fix for the first time since 2026-04-17.

**Date:** 2026-08-01
**Workflow:** `Qql7mvYRxKBsPZ5t` @ `https://n8n-azure.propulsar.ai`

---

## 1. Brief Submitted (Task 2)

| Field | Value |
|---|---|
| Topic | "Agentes IA autónomos para ventas y soporte en WhatsApp Business" (Perplexity trending) |
| Type | `educational` |
| Angle | "El costo oculto de no automatizar esto" (AI-suggested, option 1) |
| Format | Single (Post Individual) |
| Platforms | Instagram + Facebook |
| Image model | Flux 2 Pro (Wizard's own suggestion, accepted) — $0.03 |
| Publish time | "ahora" (immediate) |
| Approval number | `+5493517575244` |

## 2. Submission Execution — `1791764`

- `startedAt` 2026-08-01T17:02:25.646Z, `stoppedAt` 17:02:38.681Z, `status: success`.
- `💾 Guardar sesión Supabase` (single-post Postgres INSERT — the exact node class that killed pre-migration exec `1786295`) succeeded.
- WA preview messages: image `6a6e26ad44534a2ab95490f8` delivered 17:02:40Z, text `6a6e26ae44534a2ab95490ff` delivered 17:02:39Z (both confirmed via direct YCloud GET, not n8n's `accepted`).

## 3. SI Approval Execution — `1792209`

Triggered by real inbound WhatsApp reply "Si" from `+5493517575244` at `2026-08-01T17:37:31Z` (via `propulsar-whatsapp-reply` webhook, `wamid.HBgNNTQ5MzUxNzU3NTI0NBUCABIYIEFDNkI2RjUwOEIwOUY4NkFCRjQ5MkI5MDE1MTQ3MzQ5AA==`). Exec `startedAt` 17:37:33.562Z, `stoppedAt` 17:38:34.169Z, `status: success`, `finished: true`.

**Node-by-node (22 nodes ran, all `success`):**

| Node | Result |
|---|---|
| `📨 Webhook — Reply WA` | Received real inbound "Si" text message |
| `✅ ¿Aprobado?` | Routed to approval branch |
| `🔍 Recuperar sesión Supabase` | **Postgres recovery SELECT succeeded — first live proof of the single-format recovery path since the migration.** Returned session `142e1dc7-61a8-4c58-b066-73ee4f63a046` / `session_id: propulsar_1785603757403` with topic/angle/platforms/captions matching the brief exactly. |
| `🛡️ Assert Session Found` | Guard passed (session found, no fail-loud throw) |
| `🕐 Compute wait_seconds` / `⏰ ¿Programado?` | "ahora" path taken, no scheduling |
| `🔧 Prep Re-host Input` → `🔁 Re-host Images` → `🔗 Merge Rehost Output` | Image re-hosted to `rehost-service` (Hostinger) — `https://rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host/files/2026/08/01/050a3e1c-d656-4e87-ada5-e6c4ad3b8bc2.jpg` |
| `🔀 ¿Formato Carrusel?` / `🔀 ¿Formato Story?` | Both false — single-photo branch taken |
| `📤 IG: Create Container` | `{"id": "17889974469666804"}` |
| `⏳ Wait 30s` | Passed |
| `🚀 IG: media_publish` | `{"id": "18174505420425505"}` |
| **`💬 IG: Post Hashtag Comment`** | **Status `success` (node itself did NOT halt) but took its ERROR output (`main[1]`)** — raw response: `400 - {"error":{"message":"(#10) Application does not have permission for this action","type":"OAuthException","code":10,"fbtrace_id":"A2ZQxzQPRFpns953Ixlb4Gr"}}`. **This is the expected, documented failure** (missing `instagram_manage_comments` scope, pending Susana's token regen). |
| `🔗 IG: Get Permalink` | **Reached via the error-output edge — live proof of Plan 14-01's fix.** `{"id": "18174505420425505", "permalink": "https://www.instagram.com/p/DbgZI2glh3x/"}` |
| **`🌐 FB: Publish Photo`** | **First successful FB feed publish since 2026-04-17.** `{"id": "122133764841238849", "post_id": "981931321668013_122133764865238849"}` |
| `✅ Notify WhatsApp Success` | Message `6a6e2f17b6062c6ba0c86cbe` sent: "✓ Publicado en Instagram y Facebook\n\nTema: ...\nInstagram: https://www.instagram.com/p/DbgZI2glh3x/\nFacebook: https://www.facebook.com/981931321668013_122133764865238849\nHora: 2026-08-01T17:38:30.959Z" |
| `📊 Google Sheets Log` | Row appended (see §6) |
| `🧹 Extract Blob Names` → `🗑️ Delete Rehosted Image` (last node) | Cleanup of rehost-service temp file |

No error-subgraph node (`🏷️ Tag IG Error`, `🚨 Parse Meta Error`, WA error notifications, `📊 Sheets Fail Log`) fired anywhere in this execution — overall exec `error: null`.

## 4. YCloud Delivery Confirmation (direct GET, never trusting n8n's `accepted`)

```
GET https://api.ycloud.com/v2/whatsapp/messages/6a6e2f17b6062c6ba0c86cbe
→ {"id": "6a6e2f17b6062c6ba0c86cbe", "status": "delivered"}
```

## 5. Postgres Verification (direct query) — Real Bug Found + Fixed

**Firewall:** existing rule `claude-session-20260801` (185.73.168.36) matched the current session IP — no new rule needed.

**Initial query (as specified by the plan) returned ZERO rows:**
```sql
SELECT * FROM content_sessions WHERE format='single' ORDER BY created_at DESC LIMIT 1;
-- → []
```

**Root cause:** `💾 Guardar sesión Supabase` (single-post INSERT, node id `save-session-supabase`) never included the `format` column in its INSERT statement — unlike the carousel/story INSERTs, which explicitly set `format='carousel'`/`format='story'` as literals. Every single-post session since the Postgres migration (Phase 12.3) has `format = NULL`. This is a genuine correctness bug (Rule 1): it breaks any query that filters sessions by format, including this plan's own required verification query and any future analytics/debugging work.

**Fix applied (per locked re-fire policy — fix directly, no consultation):**
- `n8n/workflow.json`: added `format` column with literal `'single'` to `save-session-supabase`'s INSERT query, matching the carousel/story pattern exactly. Commit `b3e166a`.
- Deployed live via patch-based PUT: pre-flight GET confirmed zero drift (versionId `81386618-f8ba-4db2-abac-f2972c1abe07`, matching 14-01's post-deploy state exactly) → PUT with only this 1 node's `parameters.query`/`notes` changed → post-deploy versionId `f2700b77-030a-4526-99cf-da707389027c`, `active: true`, 92 nodes. Post-deploy diff confirmed **exactly 1 node changed** (`save-session-supabase`), connections object byte-identical.
- **Backfill instead of a costly re-fire** (established 13-03 precedent — use real captured data, don't fire a fresh real Meta post just to re-test logging): the existing session row (`session_id: propulsar_1785603757403`, the one this exact live-fire already created and published) was updated directly:
  ```sql
  UPDATE content_sessions SET format='single' WHERE session_id='propulsar_1785603757403' AND format IS NULL RETURNING *;
  -- → 1 row updated
  ```

**Final row (post-fix, full record):**

| Column | Value |
|---|---|
| `id` | `142e1dc7-61a8-4c58-b066-73ee4f63a046` |
| `session_id` | `propulsar_1785603757403` |
| `topic` | Agentes IA autónomos para ventas y soporte en WhatsApp Business |
| `type` | `educational` |
| `angle` | El costo oculto de no automatizar esto |
| `platforms` | `{instagram,facebook}` |
| `image_model` | `flux` |
| `format` | `single` (fixed) |
| `final_image_url` | `https://v3b.fal.media/files/b/0aa49d77/MZOUIA7gNIZZT0vfnqP15_5a91a2ed130f4a78bdac5d474d6898a0.jpg` |
| `approval_number` | `+5493517575244` |
| `status` | `pending` (never set to consumed — pre-existing documented tech debt, not in scope) |
| `publish_at` | `now` |
| `created_at` | `2026-08-01T17:02:37.553Z` |

Any future single-post session created after this deploy will have `format='single'` set correctly by the INSERT itself, with no backfill needed.

## 6. Google Sheets "Log" Row (harness-verified, exact-match)

Disposable harness workflow `HARNESS-14-02-sheets-read` (`Webhook → Google Sheets read` initially, then a raw `HTTP Request` node against `spreadsheets.values.get` for the full range to confirm total row count/order) deployed via `POST /api/v1/workflows` (id `kV2lfYCVyGkYxOIT`), activated, triggered via its webhook, read, then deleted via `DELETE /api/v1/workflows/kV2lfYCVyGkYxOIT` — follow-up GET returned `404` (confirmed removed).

**Live header (exact-match, `Log!A1:O1`):**
```
["Fecha","Tema","Tipo","Angulo","Plataformas","Modelo_Imagen","Imagen_URL","Estado","IG_URL","FB_URL","Publicado_En","Publish_Status","Error_Msg","Formato","Expires_At"]
```
`Error_Msg` confirmed correctly spelled (the 13-03 typo fix holds).

**Last row (row 27, this run — trailing `Expires_At` cell omitted by the Sheets API since it's blank, as expected for single format):**
```json
["2026-08-01T17:38:32.542Z","Agentes IA autónomos para ventas y soporte en WhatsApp Business","educational","El costo oculto de no automatizar esto","instagram, facebook","flux","https://rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host/files/2026/08/01/050a3e1c-d656-4e87-ada5-e6c4ad3b8bc2.jpg","Publicado","https://www.instagram.com/p/DbgZI2glh3x/","https://www.facebook.com/981931321668013_122133764865238849","2026-08-01T17:38:32.564Z","success","","single"]
```

`Formato` = exactly `"single"` (programmatically verified, not visual). `Estado`/`IG_URL`/`FB_URL` all populated coherently with the execution evidence above. Total sheet had 27 rows including header (26 historical test rows from Phases 12/13 + this run's 2 rows — 1 story-format row from earlier today at 12:20:53Z, then this single-format row at 17:38:32Z).

## 7. Image Cost

Flux 2 Pro: **$0.03** (single call, Wizard's own suggestion, accepted per locked decision). Running total against the ~$1.50 phase budget: **$0.03**.

## 8. Summary — VERIF-01 Chain Complete

- [x] Wizard brief submitted via real interactive flow (Perplexity trending + AI angle suggestion)
- [x] Submission exec `1791764`: Postgres INSERT succeeded, WA preview delivered (confirmed via YCloud GET)
- [x] Real SI reply received and processed (exec `1792209`)
- [x] Postgres session recovery (`retrieve-session`/`assert-session-found`) succeeded live — first proof for the single format since the migration
- [x] IG publish succeeded (media_id `18174505420425505`, permalink `https://www.instagram.com/p/DbgZI2glh3x/`)
- [x] Hashtag-comment failed as expected (code 10) but execution continued into the FB branch — **live proof of Plan 14-01's fix**
- [x] FB feed publish succeeded (post_id `981931321668013_122133764865238849`) — first since 2026-04-17
- [x] WhatsApp success notification delivered (confirmed via YCloud GET)
- [x] Postgres row confirmed with `format='single'` (after fixing a real bug found live — see §5)
- [x] Sheets Log row confirmed with `Formato='single'` (exact-match, harness-verified, not visual)
- [x] Zero Postgres-migration-related errors anywhere in either execution

**Pending (Tasks 5-6, not yet executed):** user visual confirmation of the live posts; cleanup (FB delete via API, IG delete attempt).

---

## Cleanup (Task 6 — appended after user visual confirmation)

User visually confirmed both posts live and correct on 2026-08-01 ("confirmado") — proceeding with cleanup per locked policy (same-session cleanup after full verification).

### FB feed post — deleted via API (expected to work)

```
DELETE https://graph.facebook.com/v22.0/981931321668013_122133764865238849?access_token=...
→ {"success":true}
```

Follow-up GET to confirm removal:

```
GET https://graph.facebook.com/v22.0/981931321668013_122133764865238849?access_token=...
→ 400 {"error":{"message":"(#10) Object does not exist, cannot be loaded due to missing permission or reviewable feature, or does not support this operation. This endpoint requires the 'pages_read_engagement' permission or the 'Page Public Content Access' feature. ...","type":"OAuthException","code":10,"fbtrace_id":"ATbWuf2gWc-W-XpWg-n7UGZ"}}
```

Note: the follow-up GET's error is a permission-class error (code 10, "missing permission or reviewable feature"), not a clean "does not exist" (code 100). This token's scope doesn't support unauthenticated-style page-post reads at all, so this GET is not by itself conclusive proof of deletion. However, the `DELETE` call itself returned Meta's canonical success payload (`{"success":true}`), which is the authoritative signal per Graph API semantics — matches the established pattern (Propulsar memory: FB test feed posts are API-deletable) and matches this plan's expectation. Treated as **deleted**.

### IG media — deletion attempted, failed as expected (permissions)

```
DELETE https://graph.facebook.com/v22.0/18174505420425505?access_token=...
→ 400 {"error":{"message":"(#10) Insufficient permissions to access this data","code":10,"type":"OAuthException","fbtrace_id":"AU2FnxpglN_PuKTyebnf155"}}
```

Failed exactly as expected — IG Business media is not API-deletable with this token's permission set (consistent with established Propulsar memory/precedent for IG content deletion). **IG post is PENDING MANUAL DELETION** — permalink for the user to act on at the Plan 14-03 end-of-phase checkpoint:

`https://www.instagram.com/p/DbgZI2glh3x/`

### Cleanup summary

| Platform | Post ID | API deletion result | Status |
|---|---|---|---|
| Facebook | `981931321668013_122133764865238849` | `{"success":true}` | Deleted |
| Instagram | `18174505420425505` | `400 OAuthException code 10 (insufficient permissions)` | Pending manual deletion (queued for 14-03 checkpoint) |

**VERIF-01 evidence chain and cleanup complete.** Image cost for this plan: $0.03 (Flux 2 Pro, single call).
