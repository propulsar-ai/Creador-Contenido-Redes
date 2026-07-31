# Phase 13: Facebook Story + Log + Notifications - Research

**Researched:** 2026-07-31
**Domain:** n8n workflow editing (Google Sheets node schema, HTTP Request node live-fire verification, WhatsApp/YCloud message templating) — no new external library/API surface, this is 100% work inside the existing `n8n/workflow.json`
**Confidence:** HIGH (all findings come from directly reading the actual node JSON in this repo, not from generic n8n/Meta API knowledge)

## Summary

**The single most important finding of this research: most of Phase 13's literal ROADMAP wording is stale. The FB Story publish chain (FBSTORY-02/03/04, ERR-01) was already fully built and wired during Phase 12 Plan 01 — it is not being built in Phase 13.** This was directly confirmed by reading `n8n/workflow.json`: nodes `🛡️ Assert FB Story URL (no SAS)` → `⬇️ FB: Fetch Image Bytes (Azure)` → `📤 FB: Upload Story Photo Unpublished` → `🌐 FB: Publish Photo Story` exist, are wired in sequence after `🔧 IG: Compute Story Expiry` → `🔀 ¿Plataformas FB?` (TRUE branch), and all three HTTP nodes have `onError: "continueErrorOutput"` routed to `🏷️ Tag FB Error` → `🚨 Parse Meta Error` (the shared 9-node error subgraph — ERR-01 is done). `🌐 FB: Publish Photo Story` already has `retryOnFail: false, maxTries: 1` (FBSTORY-03 done). `🛡️ Assert FB Story URL (no SAS)` already strips SAS query params from the URL before the FB Story chain (FBSTORY-04 done, "Option A strip" semantics — see Open Question 1 below for a wording nuance vs. the ROADMAP text). `.planning/REQUIREMENTS.md`'s traceability table is accurate; the ROADMAP.md phase description is the stale one.

**What genuinely has NOT happened yet, and is Phase 13's real scope:**

1. **FBSTORY-01 — a real, live, end-to-end fire of the FB Story 2-step flow has never occurred.** Phase 12-01's "live test" (Test J) only proved the `/photo_stories` endpoint was *reachable* with a bogus `photo_id` (returned code:100 "Invalid id", not an OAuth/permission error) — it never completed a real `photos?published=false` → `photo_stories` round trip with a real photo_id, and it predates the Phase 12.2 Hostinger backend swap. Phase 12.2-03's E2E verification (STATE.md) tested "IG single/story/carousel-child, FB single/carousel-unpublished" Meta container-creation calls — note this is FB **feed** single/carousel unpublished-photo creation, NOT the FB Story chain's own unpublished-photo-upload + `/photo_stories` publish step. **The FB Story chain has never been fired for real, against Meta, with real IDs, on any backend.** This is exactly why REQUIREMENTS.md marks FBSTORY-01 "Phase 13, Pending" while FBSTORY-02/03/04 (the code shape) are "Done." Phase 13 must do this live test as literally its first task (per the phase's own Success Criteria #1), and this doubles as Success Criteria #2 (a Story must actually appear on the FB Page).
2. **NOTIF-01** — `✅ Notify WhatsApp Story` (already exists, already fires after both the FB-included and FB-skipped branches converge) currently only mentions Instagram. Its own inline note admits this: *"FB permalink format pendiente de Phase 13."* Needs a conditional FB line.
3. **LOG-01** — no Sheets log node (single, carousel, story, or fail) has a `Formato` column today. All 4 share the identical column schema (`Fecha, Tema, Tipo, Angulo, Plataformas, Modelo_Imagen, Imagen_URL, Estado, IG_URL, FB_URL, Publicado_En, Publish_Status, Error_Msg`) with zero mention of format/story-ness.
4. **LOG-02** — `📊 Google Sheets Log (Story)` (`sheets-log-story`, node id present, already logs Story successes) has no `Expires_At` column; its own note explicitly defers this: *"si Phase 13 quiere agregar Formato + Expires_At columns, será LOG-01 aparte."*

**Primary recommendation:** Scope Phase 13 as (a) one live-fire verification task for the FB Story chain (already-built code, first real execution) plus (b) three small, mechanical editing tasks (WA template, 4x Sheets node schema edits, 1x Sheets node new column) — NOT a "build the FB Story publish chain" phase. Do not re-build FBSTORY-02/03/04/ERR-01; only re-verify FBSTORY-01 live and extend NOTIF-01/LOG-01/LOG-02.

## User Constraints

No CONTEXT.md exists for this phase — no locked decisions beyond the ROADMAP.md phase description and success criteria already supplied in the task prompt (reproduced in Architecture Patterns / Don't Hand-Roll below). Treat the discrepancy documented in this file's Summary as the primary open decision the planner must make explicit (recommendation: side with REQUIREMENTS.md's traceability, not ROADMAP.md's literal wording).

## Current State of `n8n/workflow.json` (verbatim facts, not inference)

### FB Story publish chain — ALREADY BUILT (Phase 12 Plan 01)

Wiring, read directly from `connections`:

```
🔧 IG: Compute Story Expiry
  └─→ 🔀 ¿Plataformas FB?  (IF v1, checks Merge Rehost Output.platforms includes 'facebook')
        TRUE(0)  → 🛡️ Assert FB Story URL (no SAS)
                     └─→ ⬇️ FB: Fetch Image Bytes (Azure)          [onError → 🏷️ Tag FB Error]
                           └─→ 📤 FB: Upload Story Photo Unpublished [onError → 🏷️ Tag FB Error, retryOnFail=true maxTries=2]
                                 └─→ 🌐 FB: Publish Photo Story      [onError → 🏷️ Tag FB Error, retryOnFail=FALSE maxTries=1]
                                       └─→ ✅ Notify WhatsApp Story
        FALSE(1) → ✅ Notify WhatsApp Story   (direct, skips FB entirely)

🏷️ Tag FB Error → 🚨 Parse Meta Error → (shared 9-node error subgraph, same as IG errors)
```

Node-level facts:
- `🌐 FB: Publish Photo Story` (id `fb-publish-photo-story`): `POST https://graph.facebook.com/v22.0/{FACEBOOK_PAGE_ID}/photo_stories`, body `{photo_id: $json.id, access_token: ...}`, **`retryOnFail: false, maxTries: 1`** — FBSTORY-03 satisfied. Note field literally says: *"Endpoint verificado LIVE en Plan 12-01 Task 1 Test J (code:100 Invalid id → endpoint reachable + perms OK). ... Phase 13 refinará WA notify + Sheets log con FB permalink format."* — i.e., Phase 12's own author already scoped Phase 13 as notify/log work, not chain-building.
- `📤 FB: Upload Story Photo Unpublished` (id `fb-upload-story-photo`): multipart POST to `/{PAGE_ID}/photos` with `source` = binary from the previous node, `published=false`. This is the "step 1" of the 2-step flow FBSTORY-01 asks about — already implemented as 2-step (matches REQUIREMENTS.md traceability "Done, 2-step flow").
- `🛡️ Assert FB Story URL (no SAS)` (id `assert-fb-story-url`): strips (does not reject) SAS query params from `blob_urls[0].url`. Its own note flags that since Phase 12.2 (Hostinger backend), this is now a **dormant no-op** — Hostinger URLs never carry SAS params, `stripped` will always evaluate `false`. Left in place intentionally, "fail-open, zero functional risk."
- All 3 chain nodes read from `$('🔗 Merge Rehost Output').item.json.blob_urls[0].url` — confirmed by Phase 12.2 (STATE.md) this now resolves to a `rehost-service` Hostinger URL, not an Azure Blob URL. The chain has NOT been re-verified live against this new backend end-to-end (see Summary point 1).

### `✅ Notify WhatsApp Story` — exists, IG-only today

Current `jsonBody` (verbatim, line ~1701):
```
'📲 *Story publicada* (válido 24h)\n\n📸 Instagram: ' + (ig_story_permalink || '(permalink pendiente de propagación)')
  + '\n⏳ Expira: ' + <CET-formatted story_expires_at>
  + '\n\n📝 Tema: ' + topic
```
- `onError: "stopWorkflow"` — a WA send failure here currently HALTS the workflow (this is a pre-existing design choice, not something Phase 13 needs to touch, but worth knowing: if Phase 13 adds more logic to this node's expression and it throws, the whole execution stops, not just the notification).
- Sources data from `$('🔗 Merge Rehost Output')` (approval_number, topic, platforms) and `$('🔧 IG: Compute Story Expiry')` (ig_story_permalink, story_expires_at) — both are safe, already-proven cross-refs to reuse.
- To add an FB line: the same `platforms.includes('facebook')` boolean expression already exists verbatim in `🔀 ¿Plataformas FB?` (`($('🔗 Merge Rehost Output').item.json.platforms || []).includes('facebook')`) — reuse this exact expression, do not re-derive it differently.
- **Pitfall confirmed safe by n8n execution semantics:** because `✅ Notify WhatsApp Story` is only reached via the FB TRUE branch *after* `🌐 FB: Publish Photo Story` succeeds (a failure diverts the item to `🏷️ Tag FB Error` and never reaches Notify), it IS safe to reference `$('🌐 FB: Publish Photo Story').item.json` inside a ternary gated by the same `platforms.includes('facebook')` check — JS ternaries short-circuit, so the reference is only evaluated on the branch where that node is guaranteed to have run. Do NOT reference that node unconditionally or outside such a guard — n8n throws when `$('NodeName')` is accessed for a node that did not execute in the current item's path.
- FB Story publish response shape is **unverified** — the existing node's own note calls it "esperado" (expected): `{success:true, post_id:<id>}`. This shape has never been observed from a real API call (see FBSTORY-01 gap above). The live-fire task should capture and document the actual response shape before the NOTIF-01 template is finalized, in case field names differ from `post_id`.

### Sheets log nodes — all 4 share one column schema, NONE has `Formato` or `Expires_At`

All 4 nodes (`📊 Google Sheets Log` [single], `📊 Google Sheets Log (Carousel)`, `📊 Google Sheets Log (Story)`, `📊 Sheets Fail Log`) use `n8n-nodes-base.googleSheets` v4.4, `operation: "append"`, `resource: "sheet"`, same `documentId` (`$env.GOOGLE_SHEETS_ID`), same `sheetName: "Log"`, same credential (`googleSheetsOAuth2Api` id `XjKteoOTobs1qR55`, "Google Sheets account"). Identical column set across all 4: `Fecha, Tema, Tipo, Angulo, Plataformas, Modelo_Imagen, Imagen_URL, Estado, IG_URL, FB_URL, Publicado_En, Publish_Status, Error_Msg`. `columns.mappingMode: "defineBelow"` with an explicit `schema` array (one object per column: `{id, displayName, required, defaultMatch, display, type, canBeUsedToMatch}`).

`📊 Google Sheets Log (Story)` specifics: `Estado: "Publicado"`, `IG_URL: ig_story_permalink`, **`FB_URL: ""` (hardcoded empty string, unconditionally)** — its own note: *"FB_URL queda '' por ahora (Phase 13 agregará format FB Story URL tras determinar si funciona /stories/... o similar)."* Given NOTIF-01's own requirement text says "FB Story has no permanent URL," the correct resolution is almost certainly to leave `FB_URL` empty for Story rows permanently (not a bug to fix) — flag this as a planner decision point rather than assuming it needs a value.

**Formato value source is per-node, not uniform** — this is a load-bearing distinction the planner must know:
- Single-post log node: brief JSON has **no `format` field at all** for single posts (confirmed in `wizard/run.js` lines 695-719 — `format` is only added via spread for `isCarousel`/`isStory`, absent otherwise). So the single-post Sheets log node cannot copy `$json.format` — it must hardcode the literal string `"single"` (this node only ever fires on the single-post branch, so a hardcoded literal is both correct and simplest).
- Carousel log node: only ever fires on the carousel branch → hardcode `"carousel"`.
- Story log node: only ever fires on the Story branch → hardcode `"story"` (matches LOG-02's explicit `Formato=story` requirement).
- **Fail log node (`📊 Sheets Fail Log`) is the hard case** — it's a SHARED terminal node reached from Meta failures on ANY of single/carousel/story via the common `🚨 Parse Meta Error` → error subgraph. `🚨 Parse Meta Error`'s current `jsCode` (read in full) builds its output object from `mergeData` (`$('🔗 Merge Rehost Output')` with a fallback to `$('🔧 Prep Re-host Input')`) but **only extracts `approval_number`, `topic`, `blob_urls`** — it does NOT currently surface `format` at all. To give the Fail log a correct per-execution `Formato` value, `🚨 Parse Meta Error`'s return object needs a new field, e.g. `format: mergeData.format || 'single'` (the `|| 'single'` fallback is required because, as above, single-post briefs have no `format` key — mirroring the same convention the rest of the workflow already uses implicitly via its IF-node branching order). The Fail log node's `Formato` column would then read `={{ $('🚨 Parse Meta Error').item.json.format }}`.

## Architecture Patterns

### Pattern: Hardcode literal Formato values in format-specific nodes, derive dynamically only in the shared Fail log

Because 3 of the 4 log nodes are architecturally single-format nodes (each is downstream of exactly one branch), there is no need for conditional logic there — a bare string literal is correct, simpler, and matches how `Estado: "Publicado"` is already hardcoded in each of them today. Only the Fail log needs a real expression, and only because it's shared. This mirrors the existing `_platform` pattern (`🏷️ Tag IG Error` hardcodes `_platform='Instagram'`, `🏷️ Tag FB Error` hardcodes `_platform='Facebook'`, then `🚨 Parse Meta Error` reads whichever ran) — Phase 13's `format` field on `🚨 Parse Meta Error` should follow the same shape (read once from `mergeData`, expose on the shared node's output, consumed downstream by name).

### Pattern: Extend Google Sheets node schema safely (LOG-01/LOG-02 mechanics)

Each of the 4 nodes needs two additions in lockstep:
1. A new key in `columns.value` (e.g. `"Formato": "={{ ... }}"`).
2. A matching new object in `columns.schema` (e.g. `{"id": "Formato", "displayName": "Formato", "required": false, "defaultMatch": false, "display": true, "type": "string", "canBeUsedToMatch": true}`) — copy the exact shape of existing schema entries (e.g. `Estado`'s entry), just with a new `id`/`displayName`.

**Critical operational gotcha (HIGH confidence — this is how the n8n Google Sheets node's `append` operation works, and matches this project's own established precedent):** editing the node's JSON schema alone is NOT sufficient for the new columns to land correctly. The n8n Google Sheets node's `append` operation writes new rows aligned to the **actual header row of the live Google Sheet tab**. If the "Log" tab's row 1 does not already have `Formato` (and, for the Story node, `Expires_At`) as column headers, the appended values have nowhere correct to go — this is exactly the same class of problem this project hit in Plan 11-01, where Supabase's `content_sessions` table needed a manual `ALTER TABLE` before the Wizard could reliably write `story_expires_at`/`aspect_ratio` (a probe returned 400 until the user ran the migration; STATE.md, "v1.2 Decisions Locked (Plan 11-01)"). **The plan MUST include an explicit task/step for the user (Felix) to manually add `Formato` and `Expires_At` header columns to the live "Log" Google Sheet tab BEFORE or alongside deploying the updated `n8n/workflow.json`** — do not assume the n8n node edit alone is sufficient, and do not assume this is something Claude Code can do itself (it requires either Sheets UI access or a Sheets API write with credentials not present in this repo's tool surface).

### Pattern: Live-fire verification harness (reuse Phase 12.2-03's approach)

Phase 12.2-03 already solved "how do we test a Meta-facing chain without going through the full WhatsApp-approval path" — STATE.md documents that n8n's public REST API has **no endpoint to directly execute a workflow** (`POST /api/v1/workflows/{id}/run` → confirmed live 405), and the real approval webhook path flows straight from `Merge Rehost Output` into Meta-facing nodes with no safe stopping point. The established pattern (verified working, used twice now — Plan 12.2-03 and implicitly Plan 12-01/12-02's numbered "exec" test evidence) is a **disposable harness workflow** (`Webhook → flatten body → Execute Workflow → target workflow/sub-workflow`, `responseMode: lastNode`, deleted after use) OR firing a real WhatsApp-approval-flow execution end-to-end and reading the resulting `exec <id>` from n8n's execution log (the pattern used throughout Phase 12 — e.g. "exec 10786", "exec 10959", "exec 10333" are all cited as evidence in STATE.md). **Recommendation for Phase 13's FBSTORY-01 live test: fire one real Story through the full WhatsApp SI-approval path** (this is simpler than building a new harness, and is literally Success Criteria #2 — "A Story approved via WhatsApp SI appears on the Facebook Page as a Story" — which requires the real path anyway, not a harness bypass). Capture the real execution id and the real `🌐 FB: Publish Photo Story` response body as evidence, matching this project's established "close only after real Meta API evidence" discipline (STATE.md repeatedly documents exec ids as proof, never just "code looks right").

### Anti-Patterns to Avoid

- **Do not rebuild `🛡️ Assert FB Story URL (no SAS)`, `⬇️ FB: Fetch Image Bytes (Azure)`, `📤 FB: Upload Story Photo Unpublished`, or `🌐 FB: Publish Photo Story`.** They exist, are wired, and match FBSTORY-02/03/04 + ERR-01. Rebuilding risks introducing regressions into a chain that (per the code's own inline notes) was carefully evolved through 3 documented fix iterations (Option D → B → E) in Phase 12.
- **Do not reference `$('🌐 FB: Publish Photo Story')` (or any other conditionally-executed node) from an expression that can run when that node didn't execute.** Guard every reference behind the same `platforms.includes('facebook')` check used by `🔀 ¿Plataformas FB?`.
- **Do not assume `$json.format` is a safe universal read.** It is `undefined` for single-post briefs by design (confirmed in `wizard/run.js`) — every new expression touching `format` needs an explicit `|| 'single'` (or equivalent) fallback, exactly like the rest of this codebase already treats "absence of format" as "single."
- **Do not skip the manual Google Sheet header-column step.** This is not optional cosmetic work — the append operation depends on it.
- **Do not use IF v2 or Switch v3 nodes.** Confirmed broken in this project's n8n 2.14.2 instance (STATE.md, repeated across multiple phases) — any new conditional must be IF v1, matching `🔀 ¿Plataformas FB?` and every other existing branch node in this workflow.
- **Do not give any new/edited Meta-facing HTTP node `retryOnFail: true` if it is non-idempotent.** `🌐 FB: Publish Photo Story` is correctly `false` already — if Phase 13 touches this node at all (e.g., to capture/parse its response for NOTIF-01), do not accidentally flip this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Testing a workflow branch without a public direct-execute API | A custom polling/webhook trigger scheme from scratch | The real WhatsApp SI-approval path (fire a real Story end-to-end) OR the disposable harness-workflow pattern from `12.2-03-VERIFICATION.md`/`verify-rehost.mjs` if a harness is truly needed | Already proven twice in this repo; re-inventing risks missing the `405` direct-execute gotcha again |
| Deriving "is this row a Story/Carousel/Single" for the Fail log | New IF/Switch branching before the Sheets node | One field addition to `🚨 Parse Meta Error`'s existing `mergeData`-reading code | The node already centralizes exactly this kind of shared-error-context extraction (see `_platform`, `topic`, `approval_number` precedent) |

## Common Pitfalls

### Pitfall 1: Assuming ROADMAP.md's phase description defines the remaining work
**What goes wrong:** Planning "build the FB Story publish node" tasks that duplicate Phase 12 work already merged into `n8n/workflow.json`.
**Why it happens:** ROADMAP.md's Phase 13 description was written before Phase 12 Plan 01 scope-shifted FBSTORY-02/03/04/ERR-01 into itself; it was never updated.
**How to avoid:** Trust `.planning/REQUIREMENTS.md`'s traceability table (confirmed accurate against the actual node JSON in this research) over ROADMAP.md's prose. Scope Phase 13 to: FBSTORY-01 (live-fire verification only), NOTIF-01, LOG-01, LOG-02.
**Warning signs:** A plan task that says "create node `🌐 FB: Publish Photo Story`" — it already exists.

### Pitfall 2: Google Sheets schema edits with no matching Sheet header column
**What goes wrong:** New `Formato`/`Expires_At` values silently don't appear where expected, or shift/misalign other columns, after deploying the updated workflow.
**Why it happens:** The n8n Google Sheets `append` operation aligns to the live sheet's actual header row, not to the node's local `schema` array alone.
**How to avoid:** Explicit task: user adds `Formato` (all 4 nodes) and `Expires_At` (Story node only) as new header columns in the live "Log" Google Sheet tab before/alongside the workflow deploy — mirrors the Plan 11-01 Supabase `ALTER TABLE` precedent exactly.
**Warning signs:** Post-deploy spot check shows blank or misaligned columns in a real appended row.

### Pitfall 3: `format` field absent for single-post briefs
**What goes wrong:** An expression like `Formato: "={{ $json.format }}"` on the single-post log node (or on the shared Fail log without a fallback) writes an empty cell instead of `"single"`.
**Why it happens:** `wizard/run.js` only adds the `format` key via conditional spread for carousel/story; single-post briefs never had this field, by original design (pre-dates Phase 10).
<br>
**How to avoid:** Hardcode `"single"` literally on the single-post log node (safe — that node is format-specific); use `mergeData.format || 'single'` wherever a shared/dynamic read is unavoidable (the Fail log, via `🚨 Parse Meta Error`).
**Warning signs:** Historical/new rows showing a blank Formato cell for single-post publishes.

### Pitfall 4: Referencing a not-yet-executed node in an n8n expression
**What goes wrong:** `✅ Notify WhatsApp Story`'s expression throws at runtime if it unconditionally references `$('🌐 FB: Publish Photo Story')` on an execution where `facebook` was never in `platforms` (that node never ran for this item).
**Why it happens:** n8n's `$('NodeName')` accessor requires that node to have produced output on the current item's execution path; IF-branch skips mean it never did.
**How to avoid:** Gate any such reference behind the identical `platforms.includes('facebook')` boolean already used by `🔀 ¿Plataformas FB?` — JS ternary short-circuiting makes this safe.
**Warning signs:** `✅ Notify WhatsApp Story` throwing / halting the workflow (its `onError` is `stopWorkflow`, so this failure mode is especially costly — it would also block the Sheets Log (Story) node downstream of it).

### Pitfall 5: FB Story publish response shape is unverified
**What goes wrong:** NOTIF-01's FB note (or a future FB permalink/id log field) is built against an assumed `{success:true, post_id:<id>}` shape that was never actually observed from Meta.
**Why it happens:** `🌐 FB: Publish Photo Story`'s own inline note calls the shape "esperado" (expected) — it was written before any real invocation.
**How to avoid:** Capture the real response body during the FBSTORY-01 live-fire task, before finalizing NOTIF-01's exact wording/field references.
**Warning signs:** Any code referencing `.post_id` on the FB Story publish response without a prior live-observed confirmation.

## Code Examples

### Existing Formato-adjacent pattern to mirror (`_platform` tagging via shared error nodes)

```javascript
// 🏷️ Tag FB Error (existing, id: tag-fb-error) — mode: runOnceForEachItem
const item = { ...$input.item.json };
item._platform = 'Facebook';
return { json: item };
```

```javascript
// 🚨 Parse Meta Error (existing, id: parse-meta-error) — relevant excerpt
let mergeData = {};
try { mergeData = $('🔗 Merge Rehost Output').first().json; } catch(e) {
  try { mergeData = $('🔧 Prep Re-host Input').first().json; } catch(e2) {}
}
return [{
  json: {
    error_code: err.code || 0,
    // ...
    platform_failed: raw._platform || 'Meta',
    approval_number: mergeData.approval_number || '',
    topic: mergeData.topic || '',
    blob_urls: mergeData.blob_urls || [],
    // Phase 13 would add here: format: mergeData.format || 'single',
  }
}];
```

### Existing conditional-FB-inclusion expression to reuse verbatim (from `🔀 ¿Plataformas FB?`)

```
{{ ($('🔗 Merge Rehost Output').item.json.platforms || []).includes('facebook') ? 'true' : 'false' }}
```

### Existing Sheets schema entry shape to copy for new columns

```json
{
  "id": "Formato",
  "displayName": "Formato",
  "required": false,
  "defaultMatch": false,
  "display": true,
  "type": "string",
  "canBeUsedToMatch": true
}
```

## Open Questions

1. **FBSTORY-04 wording: "reject" (ROADMAP/Success Criteria #3) vs. "strip" (actual implementation, Option A per Phase 12 decision).**
   - What we know: `🛡️ Assert FB Story URL (no SAS)` strips SAS params rather than rejecting/throwing when found; REQUIREMENTS.md traceability explicitly marks this "Done (Option A strip semantics)."
   - What's unclear: Whether Phase 13's Success Criteria #3 ("an assertion rejects...") is a literal new requirement to change strip→reject, or just imprecise carryover wording from the same stale ROADMAP description as the FB-chain-building confusion.
   - Recommendation: Treat as satisfied by the existing strip implementation (consistent with REQUIREMENTS.md's "Done" status and the node's own "fail-open, zero functional risk" design intent) unless the user explicitly wants reject semantics. Do not silently change behavior — surface this as an explicit decision point in planning/discussion.

2. **Should the Fail log's `Formato` derivation live on `🚨 Parse Meta Error` or somewhere closer to the source?**
   - What we know: `🚨 Parse Meta Error` is the single shared node already centralizing cross-referenced context (`topic`, `approval_number`, `blob_urls`) for exactly this purpose.
   - What's unclear: Nothing significant — this is a low-risk, well-precedented pattern.
   - Recommendation: Add `format: mergeData.format || 'single'` directly to `🚨 Parse Meta Error`'s existing return object (one-line addition), consumed by `📊 Sheets Fail Log`'s new `Formato` column via `$('🚨 Parse Meta Error').item.json.format`.

3. **Does the live-fire FBSTORY-01 test need a disposable harness, or can it just be a real end-to-end Story approval?**
   - What we know: Success Criteria #2 requires "A Story approved via WhatsApp SI appears on the Facebook Page as a Story" — this literally describes the real path, not a harness bypass.
   - What's unclear: Whether test cleanup (deleting the resulting real FB Story) is needed — per STATE.md's Plan 12-02 decision, FB Stories auto-expire in 24h and Graph API DELETE on an expired Story returns code 100/subcode 33, so manual cleanup may be a non-issue (unlike feed posts, which the user's memory notes must be manually deleted after E2E tests).
   - Recommendation: Fire one real Story with both `platforms: ["instagram","facebook"]` through the actual Wizard → WhatsApp → SI-approval path; no harness needed. Confirm via Meta Graph API or a manual Facebook Page check that a Story (not a feed post) appears. Let it auto-expire rather than attempting manual deletion.

## Sources

### Primary (HIGH confidence — direct repo inspection, this session)
- `n8n/workflow.json` (4276 lines) — read in full for all FB Story / Sheets Log / Notify WhatsApp Story node bodies, `connections` object queried programmatically via Node.js for exact wiring of 10 named nodes.
- `wizard/run.js` (lines 690-724) — confirmed exact brief JSON shape, confirmed `format` field is absent for single-post briefs.
- `.planning/REQUIREMENTS.md` — full v1.2 requirements + traceability table.
- `.planning/STATE.md` (215 lines, read in full) — Phase 12, 12.1, 12.2 "Decisions Locked" sections, Open Items, Session Continuity.
- `.planning/ROADMAP.md` (Phase 13 section, lines 124-134, plus Progress table) — confirmed exact Success Criteria wording and the "0/TBD, Unblocked" status.
- `.env.example` — confirmed `FACEBOOK_PAGE_ID`, `META_PAGE_TOKEN`, `GOOGLE_SHEETS_ID` already documented; no new env vars needed for Phase 13.

### Secondary / Tertiary
None used — this research required no external web search or library documentation; the entire domain is this repo's own prior work.

## Metadata

**Confidence breakdown:**
- Current-state findings (what's built, what's missing): HIGH — derived directly from reading the actual node JSON and connections, not from STATE.md's prose alone (STATE.md was used to corroborate, not as the sole source).
- Architecture/pattern recommendations: HIGH — every recommended pattern mirrors an existing, already-shipped pattern in this same workflow (not a novel external pattern).
- Google Sheets header-column gotcha: MEDIUM-HIGH — based on general n8n Google Sheets node append-operation behavior (well-established community knowledge) cross-verified against this project's own directly analogous Plan 11-01 Supabase precedent (HIGH-confidence local evidence). Not verified against n8n's current official docs via Context7/WebFetch in this session (no external tool calls were made — the research scope was entirely local-repo). If the planner wants official-doc-level confirmation, verify by inspecting whether the "Log" sheet's actual header row already happens to contain these columns before assuming a manual step is needed.

**Research date:** 2026-07-31
**Valid until:** Valid until `n8n/workflow.json` or the live Google Sheet "Log" tab changes further — no external dependency drift expected (no library/API version research involved).
