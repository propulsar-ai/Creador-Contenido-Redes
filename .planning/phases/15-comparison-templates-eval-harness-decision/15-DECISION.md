# Decisión de Motor de Diseño — Fase 15 (v1.3 Diseño Premium)

**Estado:** Puntajes finalizados y regla del ganador aplicada (Plan 15-05, Tarea 3 completa) — pendiente firma dual (Tarea 4)
**Fecha del borrador:** 2026-08-02 · **Fecha de cierre de puntajes:** 2026-08-03
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

> Nota: los 3 candidatos nuevos superan a Ideogram en los 4 criterios visuales individuales según la propuesta de Claude — pero **"domina en los 4 individuales" no es lo mismo que "domina con margen amplio"**. Este documento no decide reemplazo total automáticamente por esto; ver **sección 8** para la traza completa de la regla aplicada con los puntajes finales (post-revisión humana).

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

**Sesión:** Felix + Susana, 2026-08-03 (`eval-output/2026-08-02_1510/index.html`, protocolo del checkpoint de Tarea 2). Fase ciega iniciada, completada y galería revelada (`revealed_at: 2026-08-03T11:53:46Z`, 13s después de `finished_at: 2026-08-03T11:53:33Z`) — ver `human-scores.json`.

### Patrón real de votación (importante para leer los datos correctamente)

Los revisores **no puntuaron los 4 motores en cada uno de los 17 grupos brief×formato** — puntuaron, por grupo, **únicamente el/los motor(es) que efectivamente les gustó/gustaron**, y en la mayoría de los casos eso fue un solo motor por grupo, en los 4 criterios visuales completos. Total de votos emitidos: exactamente **17 imágenes puntuadas de 68 posibles (17 grupos × 4 letras)** — 11 para C, 5 para B, 1 (parcial, solo legibilidad) para D, **0 para A**.

Esto **no es un vacío de datos accidental** — es la aplicación literal de la regla explícita del usuario capturada en el checkpoint (Tarea 2, regla 1): *"las únicas que votamos son las únicas que nos gustaron"*. Una imagen no votada = rechazada por los revisores, no un dato neutro. Se trata como evidencia de preferencia legítima, tal como especifica el protocolo de decisión.

### Tabla de resultados ciegos (verbatim de `human-scores.json`)

| Letra | Motor real | Grupos elegidos como favorito (de 17) | % de preferencia | Legibilidad (1-5) | Marca (1-5) | Layout (1-5) | Diacríticos (1-5) |
|---|---|---|---|---|---|---|---|
| **C** | **Híbrido** | **11** | **65%** | 4.18 | 5.00 | 5.00 | 4.82 |
| **B** | **Gamma** | **5** | **29%** | 5.00 | 5.00 | 5.00 | 5.00 |
| **D** | **Ideogram** | **1** | **6%** | 4.00 | *(sin voto)* | *(sin voto)* | *(sin voto)* |
| **A** | **Creatomate (standalone)** | **0** | **0%** | *(sin voto)* | *(sin voto)* | *(sin voto)* | *(sin voto)* |

**Lectura de los revisores (capturada verbatim del checkpoint):**
1. **C (Híbrido) fue el favorito claro por preferencia de compromiso** — elegido en 11 de 17 grupos (65%), más del doble que el segundo lugar.
2. **B (Gamma) fue perfecto en calidad cuando fue elegido** (5.00 en los 4 criterios), pero elegido en menos de la mitad de los grupos que Híbrido (5/17 vs 11/17).
3. **D (Ideogram) solo ganó 1 grupo** (`gimnasio-gpt4o_story`), y únicamente en legibilidad — ni siquiera se molestaron en puntuar marca/layout/diacríticos de esa imagen. Consistente con que el resto de los 16 renders de Ideogram en esta corrida no despertó preferencia alguna.
4. **A (Creatomate standalone) no ganó ni un solo grupo** — la señal de rechazo más fuerte de los 4 candidatos, peor incluso que Ideogram (0/17 vs 1/17).

**Causa raíz diagnosticada por los revisores para los puntajes de legibilidad 3-4 en Híbrido** (no aplicable a Ideogram, que no usa fondos generados con mockups): los fondos generados por Flux en varios renders incluyen mockups de chats de teléfono (ej. el "neon WhatsApp-chat phone" citado como evidencia positiva de marca en la sección 3.2) que resultaron **ilegibles y NO estaban en castellano**. Es un problema de generación de fondo (prompt engineering de Flux), **no un defecto del motor de tipografía Creatomate** — el mismo motor de texto, en las mismas imágenes, obtuvo 5.00/5.00 en marca y prácticamente perfecto en diacríticos. Ver la nueva **regla dura para Fase 16** en la sección 8.

## 6. Puntajes ajustados post-revelado

**Sin ajustes.** Felix confirmó explícitamente que, tras revelar el mapeo A/B/C/D → motor real y comparar contra la propuesta de Claude (sección 3), **no hicieron cambios** — los puntajes ciegos de la sección 5 son finales. La regla bloqueada ("el ajuste del revisor es final") se cumple trivialmente: no hubo divergencia entre lo puntuado a ciegas y lo que confirmaron después de revelar.

## 7. Totales ponderados finales

Reglas de reconciliación aplicadas mecánicamente:
- **Donde existe puntaje humano** (Gamma en los 4 criterios; Híbrido en los 4 criterios), **reemplaza** el puntaje propuesto por Claude (escala 1-5 humana → ×2 para la escala 1-10 del rubric).
- **Ideogram:** se mantiene el puntaje propuesto por Claude en los 4 criterios visuales (4/4/3/3). El único dato humano (voto D, legibilidad=4/5=8/10 en `gimnasio-gpt4o_story`) **no reemplaza el agregado** — es precisamente el único render de Ideogram sin los defectos documentados en la sección 3.2 (headline corto, sin degradación), y usar ese caso fácil aislado para representar el criterio completo sería sesgo de selección. Los otros 16 renders de Ideogram de esta corrida, muchos con los defectos citados (diacríticos corruptos, texto largo ilegible, sin badge/CTA consistente), no obtuvieron ni un voto — lo cual corrobora, no contradice, el puntaje bajo propuesto.
- **Creatomate (standalone):** sin ningún dato humano (0/17). Regla 1 del usuario: el rechazo total (0/17, peor que el 1/17 de Ideogram) se trata como señal activa, no neutra. **Legibilidad y diacríticos** se mantienen en el valor técnico propuesto por Claude (10/10 cada uno) porque son criterios de tipografía superpuesta, independientes del fondo, y están validados indirectamente: el **mismo motor de texto Creatomate**, dentro del Híbrido, sí fue elegido 11/17 veces con marca/diacríticos casi perfectos. **Marca y layout** — los dos criterios que capturan la sensación visual del *paquete completo*, no solo el texto — se ajustan a la baja (9→2, 10→2) para reflejar que el fondo placeholder genérico (Lorem Picsum sembrado) hizo que el conjunto se sintiera ajeno a la marca en la práctica, al punto de no ganar ni una sola comparación directa contra los otros 3 candidatos. Esto es intencional: cuantifica la brecha entre "el componente de texto es técnicamente sólido" (cierto, y por eso sobrevive dentro del Híbrido) y "el producto standalone es adoptable" (falso, según el compromiso real de los revisores).

| Motor | Visual crudo | Visual ponderado (×2) | Operativo crudo | Operativo ponderado (×1) | **Total ponderado** | Δ visual vs. Ideogram |
|---|---|---|---|---|---|---|
| Ideogram (baseline) | 14 | 28 | 23 | 23 | **51 / 110** | — |
| Creatomate (standalone, ajustado por rechazo) | 24 | 48 | 21 | 21 | **69 / 110** | +20 |
| Gamma (puntaje humano) | 40 | 80 | 12 | 12 | **92 / 110** | +52 |
| Híbrido (puntaje humano) | 38 | 76 | 16 | 16 | **92 / 110** | +48 |

> **Corrección de aritmética (deviation Rule 1 — bug):** el operativo crudo de Híbrido en el borrador de la sección 3.3 decía "17" pero la suma real de sus 3 puntajes operativos propuestos (latencia 6 + costo 6 + complejidad 4) es **16**. Corregido acá; el total ponderado final de Híbrido usa 16, no 17. No cambia ninguna conclusión (la sección 3.3 sigue siendo la propuesta original de Claude, sin tocar, para trazabilidad).

**Gamma y Híbrido empatan exactamente en 92/110.** Esto no es un error — con puntajes visuales humanos que favorecen a Gamma por su perfección de calidad-cuando-fue-elegido (80 vs 76, por el hueco de legibilidad diagnosticado arriba) y puntajes operativos que favorecen a Híbrido por casi el mismo margen (16 vs 12, por el costo recurrente y la latencia de Gamma), el total ponderado cae en empate matemático exacto. La sección 8 rompe el empate con criterios explícitos, ya que el rubric por sí solo no alcanza.

## 8. Decisión final

### 8.1 Test del ganador (regla bloqueada: "debe superar claramente a Ideogram en el sub-puntaje visual ponderado")

| Candidato | Visual ponderado | Δ vs. Ideogram (28) | Δ relativo | ¿Supera claramente? |
|---|---|---|---|---|
| Creatomate (standalone) | 48 | +20 | +71% | Numéricamente sí, **pero ver 8.2** |
| Gamma | 80 | +52 | +186% | **Sí, contundente** |
| Híbrido | 76 | +48 | +171% | **Sí, contundente** |

Los márgenes de Gamma e Híbrido (+52 y +48 sobre un máximo posible de 80 puntos visuales) no son un artefacto de redondeo — son casi el triple del puntaje base de Ideogram. Ambos limpian el umbral del ganador con margen amplio.

### 8.2 Por qué Creatomate standalone NO es candidato a ganador pese a superar numéricamente a Ideogram

La regla del ganador asume que el puntaje visual refleja satisfacción humana real. El puntaje de 48 de Creatomate standalone es, en más de la mitad de su composición (legibilidad+diacríticos=20 de los 24 puntos crudos), un valor **técnico aislado** que la evidencia de compromiso real (0/17, la peor de las 4) contradice directamente. Aplicar la fórmula de forma literal aquí produciría un resultado perverso: nombrar ganador a un producto que los propios revisores nunca eligieron ni una sola vez. Por eso Creatomate standalone **queda fuera de la comparación de ganador** — su rol en esta decisión es el de proveedor de motor de tipografía dentro del Híbrido (sección 8.3), no el de candidato a reemplazar/convivir con Ideogram por derecho propio.

### 8.3 Híbrido vs. Gamma — desempate

Con el rubric ponderado empatado exactamente en 92/110, el desempate se apoya en tres criterios explícitos, todos a favor de Híbrido:

1. **Preferencia de compromiso real:** Híbrido fue el favorito de los revisores en 11/17 grupos (65%) contra 5/17 (29%) de Gamma — más del doble. Cuando ambos candidatos estaban disponibles para el mismo grupo, los revisores se inclinaron por Híbrido de forma consistente.
2. **Conformidad estructural con la tipología de layout canónica** (no solo el puntaje agregado): Gamma **reinterpreta el layout en su propia estructura de tarjetas** — el formato Story se convierte en una composición multi-tarjeta desplazable en vez del frame único 9:16 que exige el spec, y las slides de cierre retienen imagen cuando el spec exige fondo oscuro sin imagen (evidencia citada en `rubric-scores.json`, criterio `brand_consistency`/`layout_quality`). Esto es una **limitación estructural del producto Gamma** (su motor de layout propio toma el control), no algo ajustable por prompt. Híbrido, en cambio, usa las plantillas Creatomate ya bloqueadas (15-01) que sí respetan la tipología exacta — closing slides sin imagen, framing 9:16 seguro, badge/CTA consistentes — en el 100% de los renders.
3. **Costo operativo y riesgo:** Gamma requiere el plan Pro pago (~216 €/año recurrente, ya contratado por Susana el 2026-08-02, sección de costos en `15-02-GAMMA-ACCESS.md`) sin nivel gratuito disponible para esta cuenta, con la latencia más alta de los 4 candidatos (avg ~20.7s vs. Híbrido ~10.7s) y la mayor complejidad de integración n8n (exportación .zip sin nodo nativo de descompresión, parámetros no documentados que hubo que hacer ingeniería inversa). Híbrido es pago-por-uso (~$0.05/render, sin piso de suscripción) y reutiliza dos patrones de integración ya probados (FAL, ya en producción vía Flux; Creatomate, ya construido en 15-01).

El único punto a favor de Gamma frente a Híbrido — su perfección de legibilidad (10/10 vs. 8.4/10 humano) — tiene una **causa raíz diagnosticada y corregible**: los mockups de chat ilegibles/no-castellano en algunos fondos Flux (sección 5), no una limitación estructural del pipeline Híbrido. Se convierte en un requisito duro para Fase 16 (ver 8.5), no en un motivo para descartar Híbrido.

**Decisión: el motor ganador es el Híbrido (FAL Flux 2 Pro para el fondo + plantillas Creatomate para la tipografía/overlay).**

### 8.4 Convivir vs. reemplazar — verificación criterio por criterio

Regla bloqueada: reemplazo total solo si el ganador domina a Ideogram en **los 4 criterios visuales individuales** (no solo el agregado).

| Criterio | Ideogram | Híbrido | ¿Domina? |
|---|---|---|---|
| Legibilidad | 4 | 8.4 | Sí (+4.4) |
| Marca | 4 | 10.0 | Sí (+6.0) |
| Layout | 3 | 10.0 | Sí (+7.0) |
| Diacríticos | 3 | 9.6 | Sí (+6.6) |

**Dominación confirmada en los 4 criterios individuales, con márgenes amplios en todos** (mínimo +4.4, no un caso límite). Por la regla bloqueada, esto habilita **reemplazo total** — Híbrido se convierte en la rama por defecto/única en el router `image_model`, no una rama adicional junto a Ideogram.

**Condición operativa que se adjunta a esta llamada (no cambia la regla, la acota):** el pipeline Híbrido nunca corrió en producción real — a diferencia de Ideogram, que tiene historial productivo sin incidentes reportados en este ciclo — y tiene un defecto diagnosticado pendiente de corregir (mockups de chat, sección 8.5). Se recomienda que Fase 16 **mantenga el código de Ideogram en el repo como fallback manual durante un período de validación en producción** (número de publicaciones reales sin incidentes a definir por Felix/Susana) antes de eliminarlo por completo, en vez de borrarlo el mismo día que se activa el Híbrido. Esto es una recomendación de gestión de riesgo, no una reversión de la regla de reemplazo — queda para la firma en la Tarea 4 confirmar si aceptan esta condición o prefieren reemplazo inmediato sin período de gracia.

### 8.5 Implicaciones para Fase 16

- **Motor a integrar:** Híbrido — FAL Flux 2 Pro (fondo) + Creatomate (overlay tipográfico, las 5 plantillas ya construidas y bloqueadas en `creatomate/templates/`, Plan 15-01). No se necesita trabajo adicional de plantillas.
- **Rama del router `image_model` esperada:** el identificador interno usado en todo este harness es `"hybrid"` — Fase 16 puede reutilizarlo tal cual para consistencia de trazabilidad, o adoptar un nombre más amigable de cara al Wizard (a decidir en Fase 16, discreción de implementación).
- **Reemplazo, con salvaguarda:** Híbrido pasa a ser el motor por defecto; Ideogram queda en el repo como fallback manual durante el período de validación en producción (ver 8.4) en vez de eliminarse el mismo día del corte.
- **REQUISITO DURO NUEVO para Fase 16 (prompt engineering de fondos):** cualquier mockup de teléfono/chat que aparezca en una imagen generada **debe estar siempre en castellano y ser legible**. Este es un hallazgo directo de la revisión humana (sección 5) — hay que reflejarlo en las plantillas de prompt de Flux (instrucción explícita o negative-prompt) y validarlo antes de enviar nada a producción. Es un problema de generación de fondo, no del motor de tipografía Creatomate (que se mantiene intacto).
- **Costo/latencia a volumen de producción:** ~$0.05/render (FAL $0.03 + Creatomate ~$0.02, sin piso de suscripción) vs. el $0.06/render plano actual de Ideogram — comparable o ligeramente más barato. Latencia: 2 llamadas asíncronas encadenadas (~8-13s en esta corrida) vs. 1 llamada síncrona de Ideogram (~9.5s) — ligeramente más lento pero dentro de rango aceptable para un flujo con aprobación humana por WhatsApp (no es tiempo real).
- **Complejidad de integración:** Híbrido encadena 2 llamadas async que deben tener éxito ambas (FAL, ya probado en producción vía el nodo `⚡ Flux 2 Pro`; Creatomate, patrón de poll-loop nuevo pero simple, probado en 15-01/15-04) — más superficie de fallo que Ideogram (llamada única), requiere diseño explícito de retry/error-handling en Fase 16.

### 8.6 Condiciones pendientes — explícitamente para el usuario, no decididas acá

- **Precio real de Creatomate post-trial:** esta evaluación corrió sobre los 50 créditos de la cuenta trial gratuita (~36 restantes tras 15-01, consumidos en 15-04). No hay confirmación de precio real por render a volumen de producción — hay que confirmarlo en el dashboard de Creatomate **antes** de que Fase 16 comprometa volumen real.
- **Gamma Pro — ¿mantener o cancelar?** Susana ya pagó el upgrade a Pro (~216 €/año, facturación anual, `15-02-GAMMA-ACCESS.md`) para poder evaluarlo en esta fase. Dado que Gamma **no** es el motor que se integra en Fase 16 (perdió el desempate de la sección 8.3), la suscripción activa queda sin un caso de uso productivo inmediato. Esta decisión de cancelar o mantener (por ejemplo, como opción de respaldo visual de alta calidad para casos puntuales, o simplemente para no perder el pago anual ya hecho) **queda explícitamente para Felix y Susana** — no se decide en este documento.

## 9. Firma

_Pendiente — se completa en la Tarea 4 del Plan 15-05 tras la confirmación dual (Felix directo, conformidad de Susana transmitida por Felix)._

**Aprobado por:** Felix ____________________ / Susana ____________________ (fecha: ____________)

---

*Fase: 15-comparison-templates-eval-harness-decision*
*Borrador generado: 2026-08-02 · Puntajes finalizados y decisión escrita: 2026-08-03*
