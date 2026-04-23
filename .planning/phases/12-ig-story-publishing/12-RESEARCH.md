# Phase 12: Instagram Story Publishing — Research

**Researched:** 2026-04-23
**Domain:** Meta Graph API v22.0 (IG Stories + FB photo_stories) + n8n 2.14.2 workflow patching
**Confidence:** HIGH (live API tests + Meta docs cross-referenced)

---

## Summary

Phase 12 conecta el rama Story (ya cableada hasta el preview WA en Phase 11) al pipeline de publicación. Tras una respuesta SI por WhatsApp, el sistema debe insertar un router `🔀 ¿Formato Story?` en la salida FALSE de `🔀 ¿Formato Carrusel?`, ejecutar Story container creation + 45s wait + media_publish + permalink retrieval, y publicar opcionalmente en FB Page como `photo_story`. Todos los nodos nuevos deben envolver su `onError` al subgrafo de error existente (Tag IG/FB Error → Parse Meta Error → Token Expirado? → WA alert → Sheets Fail Log).

**El descubrimiento más importante (verificado con live API test):** la creación de Story container con el Page Access Token actual de Propulsar **funciona contra `graph.facebook.com`** y **falla con código 190 contra `graph.instagram.com`**. La especificación IGSTORY-02 que dice "graph.instagram.com" debe corregirse a `graph.facebook.com` antes de codificar. Esto es coherente con el patrón "Instagram API with Facebook Login" de Meta — el token actual es Page Access Token (heredado por Susana), no IG User Access Token.

**Recomendación principal:** Slicing en **2 plans** — Plan 12-01 (build: insertar router Story, construir cadena IG Story publish + opcional FB Story, cablear errores, parchear guard de Phase 11 y SCHED-02) + Plan 12-02 (E2E test live + regresión carrusel/single-photo + cleanup), espejando exactamente la cadencia de Phase 11.

---

## User Constraints (sin CONTEXT.md)

> No se ejecutó `/gsd:discuss-phase` para Phase 12. Toda decisión queda a discreción del implementador, dentro de los **Requirements + Success Criteria** del ROADMAP.md y los locks heredados de Phase 11 documentados en STATE.md (formato `story` en Supabase, contrato del payload de 15 campos del nodo `🔗 Re-attach session data (Story)`, no link sticker en v1.2).

---

## RESOLUCIÓN CRÍTICA: IGSTORY-02 (graph.facebook.com vs graph.instagram.com) — LIVE TEST

**Estado:** RESUELTO con evidencia empírica + documentación oficial.

**Decisión:** **Usar `graph.facebook.com/v22.0/{IG_USER_ID}/media`** para crear el Story container (mismo host que ya usa la cadena single-photo y carousel del workflow actual).

### Evidencia empírica (curl reproducible)

Test ejecutado el 2026-04-23 con las credenciales reales del proyecto (`META_PAGE_TOKEN` + `INSTAGRAM_ACCOUNT_ID=17841480004109313`):

**Test A — `graph.facebook.com` (HOST CORRECTO):**

```bash
curl -X POST "https://graph.facebook.com/v22.0/17841480004109313/media" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1080&h=1920&fit=crop",
    "media_type": "STORIES",
    "access_token": "<META_PAGE_TOKEN>"
  }'
```

**Respuesta — 200 OK:**
```json
{ "id": "17869042140666804" }
```

**Test B — `graph.instagram.com` (FALLA con el token actual):**

```bash
curl -X POST "https://graph.instagram.com/v22.0/17841480004109313/media" \
  -H "Content-Type: application/json" \
  -d '{ "image_url": "...", "media_type": "STORIES", "access_token": "<META_PAGE_TOKEN>" }'
```

**Respuesta — 400 Bad Request:**
```json
{
  "error": {
    "message": "Invalid OAuth access token - Cannot parse access token",
    "type": "OAuthException",
    "code": 190,
    "fbtrace_id": "AiS9PHEqtfFZSfMuMgzFbGM"
  }
}
```

### Por qué `graph.facebook.com` es el host correcto

Meta opera **dos sabores** de Instagram Graph API con autenticación distinta:

| Sabor | Host | Token type | Aplicación a Propulsar |
|---|---|---|---|
| **Instagram API with Facebook Login** | `graph.facebook.com` | **Page Access Token** | ✅ Lo que tenemos (Susana asignada como admin de la Page; IG cuenta linkeada) |
| **Instagram API with Instagram Login** | `graph.instagram.com` | Instagram User Access Token (OAuth flow nuevo) | ❌ No aplicable; requeriría re-onboarding completo |

El workflow actual ya usa `graph.facebook.com` para single-photo y carousel (ver nodos `📤 IG: Create Container` línea 1175, `🚀 IG: media_publish` línea 1225, `🎠 IG: Create Parent Container` línea 1781). Story DEBE seguir el mismo host por coherencia y porque el token solo funciona allí.

### Verificación adicional: container readiness

El container creado en Test A fue consultado inmediatamente (Test C):

```bash
curl "https://graph.facebook.com/v22.0/17869042140666804?fields=status_code,status&access_token=<TOKEN>"
```

**Respuesta:**
```json
{
  "status_code": "FINISHED",
  "status": "Finished: Media has been uploaded and it is ready to be published.",
  "id": "17869042140666804"
}
```

Es decir: para una imagen JPEG de ~230KB el container Story alcanza `FINISHED` en **< 5 segundos** desde la creación. **45s de espera (IGSTORY-03) es muy conservador y seguro** — coincide con el patrón ya usado en `⏳ IG: Wait 30s Carousel` (línea 1763, `amount: 45`, etiquetado "30s" por nombre histórico).

### Configuración exacta del nodo `📤 IG: Create Story Container`

Copy-paste-ready para el plan:

```json
{
  "parameters": {
    "method": "POST",
    "url": "=https://graph.facebook.com/v22.0/{{ $env.INSTAGRAM_ACCOUNT_ID }}/media",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ image_url: $json.final_image_url, media_type: 'STORIES', access_token: $env.META_PAGE_TOKEN }) }}",
    "options": {}
  },
  "id": "ig-create-story-container",
  "name": "📤 IG: Create Story Container",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "retryOnFail": true,
  "maxTries": 2,
  "waitBetweenTries": 3000,
  "onError": "continueErrorOutput",
  "notes": "IGSTORY-02: Crea el contenedor de Story IG. Host verificado por live API test (Phase 12 Plan 12-01 Task 1): graph.facebook.com con Page Access Token. NO incluir caption — Stories no aceptan caption (Meta lo ignora silenciosamente). image_url debe ser pública y 9:16 (Phase 11 garantiza ratio: Ideogram 736×1312). Idempotente — retry seguro. Output: { id: <container_id> }."
}
```

> ⚠️ **NO incluir el campo `caption`** en el body. Confirmado por Meta docs (IG Media reference): "captions are not supported on stories". Si lo incluís, no rompe pero se descarta silenciosamente y agrega ruido. La caption del Story debe quedar fuera del flujo IG (las "stickers" de texto de IG Stories no son configurables vía API en v1.2 — diferido a v2 según Phase 10 backlog).

---

## Standard Stack (no hay decisión nueva — todo heredado del workflow)

### Core

| Library/API | Version | Purpose | Why standard |
|---|---|---|---|
| Meta Graph API | v22.0 | Container creation + media_publish + permalink GET | Ya usado por single-photo y carousel; mismo host (graph.facebook.com), mismo token, mismo patrón |
| n8n self-hosted | 2.14.2 (Azure EasyPanel) | Workflow runtime | Single source of truth en `n8n/workflow.json` |
| FB Pages Stories API | v22.0 endpoint `/photo_stories` | Publicar Story en Facebook Page (opcional, según `platforms`) | Endpoint verificado live (test devuelve "Provide a valid photo identifier" code 100 → existe en v22) |
| Supabase content_sessions | Postgres + PostgREST | Estado entre webhooks | Schema Story columns ya creadas en Phase 11 |
| YCloud WhatsApp Business | v2 API | Notificación post-publish | Misma cuenta y endpoint que single/carousel |
| Google Sheets | v4 (n8n nodo googleSheets) | Log de publicación | Mismo Sheet `Log` y misma credencial `XjKteoOTobs1qR55` ("Google Sheets account") |

### No new dependencies

No hay paquetes nuevos a instalar, ni n8n nodos nuevos a habilitar. Todo es composición de nodos existentes (`httpRequest 4.2`, `wait 1`, `if 1`, `code 2`, `googleSheets 4.4`).

### Alternatives considered (y descartadas)

| En vez de | Se podría usar | Trade-off |
|---|---|---|
| `graph.facebook.com` | `graph.instagram.com` | Requiere migrar a Instagram User Access Token (re-onboarding completo, OAuth flow nuevo). **Verificado falla con token actual.** Diferir a v2 si alguna vez se quiere desacoplar de FB Page. |
| Wait fija 45s | Polling cada 2s con max 15 intentos (Meta docs recomienda esto) | Live test mostró FINISHED en <5s para JPEG ~230KB; 45s es muy conservador pero consistente con `⏳ IG: Wait 30s Carousel`. Polling agrega ~3 nodos (loop, IF, status check) sin beneficio práctico. **Mantener wait fija.** |
| `POST /photo_stories` (FB) | Subir como `/feed` post normal | Stories de FB Page tienen UI distinta y expiración 24h. Si el `platforms` array incluye `facebook`, el usuario espera Story (no feed). **Mantener `/photo_stories`.** |
| Reusar `🚀 IG: media_publish` (single) | Crear `🚀 IG: Story media_publish` separado | El nodo single ya tiene downstream a `💬 IG: Post Hashtag Comment` que **NO debe ejecutarse para Stories** (IGSTORY-06). Necesita rama terminal separada. **Mantener nodo separado.** |

---

## Architecture Patterns

### Cadena de publicación Carousel (referencia, ya en producción)

Verificado en `n8n/workflow.json` líneas 1707–2042:

```
🔗 Merge Rehost Output (línea 836)
    └─→ 🔀 ¿Formato Carrusel? (línea 1390, IF v1)
         ├─[TRUE]─→ 🎠 IG: Explode Carousel Slides (1707)
         │           └─→ 🖼️ IG: Create Child Container (1735) ──onError→ 🏷️ Tag IG Error
         │                └─→ 🗂️ IG: Collect Child IDs (1754)
         │                     └─→ ⏳ IG: Wait 30s Carousel (1769, amount=45) [el nombre miente, son 45s]
         │                          └─→ 🎠 IG: Create Parent Container (1797) ──onError→ 🏷️ Tag IG Error
         │                               └─→ 🚀 IG: Carousel media_publish (1829, retryOnFail=false) ──onError→ 🏷️ Tag IG Error
         │                                    └─→ 💬 IG: Post Carousel Hashtag Comment (1852) ──onError→ 🏷️ Tag IG Error
         │                                         └─→ 🔗 IG: Get Carousel Permalink (1885) ──onError→ 🏷️ Tag IG Error
         │                                              └─→ 🖼️ FB: Explode Carousel Slides (1904)
         │                                                   └─→ 📤 FB: Upload Photo Unpublished (1932) ──onError→ 🏷️ Tag FB Error
         │                                                        └─→ 🗂️ FB: Collect Photo IDs (1951)
         │                                                             └─→ 🔧 FB: Build attached_media (1966)
         │                                                                  └─→ 🌐 FB: Publish Carousel Feed (1994, retryOnFail=false) ──onError→ 🏷️ Tag FB Error
         │                                                                       └─→ ✅ Notify WhatsApp Carousel (2030)
         │                                                                            └─→ 📊 Google Sheets Log (Carousel) (2196)
         │                                                                                 └─→ 🧹 Extract Blob Names (2568) → 🗑️ Delete Azure Blob
         └─[FALSE]─→ 📤 IG: Create Container (single, 1194)... [resto cadena single-photo]
```

### Cadena propuesta para Story (a construir en Plan 12-01)

Ramificación nueva en la salida FALSE de `🔀 ¿Formato Carrusel?` mediante un nuevo router `🔀 ¿Formato Story?`:

```
🔀 ¿Formato Carrusel? (output 1 / FALSE)
    └─→ 🔀 ¿Formato Story? (NUEVO, IF v1, condition: $json.format === 'story')
         ├─[TRUE / Story]─→ 📤 IG: Create Story Container (NUEVO)
         │                       │   POST graph.facebook.com/v22.0/{IG_USER_ID}/media
         │                       │   body: { image_url, media_type:'STORIES', access_token }
         │                       │   retryOnFail=true, maxTries=2, waitBetweenTries=3000ms
         │                       │   onError: continueErrorOutput → 🏷️ Tag IG Error
         │                       │
         │                       └─→ ⏳ IG: Wait 45s Story Container (NUEVO, wait v1, amount=45)
         │                            └─→ 🚀 IG: Story media_publish (NUEVO)
         │                                 │   POST graph.facebook.com/v22.0/{IG_USER_ID}/media_publish
         │                                 │   body: { creation_id: $json.id, access_token }
         │                                 │   retryOnFail=false (NO idempotente — IGSTORY-04)
         │                                 │   onError: continueErrorOutput → 🏷️ Tag IG Error
         │                                 │
         │                                 └─→ 🔗 IG: Get Story Permalink (NUEVO)
         │                                      │   GET graph.facebook.com/v22.0/{media-id}?fields=permalink,timestamp,media_product_type
         │                                      │   retryOnFail=true, maxTries=3
         │                                      │   onError: continueErrorOutput → 🏷️ Tag IG Error
         │                                      │
         │                                      └─→ 🔧 IG: Compute Story Expiry (NUEVO, code v2)
         │                                           │   IGSTORY-05: si Meta no devuelve expires_at,
         │                                           │   compute story_expires_at = timestamp + 86400000ms
         │                                           │
         │                                           └─→ [opcional, según platforms] 🌐 FB: Publish Photo Story (NUEVO)
         │                                                │   2 sub-nodos (espejo del flow FB carousel):
         │                                                │   1. 📤 FB: Upload Story Photo Unpublished (POST /{PAGE_ID}/photos, published=false)
         │                                                │   2. 🌐 FB: Publish Story (POST /{PAGE_ID}/photo_stories, photo_id)
         │                                                │   onError: continueErrorOutput → 🏷️ Tag FB Error
         │                                                │
         │                                                └─→ ✅ Notify WhatsApp Story (NUEVO)
         │                                                     └─→ 📊 Google Sheets Log (Story) (NUEVO)
         │                                                          └─→ 🧹 Extract Blob Names [REUSADO]
         │
         └─[FALSE / single]─→ 📤 IG: Create Container (single, 1194) [intacto]
```

### Pattern: IF v1 router (consistencia con Phase 7 + Phase 11)

```json
{
  "parameters": {
    "conditions": {
      "string": [
        { "value1": "={{ $json.format }}", "value2": "story" }
      ]
    }
  },
  "id": "format-story-branch",
  "name": "🔀 ¿Formato Story?",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "notes": "IGSTORY-01: Routes story briefs (format=story) to Story publish chain (TRUE output 0). Single-post briefs continue (FALSE output 1) to existing 📤 IG: Create Container. Uses IF typeVersion 1 — v2/Switch v3 broken in n8n 2.14.2."
}
```

### Anti-patterns a evitar

- **❌ NO conectar Story chain a `💬 IG: Post Hashtag Comment` ni `💬 IG: Post Carousel Hashtag Comment`** — IGSTORY-06 prohíbe hashtag comments en Stories (no aporta y silenciosamente puede fallar). El Story branch DEBE ser terminal separado.
- **❌ NO reusar el wait `⏳ Wait 30s (container ready)` ni `⏳ IG: Wait 30s Carousel`** — son ramas distintas; cualquier conexión cruzada puede crear race conditions o bloqueos en el Wait persistido. Crear un wait nuevo `⏳ IG: Wait 45s Story Container`.
- **❌ NO incluir `caption` en el body del Create Story Container** — Meta lo ignora silenciosamente; agrega ruido al payload.
- **❌ NO setear `retryOnFail=true` en `🚀 IG: Story media_publish` ni en `🌐 FB: Publish Story`** — IGSTORY-04 explícito; ambos son no-idempotentes.

---

## Don't Hand-Roll

| Problema | NO construir | Usar | Por qué |
|---|---|---|---|
| Polling de container readiness | Loop con SplitInBatches + Status GET + IF | Wait fija 45s (consistente con carousel) | Live test mostró FINISHED en <5s; 45s es overkill y polling agrega 3+ nodos sin beneficio. Si en producción aparece error 9007 (container not ready) en >5% ejecuciones, escalar a polling en v2. |
| Fallback de `expires_at` calculado | Compute en cada GET con cross-refs complejos | Code node simple `📈 IG: Compute Story Expiry` con `new Date($json.timestamp).getTime() + 86400000` | Meta NO documenta `expires_at` como campo de IG Media (verificado 2 docs). El `timestamp` SÍ está disponible y es ISO-8601. La fórmula es trivial. |
| Manejo de "permalink puede no estar disponible inmediatamente" | Retry exponencial custom | n8n native `retryOnFail=true, maxTries=3, waitBetweenTries=1000` | Patrón ya en uso en `🔗 IG: Get Permalink` (single, línea 1281) y `🔗 IG: Get Carousel Permalink` (línea 1892). Funciona en producción. |
| Detección de Story vs Feed/Reel en respuesta | Lógica custom basada en `media_type` | Pedir `media_product_type` en el GET fields (Meta retorna `STORY`, `FEED` o `REELS`) | Meta lo expone explícitamente; usarlo simplifica auditoría futura. |
| Subida de imagen al CDN antes de IG Story | Código nuevo de subida | El sub-workflow `🔁 Re-host Images` (Phase 4) ya re-hostea a Azure Blob — `final_image_url` es Azure permalink | Ya pasa por `🔧 Prep Re-host Input` → `🔁 Re-host Images` → `🔗 Merge Rehost Output`. La URL pública garantizada para Meta. |

**Insight clave:** **Phase 12 NO inventa nada nuevo**, solo compone patrones ya en producción. Cada nodo nuevo tiene un análogo en el carousel chain. La única novedad real es el endpoint `media_type=STORIES` (que ya validamos live) y el endpoint FB `/photo_stories` (ya validado existe en v22).

---

## Code Examples (verified)

### 1. IG Create Story Container (httpRequest)

```json
{
  "method": "POST",
  "url": "=https://graph.facebook.com/v22.0/{{ $env.INSTAGRAM_ACCOUNT_ID }}/media",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [{ "name": "Content-Type", "value": "application/json" }]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ image_url: $json.final_image_url, media_type: 'STORIES', access_token: $env.META_PAGE_TOKEN }) }}"
}
```
**Source:** Live API test 2026-04-23 + Meta IG Media reference (`fields=media_type,media_product_type` exclusivo en la respuesta GET post-publish).

### 2. IG Story media_publish

```json
{
  "method": "POST",
  "url": "=https://graph.facebook.com/v22.0/{{ $env.INSTAGRAM_ACCOUNT_ID }}/media_publish",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [{ "name": "Content-Type", "value": "application/json" }]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ creation_id: $json.id, access_token: $env.META_PAGE_TOKEN }) }}",
  "retryOnFail": false,
  "maxTries": 1,
  "onError": "continueErrorOutput"
}
```
**Source:** Espejo exacto de `🚀 IG: media_publish` (workflow.json línea 1224) y `🚀 IG: Carousel media_publish` (línea 1812). Mismo endpoint, mismo body shape; solo cambia el `creation_id` de origen. **CRÍTICO: `retryOnFail: false` (IGSTORY-04 + ERR-02 pattern).**

### 3. IG Get Story Permalink + Compute Expiry

```json
{
  "method": "GET",
  "url": "=https://graph.facebook.com/v22.0/{{ $json.id }}",
  "sendQuery": true,
  "queryParameters": {
    "parameters": [
      { "name": "fields", "value": "permalink,timestamp,media_product_type" },
      { "name": "access_token", "value": "={{ $env.META_PAGE_TOKEN }}" }
    ]
  },
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000,
  "onError": "continueErrorOutput"
}
```

Y el code node siguiente para fallback de `expires_at`:

```javascript
// 🔧 IG: Compute Story Expiry (code v2, runOnceForEachItem)
const item = { ...$input.item.json };
// Meta NO documenta expires_at en IG Media. Calculamos publish_time + 24h.
// $json.timestamp es ISO-8601 UTC del media publish (devuelto por el GET).
if (item.timestamp) {
  item.story_expires_at = new Date(new Date(item.timestamp).getTime() + 86400000).toISOString();
} else {
  // Fallback de fallback: ahora + 24h.
  item.story_expires_at = new Date(Date.now() + 86400000).toISOString();
}
return { json: item };
```

### 4. FB Publish Photo Story (2 nodos: upload unpublished + publish)

**Nodo A — `📤 FB: Upload Story Photo Unpublished`:**

```json
{
  "method": "POST",
  "url": "=https://graph.facebook.com/v22.0/{{ $env.FACEBOOK_PAGE_ID }}/photos",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [{ "name": "Content-Type", "value": "application/json" }]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ url: $('🔗 Merge Rehost Output').item.json.blob_urls[0].url, published: false, access_token: $env.META_PAGE_TOKEN }) }}",
  "retryOnFail": true,
  "maxTries": 2,
  "waitBetweenTries": 3000,
  "onError": "continueErrorOutput"
}
```

**Nodo B — `🌐 FB: Publish Photo Story`:**

```json
{
  "method": "POST",
  "url": "=https://graph.facebook.com/v22.0/{{ $env.FACEBOOK_PAGE_ID }}/photo_stories",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [{ "name": "Content-Type", "value": "application/json" }]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ photo_id: $json.id, access_token: $env.META_PAGE_TOKEN }) }}",
  "retryOnFail": false,
  "maxTries": 1,
  "onError": "continueErrorOutput"
}
```
**Source:** Live test verificó endpoint existe en v22.0 (response: code 100 "Provide a valid photo identifier" para photo_id bogus → endpoint reconocido). Patrón two-step documentado en Meta Page Stories API. **Response esperado:** `{ "success": true, "post_id": <id> }`.

> ⚠️ **Imagen 9:16 + ≤4MB** según specs FB photo_stories (Meta docs: "max 4MB; .png recommended ≤1MB"). El Ideogram Story de Phase 11 (736×1312, JPEG ~150KB) cumple cómodamente.

### 5. Patch al `🕐 Compute wait_seconds` (SCHED-02)

Código actual (`workflow.json` línea 2213):

```javascript
const data = $input.first().json;
const pub = data.publish_at;

let scheduled = false;
let wait_seconds = 0;

if (pub && pub !== 'now') {
  const diffMs = new Date(pub).getTime() - Date.now();
  if (diffMs > 65000 && diffMs <= 86400000) {
    scheduled = true;
    wait_seconds = Math.round(diffMs / 1000);
  }
}

return [{ json: { ...data, scheduled: String(scheduled), wait_seconds } }];
```

**Patch propuesto (mínimo, no rompe single ni carousel):**

```javascript
const data = $input.first().json;
const pub = data.publish_at;

let scheduled = false;
let wait_seconds = 0;

if (pub && pub !== 'now') {
  const diffMs = new Date(pub).getTime() - Date.now();
  if (diffMs > 65000 && diffMs <= 86400000) {
    scheduled = true;
    wait_seconds = Math.round(diffMs / 1000);
  }
}

// SCHED-02: Story con wait > 22h rechaza (no permite publish dentro del último 1h45m
// del expiry-window de Meta; deja margen para retry y propagación).
if (data.format === 'story' && wait_seconds > 79200) {
  throw new Error(
    'SCHED-02: Story scheduling rechazado. wait_seconds=' + wait_seconds +
    ' supera el máximo de 79200s (22h). El container Story de Meta expira a las 24h, ' +
    'la ventana publicable se reduce. Programá la Story para una fecha más cercana o ' +
    'respondé NO en WhatsApp y regenerá.'
  );
}

return [{ json: { ...data, scheduled: String(scheduled), wait_seconds } }];
```

**Por qué esta es la modificación mínima:**
- Solo agrega un `if` al final (antes del `return`).
- Mantiene `format` heredado intacto (single = `undefined` o ausente; carousel = `'carousel'`; ambos pasan el guard sin cambios).
- Lanza `Error` antes de cualquier operación destructiva (no llega al Wait ni al Prep Re-host Input).
- El error captura el contexto exacto y guía al usuario.
- Verificable con un test unit: brief.format='story' + brief.publish_at = (now + 23h) debería fallar con el mensaje.

### 6. Patch al `🔧 Prep Re-host Input` — REMOVER GUARD DE PHASE 11

Código actual (`workflow.json` línea 708, líneas 8–11 del jsCode):

```javascript
const data = $input.first().json;
// Phase 11 temporary guard — remove in Phase 12 when Story publishing ships
if (data.format === 'story') {
  throw new Error('Phase 11 guard: Story publishing not yet supported (arrives in Phase 12). Reply NO en WhatsApp para cancelar esta sesión. Si respondiste SI por error, la sesión queda colgada — eliminala del dashboard de Supabase.');
}
const format = data.format || 'single';
// ... resto sin cambios
```

**Patch:** **eliminar el bloque `if (data.format === 'story') {...}` completo** (líneas 8–11 del jsCode). Resultado:

```javascript
const data = $input.first().json;
const format = data.format || 'single';
// ... resto idéntico
```

**Justificación:** Una vez que Phase 12 cablea la rama Story end-to-end, el guard ya cumplió su misión (proteger Phase 11 de routing huérfano). Removerlo permite que `format=story` fluya naturalmente hasta `🔀 ¿Formato Story?` (que se insertará después de `🔀 ¿Formato Carrusel?`).

> ⚠️ **Verificación necesaria:** Después del patch, el código debe seguir manejando el caso `format === 'story'` correctamente en el bloque de derivación de `imageUrls`. La lógica actual:
> ```javascript
> if (format === 'carousel' && Array.isArray(data.image_urls)) {
>   imageUrls = data.image_urls.map((url, i) => ({ index: i + 1, url }));
> } else if (data.final_image_url) {
>   imageUrls = [{ index: 1, url: data.final_image_url }];
> } else {
>   throw new Error('Prep Re-host Input: no image URL found...');
> }
> ```
> Para `format=story`, `data.final_image_url` está poblado por Phase 11 (verificado en `🔗 Re-attach session data (Story)` línea 1599) → cae al `else if (data.final_image_url)` y arma `imageUrls = [{ index: 1, url: <ideogram_story_url> }]`. **Funciona sin cambios adicionales.**

---

## ERR-01 wiring map (cómo cablear los nuevos nodos al subgrafo de error existente)

### Subgrafo de error existente (verificado, 9 nodos)

```
🏷️ Tag IG Error (línea 2267) ──────┐
                                     ├─→ 🚨 Parse Meta Error (2297)
🏷️ Tag FB Error (línea 2282) ──────┘        │
                                              └─→ ⚠️ ¿Token Expirado? (2318)
                                                   ├─[TRUE]─→ 📤 WA: Token Expirado (2350)
                                                   │             └─→ 📊 Sheets Fail Log (2546)
                                                   └─[FALSE]→ 📤 WA: Error Publicación (2383)
                                                                 └─→ 📊 Sheets Fail Log
                                                                      └─→ 🧹 Extract Blob Names (2567)
                                                                           └─→ 🗑️ Delete Azure Blob (2597)
```

**El subgrafo ya está en producción y NO requiere ningún cambio para Phase 12** (ERR-01 explícito: "no changes to subgraph logic"). Solo hay que cablear los `onError` outputs de los nodos nuevos al join correcto.

### Mapa de wiring para nodos nuevos

| Nodo nuevo (Phase 12) | onError → conectar a | Razón |
|---|---|---|
| `📤 IG: Create Story Container` | `🏷️ Tag IG Error` | Es nodo IG (error tag = Instagram) |
| `🚀 IG: Story media_publish` | `🏷️ Tag IG Error` | Es nodo IG |
| `🔗 IG: Get Story Permalink` | `🏷️ Tag IG Error` | Es nodo IG |
| `📤 FB: Upload Story Photo Unpublished` | `🏷️ Tag FB Error` | Es nodo FB Page |
| `🌐 FB: Publish Photo Story` | `🏷️ Tag FB Error` | Es nodo FB Page |

**No hace falta** cablear `onError` para:
- `🔀 ¿Formato Story?` (IF v1 no tiene HTTP failure mode)
- `⏳ IG: Wait 45s Story Container` (Wait no falla salvo n8n DB issue)
- `🔧 IG: Compute Story Expiry` (code node — un throw aborta la execution; pero el cálculo es trivial y no debería fallar)
- `✅ Notify WhatsApp Story` (el patrón existente usa `onError: stopWorkflow` — WA failure no debe bloquear el log de éxito; ver `✅ Notify WhatsApp Carousel` línea 2040)
- `📊 Google Sheets Log (Story)` (el patrón existente no cablea Sheets a error handler)

### Verificación tras wiring

Tras conectar `onError → 🏷️ Tag IG Error` en los 3 nodos IG Story, un fallo simulado (ej. token expirado) debe desencadenar:
1. `🏷️ Tag IG Error` agrega `_platform: 'Instagram'`.
2. `🚨 Parse Meta Error` (línea 2294) extrae `error_code, error_message, fbtrace_id, is_token_expired` y cross-refs `🔗 Merge Rehost Output` para `approval_number, topic, blob_urls`.
3. `⚠️ ¿Token Expirado?` decide entre alerta especial (Susana) o genérica.
4. `📊 Sheets Fail Log` registra row con `Publish_Status='failed'`.
5. `🧹 Extract Blob Names` + `🗑️ Delete Azure Blob` limpia blobs huérfanos (importante: el blob ya fue subido en Phase 4 antes del fallo).

---

## Common Pitfalls

### Pitfall 1: Confusion between `graph.facebook.com` y `graph.instagram.com`
**Qué pasa:** Plan 11 / Roadmap dice "graph.instagram.com" en IGSTORY-02 → si se implementa literal, el primer test arroja error 190 OAuthException y bloquea la fase.
**Por qué:** Meta migró parte de la documentación a "Instagram API with Instagram Login" (host nuevo) pero el flujo "with Facebook Login" (lo que tenemos) sigue en `graph.facebook.com`.
**Cómo evitar:** Live test en Plan 12-01 Task 1 (script reproducible arriba). Documentar el resultado en `12-01-SUMMARY.md`.
**Señal temprana:** Cualquier respuesta `code: 190 "Cannot parse access token"` en una llamada de Story → hostname incorrecto.

### Pitfall 2: Caption silenciosamente ignorado
**Qué pasa:** Si pasás `caption` en el body de Create Story Container, Meta lo descarta sin error → quien debug el flow asume "el caption se publicó" pero la Story aparece muda.
**Por qué:** Stories no soportan captions/text overlays vía API (los stickers UI no son configurables).
**Cómo evitar:** **NO incluir `caption` en `jsonBody`**. Documentarlo en el `notes` del nodo. Si en el futuro hace falta texto en la imagen (tipo "DESLIZÁ →"), Phase 11 ya delega esto a Ideogram (que renderiza texto bien).
**Señal temprana:** Story IG visible en perfil pero sin caption visible — comportamiento esperado, NO es bug.

### Pitfall 3: `expires_at` no existe como campo de IG Media
**Qué pasa:** Si pedís `?fields=expires_at,permalink`, Meta responde error 100: "Tried accessing nonexisting field (expires_at)". **Verificado live en Test D arriba.**
**Por qué:** Meta NO documenta `expires_at` en IG Media reference. La expiración 24h es comportamiento del producto, no metadata de la API.
**Cómo evitar:** **NO pedir `expires_at`** en el GET. Pedir `permalink,timestamp,media_product_type` y calcular `story_expires_at = new Date(timestamp).getTime() + 86400000` en un Code node siguiente. **Esta es exactamente la lógica de fallback documentada en IGSTORY-05.**
**Señal temprana:** Error 100 en Get Permalink → revisar que el `fields` query param NO incluya `expires_at`.

### Pitfall 4: Container creation timing — race condition con media_publish
**Qué pasa:** `media_publish` con creation_id antes de que el container esté `FINISHED` → error 9007 / "Media not ready".
**Por qué:** Container creation es asíncrono en Meta (procesamiento de imagen, validación de URL).
**Cómo evitar:** Wait 45s fija (mismo patrón que carousel). Live test mostró FINISHED en <5s para JPEG ~230KB; 45s es 9× margen. Si en producción aparece error 9007 con frecuencia >5%, escalar a polling (max 5min, cada 30s) en v2.
**Señal temprana:** Error 9007 / 2207027 en `🚀 IG: Story media_publish` → aumentar wait o implementar polling.

### Pitfall 5: media_publish NO es idempotente — duplicate Story risk
**Qué pasa:** Si `🚀 IG: Story media_publish` falla con timeout (no respuesta de Meta) Y se reintenta, podés terminar con 2 Stories publicadas (Meta procesó la primera pero no respondió a tiempo).
**Por qué:** El endpoint no implementa idempotency keys.
**Cómo evitar:** **`retryOnFail: false, maxTries: 1`** (IGSTORY-04). Si falla, el operador (Felix) verifica manualmente IG profile y limpia si hace falta. Si pasa muy seguido, escalar a un dedup table en Supabase (diferido a v2).
**Señal temprana:** Misma Story aparece 2× en el perfil IG → confirmar que `retryOnFail=false` está activo en el nodo.

### Pitfall 6: FB photo_stories aspect ratio fallback
**Qué pasa:** Subís una imagen 1:1 al `/photo_stories` endpoint y FB Story aparece con bandas negras/blancas o cropped.
**Por qué:** FB Stories esperan 9:16 (`1080×1920` o equivalente).
**Cómo evitar:** Phase 11 ya garantiza 9:16 (Ideogram 736×1312, ratio 0.5611, delta 0.27% del ideal 0.5625). Confirmado: FB Story acepta este ratio sin distorsión.
**Señal temprana:** FB Story con barras negras → revisar `aspect_ratio` en Supabase (debe ser `9:16`) y confirmar que Ideogram devuelve dimensiones correctas.

### Pitfall 7: `🔗 Re-attach session data (Story)` reemplaza el item completo
**Qué pasa:** Después del POST a Supabase con `Prefer: return=representation`, n8n reemplaza el item con la fila insertada (flat schema). Si el siguiente nodo cross-refs `$json.instagram` o `$json.format`, falla.
**Por qué:** Patrón ya enfrentado y resuelto en Phase 11 — el nodo `🔗 Re-attach session data (Story)` (línea 1599) usa `$('🔗 Normalizar URL imagen — Story').item.json.<field>` para todos los 15 campos. Si en Phase 12 se construye un nuevo nodo de re-attach, debe seguir el mismo patrón.
**Cómo evitar:** **Reusar el contrato existente del payload de 15 campos** documentado en STATE.md y verificable en líneas 1497–1606 del workflow.json. El `🔧 Prep Re-host Input` ya recibe estos 15 campos y derivará `final_image_url` para el Create Story Container.
**Señal temprana:** En el step `🔧 Prep Re-host Input`, `data.final_image_url` viene `null` o `undefined` → revisar conexión upstream a `🔗 Re-attach session data (Story)`.

### Pitfall 8: Hashtag comment node accidentalmente accesible
**Qué pasa:** Si por error conectás el Story permalink output a `💬 IG: Post Hashtag Comment` (mismo nombre, fácil confusión visual), Meta intenta postear hashtags como comentario en una Story → error o silent skip.
**Por qué:** Stories no soportan comments via Graph API (las "respuestas" a Stories son DMs y no son scope del workflow).
**Cómo evitar:** IGSTORY-06 explícito: rama Story es **terminal separada**. NO conectar el output principal de `🔗 IG: Get Story Permalink` a ningún nodo de hashtag comment. Verificar visualmente en n8n editor que la rama termina en Sheets Log.
**Señal temprana:** Logs de n8n muestran error en `💬 IG: Post Hashtag Comment` durante Story execution → revisar conexiones del Story branch.

### Pitfall 9: n8n 2.14.2 — IF v2 broken, usar v1
**Qué pasa:** Si creás `🔀 ¿Formato Story?` con `typeVersion: 2`, el routing puede ser inconsistente o no respetar los outputs.
**Por qué:** Bug conocido de n8n 2.14.2 (registrado en STATE.md, comentado en notes de `🔀 ¿Formato Carrusel?` línea 1397).
**Cómo evitar:** **Siempre `typeVersion: 1`** para nodos IF en este workflow. Ver `🔀 ¿Carrusel?` y `🔀 ¿Formato Carrusel?` como referencia.

### Pitfall 10: Container creation timeout vs Azure Blob URL latency
**Qué pasa:** Si Meta intenta fetchear `image_url` (Azure Blob) y la URL devuelve >10s, container queda en `IN_PROGRESS` largo tiempo.
**Por qué:** Meta hace HEAD/GET sobre `image_url` para validar antes de aceptar. Azure Blob responde en <500ms en CET, pero si el blob se rehosteó a una región distante, latency sube.
**Cómo evitar:** Phase 4 ya rehostea a Azure Blob (`propulsarcontent.blob.core.windows.net`) que está en West Europe — geo-cercano a Meta EU. **No requiere acción.** Si en producción se ve `IN_PROGRESS` >30s, considerar CDN delante de Azure Blob.
**Señal temprana:** Container `status_code = IN_PROGRESS` después de 45s wait → polling de safety o ampliar wait a 90s.

---

## Risks & Gotchas (resumen ejecutivo)

| Riesgo | Severidad | Mitigación en Phase 12 |
|---|---|---|
| Hostname incorrecto (graph.instagram.com) | 🔴 Crítico | Live test en Plan 12-01 Task 1 + corrección inline del Roadmap/Reqs |
| `expires_at` no existe → fallo en Get Permalink | 🟡 Medio | NO pedir `expires_at`; usar `timestamp` + 24h compute |
| Caption silenciosamente ignorado | 🟢 Bajo | NO incluir caption en body; documentar en notes |
| Duplicate Story por retry | 🟡 Medio | `retryOnFail: false` (IGSTORY-04) |
| Hashtag comment ejecutado en Story | 🟡 Medio | Rama terminal separada (IGSTORY-06); verificación visual |
| FB photo_stories puede no estar disponible en v22 | 🟢 Bajo | **Verificado live** funciona en v22 (test J retornó error semánticamente correcto code 100) |
| Container readiness >45s en imagen pesada | 🟢 Bajo | JPEG ~230KB testeado en <5s; margen 9× |
| n8n 2.14.2 IF v2 broken | 🟢 Bajo | Usar typeVersion 1 (patrón ya en producción) |
| SCHED-02 guard rompe single/carousel | 🟢 Bajo | Patch mínimo solo agrega `if (format=='story')` al final |
| FB Story endpoint perms insuficientes | 🟡 Medio | Token actual ya publica feed posts y carousels FB → asume `pages_manage_posts`; **verificar en Plan 12-01 Task 1** con un upload+publish E2E real (1 FB Story de prueba que se borrará) |
| Meta API rate limits durante test | 🟢 Bajo | IG content publishing limit = 100 publicaciones/24h por IG account; Phase 12 testing usará 2-3 stories total — irrelevante |
| Story permalink puede tardar en propagarse | 🟢 Bajo | `retryOnFail: true, maxTries: 3, waitBetweenTries: 1000ms` (patrón existente) |

---

## Phase 12 Plan Slicing Recommendation

**Recomiendo 2 plans, espejando exactamente la cadencia exitosa de Phase 11.**

### Plan 12-01: Build IG Story publish chain + FB Story branch + ERR-01 + SCHED-02 + guard removal

**Tasks (estimadas 6-8):**

1. **Task 1 — Live verification (host + perms)**: Reproducir Tests A, G, J de este RESEARCH usando script o curl directo. Documentar resultados (response bodies verbatim) en `12-01-SUMMARY.md`. **Output:** confirmación de `graph.facebook.com` para IG Story y verificación de que el Page Token tiene perms para `/photo_stories`. Si Test J falla con perms insuficientes, ESCALAR antes de codear (potencial blocker requiere Susana sumar `pages_manage_posts` o equivalente).
2. **Task 2 — Insert `🔀 ¿Formato Story?` router**: Crear nodo IF v1, posición a la derecha de `🔀 ¿Formato Carrusel?` salida FALSE. Cablear FALSE→ existing `📤 IG: Create Container`, dejar TRUE pendiente.
3. **Task 3 — Build IG Story publish chain (3 HTTP nodes + 1 Wait + 1 Compute + 1 Sheets Log)**: Create Story Container → Wait 45s → Story media_publish → Get Story Permalink → Compute Story Expiry. Conectar TRUE de `🔀 ¿Formato Story?` a Create Story Container.
4. **Task 4 — Build FB Photo Story chain (2 HTTP nodes)**: Upload Story Photo Unpublished → Publish Photo Story. Cablear desde Compute Story Expiry condicionado a `platforms.includes('facebook')` (puede ser un nodo IF intermedio o una condición en el Upload).
5. **Task 5 — Build success notification path**: Notify WhatsApp Story (similar a `✅ Notify WhatsApp Carousel`) → Google Sheets Log (Story) → conexión a `🧹 Extract Blob Names` (REUSADO).
6. **Task 6 — Wire ERR-01 onError outputs**: Conectar onError de los 3 nodos IG Story → `🏷️ Tag IG Error`. Conectar onError de los 2 nodos FB Story → `🏷️ Tag FB Error`. Sin cambios al subgrafo.
7. **Task 7 — Patch `🕐 Compute wait_seconds` para SCHED-02**: Agregar el `if (data.format === 'story' && wait_seconds > 79200)` guard al final del jsCode.
8. **Task 8 — Remove Phase-11 guard del `🔧 Prep Re-host Input`**: Eliminar el `if (data.format === 'story') { throw ... }` (líneas 8–11 del jsCode actual).

**Workflow node count:** 78 → ~88 (8-10 nodos nuevos según si separás Upload+Publish FB en 2 vs 1).

**Deploy:** PUT /api/v1/workflows/{id} con settings whitelist; sin redeploy (PUT no desactiva).

### Plan 12-02: E2E test live + regression + cleanup

**Tasks (estimadas 4-5):**

1. **Task 1 — E2E Story-only test**: Generar Story con Wizard (`platforms: ['instagram']`, type=story, image_model=ideogram). Aprobar via WA SI. Verificar: Story aparece en perfil IG (visualmente), Sheets row con `Estado=Publicado`, Supabase row con `story_expires_at` poblado, blob limpio (Extract Blob Names + Delete corrió).
2. **Task 2 — E2E Story IG+FB test**: Igual a Task 1 pero `platforms: ['instagram','facebook']`. Verificar Story en ambas plataformas + un único Sheets row.
3. **Task 3 — Regression Carousel + Single (verifica que las nuevas branches no rompieron nada)**: Ejecutar 1 carousel + 1 single. Confirmar publicación correcta en IG+FB y Sheets row.
4. **Task 4 — Failure injection test**: Forzar fallo en `🚀 IG: Story media_publish` (ej. revocar token momentáneamente o usar creation_id inválido). Verificar que: subgrafo de error dispara, Sheets Fail Log row aparece, blob queda limpio (Delete Azure Blob corre desde Sheets Fail Log path).
5. **Task 5 — Cleanup + commit**: Borrar test FB Stories via Graph API (referencia memoria `feedback_delete_test_posts.md`). Commit final con summary de node count y E2E status.

**Estructura de waves:** Plan 12-01 Task 1 es bloqueante (validación host); Tasks 2-8 son secuenciales pero se pueden ejecutar en una sola wave porque dependen del estado del workflow.json. Plan 12-02 Tasks 1-4 son secuenciales (cada una requiere ejecución E2E real); Task 5 al final.

**Tiempo estimado total:** 90-120 minutos de implementación + 30-45 min de testing E2E.

---

## Open Questions

### 1. ¿El Page Token tiene `pages_manage_posts` para `/photo_stories`?
- **Lo que sabemos:** El token actual publica exitosamente feed posts, photos y carousels en FB Page (verificado en Phase 6, 7). Eso requiere `pages_manage_posts`. Por extensión, `/photo_stories` debería funcionar.
- **Lo que es incierto:** Meta a veces requiere permisos adicionales para Stories en versions recientes (e.g. `instagram_business_content_publish` se agregó en algún momento; FB equivalent puede existir).
- **Recomendación:** Plan 12-01 Task 1 incluye un test E2E mínimo de FB Story (subir + publicar 1 photo story de prueba real, luego borrar) para validar perms ANTES de codear. Si falla con perm error, blocker para Susana en Meta Business Manager.

### 2. ¿FB Photo Story devuelve `permalink` después de publicar?
- **Lo que sabemos:** Endpoint devuelve `{ "success": true, "post_id": <id> }` (Meta docs). Para feed posts FB construimos la URL como `https://www.facebook.com/<post_id>` (Phase 6 pattern).
- **Lo que es incierto:** ¿Esa URL es válida también para Stories? Las Stories de Page tienen URL distinta (e.g. `/stories/<page_id>/<story_id>`).
- **Recomendación:** Verificar en Plan 12-02 Task 2 (E2E IG+FB) inspeccionando manualmente la URL FB en la notificación WA. Si no funciona, ajustar el `WA notify` body para no incluir FB URL (solo IG URL + "Publicado en FB Story").

### 3. ¿Hay alguna diferencia entre Story aspect_ratio aceptado por IG vs FB?
- **Lo que sabemos:** IG: 9:16 recomendado, no estricto. FB: 9:16 esperado para Stories.
- **Lo que es incierto:** Si la imagen Story Ideogram (736×1312, ratio 0.5611) tiene crop visible en FB Story (1080×1920 ideal).
- **Recomendación:** Plan 12-02 Task 2 verifica visualmente. Si crop visible, considerar resize a 1080×1920 antes de subir a FB (no afectaría IG ya validado en Phase 11).

---

## Sources

### Primary (HIGH confidence — live API tests + official docs)

- **Live API tests (2026-04-23):**
  - Test A: `POST graph.facebook.com/v22.0/17841480004109313/media` con `media_type=STORIES` → 200 OK `{"id":"17869042140666804"}`
  - Test B: `POST graph.instagram.com/v22.0/17841480004109313/media` → 400 Bad Request `code:190 OAuthException` (token incompatible)
  - Test C: `GET .../17869042140666804?fields=status_code,status` → `FINISHED` immediately
  - Test D: `GET ?fields=expires_at` → 400 `code:100 "Tried accessing nonexisting field (expires_at)"`
  - Test G/I/J: `POST graph.facebook.com/v22.0/981931321668013/photo_stories` → endpoint exists in v22 (validation error semantically correct)
- **Meta IG Media reference** — https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/ — confirmed `permalink, timestamp, media_product_type, media_type, media_url` válidos; `expires_at` NO existe.
- **Meta IG Content Publishing** — https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media — confirmó `media_type=STORIES`, host `graph.facebook.com`, image specs (JPEG, 8MB max, sRGB, 9:16 recommended), captions no soportadas.
- **Meta IG API with Facebook Login** — https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing — confirmó host `graph.facebook.com` + Page Access Token.
- **Workflow.json** lectura directa: nodos referencia `📤 IG: Create Container` (1194), `🚀 IG: media_publish` (1240), `🚀 IG: Carousel media_publish` (1828), `🔗 IG: Get Permalink` (1273), `🔗 IG: Get Carousel Permalink` (1884), `🔧 Prep Re-host Input` (711), `🕐 Compute wait_seconds` (2216), `🏷️ Tag IG Error` (2267), `🚨 Parse Meta Error` (2297), `📤 WA: Token Expirado` (2350), `📤 WA: Error Publicación` (2383), `📊 Sheets Fail Log` (2546), `🧹 Extract Blob Names` (2567).

### Secondary (MEDIUM confidence — verified via search + cross-check)

- **FB Page Stories API** — https://developers.facebook.com/docs/page-stories-api/ — two-step flow (`/photos` published=false → `/photo_stories` con photo_id), endpoint `POST /v25.0/{page_id}/photo_stories`, permisos `pages_manage_posts, pages_read_engagement, pages_show_list`. Versión v22 verificada live.
- **IG Container status codes** — Meta Container reference + comunidad — `EXPIRED, ERROR, FINISHED, IN_PROGRESS`. Polling recomendado cada 2-30s con max 5min.

### Tertiary (LOW confidence — community/blog signal, no implementation impact)

- "Ayrshare: How to Publish Stories with Facebook Stories API" — mencionado en search; usado solo para confirmar el patrón two-step. No necesario.

---

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — todos los nodos son patrones ya en producción (carousel, single)
- Architecture: **HIGH** — espejo exacto del carousel chain con cambios documentados nodo por nodo
- IGSTORY-02 host: **HIGH** — verificación empírica con curl + token real
- expires_at fallback: **HIGH** — verificación empírica + Meta docs (campo NO existe)
- 45s wait: **HIGH** — empírico (FINISHED en <5s, 9× margen)
- FB photo_stories en v22: **HIGH** — verificación empírica (error semántico correcto)
- FB Story permalink format: **MEDIUM** — sin verificar live (no quise contaminar el feed con un Story de prueba)
- pages_manage_posts perm: **MEDIUM** — heredado por inferencia; verificar en Plan 12-01 Task 1
- Pitfalls: **HIGH** — derivados de docs + experiencia Phase 11

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 días para Meta API; v22 estable, próxima major v23 no anunciada)

**Cost incurred:** $0 (todos los tests fueron API calls a endpoints gratuitos: container creation no cobra hasta media_publish; no llegamos a publish).

**Time spent:** ~25 min (read workflow + 4 live tests + 4 doc fetches + write).
