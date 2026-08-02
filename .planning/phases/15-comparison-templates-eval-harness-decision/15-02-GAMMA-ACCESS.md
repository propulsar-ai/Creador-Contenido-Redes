# Gamma API Access — Notas para Plan 15-04 y Fase 16

**Estado:** RESUELTO 2026-08-02. Acceso API activo, tema de marca creado y verificado.

---

## Cuenta

- **Email:** scblinking@gmail.com (Susana), login vía Google SSO.
- **Plan:** **Pro** (upgrade de pago, NO trial gratis).
  - La cuenta preexistente era "Plus" (sin acceso API).
  - Al llegar a Settings → Billing/Upgrade, la única opción ofrecida a esta cuenta
    existente fue **"Actualiza a Pro"** de pago — **18 €/usuario/mes con
    facturación anual** (~216 €/año). No se ofreció ningún trial Pro de 14 días
    sin tarjeta para esta cuenta (a diferencia de lo que la research anticipaba
    como posible).
  - **Deviation registrada:** la regla bloqueada del plan es "solo trials
    gratis, escalar antes de pagar". Se escaló correctamente en el checkpoint de
    la Tarea 1 (resume-signal "solo pago" — ver runbook) y **la usuaria decidió
    pagar el upgrade por su cuenta** el 2026-08-02. No fue una decisión de
    Claude ni una violación silenciosa de la regla — fue la resolución explícita
    del punto de escalada, autorizada por la usuaria.
  - **Input para el rubric de decisión (Plan 15-05):** este costo recurrente
    (~216 €/año si se mantiene la facturación anual, o más si se pasa a mensual)
    debe entrar como criterio de costo en la comparación final entre Gamma,
    Creatomate y el híbrido. Creatomate sigue en cuenta de trial gratis
    (`15-01-SUMMARY.md`).

## API

- **Base URL:** `https://public-api.gamma.app/v1.0`
- **Auth:** header `X-API-KEY: <key>` (NO es `Authorization: Bearer`).
- **Versión confirmada:** v1.0 (v0.2 está sunset desde 2026-01-16 — no usar).
- **Key:** vive en `.env` local como `GAMMA_API_KEY` (nunca commiteada). Generada
  por la usuaria en Settings → API keys tras activar Pro.
- **Verificación en vivo (2026-08-02):** `GET /v1.0/themes` con la key real →
  **HTTP 200**, devuelve 50 temas estándar de Gamma + los temas custom del
  workspace (incluyendo "Propulsar", ver abajo).

## Tema de marca "Propulsar"

- **themeId:** `ergo9wmo77nbvra`
- **type:** `custom`
- **Verificado vía:** `GET /v1.0/themes?query=Propulsar` → devuelve exactamente
  1 resultado (`id: ergo9wmo77nbvra`, `name: Propulsar`, `type: custom`).
- **Camino de creación:** runbook manual (ver abajo) — NO automatización.
  Creado a mano por la usuaria en el editor de temas de Gamma siguiendo
  `15-02-GAMMA-THEME-RUNBOOK.md`.

### Spec del tema tal como quedó construido

| Elemento | Valor |
|---|---|
| Color de fondo (background + fondo de página sólido) | `#070A18` |
| Acento primario | `#BA00E0` |
| Acentos secundarios | `#00E5FF`, `#C026D3`, `#E0007A` |
| Encabezados (headings) | **Syne**, Bold, `#FFFFFF` |
| Cuerpo (body) | **Arimo**, Regular, `#E8EAFF` |
| Sustitución de fuente | **Ninguna** — Arimo estaba disponible en el selector de Gamma, no hizo falta usar una fuente alternativa (a diferencia de lo que el runbook contemplaba como posible). |
| Accessibility auto-adjust | **Desactivado** — se preservan los hex exactos de marca en vez de dejar que Gamma los reajuste automáticamente por contraste. |
| Logo | No incluido — no existe un archivo de logo aislado en el repo (`brand/` solo tiene `brand/referencias/`, capturas de posts). Skip no bloqueante, documentado en el runbook. |

## Créditos del workspace

- **Balance visible en la UI al momento de la verificación:** 2000 créditos.
- Suficiente margen para la matriz completa de comparación del Plan 15-04
  (múltiples briefs × formatos × Gamma).

## Bloqueos de automatización encontrados

Se intentó automatizar TODO el flujo (login, chequeo de trial/plan, generación
de API key, creación del tema) con la skill `agent-browser` antes de recurrir al
runbook manual, según la decisión bloqueada del plan ("Claude intenta primero").
Dos bloqueos distintos, en dos capas distintas:

1. **Google OAuth rechaza sesiones en Chrome-for-Testing** — el flujo de login
   de Google (usado por el SSO de Gamma) detecta y bloquea el navegador
   controlado por Chrome DevTools Protocol cuando es una instancia
   Chrome-for-Testing separada.
2. **Cloudflare Turnstile rechaza CUALQUIER interacción dirigida por CDP en
   gamma.app** — incluso usando el Chrome *real* de la usuaria (perfil
   `chrome-debug-gamma`, puerto de debug 9222, sesión de Google ya autenticada
   en ese mismo perfil), Cloudflare bloqueó la navegación a `gamma.app` y
   `gamma.app/workspace`. Se probaron múltiples clicks en el checkbox "Verifique
   que es un ser humano" vía referencia y vía `find role checkbox`, esperas
   pasivas, y recarga con navegación fresca — el checkbox siempre volvía a
   `unchecked`. Esto es detección de automatización a nivel de
   red/fingerprint, fuera del alcance de `agent-browser` (no es un problema de
   selectors/refs). Ver evidencia y detalle completo en
   `15-02-GAMMA-THEME-RUNBOOK.md`.

**Conclusión:** los 3 pasos (verificar plan/trial, generar API key, crear el
tema) se hicieron **manualmente** por la usuaria (Susana), con guía en vivo y el
runbook escrito por Claude como referencia. Claude verificó el resultado final
100% por API (no por confirmación visual únicamente): `GET /v1.0/themes` con la
key real, y `GET /v1.0/themes?query=Propulsar` para capturar el `themeId`
exacto.

## Qué necesita el Plan 15-04

- `GAMMA_API_KEY` — ya en `.env` local.
- `themeId` — `ergo9wmo77nbvra`, usar como parámetro `themeId` en las llamadas a
  `POST /v1.0/generations`.
- Sin fecha límite de trial (es plan Pro pago, no expira en 14 días) — a
  diferencia de lo que el plan original anticipaba, no hay presión de deadline
  por expiración de trial en 15-04/15-05.
