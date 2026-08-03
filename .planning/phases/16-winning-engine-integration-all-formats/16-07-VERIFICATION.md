# Plan 16-07 — Live-fire 1: Single post (INTEG-02) — Verification Evidence

**Plan:** 16-07 (Live-fire 1 of 3: single → carousel → story, locked order)
**Started:** 2026-08-03T15:23:06Z

---

## Task 1 — Pre-fire re-verification

Re-verification-before-fire (locked discipline), run fresh at plan start rather than trusting 16-06's recorded state.

### Check 1 — Main workflow versionId + zero-drift vs repo

- `GET /api/v1/workflows/Qql7mvYRxKBsPZ5t` → `versionId: 8b87219d-69e3-41b1-bd63-9af9e3369ec9`, `active: true`, node count `98`.
- Matches 16-06's deployed versionId (`8b87219d`) exactly — **no deploy landed in between.**
- Full node-by-node diff (live vs. `n8n/workflow.json`, comparing `type`/`typeVersion`/`parameters`/`credentials` per node id): 98 = 98 node ids, **0 body diffs**, connections object byte-identical, `active:true`.

**Result: PASS — zero drift.**

### Check 2 — Hybrid sub-workflow GET matches repo

- `GET /api/v1/workflows/YegOtsUONrRx7v2J` → `versionId: c966f86e-b8cf-446b-b052-05314c8e8643` (new versionId vs. 16-06's, expected — it changed when the sub-workflow was activated during 16-06's deploy fix), `active: true`, node count `15`.
- Full node-by-node diff (live vs. `n8n/subworkflow-hybrid-image.json`): 15 = 15 node ids, **0 body diffs**, connections object byte-identical, `active:true`.

**Result: PASS — zero drift.**

### Check 3 — CREATOMATE_API_KEY present on Container App

- `az containerapp show --name propulsar-n8n` → `env[].CREATOMATE_API_KEY.secretRef = "creatomate-api-key"` present.
- `az containerapp secret list --name propulsar-n8n` → secret `creatomate-api-key` present, backed by Key Vault reference `https://propulsar-prod-kv.vault.azure.net/secrets/creatomate-api-key` (system-assigned managed identity).

**Result: PASS.**

### Check 4 — Workflow active

- Confirmed in Check 1: `active: true`.

**Result: PASS.**

### Check 5 — Budget line (start of this plan)

Cumulative Phase 16 spend through 16-06 (per `16-06-SUMMARY.md`/STATE.md):
- Flux: ~$1.02 of ~$3.00 phase budget
- Creatomate: ~43 of 2000/month (Essential plan)

**Expected fire cost this plan:** 1 Flux render (~$0.03) + 1 Creatomate credit (single-layout render, no carousel/story overhead).

**Projected after this fire:** ~$1.05 Flux, ~44 Creatomate credits — both comfortably within budget.

---

**All 5 pre-fire checks PASS. Production state proven identical to the verified 16-06 deploy — safe to fire.**

---

## Task 2 — Fire the single post (AWAITING USER)

Status: pending. See checkpoint returned to orchestrator.
