# Decisión de Motor de Diseño — Fase 15 (v1.3 Diseño Premium)

**Estado:** BORRADOR — pendiente de revisión a ciegas y firma (Plan 15-05, Tareas 2-4)
**Fecha del borrador:** 2026-08-02
**Requisitos que cierra:** EVAL-06 (decisión escrita) y EVAL-07 (análisis Remotion solo-papel)

---

## 1. Contexto y método

### Qué se comparó

Cuatro candidatos, todos renderizando el mismo set de briefs congelados (`briefs.json`, `eval-output/2026-08-02_1510/`):

| Candidato | Qué es |
|---|---|
| **Ideogram v3 (baseline)** | El motor de producción actual — réplica exacta de la llamada real (`n8n/workflow.json`, nodos `🔤 Ideogram v3`), no una versión "mejorada" |
| **Creatomate** | Plantillas de marca propias (5 templates RenderScript, `creatomate/templates/`) compuestas sobre una imagen de fondo placeholder determinística (Creatomate no genera imágenes) |
| **Gamma** | Tema de marca "Propulsar" (`themeId: ergo9wmo77nbvra`) vía la Generate API v1.0 |
| **Híbrido (Flux + Creatomate)** | Fondo generado con FAL Flux 2 Pro, compuesto con las mismas plantillas Creatomate |

**Remotion NO fue candidato en vivo** — quedó fuera por costo, ver sección 4 (EVAL-07).

### El set de briefs

- **3 briefs reales** derivados de posts reales de Instagram de Propulsar: `veterinaria-caso-exito` (incluye el bug real de overflow "veterinaria s." del carrusel del 2026-07-20), `estetica-educativo`, `gimnasio-gpt4o` (usa texto real generado por el pipeline GPT-4o, no texto fijo).
- **Los 3 formatos** por brief donde aplica: single (1:1), carousel (varias slides), story (9:16).
- **2 headlines de estrés de diacríticos** (`diacritics-1`, `diacritics-2`) — á/é/í/ó/ú/ñ/¿/¡ en posición de headline, renderizados en single por los 4 motores.
- **Resultado:** 63/63 renders exitosos, 0 errores (17 Ideogram, 17 Creatomate, 17 Gamma, 12 Híbrido — el híbrido omite legítimamente las slides de cierre sin imagen).

### El protocolo a ciegas

1. **Fase ciega:** Felix y Susana abren `eval-output/2026-08-02_1510/index.html` — los 4 motores aparecen anonimizados como A/B/C/D, sin ningún indicio de identidad (rutas de imagen, atributos DOM y formato de costo fueron específicamente auditados y corregidos para no filtrar identidad — ver `15-04-SUMMARY.md`, deviation #7). Puntúan los 4 criterios visuales por motor anónimo.
2. **Revelar:** tocan el botón "Revelar motores" en la galería — ahí, y solo ahí, se revela el mapeo A/B/C/D → nombre real.
3. **Ajuste post-revelado:** comparan sus puntajes ciegos contra los "PROPUESTOS" de Claude (sección 3 de este documento) y ajustan lo que consideren necesario. **El ajuste de los revisores es final** sobre la propuesta de Claude.
4. Los criterios operativos (latencia, costo, complejidad de integración n8n) son medidos/analíticos, no visuales — se revisan pero normalmente no cambian salvo desacuerdo explícito.

### Reglas de decisión bloqueadas (de `15-CONTEXT.md`, no negociables en esta sesión)

- **Ponderación:** los 4 criterios visuales (legibilidad de texto, consistencia de marca, calidad de layout, diacríticos) pesan **×2**. Los 3 criterios operativos (latencia, costo, complejidad de integración n8n) pesan **×1**.
- **Regla del ganador:** existe un motor ganador **solo si** supera claramente al baseline de Ideogram en el sub-puntaje visual ponderado. Si ninguno lo logra con claridad, la decisión es **"seguimos con Ideogram"** — un resultado válido, no un fracaso de la fase.
- **Convivir por defecto:** si hay un ganador, entra como una rama NUEVA en el router de `image_model` — Ideogram sigue disponible. El reemplazo total solo ocurre si el ganador domina a Ideogram en **los 4 criterios visuales individuales**, no solo en el agregado.
- **Firma doble:** la decisión final requiere el visto bueno de Felix Y Susana.

---

## 2. Rúbrica ponderada (7 criterios)

Escala 1-10 por criterio. Fórmula: `total_ponderado = Σ(criterio_visual × 2) + Σ(criterio_operativo × 1)`, máximo posible = 4×10×2 + 3×10×1 = **110 puntos**.

| # | Criterio | Peso | Tipo | Qué mide |
|---|---|---|---|---|
| 1 | Legibilidad de texto | ×2 | Visual | ¿El texto sobre la imagen es nítido y legible, sin artefactos ni garabatos, independiente de si dice lo correcto? |
| 2 | Consistencia de marca | ×2 | Visual | ¿Respeta la paleta canónica, tipografía Syne/Arimo, badges/CTA, y la tipología de layout bloqueada (slide 1 imagen-detrás-texto-centrado, slides medias imagen-derecha-texto-izquierda, cierre sin imagen)? |
| 3 | Calidad de layout | ×2 | Visual | ¿Se respetan los layouts canónicos sin overflow/recorte/wrapping roto — específicamente el caso de regresión real bloqueado (slide 2 veterinaria, "Llama a 3 veterinarias.")? |
| 4 | Diacríticos | ×2 | Visual | ¿Se renderizan correctamente á/é/í/ó/ú/ñ/¿/¡ del set de estrés EVAL-04? |
| 5 | Latencia de render | ×1 | Operativo | Tiempo real de wall-clock por render, medido (no estimado) |
| 6 | Costo por imagen | ×1 | Operativo | Costo real/efectivo por render — dólar duro donde es medible, quema de créditos/suscripción donde no |
| 7 | Complejidad de integración n8n | ×1 | Operativo | Forma de la API, necesidad de polling/async, manejo de formato de archivo, modelo de auth, experiencia real de esta misma sesión integrando cada motor |

---

## 3. Puntajes propuestos por Claude — **PROPUESTOS, PENDIENTES DE VALIDACIÓN HUMANA**

> ⚠️ Esta sección refleja el análisis de Claude sobre 25+ renders leídos directamente (los 8 renders de estrés de diacríticos completos, ambas secuencias completas de carrusel veterinaria/estética en los 4 motores, singles/stories representativos de cada motor). **No la miren antes de completar la fase ciega de la revisión** — está acá para el paso 3 del protocolo (comparar después de revelar).
>
> Evidencia completa con nombres de archivo y notas metodológicas: `eval-output/2026-08-02_1510/rubric-scores.json`.

### 3.1 Notas metodológicas clave

- **El fondo de Creatomate standalone es un placeholder determinístico** (Lorem Picsum sembrado, costo cero) — Creatomate no genera imágenes propias. Los puntajes de `brand_consistency`/`layout_quality` juzgan fidelidad de texto/tipografía/color, no relevancia del fondo, para que la comparación sea justa a lo que Creatomate realmente ofrece.
- **El brief `gimnasio-gpt4o` usa fuentes de texto distintas para Ideogram vs. los otros 3 motores** (Ideogram lee el campo `image_prompt` con su propio "Text says: ..."; los otros leen `headline`/`body`/`cta` directamente) — esto es más representativo de producción real para Ideogram, pero significa que la comparación de ese brief específico no es 100% palabra-por-palabra idéntica entre motores. No se penalizó a ningún motor por esto.
- **Gamma en modo `textMode:"preserve"` igual puede parafrasear/recortar contenido** al reestructurar en su propio layout de tarjetas — confirmado en `diacritics-2`, donde "cero españoles esperando" se convirtió en "Cero clientes esperando", perdiendo la única palabra con ñ del caso de estrés. Todo lo que Gamma sí renderizó fue diacríticamente perfecto — es una nota de fidelidad de contenido, no un defecto de renderizado de caracteres, reflejada como deducción parcial (no total) en su puntaje de diacríticos.
- **El bug de overflow real bloqueado ("veterinaria s.") no se repitió en ningún motor esta corrida** — Creatomate/Híbrido vía auto-fit nativo, Gamma vía su propio motor de layout, e incluso Ideogram renderizó el headline intacto esta vez (aunque con un acento espurio). El riesgo subyacente de Ideogram con texto MÁS LARGO (2+ oraciones) sigue presente y visible en otros renders.

### 3.2 Puntajes por criterio (resumen — evidencia completa en `rubric-scores.json`)

| Criterio (peso) | Ideogram | Creatomate | Gamma | Híbrido |
|---|---|---|---|---|
| Legibilidad de texto (×2) | 4 | 10 | 9 | 10 |
| Consistencia de marca (×2) | 4 | 9 | 6 | 9 |
| Calidad de layout (×2) | 3 | 10 | 7 | 10 |
| Diacríticos (×2) | 3 | 10 | 8 | 10 |
| Latencia de render (×1) | 7 | 8 | 4 | 6 |
| Costo por imagen (×1) | 6 | 7 | 5 | 6 |
| Complejidad integración n8n (×1) | 10 | 6 | 3 | 4 |

**Evidencia breve por criterio visual:**

- **Ideogram** — texto corto legible, pero se degrada severamente con texto más largo (closing slide veterinaria: "Esa mascota, y ese dueño, ya son clientes de esa [garabato]tícara..."). Sin badge/CTA consistente, cada render es una composición nueva (no hay control de layout). Diacríticos con corrupción repetida y consistente en renders independientes (`peluqueria` sin acento, `espaãnoles` en vez de `españoles`, `veterinárias` con acento espurio).
- **Creatomate** — renderizado de texto vectorial determinístico, nítido en los 17 renders sin importar la longitud. Layout canónico exacto (badge #1E0C42/#C026D3, Syne/Arimo, closing slides correctamente sin imagen). Auto-fit (`font_size:null` + min/max) resuelve el bug de overflow real de forma directa y verificada. Diacríticos perfectos por construcción (no hay riesgo de corrupción en texto vectorial).
- **Gamma** — tipografía real (no difusión), siempre nítida, con jerarquía visual propia agregada. Usa la paleta/tipografía correcta del tema Propulsar, pero NO respeta la tipología de layout canónica (reinterpreta en su propia estructura de tarjetas; closing slides retienen imagen cuando el spec exige sin imagen). Diacríticos correctos donde preserva la palabra original, pero puede parafrasear y perder contenido.
- **Híbrido** — mismo motor de texto que Creatomate standalone (idéntica nitidez/layout/diacríticos), más fondos Flux genuinamente on-brand y temáticamente relevantes (a diferencia del placeholder genérico de Creatomate solo) — el ajuste de marca más fuerte de los 4 candidatos.

### 3.3 Totales ponderados propuestos

| Motor | Visual crudo | Visual ponderado (×2) | Operativo crudo | Operativo ponderado (×1) | **Total ponderado** |
|---|---|---|---|---|---|
| Ideogram (baseline) | 14 | 28 | 23 | 23 | **51 / 110** |
| Creatomate | 39 | 78 | 21 | 21 | **99 / 110** |
| Gamma | 30 | 60 | 12 | 12 | **72 / 110** |
| Híbrido | 39 | 78 | 17 | 17 | **95 / 110** |

### 3.4 Delta visual vs. Ideogram (propuesto)

Regla: `delta = visual_ponderado_candidato − visual_ponderado_ideogram (28)`. "Domina en los 4 criterios visuales individuales" es la barra para reemplazo total (no solo el agregado).

| Motor | Delta visual | ¿Supera claramente a Ideogram? | ¿Domina en los 4 criterios visuales individuales? |
|---|---|---|---|
| Creatomate | +50 | Sí | Sí (10/9/10/10 vs. 4/4/3/3) |
| Gamma | +32 | Sí | Sí (9/6/7/8 vs. 4/4/3/3) |
| Híbrido | +50 | Sí | Sí (10/9/10/10 vs. 4/4/3/3) |

> Nota: los 3 candidatos nuevos superan a Ideogram en los 4 criterios visuales individuales según la propuesta de Claude — pero **"domina en los 4 individuales" no es lo mismo que "domina con margen amplio"**. Este documento no decide reemplazo total automáticamente por esto; ver sección 5 para la traza completa de la regla aplicada con los puntajes finales (post-revisión humana).

---

## 4. EVAL-07 — Análisis Remotion (solo papel, sin build)

**Remotion fue excluido de la comparación en vivo por costo, evaluado solo en papel.**

### Qué costaría

- El renderizado programático de Remotion (necesario para generar imágenes/video vía código, no solo en el editor visual) requiere la **licencia Remotion Automators**: **$0.01/render + un mínimo de $100/mes, independientemente del tamaño del equipo** (fuente: `remotion.dev/docs/license/faq`, `remotion.pro/license`, reconfirmado 2026-08-01 en `15-RESEARCH.md`).
- Además del piso de licencia, se necesitaría construir un **servicio de renderizado nuevo en Azure** (Container App o similar) solo para poder evaluarlo empíricamente — un costo de infraestructura adicional que ningún otro candidato de esta fase requirió.
- Con el volumen actual de Propulsar (posts esporádicos, no diario ni de alto volumen), el piso fijo de $100/mes no se amortiza contra el valor generado — es significativamente más caro que Ideogram ($0.06/render), Creatomate (trial, ~$0.02/render estimado), o el híbrido (~$0.05/render) a este volumen.

### Qué ofrecería (si se pagara)

Control total de tipografía y layout vía React/código — el techo teórico de calidad de diseño entre todos los candidatos evaluados, ya que no depende de difusión (como Ideogram) ni de un editor propietario (como Gamma) ni de un motor de plantillas cerrado (como Creatomate). En teoría, Remotion podría replicar exactamente la tipología canónica de Propulsar con control pixel-perfect.

### Disparador explícito de reconsideración

**Si video/Reels se convierte en un objetivo de contenido declarado (PREM-03 en `REQUIREMENTS.md`), reevaluar Remotion en ese momento.** Su costo de licencia se amortiza correctamente sobre video — capacidad que ningún otro candidato de esta fase puede ofrecer (Ideogram/Creatomate/Gamma/FAL son todos motores de imagen estática). Hasta entonces, el piso de $100/mes no se justifica solo para imágenes estáticas cuando existen 3 alternativas de imagen ya evaluadas y funcionando.

**No se construyó ningún servicio Remotion en v1.3.** Esta sección cierra EVAL-07 en su totalidad — es un análisis de papel, deliberado, no un trabajo pendiente.

---

## 5. Puntajes ciegos de los revisores

_Pendiente — se completa en la Tarea 3 del Plan 15-05 con los puntajes ciegos de Felix y Susana (por letra A/B/C/D) capturados durante el checkpoint de revisión._

<!-- ESCALA: 1-10 por criterio visual. Completar con los puntajes ciegos verbatim de cada revisor, o "coinciden con los propuestos" si validan sin cambios. -->

## 6. Puntajes ajustados post-revelado

_Pendiente — ajustes de los revisores, si los hay, después de revelar la identidad de los motores y comparar contra la sección 3. El ajuste del revisor es final sobre la propuesta de Claude._

## 7. Totales ponderados finales

_Pendiente — recalculados con los puntajes finales (ciegos + ajustados donde aplique) de la sección 6._

## 8. Decisión final

_Pendiente — traza explícita de la regla del ganador aplicada a los puntajes finales (margen vs. Ideogram mostrado explícitamente), llamada convivir/reemplazar con verificación criterio-por-criterio, implicaciones para la Fase 16 (qué motor se integra, rama del router `image_model` esperada), implicaciones de costo/latencia a volumen de producción, y cualquier condición pendiente (ej. decisión de plan pago de Gamma, que queda explícitamente para el usuario, no decidida acá)._

## 9. Firma

_Pendiente._

**Aprobado por:** Felix ____________________ / Susana ____________________ (fecha: ____________)

---

*Fase: 15-comparison-templates-eval-harness-decision*
*Borrador generado: 2026-08-02*
