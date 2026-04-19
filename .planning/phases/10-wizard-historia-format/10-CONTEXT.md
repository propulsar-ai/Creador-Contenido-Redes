# Phase 10: Wizard Historia Format - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Agregar "Historia" como tercer formato en el Wizard CLI (`wizard/run.js`), con:
- Opción "Historia" en PASO 3 junto a Post Individual y Carrusel
- Brief JSON enriquecido con `format:"story"`, `aspect_ratio:"9:16"`, `num_images:1`, `story_expires_at`
- Restricción de modelo a Ideogram v3 cuando format=story (Flux y Nano Banana no se ofrecen)
- Validación de scheduling que rechaza fechas a más de 22h vista

Todo antes de que el webhook dispare a n8n. La generación de imagen Story, publicación a Meta, y logging son phases posteriores (11, 12, 13).

</domain>

<decisions>
## Implementation Decisions

### UX del formato Historia (PASO 3)
- **Posición en el menú:** "Historia" aparece al inicio (1º), antes de "Post Individual" y "Carrusel". Destaca el formato nuevo para promover su uso durante rollout v1.2
- **Tipos de post (educativo/autoridad/caso éxito):** disponibles los 3 igual que para Post y Carrusel — Claude adapta los ángulos al formato Story en el prompt de sugerencias

### Selector de modelo (PASO 5)
- **Auto-select con aviso:** cuando format=story, el Wizard salta la selección manual y muestra: "Modelo: Ideogram v3 (único disponible para Historia — texto legible en 9:16)". Cero fricción, educativo
- **Custom image permitida:** usuario puede pegar URL propia (has_own_image=true), pero el Wizard valida que la imagen sea 9:16 vertical (HEAD request + inspección de dimensiones, o parseo de URL si es estándar). Si no es 9:16, rechaza con error claro
- **has_text_in_image:** default recomendado = true para Stories (best practice del formato — Stories funcionan mejor con headline/CTA overlay). Usuario puede override si quiere imagen limpia

### Brief JSON y story_expires_at
- **Todo a criterio de Claude** — user delegó las 4 decisiones técnicas. Ver sección "Claude's Discretion" abajo

### Validación de scheduling <22h
- **Trigger:** inline, apenas el usuario ingresa/elige una fecha >22h. No deja avanzar al siguiente paso hasta corregir. Evita rehacer trabajo al final
- **Wording del error:** técnico + guía. Ejemplo: *"Las Stories expiran en 24h. No podemos programar a más de 22h vista (margen de 2h para procesamiento y aprobación). Elegí una fecha dentro de las próximas 22h."*
- **Reloj base:** `now()` del Wizard (momento en que corre). Simple y predecible. Si hay drift con n8n, lo cubre el guard SCHED-02 en Phase 12
- **Caso "publicar ahora":** skip validación si scheduled_for=null o el usuario elige publicar inmediatamente — obvio que cumple <22h

### Claude's Discretion
Áreas donde el usuario delegó explícitamente la decisión. Researcher/Planner puede proponer lo que mejor encaje con el código existente (`wizard/run.js`, Wizard actual en Node.js):

**UX/presentación:**
- Etiqueta y emoji de "Historia" en el menú — aplicar best practice de agencias de contenido IA (sugerencia: emoji mobile-first o clock emoji que eduque sobre expiry)
- Cómo comunicar el constraint 9:16 vertical en el flujo (mensaje tras elegir formato, en resumen, o múltiples puntos)
- Manejo de back-navigation si el usuario cambia de Flux/Nano a Historia (resetear modelo o asumir flujo lineal)

**Brief JSON (las 4 decisiones técnicas):**
- Base de cálculo de `story_expires_at`: desde `scheduled_for + 24h` si se programa, o `now() + 24h` si es publicar ahora (más coherente con comportamiento Meta, recomendado)
- Formato del timestamp: ISO 8601 UTC con sufijo Z (consistente con timestamp existente del brief)
- Campos adicionales: incluir `scheduled_for` para que n8n ejecute SCHED-02 downstream; resto mínimo según ROADMAP
- Validación local del shape antes del webhook: assert en el Wizard (fail loud, evita webhooks malformados llegando a n8n)

</decisions>

<specifics>
## Specific Ideas

- **Historia al inicio del menú** es una decisión de promoción de producto, no solo UX — Felix quiere empujar el uso del formato nuevo durante v1.2
- **Auto-select Ideogram** mantiene el Wizard rápido y consistente con el principio "reliability > cleverness" del CLAUDE.md global
- **Validación inline** sobre validación al submit es preferida porque reduce frustración — el usuario corrige al toque
- **Tono del error de scheduling** debe educar sobre la restricción de Meta (24h expiry), no solo bloquear — coherente con el tono "profesional pero accesible" de Propulsar

</specifics>

<deferred>
## Deferred Ideas

- **Custom image con validación server-side:** si la validación local de 9:16 (HEAD/parse) resulta insuficiente, se podría añadir validación en n8n en una fase posterior
- **Preview del Story renderizado antes del webhook:** mostrar mockup ASCII o link a vista previa — fuera de scope de Phase 10, podría ir a roadmap backlog

</deferred>

---

*Phase: 10-wizard-historia-format*
*Context gathered: 2026-04-19*
