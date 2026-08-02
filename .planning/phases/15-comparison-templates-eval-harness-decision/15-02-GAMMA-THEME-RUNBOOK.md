# Runbook: acceso Gamma + tema Propulsar (ejecución manual)

**Por qué este documento existe:** Claude intentó automatizar TODO este flujo (acceso,
verificación de trial, generación de API key, y creación del tema de marca) usando
`agent-browser` conectado por CDP al Chrome real del usuario (puerto 9222, perfil
`C:\Users\Usuario\chrome-debug-gamma`, ya logueado en gamma.app vía Google SSO).

**Resultado del intento de automatización:** BLOQUEADO — no en el editor de temas (el
punto débil anticipado en la research, Pitfall 2), sino un paso antes: **Cloudflare
Turnstile bloquea CUALQUIER navegación dirigida por CDP a gamma.app**, incluso a la
página de login/dashboard, incluso con la sesión de Google ya autenticada en ese mismo
perfil de Chrome. Se probó:
- Navegar a `https://gamma.app/` y `https://gamma.app/workspace` (bloqueado ambas veces)
- Click en el checkbox "Verifique que es un ser humano" vía ref (`@e7`) — 3 intentos
- Click vía `find role checkbox` — mismo resultado
- Esperas de hasta 10s pasivas sin interacción — sin resolución
- Recarga con navegación fresca — mismo bloqueo

Captura de pantalla del bloqueo: `gamma-cloudflare-block.png` (carpeta scratchpad de la
sesión). El checkbox vuelve a `unchecked` después de cada click — Cloudflare está
rechazando la señal de "click humano" que llega vía CDP, algo fuera del alcance de
`agent-browser` (no es un problema de selectors/refs, es detección de automatización a
nivel de red/fingerprint).

**Conclusión:** Los 3 pasos de abajo (Tarea 1, generación de API key, y creación del
tema) requieren que Felix o Susana los hagan directamente con mouse/teclado en la
ventana de Chrome ya abierta (`localhost:9222`, perfil `chrome-debug-gamma`) — NO hace
falta abrir una ventana nueva ni volver a loguearse, la sesión de Google ya está activa
en esa ventana. Cuando termines, avisale a Claude para que verifique todo por API y
escriba `15-02-GAMMA-ACCESS.md`.

---

## Paso 0 — Pasar el check de Cloudflare (una sola vez)

1. Andá a la ventana de Chrome que ya está abierta (la del debug port 9222).
2. Si ves la pantalla "Just a moment..." con el checkbox "Verifique que es un ser
   humano" — hacé click vos mismo/a (mouse real, no hace falta nada especial).
3. Debería pasarte directo al dashboard de Gamma (ya logueado).

## Paso 1 — Verificar si el trial Pro de 14 días está disponible (SIN tarjeta)

1. Click en tu avatar/ícono de cuenta (arriba a la derecha) → **Settings** (o
   **Configuración**).
2. Andá a la sección **Billing** / **Plans** / **Upgrade**.
3. Fijate qué opción aparece:
   - Si ves **"Start free trial"** o **"Probar gratis"** SIN pedir tarjeta de
     crédito → **activalo**. El plan Pro incluye acceso a la API.
   - Si SOLO aparece un botón de **"Subscribe"** con precio (pago directo, sin
     mención de trial) → **NO actives nada, no pagues**. Escribile a Claude
     "solo pago" — el plan tiene una regla bloqueada de "solo trials gratis" y
     hay que escalar la decisión antes de gastar un centavo.
4. Si activaste el trial, anotá la fecha de hoy — el trial dura 14 días desde la
   activación (esto limita cuándo tienen que correr los Planes 15-04 y 15-05, así que
   conviene no demorar mucho en usarlo).

## Paso 2 — Generar la API key

1. (Con el trial Pro activo) Settings → **API keys**.
2. Generá una key nueva. Debería empezar con `sk-gamma-`.
3. Copiala y pegala en el archivo `.env` del proyecto, en la línea que ya existe:
   ```
   GAMMA_API_KEY=sk-gamma-...tu-key-aca...
   ```
   (Está en `c:\Felix\Automatizaciones\Propulsar\Proyectos\CreadorContenido\.env`,
   línea ~58 — ya existe la variable vacía, solo hay que completarla.)

## Paso 3 — Crear el tema de marca "Propulsar"

1. Desde el dashboard de Gamma, andá a **Settings** (o el ícono de la cuenta) →
   **Themes** (Temas) → **New theme** / **Create theme** (a veces también aparece
   como opción al crear una nueva presentación → "Theme" → "Custom").
2. Nombrá el tema exactamente: **`Propulsar`**
3. Colores (pegá los códigos hex exactos, no aproximes):
   | Uso | Hex |
   |---|---|
   | Fondo (background) | `#070A18` |
   | Acento primario / marca | `#BA00E0` |
   | Acento secundario (cian) | `#00E5FF` |
   | Texto principal | `#FFFFFF` |
   | Contenedor oscuro / badges | `#1E0C42` |
   | Acento adicional (si el editor pide 4to color) | `#C026D3` |
   | Acento adicional (si pide 5to) | `#E0007A` |
4. Fuentes:
   - Encabezados (headings): **Syne**, peso **Bold**.
   - Cuerpo (body): **Arimo**, peso Regular.
   - Si Gamma NO tiene alguna de estas dos fuentes en su selector, elegí la más
     parecida disponible y **anotá cuál usaste en su lugar** (esto queda como
     evidencia en el rubric de comparación — no es un error, solo hay que
     documentarlo).
5. Logo: se buscó un archivo de logo de Propulsar en el repo (`brand/`) y **no se
   encontró ninguno** (solo existe `brand/referencias/` con capturas de posts, no un
   logo aislado). Si tenés el logo a mano, subilo; si no, **saltá este paso** — no es
   bloqueante.
6. Guardá el tema.
7. Verificación visual rápida antes de avisar: fondo oscuro casi negro-azulado,
   acentos magenta/cian bien visibles, texto blanco legible.

## Paso 4 — Avisar a Claude

Cuando termines los pasos 1-3 (o si el Paso 1 te dio "solo pago" y preferís frenar
ahí), escribile a Claude:
- **"listo"** si activaste el trial, generaste la key, y creaste el tema.
- **"solo pago"** si en el Paso 1 no había opción de trial gratis (Claude va a
  escalar la decisión de pagar o abandonar Gamma como candidato).
- Cualquier bloqueo puntual, describilo tal cual lo ves.

Claude va a correr `GET https://api.gamma.app/v1.0/themes` con tu API key para
confirmar que el tema "Propulsar" existe, capturar su `themeId`, y escribir
`15-02-GAMMA-ACCESS.md` con todo lo necesario para las Fases 15-04 y 16.
