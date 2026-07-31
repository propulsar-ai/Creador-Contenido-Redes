# Propulsar Content Studio — GUI web + panel de datos + aprobación in-app + video Reels
# (documento semilla — no es un ROADMAP.md formal todavía)

> Actualizado 2026-07-31 (segunda revisión, misma sesión) — reemplaza la versión anterior de este
> documento, que todavía reflejaba el plan original de Cloudflare R2 (superado) y no incluía el
> panel de datos/historial. Sirve como input de contexto/decisiones para
> `/gsd:new-project propulsar-content-studio`. No reemplaza PROJECT.md/ROADMAP.md formales — es la
> semilla de la que deberían generarse.

## Contexto

Hoy, `CreadorContenido` es 100% CLI: `wizard/run.js` corre en la terminal, arma un "brief" JSON,
lo manda por webhook a un workflow n8n de 91 nodos que genera texto (GPT-4o), genera imagen
(Flux/Ideogram/Nano Banana vía FAL.AI), sube todo al VPS de Hostinger (re-host propio, ver abajo),
pide aprobación por WhatsApp (SI/NO) y publica en Instagram/Facebook vía Meta Graph API.

Este proyecto **ya había sido pensado antes**: `.planning/PROJECT.md:67` y `REQUIREMENTS.md:114`
marcan explícitamente el "Frontend/dashboard UI" como *"separate project"* pospuesto durante el
milestone v1.2. Este plan retoma esa deuda.

**Estado real al momento de escribir esto** (para que quien retome esto no se confunda con
decisiones viejas ya superadas):
- **Fase 12.1 (Azure Front Door) FALLÓ** — Meta rechaza hostnames de AFD. El perfil de AFD y sus
  registros DNS **ya fueron borrados** (no queda infra colgada ni costo).
- **Fase 12.2 se resolvió — pero NO con Cloudflare R2 como se planeaba originalmente.** Un smoke
  test probó que Meta acepta el VPS de Hostinger que Propulsar ya opera (vía EasyPanel, dominio
  `*.bacu5y.easypanel.host`). Se construyó `rehost-service` (Node/Express, subida/lectura/borrado)
  desplegado ahí, ya en producción, con persistencia (mount Docker Swarm — con una limitación
  operativa aceptada: no sobrevive un restart hecho desde el panel de EasyPanel, hay que
  reconectarlo a mano si eso pasa; documentado en `12.2-01-SUMMARY.md`).
- **Fase 13 (Facebook Stories)** resultó mucho más chica de lo que decía el roadmap original (la
  cadena de publicación ya estaba construida desde la Fase 12, solo faltaba probarla en vivo +
  notificaciones + logging).
- Se sincronizó al repo una migración a Azure OpenAI que producción ya tenía hecha por fuera
  (nodos `openai-text`/`openai-carousel`), sin relación con este plan.

## Decisiones (inputs fijos)

1. **Hosting para la GUI nueva: Azure** (Static Web Apps Free + Container Apps consumption +
   Postgres Flexible Server). Alineado con el CLAUDE.md global de Propulsar; a este volumen de
   tráfico el costo real es de pocos euros/mes gracias al scale-to-zero de Container Apps.
2. **Aprobación: directa en la GUI**, no por WhatsApp. Resuelve un bug latente (la aprobación por
   WhatsApp hace join por número de teléfono en Supabase, lo cual colisiona si hay 2 posts
   pendientes del mismo aprobador a la vez). WhatsApp queda solo como canal de notificación
   saliente.
3. **Alcance: un solo proyecto nuevo** (`propulsar-content-studio`, no un parche sobre
   `CreadorContenido`). Cubre GUI de creación completa + video para Reels, en fases secuenciales.
4. Video para Reels vía **FAL.AI** (mismo proveedor que ya usan para Flux/Ideogram/Nano Banana) con
   modelos tipo Kling 3.0 / Google Veo 3.1 Lite. Se descarta Ayrshare ($299/mes, no se justifica).
5. **Capa de diseño premium (Gamma + Creatomate)** — reemplaza el enfoque actual de pedirle
   texto-en-imagen a un modelo de difusión (Ideogram) por un motor de diseño/tipografía real. Se
   ejecuta directo sobre el n8n de `CreadorContenido`.
6. **Panel de datos/historial tiene prioridad máxima, va ANTES que Gamma y antes que el resto de
   la GUI.** Ver sección siguiente.

## Por qué el panel de datos pasa a ser lo primero

Se auditó qué guarda hoy el "log" de publicaciones: **4 nodos de n8n que escriben a la misma hoja
de Google Sheets** ("Log", mismo documento, misma credencial, 13 columnas: `Fecha, Tema, Tipo,
Angulo, Plataformas, Modelo_Imagen, Imagen_URL, Estado, IG_URL, FB_URL, Publicado_En,
Publish_Status, Error_Msg`). Hallazgos clave:

- **Nunca se lee de vuelta desde ningún lado del código** — es un log de solo escritura. Bueno para
  migrar: no hay que reemplazar ninguna lectura existente, solo agregar una nueva.
- **No hay `session_id`/`post_id`** — no se puede correlacionar una fila con la sesión real, ni
  actualizarla después (siempre `append`, nunca `update`).
- **Fragilidad documentada**: agregar una columna nueva requiere editarla a mano en la UI de Sheets
  *antes* de que el nodo de n8n que la referencia funcione — si te olvidás, Sheets crea una columna
  nueva silenciosa y desalinea todo.
- El link de Instagram Story queda muerto a las 24h sin ninguna columna que lo señale.

**Decisión: unificar esto con el Postgres que de todos modos había que armar para
`content_sessions`** (hoy en Supabase, anti-pattern explícito contra Supabase en el CLAUDE.md
global). Una sola base de datos sirve para: (a) el estado de sesiones en curso, y (b) el historial
permanente de publicaciones — con `session_id` real, tipos de datos correctos, sin fragilidad de
columnas manuales. Incluye un panel mínimo de solo-lectura (historial filtrable por
fecha/formato/estado) — no solo la migración de datos, el usuario quiere verlo en pantalla.

**Punto abierto para cuando se planifique esta fase en detalle:** ¿se corta Sheets de una vez
cuando Postgres esté verificado funcionando, o se deja escribiendo en paralelo un tiempo como red
de seguridad? Recomendación: corte limpio una vez verificado (nadie lee Sheets hoy, y el proyecto
tiene buena disciplina de rollback vía git revert) — pero es decisión de la sesión que planifique
esta fase.

## Recomendación estructural: proyecto nuevo

`CreadorContenido` es hoy el motor de automatización (wizard + n8n). La GUI es un entregable
distinto. Se recomienda crearlo como **proyecto nuevo** (`propulsar-content-studio`).
Multi-fase/multi-integración → **caso GSD**. Próximo paso concreto: `/gsd:new-project
propulsar-content-studio`, usando este documento como semilla.

**Excepción: la capa de diseño premium (Gamma/Creatomate) se ejecuta directo dentro de
`CreadorContenido`** — no depende de la infra nueva.

## Arquitectura propuesta

```
propulsar-content-studio/
  frontend/   React + Vite + TS + Tailwind/shadcn → Azure Static Web Apps (Free SKU)
              Auth: Entra ID nativo de SWA ("Easy Auth") — alcanza para 2 usuarios (Felix, Susana).
  api/        Node/TS (Fastify o Express) → Azure Container Apps (consumption, escala a cero)
              - Puerta única a los secretos vía Managed Identity + Key Vault.
              - Reimplementa wizard/step.js (trending, angles, suggest-model, suggest-slides) +
                nueva suggest-video-model.
              - Lee/escribe UNA base Postgres: estado de sesiones (reemplaza Supabase) + historial
                de publicaciones (reemplaza Google Sheets) — mismo esquema, session_id real.
              - POST al webhook n8n existente (sin tocarlo) para disparar generación.
              - Nuevo endpoint /approve → webhook n8n nuevo, keyed por session_id.
  infra/      Bicep: Static Web App, Container App, Postgres Flexible Server Básico (B1ms), Key
              Vault, Log Analytics + App Insights desde el día 1.
```

**n8n cambia poco:** `content_sessions` migra a Postgres Flex; los 4 nodos de Google Sheets Log
pasan a escribir a Postgres; nuevo webhook `propulsar-gui-approve` keyed por `session_id`; nodos de
WhatsApp se simplifican a solo-notificación.

## Fases (borrador de roadmap)

1. **Fundación de datos + panel de historial — PRIORIDAD MÁXIMA, va primero.**
   - Bicep: Postgres Flex Básico, Key Vault, Container App mínimo, Static Web App, LAW + App
     Insights.
   - Migrar `content_sessions` de Supabase a Postgres (DDL en `SETUP.md` FASE 4).
   - Migrar el historial de Sheets a una tabla con `session_id` real — reemplaza los 4 nodos
     `📊 Google Sheets Log*`.
   - Frontend mínimo: pantalla de historial de solo lectura (filtrable por fecha/formato/estado).
2. **Capa de diseño premium (Gamma + Creatomate)** — sobre `CreadorContenido`, independiente.
3. **API backend** — portar wizard/step.js, endpoints de sesiones y `/approve`.
4. **Frontend — flujo de creación completo** — reemplaza el wizard CLI, tarjetas de aprobación.
5. **n8n — aprobación in-app** — webhook nuevo, WhatsApp a notificación-only.
6. **Video para Reels (FAL.AI + Creatomate)** — formato "reel", polling de cola, Meta Reels API.
7. **(Stretch)** — biblioteca de assets reutilizable + galería en la GUI.

## Riesgos / cosas a vigilar

- `media_publish` con `retryOnFail` desactivado (no idempotente) — reintentar = sesión nueva.
- `rehost-service` en Hostinger: mount de persistencia no sobrevive un restart/redeploy disparado
  desde EasyPanel — reconectar a mano (ver `12.2-01-SUMMARY.md`).
- n8n 2.14.2: IF v2/Switch v3 rotos — usar IF v1.
- Brand voice duplicado (`prompts/brand-voice.md` + hardcodeado en n8n) — unificar antes de
  exponer edición desde la GUI.
- Migración Sheets→Postgres: decidir explícitamente corte limpio vs. paralelo, no asumir.

## Verificación end-to-end

- Fase 1: publicación real escribe en la tabla de historial con `session_id` poblado, visible en
  la pantalla sin tocar Sheets; `content_sessions` lee/escribe desde Postgres.
- Fase 2: comparación lado a lado Ideogram vs. Gamma — validación humana.
- Fase 3-4: brief desde el navegador idéntico en forma al de `wizard/run.js`.
- Fase 5: aprobación desde la GUI sin pasar por WhatsApp; WhatsApp sigue notificando.
- Fase 6: Reel de prueba en cuenta de test antes de la cuenta real; borrar después.
