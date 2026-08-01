---
phase: 13-facebook-story-log-notifications
plan: 01
status: BLOCKED
subsystem: infra
tags: [supabase, postgres, azure, n8n, dns, outage]

# Dependency graph
requires:
  - phase: 12.2-hostinger-rehost
    provides: Durable Meta-facing image host (rehost-service on Hostinger VPS)
provides:
  - Live-fire diagnostic evidence that content_sessions' Supabase backend is fully gone (project deleted)
  - Confirmed blast radius: full pipeline outage across single/carousel/story, not Story-specific
affects: [13-facebook-story-log-notifications (all remaining plans), a-new-supabase-to-azure-postgres-migration-phase]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/13-facebook-story-log-notifications/13-01-BLOCKED.md
  modified:
    - .planning/STATE.md

key-decisions:
  - "User confirmed (Supabase dashboard, 2026-08-01): project wcjyayeyamyhrjqujhyv is PERMANENTLY DELETED, not paused."
  - "User chose to pull forward the Azure PostgreSQL migration for content_sessions NOW, as a new urgent inserted phase, rather than recreate the Supabase project."
  - "Phase 13 (13-02, 13-03) and this plan's remaining tasks (2-4) are PAUSED until the migration lands and a fresh successful live-fire execution exists."

patterns-established: []

# Metrics
duration: ~35min (Task 1 pre-flight + live-fire attempt + diagnosis, before pause)
completed: 2026-08-01
---

# Phase 13 Plan 01: FB Story Live-Fire Verification — BLOCKED Summary

**Task 1 pre-flight passed clean (zero drift), but the live-fire test (Task 2) surfaced a full-pipeline outage: the Supabase project backing `content_sessions` has been permanently deleted, so no webhook submission (single, carousel, or Story) can reach the WhatsApp preview step. Plan 13-01 cannot complete until session-state storage is migrated off Supabase.**

This is **not** a `SUMMARY.md` — the plan did not complete. Do not treat this as phase closure. Re-run `13-01-PLAN.md` (starting at Task 2) once the new Supabase→Azure Postgres migration phase lands.

## Performance

- **Duration:** ~35 min (pre-flight + live-fire attempt + diagnosis)
- **Started:** 2026-08-01T~06:30Z (Task 1 pre-flight)
- **Blocked at:** 2026-08-01T10:01:05Z (exec 1786295 stoppedAt)
- **Tasks:** 1 of 4 completed (Task 1 only); Task 2 attempted by user but the resulting execution errored before reaching any FB Story chain node
- **Files modified:** 0 code files (verification-only plan; no `n8n/workflow.json` edits). 2 docs files this close-out.

## What Happened

### Task 1: Pre-flight check — PASSED, all 4 checks clean

1. **Workflow state:** `GET /api/v1/workflows/Qql7mvYRxKBsPZ5t` → `active: true`, 91 nodes, `versionId: 7447171f-e8f5-4a48-a382-4a4b380c546c` (matches STATE.md's last recorded Plan 12.2-02 deploy — no drift since).
2. **FB Story chain node-by-node drift check:** All 7 nodes (`ig-compute-story-expiry`, `check-platforms-facebook`, `assert-fb-story-url`, `fb-fetch-ideogram-bytes`, `fb-upload-story-photo`, `fb-publish-photo-story`, `notify-wa-story`) compared byte-for-byte (remote GET vs. local `n8n/workflow.json`) on `type`/`typeVersion`/`parameters`/`onError`/`retryOnFail` — **all MATCH**. Connections wiring for the same 7 nodes (including the `¿Plataformas FB?` two-branch fan-out and both `onError → 🏷️ Tag FB Error` edges) also compared — **all MATCH**.
3. **Baseline execution check:** `GET /api/v1/executions?workflowId=Qql7mvYRxKBsPZ5t&limit=3` (and again filtered by `status=success`/`status=error`) → **empty** (`{"data":[],"nextCursor":null}`). Confirmed this workflow had zero executions in the queryable window prior to the live-fire attempt — any execution appearing afterward for this `workflowId` is unambiguously the test run.
4. **Container App env vars:** `az containerapp show --name propulsar-n8n` confirmed `FACEBOOK_PAGE_ID`, `META_PAGE_TOKEN`, `HOSTINGER_REHOST_BASE_URL`, `HOSTINGER_REHOST_API_KEY` all present (names only, no values printed).

**Verdict: environment was believed ready.** Pre-flight had no way to detect this failure mode — it checks the n8n workflow definition and Container App env var *names*, not the live reachability of every downstream third-party host the workflow calls at runtime. This is a legitimate gap for future pre-flight checks to consider (see Recommendation below).

### Task 2: Live-fire attempt — FAILED (infra outage, not an FB Story chain defect)

User (via an automated driver script) fired the Wizard for real at **2026-08-01 ~12:00 Madrid time** (10:00 UTC): topic "Automatizacion con IA para pymes: 3 procesos que puedes delegar hoy", type educational, format Historia (Story, 9:16), platforms `["instagram","facebook"]`, Ideogram v3, publish "ahora". Wizard printed `✓ Enviado a n8n!` and exited 0 — the webhook POST to n8n succeeded. **No WhatsApp preview ever arrived** at the approval number.

**Diagnosis:**

- **Execution id:** `1786295`
- **Status:** `error` (`finished: false`)
- **Mode:** `webhook`
- **Started:** `2026-08-01T10:00:48.704Z` — matches the user's reported approval time exactly.
- **Stopped:** `2026-08-01T10:01:05.091Z`
- **Nodes that DID execute successfully (10 total, in order):** `🎯 Webhook Trigger` → `✅ Responder al Wizard` → `🔀 ¿Carrusel?` → `🤖 GPT-4o — Texto` (real GPT-4o call, both IG + FB captions generated) → `🔧 Parsear contenido` → `✂️ Extract Hashtags (Single)` → `🖼️ ¿Imagen propia?` → `🔀 ¿Story?` → `🔤 Ideogram v3 — Story` (**real Ideogram image generated** — money spent) → `🔗 Normalizar URL imagen — Story`.
- **Failing node:** `💾 Guardar sesión Supabase (Story)` (id `save-session-supabase-story`) — this node's own inline note confirms it runs **BEFORE** the WhatsApp preview send, mirroring the carousel/single pattern. This is exactly why the WhatsApp preview never arrived: the workflow never got that far.
- **Error:** `NodeApiError` — `getaddrinfo ENOTFOUND wcjyayeyamyhrjqujhyv.supabase.co` (repeated twice; node has `retryOnFail: true, maxTries: 3`, but all retries failed identically since this is a DNS resolution failure, not a transient blip).
- **Target URL:** `https://wcjyayeyamyhrjqujhyv.supabase.co/rest/v1/content_sessions` — matches `SUPABASE_URL` in local `.env` exactly; **no env var drift**, the URL itself is simply dead.

**Independent confirmation (not n8n-container-specific):** Resolved the hostname from two independent public DNS resolvers from a completely different network (this dev machine):
- Google (8.8.8.8): `Non-existent domain`
- Cloudflare (1.1.1.1): `Non-existent domain`

The parent domain `supabase.co` itself resolves fine — only this specific project subdomain returns **NXDOMAIN** (a hard "record does not exist," not a timeout or a "project paused" response). This is the signature of the project having been **deleted**, not merely auto-paused from inactivity.

**User confirmed via the Supabase dashboard (2026-08-01): project `wcjyayeyamyhrjqujhyv` is permanently deleted.** Not recoverable, not paused.

### Blast radius: full pipeline outage, not Story-specific

`n8n/workflow.json` uses the identical `💾 Guardar sesión Supabase` pattern for single-post and carousel flows (same node shape, same target host, running at the equivalent point in each branch, before their respective WhatsApp preview sends). **Any webhook submission — single, carousel, or Story — fails identically right now**, before ever reaching a WhatsApp preview. This is a full Content Engine v3 outage, discovered incidentally by this plan's live-fire test, not a Phase-13/FB-Story-specific issue.

### Money/side-effects note — no cleanup needed

Execution 1786295 consumed real GPT-4o + real Ideogram API credits (both succeeded before the Supabase failure) but **published nothing** — the failure occurred 5+ nodes before any Meta-facing node (IG/FB container creation, FB Story upload/publish) would have run. **No Meta-side cleanup is required** — no container, no post, no Story was ever created on Instagram or Facebook from this execution.

## Decisions Made

- **User decision (2026-08-01, via Supabase dashboard check):** Project `wcjyayeyamyhrjqujhyv` is permanently deleted — confirmed by the user directly, not inferred solely from DNS.
- **User decision (2026-08-01):** Pull forward the Azure PostgreSQL migration for `content_sessions` **now**, as a new urgent inserted phase (decimal-numbered, e.g. `12.3-*` or similar, per this project's established insert-phase convention — see Phase 12.1/12.2 precedent). The Supabase project will **not** be recreated.
- **Scope boundary (carried from `CONTENT-STUDIO-GUI-SEED.md`):** Only the `content_sessions` session-state table is being migrated to Azure Postgres now. The Sheets-log/Content-Studio-GUI parts of that seed doc remain future, separate scope — not pulled forward by this decision. MEMORY.md had already anticipated this exact migration ("Supabase → Azure migration — user wants to migrate content_sessions from Supabase to Azure in a future phase"); this event converts that "future phase" into "now, urgent."

## Deviations from Plan

**This plan did not execute as written — it was intentionally halted mid-execution by explicit user/orchestrator instruction after Task 2's live-fire attempt surfaced a blocking infrastructure outage unrelated to the FB Story chain this plan targets.** This is not a Rule 1-4 auto-fix scenario: recreating/migrating session storage is an architectural change (Rule 4) requiring — and receiving — an explicit user decision. No code was modified, no redeploy was attempted, per the orchestrator's explicit "do not patch anything yet" instruction during diagnosis.

## Issues Encountered

- Full pipeline outage (Supabase project deleted) discovered via this plan's live-fire test — see Diagnosis above. Resolution requires a new phase (Supabase→Azure Postgres migration), not a fix within this plan's scope.

## Next Phase Readiness

- **Blocked.** Phase 13 (this plan's remaining Tasks 2-4, plus 13-02 and 13-03) cannot proceed until:
  1. A new phase migrates `content_sessions` (and its Wizard-side webhook/write path, and n8n's `💾 Guardar sesión Supabase` nodes across single/carousel/Story branches) from Supabase to Azure PostgreSQL.
  2. That migration is deployed and confirmed live (a webhook submission successfully reaches a WhatsApp preview again, for at least one format).
  3. Plan 13-01 is re-run from Task 2 (Task 1's pre-flight results above remain valid unless the migration itself touches the FB Story chain nodes, which it should not — session storage and the Meta-publish chain are separate concerns).
- **Recommendation for the new migration phase's own pre-flight:** consider adding a lightweight reachability check (e.g., a HEAD/GET against the session-store host) to pre-flight checklists for any future live-fire plan — this plan's Task 1 pre-flight checked workflow/node drift and env var *names* only, and had no way to catch a fully-dead downstream host.

---
*Phase: 13-facebook-story-log-notifications*
*Plan 01: BLOCKED — 2026-08-01*
