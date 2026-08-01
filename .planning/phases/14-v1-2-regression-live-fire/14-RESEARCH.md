# Phase 14: v1.2 Regression Live-Fire - Research

**Researched:** 2026-08-01
**Domain:** Codebase/history archaeology (n8n workflow live-fire regression testing) — NOT external web research
**Confidence:** HIGH (all findings sourced from this repo's own prior phases + a live n8n API GET performed during this research)

## Summary

This phase requires no new technology — it reuses tooling, patterns, and hard-won lessons from Phases 12.3 and 13, executed just hours before this research. The two live-fires (single + carousel) exercise the same shared code paths already proven for the Story format: Postgres session persistence (INSERT via `n8n-nodes-base.postgres`, recovery via SELECT + guard node), WhatsApp SI approval with the 24h-window trap, and Meta Graph API publishing. The one net-new piece of investigative work — locating and understanding the hashtag-comment `onError` bug — is now fully diagnosed below with exact node ids and connection-graph JSON, ready for the planner to specify as a two-line connection-object patch.

A live GET against the production workflow during this research confirms **zero drift since Phase 13's close**: `versionId 83aa7f3c-a229-46a7-9920-db9db5696e65`, `active: true`, `92` nodes — matching STATE.md exactly. The planner can treat this as the pre-flight baseline, but per the established "re-verification-before-fire" pattern, whoever executes the plan must re-GET and re-diff in their own session before firing (never trust a baseline from a different session).

**Primary recommendation:** Follow the exact same operational playbook Phases 12.3-03 and 13-01/13-03 already validated three times over — pre-flight GET/diff → patch-based deploy for the hashtag-comment fix (2-node connection retarget, not a full-file PUT) → drive `wizard/run.js` interactively (scratchpad expect-style driver, not `scripts/test-webhook.js`, which bypasses PASO 1 trending-topics) → verify via direct Postgres query (reusing today's already-open firewall rule) + direct YCloud GET (never trust n8n's `accepted` status) + Sheets API read via a disposable n8n harness workflow (no local Google credential exists) → capture evidence → delete via Graph API → close.

## User Constraints

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test content**
- Both posts are test content, deleted after verification — not kept as real Propulsar content.
- Topic comes from the normal Wizard flow (Perplexity trending + angle selection) — exercises the full pipeline end-to-end like a real run.
- Claude decides the post type (educational/authority/case study) based on whatever topic fits at execution time.
- WhatsApp 24h window checkpoint before each fire: the plan must include an explicit pre-fire step where the user messages the business number (+34 602 069 187) from the approval number to open the customer-service window. Never trust `accepted` — verify delivery via YCloud GET (established v1.2 lesson).

**FB feed branch (known-broken, in-phase fix)**
- Reroute the hashtag-comment node's `onError` from halt to skip so the FB feed branch executes despite the missing `instagram_manage_comments` scope. FB feed publishing comes back WITHOUT waiting for Susana's token.
- Hashtag comments themselves keep failing (documented, expected) until Susana regenerates the token — that part stays as-is.
- This fix follows the established deploy discipline: diff remote vs last-known-good before PUT, patch-based deploy touching only the intended nodes.

**Cleanup**
- FB posts (single + carousel): delete via Graph API immediately after full verification (programmatic + user visual confirmation) in the same session.
- IG posts: attempt API deletion first (result is useful evidence either way); if it fails as expected (IG business media historically not API-deletable), user deletes manually in-app — end-of-phase checkpoint reminds them with permalinks at hand.
- Capture evidence BEFORE any deletion: IG/FB media IDs, permalinks, raw publish-node responses, and the Sheets log row — all into the phase verification doc.
- Google Sheets log rows from the test runs stay — they're real regression evidence; Estado/Error_Msg reflect what happened.

**Image model & cost**
- Single post: accept the Wizard's model suggestion (exercises suggestion logic like a real run).
- Carousel: accept the Wizard's suggested slide count (typical 5-7, ~$0.30-0.42 at $0.06/slide).
- Re-fire policy: fix + re-fire directly on real bugs, per phases 12.x/13 discipline (patch-based deploys). No per-re-fire consultation.
- Image budget: ~$1.50 for the whole phase including re-fires — only escalate to the user if exceeded.

**Verification depth**
- Programmatic + visual per fire: Postgres `content_sessions` row queried directly; Sheets log row read via API with exact column check (Formato correct — never visual-only column verification, per 13-03 lesson); WhatsApp message status via direct YCloud GET; n8n node outputs inspected. Plus user visual confirmation of the live posts on IG/FB.
- NO-rejection path NOT re-tested — already live-verified on Story in Phase 12.3 (exec 1787219), shared code.
- Both fires publish "ahora" — scheduling path untouched by the Postgres migration, out of regression scope.

### Claude's Discretion
- Post type choice per test (educational/authority/case study)
- Exact verification query/script shapes
- Order of the two fires (suggest single first — cheaper smoke of shared path before the multi-slide run)

### Deferred Ideas (OUT OF SCOPE)
- `instagram_manage_comments` scope + working hashtag comments — still blocked on Susana's token regeneration (tracked in PROJECT.md, independent of any milestone).
- None new — discussion stayed within phase scope.
</user_constraints>

## Current Live State (verified during this research)

A live `GET /api/v1/workflows/Qql7mvYRxKBsPZ5t` was performed as part of this research (2026-08-01, same day as Phase 13's close):

| Field | Value |
|---|---|
| `versionId` | `83aa7f3c-a229-46a7-9920-db9db5696e65` |
| `active` | `true` |
| Node count | `92` |
| `updatedAt` | `2026-08-01T12:12:29.470Z` |

This **exactly matches** STATE.md's last recorded value (Phase 13-03's deploy) — zero drift between Phase 13's close and this research. The plan can cite this as a known-good starting point, but the executing session must still re-GET and re-diff before firing anything, per the locked "re-verification-before-fire" pattern (a deploy could land between planning and execution).

**Base URL:** `https://n8n-azure.propulsar.ai`
**Workflow ID:** `Qql7mvYRxKBsPZ5t` ("Propulsar — Content Engine v3")
**n8n API key:** local `.env`'s `N8N_API_KEY` was expired as of Phase 13-01; the working replacement lives in Key Vault:
```bash
az keyvault secret show --vault-name propulsar-prod-kv --name n8n-api-key --query value -o tsv
```

## The In-Phase Fix: Hashtag-Comment `onError` Short-Circuit

### Root cause (fully diagnosed)

Both hashtag-comment nodes already have `onError: "continueErrorOutput"` and `retryOnFail: true` — the node's own inline `notes` field even claims *"onError=continueErrorOutput so publish chain continues"*. **This claim is false as currently wired.** The bug is in the `connections` object, not the node's own config: the node's error output (`main[1]`) is wired to the shared error-notification subgraph, which is a genuine dead end for this workflow run — it never rejoins the main chain.

**Node ids (both `n8n-nodes-base.httpRequest`, typeVersion 4.2):**
- `ig-post-hashtag-comment` — display name `💬 IG: Post Hashtag Comment` (single-post chain)
- `ig-post-carousel-hashtag-comment` — display name `💬 IG: Post Carousel Hashtag Comment` (carousel chain)

**Current wiring (confirmed via live parse of `n8n/workflow.json`):**

```json
"💬 IG: Post Hashtag Comment": {
  "main": [
    [{ "node": "🔗 IG: Get Permalink", "type": "main", "index": 0 }],   // success output
    [{ "node": "🏷️ Tag IG Error",     "type": "main", "index": 0 }]    // error output — DEAD END for FB
  ]
}
"💬 IG: Post Carousel Hashtag Comment": {
  "main": [
    [{ "node": "🔗 IG: Get Carousel Permalink", "type": "main", "index": 0 }],
    [{ "node": "🏷️ Tag IG Error",              "type": "main", "index": 0 }]
  ]
}
```

**Why this is a dead end for the FB feed branch:** `🏷️ Tag IG Error` → `🚨 Parse Meta Error` → `⚠️ ¿Token Expirado?` → branches to `📤 WA: Token Expirado` or `📤 WA: Error Publicación` → both terminate at `📊 Sheets Fail Log`. This is the **shared error-notification subgraph** (same 9-node pattern used by every other Meta-facing node's `onError`) — it sends a WhatsApp failure alert and writes a failed row to Sheets, then the execution ends. It is a correct, working subgraph for *real* failures — but the hashtag-comment failure is not a real failure (the post already published successfully), so routing it here permanently prevents the FB feed branch from ever running.

**Downstream FB feed branch (only reachable from the success output today):**
- Single: `🔗 IG: Get Permalink` (success, `main[0]`) → `🌐 FB: Publish Photo`
- Carousel: `🔗 IG: Get Carousel Permalink` (success, `main[0]`) → `🖼️ FB: Explode Carousel Slides`

Since `instagram_manage_comments` is missing, `ig-post-hashtag-comment`/`ig-post-carousel-hashtag-comment` always fail (documented error codes: **code 10** for single, exec 10786; **code 100** for carousel, exec 10959 — per STATE.md Open Items), always take the error output, and the FB feed branch is never reached. This is confirmed pre-existing since 2026-04-17 (exec 147), NOT a Phase 12/13 regression, and NOT touched by the Postgres migration — but it does block this phase's own "publishes to both IG and FB" success criteria, which is why it's in scope as a required in-phase fix.

### The fix

Retarget each node's error output (`main[1]`) to the **same destination as its success output** (`main[0]`), bypassing `🏷️ Tag IG Error` entirely for this specific node. This makes the hashtag-comment step genuinely non-blocking, matching what its own inline note already (incorrectly) claims:

```json
"💬 IG: Post Hashtag Comment": {
  "main": [
    [{ "node": "🔗 IG: Get Permalink", "type": "main", "index": 0 }],
    [{ "node": "🔗 IG: Get Permalink", "type": "main", "index": 0 }]   // was: 🏷️ Tag IG Error
  ]
}
"💬 IG: Post Carousel Hashtag Comment": {
  "main": [
    [{ "node": "🔗 IG: Get Carousel Permalink", "type": "main", "index": 0 }],
    [{ "node": "🔗 IG: Get Carousel Permalink", "type": "main", "index": 0 }]   // was: 🏷️ Tag IG Error
  ]
}
```

This is a **connections-object-only edit** — the node bodies themselves (`parameters`, `onError`, `retryOnFail`) do not need to change. Two edges retargeted, zero nodes added/removed, node count stays at 92. This is exactly the kind of surgical, additive-only edit the project's established patch-based-deploy discipline expects (see 12.2-02-DEPLOY.md, 13-02-SUMMARY.md precedent).

**What is explicitly NOT in scope for this fix (per CONTEXT.md):**
- Making hashtag comments actually succeed (blocked on Susana's token — deferred).
- Touching `🏷️ Tag IG Error`, `🚨 Parse Meta Error`, or any other node in the shared error subgraph — it must keep working correctly for genuine failures elsewhere.
- Any change to `retryOnFail`/`maxTries`/`waitBetweenTries` on the hashtag-comment nodes themselves.

**Verification implication:** after this fix, a live single/carousel fire (with FB in platforms) should show the hashtag-comment node itself still erroring (its own execution status will show `error` — expected, document it), but the execution should continue past it into `Get Permalink` → `FB: Publish Photo`/`FB: Explode Carousel Slides` and complete successfully, unlike every prior single/carousel execution since 2026-04-17.

## Deploy Discipline (established pattern, 3x proven)

Every prior live-fire phase (12.2-02, 12.2-03, 12.3-03, 13-01, 13-03) follows the same sequence, and this phase should too:

1. **Pre-flight GET** the live workflow, capture `versionId`/`active`/node count.
2. **Diff remote vs. local `n8n/workflow.json`** by node id — compare `parameters`, `connections`, `settings`. Historically, benign diffs have shown up as auto-generated `webhookId` fields on Wait nodes (n8n assigns these server-side) — safe to ignore. Real, unexpected diffs (e.g., the AOAI node migration found in 12.2-02) must be preserved, not silently overwritten.
3. **Choose PUT strategy based on diff result:**
   - Zero real drift → direct full-file PUT is safe (13-03's approach).
   - Real unrelated drift found → patch-based PUT, touching only the intended nodes, built by fetching remote as the base and replacing only the target node(s)/connections (12.2-02's approach). **Given this phase's fix is a 2-edge connections-only change, patch-based deploy is almost certainly the right call regardless of drift** — no reason to risk a full-file PUT reintroducing something.
4. **`settings` payload for PUT must be trimmed to 3 keys**: `executionOrder`, `saveManualExecutions`, `callerPolicy`. GET returns 2 extra keys (`availableInMCP`, `binaryMode`) that PUT rejects with a 400 ("additional properties"). This bit Phase 12.3-03 on first attempt.
5. **Post-deploy spot checks**: re-GET, confirm new `versionId`, `active: true` preserved, node count unchanged (92), and byte-identical checks on every node NOT intentionally touched (especially the 4 AOAI nodes, the 5 Postgres session nodes, and the FB/IG Story chain — these have been the "regression canary set" in every prior deploy's evidence doc).
6. **Archive the deploy artifact** as `.planning/phases/14-.../14-0X-DEPLOY.md`, documenting pre/post versionId, drift findings, PUT method chosen, and spot-check results — matches the pattern of `12.3-03-DEPLOY.md`/`13-03-DEPLOY.md`.

## Driving the Wizard (do NOT use `scripts/test-webhook.js` alone)

`scripts/test-webhook.js` exists but **bypasses PASO 1** (trending topics) by POSTing a static brief object directly to the webhook — it does not drive the interactive CLI. CONTEXT.md's locked decision requires the **normal Wizard flow** (`node wizard/run.js`, Perplexity trending + angle selection) to exercise the pipeline end-to-end like a real run. This means:

- Run `node wizard/run.js` and step through its interactive `readline` prompts for real.
- Since a human isn't typing interactively in this session, drive it the way Phases 12.3-03/13-01/13-03 did: **an expect-style driver script** that answers each `readline` prompt programmatically (built fresh each time in the session scratchpad — it has never been committed to the repo, and STATE.md notes it should be "re-verified against the live `wizard/run.js` prompt patterns" before trusting it, since prompt wording can drift).
- The prompt sequence to automate (confirmed from `wizard/run.js` lines 370-590):
  1. **PASO 1 — Tema**: `1` (buscar trending topics via Perplexity) → pick a number from the list, or `0` + type a topic.
  2. **PASO 2 — Tipo**: `1`/`2`/`3` (educational/authority/case_study) — Claude's discretion per CONTEXT.md.
  3. **PASO 2.5 — Ángulos**: pick `1`-`3` (AI-suggested) or `0` (no angle).
  4. **PASO 3 — Formato**: `2` for Post Individual (single), `3` for Carrusel. (`1` is Historia/Story — NOT this phase's scope.)
     - If Carrusel: next prompt asks slide count — press Enter to accept the Wizard's own suggestion (typical 5-7, per CONTEXT.md's locked decision to accept the suggestion, not override it).
  5. **PASO 4 — Plataformas**: `1` (Instagram + Facebook — both required per this phase's success criteria).
  6. **PASO 5 — Imagen**:
     - Carousel: no prompt — Ideogram v3 is hardcoded (`imageModel = "ideogram"`), non-interactive.
     - Single: asks "¿tiene texto/datos visibles?" (s/n) → answer per the topic's actual content, then shows the model table and a `[Enter] Usar recomendación` option — press Enter to accept the Wizard's suggestion (locked decision).
  7. **PASO 6 — Hora de publicación**: choose "ahora" (immediate) — both fires publish now, no scheduling.
  8. Wizard POSTs the brief to `WEBHOOK_URL`, then a WhatsApp preview arrives on `WHATSAPP_APPROVAL_NUMBER`.
- **Before running the Wizard for each fire**, the WhatsApp 24h-window checkpoint (locked decision) must happen first: user messages `+34 602 069 187` from the approval number to (re)open the customer-service window — see the 24h-window pitfall below.

## Postgres Verification (direct query pattern, already proven)

**No committed query script exists** — Phase 12.3-01 used a one-off Node.js script (via the project's own `pg` npm dependency... actually `pg` is not in `package.json`'s `dependencies` today, only `dotenv` is listed; Phase 12.3-01 pulled `pg` from `node_modules` where it was already present as a transitive dependency, or installed it ad hoc — **verify `pg` is available before relying on it**, or `npm install pg --no-save` for a throwaway query script). The scratch script lived outside the repo (session scratchpad only) — no artifact was committed, which is correct: this is a one-off verification tool, not part of the shipped pipeline.

**Firewall access — likely already open for this session.** A live check during this research shows an existing rule `claude-session-20260801` covering IP `185.73.168.36`, which **exactly matches the current session's public IP** (confirmed via `curl ifconfig.me`). If the executing session runs from the same network, **no new temporary firewall rule is needed** — just confirm the rule still exists (`az postgres flexible-server firewall-rule list -g propulsar-production --name propulsar-db -o table`) before attempting a connection, and only create+delete a new `temp-*`-named rule if the IP has changed.

**Connection details:**
- Server: `propulsar-db.postgres.database.azure.com`
- Database: `content_engine`
- User: `propulsaradmin`
- Password: `az keyvault secret show --vault-name propulsar-prod-kv --name db-postgresdb-password --query value -o tsv`
- SSL: `require`, with `rejectUnauthorized: false` (mirrors n8n's own `DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false` for this server)

**Recovery-shaped SELECT (exact query the `retrieve-session` node itself runs — reuse this for verification):**
```sql
SELECT * FROM content_sessions
WHERE approval_number = $1 AND status = $2
ORDER BY created_at DESC LIMIT 1;
```

**Schema (20 columns, `content_sessions` table):** `id`, `session_id`, `topic`, `type`, `angle`, `platforms` (TEXT[]), `image_model`, `image_url`, `final_image_url`, `image_urls` (TEXT[]), `format`, `aspect_ratio`, `story_expires_at`, `instagram_caption`, `facebook_caption`, `approval_number`, `status`, `publish_at`, `created_at`, `updated_at`.

**Relevant node ids for this phase (already Postgres-native since Phase 12.3-02, unchanged by this phase):**
- `save-session-supabase` (display name still literally says "Supabase" — cosmetic rename explicitly deferred, per Phase 12.3-02 decision) — single-post INSERT, `retryOnFail` unset.
- `save-session-carousel` — carousel INSERT, `retryOnFail: true`.
- `retrieve-session` / `assert-session-found` — shared recovery SELECT + fail-loud guard, used by both formats on the SI-approval path.

**What this phase's live-fires prove that Phase 12.3/13 didn't:** Phase 12.3's live-fires only exercised the Story INSERT/recovery variant. This phase closes the loop specifically on `save-session-supabase` (single) and `save-session-carousel` (carousel + its multi-slide fan-out), the two Postgres session variants never yet live-fired since the Supabase→Azure migration.

## WhatsApp / YCloud Verification (established pattern — critical pitfall)

**Never trust n8n's `accepted` status as delivery proof.** This was the single most costly lesson of Phase 12.3-03: the WA send node reports `status: "accepted"` synchronously and successfully even when the message silently fails. The real status only appears via a direct follow-up GET:

```
GET https://api.ycloud.com/v2/whatsapp/messages/{message_id}
Header: X-API-Key: <YCLOUD_API_KEY>
```//
Look for `status: "delivered"` or `status: "read"` — NOT `status: "failed"`. If failed, check `errorCode` (specifically `131047` — see pitfall below).

**No committed script for this either** — prior phases performed this GET ad hoc (curl or a scratch script) during the session, not via a reusable tool in `scripts/`/`tools/`. The plan should account for building/reusing a small one-off script or curl invocation per fire.

## Google Sheets Verification (must be via n8n harness — no local credential exists)

**No local Google Sheets API credential exists in this project** — `.env`/`.env.example` only holds `GOOGLE_SHEETS_ID`; the actual OAuth2 credential lives inside n8n (`XjKteoOTobs1qR55`, "Google Sheets account"). This means **Claude cannot read the Sheet directly from a local script** — the only proven method (established in 13-03) is a **disposable n8n harness workflow**:

1. Build a throwaway workflow: `Webhook → Google Sheets (read)`, targeting the same `documentId`/`sheetName: "Log"` and reusing credential `XjKteoOTobs1qR55`.
2. Deploy it via `POST /api/v1/workflows`, activate, trigger via its webhook, read the response, then **delete the harness workflow** (`DELETE /api/v1/workflows/{id}`) and confirm 404 on a follow-up GET.
3. For raw/low-level operations (single-cell reads, exact header-text checks) the harness can use an `HTTP Request` node with `authentication: predefinedCredentialType` / `nodeCredentialType: googleSheetsOAuth2Api` instead of the `Google Sheets` node, when the node's own operation set doesn't expose what's needed (13-03 needed this for a single-cell PUT and a `batchUpdate`/`deleteDimension`).

**Exact-match column check is mandatory, not visual.** The 13-03 lesson: a human's visual "looks right" confirmation missed a single-character header typo (`Error_Msj` vs `Error_Msg`) that broke n8n's schema-change guard on every append. For this phase, the check that matters is **`Formato` = exactly `"single"` or `"carousel"`** (not `"story"` or blank) — verify this programmatically via the harness read, not by eyeballing the Sheet.

**Expected schema for single/carousel rows (14 columns per the n8n node's own schema, `log-sheets`/`log-sheets-carousel`/`sheets-fail-log` — all three currently identical):**
`Fecha`, `Tema`, `Tipo`, `Angulo`, `Plataformas`, `Modelo_Imagen`, `Imagen_URL`, `Estado`, `IG_URL`, `FB_URL`, `Publicado_En`, `Publish_Status`, `Error_Msg`, `Formato`.

(Note: the live Sheet header itself has 15 columns because it also carries `Expires_At`, added for the Story format in Phase 13 — single/carousel rows will simply leave that cell blank, which is fine and expected.)

## Cleanup: Graph API Deletion (established pattern, single/carousel FEED posts — NOT Stories)

This phase's test artifacts are **feed posts** (single photo + carousel), which behave differently from Phase 12/13's Story artifacts:

- **FB feed posts ARE API-deletable** (unlike FB Photo Stories, which are never deletable via Graph API at any lifecycle point — confirmed exhaustively across Phases 12/13). Per project memory (`feedback_delete_test_posts.md`), always delete FB feed test posts via Graph API immediately after verification:
  ```bash
  curl -sS -X DELETE "https://graph.facebook.com/v22.0/{post_id}?access_token=${META_PAGE_TOKEN}"
  ```
  Expect `{"success": true}`.

- **IG feed posts: attempt API deletion, expect it to fail.** Per project memory, IG business media has historically not been API-deletable (this was proven definitively for IG *Stories* in Phase 13; for IG *feed* posts it has not been tested this cycle, so the attempt is genuinely informative, not just ritual — CONTEXT.md correctly frames this as "the result is useful evidence either way"):
  ```bash
  curl -sS -X DELETE "https://graph.facebook.com/v22.0/{media_id}?access_token=${META_PAGE_TOKEN}"
  ```
  If this returns `{"success": false}` or an `error.code: 10`/permissions-style error, fall back to user manual in-app deletion — surface the permalink(s) in the end-of-phase checkpoint so the user doesn't have to hunt for them.

- **Capture evidence before any deletion** — media IDs, permalinks, raw publish-node responses (from the n8n execution JSON, via `GET /api/v1/executions/{id}?includeData=true`), and the Sheets log row, all written into the phase's VERIFICATION/evidence doc, per the locked decision.

## Common Pitfalls (all previously hit in this exact codebase — avoid repeating)

### Pitfall 1: WhatsApp 24h customer-service window
**What goes wrong:** The WA preview send is a free-form message (not an approved template). If the approver hasn't messaged the business number (`+34 602 069 187`) within the prior 24h, YCloud/Meta silently reject the send with `errorCode 131047`.
**Why it happens:** WhatsApp Business API policy — free-form messages require an open "customer service window," opened only by an inbound message from the customer (here, the approver acting as the "customer").
**How to avoid:** Explicit pre-fire checkpoint (already locked in CONTEXT.md) — user messages the business number from the approval number before each fire, confirmed before proceeding.
**Warning signs:** n8n reports `status: "accepted"` (this is NOT a warning sign by itself — it always says this) — the only real signal is a direct YCloud GET showing `status: "failed"` with `errorCode: 131047`.

### Pitfall 2: n8n PUT schema stricter than GET response
**What goes wrong:** PUTting the exact `settings` object returned by GET fails with a 400 ("additional properties").
**Why it happens:** GET returns `{executionOrder, saveManualExecutions, callerPolicy, availableInMCP, binaryMode}`; PUT's schema only accepts the first 3.
**How to avoid:** Always trim `settings` to `{executionOrder, saveManualExecutions, callerPolicy}` before any PUT to this workflow.

### Pitfall 3: Trusting a stale pre-flight baseline
**What goes wrong:** Firing a live test against a workflow version not re-checked in the current session, when a deploy landed in between (happened for real between Phase 12.3-03's original pre-flight and its resumed session).
**Why it happens:** Sessions get interrupted/resumed; deploys can land from other work in the meantime.
**How to avoid:** Established pattern (locked v1.2 decision): always re-GET and re-diff the target nodes/connections against the current live `versionId` before firing, in the same session as the fire — never trust a baseline recorded in a previous session or by this research.

### Pitfall 4: Visual-only Sheets column verification
**What goes wrong:** A human "looks right" check on a live Sheet header missed a single-character typo that broke every append.
**Why it happens:** Typos in near-identical column names (`Error_Msj` vs `Error_Msg`) are easy to miss visually, but n8n's Google Sheets node does exact string matching for its schema-change guard.
**How to avoid:** Always verify exact column text programmatically (via a disposable harness read), never by trusting a human's visual scan — explicitly called out as a locked decision in this phase's CONTEXT.md.

### Pitfall 5: `scripts/test-webhook.js` skips the real Wizard flow
**What goes wrong:** Using this script alone would satisfy "fires the webhook" but not "exercises PASO 1 trending topics + real interactive flow," which CONTEXT.md explicitly requires.
**How to avoid:** Drive `wizard/run.js` itself via a session-scratchpad expect-style driver script (re-verify its prompt-matching against the live file first — prompt wording can drift between phases, as it did for Phase 10's Story additions).

### Pitfall 6: Assuming the hashtag-comment node's own inline note is accurate
**What goes wrong:** The node's `notes` field says "onError=continueErrorOutput so publish chain continues" — this is misleading; the actual `connections` wiring routes the error output to a dead end. Trusting the note without checking the connections graph would miss the actual bug.
**How to avoid:** Always verify claims against the live `connections` object, not a node's own inline documentation — this project's history has at least 2 other examples of documentation/reality drift (e.g., `fb-publish-photo-story`'s response-shape note said "esperado" i.e. "expected, never observed" until Phase 13-01 proved it for real).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Reading a private Google Sheet without a local credential | A new Google service-account setup | Disposable n8n harness workflow reusing n8n's existing OAuth2 credential (`XjKteoOTobs1qR55`) | Zero new credentials/scopes to provision; proven pattern from Phase 13-03; avoids a whole new auth surface for a one-off verification |
| Confirming a live n8n workflow's actual state | Trusting `n8n/workflow.json` in the repo | `GET /api/v1/workflows/{id}` against the live instance, diffed against repo | Repo has drifted from production before (the AOAI node migration, found in Phase 12.2-02) — the live GET is the only source of truth |
| Executing a workflow in isolation for testing | Assuming a direct-execute API exists | It doesn't (`POST /api/v1/workflows/{id}/run` → 405, confirmed in 12.2-03) — use the real webhook trigger via the Wizard, or a harness `Webhook → Execute Workflow` wrapper for sub-workflows | Established, confirmed limitation of this n8n version's public API |

**Key insight:** Every piece of infrastructure this phase needs to touch (Postgres, YCloud, Sheets, n8n itself) has already had its access pattern solved and documented in a prior phase within the last 24 hours of project time — this phase is pure reuse plus one small, fully-diagnosed connection-graph fix.

## Code Examples

### Postgres recovery-shaped SELECT (verified query shape, matches `retrieve-session` node exactly)
```sql
-- Source: 12.3-01-INFRA.md, proven against real data multiple times
SELECT * FROM content_sessions
WHERE approval_number = $1 AND status = $2
ORDER BY created_at DESC LIMIT 1;
```

### YCloud delivery-status GET (never trust n8n's synchronous response)
```bash
# Source: 12.3-03-DEPLOY.md pattern, repeated in 13-03-DEPLOY.md
curl -sS "https://api.ycloud.com/v2/whatsapp/messages/${MESSAGE_ID}" \
  -H "X-API-Key: ${YCLOUD_API_KEY}"
# Look for "status": "delivered" or "read" — NOT "accepted" (n8n-reported) or "failed"
```

### Graph API deletion — FB feed post (works) vs IG feed post (attempt, expect possible failure)
```bash
# Source: 12-02-PLAN.md Task 6 pattern (Story-era, same DELETE verb applies to feed posts)
curl -sS -X DELETE "https://graph.facebook.com/v22.0/${FB_POST_ID}?access_token=${META_PAGE_TOKEN}"
curl -sS -X DELETE "https://graph.facebook.com/v22.0/${IG_MEDIA_ID}?access_token=${META_PAGE_TOKEN}"
```

### n8n execution evidence pull (real request/response bodies, not assumed)
```bash
# Source: 13-01-PLAN.md Task 3 pattern
curl -sS "https://n8n-azure.propulsar.ai/api/v1/executions?workflowId=Qql7mvYRxKBsPZ5t&limit=5" \
  -H "X-N8N-API-KEY: ${N8N_KEY}"
curl -sS "https://n8n-azure.propulsar.ai/api/v1/executions/${EXEC_ID}?includeData=true" \
  -H "X-N8N-API-KEY: ${N8N_KEY}"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Session persistence via Supabase (PostgREST) | Native `n8n-nodes-base.postgres` nodes against Azure PostgreSQL Flexible Server | Phase 12.3 (2026-08-01, same day) | This phase's entire purpose — confirm this migration didn't break single/carousel, the two formats not yet live-fired since |
| Hashtag-comment failure halting the whole execution | (this phase) Hashtag-comment failure skips forward, FB feed branch runs regardless | This phase (in progress) | Unblocks "publishes to both IG and FB" as a satisfiable success criterion without waiting on Susana's token |

No deprecated/outdated tooling relevant to this phase — everything here is current-session infrastructure.

## Open Questions

1. **Is `pg` (npm package) actually available for a local Postgres query script, or was Phase 12.3-01's usage a one-off install?**
   - What we know: Phase 12.3-01 used "the project's own `pg` npm package (already present in `node_modules`...)" but `package.json`'s `dependencies` only lists `dotenv`. It may have been a transitive dependency of something else, or ad hoc.
   - What's unclear: whether `node_modules/pg` still exists today, or needs a throwaway `npm install pg --no-save`.
   - Recommendation: the plan should check for `pg`'s availability as a first step of any Postgres-verification task, and fall back to `npm install pg --no-save` (not committed to `package.json`, consistent with this being a one-off verification tool, not shipped pipeline code) if missing.

2. **Will the single post's Wizard-suggested image model land on Flux, Ideogram, or Nano Banana?**
   - What we know: `suggestModel(type, hasTextInImage)` picks based on post type + whether the topic needs visible text/stats — this is topic-dependent and can't be predicted before PASO 1's trending-topic pick.
   - What's unclear: the exact model, and thus exact cost, until the topic is chosen at execution time.
   - Recommendation: budget conservatively within the locked ~$1.50 total (Nano Banana at $0.15 is the worst case for the single post; carousel is bounded at ~$0.30-0.42 for 5-7 Ideogram slides) — no action needed beyond what CONTEXT.md already locked.

## Sources

### Primary (HIGH confidence — direct file reads + live API calls performed during this research)
- `n8n/workflow.json` (local repo) — parsed directly for hashtag-comment node bodies, connections graph, save-session node ids, Sheets log node schemas.
- Live `GET https://n8n-azure.propulsar.ai/api/v1/workflows/Qql7mvYRxKBsPZ5t` — performed during this research, confirms zero drift since Phase 13's close (`versionId 83aa7f3c`, `active: true`, 92 nodes).
- `az postgres flexible-server firewall-rule list` — confirmed live, showing `claude-session-20260801` rule matching this session's current IP.
- `.planning/phases/12.3-supabase-to-azure-postgres-migration/12.3-01-INFRA.md`, `12.3-VERIFICATION.md`
- `.planning/phases/13-facebook-story-log-notifications/13-01-PLAN.md`, `13-03-DEPLOY.md`, `13-VERIFICATION.md`
- `.planning/STATE.md` — full read, all "v1.2 Decisions Locked" and "Open Items" sections
- `.planning/phases/12-ig-story-publishing/12-02-PLAN.md` — Graph API deletion pattern for feed-era predecessor
- `wizard/run.js` (lines 370-590) — PASO 1-6 prompt sequence
- `scripts/test-webhook.js`, `.env.example`, `package.json`

### Secondary (MEDIUM confidence)
- None — this research relied entirely on primary sources (own codebase + live API state), appropriate for a codebase-archaeology task.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Hashtag-comment fix diagnosis: HIGH — root cause confirmed via direct parse of live connection-graph JSON, not inference.
- Deploy discipline: HIGH — pattern proven identically across 5+ prior phase deploys with documented evidence.
- Postgres/YCloud/Sheets verification methods: HIGH — all directly sourced from evidence docs of live-fires performed hours before this research, on the same infrastructure.
- Wizard prompt sequence: HIGH — read directly from current `wizard/run.js` source.

**Research date:** 2026-08-01
**Valid until:** Short shelf life recommended — 3-5 days. This is a fast-moving, actively-developed codebase (multiple phases shipped same-day); re-verify `versionId`/drift and firewall-rule IP before executing if more than a few days pass.
