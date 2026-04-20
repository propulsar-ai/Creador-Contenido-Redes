# Phase 8: Scheduling — Research

**Researched:** 2026-04-17
**Domain:** Node.js timezone conversion + n8n Wait node scheduling gate
**Confidence:** HIGH

---

## Summary

Phase 8 adds a publish-time prompt to the Wizard and a scheduling gate to n8n. The core challenge is two-sided: (1) the Wizard must convert CET/CEST user input to UTC ISO strings using only Node.js built-ins (no external libs), and (2) n8n must hold execution until the target time using the existing Wait node machinery — but with safeguards for past timestamps.

The Wizard already runs on Node.js 22 (confirmed via `node --version`) which ships with full `Intl.DateTimeFormat` support including `Europe/Madrid` timezone. No new npm dependencies are needed for timezone handling. The UTC conversion is achievable via a probe-based offset detection pattern that correctly handles both CET (UTC+1, Oct-Mar) and CEST (UTC+2, Mar-Oct) automatically.

On the n8n side, the two existing Wait nodes use `typeVersion: 1` with `{"amount": N, "unit": "seconds"}`. The "At Specified Time" mode (`resume: specificTime`) has documented reliability issues in multiple community reports and should be avoided. The robust alternative is "After Time Interval" in seconds with a dynamic expression `={{ $json.wait_seconds }}` — confirmed working by community reports as long as the field is typed as Number. A Code node guard before the Wait computes `wait_seconds` and routes past-time or >24h cases directly to immediate publishing.

The schedule gate must be inserted between `🔍 Recuperar sesión Supabase` and `🔧 Prep Re-host Input` (x=2624 to x=3060). The `publish_at` field must be added to both Supabase session save nodes (single and carousel) so it survives the WhatsApp approval webhook hop.

**Primary recommendation:** Use "After Time Interval" (seconds) with a computed `wait_seconds` field, not "At Specified Time". Use Node.js `Intl.DateTimeFormat` probe-based offset detection for CET/CEST conversion.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `Intl.DateTimeFormat` | Built-in (Node 22) | CET/CEST to UTC conversion | No external deps; handles DST correctly |
| n8n Wait node (typeVersion 1) | n8n 2.14.2 | Pause execution until publish time | Already in workflow; proven working |
| n8n IF node (typeVersion 1) | n8n 2.14.2 | Route scheduled vs immediate | Required (v2/Switch v3 broken in 2.14.2) |
| n8n Code node (typeVersion 2) | n8n 2.14.2 | Compute wait_seconds + guard logic | Consistent with existing Code nodes |

### No New Dependencies Needed
The `package.json` currently has only `dotenv: ^16.4.5`. No timezone library (luxon, date-fns-tz, moment-timezone) is required. Node.js 18+ ships with full IANA timezone database via V8's built-in ICU data.

**Verification (confirmed in environment):**
```
Node.js v22.20.0
Intl.DateTimeFormat('es-ES', {timeZone: 'Europe/Madrid'}) → works
```

---

## Architecture Patterns

### Wizard Side: UTC Conversion

**Pattern: Probe-based offset detection**

Instead of hardcoding CET/CEST offsets, probe Madrid's interpretation of a candidate UTC time and compute the difference. This auto-detects DST without any external library.

```javascript
// Source: verified working in Node.js 22 (see research tests)
function madridLocalToUTC(localDateStr, localTimeStr, tz = 'Europe/Madrid') {
  // Probe: what does Madrid show for UTC = localDateStr T localTimeStr Z?
  const probeUTC = new Date(localDateStr + 'T' + localTimeStr + ':00Z');
  const madridTimeAtProbe = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(probeUTC);

  const [targetH] = localTimeStr.split(':').map(Number);
  const [probeH]  = madridTimeAtProbe.split(':').map(Number);

  let hourDiff = probeH - targetH;
  if (hourDiff > 12) hourDiff -= 24;   // midnight wrap guard
  if (hourDiff < -12) hourDiff += 24;

  // Shift probe by offset to get true UTC
  const result = new Date(probeUTC);
  result.setUTCHours(result.getUTCHours() - hourDiff);
  return result.toISOString();
}
```

**Verified results:**
- Summer (CEST): `18:00 Madrid` → `16:00 UTC` (offset +2) ✓
- Winter (CET):  `15:30 Madrid` → `14:30 UTC` (offset +1) ✓
- Tomorrow:      `09:00 Madrid` → `07:00 UTC` ✓

**Known DST edge case:** During the spring-forward transition (last Sunday of March, 02:00 local), times in the 02:00–03:00 window are ambiguous. The probe method may yield a 1-hour error for scheduling within that window. This occurs ~1 night per year and is acceptable given the 24h scheduling cap.

### Wizard Side: Input Parsing

```javascript
// Source: verified working against test cases
function parsePublishTime(input) {
  const normalized = input.trim().toLowerCase();

  if (normalized === 'ahora' || normalized === 'now') {
    return { publish_at: 'now' };
  }

  const tz = 'Europe/Madrid';
  const now = new Date();

  // Get today's date string in Madrid time (YYYY-MM-DD)
  const madridToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);

  const hoyMatch    = normalized.match(/^hoy\s+(\d{1,2}):(\d{2})$/);
  const mananaMatch = normalized.match(/^ma[nñ]ana\s+(\d{1,2}):(\d{2})$/);

  let dateStr, timeStr;

  if (hoyMatch) {
    dateStr = madridToday;
    timeStr = hoyMatch[1].padStart(2, '0') + ':' + hoyMatch[2];
  } else if (mananaMatch) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(tomorrow);
    timeStr = mananaMatch[1].padStart(2, '0') + ':' + mananaMatch[2];
  } else {
    return { error: 'Formato inválido. Usar: ahora | hoy HH:MM | mañana HH:MM' };
  }

  const publish_at = madridLocalToUTC(dateStr, timeStr);
  const diffMs = new Date(publish_at).getTime() - now.getTime();

  if (diffMs <= 0) {
    return { error: 'La hora está en el pasado.' };
  }
  if (diffMs > 24 * 60 * 60 * 1000) {
    return { error: 'Máximo 24 horas. Usá hoy HH:MM o mañana HH:MM dentro del límite.' };
  }

  return { publish_at, wait_minutes: Math.round(diffMs / 60000) };
}
```

### n8n Side: Gate Architecture

**Insertion point:** Between `🔍 Recuperar sesión Supabase` (x=2624) and `🔧 Prep Re-host Input` (x=3060). This is after the WhatsApp approval has been confirmed, before the rehosting and publishing steps.

**Required new nodes (4 total):**

1. **Code node: "🕐 Compute wait_seconds"** — reads `publish_at` from session, computes seconds to wait or sets `scheduled: false`. Routes via `return [{json: {scheduled, wait_seconds, ...passthrough}}]`.

2. **IF node: "⏰ ¿Programado?"** (typeVersion 1) — checks `{{ $json.scheduled }}` equals `true` (string comparison, consistent with existing IF nodes).

3. **Wait node: "⏳ Wait — Scheduled Publish"** (typeVersion 1) — `amount: ={{ $json.wait_seconds }}`, `unit: seconds`. Receives only the scheduled path.

4. **Merge node** — reunites both paths (scheduled-after-wait and immediate) before continuing to `🔧 Prep Re-host Input`.

**Code node guard logic (n8n sandbox compliant — no require()):**
```javascript
// Source: derived from existing Code node patterns in this workflow
const data = $input.first().json;
const pub = data.publish_at;

let scheduled = false;
let wait_seconds = 0;

if (pub && pub !== 'now') {
  const diffMs = new Date(pub).getTime() - Date.now();
  if (diffMs > 65000 && diffMs <= 86400000) {  // 65s min (n8n DB threshold), 24h max
    scheduled = true;
    wait_seconds = Math.round(diffMs / 1000);
  }
  // If <= 65s or > 24h or past: falls through with scheduled=false (immediate)
}

return [{ json: { ...data, scheduled: String(scheduled), wait_seconds } }];
```

**Wait node JSON configuration:**
```json
{
  "parameters": {
    "amount": "={{ $json.wait_seconds }}",
    "unit": "seconds"
  },
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1
}
```

**CRITICAL:** `wait_seconds` must be passed as a Number type (not string) to the Wait node amount field. The Code node returns it as a plain number (`Math.round(...)`) so this is satisfied automatically.

**IF node configuration (consistent with existing pattern):**
```json
{
  "parameters": {
    "conditions": {
      "string": [{ "value1": "={{ $json.scheduled }}", "value2": "true" }]
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 1
}
```

### Supabase Session: publish_at Propagation

`publish_at` must survive the WhatsApp webhook hop. It must be added to both Supabase session save nodes:

**Single post session (`💾 Guardar sesión Supabase`):**
Add `publish_at: $json.publish_at || 'now'` to the JSON body.

**Carousel session (`💾 Guardar sesión Supabase (Carousel)`):**
Add `publish_at: $json.publish_at || 'now'` to the JSON body.

**On retrieval (`🔍 Recuperar sesión Supabase`):** No change needed — the endpoint returns all fields.

**In Code node guard:** Read `data.publish_at` from the recovered session.

### Recommended Project Structure Change (Wizard)

Add scheduling prompt as a new PASO between the final summary and the "¿Generar y enviar a n8n?" confirm:

```
... (existing steps) ...
PASO 6 — Hora de publicación
  [1] Ahora
  [2] Hoy  HH:MM
  [3] Mañana  HH:MM
→ (input with validation loop)

RESUMEN FINAL (includes publish time)
¿Generar y enviar a n8n? (s/n)
```

The `publish_at` field goes into the brief JSON sent to the webhook, alongside the existing fields.

### Anti-Patterns to Avoid

- **Using "At Specified Time" mode:** Multiple community reports and a GitHub issue (closed-not-planned) document this mode being unreliable. It requires a specific non-ISO format (`yyyy-MM-dd HH:mm:ss`) and has hung indefinitely with ISO strings. Use "After Time Interval" in seconds instead.
- **Hardcoding UTC offset (+1 or +2):** Will fail during DST transitions. Always use the probe-based Intl detection.
- **Using a timezone library:** Adds a dependency for functionality already in Node.js 18+. Probe method works without it.
- **Placing schedule gate before WhatsApp approval:** publish_at is meaningless until the user has approved. Gate belongs after approval.
- **Wait node with < 65 seconds:** n8n does not persist executions shorter than 65 seconds to the database. They run in-memory only and will be lost on container restart. The guard enforces `diffMs > 65000`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone offset | Custom DST table | `Intl.DateTimeFormat` probe | Node.js built-in, auto-DST |
| Scheduling persistence | Custom DB polling | n8n Wait node | Already used in workflow; DB-backed |
| Past-time guard | Frontend-only check | Both Wizard + Code node guard | Defense in depth; network delay can cause drift |

**Key insight:** The workflow already uses two Wait nodes for container readiness (30s, 45s fixed). The scheduling Wait is the same node type with a dynamic amount — no new n8n node type or credential needed.

---

## Common Pitfalls

### Pitfall 1: Wait Node Hangs on Past Timestamps
**What goes wrong:** If `publish_at` is in the past when it reaches the Wait node, n8n computes a negative wait time which can hang the execution indefinitely or error silently.
**Why it happens:** Clock drift between Wizard (local machine) and n8n (Azure), or user approved late.
**How to avoid:** Code node guard checks `diffMs > 0` before routing to Wait. Past timestamps route directly to `🔧 Prep Re-host Input`.
**Warning signs:** Execution stuck in "waiting" status in n8n execution log.

### Pitfall 2: Wait Node "At Specified Time" With ISO String
**What goes wrong:** Passing an ISO string like `2026-04-17T18:00:00.000Z` to `resume: specificTime` causes infinite wait or unexpected behavior.
**Why it happens:** The node interprets the timestamp as seconds since epoch (~55 years).
**How to avoid:** Use "After Time Interval" with computed `wait_seconds`. Never use `resume: specificTime`.
**Warning signs:** Wait duration shown as "55 years" in execution trace.

### Pitfall 3: publish_at Lost Between Webhooks
**What goes wrong:** publish_at sent in initial brief but not saved to Supabase, so it's unavailable when the WhatsApp approval webhook fires.
**Why it happens:** Two separate executions — initial webhook and WA reply webhook. Data passes only via Supabase session.
**How to avoid:** Add `publish_at` to the JSON body in both Supabase session save nodes.
**Warning signs:** Code node reads `data.publish_at` as `undefined`, defaults to immediate.

### Pitfall 4: IF Node Uses typeVersion 2
**What goes wrong:** IF node with typeVersion 2 is broken in n8n 2.14.2 running on Azure.
**Why it happens:** Known bug in this version.
**How to avoid:** New IF node `⏰ ¿Programado?` must use `typeVersion: 1` with `conditions.string` structure (consistent with all 6 existing IF nodes).
**Warning signs:** IF node evaluates all inputs as false regardless of value.

### Pitfall 5: wait_seconds as String Type
**What goes wrong:** Wait node amount gets a string `"1800"` instead of number `1800` and waits 1800 seconds literally (works) or errors on some builds.
**Why it happens:** Set node defaults to string type; Code node `JSON.stringify` path.
**How to avoid:** Code node returns `Math.round(diffMs / 1000)` directly (numeric, no string cast). Don't pass through a Set node with String type.
**Warning signs:** Wait node executes immediately (0 wait) or throws type error.

### Pitfall 6: Scale-to-Zero Kills Waiting Executions
**What goes wrong:** n8n container scales to zero during a scheduled wait (e.g., scheduled for 6 hours from now), execution is lost.
**Why it happens:** Azure Container Apps default scale-to-zero: if no traffic, container stops.
**How to avoid:** The 24h cap (SCHED-04) reduces exposure, but the real fix is `min-replicas=1` in Azure Container Apps. This is listed as a prerequisite in the success criteria and should be verified before any E2E test with waits > 5 minutes.
**Warning signs:** Execution disappears from n8n UI after container restart; no WhatsApp notification.

---

## Code Examples

### Complete Wizard Scheduling Prompt Block
```javascript
// Source: derived from existing wizard/run.js prompt pattern
div();
console.log(c("bright", "  PASO 6 — Hora de publicación\n"));

let publishAt = 'now';
let publishAtDisplay = 'Ahora';

const schedChoice = await ask(
  `  [1] Ahora\n` +
  `  [2] Hoy HH:MM  (ej: hoy 18:00)\n` +
  `  [3] Mañana HH:MM  (ej: mañana 09:30)\n` +
  `  → `
);

if (schedChoice.trim() !== '1') {
  let input = '';
  if (schedChoice.trim() === '2') {
    input = await ask('  → Hora (hoy HH:MM): ');
  } else if (schedChoice.trim() === '3') {
    input = await ask('  → Hora (mañana HH:MM): ');
  }

  let result = parsePublishTime(input.trim());
  while (result.error) {
    console.log(c('red', `\n  ✗ ${result.error}`));
    input = await ask('  → Nueva hora (ahora | hoy HH:MM | mañana HH:MM): ');
    if (input.trim().toLowerCase() === 'ahora') { result = { publish_at: 'now' }; break; }
    result = parsePublishTime(input.trim());
  }

  publishAt = result.publish_at;
  if (publishAt !== 'now') {
    // Display in Madrid local time
    const localDisplay = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(publishAt));
    publishAtDisplay = localDisplay.charAt(0).toUpperCase() + localDisplay.slice(1);
    console.log(c('green', `\n  ✓ Programado: ${publishAtDisplay} (Madrid)\n`));
  } else {
    console.log(c('green', `\n  ✓ Publicar ahora\n`));
  }
}
```

### n8n Code Node Guard (SCHED-03)
```javascript
// Source: research-derived; compatible with n8n sandbox (no require/fetch/$helpers)
const data = $input.first().json;
const pub = data.publish_at;

let scheduled = false;
let wait_seconds = 0;

if (pub && pub !== 'now') {
  const diffMs = new Date(pub).getTime() - Date.now();
  // 65s minimum: n8n only persists waits > 65s to database
  // 86400s maximum: 24h cap per SCHED-04
  if (diffMs > 65000 && diffMs <= 86400000) {
    scheduled = true;
    wait_seconds = Math.round(diffMs / 1000);
  }
  // Past time or > 24h: route to immediate (scheduled stays false)
}

return [{ json: { ...data, scheduled: String(scheduled), wait_seconds } }];
```

### Brief JSON with publish_at
```json
{
  "topic": "...",
  "type": "educational",
  "angle": "...",
  "platforms": ["instagram", "facebook"],
  "image_model": "flux",
  "fal_model_id": "fal-ai/flux-pro/v1.1",
  "has_own_image": false,
  "image_url": null,
  "has_text_in_image": false,
  "approval_number": "34612345678",
  "timestamp": "2026-04-17T15:41:00.000Z",
  "publish_at": "2026-04-17T16:00:00.000Z"
}
```

When publishing immediately: `"publish_at": "now"`.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| External timezone lib (moment-tz) | Node.js built-in `Intl.DateTimeFormat` | No new deps; Node 18+ ships full IANA data |
| Wait node "At Specified Time" | Wait node "After Time Interval" (seconds) | Avoids documented bugs; more reliable |
| Fixed wait amounts | Dynamic expression `={{ $json.wait_seconds }}` | Confirmed working with Number type |

**Deprecated/outdated:**
- `resume: specificTime` + `dateTime: ISO string`: Community reports and GitHub issue #14723 (closed-not-planned) show this hangs indefinitely.
- Hardcoded UTC offset `+1`/`+2`: Fails at DST transitions.

---

## Open Questions

1. **Azure `min-replicas` current setting**
   - What we know: The success criteria list verifying `min-replicas=1` as a prerequisite.
   - What's unclear: Current setting on Azure Container Apps for the n8n instance.
   - Recommendation: Planner should include a verification task at phase start to check and if needed set `min-replicas=1` via Azure CLI or portal before any long-wait E2E tests.

2. **n8n 65s minimum Wait threshold**
   - What we know: Community reports state executions shorter than 65s are not persisted to DB.
   - What's unclear: Whether this threshold applies to "After Time Interval" or only "At Specified Time". Fixed 30s/45s Wait nodes in this workflow work fine for their fixed role (in-memory is acceptable there since they run right away).
   - Recommendation: The guard uses `> 65000ms` threshold. For scheduling < 65s, routing to immediate is the correct behavior (the user said "hoy HH:MM" but it's less than a minute away — just publish now).

3. **Supabase content_sessions schema: `publish_at` column**
   - What we know: The session table currently stores: session_id, approval_number, topic, type, angle, platforms, image_model, image_url, final_image_url, instagram_caption, facebook_caption, status.
   - What's unclear: Whether the Supabase table schema needs a migration to add `publish_at` column, or if the HTTP API upsert just stores it as extra JSON (Supabase REST API with JSONB columns handles extra fields).
   - Recommendation: The existing session saves use `JSON.stringify(obj)` → HTTP POST. If the Supabase table has strict columns, a `publish_at TEXT` column must be added. The SETUP.md and existing workflow suggest a simple REST insert without strict schema enforcement, but this needs confirmation before writing the plan.

---

## Sources

### Primary (HIGH confidence)
- Verified in environment: `node -e` test suite covering Intl.DateTimeFormat offset detection, DST handling, input parsing, guard logic — all passing
- Codebase: `wizard/run.js` — full read, understood existing prompt flow and insertion point
- Codebase: `n8n/workflow.json` — all 57 nodes examined; Wait node typeVersion and parameters confirmed; IF node pattern confirmed; session save/retrieve data flow traced

### Secondary (MEDIUM confidence)
- [n8n Wait node docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/) — confirmed "After Time Interval" and "At Specified Time" modes exist
- [n8n Wait + dynamic expression community](https://community.n8n.io/t/random-wait-time-in-seconds-doesnt-seem-to-be-working/87612) — confirmed `={{ $json.field }}` works with Number type
- [n8n Wait "At Specified Time" format](https://community.n8n.io/t/wait-at-specified-time/106776) — confirmed format quirks
- Wait node DB persistence threshold (65s) — from community search; MEDIUM confidence, not found in official docs

### Tertiary (LOW confidence)
- GitHub issue #14723 "Wait node At Specified Time broken" — closed-not-planned; unclear if fixed in newer versions. Risk: LOW (we avoid that mode entirely).
- Azure Container Apps `min-replicas` behavior — verified general docs; specific n8n behavior on scale-to-zero not directly tested.

---

## Metadata

**Confidence breakdown:**
- Wizard timezone conversion: HIGH — verified with test suite against summer/winter/tomorrow cases
- n8n Wait node (After Time Interval): HIGH — typeVersion 1 confirmed in workflow, dynamic expression confirmed by community
- n8n IF node pattern: HIGH — 6 existing nodes all follow same typeVersion 1 + conditions.string pattern
- Session propagation (publish_at): HIGH — session save/retrieve code fully read; simple JSON field addition
- Wait node DB persistence 65s threshold: MEDIUM — community, not official docs
- Azure scale-to-zero risk: MEDIUM — general Azure docs, n8n community; not directly measured

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable domain; n8n 2.14.2 pinned on Azure)
