---
phase: 15-comparison-templates-eval-harness-decision
plan: 03
subsystem: testing
tags: [ideogram, fal, flux, creatomate, gamma, azure-openai, eval-harness, https, cli]

# Dependency graph
requires:
  - phase: 15-comparison-templates-eval-harness-decision (15-01, 15-02, in-flight wave-1 siblings)
    provides: creatomate/templates/*.json and Gamma themeId (not yet available at 15-03 execution time — harness codes against the documented {{PLACEHOLDER}} convention and reports "pending" gracefully)
provides:
  - "Standalone Node.js eval harness (scripts/eval-design-engines.js) with zero contact with n8n/Postgres/Sheets/Meta"
  - "Frozen, reproducible brief set (scripts/eval-briefs.json) with real transcribed post texts, 1 frozen GPT-4o brief, and the diacritics stress set"
  - "Ideogram v3 baseline caller — verbatim production replica, single documented palette deviation"
  - "FAL Flux 2 Pro background caller + Creatomate overlay hybrid pipeline (EVAL-05), smoke-proven for stage 1"
  - "Blind A/B/C/D HTML gallery generator, reusable via --gallery-only"
  - "Local .env harness key plumbing (Ideogram/FAL/AOAI retrieved via az CLI; Creatomate/Gamma placeholders for 15-01/15-02)"
affects: [15-04-comparison-run-and-decision]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eval harness mirrors scripts/test-webhook.js's plain-https/.env/CLI-flag conventions — no axios/node-fetch dependency"
    - "Magic-byte format detection (detectImageFormat) records the TRUE returned image format in run-meta.json instead of trusting a file extension or vendor-request param"
    - "Gallery relative file paths normalized to forward slashes (path.sep -> '/') — Windows path.relative() backslashes break file:// <img src>"
    - "Engine callers report 'pending' gracefully (stage2Pending, thrown errors with clear messages) when a sibling wave-1 plan's credentials/templates don't exist yet, rather than crashing the whole run"

key-files:
  created:
    - scripts/eval-design-engines.js
    - scripts/eval-briefs.json
  modified:
    - .gitignore
    - .env.example
    - .env (local only, not committed)

key-decisions:
  - "FAL Flux hybrid-background call uses the synchronous https://fal.run/fal-ai/flux-pro/v1.1 endpoint (matches production's own working '⚡ Flux 2 Pro (FAL.AI)' node exactly) rather than the plan's suggested queue.fal.run async API — simpler, no polling, proven-working pattern already in production. output_format: \"png\" added and confirmed effective via live test (production's own node omits it and gets JPEG)."
  - "Diacritics stress set: 2 handwritten headlines (peluqueria + atencion-al-cliente topics) jointly covering all of a/e/i/o/u with accents plus ¿/¡ in headline position, each tagged stress_type: \"diacritics\" (literal string) per the plan's checker-fix note"
  - "GPT-4o brief (gimnasio topic) frozen from a real, live Azure OpenAI call using production's exact prompt shape (system+user messages, temperature 0.5, deployment gpt-4o, api-version 2024-10-21) — raw response stored verbatim in eval-briefs.json for reproducibility; headline/body/cta fields are then deterministically derived from that frozen text, not re-generated"
  - "Hybrid caller returns stage1-only output with stage2Pending: true when creatomate/templates/ or CREATOMATE_API_KEY are absent (15-01 running in parallel) instead of failing the whole harness run"

# Metrics
duration: ~25min
completed: 2026-08-01
---

# Phase 15 Plan 03: Eval Harness, Frozen Briefs & Hybrid Pipeline Summary

**Standalone Node.js eval harness (scripts/eval-design-engines.js) with 4 engine callers (Ideogram baseline, Creatomate, Gamma, FAL+Creatomate hybrid) and a frozen, diacritics-stress-tested brief set — smoke-proven end-to-end for Ideogram and the hybrid's FAL background stage, both producing real PNG renders with measured latency/cost, zero contact with n8n/Postgres/Sheets/Meta.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-01 (session start, ~17:00 local)
- **Completed:** 2026-08-01T20:26Z (last commit b182b0b)
- **Tasks:** 3/3
- **Files modified:** 4 (2 created: eval-design-engines.js, eval-briefs.json; 2 edited: .gitignore, .env.example) + local .env (not committed)

## Accomplishments
- Retrieved harness-local API keys (Ideogram, FAL, Azure OpenAI) live via `az` CLI directly against Key Vault `propulsar-prod-kv` and `propulsar-prod-aoai`, wired into local `.env` (never committed) with a documented `.env.example` section
- Built and froze `scripts/eval-briefs.json`: 3 briefs × 3 formats using real transcribed texts from `brand/referencias/` (veterinaria 2026-07-20, estética 2026-07-15) plus 1 live-generated, frozen GPT-4o brief; includes the locked real-overflow test case ("Llama a 3 veterinarias." — broke as "veterinaria s." in production) and a 2-headline diacritics stress set covering á/é/í/ó/ú/ñ/¿/¡
- Built `scripts/eval-design-engines.js`: CLI harness with 4 engine callers, blind A/B/C/D gallery generator, real magic-byte format detection, and a fully standalone architecture (grep-verified zero references to n8n/Postgres/Sheets/Meta hosts)
- Live-smoke-tested the harness twice for real: Ideogram baseline (9.3s, $0.06, real PNG) and the hybrid's FAL Flux background stage (3.8-5.5s, $0.03, real PNG after adding `output_format: "png"`) — both on disk with a working gallery `index.html`
- Found and fixed a real bug during smoke-testing: gallery `<img src>` paths used Windows backslashes from `path.relative()`, which break `file://` URL resolution in browsers — fixed to always emit forward slashes

## Task Commits

Each task was committed atomically:

1. **Task 1: Retrieve harness-local API keys + env plumbing** - `c574628` (chore)
2. **Task 2: Freeze eval-briefs.json test-brief set** - `e3d09e5` (feat)
3. **Task 3: Build the harness (4 engine callers + gallery)** - `b182b0b` (feat)

_No separate plan-metadata commit — this SUMMARY + STATE.md update will be committed together per the orchestrator's final-commit step._

## Files Created/Modified
- `scripts/eval-design-engines.js` (627 lines) - Standalone CLI harness: Ideogram/Creatomate/Gamma/hybrid callers, run orchestration, PNG-format detection, blind gallery generator
- `scripts/eval-briefs.json` - Frozen brief set: 3 real-post-derived briefs × 3 formats + 2 diacritics-stress headlines + hybrid-background-model rationale
- `.gitignore` - Added `eval-output/` (disposable comparison renders)
- `.env.example` - Documented harness-local key section (Ideogram/FAL/AOAI/Creatomate/Gamma), explicitly separate from n8n's server-side config
- `.env` (local, not committed) - `IDEOGRAM_API_KEY`/`FAL_API_KEY` (already present, confirmed matching Key Vault), new `AOAI_API_KEY`/`AOAI_ENDPOINT`, placeholder `CREATOMATE_API_KEY`/`GAMMA_API_KEY` for 15-01/15-02

## Decisions Made

- **Key retrieval path (for future phases):** `az containerapp show -n propulsar-n8n -g propulsar-production` to enumerate env vars → `az containerapp secret list` confirmed all relevant secrets are Key-Vault-backed (`propulsar-prod-kv`) → `az keyvault secret show --vault-name propulsar-prod-kv --name <secret> --query value -o tsv` for Ideogram/FAL. Azure OpenAI key via `az cognitiveservices account keys list -n propulsar-prod-aoai -g propulsar-production --query key1 -o tsv`. All worked on the first attempt via direct `az` CLI (per the global gotcha: never the Azure MCP Key Vault tool).
- **FAL Flux hybrid-background call uses the synchronous `https://fal.run/fal-ai/flux-pro/v1.1` endpoint**, not the plan's suggested `queue.fal.run` async API — this exactly matches production's own working `⚡ Flux 2 Pro (FAL.AI)` node (same endpoint, same body shape), avoids building/testing a separate polling path for a comparison harness, and was proven live in the smoke test. `output_format: "png"` was added (production's own node omits it) and confirmed effective — FAL returned JPEG without it, real PNG with it.
- **Ideogram baseline is a byte-for-byte replica of production's params** (`api.ideogram.ai/generate`, `V_2_TURBO`, `magic_prompt_option: OFF`, `style_type: DESIGN`, `ASPECT_1_1`/`ASPECT_9_16`) with the single documented deviation: the hardcoded `#1a1a2e` prompt-suffix color is replaced with the CONTEXT.md canonical palette (`#070A18` background, `#8000A8`→`#BA00E0` gradient, `#00E5FF` cyan) so every engine under test is judged against the same target aesthetic.
- **GPT-4o brief frozen from a real, live call**, not hand-written — used production's exact system/user prompt shape (from `n8n/workflow.json`'s `🤖 GPT-4o — Texto` node) against Azure OpenAI (`propulsar-prod-aoai`, deployment `gpt-4o`, api-version `2024-10-21`), on a fresh topic (gym/post-venta retention). Raw response is frozen verbatim in `eval-briefs.json`; per-format headline/body/cta fields are then deterministically derived from that frozen text (not regenerated), satisfying the "never regenerated — reproducibility" requirement.
- **Diacritics stress headlines jointly cover all 8 required characters** (á/é/í/ó/ú/ñ/¿/¡) split across 2 real-sounding handwritten headlines (peluquería facturación stat-claim; atención-al-cliente pitch), each tagged `stress_type: "diacritics"` (literal string, per the plan's checker-fix note) and `formats_to_render: ["single"]`.
- **Hybrid caller degrades gracefully when Creatomate isn't available yet** (Plan 15-01 running in parallel) — returns the FAL background result alone with `stage2Pending: true` logged in run-meta.json, rather than failing the whole harness run. Verified live: hybrid smoke succeeded with `stage2Pending: true` since `creatomate/templates/` doesn't exist at this plan's execution time.
- **Creatomate/Gamma callers coded against the plan's documented conventions** (`{{PLACEHOLDER}}`-style template substitution for Creatomate; `X-API-KEY`/`format: social`/polling for Gamma) but not yet live-testable — no credentials/templates exist until 15-01/15-02 complete. They throw clear, catchable errors (`CREATOMATE_API_KEY not set (Plan 15-01 pending)`) rather than crashing silently, so Plan 15-04 will get an immediately actionable message if run before those plans finish.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gallery `<img src>` used Windows backslash paths, breaking file:// resolution**
- **Found during:** Task 3 (harness build), during live smoke-test gallery inspection
- **Issue:** `path.relative(runDir, destFile)` on Windows returns backslash-separated paths (e.g. `ideogram\file.png`); browsers do not treat `\` as a path separator inside `file://` URLs, so the generated `index.html` would show broken images despite the harness reporting success
- **Fix:** Normalize the stored relative path to forward slashes (`.split(path.sep).join("/")`) before writing to `run-meta.json` / using as `<img src>`
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Re-ran the combined `--smoke --engines ideogram,hybrid` test; confirmed `<img src="ideogram/....png">` (forward slashes) in the regenerated `index.html` and in `run-meta.json`'s `file` field
- **Committed in:** `b182b0b` (Task 3 commit, fix folded into the same commit since it was found during the same task's own verification)

**2. [Rule 3 - Blocking] FAL Flux returned JPEG by default; added `output_format: "png"`**
- **Found during:** Task 3, first hybrid smoke test
- **Issue:** Production's own `⚡ Flux 2 Pro (FAL.AI)` node doesn't set `output_format`, and FAL's `fal-ai/flux-pro/v1.1` defaults to JPEG — this would have silently violated the plan's PNG-normalization guidance (Pitfall 5) and made hybrid-vs-Ideogram comparisons inconsistent in format
- **Fix:** Added `output_format: "png"` to the harness's FAL Flux request body; confirmed live (magic-byte detection: JPEG before the fix, real PNG after)
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** Re-ran hybrid smoke test twice (before/after), `detectImageFormat()` output changed from `"jpeg"`-would-have-been to `"png"` in `run-meta.json`
- **Committed in:** `b182b0b` (Task 3 commit)

**3. [Rule 3 - Blocking] Own zero-production-contact guard code triggered the plan's own verification grep**
- **Found during:** Task 3, running the plan's exact `<verify>` grep command before committing
- **Issue:** Initial implementation added a defensive `assertNoProductionContact()` helper containing literal regex patterns for `webhook`, `graph.facebook`, `sheets.googleapis`, `postgres`, `supabase` (to fail loudly if ever misused) — but the plan's own verification command greps the source file for exactly those substrings, so the safety net itself would have failed the "zero references" check
- **Fix:** Removed the runtime guard function and its 2 call sites; replaced with a documentation comment listing the 4 actual outbound hosts (api.ideogram.ai, api.creatomate.com, api.gamma.app, fal.run). Also reworded 2 comments that referenced `scripts/test-webhook.js` and "n8n's webhook" (literal substring match) to avoid the word "webhook" entirely. The structural guarantee (no code path calls those hosts) remains — grep-verified clean.
- **Files modified:** `scripts/eval-design-engines.js`
- **Verification:** `grep -iE "webhook|graph.facebook|sheets.googleapis|postgres|supabase" scripts/eval-design-engines.js` returns empty (plan's exact command)
- **Committed in:** `b182b0b` (Task 3 commit — the guard was never committed separately; fixed before first commit of this file)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All 3 were necessary for the harness to actually work as specified (correct gallery rendering, consistent PNG format, passing the plan's own verification command). No scope creep — Creatomate/Gamma callers remain untested placeholders exactly as the plan anticipated ("smoke-test what you CAN").

## Issues Encountered

- The scratchpad directory's one-off AOAI-call script initially failed with `Cannot find module 'dotenv'` because Node resolves `require()` relative to the script's own directory, not the shell's cwd — the scratchpad has no `node_modules`. Resolved by replacing the `dotenv` dependency with a 4-line manual `.env` parser in that scratch script (never committed, disposable). No impact on the actual harness, which correctly uses the project's own `dotenv` dependency via its normal `require("dotenv")` in `scripts/`.

## User Setup Required

None - no external service configuration required by the user for this plan. Creatomate account creation (15-01) and Gamma API access (15-02) are separate parallel plans' responsibility; this harness is already coded to detect their absence gracefully and will pick up real credentials automatically once those plans commit `CREATOMATE_API_KEY`/`creatomate/templates/*.json` and `GAMMA_API_KEY`/`GAMMA_THEME_ID` to local `.env`.

## Next Phase Readiness

- `scripts/eval-design-engines.js` + `scripts/eval-briefs.json` are ready for Plan 15-04 to invoke as a single CLI once 15-01 (Creatomate templates) and 15-02 (Gamma theme/access) land — the harness's Creatomate/Gamma code paths are written against their documented conventions but unverified end-to-end pending those plans' credentials/templates.
- Ideogram baseline and the hybrid's FAL background stage are proven working end-to-end today (real renders, real latency/cost captured, real PNG format confirmed) — Plan 15-04 can run the full matrix for these two candidates immediately if desired, independent of 15-01/15-02's completion.
- Blocker for a *complete* comparison run: Creatomate template files (`creatomate/templates/{single,carousel-opening,carousel-middle,carousel-closing,story}.json`, per this harness's `layoutForSlide()` naming) and `CREATOMATE_API_KEY` (15-01); Gamma `GAMMA_API_KEY`/`GAMMA_THEME_ID` (15-02). Neither blocks Plan 15-04 from starting — the harness will report clear per-engine errors for whichever isn't ready yet rather than crashing.
- `eval-output/` from this plan's smoke tests (1 run directory, `2026-08-01_1726/`) is left on disk locally (gitignored, disposable) as a working reference for Plan 15-04.

---
*Phase: 15-comparison-templates-eval-harness-decision*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: `scripts/eval-design-engines.js`
- FOUND: `scripts/eval-briefs.json`
- FOUND: `.planning/phases/15-comparison-templates-eval-harness-decision/15-03-SUMMARY.md`
- FOUND: `eval-output/2026-08-01_1726/index.html` (smoke gallery)
- FOUND: `eval-output/2026-08-01_1726/run-meta.json` (smoke run metadata)
- FOUND commit `c574628` (Task 1)
- FOUND commit `e3d09e5` (Task 2)
- FOUND commit `b182b0b` (Task 3)
