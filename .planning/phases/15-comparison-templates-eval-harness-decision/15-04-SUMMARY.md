---
phase: 15-comparison-templates-eval-harness-decision
plan: 04
subsystem: testing
tags: [ideogram, creatomate, gamma, fal, flux, eval-harness, blind-gallery, rubric-scoring]

# Dependency graph
requires:
  - phase: 15-comparison-templates-eval-harness-decision (15-01, 15-02, 15-03)
    provides: Creatomate brand templates + trial account, Gamma API access + brand theme, standalone eval harness + frozen brief set
provides:
  - "One complete, evidence-rich comparison run (eval-output/2026-08-02_1510/) — all 4 engines x all 3 briefs x all 3 formats + diacritics stress, 63/63 renders succeeded, zero errors"
  - "Real, empirically-answered Gamma carousel-mapping question (Open Question 2 / Pitfall 6): one generation with cardSplit:inputTextBreaks + \\n---\\n delimiters produces N ordered card PNGs"
  - "A leak-free blind A/B/C/D gallery (index.html) with the anonymization mapping recorded in run-meta.json"
  - "Claude's proposed weighted rubric scores (rubric-scores.json) with per-criterion evidence citations, weighted totals, and vs-Ideogram visual deltas — no winner declared"
  - "5 real bugs found and fixed in the wave-1 harness (Gamma base URL/export/zip-format/tar-binary/scratch-dir-collision; Creatomate's missing background source; 3 gallery identity-leak vectors)"
affects: [15-05-blind-review-and-decision]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gamma carousels render via ONE batched generation call (cardSplit:inputTextBreaks, \\n---\\n-joined card text), not one call per slide like the other 3 engines — renderGammaCarouselBatch() fans the N-card export back into per-slide result entries"
    - "Standalone Creatomate uses a deterministic, zero-cost, seeded Lorem Picsum placeholder as its background (Creatomate has no image-gen of its own) — isolates typography/auto-fit/brand-fidelity testing from AI-image quality"
    - "Blind gallery images are copied into neutral blind/<label>/ folders and referenced by <img src> instead of the real per-engine folder — the anonymization mapping lives only in run-meta.json and the HTML's reveal-toggle script, never in any pre-reveal DOM attribute or file path"
    - "Windows' bundled bsdtar (C:\\Windows\\System32\\tar.exe) is invoked by absolute path for zip extraction — Git-for-Windows' tar.exe (GNU tar, earlier on PATH) does not support zip"

key-files:
  created:
    - eval-output/2026-08-02_1510/ (gitignored — 63 renders across ideogram/creatomate/gamma/hybrid, run-meta.json, index.html, briefs.json, rubric-scores.json, blind/)
  modified:
    - scripts/eval-design-engines.js
    - .env (local only, added GAMMA_THEME_ID)
    - .env.example

key-decisions:
  - "Standalone Creatomate's background source: deterministic seeded Lorem Picsum placeholder (zero cost, keeps the matrix within the ~$3 hard-cost ceiling) rather than reusing FAL Flux (which would have made 'creatomate' and 'hybrid' the same pipeline) or Ideogram's output (which bakes in text, unusable as a clean background)"
  - "Gamma calls use textMode:'preserve' (not the default AI-rewrite mode) to keep the frozen brand copy verbatim where possible, and exportAs:'png' (missing in the wave-1 code, without which no export ever completes) — preserve mode also costs ~18-42 credits/generation vs the default's ~40-42, and Gamma's real workspace balance is ~5800+ credits (not the ~2000 documented in 15-02), so Gamma is not a budget constraint for this or future runs"
  - "Pre-reveal blind-gallery leaks go beyond file paths: Gamma's costNote text format ('N credits' vs the other 3 engines' '~$0.0X') was ALSO an identity signal even after removing the literal vendor name — fixed by hiding the entire latency/cost meta line until reveal, which also better matches CONTEXT.md's intent of a purely-visual first pass"
  - "29 of ~34 remaining Creatomate trial credits were needed and used for the full run (17 native + 12 hybrid-stage-2) — no trim was necessary, but the margin was real, not padded"

# Metrics
duration: ~70min
completed: 2026-08-02
---

# Phase 15 Plan 04: Full Comparison Matrix, Blind Gallery & Proposed Rubric Scores Summary

**63/63 renders succeeded across Ideogram/Creatomate/Gamma/Hybrid (3 briefs x 3 formats + diacritics stress), producing a leak-free blind gallery and evidence-backed weighted scores showing all 3 new candidates clearly beat Ideogram on visual criteria — Creatomate and Hybrid dominate all 4 individual visual criteria.**

## Performance

- **Duration:** ~70 min
- **Started:** 2026-08-02 (session start, context load)
- **Completed:** 2026-08-02T18:31:00Z
- **Tasks:** 3/3 (preflight, full matrix run, blind gallery + rubric scoring)
- **Files modified:** 3 (scripts/eval-design-engines.js x2 commits, .env.example, .env local-only)
- **Renders produced:** 63 (17 ideogram, 17 creatomate, 17 gamma, 12 hybrid) — 0 errors

## Accomplishments

- **Task 1 (Preflight):** Found and fixed 6 real bugs in the wave-1 harness before spending trial credits: Gamma's base URL (`api.gamma.app` 404s; correct is `public-api.gamma.app`), a missing `exportAs:"png"` param (without which Gamma never returns an export URL), Windows' GNU-tar-vs-bsdtar zip-extraction mismatch, a shared scratch-directory bug that could leak stale PNGs between sequential Gamma calls, and — the highest-impact finding — that standalone Creatomate had no background image source at all (`backgroundUrl: null`), which would have broken every image-based template render. Also empirically answered the Gamma carousel-mapping open question: one generation with `cardSplit:"inputTextBreaks"` + `\n---\n`-joined text produces N ordered card PNGs from a single call.
- **Task 2 (Full matrix):** Ran the complete comparison — 3 briefs x 3 formats x 4 engines + 2 diacritics-stress headlines x 4 engines = 63 renders, 0 errors, 0 skipped-as-failed (12 hybrid renders legitimately skip closing-slide/no-image layouts per the brief's own `background_prompt: null` flags — an honest "not applicable," not a gap).
- **Task 3 (Blind gallery + scoring):** Found and fixed 3 separate pre-reveal identity-leak vectors in the wave-1 gallery generator (image `<img src>` paths, `data-engine` DOM attributes, and Gamma's vendor-named cost text) before generating the final gallery. Read through 25+ renders directly (all 8 diacritics-stress renders, both full veterinaria/estetica carousel sequences across all 4 engines, representative singles/stories from every engine) and wrote `rubric-scores.json`: 7 criteria x 4 candidates, each score backed by a specific render filename or run-meta number, weighted totals, and vs-Ideogram visual deltas. No winner declared (that's 15-05's job).

## Task Commits

1. **Task 1: Preflight fixes (Gamma base URL/export/carousel-batch, Creatomate placeholder background)** - `8db992e` (fix)
2. **Task 3: Blind-gallery leak fixes (image paths, DOM attributes, cost-text format)** - `5920f35` (fix)

_Task 2 (running the matrix) produced no code changes — pure execution, no commit needed. `.env`'s local-only `GAMMA_THEME_ID` addition (Task 1) is not tracked in git._

**Plan metadata:** committed together with this SUMMARY + STATE.md update per the orchestrator's final-commit step.

## Files Created/Modified

- `scripts/eval-design-engines.js` - Gamma base URL/export/carousel-batch/zip-extraction fixes, Creatomate placeholder-background fix, blind-gallery leak fixes (image paths, DOM attributes, cost-text format), blind mapping now persisted to run-meta.json
- `.env.example` - documented `GAMMA_THEME_ID`
- `.env` (local only) - added `GAMMA_THEME_ID=ergo9wmo77nbvra` (was documented in 15-02-GAMMA-ACCESS.md but never actually added — callGamma() was silently omitting it on every call)
- `eval-output/2026-08-02_1510/` (gitignored, local disk) - the full comparison run: `run-meta.json` (latency/cost/blind-mapping for all 63 renders), `briefs.json` (frozen brief copy), `index.html` (blind gallery), `rubric-scores.json` (proposed scores), `blind/{a,b,c,d}/` (anonymized image copies), `{ideogram,creatomate,gamma,hybrid}/*.png` (63 renders)

## Decisions Made

- **Standalone Creatomate's background source is a deterministic, zero-cost, seeded Lorem Picsum placeholder** — the only sensible zero-budget-impact fix for a real gap (Creatomate has no image-generation capability, and EVAL-03 requires it as its own distinct candidate, not collapsed into the same pipeline as EVAL-05's Flux+Creatomate hybrid). Documented in code comments and `rubric-scores.json`'s methodology notes; scores judge text/typography/color fidelity, not background relevance.
- **Gamma calls use `textMode:"preserve"` + `exportAs:"png"` + `cardSplit:"inputTextBreaks"`** — empirically required/beneficial parameters discovered this session, none of which were in the wave-1 code. `textMode:"preserve"` also turned out cheaper (~18 credits/generation) than the default AI-rewrite mode (~40-42 credits).
- **Gamma's real workspace credit balance is ~5800+, not the ~2000 documented in `15-02-GAMMA-ACCESS.md`** — not a budget constraint for this or any near-term future comparison run.
- **Credit budget arithmetic logged, no trim needed:** ~29 Creatomate credits were required (17 native + 12 hybrid-stage-2) against an estimated ~34 remaining after preflight's own test renders — used, not trimmed, with a real (not padded) ~5-credit margin.
- **Blind-gallery leak surface is broader than file paths alone** — cost/latency metadata FORMAT (credits vs dollars) can itself identify an engine even with the vendor name removed; fixed by hiding the whole meta line until reveal, which doubles as a better methodological fit (pure visual pass, per CONTEXT.md's "blind first" intent).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gamma base URL was wrong (`api.gamma.app` instead of `public-api.gamma.app`)**
- **Found during:** Task 1, credential sanity check
- **Issue:** The wave-1 harness's `callGamma()` posted to `https://api.gamma.app/v1.0/generations`, which 404s. The correct, working base (confirmed live, matching `15-02-GAMMA-ACCESS.md`) is `https://public-api.gamma.app`.
- **Fix:** Both the generation-create and poll URLs corrected.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Live `GET https://public-api.gamma.app/v1.0/themes` returned 200 with the real API key; the harness's own smoke test then succeeded end-to-end.
- **Committed in:** `8db992e`

**2. [Rule 3 - Blocking] Gamma create body was missing `exportAs:"png"` entirely**
- **Found during:** Task 1, Gamma carousel probe
- **Issue:** Without `exportAs`, no `exportUrl` ever appears in the poll response — every single Gamma call in the wave-1 code would have hung until the 180s timeout and failed.
- **Fix:** Added `exportAs:"png"` (plus `textMode:"preserve"` and `cardSplit:"inputTextBreaks"`, both also missing/wrong) to the request body.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Live test generations returned real `exportUrl` values after the fix; all 17 Task-2 Gamma renders succeeded.
- **Committed in:** `8db992e`

**3. [Rule 1 - Bug] Zip extraction used Git-for-Windows' GNU tar instead of Windows' bsdtar**
- **Found during:** Task 1, first live Gamma export download
- **Issue:** `execSync("tar -xf ...")` resolved to `C:\Program Files\Git\usr\bin\tar.exe` (GNU tar, no zip support) ahead of `C:\Windows\System32\tar.exe` (bsdtar, zip-capable) on this machine's PATH, failing with "This does not look like a tar archive."
- **Fix:** `extractZip()` now invokes `C:\Windows\System32\tar.exe` by absolute path on `win32`.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Multi-card zip extraction succeeded (4 PNGs from a 4-card probe generation, correctly ordered).
- **Committed in:** `8db992e`

**4. [Rule 1 - Bug] Single-card Gamma exports return a bare PNG, not a zip — code assumed every export was a zip**
- **Found during:** Task 1, harness smoke test (`--smoke --engines gamma`)
- **Issue:** `extractZip()` crashed with "Unrecognized archive format" on a real (non-zip) PNG file downloaded from a single-card generation's `exportUrl`.
- **Fix:** `downloadToFile`'s magic-byte detection now branches: if the downloaded file is already a PNG, use it directly; only run `extractZip` for actual zip responses (multi-card batches).
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Re-ran the smoke test; single-card Gamma render succeeded end-to-end.
- **Committed in:** `8db992e`

**5. [Rule 1 - Bug] Every sequential Gamma call reused the same `_raw` scratch directory**
- **Found during:** Task 1 code review, before it could cause a real data-corruption incident
- **Issue:** `path.join(outDir, "gamma", "_raw")` was shared across every Gamma call in a run — PNGs from an earlier call could linger and be picked up by a later call's file-selection logic.
- **Fix:** Each call now gets a unique per-unit (or per-carousel-batch) scratch directory.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Task 2's full run produced exactly the expected file per Gamma call, no cross-contamination observed across 17 Gamma renders.
- **Committed in:** `8db992e`

**6. [Rule 2 - Missing Critical] Standalone Creatomate had no background image source (`backgroundUrl: null`)**
- **Found during:** Task 1, template inspection
- **Issue:** The 5 brand templates (15-01) all require a real photo URL for image-based layouts; the wave-1 `renderOneUnit()` passed `null`, which would have rendered every image-based Creatomate template with a broken/empty image element.
- **Fix:** Added `placeholderBackgroundUrl()` — a deterministic, zero-cost, seeded Lorem Picsum URL per render unit — since Creatomate has no image-generation capability of its own and reusing FAL/Ideogram outputs would either collapse the "creatomate" candidate into "hybrid" or double-bake text.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** All 17 native Creatomate renders (including image-based layouts) succeeded with real, visible background photos.
- **Committed in:** `8db992e`

**7. [Rule 2 - Missing Critical] Blind gallery leaked engine identity via 3 separate vectors**
- **Found during:** Task 3, pre-scoring gallery inspection (the plan's own explicit requirement to verify "not inferable from file paths")
- **Issue:** (a) `<img src>` embedded the real per-engine folder name (e.g. `ideogram/....png`); (b) `<td data-engine="...">`/`<th data-engine="...">` carried the real engine name in a DOM attribute from page load, independent of the reveal toggle; (c) Gamma's `costNote` text ("N gamma credits") was visible pre-reveal, and even after removing the vendor name, the credits-vs-dollars FORMAT alone remained a usable identity signal.
- **Fix:** Images copied into neutral `blind/<label>/` folders; cells/headers carry only neutral `data-label` attributes with the real mapping resolved client-side from a JS-only `reverseLabelMap`; the entire latency/cost meta line is now CSS-hidden until reveal; the anonymization mapping is also persisted into `run-meta.json` (`meta.blindMapping`) as a durable, independently-auditable artifact.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Regenerated the gallery and confirmed 0 occurrences of any of the 4 engine names anywhere in the pre-`<script>` HTML; all 63 `<img>` references resolve on disk.
- **Committed in:** `5920f35`

---

**Total deviations:** 7 auto-fixed (5 bugs, 2 missing-critical)
**Impact on plan:** All 7 were necessary for the matrix to run at all (Gamma would have failed on every call; Creatomate would have rendered broken images) or for the blind review to actually be blind (the gallery leaks would have compromised the whole point of Plan 15-05's blind-first pass). No scope creep — the plan's own Task 1/3 instructions explicitly anticipated finding and fixing exactly these classes of issues before/during execution.

## Issues Encountered

None beyond the deviations documented above — all findings were resolved inline and verified before proceeding to the next task.

## User Setup Required

None. `GAMMA_THEME_ID` was added to local `.env` (not committed) using the value already documented in `15-02-GAMMA-ACCESS.md` — no new external service configuration needed.

## Next Phase Readiness

- `eval-output/2026-08-02_1510/index.html` is ready for Felix and Susana's blind review in Plan 15-05: open the file, score blind (labels A/B/C/D only, reveal-toggle button hidden until clicked), then click "Revelar motores" to see real identities and `rubric-scores.json`'s evidence-backed proposals.
- All 4 engines rendered every applicable brief/format — the matrix is complete with 0 gaps and 0 undocumented skips.
- `rubric-scores.json`'s proposed weighted totals: Creatomate 99/110, Hybrid 95/110, Gamma 72/110, Ideogram (baseline) 51/110. All 3 new candidates clearly beat Ideogram on the weighted visual criteria (deltas +50/+50/+32); Creatomate and Hybrid additionally dominate Ideogram on all 4 individual visual criteria (the CONTEXT.md bar for considering full replacement, not just coexistence) — but per this plan's explicit scope, NO winner is declared here; that determination, plus any user-adjusted scores, belongs to Plan 15-05.
- Known caveats carried into 15-05: the gimnasio-gpt4o brief's Ideogram render uses a different source-text field than the other 3 engines (documented in `rubric-scores.json`'s methodology_notes — reflects real production behavior, not a harness bug); Creatomate's real post-trial pricing is still unconfirmed (only the ~$0.02/render harness estimate exists); Gamma's ~216EUR/yr subscription cost has no free-tier alternative on this account.

---
*Phase: 15-comparison-templates-eval-harness-decision*
*Completed: 2026-08-02*

## Self-Check: PASSED

- FOUND: `scripts/eval-design-engines.js`
- FOUND: `eval-output/2026-08-02_1510/run-meta.json`
- FOUND: `eval-output/2026-08-02_1510/index.html`
- FOUND: `eval-output/2026-08-02_1510/rubric-scores.json`
- FOUND: `.planning/phases/15-comparison-templates-eval-harness-decision/15-04-SUMMARY.md`
- FOUND commit `8db992e` (Task 1 preflight fixes)
- FOUND commit `5920f35` (Task 3 blind-gallery leak fixes)
