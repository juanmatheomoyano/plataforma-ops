# Backlog — Provincia Ops

Historias de usuario. Se agrupan por épica. Cada sprint activo enlaza a las historias que agarra desde [SPRINTS.md](SPRINTS.md).

**Convenciones**
- **Prioridad:** 🔴 Crítica · 🟡 Alta · 🟢 Media · ⚪ Baja
- **Tamaño:** XS (<2h) · S (medio día) · M (1-2 días) · L (3-5 días) · XL (partir)
- **Estado:** 📋 Backlog · 🚧 En curso · ✅ Hecho (con versión) · 🧊 Fría
- La [DoD](DOD.md) aplica a todas.

---

## Épica: Estabilización crítica

### HU-01
**Como** supervisor, **quiero** ver el dashboard con métricas correctas para mi rol, **para** no tener que pedirle a un admin que me pase los números.

- Prioridad: 🔴 Crítica · Tamaño: S · Estado: ✅ v1.7.8
- Épica: Estabilización · Sprint: 1

**Criterios de aceptación**
- [x] `Dashboard.jsx` usa `supervisor` (no `analista_senior`).
- [x] Se elimina el bloque de `ultimo_operador` (backend ya no lo devuelve).
- [x] `MODULES` incluye Eventos y Configuración, Usuarios abierto a admin + supervisor.
- [ ] Login con un usuario `supervisor` real muestra KPIs y el bloque de Usuarios accesible. *(pendiente verificación manual en app)*

**Notas:** `frontend/src/pages/Dashboard.jsx:9-27,99-106`.

---

### HU-02
**Como** admin de seguridad, **quiero** que la API rechace requests de orígenes no autorizados, **para** que un JWT robado no sea usable desde otro origin.

- Prioridad: 🔴 Crítica · Tamaño: S · Estado: ✅ v1.7.8
- Épica: Estabilización · Sprint: 1

**Criterios de aceptación**
- [x] `allow_origins` lista explícita con orígenes Tauri (http/https tauri.localhost + tauri://localhost) + dev (localhost:5173, 127.0.0.1:5173).
- [x] `allow_credentials=False` mantenido (auth por Bearer).
- [x] Test de regresión en `tests/test_cors.py`: request con `Origin: https://malicioso.com` no incluye headers CORS. 5/5 passing.
- [ ] .exe instalado sigue funcionando post-cambio. *(pendiente verificación manual)*

**Notas:** `backend/app/main.py:62-68`. Ver `RETRO.md` → "CORS reabierto".

---

### HU-03
**Como** dev, **quiero** que el sync marketplace no bloquee el startup de la app, **para** que Railway no mate el pod si BaproAR está lento.

- Prioridad: 🔴 Crítica · Tamaño: M · Estado: ✅ v1.7.8
- Épica: Estabilización · Sprint: 1

**Criterios de aceptación**
- [x] Startup sync fuera del `lifespan`: `asyncio.create_task(_run_marketplace_sync("startup"))` corre en background.
- [x] Cleanup del startup task en shutdown con timeout de 2s (cancel + wait_for).
- [x] `httpx.Timeout(10.0, connect=5.0)` explícito en `baproar_client.py`.
- [x] Tests de regresión en `tests/test_lifespan.py`: health responde <2s con BaproAR colgado + app arranca si sync tira excepción. 2/2 passing.

**Notas:** `backend/app/main.py:25-49`. Ver `RETRO.md` → "Startup sync en lifespan".

---

### HU-04
**Como** dev, **quiero** que el scheduler no dispare tareas duplicadas si Railway escala a >1 réplica, **para** no hacer doble PATCH contra BaproAR.

- Prioridad: 🔴 Crítica · Tamaño: M · Estado: ✅ v1.7.8
- Épica: Estabilización · Sprint: 1

**Criterios de aceptación**
- [x] Tabla `scheduler_locks` (`job_name` PK, `locked_until`, `locked_by`) + migración Alembic `d4e5f6a7b8c9`.
- [x] Helpers `try_acquire_lock` / `release_lock` / `job_lock` en `app/core/scheduler.py` con UPSERT atómico (INSERT ... ON CONFLICT ... WHERE locked_until < NOW()) — Postgres-native.
- [x] `_run_marketplace_sync` corre bajo `job_lock` con TTL de 30 min. Si no toma el lock, loguea y sale.
- [x] 4 tests unit del context manager + gate del sync (`tests/test_scheduler_lock.py`). Suite completa 49/49 verde.
- [ ] Test manual con 2 workers uvicorn locales. *(pendiente, requiere BD local)*

**Notas:** ver `RETRO.md` → "APScheduler in-process".

---

### HU-05
**Como** admin, **quiero** que el export de sellers con credenciales VTEX quede protegido y auditado, **para** que un archivo filtrado no exponga las claves de todos los sellers.

- Prioridad: 🔴 Crítica · Tamaño: M · Estado: ✅ v1.7.8
- Épica: Estabilización · Sprint: 1

**Criterios de aceptación**
- [x] Endpoint `/sellers/export?include_credentials=<bool>`. Por defecto `false` (xlsx plano, admin+supervisor). Con `true` requiere rol admin.
- [x] Con credenciales: genera `.zip` cifrado AES-256 (`pyzipper`). Password random `secrets.token_urlsafe(12)` en header `X-Export-Password` (expuesto vía CORS `expose_headers`).
- [x] `ExportSellersModal.jsx` con doble confirmación (checkbox "confirmo el riesgo") antes de descargar con credenciales. Password se muestra una sola vez con botón copiar y no se puede reabrir.
- [x] Cada export queda logueado con user + user_id + bytes en logger `sellers.export` (nivel INFO sin creds, WARNING con creds). Se reemplazará por `audit_log` cuando exista (HU-08).
- [x] Verificado: sin password el zip no abre, password random distinto por request.

---

### HU-06
**Como** dev, **quiero** ver traces con contexto cuando algo falla en producción, **para** no depender de que el usuario reporte el bug.

- Prioridad: 🟡 Alta · Tamaño: M · Estado: ✅ v1.7.8 (parcial)
- Épica: Observabilidad · Sprint: 1

**Criterios de aceptación**
- [x] Backend: `sentry-sdk[fastapi]` + `app/core/observability.py` con `init_sentry()` gated por env var `SENTRY_DSN`. Integrations FastAPI + Starlette + SQLAlchemy. Sin DSN → no-op.
- [x] Frontend: `@sentry/react` + `src/core/observability.js` con `initSentry()` gated por `VITE_SENTRY_DSN`. Release = `provincia-ops-frontend@<VITE_APP_VERSION>`.
- [x] User context: `set_sentry_user(user_id, username, role)` en `get_current_user` (backend) y en `AuthContext.login/restore/logout` (frontend). Path/IP/status vienen automáticos de las integrations FastAPI.
- [x] `SENTRY_DSN` y `VITE_SENTRY_DSN` documentados en README.
- [ ] Verificar en prod con DSN real forzando un raise. *(pendiente crear cuenta Sentry + cargar DSN en Railway)*

---

### HU-07
**Como** dev, **quiero** una matriz de tests que verifique permisos de cada endpoint por rol, **para** no romper autorización sin darme cuenta al renombrar un rol.

- Prioridad: 🟡 Alta · Tamaño: L · Estado: ✅ v1.7.8
- Épica: Observabilidad · Sprint: 1

**Criterios de aceptación**
- [x] `tests/test_role_permissions.py` con fixture de `TestClient` + overrides de `get_current_user` y `get_db`. Sin BD real (approach de "verificar solo el guard").
- [x] Matriz declarativa `(method, path, body, {rol: "ok"|"deny"})` — 18 endpoints × 4 roles = 72 tests parametrizados + 1 test de 401 sin auth. Total 73.
- [x] Cubre: users CRUD (6 endpoints), sellers CRUD + marketplace (11 endpoints), crud-medios cleanup (1 endpoint).
- [x] Convención: "ok" = status ≠ 401/403; "deny" = status == 403. `raise_server_exceptions=False` para que fallas de mock DB no propaguen a pytest.
- [x] Suite completa 122/122 verde.
- [ ] CI que corra pytest en cada PR. *(pendiente HU-11 en Sprint 2)*

---

## Épica: Observabilidad + Auditoría

### HU-08
**Como** admin, **quiero** un log auditable de quién hizo qué en el sistema, **para** poder investigar incidentes y cumplir con requisitos internos.

- Prioridad: 🟡 Alta · Tamaño: L · Estado: 📋
- Sprint: 2

**Criterios de aceptación**
- [ ] Tabla `audit_log` (id, user_id, username, action, entity, entity_id, diff_json, ip, timestamp).
- [ ] Interceptor de SQLAlchemy o dependency FastAPI captura al menos: create/update/delete de sellers, users, eventos + toggle marketplace + login/logout + export.
- [ ] No captura reads triviales (spam).

---

### HU-09
**Como** admin, **quiero** una página `/auditoria` con filtros, **para** buscar acciones específicas rápido.

- Prioridad: 🟡 Alta · Tamaño: M · Estado: 📋
- Sprint: 2

**Criterios de aceptación**
- [ ] Ruta `/auditoria` solo para admin.
- [ ] Tabla paginada con filtros: usuario, módulo, acción, rango de fechas.
- [ ] Detalle expandible por fila (diff_json formateado).
- [ ] Export CSV del filtro activo.

---

### HU-10
**Como** dev, **quiero** logs JSON estructurados en el backend, **para** filtrar en Railway sin regex.

- Prioridad: 🟢 Media · Tamaño: S · Estado: 📋
- Sprint: 2

**Criterios de aceptación**
- [ ] Handler de logging con formato JSON (loguru o `python-json-logger`).
- [ ] Campos: level, timestamp, module, message, request_id (uuid por request), user (si autenticado).
- [ ] Middleware que inyecta request_id en todos los logs de la request.

---

### HU-11
**Como** dev, **quiero** que CI corra tests + `alembic check` antes de mergear, **para** no romper prod con model drift.

- Prioridad: 🟡 Alta · Tamaño: M · Estado: 📋
- Sprint: 2

**Criterios de aceptación**
- [ ] GitHub Action en `.github/workflows/ci.yml`.
- [ ] Corre `pytest`, `alembic check`, `ruff check`, `npm run build`.
- [ ] Falla el PR si alguno falla.
- [ ] Badge en README.

---

## Épica: Dashboard funcional v2

### HU-12
**Como** frontend, **quiero** un único endpoint `/dashboard/summary` con toda la data del dashboard, **para** no hacer 5 requests en paralelo.

- Prioridad: 🟢 Media · Tamaño: L · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] `GET /dashboard/summary?rol=<role>` devuelve: kpis, series (ops_by_day, sellers_by_integracion), alerts, recent_activity.
- [ ] Respuesta cacheada 60s server-side (evita recalcular por polling).
- [ ] Payload distinto según rol (admin ve todo, analista solo su scope).

---

### HU-13
**Como** cualquier usuario, **quiero** un dashboard con gráficos útiles adaptados a mi rol, **para** entender el estado de mi trabajo sin abrir cada módulo.

- Prioridad: 🟢 Media · Tamaño: L · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] Admin/supervisor: KPIs con delta, torta de integración, barras de top analistas, línea de ops últimos 30 días.
- [ ] Analista: mis sellers, mis ops de la semana, mis sellers "A corregir" en eventos, próximos eventos con conteo mío.
- [ ] Viewer: KPIs read-only + eventos vigentes.
- [ ] Recharts (ya en el stack), no una librería nueva.

---

### HU-14
**Como** usuario, **quiero** que los datos del dashboard se actualicen sin tener que recargar, **para** ver estado en tiempo cuasi-real.

- Prioridad: 🟢 Media · Tamaño: M · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] TanStack Query instalado y usado al menos en Dashboard.
- [ ] Polling cada 60s.
- [ ] Al volver a la pestaña (`visibilitychange`) refetch inmediato.
- [ ] Loading states no parpadean (stale-while-revalidate).

---

### HU-15
**Como** admin/supervisor, **quiero** ver alertas accionables desde cualquier página, **para** no perderme cosas importantes.

- Prioridad: 🟢 Media · Tamaño: M · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] Bell icon en header con contador de alertas no leídas.
- [ ] Dropdown con últimas 10 alertas + link a la página relevante.
- [ ] Fuentes: keys por vencer, marketplace desincronizado, eventos con sellers A corregir, sync fallido.
- [ ] "Marcar todas como leídas" persistente por usuario.

---

## Épica: Sellers pro

### HU-16 — Alertas de keys por vencer
Prioridad 🟢 · Tamaño M · Sprint 4 · Estado 📋

### HU-17 — Bulk actions en tabla de sellers
Prioridad 🟢 · Tamaño L · Sprint 4 · Estado 📋

### HU-18 — Test-connection agendado + auto-mark vencido
Prioridad 🟢 · Tamaño M · Sprint 4 · Estado 📋

### HU-19 — Historial de cambios en seller
Prioridad 🟢 · Tamaño M · Sprint 4 · Estado 📋

## Épica: CRUD pro

### HU-20 — Plantillas de filtros guardables por analista
Prioridad 🟢 · Tamaño M · Sprint 5 · Estado 📋

### HU-21 — Diff preview real (no solo dry-run)
Prioridad 🟢 · Tamaño L · Sprint 5 · Estado 📋

### HU-22 — Undo/rollback última operación
Prioridad 🟢 · Tamaño L · Sprint 5 · Estado 📋

### HU-23 — Programar operaciones diferidas
Prioridad 🟢 · Tamaño L · Sprint 5 · Estado 📋

## Épica: Eventos pro

### HU-24 — Calendario visual mensual/semanal
Prioridad 🟢 · Tamaño L · Sprint 6 · Estado 📋

### HU-25 — Estado computado del evento
Prioridad 🟢 · Tamaño S · Sprint 6 · Estado 📋

### HU-26 — Snapshot post-mortem al finalizar evento
Prioridad 🟢 · Tamaño M · Sprint 6 · Estado 📋

## Épica: UX post-update

### HU-37
**Como** usuario, **quiero** ver un cartel emergente la primera vez que abro la app después de una actualización, **para** enterarme de qué cambió sin tener que buscar el changelog.

- Prioridad: 🟡 Alta · Tamaño: S · Estado: 📋 Backlog
- Épica: UX post-update · Sprint: 2 (target v1.7.9)

**Criterios de aceptación**
- [ ] Nuevo hook `useVersionAnnouncement()` en `frontend/src/core/hooks/`.
- [ ] Compara `import.meta.env.VITE_APP_VERSION` contra `localStorage.last_seen_version`.
- [ ] Si son distintos, muestra `<WhatsNewModal />` con la versión nueva + notas de release.
- [ ] Al cerrar el modal ("Entendido"), se guarda `last_seen_version` en localStorage → no vuelve a aparecer hasta el próximo update.
- [ ] Las notas se toman de `GET /api/updates/latest` (campo `notes`) — no requiere endpoint nuevo.
- [ ] En primera instalación (sin `last_seen_version` previo), NO se muestra el modal — solo se persiste la versión actual silenciosamente.
- [ ] El modal es estético (usa componentes shadcn/ui existentes), no bloqueante (se puede cerrar con Esc/X).

**Notas técnicas**
- Va en `App.jsx` al mismo nivel que `useAutoUpdate()`.
- Reutiliza el componente `Dialog` de `components/ui/dialog.jsx`.
- No requiere backend nuevo — usa el endpoint `/api/updates/latest` que ya existe.

---

## 🧊 Backlog frío (sin sprint)

- HU-27 API pública con API keys · ⚪ · L
- HU-28 Multi-tenant / multi-cuenta VTEX · ⚪ · XL
- HU-29 Módulo Catálogo VTEX · ⚪ · XL
- HU-30 Módulo Shipping Policies · ⚪ · L
- HU-31 Módulo Prices Simulator · ⚪ · L
- HU-32 Panel admin de cron jobs configurables · ⚪ · M
- HU-33 Webhooks salientes · ⚪ · L
- HU-34 Forzar cambio de contraseña en primer login · 🟢 · S
- HU-35 Bloqueo de cuenta tras N intentos fallidos · 🟢 · S
- HU-36 Dashboard personalizable (reordenar/ocultar cards) · ⚪ · M

---

## ✅ Historial cerrado

Historias completadas antes del formalizar este backlog (v1.0.0 → v1.7.7). Se mantienen para trazabilidad.

### Dashboard v1
- ✅ Últimas 5 operaciones del usuario logueado — v1.1.0
- ✅ Accesos rápidos a módulos según rol — v1.1.0
- ✅ Contador sellers activos/inactivos/keys vencidas — v1.1.0
- ✅ Total operaciones del día — v1.1.0
- ✅ Total usuarios activos — v1.1.0

### Sellers v1
- ✅ Buscador global + filtros por columna — v1.1.0
- ✅ Scroll interno fijo — v1.1.1
- ✅ Seller ID visible y editable — v1.1.0
- ✅ Campo Analista como select — v1.2.0
- ✅ Campo Fecha de creación con DatePicker — v1.2.0
- ✅ Campo Integración + Especificación con crear nueva — v1.2.0
- ✅ Export/Import Excel — v1.3.0
- ✅ Export con credenciales VTEX (solo admin) — v1.7.1
- ✅ Sync marketplace BaproAR + toggle — v1.7.7

### CRUD Medios de Pago v1
- ✅ Filtros por columna en tabla resultados — v1.2.1
- ✅ Rediseño Create (múltiples reglas por firma×level) — v1.3.2
- ✅ Filtros bloqueados en C/U/D — v1.3.2
- ✅ Filtro por analista en scope selector — v1.7.0
- ✅ Dashboard grupos por seller + validación eventos — v1.4.0
- ✅ Export Excel completo con dashboard + gráfico — v1.6.5
- ✅ Id Ecommerce en resultados + Excel — v1.7.6
- ✅ Botones C/U/D deshabilitados por rol — v1.7.6

### Módulo Eventos
- ✅ Crear/administrar eventos — v1.6.0
- ✅ Validación integrada en CRUD Read — v1.6.0
- ✅ Eventos próximos visibles — v1.6.1

### Seguridad
- ✅ Eliminar bootstrap endpoint con credenciales hardcodeadas — v1.7.3
- ✅ CORS restringido (regresionó luego, ver HU-02) — v1.7.3
- ✅ CSP habilitado en Tauri — v1.7.3
- ✅ Guards de ruta consistentes con backend — v1.7.3
- ✅ setup-server.sh sin password en claro — v1.7.3
- ✅ httpx cliente compartido — v1.7.3
- ✅ Updater firmado Ed25519 — v1.7.5
- ✅ Rate limiting en /auth/login — v1.7.4
- ✅ 38 tests unitarios para filtros CRUD — v1.7.4

### Rediseño de roles
- ✅ Rol `analista_senior` → `supervisor` — v1.7.2

### Brand redesign
- ✅ Encode Sans + colores de marca + dark/light — v1.5.0
- ✅ Migración completa a tokens semánticos — v1.5.1

### General
- ✅ Auto-update de Tauri 2 — v1.1.1
- ✅ Limpieza automática de historial >90 días — v1.2.1
- ✅ Cambio de contraseña propio en sidebar — v1.2.1
