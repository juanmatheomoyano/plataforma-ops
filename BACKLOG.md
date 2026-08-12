# Backlog — Provincia Ops

Historias de usuario. Se agrupan por épica. Cada sprint activo enlaza a las historias que agarra desde [SPRINTS.md](SPRINTS.md).

**Convenciones**
- **Prioridad:** 🔴 Crítica · 🟡 Alta · 🟢 Media · ⚪ Baja
- **Tamaño:** XS (<2h) · S (medio día) · M (1-2 días) · L (3-5 días) · XL (partir)
- **Estado:** 📋 Backlog · 🚧 En curso · ✅ Hecho (con versión) · 🧊 Fría
- **Origen:** `[usuario]` pedido explícito del usuario · `[propuesta]` sugerencia de la auditoría (Claude, Sprint 1). Toda `[propuesta]` requiere aprobación del usuario antes de arrancarse; se puede descartar sin discusión.
- La [DoD](DOD.md) aplica a todas.

---

## Épica: Estabilización crítica

### HU-01 `[propuesta]`
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

### HU-02 `[propuesta]`
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

### HU-03 `[propuesta]`
**Como** dev, **quiero** que el sync marketplace no bloquee el startup de la app, **para** que Railway no mate el pod si Marketplace está lento.

- Prioridad: 🔴 Crítica · Tamaño: M · Estado: ✅ v1.7.8
- Épica: Estabilización · Sprint: 1

**Criterios de aceptación**
- [x] Startup sync fuera del `lifespan`: `asyncio.create_task(_run_marketplace_sync("startup"))` corre en background.
- [x] Cleanup del startup task en shutdown con timeout de 2s (cancel + wait_for).
- [x] `httpx.Timeout(10.0, connect=5.0)` explícito en `Marketplace_client.py`.
- [x] Tests de regresión en `tests/test_lifespan.py`: health responde <2s con Marketplace colgado + app arranca si sync tira excepción. 2/2 passing.

**Notas:** `backend/app/main.py:25-49`. Ver `RETRO.md` → "Startup sync en lifespan".

---

### HU-04 `[propuesta]`
**Como** dev, **quiero** que el scheduler no dispare tareas duplicadas si Railway escala a >1 réplica, **para** no hacer doble PATCH contra Marketplace.

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

### HU-05 `[propuesta]`
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

### HU-06 `[propuesta]`
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

### HU-07 `[propuesta]`
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

### HU-08 `[propuesta]`
**Como** admin, **quiero** un log auditable de quién hizo qué en el sistema, **para** poder investigar incidentes y cumplir con requisitos internos.

- Prioridad: 🟡 Alta · Tamaño: L · Estado: ✅ v1.7.11
- Sprint: 2

**Criterios de aceptación**
- [x] Tabla `audit_log` (id, timestamp, user_id, username, role, action, entity, entity_id, ip, request_id, payload JSONB) + migración `e5f6a7b8c9d0`. 5 índices (timestamp, user_id, action, entity, entity_id).
- [x] Helper `record_audit()` en `core/audit.py`. Best-effort: si falla, loguea warning y no rompe la operación.
- [x] Redacción automática de campos sensibles (`password`, `app_key`, `app_token`, `token`, `secret`) en el payload.
- [x] Aplicado en:
  - `auth.login` (éxito + `auth.login.failed`)
  - `auth.logout`
  - `user.create` / `user.update` / `user.deactivate` / `user.reset_password`
  - `seller.create` / `seller.update` / `seller.deactivate` / `seller.marketplace_toggle`
  - `sellers.export` / `sellers.export.with_credentials`
  - `crud_medios.c` / `.u` / `.d` (solo no-dry-run)
  - `evento.create` / `evento.update` / `evento.toggle_active` / `evento.delete`
- [x] `client_ip()` respeta `X-Forwarded-For` para IP correcta detrás de proxy Railway.
- [x] `request_id` propagado automáticamente desde context var (HU-10).

**Notas técnicas:** decidimos NO usar interceptor SQLAlchemy genérico. Es frágil con async/expire_on_commit=False, y captura demasiado (reads triviales, migraciones, etc.). El approach explícito (call `record_audit()` en cada endpoint sensible) es más largo pero determinístico.

---

### HU-09 `[propuesta]`
**Como** admin, **quiero** una página `/auditoria` con filtros, **para** buscar acciones específicas rápido.

- Prioridad: 🟡 Alta · Tamaño: M · Estado: ✅ v1.7.11
- Sprint: 2

**Criterios de aceptación**
- [x] Ruta `/auditoria` solo admin (RoleRoute + require_role backend + link en sidebar oculto para no-admin).
- [x] Endpoint `GET /api/auditoria` con paginación (limit/offset, max 500) + filtros: username, action, entity, entity_id, from_date, to_date.
- [x] Endpoint `GET /api/auditoria/actions` — lista distinct de actions para autocompletar.
- [x] Endpoint `GET /api/auditoria/export.csv` — export CSV con filtros aplicados (max 10k filas).
- [x] Tabla paginada (50/página) con timestamp, usuario+rol, action, entidad, entity_id, IP.
- [x] Fila expandible → muestra payload JSON formateado + request_id (para cross-ref con logs backend).
- [x] Datalist en filtro `action` con autocompletado desde el endpoint `/actions`.

---

### HU-10 `[propuesta]`
**Como** dev, **quiero** logs JSON estructurados en el backend, **para** filtrar en Railway sin regex.

- Prioridad: 🟢 Media · Tamaño: S · Estado: ✅ v1.7.11
- Sprint: 2

**Criterios de aceptación**
- [x] `JsonFormatter` custom en `core/logging_config.py` (sin dependencia externa, ~130 LOC).
- [x] Campos: timestamp ISO UTC, level, logger, message, request_id, user_id, username, role, exception.
- [x] `RequestIdMiddleware` inyecta `X-Request-ID` (uuid v4 o el que venga del cliente) por request y lo expone en response header.
- [x] `set_log_user()` invocado desde `get_current_user` — enrichece logs autenticados.
- [x] Formato legible en `APP_ENV=development` (no rompe uvicorn --reload); JSON solo en prod.
- [x] Silencia `sqlalchemy.engine` y `httpx` a WARNING en prod (evita spam).

---

### HU-11 `[propuesta]`
**Como** dev, **quiero** que CI corra tests + `alembic check` antes de mergear, **para** no romper prod con model drift.

- Prioridad: 🟡 Alta · Tamaño: M · Estado: ✅ v1.7.9
- Sprint: 2

**Criterios de aceptación**
- [x] GitHub Action en `.github/workflows/ci.yml`.
- [x] Job backend: instala deps, `alembic upgrade head`, `alembic check`, `pytest -v`.
- [x] Job frontend: instala deps, `npm run build`.
- [x] Falla el push/PR si alguno falla.
- [x] Postgres 16 como service para tests que necesitan DB real.
- [x] Registra los modelos faltantes en `alembic/env.py` (eventos, scheduler).
- [ ] Ruff/lint como step separado. *(pendiente — HU chica futura)*
- [ ] Badge de CI en README. *(pendiente)*

**Bugs encontrados al implementar**
- Migración `c3d4e5f6a7b8` duplicaba columna `marketplace_seller_id` (arreglado convirtiéndola en no-op).
- Modelo `Evento.created_at` sin `nullable=False` — drift con la migración `f1a2b3c4d5e6` (arreglado).

---

## Épica: Dashboard funcional v2

### HU-12 `[propuesta]`
**Como** frontend, **quiero** un único endpoint `/dashboard/summary` con toda la data del dashboard, **para** no hacer 5 requests en paralelo.

- Prioridad: 🟢 Media · Tamaño: L · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] `GET /dashboard/summary?rol=<role>` devuelve: kpis, series (ops_by_day, sellers_by_integracion), alerts, recent_activity.
- [ ] Respuesta cacheada 60s server-side (evita recalcular por polling).
- [ ] Payload distinto según rol (admin ve todo, analista solo su scope).

---

### HU-13 `[propuesta]`
**Como** cualquier usuario, **quiero** un dashboard con gráficos útiles adaptados a mi rol, **para** entender el estado de mi trabajo sin abrir cada módulo.

- Prioridad: 🟢 Media · Tamaño: L · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] Admin/supervisor: KPIs con delta, torta de integración, barras de top analistas, línea de ops últimos 30 días.
- [ ] Analista: mis sellers, mis ops de la semana, mis sellers "A corregir" en eventos, próximos eventos con conteo mío.
- [ ] Viewer: KPIs read-only + eventos vigentes.
- [ ] Recharts (ya en el stack), no una librería nueva.

---

### HU-14 `[propuesta]`
**Como** usuario, **quiero** que los datos del dashboard se actualicen sin tener que recargar, **para** ver estado en tiempo cuasi-real.

- Prioridad: 🟢 Media · Tamaño: M · Estado: 📋
- Sprint: 3

**Criterios de aceptación**
- [ ] TanStack Query instalado y usado al menos en Dashboard.
- [ ] Polling cada 60s.
- [ ] Al volver a la pestaña (`visibilitychange`) refetch inmediato.
- [ ] Loading states no parpadean (stale-while-revalidate).

---

### HU-15 `[propuesta]`
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

### HU-16 `[propuesta]` — Alertas de keys por vencer
Prioridad 🟢 · Tamaño M · Sprint 4 · Estado 📋

### HU-17 `[propuesta]` — Bulk actions en tabla de sellers
Prioridad 🟢 · Tamaño L · Sprint 4 · Estado 📋

### HU-18 `[propuesta]` — Test-connection agendado + auto-mark vencido
Prioridad 🟢 · Tamaño M · Sprint 4 · Estado 📋

### HU-19 `[propuesta]` — Historial de cambios en seller
Prioridad 🟢 · Tamaño M · Sprint 4 · Estado 📋

## Épica: CRUD pro

### HU-20 `[propuesta]` — Plantillas de filtros guardables por analista
Prioridad 🟢 · Tamaño M · Sprint 5 · Estado 📋

### HU-21 `[propuesta]` — Diff preview real (no solo dry-run)
Prioridad 🟢 · Tamaño L · Sprint 5 · Estado 📋

### HU-22 `[propuesta]` — Undo/rollback última operación
Prioridad 🟢 · Tamaño L · Sprint 5 · Estado 📋

### HU-23 `[propuesta]` — Programar operaciones diferidas
Prioridad 🟢 · Tamaño L · Sprint 5 · Estado 📋

## Épica: Eventos pro

### HU-24 `[propuesta]` — Calendario visual mensual/semanal
Prioridad 🟢 · Tamaño L · Sprint 6 · Estado 📋

### HU-25 `[propuesta]` — Estado computado del evento
Prioridad 🟢 · Tamaño S · Sprint 6 · Estado 📋

### HU-26 `[propuesta]` — Snapshot post-mortem al finalizar evento
Prioridad 🟢 · Tamaño M · Sprint 6 · Estado 📋

## Épica: UX post-update

### HU-42 `[usuario]`
**Como** admin, **quiero** que las fechas de creación de sellers estén normalizadas a `dd/mm/aaaa`, **para** que el Excel exportado sea consistente y no tenga mezcla de formatos US/ISO.

- Prioridad: 🟡 Alta · Tamaño: S · Estado: ✅ v1.7.9
- Sprint: 2

**Criterios de aceptación**
- [x] Helper `normalize_fecha()` en `sellers/service.py` con reglas:
  - `aaaa-mm-dd[...]` (ISO) → convierte a `dd/mm/aaaa`.
  - `m/d/aaaa` con día > 12 → detecta US, da vuelta a `dd/mm/aaaa`.
  - `d/m/aaaa` con día > 12 → ya está en AR, sin cambios.
  - `A/B/aaaa` con ambos ≤ 12 (ambiguo) → deja intacto, reporta para revisar.
  - Basura (doble `//`, letras, etc.) → deja intacto.
  - Nunca lanza excepción.
- [x] Aplicado en 5 puntos: `create_seller`, `update_seller`, `import_sellers_from_file`, `import_update_sellers`, `_build_sellers_xlsx`.
- [x] Script one-time `backend/scripts/normalize_fecha_sellers.py` con dry-run + `--apply`, reporta convertidos / ya-normalizados / ambiguos / sin-parsear.
- [ ] Correr en prod después del deploy de v1.7.9. *(pendiente para el operador)*

**Notas técnicas:** el campo sigue siendo `String(64)` en la BD — no se migra a tipo `Date`. Cambiar el tipo requeriría migración destructiva y no aporta valor operativo. La normalización server-side garantiza consistencia sin cambio de schema.

---

### HU-45 `[usuario]`
**Como** analista/admin, **quiero** poder crear/buscar/actualizar/eliminar reglas VTEX **sin level** para tarjetas de 1 pago, **para** cumplir con el nuevo manual de medios de pago (las tarjetas de 1 pago aplican a cualquier tipo).

- Prioridad: 🟡 Alta · Tamaño: S · Estado: ✅ v1.7.12
- Sprint: sin sprint (hotfix operativo)

**Contexto**
Nuevo manual VTEX indica que las reglas de 1 pago no llevan `cardLevel` (aplican a cualquier tarjeta). El sistema previo obligaba a seleccionar un level en Crear, y en los filtros no había forma de matchear reglas sin cardLevel.

**Criterios de aceptación**
- [x] Chip **"Sin level"** en filtros (R/U/D) y en Crear (solo habilitado con cuotas = 1).
- [x] Backend: sentinel `"__no_level__"` en `filtros.levels` matchea reglas sin cardLevel.
- [x] Backend: `execute_create` con `"__no_level__"` (o levels vacío) crea regla con `cardLevel: null` y nombre sin segmento de level.
- [x] Backend: `execute_update` con `level = "__no_level__"` limpia el cardLevel de la regla.
- [x] Validación frontend: rechaza "Sin level" combinado con cuotas ≠ [1] con mensaje claro.
- [x] Chip **Corporate** renombrado a **Corporate T** (valor `"corporate t"`) — coincide con el nombre real en VTEX.
- [x] Sin migración de BD (cambio de lógica solamente).

**Notas técnicas:** sentinel string `"__no_level__"` compartido entre schemas y frontend. La regla "1 pago = sin level" es soft (frontend), backend acepta cualquier combinación.

---

### HU-46 `[usuario]`
**Como** admin, **quiero** que el repo se pueda abrir al público sin exponer info de la empresa ni datos personales, **para** liberar el código y destrabar el auto-updater (que fallaba porque el repo era privado y GitHub no sirve assets sin auth).

- Prioridad: 🔴 Crítica · Tamaño: M · Estado: ✅ v1.7.13
- Sprint: sin sprint (rebrand + apertura)

**Contexto**
El auto-updater venía fallando desde v1.7.9 (usuarios instalando manual). Causa raíz: assets de releases de un repo privado devuelven 404 para requests no autenticadas. Solución: abrir el repo, pero antes limpiar cualquier referencia a la empresa o a personas.

**Criterios de aceptación**
- [x] Renombrado `sellers/baproar_client.py` → `sellers/marketplace_client.py`. Env vars `BAPROAR_*` → `MARKETPLACE_*` + nueva `MARKETPLACE_URL` (URL antes hardcodeada).
- [x] Tauri: publisher `Provincia NET` → `Provincia Ops`, identifier `com.provincianet.*` → `com.provinciaops.*`.
- [x] Frontend: `logo_provincia_compras-02.svg` → `logo_provincia_ops.svg` (wordmark simple). Alt tags y textos actualizados en `Login`, `Sidebar`, `Dashboard`.
- [x] Barrido de MDs: sin "BaproAR" ni "Provincia Compras/NET".
- [x] Password default de import: hardcoded `Provincia.2026` → env var `DEFAULT_INITIAL_PASSWORD`.
- [x] `MANUAL_USUARIO.md` sanitizado (contraseña genérica "la que te dé el administrador").
- [x] Verificado: `CREDENTIALS.md`, `Provincia Ops - Documentación/`, `.claude/settings.local.json` nunca committeados.
- [x] Git history verificada: sin `Benjamin.00`, DB password ni tokens de GH en ningún commit.

**Notas técnicas:** el nuevo identifier rompe el upgrade path automático desde v1.7.12 (Windows los ve como apps distintas). Aceptable — el updater ya venía roto igual. Post v1.7.13, updates fluyen normal contra el repo público.

---

### HU-44 `[usuario]`
**Como** usuario, **quiero** que el updater no se cuelgue en "Descargando..." indefinido, **para** saber si falló y tener un plan B.

- Prioridad: 🟡 Alta · Tamaño: S · Estado: ✅ v1.7.13
- Sprint: sin sprint

**Contexto**
En v1.7.11 se detectó que `update.downloadAndInstall()` puede quedarse colgado indefinidamente (probablemente Windows Defender / SAC bloqueando la descarga background sin devolver error). El toast "Descargando…" desaparece a los 20s y el usuario no ve más nada.

**Criterios de aceptación**
- [x] `useAutoUpdate.js`: envolver `downloadAndInstall()` con `Promise.race` + timeout de 60s.
- [x] Barra de progreso visible durante la descarga (event listener con `onEvent` — Started/Progress/Finished).
- [x] Si timeout o error, toast con acción "Abrir descarga" que abre `github.com/.../releases/latest` en el browser (vía `@tauri-apps/plugin-opener`).
- [x] Log a Sentry con tag `reason: download-failed` + bytes descargados vs. total para poder trackear.

**Notas técnicas:** el plugin `@tauri-apps/plugin-updater` v2 soporta `downloadAndInstall(onEvent)` donde `onEvent` recibe `{event: 'Started'|'Progress'|'Finished', data?}`.

---

### HU-43 `[usuario]`
**Como** admin, **quiero** que el `.exe` de la app se instale sin advertencias de Windows Smart App Control / SmartScreen, **para** no tener que enseñarle a cada usuario nuevo el workaround de desbloquear el archivo.

- Prioridad: 🟡 Alta · Tamaño: M (setup) + costo mensual · Estado: 📋
- Sprint: sin asignar (requiere decisión de compra)

**Contexto**
Todos los `.exe` releaseados hasta v1.7.10 están firmados con `rsign` (formato Tauri para verificar updates), pero NO con un certificado de code-signing de un CA reconocido. Windows 11 con SAC activo bloquea la instalación. Cada usuario nuevo tiene que:
1. Click derecho al `.exe` → Propiedades → Desbloquear, o
2. Desactivar SAC temporalmente en Seguridad de Windows.

**Opciones (por costo)**
- **Azure Trusted Signing** (~USD 10/mes): recomendado. Setup con Azure account + GitHub Actions. Sin warnings tras ganar reputación (rápido). Integración vía workflow.
- **Sectigo/DigiCert OV** (~USD 100-300/año): certificado estándar. SmartScreen warning inicial que desaparece tras varias descargas — poco útil para app interna con pocos users.
- **Sectigo/DigiCert EV** (~USD 300-700/año): sin warnings desde el primer install. Requiere hardware USB token — complica CI/CD.

**Criterios de aceptación**
- [ ] Decidir opción (Azure Trusted Signing recomendado).
- [ ] Comprar/setupear el certificado.
- [ ] Integrar firma en `npm run tauri build` (local) y en `.github/workflows/ci.yml` (CI opcional).
- [ ] Documentar el proceso de firma en `RUNBOOK.md`.
- [ ] Validar: instalar `.exe` firmado en Windows 11 con SAC activo — sin bloqueo.
- [ ] Actualizar `MANUAL_USUARIO.md` sacando el workaround (ya no aplica).

**Notas técnicas**
Este proceso es INDEPENDIENTE de la firma rsign para el updater — son dos firmas distintas. La rsign sigue siendo necesaria para que el updater Tauri verifique la integridad del binario descargado. El code-signing MS es para que Windows confíe al ejecutar.

---

### HU-41 `[usuario]`
**Como** admin, **quiero** que el modal de export con credenciales me advierta que Windows no puede extraer el zip, **para** no perder tiempo probando con el explorador nativo.

- Prioridad: 🟡 Alta · Tamaño: XS · Estado: ✅ v1.7.11
- Sprint: 2

**Criterios de aceptación**
- [x] Después de mostrar el password one-shot en `ExportSellersModal.jsx`, agregar un aviso visible: *"⚠️ Windows no puede extraer este .zip. Usá WinRAR o 7-Zip."*
- [x] Aviso con link a 7-Zip (`https://www.7-zip.org/`) para que quien no tenga WinRAR pueda instalar la alternativa gratis.

**Notas técnicas:** solo tocar `frontend/src/modules/sellers/ExportSellersModal.jsx`. El export server-side (pyzipper AES-256) queda igual — es el estándar correcto de seguridad, la limitación es del Explorer de Windows. El manual ya fue actualizado con el mismo aviso.

---

### HU-40 `[usuario]`
**Como** dev, **quiero** que el auto-updater sea diagnosticable, **para** saber por qué falla cuando no avisa al usuario de una nueva versión.

- Prioridad: 🔴 Crítica · Tamaño: S · Estado: ✅ v1.7.10
- Sprint: 2 (hotfix)

**Criterios de aceptación**
- [x] `useAutoUpdate.js`: reportar a Sentry en el `catch` con contexto (versión actual, endpoint, mensaje de error).
- [x] Toast al usuario si el check falla (no bloqueante).
- [x] Botón "Buscar actualizaciones ahora" en `/configuracion` que fuerza el check.
- [x] Mostrar en la consola del updater el status: chequeando / al día / disponible / instalando.
- [x] Dialog nativo Tauri (`ask()`) en vez de `window.confirm()` — más confiable en WebView2.
- [x] Sentry breadcrumbs en cada paso.
- [ ] Indicador visual en el sidebar si hay update disponible (badge en un ícono). *(pendiente, no crítico)*

**Notas técnicas:** el auto-updater v1.7.5→v1.7.9 nunca avisó al usuario. Con el fix de v1.7.10 la próxima falla se manda a Sentry con contexto y aparece en pantalla del usuario. Solo tras instalar v1.7.10 manualmente empieza a haber diagnóstico (v1.7.5 y v1.7.8 quedan silenciosas).

---

### HU-39 `[usuario]`
**Como** usuario, **quiero** ver la versión de la app en un lugar visible, **para** saber si estoy en la última cuando repongo algo o pido soporte.

- Prioridad: 🟡 Alta · Tamaño: XS · Estado: ✅ v1.7.9
- Sprint: 2

**Criterios de aceptación**
- [x] Badge de versión (`v1.7.8` estilo) al pie del sidebar, debajo de "Cerrar sesión".
- [x] Fuente única de la versión: `frontend/src-tauri/tauri.conf.json`. `vite.config.js` la lee y la inyecta como `import.meta.env.VITE_APP_VERSION` en build.
- [x] Selectable con el mouse (para copiar y pegar en un reporte de soporte).
- [x] Frontend sigue compilando.

**Notas técnicas:** `frontend/src/core/layout/Sidebar.jsx` + `frontend/vite.config.js`. Al bumpear la versión en `tauri.conf.json` para el próximo release, la UI se actualiza sola.

---

### HU-37 `[usuario]`
**Como** usuario, **quiero** ver un cartel emergente la primera vez que abro la app después de una actualización, **para** enterarme de qué cambió sin tener que buscar el changelog.

- Prioridad: 🟡 Alta · Tamaño: S · Estado: ✅ v1.7.11
- Épica: UX post-update · Sprint: 2

**Criterios de aceptación**
- [x] Nuevo hook `useVersionAnnouncement()` en `frontend/src/core/hooks/`.
- [x] Compara `import.meta.env.VITE_APP_VERSION` contra `localStorage.last_seen_version`.
- [x] Si son distintos, muestra `<WhatsNewModal />` con la versión nueva + notas de release.
- [x] Al cerrar el modal ("Entendido"), se guarda `last_seen_version` en localStorage → no vuelve a aparecer hasta el próximo update.
- [x] Las notas se toman de `GET /api/updates/latest` (campo `notes`) — no requiere endpoint nuevo.
- [x] En primera instalación (sin `last_seen_version` previo), NO se muestra el modal — solo se persiste la versión actual silenciosamente.
- [x] El modal es estético (usa componentes shadcn/ui existentes), no bloqueante (Esc/X cierran).
- [x] Solo se muestra cuando el user está logueado (no interfiere con pantalla de login).

---

## 🧊 Backlog frío (sin sprint)

- HU-27 `[propuesta]` API pública con API keys · ⚪ · L
- HU-28 `[propuesta]` Multi-tenant / multi-cuenta VTEX · ⚪ · XL
- HU-29 `[propuesta]` Módulo Catálogo VTEX · ⚪ · XL
- HU-30 `[propuesta]` Módulo Shipping Policies · ⚪ · L
- HU-31 `[propuesta]` Módulo Prices Simulator · ⚪ · L
- HU-32 `[propuesta]` Panel admin de cron jobs configurables · ⚪ · M
- HU-33 `[propuesta]` Webhooks salientes · ⚪ · L
- HU-34 `[propuesta]` Forzar cambio de contraseña en primer login · 🟢 · S
- HU-35 `[propuesta]` Bloqueo de cuenta tras N intentos fallidos · 🟢 · S
- HU-36 `[propuesta]` Dashboard personalizable (reordenar/ocultar cards) · ⚪ · M

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
- ✅ Sync marketplace Marketplace + toggle — v1.7.7

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

---

## 📥 Ideas propuestas (por definir)

Ideas capturadas del usuario, sin sprint asignado todavía. Cuando maduren se transforman en HU con formato completo (criterios de aceptación, tamaño, sprint).

### HU-38 `[usuario]` — Sistema de permisos estilo VTEX con roles múltiples
Propuesto por: `usuario` (commit `76ec65f`, 2026-07-27) · Prioridad tentativa: 🟡 Alta · Tamaño estimado: L-XL · Sprint: por definir

**Idea original**
Reemplazar el sistema actual de rol único por un sistema de **roles múltiples por usuario** (un usuario puede tener 2 o más roles activos simultáneamente, ej. "Categorías + Activación").

**Roles propuestos**
- **Owner**: acceso máximo, incluye user management.
- **Admin**: acceso a todo menos user management.
- **Categorías**: CRUD Medios de Pago solo lectura · Sellers acceso completo excepto import/export general (sí crear seller nuevo con credenciales) · Eventos solo visual (sin editar, sin toggle, sin crear).
- **Catálogo**: sin módulos propios todavía · Eventos solo visual.
- **Activación**: acceso al futuro módulo "Proceso de alta de Sellers" · Sellers como Categorías · Eventos solo visual.
- **Administrativo**: acceso al futuro módulo "Automatización de cambio de contraseñas Payway" · Eventos solo visual.

**Preguntas abiertas antes de implementar**
- ¿Migración desde los 4 roles actuales? Mapping tentativo: admin→Owner+Admin, supervisor→Admin, analista→Categorías, viewer→Categorías (solo lectura).
- ¿Cómo se resuelven conflictos entre roles? (unión de permisos parece lo natural).
- ¿UI para asignar múltiples roles? Multi-select en el módulo Users.
- Depende de HU-08 (audit_log) para trazar quién cambió qué rol y cuándo.
- Depende de que existan los nuevos módulos "Alta de Sellers" y "Automatización Payway" (aún no en backlog).

**Próximo paso:** convertir en HU formal cuando se planifique el sprint que la incluya. Antes de eso, definir con el usuario las preguntas abiertas.
