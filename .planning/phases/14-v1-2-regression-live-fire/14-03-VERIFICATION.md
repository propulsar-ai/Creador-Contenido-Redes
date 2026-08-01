# Phase 14 Plan 03: VERIF-02 Carousel Live-Fire Evidence + Phase Baseline

**Purpose:** Live-fire the carousel (multi-slide) format through the full production pipeline (Wizard → n8n → Postgres session → WhatsApp SI approval → IG + FB carousel publish) to prove the Supabase→Azure Postgres migration (Phase 12.3) works for the `save-session-carousel` INSERT/recovery variant and multi-slide fan-out, and to live-prove Plan 14-01's hashtag-comment `onError` fix on the carousel chain for the first time.

**Date:** 2026-08-01
**Workflow:** `Qql7mvYRxKBsPZ5t` @ `https://n8n-azure.propulsar.ai`

---

## 1. Brief Submitted (Task 2, prior session segment)

| Field | Value |
|---|---|
| Topic | "Agentes IA autónomos para tareas repetitivas en ventas y soporte" (Perplexity trending) |
| Type | `educational` |
| Angle | "El costo oculto de no automatizar esto" (AI-suggested) |
| Format | Carrusel — 5 slides (Wizard's own suggested slide count, accepted) |
| Platforms | Instagram + Facebook |
| Image model | Ideogram v3 (hardcoded for carousels) — $0.06/slide × 5 = **$0.30** |
| Publish time | "ahora" (immediate) |
| Approval number | `+5493517575244` |

## 2. Submission Execution — `1792549`

- `status: success`, `finished: true`.
- `🎠 Explode Slides` → `🔤 Ideogram — Slide` (×5) → `🗂️ Collect Image URLs` → `💾 Guardar sesión Supabase (Carousel)` (carousel Postgres INSERT — first live-fire of this variant since the Postgres migration) — all succeeded.
- 6 WhatsApp preview messages sent (5 slide images `Slide N de 5` + 1 caption/summary text): `6a6e35058284e6546358c9dc`, `6a6e35068284e6546358c9dd`, `6a6e350511c0b20cf5539c17`, `6a6e3505a4caa1165fa66fc1`, `6a6e350540acb4349e39d1e6`, `6a6e35088284e6546358c9eb` — all confirmed **delivered** via direct YCloud GET.

## 3. Pre-Fire Re-Verification (Task 2, locked pattern)

Live `GET /api/v1/workflows/Qql7mvYRxKBsPZ5t` in this session confirmed `versionId f2700b77-030a-4526-99cf-da707389027c`, `active: true`, 92 nodes — matching the state left by 14-02's close, zero drift.

## 4. SI Approval — Three Attempts (Real Bug Found, Fixed, Re-Fired)

Real inbound WhatsApp reply "Si" from `+5493517575244` triggered exec **`1792683`** at `2026-08-01T18:14:02Z` via the `propulsar-whatsapp-reply` webhook. This and one further programmatic re-fire (via a synthetic webhook POST replicating YCloud's exact inbound-message payload shape, `from`/`to`/text unchanged, only `id`/`wamid` regenerated — same mechanism a second real WhatsApp reply would produce, zero additional image-generation cost since the flow reads the session's already-stored `image_urls`) both failed with the **same class of real, non-hashtag error**, before a third attempt succeeded.

### Attempt 1 — exec `1792683` (FAILED, real bug)

Node-by-node ran cleanly through Postgres recovery, rehost, and carousel explode, then failed at the IG child-container fan-out:

| Node | Result |
|---|---|
| `🔍 Recuperar sesión Supabase` | Succeeded — recovered `session_id propulsar_1785607428452` / row `89939a7a-8420-4a39-a3ff-852e4834e268` |
| `🛡️ Assert Session Found` | Passed |
| `🔧 Prep Re-host Input` → `🔁 Re-host Images` → `🔗 Merge Rehost Output` | 5 slides re-hosted to `rehost-service` |
| `🎠 IG: Explode Carousel Slides` | 5 items emitted correctly |
| `🖼️ IG: Create Child Container` | **3 succeeded, 2 failed** (slides 2 and 5) even after the node's own `retryOnFail` (maxTries 2, wait 3s) |
| `🗂️ IG: Collect Child IDs` | **Threw:** `IG Carousel: expected 5 child containers, got 3` — correct fail-loud guard behavior, halted the execution |

Raw failure on both slides: `400 {"error":{"message":"Only photo or video can be accepted as media type.","type":"OAuthException","code":9004,"error_subcode":2207052,"is_transient":false,"error_user_title":"Error al descargar el contenido multimedia..."}}` — Meta's fetcher could not download the `rehost-service` URL at that moment.

**Root-cause investigation:** both failed URLs were manually re-fetched via `curl` immediately after — both returned `HTTP 200`, correct `content-type: image/png`, correct byte sizes (700-820KB). The files were valid and reachable; this was a **transient failure on Meta's side fetching from `rehost-service`**, not a broken/expired URL.

### Attempt 2 — exec `1792744` (FAILED, same failure class)

Re-fired via the synthetic webhook replay (no code change yet, testing whether the failure was purely transient). Same pattern recurred: **4 of 5 child containers succeeded, 1 failed** (slide 4, same `9004/2207052` error). Guard node threw `expected 5 child containers, got 4`.

Two independent attempts, two different slides failing each time (2&5, then 4) — this ruled out a single bad file and confirmed a **real, reproducible reliability gap**: Meta's fetcher intermittently fails to retrieve 1-2 of 5 slide URLs from `rehost-service` within the existing retry budget (2 tries × 3s wait).

### Fix Applied (Rule 1/3 — real bug, blocking; fixed directly per locked re-fire policy)

Increased `🖼️ IG: Create Child Container`'s retry tolerance: `maxTries` 2→4, `waitBetweenTries` 3000ms→8000ms. Additive, single-node parameter change — no connections touched, no other node modified.

- `n8n/workflow.json` updated (commit follows this doc).
- Deployed live via patch-based PUT (established discipline): pre-deploy diff of all 92 remote nodes vs. the repo found only the 4 known-benign auto-generated `webhookId` fields on Wait nodes (identical pattern to every prior deploy in this phase) — zero real drift. PUT changed **exactly 1 node** (`ig-create-child-container`); post-deploy diff confirmed this and confirmed `connections` byte-identical. `versionId f2700b77-030a-4526-99cf-da707389027c` → `48202cdc-ffe1-496f-81cd-491d9b875a5d`, `active: true`, 92 nodes preserved.

### Attempt 3 — exec `1792783` (SUCCESS — full carousel chain)

Re-fired again via the same synthetic webhook-replay mechanism (still zero additional image cost — same stored `image_urls`). **28 nodes ran, all `success`, overall `status: success`, `finished: true`, `error: null`.**

**Full node-by-node (approval path):**

| Node | Result |
|---|---|
| `📨 Webhook — Reply WA` | Received synthetic "Si" reply (replicates real inbound-message shape) |
| `✅ ¿Aprobado?` | Routed to approval branch |
| `🔍 Recuperar sesión Supabase` | Recovered the same carousel session (`89939a7a-8420-4a39-a3ff-852e4834e268`) |
| `🛡️ Assert Session Found` | Passed |
| `🔧 Prep Re-host Input` → `🔁 Re-host Images` → `🔗 Merge Rehost Output` | 5 slides re-hosted fresh |
| `🔀 ¿Formato Carrusel?` | TRUE branch taken |
| `🎠 IG: Explode Carousel Slides` | 5 items |
| `🖼️ IG: Create Child Container` | **All 5 succeeded** with the new retry budget (no error output taken this time) |
| `🗂️ IG: Collect Child IDs` | Passed — 5/5 child ids collected |
| `⏳ IG: Wait 30s Carousel` | Passed |
| `🎠 IG: Create Parent Container` | `{"id": "17889980463666804"}` |
| `🚀 IG: Carousel media_publish` | `{"id": "17966364624135172"}` |
| **`💬 IG: Post Carousel Hashtag Comment`** | **Status `success` (did not halt) but took its ERROR output** — `400 {"error":{"message":"(#10) Application does not have permission for this action","type":"OAuthException","code":10,...}}`. Expected, documented failure (missing `instagram_manage_comments` scope). |
| `🔗 IG: Get Carousel Permalink` | **Reached via the error-output edge — live proof of Plan 14-01's fix on the carousel chain.** `{"id":"17966364624135172","permalink":"https://www.instagram.com/p/DbgeOgrlm5S/"}` |
| `🖼️ FB: Explode Carousel Slides` | 5 items |
| `📤 FB: Upload Photo Unpublished` | 5/5 succeeded: `122133770535238849`, `122133770613238849`, `122133770583238849`, `122133770667238849`, `122133770559238849` |
| `🗂️ FB: Collect Photo IDs` → `🔧 FB: Build attached_media` | Assembled `attached_media` array from the 5 photo ids |
| **`🌐 FB: Publish Carousel Feed`** | **First successful FB carousel feed publish since 2026-04-17.** `{"id":"981931321668013_122133770775238849"}` |
| `✅ Notify WhatsApp Carousel` | Message `6a6e3965b6062c6ba0c8901f` sent with both permalinks |
| `📊 Google Sheets Log (Carousel)` | Row appended (see §6) |
| `🧹 Extract Blob Names` → `🗑️ Delete Rehosted Image` | rehost-service temp-file cleanup |

No error-subgraph node (`🏷️ Tag IG Error`, `🚨 Parse Meta Error`, WA error notifications, `📊 Sheets Fail Log`) fired anywhere in this final execution.

## 5. YCloud Delivery Confirmation (direct GET)

```
GET https://api.ycloud.com/v2/whatsapp/messages/6a6e3965b6062c6ba0c8901f
→ {"status": "read", "deliverTime": "2026-08-01T18:22:31Z", "readTime": "2026-08-01T18:22:36Z", ...}
```

Message body: `"✅ Carrusel publicado (5 slides)\n\n📸 Instagram: https://www.instagram.com/p/DbgeOgrlm5S/\n📘 Facebook: https://www.facebook.com/981931321668013_122133770775238849\n\n📝 Tema: Agentes IA autónomos para tareas repetitivas en ventas y soporte"`

## 6. Postgres Verification (direct query)

**Firewall:** existing rule `claude-session-20260801` (185.73.168.36) matched the current session IP — no new rule needed.

```sql
SELECT * FROM content_sessions WHERE format='carousel' ORDER BY created_at DESC LIMIT 1;
```

| Column | Value |
|---|---|
| `id` | `89939a7a-8420-4a39-a3ff-852e4834e268` |
| `session_id` | `propulsar_1785607428452` |
| `topic` | Agentes IA autónomos para tareas repetitivas en ventas y soporte |
| `type` | `educational` |
| `angle` | El costo oculto de no automatizar esto |
| `platforms` | `{instagram,facebook}` |
| `image_model` | `ideogram` |
| `format` | `carousel` (correct from the INSERT itself — carousel's INSERT already set this literal since Phase 12.3, unlike single-post's now-fixed bug) |
| `image_urls` | 5-element TEXT[] of Ideogram ephemeral slide URLs (all 5 present, matches submission) |
| `approval_number` | `+5493517575244` |
| `status` | `pending` (never set to consumed — pre-existing documented tech debt, out of scope) |
| `publish_at` | `now` |
| `created_at` | `2026-08-01T18:03:48.608Z` |

`format='carousel'` and 5 populated `image_urls` confirmed exactly as required — **zero Postgres-related issues** on this variant across all 3 approval attempts (the session row was correctly created once at submission and correctly re-read by the recovery SELECT on all 3 attempts).

## 7. Google Sheets "Log" Row (harness-verified, exact-match)

Disposable harness workflow `HARNESS-14-03-sheets-read` (`Webhook → HTTP Request` against the raw Sheets API `spreadsheets.values.get`, same credential `XjKteoOTobs1qR55` as production, range `Log!A1:O40`) deployed via `POST /api/v1/workflows` (id `010BwV7dUvQWG817`), activated, triggered via its webhook, read, then deleted via `DELETE /api/v1/workflows/010BwV7dUvQWG817` — follow-up GET returned **404** (confirmed removed).

(First attempt used the `Google Sheets` node directly and hit two node-level snags — `sheetName` mode `list` with a literal string value returned `"Sheet with ID Log not found"`, and even after fixing to mode `name`, the node returned only 1 row despite `returnAll: true`. Switched to the raw HTTP Request pattern per RESEARCH's documented fallback, which worked immediately — consistent with the project's established precedent that low-level Sheets operations are more reliable via raw API calls than the `Google Sheets` node's UI-oriented parameter set.)

**Live header (exact-match, `Log!A1:O1`):**
```
["Fecha","Tema","Tipo","Angulo","Plataformas","Modelo_Imagen","Imagen_URL","Estado","IG_URL","FB_URL","Publicado_En","Publish_Status","Error_Msg","Formato","Expires_At"]
```

**Last row (row 28, this run — trailing `Expires_At` cell omitted by the Sheets API since blank, expected for carousel format):**
```json
["2026-08-01T18:22:31.202Z","Agentes IA autónomos para tareas repetitivas en ventas y soporte","educational","El costo oculto de no automatizar esto","instagram, facebook","ideogram","https://rehost-service-propulsar-atiende-demo.bacu5y.easypanel.host/files/2026/08/01/7c4e19a3-84e5-4eae-928c-1ac4f021b793.png","Publicado","https://www.instagram.com/p/DbgeOgrlm5S/","https://www.facebook.com/981931321668013_122133770775238849","2026-08-01T18:22:31.299Z","success","","carousel"]
```

`Formato` = exactly `"carousel"` (programmatically verified via harness, not visual). `Estado`/`IG_URL`/`FB_URL` all populated coherently with the execution evidence above. Total sheet had 28 rows including header (27 historical rows from Phases 12/13/14-02 + this run's row).

## 8. Image Cost

Ideogram v3, 5 slides: **$0.30** (single generation call at submission — the 2 failed re-fires and the successful 3rd attempt re-used the same 5 already-generated slide URLs, zero additional AI-generation cost). Cumulative phase image spend: **$0.33** ($0.03 single from 14-02 + $0.30 carousel from 14-03) against the ~$1.50 phase budget.

## 9. Summary — VERIF-02 Chain Complete

- [x] Wizard brief submitted via real interactive flow (5-slide carousel, Ideogram hardcoded)
- [x] Submission exec `1792549`: carousel Postgres INSERT succeeded (first live-fire of this variant since the migration), 6 WA preview messages delivered (YCloud-confirmed)
- [x] Real SI reply received; 2 failed approval attempts (`1792683`, `1792744`) diagnosed as a real, reproducible Meta-fetcher reliability gap on the IG child-container step (not a Postgres or hashtag-comment issue)
- [x] Real bug fixed: `ig-create-child-container` retry budget raised (2×3s → 4×8s), patch-deployed live (versionId `f2700b77` → `48202cdc`, exactly 1 node changed)
- [x] Third approval attempt (exec `1792783`) succeeded fully: Postgres session recovery passed, IG carousel published (`media_id 17966364624135172`, permalink `https://www.instagram.com/p/DbgeOgrlm5S/`)
- [x] Hashtag-comment failed as expected (code 10) but execution continued into the FB branch — **live proof of Plan 14-01's fix on the carousel chain**
- [x] FB carousel feed publish succeeded (`post_id 981931321668013_122133770775238849`) — first FB carousel publish since 2026-04-17
- [x] WhatsApp success notification delivered (confirmed `read` via YCloud GET)
- [x] Postgres row confirmed `format='carousel'` with all 5 `image_urls` — correct from the INSERT itself
- [x] Sheets Log row confirmed `Formato='carousel'` (exact-match, harness-verified, not visual)
- [x] Zero Postgres-migration-related errors anywhere across any of the 3 execution attempts

**Pending (Tasks 5-6, not yet executed at time of this writing):** user visual confirmation of the live carousel; cleanup (FB delete via API, IG delete attempt, pending-manual-deletion compilation across both fires).

---

## 10. Phase-Level Baseline Statement (ROADMAP Phase 14 Success Criteria)

| # | ROADMAP Success Criterion | Evidence | Status |
|---|---|---|---|
| 1 | A live single-post run persists its session correctly in Azure PostgreSQL, WhatsApp SI approval succeeds, and the post publishes to both Instagram and Facebook. | Plan 14-02: submission exec `1791764` + approval exec `1792209`. Postgres session recovered live, IG published (`media_id 18174505420425505`), FB published (`post_id 981931321668013_122133764865238849`, first FB feed publish since 2026-04-17). See `14-02-VERIFICATION.md`. | **TRUE** |
| 2 | A live carousel run (multi-slide) persists its session correctly, WhatsApp SI approval succeeds, and the carousel publishes to both Instagram and Facebook. | Plan 14-03 (this doc): submission exec `1792549` + approval exec `1792783` (after 2 diagnosed-and-fixed failed attempts). Postgres carousel session recovered live, IG carousel published (`media_id 17966364624135172`), FB carousel published (`post_id 981931321668013_122133770775238849`, first FB carousel publish since 2026-04-17). | **TRUE** |
| 3 | No Postgres-migration-related errors surface during either live-fire test, confirming a clean baseline for v1.3 work. | See breakdown below. | **TRUE** |

### Criterion 3 — detailed breakdown

**14-02 (single-post):** One Postgres-migration-related bug WAS found and fixed live during this phase: `save-session-supabase`'s INSERT never set the `format` column (NULL for every single-post session since Phase 12.3's migration). This was diagnosed, fixed, patch-deployed, and the affected row backfilled — all within Plan 14-02, before its own success criteria were declared met. No Postgres-migration-related error remains outstanding from that fire.

**14-03 (carousel):** The carousel session INSERT/recovery path (`save-session-carousel`, shared `retrieve-session`/`assert-session-found` guard) worked correctly on **all 3 approval attempts** — the session was created once at submission with `format='carousel'` set correctly from the start (unlike the single-post bug, the carousel INSERT never had this defect), and was correctly re-read by the recovery SELECT identically on every attempt. **Zero Postgres-related errors occurred in this fire.** The one real bug found in 14-03 (Meta's fetcher intermittently failing to download 1-2 of 5 `rehost-service` slide URLs, `9004/2207052`) is unrelated to Postgres, the Supabase→Azure migration, or session persistence in any way — it sits entirely in the IG carousel child-container creation step, three layers downstream of any database interaction.

**Conclusion:** Both live-fires are clean on the Postgres-migration dimension specifically. The single formats's pre-existing migration bug (found and fixed in 14-02) is resolved with no recurrence. The carousel format's migration-era code path (`save-session-carousel` INSERT + recovery) has now been live-fire-proven correct for the first time since Phase 12.3, with zero defects found. **Criterion 3 is satisfied — clean v1.2/Postgres-migration baseline declared for v1.3 work to build on.**

---

## 11. Task 5 Visual-Confirmation Issue Report — Investigation & Diagnosis

**User report (Task 5 checkpoint):**
- Instagram: CORRECT — 5 slides appear as one swipeable carousel.
- Facebook: user reports it does NOT look like a carousel — appears as "cinco fotos separadas o cinco posteos separados" (five separate photos / five separate posts) on the Page.

**Status: BLOCKED pending user decision. No fix applied, no posts deleted, Task 6 NOT started.**

### Investigation performed

1. **Live Graph API GET on the FB post itself** (`GET /v22.0/981931321668013_122133770775238849?fields=id,message,created_time,attachments{media_type,type,subattachments,url}`, direct `META_PAGE_TOKEN`):
   - Returned **exactly ONE post object** (`id: "981931321668013_122133770775238849"`), matching the single `post_id` captured in Task 4.
   - `attachments.data[0].media_type: "album"`, `type: "album"`, containing `subattachments.data` with all **5** photos (ids `122133770535238849`, `122133770613238849`, `122133770583238849`, `122133770667238849`, `122133770559238849` — exactly the 5 unpublished-photo IDs from Task 4's `📤 FB: Upload Photo Unpublished` step).
   - This is the documented Graph API shape for a multi-photo Page post created via `POST /{page}/feed` + `attached_media` — **one post, `media_type=album`, N subattachments.**

2. **Live GET on the Page's recent posts** (`GET /981931321668013/posts?fields=id,message,created_time&limit=10`):
   - Returned exactly **ONE** entry for this run (`981931321668013_122133770775238849`), followed by 9 older, unrelated posts. **Not five separate feed posts.**

3. **Live GET on the Page's uploaded photos** (`GET /981931321668013/photos?type=uploaded`):
   - The same 5 photo IDs each have their own individually browsable permalink (`facebook.com/photo.php?fbid=...`). This is standard, expected Meta behavior for any multi-photo album post — each photo inside an album is also individually addressable — and is almost certainly what the user saw when clicking through the Page (individual photo permalinks look like "separate posts" even though they all belong to one album/post object).

**Conclusion of the API-level check: this is backend-confirmed as ONE Facebook post (`media_type: album`) containing all 5 images, not five separate posts.** The "looks like five separate photos" perception is a **rendering/UX characteristic of Facebook's native multi-photo album layout** (grid/mosaic display in the News Feed and Page timeline, and individually-clickable photos within it) — not a pipeline defect.

### Root cause / classification

**PRE-EXISTING DESIGN from Phase 7 (v1.1, 2026-04-17) — NOT a Postgres-migration regression, NOT a regression introduced by any Phase 14 deploy.**

Evidence:
- `07-RESEARCH.md` (Pattern 2, "FB Multi-Photo Post via `attached_media`", written 2026-04-17) explicitly documents this exact mechanism as the *only* organic (non-Ads) way to publish multiple photos in one Facebook Page post: `N × POST /{page}/photos?published=false` → single `POST /{page}/feed` with `attached_media`. Meta's Graph API has **no organic equivalent to Instagram's single-frame swipeable carousel** — that UX (one photo visible at a time, swipe for next) is exclusive to Instagram and to Facebook **Ads** (Marketing API carousel ads, a completely different product/endpoint). For organic Page feed posts, `attached_media` is Meta's only mechanism, and Meta renders it as an album/grid, not a swipeable single-view carousel.
- `07-VERIFICATION.md` (Phase 7 close, 2026-04-17) already recorded FB output for this exact mechanism as "FB multi-photo post" (never called a "carousel" in Meta's own terminology) and marked it VERIFIED/SATISFIED against requirement FBPUB-02, which itself is phrased as "FB carousel via `attached_media`" — the requirement's own name uses "carousel" loosely; Meta's actual behavior was always the album/grid rendering, confirmed unchanged today.
- **Zero code changes to any FB carousel-branch node across Phase 14.** `git log` + node-by-node diff confirm: Plan 14-01 touched only 2 hashtag-comment error-output connections (IG side); Plan 14-02 touched only the single-post `save-session-supabase` INSERT query text; this plan (14-03) touched only `🖼️ IG: Create Child Container`'s retry parameters (IG side). No `FB:` node (`fb-explode-carousel-slides`, `fb-upload-photo-unpublished`, `fb-collect-photo-ids`, `fb-build-attached-media`, `fb-publish-carousel-feed`) has been modified since Phase 7 (commit `566e1f9`, 2026-04-17).
- The FB carousel branch was UNREACHABLE from 2026-04-17 until this very run (blocked by the dead-end hashtag-comment error routing that 14-01 fixed) — meaning **today's exec (`1792783`) is the very first live execution of this FB code path since it was written**, so there is no "before" baseline where it rendered differently. There is no regression to compare against; this is the code's first-ever live behavior, matching its original 07-RESEARCH.md design exactly.

### Recommendation

- This is a **Meta platform capability limitation**, not a bug: Facebook's Graph API has no organic single-frame swipeable carousel format. The pipeline is using the only mechanism Meta offers (`attached_media` multi-photo album post) exactly as designed and researched in Phase 7.
- **Do not fix in this phase.** There is no alternative Graph API call that produces an Instagram-style swipeable carousel on organic Facebook Page posts — building anything "better" here is not possible without moving to Facebook Ads/Marketing API (an entirely different product, paid placement, out of scope).
- ROADMAP Phase 14 Success Criterion 2 ("the carousel publishes to both Instagram and Facebook") is satisfied at the technical/API level — one verifiable FB post exists containing all 5 images, exactly as `attached_media` is designed to produce. The criterion does not require FB's rendering to visually match Instagram's swipe UX (Meta itself does not support that for organic posts).
- Suggest logging this as a documented, permanent product limitation (e.g., a note in `CLAUDE.md` or `REQUIREMENTS.md`'s Future Requirements / Known Limitations section) so future users/checkpoints aren't surprised by FB's album rendering — not as an actionable v1.3 requirement, since there is no code fix available.

### Awaiting user decision

Presented to user: this is confirmed pre-existing Meta-platform behavior (single post, `media_type: album`, all 5 photos attached — verified via direct Graph API GET), unchanged since Phase 7, not a Postgres-migration or Phase-14 regression. Options:
1. **Accept as expected/known behavior** — proceed to Task 6 (cleanup) and Task 7 (sign-off) treating Facebook's album rendering as correct-per-Meta's-API-limits; document the limitation and close the phase.
2. Request something else be investigated/changed (though per the above, no alternative Graph API mechanism exists for organic posts).

No deletion has been performed. No further tasks executed pending this decision.

---

*To be appended after Tasks 5 (resolution)-6: user decision on the above, cleanup results, and the compiled pending-IG-manual-deletion list across both fires.*
