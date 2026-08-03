---
phase: 15-comparison-templates-eval-harness-decision
verified: 2026-08-03T12:17:10Z
status: passed
score: 5/5 must-haves verified
---

# Phase 15: Comparison, Templates, Eval Harness & Decision Verification Report

**Phase Goal:** Produce a defensible, evidence-based decision on which design engine (if any) replaces or coexists with Ideogram, backed by real rendered output scored against a documented rubric -- not predetermined.
**Verified:** 2026-08-03T12:17:10Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Propulsar brand template/theme exists in both Creatomate and Gamma, matching the canonical brand spec (#070A18 base, Syne/Arimo) | VERIFIED | creatomate/templates/{single,carousel-opening,carousel-middle,carousel-closing,story}.json (5 files, all contain "Syne" + font_size_minimum/font_size_maximum auto-fit). Gamma theme themeId: ergo9wmo77nbvra, live-verified via GET /v1.0/themes?query=Propulsar, spec table in 15-02-GAMMA-ACCESS.md matches canonical palette/fonts exactly. |
| 2 | Standalone eval harness renders the same briefs through Creatomate, Gamma, Ideogram v3 baseline -- zero contact with n8n/content_sessions/Sheets/Meta | VERIFIED | scripts/eval-design-engines.js (866 lines) calls api.ideogram.ai/generate, api.creatomate.com/v1, public-api.gamma.app/v1.0, fal.run only. Grep for n8n/content_sessions/sheets/graph.facebook finds only sourcing comments (verbatim-copy provenance notes), no actual calls. Real run eval-output/2026-08-02_1510/ shows 63/63 successful renders (17 Ideogram + 17 Creatomate + 17 Gamma + 12 Hybrid), matching decision doc and SUMMARY claims exactly. |
| 3 | Diacritics stress set + two-stage hybrid variant included among rendered outputs | VERIFIED | scripts/eval-briefs.json contains diacritics-tagged briefs (accented vowels, n-tilde, inverted question/exclamation marks). Hybrid pipeline (FAL Flux 2 Pro background + Creatomate overlay) present in harness and produced 12 renders in the real run; evidence/hybrid/*.png archived. |
| 4 | Written decision doc scores all candidates on 7-criteria rubric, names winner + explicit Ideogram coexist-vs-replace call | VERIFIED | 15-DECISION.md (256 lines): full 7-criteria weighted rubric (section 2), Claude proposed scores (section 3), blind human scores (section 5, human-scores.json -- 17/68 votes cast, reveal 13s after finish), reconciled final scores (section 7), explicit winner test (section 8.1-8.3: Hybrid wins tie-break vs Gamma), explicit domination check per individual visual criterion (section 8.4) concluding full replacement of Ideogram with a documented risk-management fallback condition. Dual sign-off recorded section 9, dated 2026-08-03. |
| 5 | Remotion documented as cost-rejected (paper only, Automators license floor cited) with reconsideration trigger, no service built | VERIFIED | 15-DECISION.md section 4 cites $0.01/render + $100/month Automators floor, explicit reconsideration trigger (video/Reels, PREM-03). grep -ri remotion across the repo (excluding node_modules/.planning) returns zero hits -- no Remotion code/service exists. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| creatomate/templates/*.json (5 files) | Brand RenderScript templates | VERIFIED | All 5 present (note: carousel-slide1.json renamed to carousel-opening.json during authoring to match harness layoutForSlide() convention -- documented deviation in 15-01-SUMMARY.md, not a gap). All contain "Syne" + auto-fit font_size_minimum/maximum. |
| 15-02-GAMMA-ACCESS.md | themeId, trial/paid status, API confirmation | VERIFIED | themeId: ergo9wmo77nbvra, live-verified, full spec table matching canonical brand. |
| scripts/eval-design-engines.js | Eval harness CLI | VERIFIED | 866 lines, >200 min. Contains api.ideogram.ai/generate, V_2_TURBO, verbatim production param comments. |
| scripts/eval-briefs.json | Frozen brief set | VERIFIED | 249 lines, contains "diacritics" tag, real-post-derived briefs incl. veterinaria overflow case. |
| .gitignore eval-output exclusion | Local run output not committed | VERIFIED | eval-output/ present in .gitignore; eval-output/2026-08-02_1510/ exists locally (gitignored, 63 renders) with a committed evidence/ subset (8 PNGs + both score JSONs) -- matches the checker-approved design noted in task instructions. |
| 15-DECISION.md | Decision doc, dual-signed | VERIFIED | 256 lines, contains "Remotion" section, dual sign-off dated 2026-08-03. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| creatomate/templates/*.json | api.creatomate.com/v1/renders | inline source field | WIRED | 15-01-SUMMARY.md confirms /v1 resolved as working base URL (not /v2), live-smoke-rendered and user-approved. |
| 15-02-GAMMA-ACCESS.md themeId | api.gamma.app/v1.0/generations | themeId param | WIRED | Real run eval-output/2026-08-02_1510/gamma/ has 17 successful renders using this theme. |
| scripts/eval-design-engines.js | scripts/eval-briefs.json | loaded at startup (briefsPath) | WIRED | Line 122 path.join(__dirname, "eval-briefs.json"); briefs copied into every run dir. |
| scripts/eval-design-engines.js | n8n/workflow.json Ideogram params | verbatim V_2_TURBO/OFF/DESIGN copy | WIRED | Confirmed literal string matches in harness source, documented as intentional single-deviation replica. |
| scripts/eval-design-engines.js | creatomate/templates/*.json | reads template files, substitutes placeholders | WIRED | Lines 186-226 read creatomate/templates/<layout>.json, graceful "pending" error handling for missing Plan 15-01 output (resolved once 15-01 completed). |
| 15-DECISION.md scores | eval-output/<run>/rubric-scores.json + render files | evidence citations | WIRED | rubric-scores.json and human-scores.json (both in evidence/ and full eval-output/) are cited by filename throughout sections 3, 5, 7 with per-criterion evidence notes. |
| 15-DECISION.md winner call | Phase 16 ROADMAP entry | named engine gates INTEG-01..06 | WIRED | Section 8.5 explicitly states integration target (Hybrid = FAL Flux + Creatomate templates), STATE.md confirms Phase 16 unblocked and reads this decision. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|---|---|---|
| EVAL-01 (Creatomate brand template) | SATISFIED | 5 templates live-rendered, user-approved. |
| EVAL-02 (Gamma brand theme) | SATISFIED | themeId live-verified. |
| EVAL-03 (standalone harness) | SATISFIED | Zero-contact confirmed by grep + real 63-render run. |
| EVAL-04 (diacritics stress set) | SATISFIED | 2 diacritics briefs rendered by all 4 engines. |
| EVAL-05 (hybrid variant) | SATISFIED | 12 hybrid renders in real run, archived in evidence/. |
| EVAL-06 (7-criteria scored decision + winner/coexist call) | SATISFIED | 15-DECISION.md full rubric, winner named (Hybrid), explicit full-replacement call. |
| EVAL-07 (Remotion paper-only rejection) | SATISFIED | Cost analysis + reconsideration trigger documented, no service built. |

Note: .planning/REQUIREMENTS.md still shows EVAL-01..07 checkboxes as unchecked / "Pending" in its tracking table -- this is a stale tracking-doc artifact (STATE.md and the phase's own SUMMARY/DECISION docs are internally consistent and correctly reflect completion). Non-blocking for phase goal achievement; recommend syncing REQUIREMENTS.md checkboxes at the next convenient touch-point.

### Anti-Patterns Found

None. No TODO/FIXME/placeholder/stub patterns found in scripts/eval-design-engines.js, scripts/eval-briefs.json, or creatomate/templates/*.json beyond one legitimate, documented reference describing the intentional token-substitution convention (not an unfinished implementation). The Creatomate-standalone Lorem Picsum background is a deliberate, documented, zero-cost test isolation choice (Creatomate has no image-gen of its own), not a stub.

### Human Verification Required

None outstanding. All human-interaction checkpoints (Creatomate/Gamma account creation, brand-render approval, blind review session, dual sign-off) were completed with evidence captured in the docs per task instructions -- treated as satisfied, not re-verified here.

### Gaps Summary

No gaps found. All 5 ROADMAP success criteria are backed by real, wired, non-stub artifacts:
- Both vendor brand templates/themes exist and were live-verified against real API calls.
- The eval harness is genuinely standalone (grep-confirmed zero production contact) and produced a real, complete, zero-error 63-render matrix across all 4 engines/3 briefs/3 formats + diacritics stress.
- The decision document is thorough, evidence-cited, applies the locked decision rules mechanically and explains the one place (Creatomate standalone) where the rubric formula was overridden by real human engagement data, with a fully reasoned justification traceable to human-scores.json.
- Remotion was correctly kept paper-only with no code artifacts anywhere in the repo.
- Documented deviations (Gamma theme built manually due to Cloudflare/Google automation blocks, Susana's authorized paid Gamma Pro upgrade, Creatomate excluded from winner candidacy despite beating Ideogram numerically) are all within the explicitly pre-authorized "OK deviations" set from the verification brief.

---

*Verified: 2026-08-03T12:17:10Z*
*Verifier: Claude (gsd-verifier)*
