# Plan 13-01: FB Story Live-Fire Verification

**FBSTORY-01 CONFIRMED LIVE.** Real end-to-end fire through Wizard → WhatsApp SI approval → Postgres session recovery (first live exercise of the Phase 12.3 rewired read) → re-host sub-workflow → IG Story chain → FB Story 2-step chain. Both IG and FB Stories published for real to the Propulsar.ai accounts. The `fb-publish-photo-story` node's real response shape is now documented (resolving the "esperado" guess in its own inline note). One unrelated downstream failure found (Google Sheets Log node) — documented for Plan 13-02/13-03, not fixed here (out of this plan's scope).

## Environment re-verification (bridges Task 1 → Task 2 gap)

Task 1's pre-flight (prior session, see `13-01-BLOCKED.md`) ran against versionId `7447171f`. Between that and this session's live-fire, Phase 12.3 deployed a new versionId (`7447171f` → `f81aeed2`, 91 → 92 nodes) to migrate session storage off Supabase. Before firing, this plan re-verified the FB Story chain against the CURRENT live workflow:

- `GET /api/v1/workflows/Qql7mvYRxKBsPZ5t` → `versionId: f81aeed2-c621-4127-857c-99b537f8c314`, `active: true`, `nodes.length: 92`
- All 7 FB Story chain nodes (`ig-compute-story-expiry`, `check-platforms-facebook`, `assert-fb-story-url`, `fb-fetch-ideogram-bytes`, `fb-upload-story-photo`, `fb-publish-photo-story`, `notify-wa-story`) compared byte-for-byte (remote vs. local `n8n/workflow.json`) on `type`/`typeVersion`/`parameters`/`onError`/`retryOnFail`/`maxTries` — **all MATCH**.
- Connections wiring for the same 7 nodes (by display name) also compared — **all MATCH**.
- **Verdict: zero drift.** The Phase 12.3 deploy did not touch the FB Story chain, as expected (session storage and the Meta-publish chain are separate concerns).

## Live-fire execution summary

Two executions are involved:

| Execution | Role | Started (UTC) | Stopped (UTC) | Status |
|---|---|---|---|---|
| `1787600` | Wizard webhook submission → GPT-4o text → Ideogram image → Postgres session INSERT → WhatsApp preview send | 2026-08-01T11:40:41.539Z | 2026-08-01T11:40:55.821Z | success |
| `1787647` | WhatsApp "SI" reply webhook → approval path → Meta publish | 2026-08-01T11:43:38.912Z | 2026-08-01T11:44:50.685Z | **error** (see "Downstream Sheets Log failure" below — occurred AFTER Meta publish, not in the FB/IG Story chain) |

**Brief:** topic "Automatizacion con IA para pymes: 3 procesos que puedes delegar hoy", type `educational`, format `story` (9:16), platforms `["instagram","facebook"]`, image_model `ideogram`, publish_at `now`. Session id `propulsar_1785584455046` / row id `ec23fae3-7bc6-46e2-a8f9-19feb5009a3d`.

### WhatsApp preview delivery (exec `1787600`) — verified via direct YCloud GET, not n8n's "accepted"

| Message | n8n-reported status | YCloud GET status |
|---|---|---|
| Preview image (`6a6ddb4744534a2ab952d8f8`) | accepted | **delivered** |
| Preview text (`6a6ddb4744534a2ab952d8fd`) | accepted | **delivered** |

User replied "SI" a couple of minutes after preview delivery.

## Node-by-node evidence (execution `1787647`, the SI-approval path)

All 24 nodes ran to `✅ Notify WhatsApp Story` inclusive with `ok`/`success` status, in this order:

`📨 Webhook — Reply WA` → `✅ Responder YCloud` → `✅ ¿Aprobado?` → `🔍 Recuperar sesión Supabase` → `🛡️ Assert Session Found` → `🕐 Compute wait_seconds` → `⏰ ¿Programado?` → `🔧 Prep Re-host Input` → `🔁 Re-host Images` → `🔗 Merge Rehost Output` → `🔀 ¿Formato Carrusel?` → `🔀 ¿Formato Story?` → `📤 IG: Create Story Container` → `⏳ IG: Wait 45s Story Container` → `🚀 IG: Story media_publish` → `🔗 IG: Get Story Permalink` → `🔧 IG: Compute Story Expiry` → `🔀 ¿Plataformas FB?` → `🛡️ Assert FB Story URL (no SAS)` → `⬇️ FB: Fetch Image Bytes (Azure)` → `📤 FB: Upload Story Photo Unpublished` → `🌐 FB: Publish Photo Story` → `✅ Notify WhatsApp Story` → then `📊 Google Sheets Log (Story)` **errored** (last node).

**`🏷️ Tag FB Error` did NOT run. `🏷️ Tag IG Error` did NOT run.** No FB/IG Story error path was taken anywhere in this execution.

### Postgres session recovery — first live exercise of the Phase 12.3 rewired read

`🔍 Recuperar sesión Supabase` (native `n8n-nodes-base.postgres` SELECT, per Plan 12.3-02) returned the session row created by exec `1787600` — full row echoed verbatim including `platforms: ["instagram","facebook"]`, `format: "story"`, `story_expires_at: "2026-08-02T11:40:39.656Z"`, both captions, `status: "pending"`.

`🛡️ Assert Session Found` (Plan 12.3-02's new fail-loud guard) passed the row through unchanged (non-empty result — no throw). **This confirms the exact node that failed in the pre-migration outage (exec `1786295`) now works correctly on the real WhatsApp-approval path**, not just the two prior test fires from Phase 12.3-03 that stopped at NO-reply.

### FB Story chain — the 3 target HTTP nodes, real request/response

**1. `⬇️ FB: Fetch Image Bytes (Azure)`** (`GET {{ fb_story_image_url }}`, `responseFormat: file`)
- Request URL (resolved): `https://rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host/files/2026/08/01/30317e16-9a1e-43fb-b3c2-c1d80da54596.png` (Hostinger rehost-service, per Phase 12.2, `fb_story_source: "azure-blob"` label is a legacy name — it is actually Hostinger-backed since Phase 12.2)
- `fb_story_url_stripped: false` (Hostinger URLs never carry SAS params — dormant no-op strip logic confirmed as expected)
- Result: binary bytes fetched successfully (downstream node's `id` response proves the upload succeeded)

**2. `📤 FB: Upload Story Photo Unpublished`** (`POST https://graph.facebook.com/v22.0/{FACEBOOK_PAGE_ID}/photos`, multipart `source=<binary>`, `published=false`)
- Real response body (verbatim):
```json
{
  "id": "122133722601238849"
}
```
- This is the unpublished photo_id passed into the publish step.

**3. `🌐 FB: Publish Photo Story`** (`POST https://graph.facebook.com/v22.0/{FACEBOOK_PAGE_ID}/photo_stories`, JSON body `{photo_id, access_token}`)
- Real response body (verbatim) — **resolves the node's own inline note, which only guessed this shape and had never observed it live:**
```json
{
  "success": true,
  "post_id": "1454521203100646"
}
```
- Confirmed: response shape is exactly `{success: true, post_id: <id>}` as guessed. No `data.post_id`, no wrapper object, no array.

### IG Story chain — evidence (regression check, not this plan's primary target but same execution)

- `📤 IG: Create Story Container` → `{"id": "17889902976666804"}`
- `🚀 IG: Story media_publish` → `{"id": "18111117173094367"}`
- `🔗 IG: Get Story Permalink` → `{"id": "18111117173094367", "media_product_type": "STORY", "permalink": "https://www.instagram.com/stories/propulsar_ai/3954092904642171710", "timestamp": "2026-08-01T11:44:36+0000"}`
- `🔧 IG: Compute Story Expiry` → adds `story_expires_at: "2026-08-02T11:44:36.000Z"` (published timestamp + 24h)
- **No regression** — IG Story branch succeeded identically to its established Phase 12.3-03 pattern.

### WhatsApp success notification (`✅ Notify WhatsApp Story`) — verified via direct YCloud GET

- n8n-reported: `status: "accepted"`, message id `6a6ddc2f11c0b20cf551d493`
- Direct YCloud `GET /v2/whatsapp/messages/6a6ddc2f11c0b20cf551d493` → **`status: "delivered"`**, no error
- Message body (verbatim): `"📲 *Story publicada* (válido 24h)\n\n📸 Instagram: https://www.instagram.com/stories/propulsar_ai/3954092904642171710\n⏳ Expira: dom, 13:44\n\n📝 Tema: Automatizacion con IA para pymes: 3 procesos que puedes delegar hoy"`
- **Known gap, already documented in STATE.md Open Items, reconfirmed here:** the notification text only mentions Instagram — no FB Story reference despite `platforms` including `facebook`. This is Plan 13-02's NOTIF-01 scope, not a new finding.

## Downstream Sheets Log failure (found, NOT fixed — out of this plan's scope)

`📊 Google Sheets Log (Story)` (last node, runs after `✅ Notify WhatsApp Story`) errored:

```
NodeOperationError: Refresh the columns list in the 'Column to Match On' parameter. Missing columns: Error_Msg
```

- This occurred **after** both the FB Story publish (`post_id: 1454521203100646`) and the IG Story publish (`media_id: 18111117173094367`) already succeeded for real. **Nothing published was rolled back or affected** — this is purely a logging-step failure, unrelated to the Meta-facing chain this plan verifies.
- Root cause: the node's cached column schema references an `Error_Msg` column that the live Google Sheet's actual header row does not currently expose to this node — a live external-data mismatch, not a workflow-definition bug (local `n8n/workflow.json` already has `Error_Msg` correctly defined in both the value mapping and schema list for this node).
- **This is directly relevant to Plan 13-02/13-03's own scope** (this phase is literally named "Facebook Story + Log + Notifications" — the Log part). Flagging here rather than fixing, per this plan's explicit "verification-only, DO NOT edit FB Story chain nodes" scope and the coordinator's "no improvised fixes" instruction — though note this failure is not IN the FB Story chain, it is a separate downstream node that Plan 13-02/13-03 will already be touching.
- This top-level execution `error` status is entirely attributable to this Sheets Log failure — every node up to and including the real Meta publishes succeeded.

## FBSTORY-01 Verdict

**PASS.** The FB Story 2-step chain (Upload Story Photo Unpublished → Publish Photo Story) fired for real against the Phase 12.2 Hostinger-backed re-host contract and succeeded with a genuine Meta API response (`{success: true, post_id: "1454521203100646"}`). No error path (`🏷️ Tag FB Error`) was taken. The IG Story branch in the same execution also succeeded with no regression. Real evidence — not code review — confirms this chain works end-to-end today.

## Task 4: Human visual confirmation — PASSED

**User confirmed (2026-08-01):** the Story IS visible on the real Facebook Page (Propulsar.ai) as a proper Story (vertical, Stories tray) — NOT a feed post — matching the approved image. **ROADMAP Success Criteria #2 satisfied with real human-observed evidence.**

## Cleanup — test Story deletion attempts

Per this project's standing rule (delete Meta test content after E2E tests) and explicit user request, both test Stories were attempted to be deleted via the Graph API immediately after the Task 4 confirmation, since both were published to the real production Propulsar.ai accounts.

### FB Story — API deletion FAILED (both ids tried)

**Attempt 1: `DELETE /v22.0/1454521203100646`** (the `post_id` returned by `fb-publish-photo-story`)
```json
{"error":{"message":"Unsupported delete request. Object with ID '1454521203100646' does not exist, cannot be loaded due to missing permissions, or does not support this operation. Please read the Graph API documentation at https://developers.facebook.com/docs/graph-api","type":"GraphMethodException","code":100,"error_subcode":33,"fbtrace_id":"AFSYL7LghABGOP3_IHkUO-5"}}
```

**Attempt 2: `DELETE /v22.0/122133722601238849`** (the underlying `photo_id` from `fb-upload-story-photo`)
```json
{"success":false}
```

**Verification (GET both ids, after both DELETE attempts):**
- `GET /v22.0/1454521203100646` → `{"post_id":"1454521203100646","status":"published","creation_time":"1785584684","media_type":"photo","url":"https://facebook.com/stories/122094720729238849/UzpfSVNDOjE0NTQ1MjEyMTMxMDA2NDU=/?view_single=1","media_id":"122133722601238849"}` — **still `status: "published"`, DELETE had no effect.**
- `GET /v22.0/122133722601238849` → `{"created_time":"2026-08-01T11:44:41+0000","id":"122133722601238849"}` — **still exists.**

**Conclusion:** the Graph API does not support deleting an active (unexpired) FB Photo Story via either its `post_id` or underlying `photo_id`. This is consistent with the Plan 12-02 decision already recorded in STATE.md ("FB Story cleanup: Stories auto-expire via 24h lifecycle; Graph API DELETE on an *expired* Story returns code 100/subcode 33") — this test shows the same code 100/subcode 33 error also occurs on an **unexpired** Story, i.e. FB Photo Stories are not API-deletable at any point in their lifecycle with this token/permission set, only auto-expire.

### IG Story — API deletion FAILED (both id forms tried, expected)

**Attempt 1: `DELETE /v22.0/3954092904642171710`** (the permalink's numeric story id)
```json
{"error":{"message":"Unsupported delete request. Object with ID '3954092904642171710' does not exist, cannot be loaded due to missing permissions, or does not support this operation. Please read the Graph API documentation at https://developers.facebook.com/docs/graph-api","type":"GraphMethodException","code":100,"error_subcode":33,"fbtrace_id":"Ash4LyxULaZh4zYMb_nN85q"}}
```

**Attempt 2: `DELETE /v22.0/18111117173094367`** (the real IG `media_id` returned by `IG: Story media_publish`)
```json
{"error":{"message":"(#10) Insufficient permissions to access this data","code":10,"type":"OAuthException","fbtrace_id":"AKMxLZ4s-sgd80eT_vUsxI1"}}
```

**Verification (GET, after both DELETE attempts):**
- `GET /v22.0/18111117173094367?fields=id,media_product_type,permalink,timestamp` → `{"id":"18111117173094367","media_product_type":"STORY","permalink":"https://www.instagram.com/stories/propulsar_ai/3954092904642171710","timestamp":"2026-08-01T11:44:36+0000"}` — **still live.**

**Conclusion:** as expected, the IG Graph API does not support DELETE on Story media at all (not a permissions gap that can be fixed by adding a scope — `media_id` DELETE returns a straight `OAuthException`/insufficient-permissions on IG's platform-level restriction for Stories, and `code 100` on the permalink numeric id since it isn't a valid Graph object id form).

### Manual action required (user, not automatable)

Neither test Story could be deleted via API. **Both will remain live until manually deleted or auto-expiry (~24h from publish, i.e. ~2026-08-02T11:44Z):**

1. **FB Story** (Propulsar.ai Page, published `2026-08-01T11:44:41Z`) — delete manually: open the Facebook app → Page → Stories → tap the Story → menu (•••) → Delete. Or leave it; it auto-expires ~2026-08-02T11:44Z.
2. **IG Story** (`@propulsar_ai`, permalink `https://www.instagram.com/stories/propulsar_ai/3954092904642171710`) — delete manually: open the Instagram app → tap the Story → menu (•••) → Delete. Or leave it; it auto-expires ~2026-08-02T11:44Z (same ~24h window).

No further API-based cleanup is possible for either platform.
