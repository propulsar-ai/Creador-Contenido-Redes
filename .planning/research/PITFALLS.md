# Pitfalls Research — v1.3 Diseño Premium

**Domain:** Adding a template/design-engine rendering path (Gamma, Creatomate, Remotion) to an existing, shipped n8n social-media publishing pipeline (Propulsar Content Engine)
**Researched:** 2026-08-01
**Confidence:** MEDIUM-HIGH (official docs verified for Gamma/Creatomate/Remotion licensing; project-specific integration risks HIGH — grounded in this repo's own n8n 2.14.2 constraints and prior Meta CDN/format incidents)

---

## Key Findings

**CRITICAL 1 — Gamma's API is deck-generation-first, not single-image-first, and this shapes both cost and workflow shape.** Gamma's Generate API (GA since Nov 2025) does support `"format": "social"` with `cardOptions.dimensions` of exactly `1x1`, `4x5`, `9x16` — the three ratios this pipeline needs. But the underlying primitive is a **generation** (a "deck," even a 1-card one), billed in credits per generation (~40 credits for a from-prompt generation on Pro), not per finished image like Ideogram's flat $0.06. For single-post format this is likely far more expensive per image than Ideogram; for carousels it may be *cheaper* per slide (many cards per one generation charge) — but this must be measured, not assumed, per format.

**CRITICAL 2 — Gamma has no webhooks; Creatomate does.** Gamma's docs show polling-only (`GET /v1.0/generations/{id}`), recommending a 5-second poll interval. n8n 2.14.2's Wait node has a **65-second floor before execution state persists to DB** (documented project constraint). A naive "wait 5s, check, repeat" loop either (a) violates the 65s floor and risks losing in-flight executions on Azure Container Apps restarts, or (b) requires batching multiple checks inside one longer Wait, adding real latency (Gamma generations take 1-3 min typically). Creatomate, by contrast, supports native webhooks — a fundamentally different integration shape that changes how the phase should be architected (webhook-resume workflow vs poll loop).

**CRITICAL 3 — Remotion's automation license, not its company-size threshold, is what applies here.** Propulsar.ai is a 2-person company, comfortably under Remotion's "4+ personnel" Company License threshold — but that threshold is irrelevant to this project. Remotion's own FAQ classifies **any code that programmatically calls `renderMedia()`** (which is exactly what an n8n → render-service call does) as "Remotion for Automators," billed at **$0.01/render with a $100/month minimum spend**, regardless of headcount or self-hosting. Assuming "we're a 2-person shop, we qualify for free" is the trap — company size and automation-use are two independent gates, and this project trips the second one.

**CRITICAL 4 — Design-engine PNG exports collide with Meta's documented JPEG-only + alpha-channel gotcha.** Meta's IG Graph API docs state images must be JPEG; Gamma's social export delivers a `.zip` of PNGs (one per card), and Creatomate defaults can go either way. This pipeline has *already* shipped PNG (`output_format: "png"`) from Flux through `rehost-service` (which does zero image processing — pure passthrough by extension/Content-Type) directly to Meta without incident, so PNG-to-Meta is evidently tolerated in practice today. The **new, untested risk** is not "PNG vs JPEG" per se but **alpha-channel transparency**: template/design engines are far more likely than a diffusion image model to emit RGBA PNGs with transparent regions (e.g., card backgrounds, cutout shapes). When Meta (or any JPEG converter) flattens an RGBA PNG, the alpha gets filled with an implementation-defined color — commonly black or white, not necessarily brand `#1a1a2e`. Because the brand background is already dark, a wrong-color fill could look "close enough" and ship unnoticed for months before someone spots a jarring pure-black or pure-white artifact on a lighter template.

**CRITICAL 5 — Remotion self-hosted rendering doesn't fit any of this project's existing infra without new decisions.** Remotion is AWS-Lambda-native by default (`@remotion/lambda`); this project is exclusively Azure (per global CLAUDE.md: Azure Container Apps / Functions only, Hostinger VPS reserved for `rehost-service`). Self-hosted Remotion rendering (`@remotion/renderer`) needs headless Chromium — a heavy, stateful, CPU/RAM-hungry process that fails this project's own Function-vs-Container-App decision table ("cold start inaceptable," "dependencias pesadas: mejor evitar" for Functions) and doesn't belong on the lightweight Hostinger VPS currently running `rehost-service` (a thin Express passthrough, not designed for headless-browser workloads).

---

## Full Pitfall Catalogue

### Pitfall 1: Gamma API — presentation/deck framing produces per-generation pricing surprises

**What goes wrong:**
Treating Gamma like "an image API with an extra `format` param" leads to assuming cost scales like Ideogram (flat $ per finished image). In reality billing is per-generation in credits, and a single-post use case (1 card) may not be materially cheaper than a 10-card carousel use case in credits — meaning the *effective* cost-per-image for single posts could be several multiples of Ideogram's $0.06, while carousels might land near or below it.

**Why it happens:**
Gamma's core product is decks/presentations; "social" is one export mode bolted onto that primitive. Vendor pricing pages emphasize "credits per plan," not "$ per finished social image," so the true unit economics only surface once you do a live generation and read the `credits` field in the completed response.

**How to avoid:**
During the comparison phase, run at least 3 real generations per format (single, carousel-5-slide, story) through Gamma and record the actual `credits` consumed and the plan's $/credit. Build a per-format cost table before deciding whether Gamma coexists with or replaces Ideogram — don't extrapolate from vendor marketing pages.

**Warning signs:**
Comparison phase only tests carousel (Gamma's best case) and skips single-post cost measurement; monthly credit allotment quietly exhausted mid-month by single-post generations.

**Phase to address:** Comparison/technical-analysis phase (quality + cost measured together, per format).

---

### Pitfall 2: Gamma's polling-only async model breaks against n8n 2.14.2's Wait-node floor

**What goes wrong:**
Implementing Gamma's recommended "poll every 5s" pattern literally in n8n either creates Wait nodes under the 65s persistence floor (execution state not saved — a mid-poll Azure Container App restart silently drops the whole content-generation run) or spins in a tight Code-node loop without a Wait node at all (blocks the workflow execution slot, burns n8n execution time, and can hit Gamma's rate-limit headers `x-ratelimit-remaining*`).

**Why it happens:**
Vendor docs are written assuming a normal server-side loop (Node script, Lambda, etc.), not a workflow engine with its own persistence quirks. It's easy to copy the vendor's polling cadence without checking it against this project's already-documented n8n constraint.

**How to avoid:**
Use the same bounded Wait→IF→loop-back pattern already proven for Meta container polling in this project (`⏳ IG: Wait 30s Carousel` style nodes), but set Wait amount to a value ≥65s, and cap total loop iterations (e.g., max 6 iterations ≈ 6-8 min) with an explicit timeout branch that fails cleanly to the existing WA error-notification path rather than looping forever.

**Warning signs:**
Executions vanish from n8n's execution list with no error; Gamma generations that take >90s never complete within the workflow; repeated `x-ratelimit-remaining` near zero in Gamma responses.

**Phase to address:** Engine-integration phase (whichever phase wires the winning engine into the n8n image router) — needs its own polling-loop design task, reusable pattern documented for future async-render integrations.

---

### Pitfall 3: Remotion automation-license misclassification

**What goes wrong:**
Assuming Propulsar's 2-person headcount automatically qualifies for Remotion's free/Creators tier, then shipping an n8n-triggered render service that is, by Remotion's own license FAQ, definitionally "Remotion for Automators" ($0.01/render, $100/month minimum spend) — an unbudgeted recurring cost discovered only when Remotion's team reaches out or the terms are audited later.

**Why it happens:**
The "4+ personnel" Company License threshold is the most visible/searched licensing fact about Remotion; the separate Automators tier (triggered by *how* the code is invoked — programmatically vs. interactively — not by company size) is a less-publicized, easy-to-miss clause.

**How to avoid:**
If Remotion is a comparison candidate, budget the Automators tier ($100/month minimum, i.e., ~10,000 renders/month included at $0.01 each) into the cost comparison from the start, not as a surprise after a "free" pilot. Confirm current terms directly against `remotion.dev/docs/license/faq` and `/docs/license/terms` before committing (license terms can change between versions — this research reflects the terms as published at research time).

**Warning signs:**
Cost comparison spreadsheet treats Remotion as "$0" because "we're under the company-size threshold"; no line item for render volume × $0.01 or the $100/month floor.

**Phase to address:** Comparison/technical-analysis phase (licensing cost must be part of the decision matrix, not discovered post-decision).

---

### Pitfall 4: Remotion hosting — no fitting slot in existing infra decision tree

**What goes wrong:**
Remotion rendering (headless Chromium via `@remotion/renderer`) gets bolted onto whichever compute happens to be "available" (e.g., squeezed onto the Hostinger VPS next to `rehost-service`, or an Azure Function) without going through this project's own Function-vs-Container-App checklist, leading to OOM crashes, multi-second-to-minute cold starts, or resource contention with the already-load-bearing `rehost-service`.

**Why it happens:**
Remotion's own docs are Lambda/Vercel/Cloud-Run-centric (all non-Azure), so there's no ready-made "how to deploy this on Azure" recipe to follow, and the path of least resistance is reusing whatever server is already SSH-accessible (the Hostinger VPS).

**How to avoid:**
If Remotion wins the comparison, run it through the standard decision table explicitly: constant-ish trigger volume + heavy dependency (headless browser) + latency not critical (async render) → **Azure Container App**, sized with enough memory for Chromium (historically ≥2-4GB recommended by Remotion for headless rendering), deployed as its own resource (`propulsar-<cliente>-ca-remotion-render` naming convention), NOT layered onto the existing Hostinger VPS which is a thin passthrough service with its own mount-durability fragility already documented (Docker Swarm mount re-attach runbook).

**Warning signs:**
Render service sharing a VPS process pool with `rehost-service`; render times inconsistent or degrading as carousel volume grows; VPS memory alarms.

**Phase to address:** Engine-integration phase (if Remotion wins) — infra provisioning as its own task, not an afterthought bolted onto image-router wiring.

---

### Pitfall 5: PNG alpha-channel flattening produces unpredictable fill color on Meta's side

**What goes wrong:**
A design-engine export (Gamma social PNG, or a Creatomate/Remotion composition with a transparent or semi-transparent layer) reaches Meta's media container endpoint as RGBA PNG. Meta's JPEG conversion strips alpha and fills it with an implementation-defined color that is not guaranteed to be brand `#1a1a2e` or even a fixed color at all. On the dark brand background this can look "fine enough" and go unnoticed, then surface as a jarring black/white patch on a template variant with lighter accent areas.

**Why it happens:**
Diffusion image models (Ideogram, Flux, Nano Banana) generate flat, fully-opaque raster output by construction — there was never an alpha channel to worry about in this pipeline before. Design/template engines routinely composite semi-transparent layers (drop shadows, gradient overlays, cutout badges) that DO carry real alpha data, and it's invisible in a design-tool preview (which renders alpha correctly) but not in the final Meta-side JPEG.

**How to avoid:**
Force fully-opaque, flattened output at export time (most template engines have a "flatten"/"no alpha"/output as JPEG-not-PNG option — prefer requesting JPEG output directly from the engine when available, e.g., Creatomate's `output_format: "jpg"`, instead of relying on Meta's undocumented conversion behavior). For any engine that only exports PNG (Gamma), add an explicit flatten-to-opaque step (composite onto the brand's dark background color) before handing the URL to `rehost-service`.

**Warning signs:**
Any card/template with a lighter background color or a badge/shadow element; visual QA only checked on the dark-background templates and never on lighter/alternate brand accent templates.

**Phase to address:** Engine-integration phase — add an explicit "flatten/opaque export" verification step to the image-generation node(s), independent of which engine wins.

---

### Pitfall 6: Text auto-fit still overflows or unreadably shrinks on worst-case Spanish headlines

**What goes wrong:**
Auto-fit modes (Creatomate's min/max font size auto-sizing, Gamma's `textOptions.amount`, Remotion's manual measure-and-shrink code) are validated against short demo copy during the comparison phase, then break in production on GPT-4o-generated Spanish headlines that run long — Spanish text is routinely 15-25% longer than equivalent English for the same meaning, and headlines with `¿`/`¡` punctuation and accented capitals (Á, É, Í, Ó, Ú, Ñ) add extra glyph width most demo fonts weren't stress-tested with. Auto-fit either shrinks below the minimum readable font size (defeating the point of a "premium typography" engine) or clips/truncates.

**Why it happens:**
Comparison testing naturally gravitates toward cherry-picked short, clean example headlines ("Automatiza tu negocio hoy") rather than the actual distribution of GPT-4o output, which can include longer conversational hooks, question headlines, or stat callouts with extra digits/symbols.

**How to avoid:**
Pull 10-20 *real* headline/caption strings already generated by this pipeline's GPT-4o node in past executions (n8n execution history or Sheets log) — including the longest ones — and run those specific strings through each engine's auto-fit during the comparison, not synthetic short copy. Explicitly test at least one deliberately long (40+ character) headline with `¿`/`¡` and full accents per format (single/carousel/story).

**Warning signs:**
Comparison phase report shows only 1-2 example outputs per engine, all short; no minimum-font-size floor documented per template; no test string containing `ñ`, `¿`, or a stacked accented capital.

**Phase to address:** Comparison/technical-analysis phase — must be an explicit test-matrix requirement, not left implicit.

---

### Pitfall 7: Bundled/display fonts missing Spanish-required glyphs

**What goes wrong:**
A visually striking bold display font is picked for the "premium typography" look, but the font's character set doesn't include `ñ`, acute-accented vowels, or `¿¡` — rendering as a missing-glyph box (tofu), a fallback system font mid-headline, or (worse) the accent silently dropped ("años" → "aos").

**Why it happens:**
Many premium/display fonts marketed for English headline design ship with only basic Latin (no Latin Extended-A) glyph coverage — this is invisible until Spanish-specific characters are actually rendered, and template galleries rarely flag glyph coverage.

**How to avoid:**
Before adopting any font (whether via Remotion's bundled Google Fonts package, Creatomate's font library, or Gamma's theme fonts), explicitly render a test string containing all of `ñ Ñ á é í ó ú Á É Í Ó Ú ¿ ¡` and visually confirm every glyph renders — don't rely on the font's marketing preview, which is usually English-only.

**Warning signs:**
Font preview thumbnails in the engine's UI show only English sample text; comparison phase screenshots never contain `ñ` or accented capitals.

**Phase to address:** Comparison/technical-analysis phase (font selection gate) — carried into engine-integration phase as a locked font choice.

---

### Pitfall 8: Cherry-picked single-output comparison biases the engine decision

**What goes wrong:**
The comparison concludes "Engine X wins" based on one hand-picked best-case render per engine (often the vendor's own showcase-style prompt), when in production the pipeline needs consistent quality across dozens of auto-generated topics/angles without human curation at generation time (the human only approves/rejects via WhatsApp SI/NO — they don't retry-and-pick).

**Why it happens:**
It's natural (and faster) to run each engine once, eyeball the nicest result, and move on — especially under time pressure to "just pick one." Diffusion models like Ideogram already have an implicit retry-until-good workflow in most people's mental model; template engines are more deterministic per-input but still vary with real GPT-4o-generated copy of varying length/content.

**How to avoid:**
Run a fixed batch (minimum 5-8 real, already-logged briefs pulled from Sheets/execution history, covering all 3 content types — educational/authority/case_study — and worst-case-length copy from Pitfall 6) through every engine and Ideogram baseline. Score on a consistent rubric (text legibility, brand color accuracy, layout consistency, Spanish glyph correctness) across the whole batch, not a single favorite.

**Warning signs:**
Comparison report contains fewer than 5 samples per engine; no explicit "worst case" sample; decision rationale cites one screenshot per engine.

**Phase to address:** Comparison/technical-analysis phase — batch size and rubric should be a stated success criterion for that phase's plan.

---

### Pitfall 9: Re-hosting a design-engine's own CDN URL instead of routing through `rehost-service`

**What goes wrong:**
Gamma's `exportUrl`, Creatomate's render output URL, or a Remotion render-service's own storage URL gets wired directly into the Meta media container `image_url` field (it "just works" in initial testing because Meta briefly caches or the test happens fast), then fails intermittently or entirely once Meta's fetcher hits rate limits, auth requirements, or an outright host block on that third-party CDN — mirroring exactly what already happened with Azure Blob and Azure Front Door in this project.

**Why it happens:**
Every one of these engines returns a working, publicly-fetchable URL as part of its API response, so it's tempting to treat that as "done" and skip an extra re-hosting hop that looks redundant.

**How to avoid:**
Treat `rehost-service` as the **only** Meta-facing image origin, full stop — every new engine's output must be downloaded server-side (n8n or the render service itself) and re-uploaded to `rehost-service` before any Meta API call touches it, exactly like the existing Ideogram/Flux/Nano Banana flow. Do not assume a new vendor's CDN is Meta-compatible just because it responds 200 to a browser — this project has direct proof (`Phase 12.1`, rolled back) that "looks publicly accessible" is not sufficient evidence.

**Warning signs:**
Any new HTTP Request node whose URL points at `gamma.app`, `creatomate.com`, or a Remotion render-service's storage bucket being passed straight into a Meta `media` container creation call.

**Phase to address:** Engine-integration phase — this is a hard architectural rule, should be a named checklist item in that phase's plan.

---

### Pitfall 10: Creatomate/Gamma webhook or community-node install assumptions on a locked-down Azure Container Apps n8n

**What goes wrong:**
Assuming Creatomate's native webhook or a community n8n node (e.g., the official `n8n-nodes-gamma` package) can be toggled on from the n8n UI, when this project's n8n instance runs as a custom container image on Azure Container Apps — community package installation typically requires `N8N_COMMUNITY_PACKAGES_ENABLED=true` baked into the image/environment and a redeploy, not a runtime UI action, and self-hosted webhook receivers need a publicly reachable, already-known n8n webhook URL (same domain as the existing Wizard webhook trigger) plus signature/secret verification so a spoofed "render complete" callback can't fake an approval-ready state.

**Why it happens:**
Community nodes and webhooks "just work" in local/desktop n8n tutorials; the gap between that and a hardened, custom-deployed Azure Container App is easy to underestimate, especially since this project already has hard-won operational knowledge about n8n-on-Azure quirks (patch-based deploys, credential re-linking) that a new integration must inherit.

**How to avoid:**
Default to plain HTTP Request nodes calling each vendor's REST API directly (proven pattern already used for FAL.AI/Ideogram) rather than installing vendor community nodes, unless there's a strong reason to add the deployment complexity. If a webhook-driven design (Creatomate) is chosen, add basic signature/secret validation on the receiving n8n webhook and confirm the callback URL matches the project's stable public n8n hostname before wiring it to any auto-continue logic.

**Warning signs:**
A plan step says "install n8n-nodes-gamma" without a corresponding Azure Container App redeploy step; a webhook node accepts any inbound POST as a valid "render succeeded" signal with no shared-secret check.

**Phase to address:** Engine-integration phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Skip a dedicated flatten/opaque-export step, trust Meta's PNG conversion | Fewer nodes to build | Silent black/white artifacts on lighter templates, hard to notice until a client/Susana flags it | Never for production; okay only during comparison-phase manual review with human eyes on every sample |
| Poll Gamma with a single long Wait instead of a proper bounded loop | Simple to build fast | Either wastes minutes of latency per post (worst-case wait) or times out on slow generations with no graceful failure | Acceptable for the comparison/prototype phase only, not for the shipped engine-integration phase |
| Reuse `rehost-service` code path unchanged for the new engine's output | Zero new infra | If the new engine's file sizes are much larger (e.g., multi-MB PNG carousels), untested against `rehost-service`'s current storage/mount limits | Acceptable short-term if file sizes are verified comparable to existing Ideogram/Flux outputs first |
| Pick one "safe" font without full Spanish glyph testing during comparison, fix later | Faster comparison phase | Re-render/re-test cycle after production headlines reveal missing glyphs | Never — glyph testing is cheap (one test string), do it during comparison |
| Treat the comparison-phase render service as ephemeral (delete after decision) | No idle Azure/Remotion cost | Have to rebuild render infra decisions from scratch when going from prototype to shipped integration | Acceptable only for Remotion/Creatomate spike testing, not once an engine is chosen to ship |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Gamma Generate API | Assume real-time/sync response like Ideogram | Async generation (`POST /generations` → poll `GET /generations/{id}`); typically 1-3 min; build bounded Wait/IF loop respecting n8n's 65s floor |
| Gamma social export | Assume free-form pixel dimensions | Only `1x1`, `4x5`, `9x16` accepted via `cardOptions.dimensions`; invalid values silently fall back to format default with a warning in the response — always check the response for that warning |
| Gamma pricing | Assume flat $-per-image like Ideogram | Credit-based per-generation billing; measure actual `credits` field per format before comparing cost |
| Creatomate render | Poll aggressively (tight loop) | Use Creatomate's native webhook, POST to a signed/secret-validated n8n webhook endpoint instead of polling |
| Creatomate text elements | Assume default text box already auto-fits | Auto-fit is opt-in per element (must explicitly set sizing mode + min/max font size in the template) |
| Remotion | Assume Lambda is usable | This project is Azure-only; Remotion Lambda is AWS-specific — self-host on Azure Container App or reconsider |
| Remotion licensing | Assume 2-person company = free tier | Programmatic/automated calls trigger the separate "Automators" license ($0.01/render, $100/mo min) regardless of headcount |
| Meta media container (any engine) | Point `image_url` at the vendor's own CDN/export URL | Always re-host through the existing `rehost-service` on Hostinger VPS first — proven Meta-accepted origin |
| Meta media container, PNG output | Assume PNG "just works" because Flux PNG has shipped fine | Verify per-engine: check for alpha-channel/transparency specifically, not just file extension |
| n8n community nodes on Azure Container Apps | Install via n8n UI at runtime | Requires `N8N_COMMUNITY_PACKAGES_ENABLED` + image rebuild/redeploy; default to plain HTTP Request nodes instead where feasible |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Gamma/Creatomate render latency added to the WhatsApp-preview path | User waits noticeably longer for SI/NO preview than with Ideogram (near-instant) | Measure end-to-end latency per engine during comparison; consider whether preview should show a "generating..." interim message | Breaks UX once render time exceeds ~30-60s per image, common for Gamma multi-card decks |
| Remotion cold start on Azure Container App scaled to zero | First render of the day/session takes many seconds longer (headless Chromium boot) | Set `minReplicas=1` on the render Container App if render frequency justifies always-on cost, or accept and communicate the cold-start latency | Breaks noticeably once posting cadence is sparse (few posts/day) and Container App scales to zero between runs |
| Carousel = N sequential engine calls (same pattern as current Ideogram sequential loop) | N-slide carousel render time scales linearly, same risk profile as existing 45s-wait carousel issue that caused exec 117 failure | Reuse the already-proven sequential-with-adequate-wait pattern; don't assume a new engine is faster without measuring | Breaks at carousels with 6+ slides if per-slide render time is materially higher than Ideogram's |
| Creatomate 30-day render auto-delete | Render URL still referenced somewhere (retry logic, audit log) after 30 days, now 404s | Re-host through `rehost-service` immediately (already required by Pitfall 9) so nothing downstream depends on Creatomate's own render URL past initial fetch | Breaks only if something incorrectly stores the raw Creatomate URL long-term instead of the rehosted one |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoding Gamma/Creatomate/Remotion API keys in n8n Code nodes or workflow JSON instead of Key Vault-backed credentials | Key leakage on workflow export/share, inconsistent with this project's existing Azure Key Vault discipline | Store new vendor API keys in `propulsar-prod-kv`, reference via n8n credential store like existing AOAI/FAL/Ideogram keys |
| Accepting any inbound POST to a new Creatomate webhook endpoint as a valid "render complete" signal | A spoofed callback could push a low-quality or attacker-controlled image URL into the approval/publish chain | Validate Creatomate's webhook signature/secret before trusting the payload; never auto-advance to WhatsApp preview without validation |
| Passing a design-engine's render URL directly to WhatsApp preview or Meta publish without re-fetching through `rehost-service` | Vendor URL could change ownership/expire/be replaced out-of-band between preview approval and publish (time-of-check to time-of-use gap) | Re-host once, immediately after render completes, before any downstream step references the image |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| WhatsApp preview shows a lower-fidelity or differently-cropped version of the image than what actually publishes | Susana/Felix approve based on a preview that doesn't match the live post, eroding trust in the SI/NO gate | Preview must be the exact rehosted image bytes that will be published, not a vendor preview/thumbnail URL |
| Long render times (Gamma/Creatomate multi-card) with no interim feedback in WhatsApp | User assumes the Wizard hung or failed, may re-trigger a duplicate run | Consider an interim "generando diseño premium, esto puede tardar hasta X min" WA message before the final preview, especially if p95 render time exceeds ~30s |
| Inconsistent visual quality across formats (e.g., story looks premium, carousel still falls back to Ideogram) without clear labeling | Confusing brand experience if coexistence (not full replacement) is the outcome | If Ideogram is kept for some formats and a new engine for others, make that split an explicit, documented decision — not an accidental gap |

---

## "Looks Done But Isn't" Checklist

- [ ] **Gamma/Creatomate image router node:** Often missing the explicit opaque/flatten export step — verify no alpha channel reaches Meta by inspecting the actual re-hosted file's color/alpha info, not just eyeballing a preview
- [ ] **Async polling loop (Gamma):** Often missing an iteration cap/timeout branch — verify a forced-failure test (simulate a stuck generation) routes to the existing WA error-notification path instead of looping indefinitely
- [ ] **Font selection:** Often missing full Spanish glyph verification — verify by rendering `ñ Ñ á é í ó ú ¿ ¡` through the actual chosen font, not the vendor's English preview
- [ ] **Cost comparison:** Often missing real per-format credit/render cost — verify by reading the actual `credits`/render-cost field from a live API response per format, not the vendor's marketing pricing page
- [ ] **Re-hosting:** Often missing for the new engine specifically — verify every new-engine image URL that reaches WhatsApp or Meta traces back through `rehost-service`, confirmed by checking the hostname in the final `image_url`
- [ ] **Remotion licensing (if chosen):** Often missing the Automators-tier budget line — verify the cost comparison explicitly includes $0.01/render + $100/month minimum, not $0
- [ ] **Worst-case text testing:** Often missing entirely — verify at least one test render per engine used a real long GPT-4o headline with accents/¿¡, not a short demo string

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| PNG alpha-channel artifact discovered live on a published post | MEDIUM | Post is already live (Meta doesn't allow media edits) — delete/redo for feed posts is possible via Graph API; for Stories it is **not** deletable via API (existing project constraint) and must be manually deleted in-app or left to expire; add the flatten step retroactively before next run |
| Gamma polling loop hangs/exceeds n8n execution timeout in production | LOW-MEDIUM | Add iteration cap + explicit timeout branch (same fix as prevention); no data loss if session state already persists to Azure PostgreSQL before the render call |
| Remotion Automators bill arrives higher than expected mid-comparison | LOW | Pause/cancel further Remotion test renders; the $100/month minimum is a plan-level commitment — confirm billing cycle terms before running a large comparison batch, not after |
| New engine's CDN URL used directly in a Meta call and rejected (repeat of the Azure Blob/AFD incident) | LOW | Same fix already proven in this project: swap in `rehost-service` re-hosting step; no architecture change needed, just insert the existing sub-workflow pattern |
| Comparison decision made on cherry-picked samples, quality issues surface after integration | MEDIUM-HIGH | Re-run the batch/worst-case test matrix retroactively before doing a real Meta live-fire test; may require re-opening the comparison phase rather than patching the integration phase |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|---------------|
| 1. Gamma per-generation cost surprise | Comparison/technical-analysis phase | Per-format cost table built from real `credits` values, not vendor marketing pages |
| 2. Polling vs n8n 65s Wait floor | Engine-integration phase | Bounded Wait/IF loop with Wait amount ≥65s and an iteration cap present in the deployed workflow |
| 3. Remotion Automators license misclassification | Comparison/technical-analysis phase | Cost comparison spreadsheet includes a non-zero Remotion line item if Remotion is a candidate |
| 4. Remotion hosting doesn't fit existing infra | Engine-integration phase (only if Remotion wins) | New render service provisioned as its own named Azure Container App per project decision table, not layered onto Hostinger VPS |
| 5. PNG alpha-channel flattening | Engine-integration phase | Rehosted file inspected for alpha channel / forced-opaque export confirmed for every engine in use |
| 6. Text auto-fit worst-case failure | Comparison/technical-analysis phase | Test matrix includes ≥1 long real headline with accents/¿¡ per format per engine |
| 7. Missing Spanish glyphs in chosen font | Comparison/technical-analysis phase | Glyph test string rendered and visually confirmed before font is locked in |
| 8. Cherry-picked comparison bias | Comparison/technical-analysis phase | Batch of ≥5 real briefs per engine, consistent rubric, documented in the comparison report |
| 9. Vendor CDN URL bypassing `rehost-service` | Engine-integration phase | Final `image_url` sent to Meta traced to the `rehost-service` hostname, never the vendor's own domain |
| 10. Community-node/webhook assumptions on locked-down Azure n8n | Engine-integration phase | Plan step confirms deployment method (HTTP Request node vs community node + redeploy) before build starts; webhook receiver (if used) validates a shared secret |

---

## Sources

- Gamma Developer Docs — Getting Started, Generate API parameters, async/polling guide, access & pricing (developers.gamma.app) — HIGH (official docs, verified live)
- Gamma social format dimensions (`1x1`/`4x5`/`9x16`) and n8n integration example — MEDIUM (WebSearch-aggregated from Gamma docs + community n8n node references; not independently cross-checked against a raw API response in this session)
- Gamma pricing/credits figures (Pro $25/mo, 4,000 credits, ~40 credits/generation) — MEDIUM (third-party pricing-tracker sites, not Gamma's own pricing page directly fetched; treat as directionally correct, verify exact figures before finalizing budget)
- Creatomate API docs — render lifecycle, webhook setup, `output_format`, text auto-fit sizing modes (creatomate.com/docs) — HIGH (official docs)
- Remotion License Terms & FAQ (remotion.dev/docs/license/terms, /docs/license/faq) and Remotion Pro pricing page (remotion.pro) — HIGH (official docs), with the "n8n counts as Automators" conclusion at MEDIUM confidence (reasonable direct reading of the FAQ's own definition, but not a case explicitly named "n8n" in the source text)
- Remotion Lambda cost/cold-start docs (remotion.dev/docs/lambda/cost-example, /docs/compare-ssr) — HIGH (official docs)
- Meta Instagram Graph API media reference (developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media) — HIGH (official docs, directly fetched)
- PNG alpha-channel-to-JPEG flattening behavior — MEDIUM (general image-processing knowledge, not Meta-specific documentation; Meta's own exact fill-color behavior is undocumented and should be verified empirically)
- This project's own `.planning/research/PITFALLS.md` (v1.2), `PROJECT.md`, and `rehost-service/server.js` — HIGH (first-party, direct repo inspection) — source for all n8n 2.14.2 constraints (IF v1 only, no `require()`, 65s Wait floor), the Azure Blob/Front Door Meta-rejection precedent, and confirmation that `rehost-service` performs no image format conversion (pure passthrough)

---
*Pitfalls research for: Propulsar Content Engine v1.3 "Diseño Premium" — adding a template/design-engine rendering path to an existing automated social pipeline*
*Researched: 2026-08-01*
