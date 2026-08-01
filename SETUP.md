# 🛠️ SETUP GUIDE — Propulsar Content Engine

Guía completa para dejar el sistema funcionando desde cero.
Tiempo estimado: 2-3 horas la primera vez.

---

## FASE 1 — Setup local (VS Code)

### 1.1 Clonar/copiar el proyecto
```bash
cd /tu/directorio/de/proyectos
# Si está en GitHub:
git clone https://github.com/propulsar/content-engine.git
cd propulsar-content-engine

# O simplemente copiar la carpeta generada
```

### 1.2 Instalar dependencias
```bash
npm install
```

### 1.3 Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales reales
```

---

## FASE 2 — Credenciales necesarias

### 2.1 Meta (Instagram + Facebook)

1. Ir a https://developers.facebook.com
2. Crear una App → Business → conectar tu página de Facebook
3. En Graph API Explorer:
   - Seleccionar tu App
   - Generar User Access Token con permisos:
     - `pages_manage_posts`
     - `pages_read_engagement`
     - `instagram_basic`
     - `instagram_content_publish`
4. Convertir a **Page Access Token** (sin vencimiento):
   ```
   GET /{page-id}?fields=access_token&access_token={user-token}
   ```
5. Obtener Instagram Account ID:
   ```
   GET /me/accounts → ver id de tu página
   GET /{page-id}?fields=instagram_business_account
   ```

### 2.2 YCloud (WhatsApp)

1. Ir a https://app.ycloud.com
2. Settings → API Keys → Crear nueva API key
3. Configurar webhook de incoming messages:
   - URL: `https://n8n-azure.propulsar.ai/webhook/propulsar-whatsapp-reply`
   - Events: `whatsapp.inbound.messages`
4. Anotar tu número de WhatsApp Business (el que envía mensajes)

### 2.3 OpenAI

1. Ir a https://platform.openai.com/api-keys
2. Create new secret key
3. Verificar que tu cuenta tiene créditos para DALL-E 3

### 2.4 Google Sheets (log)

1. Crear una nueva hoja en Google Sheets
2. Primera fila (headers):
   ```
   Fecha | Tema | Tipo | Plataformas | Estado | Instagram_URL | Facebook_URL | Imagen_URL
   ```
3. Copiar el ID de la URL
4. En n8n, configurar credenciales de Google OAuth2

---

## FASE 3 — Configurar n8n

### 3.1 Importar workflow
1. n8n → Workflows → Import from file
2. Seleccionar `n8n/workflow.json`
3. El workflow se importa con todos los nodos

### 3.2 Configurar credenciales en n8n
Para cada nodo que lo requiera:
- **OpenAI**: Settings → Credentials → New → OpenAI API
- **Google Sheets**: Settings → Credentials → New → Google Sheets OAuth2
- **HTTP Request (YCloud)**: Las credenciales van en variables de entorno de n8n

### 3.3 Configurar variables de entorno en n8n (Azure)
En Azure Container Apps → tu container de n8n → Environment Variables:
```
YCLOUD_API_KEY=tu_api_key
YCLOUD_WHATSAPP_NUMBER=tu_numero
META_PAGE_TOKEN=tu_page_token
INSTAGRAM_ACCOUNT_ID=tu_instagram_id
FACEBOOK_PAGE_ID=tu_facebook_id
GOOGLE_SHEETS_ID=tu_sheets_id
```

### 3.4 Activar el workflow
- Toggle "Active" en la esquina superior derecha
- Copiar la URL del Webhook Trigger (primer nodo)
- Pegarla en tu `.env` local como `WEBHOOK_URL`

### 3.5 Configurar webhook de aprobación en YCloud
- En YCloud → Webhooks → añadir:
  - URL: `https://n8n-azure.propulsar.ai/webhook/propulsar-whatsapp-reply`

---

## FASE 4 — Estado entre webhooks (Azure PostgreSQL)

El flujo de aprobación tiene dos webhooks separados:
1. El wizard dispara el primero → n8n genera contenido y envía WhatsApp
2. YCloud dispara el segundo → n8n recibe la respuesta (SI/NO)

**El problema**: n8n no recuerda el contenido entre dos ejecuciones distintas.
**La solución**: guardar el contenido en Azure PostgreSQL entre los dos webhooks.

> **Nota histórica (Phase 12.3, 2026-08-01):** este backend usaba Supabase
> hasta que el proyecto Supabase que lo respaldaba fue eliminado
> permanentemente, causando una caída total del pipeline. Se migró a Azure
> PostgreSQL y **Supabase NO se recrea** — ver `.planning/phases/12.3-supabase-to-azure-postgres-migration/`
> para la investigación y el registro de la migración.

### 4.1 Base de datos: `content_engine` en el servidor `propulsar-db`

Propulsar ya opera un Azure Database for PostgreSQL Flexible Server
compartido (`propulsar-db`, PG15, `propulsar-production` resource group) —
el mismo servidor que usa n8n para su propia base de datos operativa.
`content_engine` es una base de datos nueva y aislada en ese mismo servidor
(sigue la convención existente de una base de datos por proyecto: `n8n`,
`propulsar_crm`, `chatwoot_production`, etc.). No hace falta provisionar un
servidor nuevo.

```bash
az postgres flexible-server db create \
  --resource-group propulsar-production \
  --server-name propulsar-db \
  --database-name content_engine
```

DDL actual de `content_sessions` (20 columnas — reconstruido a partir de
todos los campos leídos/escritos por los nodos vivos del workflow, ver
`12.3-01-INFRA.md` para el registro de ejecución completo):

```sql
CREATE TABLE content_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         TEXT UNIQUE NOT NULL,
  topic              TEXT,
  type               TEXT,
  angle              TEXT,
  platforms          TEXT[],
  image_model        TEXT,
  image_url          TEXT,            -- solo post individual
  final_image_url    TEXT,            -- post individual + story
  image_urls         TEXT[],          -- solo carousel
  format             TEXT,            -- NULL (single), 'carousel' o 'story'
  aspect_ratio       TEXT,            -- solo story
  story_expires_at   TIMESTAMPTZ,     -- solo story
  instagram_caption  TEXT,
  facebook_caption   TEXT,
  approval_number    TEXT,
  status             TEXT DEFAULT 'pending',
  publish_at         TEXT,            -- literal 'now' o ISO-8601; TEXT a propósito
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Cómo se conecta n8n

A diferencia del resto de integraciones de este proyecto (que usan
`$env.*` en variables de entorno del contenedor), la conexión a Postgres
usa una **credencial nativa de n8n**, no variables de entorno:

- **Credencial:** `Postgres - content_engine` (tipo `postgres`)
- **Host:** `propulsar-db.postgres.database.azure.com`
- **Database:** `content_engine`
- **Usuario:** `propulsaradmin`
- **Password:** desde Azure Key Vault (`propulsar-prod-kv/db-postgresdb-password`) — nunca hardcodeada, nunca en `.env`
- **SSL:** `require` (con `allowUnauthorizedCerts: true`, igual que la conexión propia de n8n a este mismo servidor)

Los 4 nodos que leen/escriben `content_sessions` (`💾 Guardar sesión
Supabase` y sus variantes Carousel/Story, más `🔍 Recuperar sesión
Supabase` — los nombres se mantuvieron sin cambios porque `connections`
en n8n se referencia por nombre) son nodos nativos
`n8n-nodes-base.postgres` (`executeQuery` + SQL parametrizado) en
`n8n/workflow.json`. No hay ningún snippet manual que copiar — el nodo ya
está armado en el workflow importado en la FASE 3.

---

## FASE 5 — Test end-to-end

```bash
# 1. Testear que el webhook responde
node scripts/test-webhook.js

# 2. Si funciona, ejecutar el wizard completo
npm run wizard
# → Elegir opciones de prueba
# → Confirmar envío
# → Revisar en n8n que la ejecución se disparó
# → Recibir preview por WhatsApp
# → Responder SI
# → Verificar que se logueó en Google Sheets
```

---

## Problemas comunes

| Error | Causa | Solución |
|-------|-------|---------|
| `WEBHOOK_URL no configurado` | Falta en .env | Copiar URL del nodo Webhook en n8n |
| `HTTP 404 del webhook` | Workflow inactivo | Activar el workflow en n8n |
| `OpenAI no devolvió JSON válido` | Temperature muy alta | Bajar a 0.5 en el nodo de OpenAI |
| `No recibo WhatsApp` | Número mal formateado | Usar formato: código país + número sin + |
| `Error Meta API` | Token vencido | Renovar Page Access Token |
