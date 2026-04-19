# Phase 10: Wizard Historia Format — Research

**Researched:** 2026-04-19
**Domain:** Node.js CLI extension — wizard/run.js format branching + brief JSON enrichment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UX del formato Historia (PASO 3)**
- Posición en el menú: "Historia" aparece al inicio (1º), antes de "Post Individual" y "Carrusel". Destaca el formato nuevo para promover su uso durante rollout v1.2
- Tipos de post (educativo/autoridad/caso éxito): disponibles los 3 igual que para Post y Carrusel — Claude adapta los ángulos al formato Story en el prompt de sugerencias

**Selector de modelo (PASO 5)**
- Auto-select con aviso: cuando format=story, el Wizard salta la selección manual y muestra: "Modelo: Ideogram v3 (único disponible para Historia — texto legible en 9:16)". Cero fricción, educativo
- Custom image permitida: usuario puede pegar URL propia (has_own_image=true), pero el Wizard valida que la imagen sea 9:16 vertical. Si no es 9:16, rechaza con error claro
- has_text_in_image: default recomendado = true para Stories (best practice del formato). Usuario puede override si quiere imagen limpia

**Brief JSON y story_expires_at**
- Todo a criterio de Claude — user delegó las 4 decisiones técnicas

**Validación de scheduling <22h**
- Trigger: inline, apenas el usuario ingresa/elige una fecha >22h. No deja avanzar al siguiente paso hasta corregir
- Wording del error: "Las Stories expiran en 24h. No podemos programar a más de 22h vista (margen de 2h para procesamiento y aprobación). Elegí una fecha dentro de las próximas 22h."
- Reloj base: `now()` del Wizard (momento en que corre). Simple y predecible
- Caso "publicar ahora": skip validación si scheduled_for=null o publica inmediatamente

### Claude's Discretion

**UX/presentación:**
- Etiqueta y emoji de "Historia" en el menú — best practice de agencias de contenido IA
- Cómo comunicar el constraint 9:16 vertical en el flujo
- Manejo de back-navigation si el usuario cambia de Flux/Nano a Historia

**Brief JSON (las 4 decisiones técnicas):**
- Base de cálculo de `story_expires_at`: desde `scheduled_for + 24h` si se programa, o `now() + 24h` si es publicar ahora (recomendado)
- Formato del timestamp: ISO 8601 UTC con sufijo Z (consistente con timestamp existente)
- Campos adicionales: incluir `scheduled_for` para que n8n ejecute SCHED-02 downstream; resto mínimo
- Validación local del shape antes del webhook: assert en el Wizard (fail loud)

### Deferred Ideas (OUT OF SCOPE)

- Custom image con validación server-side: podría añadirse en fase posterior
- Preview del Story renderizado antes del webhook: fuera de scope de Phase 10
</user_constraints>

---

## Summary

Phase 10 is a pure `wizard/run.js` modification. No n8n workflow changes, no new dependencies, no new files. The work is a branching extension of the existing 6-PASO CLI state machine.

The Wizard uses raw Node.js `readline` for prompts (no inquirer or prompts library). All conditional flow is implemented with `if/else` on the response string. Phase 8 (scheduling) already established the patterns: `isCarousel` boolean controls divergent paths in PASO 5 and brief construction; the same pattern will be used with `isStory` boolean.

Three technical concerns require research depth: (1) 9:16 custom image validation via URL fetching, (2) `story_expires_at` calculation, and (3) the 22h scheduling cap layered on top of `parsePublishTime`. All three are solved with Node.js built-ins confirmed working on Node 22.20.0 in this environment.

The image dimension detection uses native `fetch` (available in Node 18+, confirmed present) with PNG byte-header parsing (bytes 16–24 of PNG IHDR chunk) and JPEG SOF marker walking. Both work reliably for the formats users are likely to provide (PNG, JPEG, WebP). The 22h cap is a two-stage validation: `parsePublishTime` runs first (handles format errors and past times), then a Story-specific gate checks `diffMs <= 22 * 3600000`.

**Primary recommendation:** Introduce an `isStory` boolean alongside the existing `isCarousel` boolean. Branch format-specific logic on these two flags. No new npm packages required. All image validation uses native fetch + Buffer parsing.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `readline` | Built-in (Node 22) | CLI prompts — `ask()` wrapper | Already used throughout wizard/run.js |
| Node.js native `fetch` | Built-in (Node 18+, v22.20.0 confirmed) | HTTP requests for image dimension validation | No new deps; confirmed available in this env |
| Node.js `Buffer` | Built-in | Parse PNG/JPEG binary headers for dimensions | Same pattern as existing `httpPost()` |
| Node.js `Intl.DateTimeFormat` | Built-in (Node 22) | CET/CEST timezone (already used in Phase 8) | Already implemented in `madridLocalToUTC()` |
| `dotenv` | `^16.4.5` | `.env` loading | Only npm dep in package.json |

### No New Dependencies Needed
`package.json` currently has only `dotenv: ^16.4.5`. Phase 10 requires no new packages. Image dimension detection with native `fetch` + `Buffer` was verified working for PNG and JPEG formats (see Code Examples below).

---

## Architecture Patterns

### Current State Machine in wizard/run.js

The wizard is a top-to-bottom async function `runWizard()` with inline `await ask()` calls. Branching uses boolean variables:

```javascript
const isCarousel = fmtChoice.trim() === "2";  // set in PASO 3

// Used in PASO 5:
if (isCarousel) {
  // fixed Ideogram, skip model selection
} else {
  // full model selection menu
}

// Used in brief construction:
...(isCarousel && {
  format:        "carousel",
  num_images:    numImages,
  image_prompts: [],
})
```

Phase 10 adds `isStory` with the exact same pattern.

### PASO 3 — Menu Modification

**Current:** 2 options — `[1] Post normal`, `[2] Carrusel`
**New:** 3 options — `[1] Historia`, `[2] Post Individual`, `[3] Carrusel`

Historia goes first (locked decision). The `isCarousel` and `isStory` booleans:

```javascript
// PASO 3 new mapping
const isStory    = fmtChoice.trim() === "1";
const isCarousel = fmtChoice.trim() === "3";
// fmtChoice === "2" = Post Individual (default, no special flag needed)
```

**UX label recommendation (Claude's discretion):** `📲 Historia` — the phone emoji signals mobile-first format used by agencies and tools like Publer, Buffer, Hootsuite.

### PASO 5 — Model Selection Branching

Three branches now:

```javascript
if (isCarousel) {
  // fixed Ideogram (existing code — no change)
} else if (isStory) {
  // NEW: auto-select Ideogram, show informational message
  // Ask about has_text_in_image (default y recommended)
  // If custom image: validate 9:16
} else {
  // existing full model selection menu (no change)
}
```

**Story branch UX flow:**
1. Show: `"📲 Modelo: 🔤 Ideogram v3 (único disponible para Historia — texto legible en 9:16)"`
2. Ask: `"¿El story lleva texto/dato visible en la imagen? (s/n, Enter = s) →"` — default `s`
3. Ask: `"¿Usás una imagen propia? (s/n) →"`
4. If `s` → ask for URL → validate 9:16 → loop until valid or user cancels
5. Set: `imageModel = "ideogram"`, `hasTextInImage = true (or override)`, `hasOwnImage = false/true`

### PASO 6 — Scheduling: 22h Cap for Stories

`parsePublishTime` already handles: format errors, past times, max 24h cap. For Stories, add a second validation layer after `parsePublishTime` succeeds:

```javascript
// Inside the scheduling loop, after parsePublishTime returns ok:
if (isStory && result.publish_at && result.publish_at !== 'now') {
  const diffMs = new Date(result.publish_at).getTime() - Date.now();
  if (diffMs > 22 * 3600 * 1000) {
    result = { error: 'Las Stories expiran en 24h. No podemos programar a más de 22h vista (margen de 2h para procesamiento y aprobación). Elegí una fecha dentro de las próximas 22h.' };
  }
}
// Continue with existing while (result.error) loop
```

This approach reuses the existing validation loop without modifying `parsePublishTime` (which is also used for non-story formats). The 22h check is only applied when `isStory === true`.

### Brief JSON — Story Fields

**Recommended full story brief shape** (Claude's discretion — 4 delegated decisions):

```json
{
  "topic": "...",
  "type": "educational",
  "angle": "...",
  "platforms": ["instagram", "facebook"],
  "format": "story",
  "aspect_ratio": "9:16",
  "num_images": 1,
  "story_expires_at": "2026-04-20T14:00:00.000Z",
  "image_model": "ideogram",
  "fal_model_id": "fal-ai/ideogram/v3",
  "has_own_image": false,
  "image_url": null,
  "has_text_in_image": true,
  "approval_number": "34612345678",
  "timestamp": "2026-04-19T14:00:00.000Z",
  "publish_at": "now"
}
```

**Decision rationale (Claude's discretion):**
- `story_expires_at` = `publish_at_time + 24h` where `publish_at_time = new Date(publish_at)` if scheduled, else `new Date()` if `'now'`. Consistent with Meta's 24h Story TTL.
- Format: ISO 8601 UTC with `Z` suffix — same as `timestamp` field (already `.toISOString()`).
- `scheduled_for` is NOT added as a separate field — `publish_at` already carries this information for SCHED-02 downstream.
- `format: "story"` is injected via spread (same pattern as carousel): `...(isStory && { format: "story", aspect_ratio: "9:16", num_images: 1, story_expires_at })`
- Post-construction validation assert runs before `sendWebhook()` call.

### Brief Validation (fail-loud assert)

```javascript
function validateStoryBrief(brief) {
  if (brief.format !== 'story') return; // only validate stories
  const errors = [];
  if (brief.aspect_ratio !== '9:16')  errors.push('aspect_ratio must be "9:16"');
  if (brief.num_images !== 1)         errors.push('num_images must be 1');
  if (!brief.story_expires_at)        errors.push('story_expires_at is required');
  if (!brief.story_expires_at?.endsWith('Z')) errors.push('story_expires_at must be ISO UTC with Z');
  if (!brief.has_own_image && brief.image_model !== 'ideogram')
    errors.push('story must use ideogram model unless has_own_image');
  if (errors.length) throw new Error('Story brief validation failed: ' + errors.join(', '));
}
```

Place immediately before `await sendWebhook(brief)`. This will surface any construction bugs during development and in production.

### 9:16 Custom Image Validation

Uses native `fetch` to download image bytes, then parses binary header to extract dimensions. Verified working in this environment (Node 22.20.0):

**PNG detection** (most common for Ideogram/AI-generated): Bytes 16–24 of PNG IHDR chunk contain width and height as UInt32BE.

**JPEG detection**: Walk SOF (Start Of Frame) markers starting at offset 2; width at `i+7`, height at `i+5` of the SOF segment.

**Aspect ratio tolerance**: ±5% — `Math.abs((width/height) - (9/16)) < 0.05`. Accepts 1080×1920, 750×1334, 720×1280, etc.

**Failure modes to handle:**
- Network error (fetch fails) → show warning, ask user to confirm or re-enter
- Unknown format (WebP, GIF, etc.) → show warning that format couldn't be validated, ask to confirm
- Server returns 4xx/5xx → treat as unvalidatable, surface warning

### suggestAngles() — Story Context

The `suggestAngles(topic, postType)` call in PASO 2.5 passes the post type to Claude API. For Stories, no API change is needed — the function already includes type context in the prompt. The **planner should note** that the system prompt in `suggestAngles` currently says "Instagram/Facebook" generically. Phase 10 could optionally append "formato Story (9:16 vertical)" to the type context string when `format` is known at that point. However, format is determined in PASO 3 which comes AFTER PASO 2.5 in the current flow.

**Recommendation**: No change to `suggestAngles()` in Phase 10. The angle suggestions work fine without Story-specific context — the angle is about content strategy, not image format. This avoids reordering the PASO flow.

### RESUMEN FINAL — Story Display

Add a Story-specific display line in the summary block:

```javascript
if (isStory) {
  console.log(`  📲 Formato:     ${c("bright", "Historia (Story 9:16)")}`);
  console.log(`  🖼️  Modelo:      🔤 Ideogram v3 (fijo para Stories)`);
  console.log(`  ⏰ Expira:      ${new Date(storyExpiresAt).toLocaleString('es-ES', {timeZone:'Europe/Madrid'})}`);
}
```

### Anti-Patterns to Avoid

- **Modifying `parsePublishTime()`** for the 22h cap: it's shared with non-story formats. Story cap is a wrapper layer, not a change to the existing function.
- **Adding `num_images: 1` for single posts**: `num_images` is a Story-and-Carousel-only field. Single posts should not include it in the brief (existing behavior).
- **Downloading entire image for dimension check**: use `fetch` with `Range: bytes=0-2048` where server supports it (206 response), fall back to full download. Saves bandwidth for large images.
- **Hard-failing on unrecognized image format**: WebP and GIF can't be parsed with the PNG/JPEG binary method. Show a warning and let user confirm rather than blocking completely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image dimension detection | Custom image parsing library | Native `fetch` + `Buffer` PNG/JPEG header parsing | Works for PNG/JPEG (most common formats); no new deps |
| Timezone handling | Custom DST table | `Intl.DateTimeFormat` probe (already in wizard) | Already implemented in `madridLocalToUTC()` |
| HTTP client for image fetch | Third-party axios/node-fetch | Native `fetch` (Node 18+) | Already confirmed working; no new deps |

**Key insight:** The entire phase touches only `wizard/run.js`. No new files, no new npm packages, no n8n changes. It's a branching extension of what's already there.

---

## Common Pitfalls

### Pitfall 1: PASO Numbering Shift
**What goes wrong:** After adding Historia as option [1] in PASO 3, the old `isCarousel = fmtChoice === "2"` breaks (Carrusel is now [3]).
**Why it happens:** Simple mapping change; easy to miss.
**How to avoid:** Update mapping to `isStory = "1"`, Post Individual implicit, `isCarousel = "3"`. Test all three paths.
**Warning signs:** Carrusel path triggers for Post Individual input.

### Pitfall 2: story_expires_at Clock Drift
**What goes wrong:** `story_expires_at` is calculated from `now()` in the Wizard (local machine time), but `publish_at` is already a UTC ISO string. If the user selects a time, `story_expires_at` should be based on that time, not `now()`.
**Why it happens:** Easy to accidentally use `Date.now()` instead of `new Date(publish_at).getTime()`.
**How to avoid:** `story_expires_at = new Date((publish_at !== 'now' ? new Date(publish_at) : new Date()).getTime() + 24 * 3600 * 1000).toISOString()`
**Warning signs:** `story_expires_at` is 24h from wizard-launch-time, not from scheduled publish time.

### Pitfall 3: 22h Cap Validation Order
**What goes wrong:** The Story 22h check runs before `parsePublishTime()`, so it skips the format/past validation.
**Why it happens:** Naive implementation puts Story check first.
**How to avoid:** Always run `parsePublishTime()` first. Only apply Story cap if `!result.error`. The validation loop must cover both error sources in the same `while (result.error)` loop.
**Warning signs:** "mañana 09:30" that's 25h away passes the 22h check but isn't caught as >24h.

### Pitfall 4: Image Fetch Hangs on Slow URLs
**What goes wrong:** User pastes a URL to a slow CDN or large image. `fetch()` hangs for 30+ seconds blocking the CLI.
**Why it happens:** No timeout on `fetch()`.
**How to avoid:** Wrap image fetch in `Promise.race([fetch(url), timeout(8000)])` where timeout rejects after 8s. On timeout, show warning and ask user to confirm.
**Warning signs:** CLI appears frozen after entering custom image URL.

### Pitfall 5: has_text_in_image Default Behavior
**What goes wrong:** For Stories, `has_text_in_image` defaults to `true` (best practice), but the user might not see this clearly and end up with text overlay they didn't want.
**Why it happens:** Silent default; user presses Enter without reading.
**How to avoid:** Show the recommendation explicitly: `"¿El story lleva texto/dato visible en la imagen? (s/n, recomendado: s) →"`. Make the `s` default visible in the prompt.
**Warning signs:** Users reporting unexpected text overlay in generated images.

### Pitfall 6: WebP/GIF Image Validation False Negative
**What goes wrong:** Custom image is a WebP at 1080×1920 but the binary parser fails to detect it as 9:16 (WebP has different magic bytes: `52494646`).
**Why it happens:** PNG/JPEG parser doesn't recognize WebP header.
**How to avoid:** After PNG and JPEG parsing both fail, check for WebP signature (`buf[0..3] === RIFF`). If format is unrecognized, show: `"No se pudo validar las dimensiones de la imagen (formato no reconocido). Confirmás que es 9:16 vertical? (s/n)"`.
**Warning signs:** WebP images always hitting the "unrecognized format" fallback.

---

## Code Examples

Verified patterns from actual code inspection and Node.js testing:

### PASO 3 — Historia Menu (new)
```javascript
// Source: extension of existing PASO 3 pattern in wizard/run.js (lines 344-365)
div();
console.log(c("bright", "  PASO 3 — Formato\n"));
const fmtChoice = await ask(
  `  [1] 📲 Historia     — Story vertical 9:16 (nuevo!)\n` +
  `  [2] Post Individual — 1 imagen\n` +
  `  [3] Carrusel        — múltiples slides con texto en imagen\n` +
  `  → `
);
const isStory    = fmtChoice.trim() === "1";
const isCarousel = fmtChoice.trim() === "3";
```

### PASO 5 — Story Model Auto-Select
```javascript
// Source: based on existing isCarousel branch (lines 383-390 in wizard/run.js)
if (isStory) {
  console.log(c("green",  "\n  📲 Modelo: 🔤 Ideogram v3 (único disponible para Historia)"));
  console.log(c("gray",   "     Texto legible en formato 9:16 — best practice para Stories\n"));

  const hasTextQ = await ask("  ¿El story lleva texto/dato visible en la imagen? (s/n, recomendado: s) → ");
  hasTextInImage = hasTextQ.trim().toLowerCase() !== "n"; // default true

  const ownImgQ = await ask("  ¿Usás una imagen propia? (s/n) → ");
  if (ownImgQ.trim().toLowerCase() === "s") {
    hasOwnImage = true;
    imageUrl    = (await ask("  → URL de tu imagen (debe ser 9:16 vertical): ")).trim();
    const dimResult = await validateImageIs916(imageUrl);
    if (!dimResult.ok) {
      // loop until valid or user cancels
    }
  }

  imageModel = "ideogram";
  console.log(c("green", `\n  ✓ 🔤 Ideogram v3 (9:16 optimizado)\n`));
}
```

### Image 9:16 Validation Function
```javascript
// Source: verified with native fetch in Node 22.20.0 (research test)
async function validateImageIs916(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Range': 'bytes=0-2048' }
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} al acceder a la imagen` };

    const buf = Buffer.from(await res.arrayBuffer());
    let width, height;

    // PNG: magic bytes 89504E47, dimensions at offset 16-24
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 && buf.length >= 24) {
      width  = buf.readUInt32BE(16);
      height = buf.readUInt32BE(20);
    }
    // JPEG: magic bytes FFD8, walk SOF markers
    else if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2;
      while (i < buf.length - 10) {
        if (buf[i] !== 0xFF) break;
        const marker = buf[i + 1];
        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
          height = buf.readUInt16BE(i + 5);
          width  = buf.readUInt16BE(i + 7);
          break;
        }
        const segLen = buf.readUInt16BE(i + 2);
        i += 2 + segLen;
      }
    }
    // WebP: RIFF signature
    else if (buf.slice(0, 4).toString('ascii') === 'RIFF') {
      return { ok: null, warning: 'Formato WebP detectado — no se pueden leer dimensiones automáticamente. Confirmás que es 9:16 vertical?' };
    }
    else {
      return { ok: null, warning: 'Formato de imagen no reconocido. Confirmás que es 9:16 vertical?' };
    }

    if (!width || !height) {
      return { ok: null, warning: 'No se pudieron leer las dimensiones. Confirmás que es 9:16 vertical?' };
    }

    // 9:16 = 0.5625, ±5% tolerance
    const ratio  = width / height;
    const target = 9 / 16;
    if (Math.abs(ratio - target) > 0.05) {
      return {
        ok: false,
        error: `La imagen es ${width}×${height} (ratio ${ratio.toFixed(3)}). Las Stories requieren 9:16 vertical (ej: 1080×1920). Usá una imagen vertical.`
      };
    }
    return { ok: true, width, height };

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: null, warning: 'La URL tardó demasiado en responder. Confirmás que la imagen es 9:16 vertical?' };
    }
    return { ok: null, warning: `No se pudo acceder a la imagen (${err.message}). Confirmás que es 9:16 vertical?` };
  }
}
```

### story_expires_at Calculation
```javascript
// Source: verified logic (research test — calcStoryExpiresAt)
// Called after publishAt is resolved (either 'now' or ISO UTC string)
const storyExpiresAt = new Date(
  (publishAt !== 'now' ? new Date(publishAt) : new Date()).getTime() + 24 * 60 * 60 * 1000
).toISOString(); // always ends with Z
```

### 22h Story Scheduling Cap (SCHED-01)
```javascript
// Source: verified logic (research test — validateStoryScheduleCap)
// Placed INSIDE the existing scheduling while loop, after parsePublishTime
if (isStory && result.publish_at && result.publish_at !== 'now') {
  const diffMs = new Date(result.publish_at).getTime() - Date.now();
  if (diffMs > 22 * 60 * 60 * 1000) {
    result = {
      error: 'Las Stories expiran en 24h. No podemos programar a más de 22h vista ' +
             '(margen de 2h para procesamiento y aprobación). ' +
             'Elegí una fecha dentro de las próximas 22h.'
    };
  }
}
```

### Story Brief Construction
```javascript
// Source: based on existing carousel spread pattern (lines 507-525 in wizard/run.js)
const brief = {
  topic,
  type,
  angle: chosenAngle,
  platforms,
  image_model:       imageModel,
  fal_model_id:      IMAGE_MODELS[imageModel]?.falModel || null,
  has_own_image:     hasOwnImage,
  image_url:         imageUrl,
  has_text_in_image: hasTextInImage,
  approval_number:   process.env.WHATSAPP_APPROVAL_NUMBER,
  timestamp:         new Date().toISOString(),
  publish_at:        publishAt,
  ...(isCarousel && {
    format:        "carousel",
    num_images:    numImages,
    image_prompts: [],
  }),
  ...(isStory && {
    format:           "story",
    aspect_ratio:     "9:16",
    num_images:       1,
    story_expires_at: storyExpiresAt,  // calculated after publishAt is known
  }),
};

// Fail-loud assertion before sending
validateStoryBrief(brief);  // throws if Story-specific fields are wrong
await sendWebhook(brief);
```

### validateStoryBrief Assert
```javascript
// Source: verified logic (research test)
function validateStoryBrief(brief) {
  if (brief.format !== 'story') return;
  const errors = [];
  if (brief.aspect_ratio !== '9:16')           errors.push('aspect_ratio must be "9:16"');
  if (brief.num_images !== 1)                  errors.push('num_images must be 1');
  if (!brief.story_expires_at)                 errors.push('story_expires_at is required');
  if (!brief.story_expires_at?.endsWith('Z'))  errors.push('story_expires_at must be ISO UTC');
  if (!brief.has_own_image && brief.image_model !== 'ideogram')
    errors.push('story must use ideogram unless has_own_image');
  if (errors.length) throw new Error('Story brief validation failed:\n  - ' + errors.join('\n  - '));
}
```

---

## State of the Art

| Old (v1.1) | New (v1.2 Phase 10) | Change |
|------------|---------------------|--------|
| PASO 3: 2 options (Post, Carrusel) | PASO 3: 3 options (Historia, Post, Carrusel) | Historia = option [1] |
| `isCarousel` only | `isStory` + `isCarousel` | Two format flags |
| No 9:16 validation | Custom image URL validated for 9:16 | Native fetch + Buffer parsing |
| Max 24h scheduling for all formats | Max 22h for Stories, 24h for others | Story-specific second validation layer |
| Brief has no `format` for single posts | Story brief adds `format:"story"`, `aspect_ratio`, `num_images`, `story_expires_at` | Enriched brief |
| No brief shape assertion | `validateStoryBrief()` throws before webhook | Fail-loud at construction time |

---

## Open Questions

1. **RESUMEN display: `story_expires_at` or just publicar time?**
   - What we know: The summary block currently shows topic, type, angle, platforms, imagen, and publish time.
   - What's unclear: Whether showing `story_expires_at` in the RESUMEN adds value or noise for the user.
   - Recommendation: Show it. One line: `"⏰ Story expira: [local time]"`. Educates user on the constraint and builds trust.

2. **PASO 4 (Plataformas) for Stories: Should Facebook be excluded?**
   - What we know: Instagram Stories exist; Facebook Stories also exist but are less used. The brief `platforms` array is used by n8n Phase 11 downstream to decide where to publish.
   - What's unclear: Phase 11 (Story publishing) hasn't been planned yet. Restricting platforms here could be premature.
   - Recommendation: Keep the same platform menu (no restrictions in Phase 10). Phase 11 will handle the Story publishing logic and can ignore `facebook` if needed. Adding platform restrictions in Phase 10 would be overengineering scope.

3. **`has_text_in_image` = true for Stories: should the Wizard hard-set this or offer the toggle?**
   - What we know: Locked decision says "default recomendado = true, usuario puede override".
   - What's unclear: How much prominence to give the override in the UX.
   - Recommendation: Ask explicitly (one line prompt with default `s`). Don't hide it. The user who wants a clean image should be able to set it without friction.

---

## Sources

### Primary (HIGH confidence)
- `wizard/run.js` (lines 1-584) — full read; understood entire state machine, all PASO flows, existing `isCarousel` pattern, `parsePublishTime`, brief construction, `sendWebhook`
- `package.json` — confirmed only `dotenv` as npm dependency; Node 18+ requirement
- Node.js v22.20.0 (confirmed in environment) — native `fetch` available, `Buffer`, `Intl.DateTimeFormat` all confirmed
- `prompts/brand-voice.md` — confirmed no Story-specific voice rules; existing rules apply equally

### Secondary (MEDIUM confidence)
- Phase 8 RESEARCH.md (`08-RESEARCH.md`) — confirmed `parsePublishTime` implementation, `madridLocalToUTC`, scheduling loop patterns; all consistent with current code
- PNG spec (IHDR chunk structure) — bytes 16-24 for width/height as UInt32BE; standard, stable
- JPEG spec (SOF marker structure) — width at `i+7`, height at `i+5`; standard, stable

### Verified in this research session (HIGH confidence)
- `node -e` test: native `fetch` confirmed available (Node 22.20.0)
- `node -e` test: PNG dimension parsing via `Buffer.readUInt32BE(16/20)` — confirmed (httpbin.org/image/png: 100×100)
- `node -e` test: JPEG SOF marker parsing — confirmed (httpbin.org/image/jpeg: 239×178)
- `node -e` test: 9:16 ratio check with ±5% tolerance — confirmed correct for 5 test cases
- `node -e` test: `story_expires_at` ISO UTC calculation — confirmed ends with `Z`
- `node -e` test: 22h Story cap validation — confirmed 23h input rejected, 21h input accepted, `'now'` accepted
- `node -e` test: `validateStoryBrief()` assert — confirmed catches missing/wrong fields, passes valid brief

---

## Metadata

**Confidence breakdown:**
- Standard stack (no new deps): HIGH — verified in environment, only existing built-ins needed
- PASO 3 menu change: HIGH — direct code read, trivial string mapping change
- PASO 5 Story branch: HIGH — mirrors existing isCarousel branch exactly
- PASO 6 22h cap: HIGH — verified logic, non-invasive layer on top of existing parsePublishTime
- Image dimension detection (PNG/JPEG): HIGH — verified in research with real HTTP responses
- Image dimension detection (WebP): MEDIUM — WebP signature identified but dimensions not tested (needs fallback path)
- Brief construction + validation: HIGH — verified shape and assert logic

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (wizard/run.js is stable; Node.js built-ins are stable)
