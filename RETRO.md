# Retro — Provincia Ops

Bitácora viva de lo que aprendimos construyendo esto. **No es una reunión, es un registro.** Se agrega al final cuando pasa algo relevante (bug feo, decisión importante, patrón que funcionó, zona que sabemos frágil).

---

## ✅ Qué funcionó (patrones a repetir)

### Debug con endpoint temporal sin auth
Para diagnosticar el problema de "solo sincroniza 46 sellers", agregamos un `GET /sellers/debug-Marketplace` público que devolvía la respuesta cruda de Marketplace. Nos permitió descubrir que:
- La paginación era `from`/`to` (no `page`/`pageSize`)
- El campo de match era `account`, no `id` (que a veces es taxCode)

**Cuándo repetir:** frente a integraciones opacas donde la doc no coincide con la realidad. **Regla:** el endpoint temporal se borra en el mismo PR que lo resuelve, nunca queda en main.

### Wrapping try/except en tareas de lifespan
Envolver el startup sync en try/except que solo loguea warning evitó que un Marketplace caído tirara toda la app abajo.

**Cuándo repetir:** cualquier side effect que corra en `lifespan` de FastAPI. La app tiene que arrancar sí o sí, aunque una integración externa esté caída.

### Env vars para credenciales de terceros (no en BD)
Las credenciales Marketplace viven en Railway como env vars, no en la tabla `sellers`. Mismo criterio que VTEX_ACCOUNT. Facilita rotación sin migraciones y evita tener secretos en dumps de BD.

**Cuándo repetir:** siempre para credenciales de sistemas externos que son globales a la app (no per-tenant).

### Solo actualizar BD tras confirmación del externo
El toggle marketplace hace PATCH a Marketplace primero y solo si responde 200 actualiza la tabla `sellers`. Evita el clásico "en Provincia Ops figura activo pero en Marketplace está apagado".

**Cuándo repetir:** cualquier acción que cambie estado en un sistema externo. Fuente de verdad = el externo.

---

## ⚠️ Qué salió mal (bugs, deploys rotos, decisiones que costaron)

### `NameError: status_map` — dos deploys seguidos rotos (2026-07-01)
Refactorizamos `sync_marketplace_sellers` renombrando `status_map` → `account_map` pero quedaron 2 referencias al nombre viejo (logger + return). Cada una tiró el endpoint con 500 y requirió su propio hotfix (`da5bf77`, `a4f75b5`).

**Causa raíz:** rename manual sin `grep` sobre todo el archivo. Sin tests que ejecuten el path, no lo detectamos hasta prod.

**Cómo evitarlo:**
- Al renombrar, siempre `grep <nombre_viejo>` sobre el módulo entero antes de commit.
- Prioridad alta: tests que ejecuten al menos el happy path de cada endpoint (Sprint 1).

### Migración `b2c3d4e5f6a7` modificada post-apply (2026-06-30)
Agregamos `marketplace_seller_id` a la migración `b2c3` **después** de que ya se había aplicado en Railway. Alembic la marca como aplicada y salta el nuevo `add_column` → columna nunca creada → 500 al leer sellers.

**Fix:** creamos migración nueva `c3d4e5f6a7b8` con solo esa columna.

**Regla:** **jamás** editar una migración ya aplicada en producción. Siempre nueva revisión.

### `apscheduler==3.11.0` no existe en PyPI (2026-07-01)
Puse una versión inventada en `requirements.txt`, el build de Railway falló. Perdimos ~15 min descubriendo el problema.

**Regla:** al pinnear una nueva dependencia, siempre `pip install <pkg>==<version>` local primero, o usar rango (`>=X,<Y`) si no importa el exact match.

### CORS reabierto a `*` (regresión de v1.7.3)
En v1.7.3 restringimos CORS a `tauri://localhost` + `localhost:5173`. Algún deploy posterior volvió a `["*"]`. Nadie se dio cuenta hasta la auditoría.

**Causa probable:** tocamos CORS cuando el build de Tauri tenía otro origin y no lo revertimos.

**Cómo evitarlo:** Sprint 1 lo cierra + test de integración que verifique el header CORS de la respuesta.

### Cache stale de rol (Dashboard rota)
`Dashboard.jsx` sigue usando `analista_senior` (renombrado a `supervisor` en v1.7.2). No lo detectamos hasta la auditoría de 2026-07-01. Los supervisores llevan un mes viendo el dashboard sin métricas.

**Regla:** al renombrar un rol, hacer `grep -r <rol_viejo>` sobre `frontend/src` **y** `backend/app`. Agregar chequeo a CI eventualmente.

---

## 🚫 Zonas peligrosas (tocar con cuidado, avisar antes)

### Alembic
- **Nunca** modificar una migración ya aplicada en Railway. Crear nueva.
- El `down_revision` de una migración nueva tiene que ser la **última aplicada en prod**, no la última en tu working copy.
- No borrar migraciones "viejas que ya nadie usa" — si un dev tiene una BD nueva, las necesita para levantar el schema desde cero.

### Roles y permisos
Rol viejo `analista_senior` fue renombrado a `supervisor` (v1.7.2). Todavía puede haber referencias sueltas.

Al agregar/renombrar un rol, tocar **los 4** lugares:
1. Enum en `backend/app/modules/auth/models.py`
2. Guards en `backend/app/**/router.py` (`require_role([...])`)
3. `RoleRoute` en `frontend/src/App.jsx` + Sidebar
4. UI condicional dentro de cada página (`hasRole([...])`)

### CORS + credentials
`allow_credentials=True` **requiere** `allow_origins` explícito (no `*`). Si volvés a `*`, obligatorio `allow_credentials=False` o el navegador rechaza todo.

### APScheduler in-process
Corre en el mismo uvicorn. Si Railway escala a >1 réplica, cada una dispara el sync → race + doble PATCH contra Marketplace. Antes de escalar horizontal, mover a job separado o agregar lock DB.

### Startup sync en lifespan
Cualquier IO externa dentro del `lifespan` corre en el path del health check de Railway. Si tarda >30s, el health check falla y Railway mata el pod. Timeout HTTP explícito **obligatorio** para cualquier httpx call en el lifespan.

### Export sellers con credenciales VTEX (v1.7.1)
El Excel tiene App Key y App Token en texto plano. Si el archivo se filtra (mail, OneDrive público, USB perdido), las credenciales quedan expuestas. Requiere protección adicional antes de asumirlo como feature estable (Sprint 1).

### Path ordering en FastAPI router
`/sellers/sync-marketplace` **tiene que** estar antes de `/sellers/{seller_id}` en el archivo, o FastAPI intenta parsear `"sync-marketplace"` como UUID → 422 o 405 confusos.

### Estado `estado_keys=vencido`
No hay job automático que lo marque. Se actualiza solo manualmente. No confiar en el filtro "keys vencidas" del dashboard como fuente de verdad hasta Sprint 4.
