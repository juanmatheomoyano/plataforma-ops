# Changelog — Provincia Ops

Todos los cambios importantes del proyecto se documentan acá.
Formato: [versión] — fecha — descripción

---

## [1.7.13] — 2026-08-12 — Repo público: rebrand + sanitización + updater con timeout/fallback (HU-44)

Preparación para abrir el repo. Se sacaron todas las referencias a la empresa y a personas concretas del código y de la doc pública. Además se resolvió el bug histórico del auto-updater que quedaba pegado en "Descargando…" (HU-44).

### Rebrand & sanitización
- **Módulo marketplace VTEX**: renombrado `sellers/baproar_client.py` → `sellers/marketplace_client.py`. Env vars `BAPROAR_APP_KEY/TOKEN` → `MARKETPLACE_APP_KEY/TOKEN`, y nueva `MARKETPLACE_URL` (antes hardcodeada).
- **Publisher/identifier Tauri**: `Provincia NET` → `Provincia Ops`, `com.provincianet.plataforma-ops` → `com.provinciaops.app` (⚠️ nuevo identifier — no upgrade automático desde v1.7.12; una vez que se instala v1.7.13, siguientes updates fluyen normal).
- **Logo**: sacado `logo_provincia_compras-02.svg`, agregado `logo_provincia_ops.svg` (placeholder simple tipo wordmark "PO Provincia Ops"). Actualizados `Login.jsx`, `Sidebar.jsx`, `Dashboard.jsx`.
- **Docs**: barrido en `README.md`, `ARCHITECTURE.md`, `RUNBOOK.md`, `API.md`, `MANUAL_USUARIO.md`, `RETRO.md`, `BACKLOG.md`, `CHANGELOG.md` para reemplazar "BaproAR"→"Marketplace" y "Provincia Compras/NET"→"Provincia Ops". Se removió el password default `Provincia.2026` del manual (ahora "la contraseña inicial que te dé el administrador").
- **Contraseña default de import** ahora se lee de env var `DEFAULT_INITIAL_PASSWORD` con fallback `ChangeMe.2026` (antes hardcoded `Provincia.2026`).

### Auto-updater (HU-44)
- **`useAutoUpdate.js`** reescrito:
  - `Promise.race` con timeout de 60s en `downloadAndInstall()`.
  - Barra de progreso en el toast (`Descargando v1.7.13… 34%`) usando `onEvent` (`Started`/`Progress`/`Finished`).
  - Fallback: si la descarga falla o timeout, toast con botón **"Abrir descarga"** que abre `github.com/.../releases/latest` en el browser (vía `@tauri-apps/plugin-opener`).
  - Sentry captura el fail con tag `reason: download-failed` + tamaño y bytes descargados para debug.
- Se agregó `@tauri-apps/plugin-opener` (dep JS del plugin que ya estaba en Cargo).

### Sin migración
No hay cambios de BD. El rename de env vars sí requiere actualizar Railway.

---

## [1.7.12] — 2026-08-12 — CRUD: soporte "Sin level" para reglas de 1 pago + fix chip Corporate T

Cambio operativo pedido por VTEX (nuevo manual de medios de pago): las tarjetas de **1 pago** aplican a cualquier tipo de tarjeta y por lo tanto no llevan `cardLevel`.

### Backend
- **`crud_medios/service.py`**:
  - `execute_create`: sentinel `"__no_level__"` en `accion.levels` (o levels vacío) genera una combinación por brand con `cardLevel: null`, y el nombre de la regla omite el segmento de level (ej: `PROMO_VISA_1` en vez de `PROMO_VISA_GOLD_1`).
  - `_match_rule` (filtros): `"__no_level__"` en `filtros.levels` matchea reglas con `cardLevel` vacío/ausente. Coherente con include/exclude.
  - `execute_update`: `cambios.level == "__no_level__"` limpia el `cardLevel` de la regla (envía `null` a VTEX).

### Frontend
- **`OperacionSelector.jsx`**: nuevo chip **"Sin level"** en la lista de levels.
  - En Crear: el chip está deshabilitado hasta que `cuotas === 1`. Con cualquier otro valor queda gris con tooltip.
  - `buildNamePreview` omite el segmento de level cuando el chip elegido es "Sin level".
- **`FiltrosPanel.jsx`**: chip **"Sin level"** disponible como filtro regular en Leer/Actualizar/Eliminar. Si no se selecciona, las reglas sin level ya no aparecen en resultados (antes se colaban).
- **`CrudMediosPage.jsx`**: nueva validación — `"Sin level"` solo se permite con cuotas = `1`; combinarlo con cuotas > 1 devuelve mensaje claro.
- **Chip renombrado**: `Corporate` → `Corporate T` (valor `"corporate t"`). El chip anterior no matcheaba porque el `cardLevel.name` real en VTEX es `"Corporate T"`.

### UX
- Modal "¿Qué hay de nuevo?" cargará las notas amigables de esta versión al primer login post-update.

### Sin migración
No hay cambios de schema. Las reglas existentes con `cardLevel` siguen funcionando igual.

---

## [1.7.11] — 2026-08-05 — Sprint 2 completo: audit_log, /auditoria, logs JSON, modal post-update, aviso WinRAR

Cierre del Sprint 2. Todas las HU cerradas menos el badge de "hay update" en sidebar (menor, va a futuro).

### Backend
- **HU-08** Nueva tabla `audit_log` (migración `e5f6a7b8c9d0`): id, timestamp, user_id, username, role, action, entity, entity_id, ip, request_id, payload JSONB, 5 índices.
- **HU-08** Helper `record_audit()` en `core/audit.py` — best-effort (no rompe la operación si falla), redacta campos sensibles (`password`, `app_key`, `app_token`, etc.) automáticamente.
- **HU-08** Aplicado en 15 acciones críticas: auth.login/logout, user.create/update/deactivate/reset_password, seller.create/update/deactivate/marketplace_toggle, sellers.export (con y sin creds), crud_medios.c/u/d (no-dry-run), evento.create/update/toggle_active/delete.
- **HU-09** Nuevo módulo `auditoria` con 3 endpoints (admin-only): `GET /api/auditoria` paginado con filtros (username, action, entity, entity_id, from_date, to_date), `GET /api/auditoria/actions` para autocompletado, `GET /api/auditoria/export.csv`.
- **HU-10** Nuevo `core/logging_config.py`:
  - `JsonFormatter` custom sin deps externas (~130 LOC).
  - `RequestIdMiddleware` inyecta `X-Request-ID` (uuid v4 o el que venga del cliente) por request. Expuesto en response header.
  - Context vars propagan `request_id` + `user_id` + `username` + `role` a todos los logs de la request.
  - `set_log_user()` invocado desde `get_current_user`.
  - Formato legible en `APP_ENV=development`, JSON puro en prod.
  - Silencia `sqlalchemy.engine` y `httpx` a WARNING en prod.
- `client_ip()` helper respeta `X-Forwarded-For` para IP real detrás del proxy Railway.

### Frontend
- **HU-09** Nueva página `/auditoria` (admin-only): tabla paginada 50/pág con filtros por usuario, acción (con autocompletado datalist), entidad, entity_id, rango de fechas. Fila expandible muestra payload JSON + request_id.
- **HU-09** Link "Auditoría" en sidebar (ícono ScrollText) visible solo para admin.
- **HU-09** Botón "Export CSV" con el filtro activo.
- **HU-37** Nuevo hook `useVersionAnnouncement()` — compara versión actual contra `localStorage.last_seen_version`. Si son distintas, muestra `WhatsNewModal` con las notas de `/api/updates/latest`.
- **HU-37** Nuevo componente `WhatsNewModal` — se abre una vez tras cada update. Primera instalación no dispara (persiste silenciosamente).
- **HU-41** Aviso amber en `ExportSellersModal` después de mostrar el password: "Windows Explorer no puede extraer este .zip, usá WinRAR o 7-Zip" con link a 7-Zip.

---

## [1.7.10] — 2026-08-05 — HOTFIX: auto-updater diagnosticable

**Fix crítico** para el bug histórico del auto-updater que fallaba silenciosamente sin avisar al usuario.

### Root cause encontrado
- El `useAutoUpdate` viejo tenía `try/catch` con solo `console.log`. Cualquier fallo del updater (red, firma, permisos, dialog) se silenciaba.
- No había forma de saber qué pasaba desde el lado del usuario.
- Además, `window.confirm()` puede tener comportamiento inconsistente en WebView2.

### Frontend
- **HU-40** Reescrito `useAutoUpdate.js`:
  - `Sentry.captureException(e)` con contexto (versión actual + endpoint) en el catch.
  - `Sentry.addBreadcrumb` en cada paso del check.
  - `console.info` con estado en cada paso — para debug con DevTools.
  - `toast.error()` visible al usuario si algo falla (nunca más silencioso).
  - `toast.success/info` en éxito o cuando no hay update.
  - Reemplazado `window.confirm()` por `ask()` del `@tauri-apps/plugin-dialog` — diálogo nativo, más confiable.
  - Nuevo hook `useManualUpdateCheck()` para trigger manual desde UI.
- **HU-40** Nuevo botón **"Buscar actualizaciones ahora"** en `/configuracion` (con ícono spinning). Muestra versión instalada.
- Capabilities Tauri: agregado `dialog:allow-ask` y `dialog:allow-message`.

### Infra
- `RELEASE_URL` en Railway apunta ahora a `provincia-ops-1.7.10-setup.exe` (nombre limpio, sin espacios/puntos raros).

---

## [1.7.9] — 2026-08-05 — Sprint 2 (parcial): CI, versión visible, normalización de fechas

Segunda entrega. Sprint 2 quedó particionado: se releasea lo que ya está listo. HU-08 (audit_log), HU-09 (/auditoria), HU-10 (logs JSON), HU-37 (modal post-update), HU-40 (updater diagnosticable) y HU-41 (aviso WinRAR en modal) quedan para v1.7.10.

### Backend
- **HU-42** Helper `normalize_fecha()` en `sellers/service.py`: normaliza `fecha_creacion` a `dd/mm/aaaa` (AR). Detecta formato US `m/d/aaaa` cuando el día es > 12, deja intactos los ambiguos (ambos ≤ 12) y la basura (doble `//`, letras). Aplicado en 5 puntos: `create_seller`, `update_seller`, `import_sellers_from_file`, `import_update_sellers` y `_build_sellers_xlsx` (export).
- Nuevo script one-time `backend/scripts/normalize_fecha_sellers.py` con modo `--apply` y dry-run. Reporta convertidos / ya normalizados / ambiguos / sin parsear.
- **HU-11 (fix a)** `alembic/env.py` registra ahora también `eventos.models` y `core/scheduler` — sin esto `alembic check` reportaba drift falso.
- **HU-11 (fix b)** Migración `c3d4e5f6a7b8_add_marketplace_seller_id` convertida a no-op. Duplicaba una columna que `b2c3d4e5f6a7` ya agrega; en prod había sido "aplicada" manualmente en `alembic_version`, pero desde cero lanzaba `DuplicateColumnError`.
- **HU-11 (fix c)** `Evento.created_at` con `nullable=False` para sincronizar el modelo con la migración `f1a2b3c4d5e6`.

### Frontend
- **HU-39** Badge de versión (`v1.7.9`) al pie del sidebar, debajo de "Cerrar sesión". Selectable con el mouse para pegar en reportes de soporte.
- `vite.config.js` lee la versión desde `frontend/src-tauri/tauri.conf.json` en build y la inyecta como `import.meta.env.VITE_APP_VERSION`. Source of truth única para la versión de la app.

### Infra
- **HU-11** Nuevo `.github/workflows/ci.yml`: en cada push y PR a `main` corre `alembic upgrade head`, `alembic check` y `pytest` (con Postgres 16 como service), + `npm ci` y `npm run build`. Bloquea merges con drift de modelo o tests rojos.

### Docs
- `MANUAL_USUARIO.md` sección Sellers: aviso explícito de que Windows Explorer no puede extraer el `.zip` con AES-256 (error `0x80004005`); indicar usar WinRAR o 7-Zip.

### Migración de datos post-deploy
Después de que Railway aplique v1.7.9, correr una vez contra la BD de prod:
```
cd backend && python -m scripts.normalize_fecha_sellers            # dry-run
cd backend && python -m scripts.normalize_fecha_sellers --apply    # persistir
```

---

## [1.7.8] — 2026-07-30 — Sprint 1: Estabilización crítica

Cierre del Sprint 1 (7 historias de usuario). Foco en tapar los críticos de la auditoría antes de sumar features nuevas.

### Backend
- **CORS restringido (HU-02)**: whitelist explícita de orígenes (Tauri Windows/macOS/Linux + dev Vite). `allow_credentials=False` mantenido. Header `X-Export-Password` expuesto para que axios pueda leerlo. Test de regresión en `test_cors.py`.
- **Startup sync no-fatal (HU-03)**: el sync marketplace ahora corre en background (`asyncio.create_task`), no bloquea el arranque de la app. Si Marketplace está caído, la app arranca igual y el sync falla silenciosamente. Timeout explícito `httpx.Timeout(10.0, connect=5.0)` en el cliente Marketplace.
- **APScheduler con lock DB (HU-04)**: nueva tabla `scheduler_locks` + context manager `job_lock()`. Estrategia atómica con `INSERT ... ON CONFLICT DO UPDATE ... WHERE locked_until < NOW()` de Postgres. Evita jobs duplicados si Railway escala a más de 1 réplica. TTL de 30 min protege contra crashes.
- **Export sellers con credenciales (HU-05)**: nuevo endpoint que devuelve `.zip` con AES-256 (via `pyzipper`). Password random one-shot generado en el server (`secrets.token_urlsafe(12)`), expuesto en header `X-Export-Password`. Solo admin. Log de auditoría (username + user_id + bytes) por cada export.
- **Sentry integrado (HU-06)**: nuevo módulo `core/observability.py`. `init_sentry()` gateado por env var `SENTRY_DSN`. Integraciones FastAPI/Starlette/SQLAlchemy. `set_sentry_user()` taggea cada error con el user autenticado.
- **Matriz de tests de permisos (HU-07)**: nuevo `tests/test_role_permissions.py` — 73 tests declarativos (18 endpoints × 4 roles + 1 no-auth). Regression suite completa para autorización.
- Nueva migración: `d4e5f6a7b8c9_create_scheduler_locks`.
- Nuevas dependencias: `pytest-asyncio>=1.0`, `pyzipper>=0.3.6`, `sentry-sdk[fastapi]>=2.0`.

### Frontend
- **Dashboard con rol correcto (HU-01)**: `Dashboard.jsx` usa `supervisor` (rename desde `analista_senior` en v1.7.2). Bloque `ultimo_operador` removido. Módulos Eventos y Configuración agregados al menú del dashboard. Usuarios abierto a admin + supervisor.
- **Modal de export con credenciales (HU-05)**: nuevo `ExportSellersModal.jsx` con radio "sin/con credenciales", warning + checkbox "confirmo el riesgo", password mostrado una sola vez con botón Copiar.
- **Sentry frontend (HU-06)**: nuevo `core/observability.js`. `initSentry()` gateado por `VITE_SENTRY_DSN`. `setSentryUser()` invocado en login/logout con tag de rol.
- Nueva dependencia: `@sentry/react ^10.63`.

### Infra
- Nuevos tests de regresión: `test_cors.py`, `test_lifespan.py`, `test_scheduler_lock.py`, `test_role_permissions.py`.
- Env vars nuevas en Railway: `SENTRY_DSN` (opt), `APP_VERSION` (⚠ obligatoria para updater).

### Docs
- Nuevo `ARCHITECTURE.md`: cómo funciona la app por dentro (flujos, encriptación, scheduler lock, updater), estructura de código, DB, decisiones de seguridad, testing.
- Nuevo `API.md`: referencia completa de endpoints REST con request/response, roles, códigos de error, ejemplos curl.
- Nuevo `RUNBOOK.md`: operar en producción — deploy paso a paso, rollback, migraciones, incidentes, escenarios de emergencia (pérdida de secrets críticos), checklist de release.
- Nueva metodología Scrum-lite formalizada: `DOD.md`, `SPRINTS.md`, `BACKLOG.md`, `RETRO.md`.
- Nueva carpeta `Provincia Ops - Documentación/` destinada a SharePoint (Manuales + Estado del proyecto + Retrospectivas + Técnico).

---

## [docs] — 2026-07-29 — Documentación técnica formal

### Documentación
- Nuevo `ARCHITECTURE.md`: cómo funciona la app por dentro (flujos de auth, encriptación Fernet, CRUD, marketplace sync, scheduler lock, updater Tauri), estructura de código, DB + migraciones, decisiones de seguridad, testing.
- Nuevo `API.md`: referencia completa de endpoints REST (health, auth, users, sellers, crud-medios, eventos, updates) con request/response, roles, códigos de error y ejemplos curl.
- Nuevo `RUNBOOK.md`: operar en producción — deploy paso a paso backend + `.exe`, rollback, migraciones Alembic, incidentes típicos, escenarios de emergencia (pérdida de `FERNET_KEY` / `JWT_SECRET_KEY` / `tauri-signing.key` / DB), checklist de release.
- `README.md`: nueva sección "Documentación" con tabla que enlaza a todos los `.md`.
- Nueva carpeta `Provincia Ops - Documentación/` en la raíz con la estructura destinada a SharePoint (Manuales / Estado del proyecto / Retrospectivas).

---

## [1.7.7] — 2026-07-01 — Sync de marketplace Marketplace en módulo Sellers

### Backend
- Nuevos campos en tabla `sellers`: `marketplace_activo` (bool nullable) y `marketplace_sync_at` (datetime nullable).
- Nuevo cliente `Marketplace_client.py`: llama a `GET /api/seller-register/pvt/sellers` y `PATCH /api/seller-register/pvt/sellers/{id}` usando credenciales del marketplace Marketplace.
- Credenciales Marketplace como env vars (`Marketplace_APP_KEY`, `Marketplace_APP_TOKEN`) — no se guardan en BD.
- `POST /api/sellers/sync-marketplace`: sincroniza estado activo/inactivo de todos los sellers contra Marketplace. Solo actualiza la BD si la respuesta es 200 y los datos son válidos.
- `POST /api/sellers/{id}/marketplace-toggle`: activa o desactiva un seller en Marketplace. Solo modifica la BD si Marketplace confirma con 200.
- Sync automático al iniciar la app y cada 24 hs via APScheduler.

### Frontend
- Columna "Marketplace" en la tabla de sellers: muestra el estado Marketplace (Activo/Inactivo/—). Clickeable para toggle directo desde la tabla (admin/supervisor).
- Botón "Sync Marketplace" en el header con spinner y hora de última sincronización.

---

## [1.7.6] — 2026-07-01 — Id Ecommerce en CRUD + permisos C/U/D por rol

### Backend
- `CrudRowOut` incluye ahora el campo `id_ecommerce` (tomado del seller). Propagado en todas las operaciones: R, C, U, D — dry_run, éxito y error.

### Frontend
- CRUD Medios de Pago: columna "Id Ecommerce" agregada en la tabla de resultados y en el export Excel.
- Botones C (Crear), U (Actualizar) y D (Eliminar) deshabilitados visualmente para roles sin permisos de escritura (analista, viewer). El botón R (Leer) sigue disponible para todos.
- `WRITE_ROLES` ampliado a `["admin", "supervisor"]` — supervisores pueden ejecutar operaciones de escritura.

---

## [1.7.5] — 2026-06-30 — Firma de actualizaciones automáticas

### Desktop
- Updater firmado con Ed25519: cada actualización automática es verificada criptográficamente antes de instalarse.
- Pubkey embebida en el binario. A partir de esta versión los clientes verifican la firma del instalador antes de aplicar cualquier update.
- `GET /api/updates/latest` ahora incluye el campo `signature` (leído de env var `RELEASE_SIGNATURE`).
- **Requiere re-descarga manual una única vez**. Desde v1.7.5 en adelante las actualizaciones son automáticas y verificadas.

---

## [1.7.4] — 2026-06-30 — Rate limiting + tests unitarios

### Backend
- Rate limiting en `POST /auth/login`: máximo 10 requests/minuto por IP (slowapi). Retorna HTTP 429 al superar el límite.
- Limiter extraído a `app/core/limiter.py` para evitar import circular entre `main.py` y `auth/router.py`.
- 38 tests unitarios sin dependencia de BD ni VTEX (`backend/tests/test_crud_service.py`):
  - `_normalize_to_ar`: 7 casos — sufijo Z, sin TZ, UTC midnight, offset explícito, string inválido
  - `matches_filters`: 23 casos — estado, nombre, brand, level include/exclude, cuotas exacta/contiene, fechas, connector
  - `check_cuota_group`: 8 casos — Ok, No configurado, A corregir por cuotas/firma/deshabilitada

---

## [1.7.3] — 2026-06-30 — Hardening de seguridad

### Backend
- Eliminado endpoint `POST /auth/bootstrap` que tenía credenciales admin hardcodeadas en el código fuente (repo público). Usar `seed.py` para el seed inicial.
- CORS restringido de `allow_origins=["*"]` a `tauri://localhost` y `http://localhost:5173`. Ya no acepta requests de orígenes arbitrarios.
- `vtex_client.py`: cliente `httpx.AsyncClient` ahora es compartido a nivel módulo en lugar de crear una instancia por request. Se cierra correctamente en el lifespan de la app.

### Frontend
- CSP habilitado en Tauri (antes `"csp": null`): `default-src 'self'`, scripts solo `'self'`, `connect-src` restringido al backend de Railway.
- Corregidos guards de ruta en `App.jsx` que no coincidían con los permisos del backend:
  - `/users` y `/eventos`: abiertos a `admin` + `supervisor` (antes solo `admin`)
  - `/sellers`: abierto a `admin` + `supervisor` + `analista` (antes solo `admin`)

### Deploy
- `deploy/setup-server.sh`: removido curl de verificación que tenía una contraseña en texto claro en el código fuente del repo.

---

## [1.7.2] — 2026-06-05 — Rediseño de roles: supervisor reemplaza analista_senior

### Backend
- Rol `analista_senior` renombrado a `supervisor` en el enum PostgreSQL (migración Alembic).
- Permisos reorganizados por módulo según nueva jerarquía `admin > supervisor > analista > viewer`.
- Sellers: crear/editar/desactivar ahora permitido a admin + supervisor + analista. Export/import solo admin + supervisor.
- CRUD: C/U/D real restringido a **solo admin**. Historial completo visible a admin + supervisor.
- Usuarios: listar y exportar permitido a admin + supervisor.
- Eventos: gestión completa (crear/editar/toggle/eliminar) permitida a admin + supervisor.
- Stats: `ultimo_operador` eliminado. `total_usuarios_activos` visible a admin + supervisor.

### Frontend
- Sidebar: Sellers visible a admin + supervisor + analista; Usuarios y Eventos a admin + supervisor.
- Sellers: botones de acción actualizados según rol.
- Usuarios: badges y select de rol actualizados (`supervisor` en lugar de `analista_senior`).
- CRUD: `WRITE_ROLES` ahora solo `admin`.

---

## [1.7.1] — 2026-06-05 — Export/import sellers con credenciales VTEX (solo admin)

### Backend
- `GET /sellers/export` ahora restringido a **solo admin** (antes: admin + analista_senior).
- El Excel exportado incluye columnas **App Key** y **App Token** desencriptadas.
- `POST /sellers/import-update`: si el Excel trae `App Key` / `App Token`, las encripta y actualiza en BD (tanto para sellers existentes como para sellers nuevos).

### Frontend
- Botón "Exportar Excel" en Sellers visible solo para admin.

---

## [1.7.0] — 2026-06-05 — Filtro por analista en scope selector (todo el CRUD)

### Frontend
- Nuevo modo **"Por analista"** en el selector de scope del CRUD Medios de Pago (aplica a todas las operaciones: C/R/U/D).
- Al seleccionar un analista, el scope se limita automáticamente a los sellers asignados a ese analista.
- El dropdown muestra solo analistas con sellers activos asignados, con el conteo de sellers de cada uno.
- Se muestran chips de preview con los primeros 8 sellers del analista seleccionado (y "+N más" si hay más).

---

## [1.6.5] — 2026-06-01 — Fix: restaurar export Excel completo con colores y gráfico

### Backend
- Endpoint `POST /crud-medios/export` ahora acepta `grupos_seleccionados` y `evento_resultados`.
- Hoja **DASHBOARD_VENDEDORES**: muestra solo los grupos de cuotas activados + columnas de eventos con colores (Ok=verde, A corregir=rojo, No configurado=gris).
- Hojas **RESUMEN** (gráfico de torta + KPIs), **PAGOS_CONSOLIDADO** y **ERRORES** intactas.

### Frontend
- "Exportar Excel completo" vuelve a usar el export por backend (openpyxl) en lugar del export frontend básico sin colores ni gráfico.
- Pasa `grupos_seleccionados` y resultados de eventos al backend para que el Excel refleje exactamente lo que el usuario configuró.

---

## [1.6.4] — 2026-06-01 — Fix: manejo de errores en export Excel

### Frontend
- Export Excel: agrega fallback `rows ?? []` para evitar crash cuando rows es undefined.
- Error en export ahora muestra el mensaje real en el toast en lugar de texto genérico.

---

## [1.6.3] — 2026-06-01 — Fix: restaurar botón "Exportar Excel completo"

### Frontend
- Restaurado el label "Exportar Excel completo" que había quedado como solo "Excel" en v1.6.2.
- El botón genera el mismo archivo multi-hoja: Dashboard (grupos + eventos + motivos) + Detalle.

---

## [1.6.2] — 2026-06-01 — Fix: export Excel Dashboard respeta grupos y eventos seleccionados

### Frontend
- **Un único botón Excel** reemplaza los dos anteriores (backend-export y DashboardTable-export)
- El export genera un archivo multi-hoja:
  - **Dashboard**: columnas exactas según grupos de cuotas activados + columnas de eventos seleccionados + columna Motivos
  - **Detalle**: todas las reglas procesadas con seller, brand, level, estado, resultado
- El botón queda deshabilitado mientras carga la validación de eventos para evitar exportar datos incompletos

---

## [1.6.1] — 2026-05-29 — Fix: eventos próximos visibles en CRUD Read

### Backend
- `GET /api/eventos/vigentes`: ahora devuelve eventos activos vigentes **y próximos** (`fecha_fin >= now`, sin requerir que ya hayan comenzado). Permite seleccionar un evento futuro para validar antes de que empiece.

### Frontend
- CRUD Read — panel Validación: los chips de eventos ahora muestran también eventos próximos con badge `PRÓX` (azul) para distinguirlos de los ya vigentes.
- Sección renombrada de "Eventos vigentes a validar" → "Eventos a validar"

---

## [1.6.0] — 2026-05-29 — Módulo Eventos + validación integrada en CRUD Read

### Backend
- Nuevo módulo `eventos`: CRUD completo de eventos planificados (POST/GET/PUT/PATCH/DELETE)
- Modelo BD: tabla `eventos` con nombre, fechas UTC, cuotas requeridas, scope, is_active, creado_por
- Migración Alembic: `f1a2b3c4d5e6_create_eventos`
- Endpoint `GET /api/eventos/vigentes`: devuelve eventos activos cuya ventana cubre el momento actual (accesible a cualquier usuario autenticado)

### Frontend — Módulo Eventos (solo admin)
- Reemplaza la antigua página "Validación de Eventos"
- **Tab "Administrar eventos"** (default): tabla de todos los eventos con badge VIGENTE, acciones editar / activar-desactivar / eliminar; modal de edición completo
- **Tab "Crear evento"**: formulario simple (nombre, cuotas preset, fechas ART, scope opcional) → guarda directamente en BD sin validar, redirige a Administrar

### Frontend — CRUD Medios de Pago: Read mejorado
- Nuevo panel **"Validación"** visible solo cuando operacion=Read
- **Grupos de cuotas**: chips seleccionables (1 pago / 6c / 9c / 12c / 18c / 24c) — la tabla Dashboard muestra solo las columnas activadas
- **Eventos vigentes**: chips por cada evento activo hoy; al seleccionar uno y ejecutar el Read, se valida ese evento por seller y aparece como columna adicional en el Dashboard (Ok / ✗ / —)
- Las fechas del evento se convierten correctamente de UTC a ART antes de llamar al validador

---

## [1.5.1] — 2026-05-29 — Fix light mode completo

### Frontend
- Migración completa a tokens semánticos en todos los componentes que habían quedado fuera de v1.5.0
- Badges de estado (Dashboard, Users, Sellers): dual `dark:`/light — light usa `bg-*-50 text-*-700`, dark mantiene el look neon
- CRUD OperacionSelector: botones C/R/U/D legibles en light mode, neon preservado en dark; chips de firmas/levels y aviso destructivo corregidos
- Validación de Eventos (ValidacionEventosPage, EventoConfigPanel, EventoResultsTable): migración completa de `slate-*` hardcodeados a tokens semánticos
- DashboardTable (CRUD Read): ídem, celdas de estado con variantes dual dark:/light
- `checkbox.jsx` y `tabs.jsx`: migrados a tokens (`border-input`, `bg-background`, `bg-muted`, `data-[state=checked]:bg-primary`)
- Botón "Validar evento" migrado a `bg-primary` (verde marca) en lugar de indigo hardcodeado

---

## [1.5.0] — 2026-05-29 — Brand redesign completo

### Frontend
- Tipografía: Encode Sans (fuente oficial Provincia Ops), pesos 300–700 desde `/public/fonts/`
- Colores de marca: Verde `#279D2E` como `--primary`, Cyan `#25B4BD`, Gris `#3C3C3B`
- Dark/Light mode: ThemeContext con localStorage, toggle en ConfiguracionPage
- Logo SVG oficial `logo_provincia_compras-02.svg` en sidebar y login
- Sistema de tokens semánticos completo: 22 archivos migrados de `slate-*` hardcodeados a tokens CSS
- Ruta `/configuracion`: toggle dark/light + cambio de contraseña (unificado desde sidebar)

---

## [1.4.6] — 2026-05-29 — Export Excel completo en Validación de Eventos

### CRUD / Validación de Eventos
- Nuevo: Export Excel del evento con 4 hojas: RESUMEN, VALIDACION_EVENTO, PAGOS_CONSOLIDADO, ERRORES
- PAGOS_CONSOLIDADO incluye detalle de todas las reglas procesadas por seller

---

## [1.4.5] — 2026-05-29 — Fix validación eventos

### Backend
- Corregido: cuotas superiores al máximo del evento ahora se marcan como "A corregir" (antes se ignoraban)

---

## [1.4.4] — 2026-05-28 — Fix presets de cuotas

### Backend
- Corregido: reglas con solo cuotas 1, 3 o 6 se excluyen correctamente de la validación de eventos
- Corregido: presets de cuotas corregidos (9→{9}, 12→{9,12}, 18→{9,12,18}, 24→{9,12,18,24})

---

## [1.4.0] — 2026-05-28 — Validación de Eventos + Dashboard Read enriquecido

### Nuevo módulo: Validación de Eventos
- Verifica que sellers tengan reglas _LC con cuotas altas (9+) para un evento dado
- Parámetros: nombre, fechas inicio/fin (ART), cuotas requeridas (preset)
- Estados: Ok / A corregir / No configurado, con motivos detallados
- Export Excel del resultado

### CRUD Medios de Pago — Read enriquecido
- Dashboard de grupos por seller (1 pago, 6c, 9c, 12c, 18c, 24c)
- Estados: Ok (vigente) / Ok (programado) / Ok (inactiva) / A corregir / No configurado
- Filtros por estado con chips, expansión de motivos por fila

---

## [1.3.3] — 2026-05-28 — Fix CREATE connector

### Backend
- Corregido: CREATE fallaba con 400 "Connector object can not be null"
- Fix: extraer connector de las reglas existentes del seller antes de crear nuevas

---

## [1.3.2] — 2026-05-27 — Create rediseño completo + nombres español + filtros bloqueados

### CRUD Medios de Pago
- Nuevo: Create ahora genera múltiples reglas por combinación de firma × level (N firmas × M levels por seller)
- Nuevo: Formulario Create con chips de firmas (Visa/Mastercard/Electron), chips de levels, cuotas como texto libre y preview de nombres generados
- Nuevo: Fechas de Create con hora (fecha+hora hora local AR convertida a UTC)
- Nuevo: Filtros bloqueados (pointer-events-none) con badge "Los filtros aplican solo a Leer" cuando se selecciona C/U/D
- Mejorado: Nombres de operaciones en español (Crear/Leer/Actualizar/Eliminar)
- Mejorado: Update usa chips de level (string) y cuotas como texto libre separado por comas
- Corregido: Filtro de levels ahora usa cardLevel.name (string) en lugar de valor numérico
- Corregido: Cuotas exacta ahora requiere igualdad de set (alineado con script v6)
- Corregido: Filtro de horario ahora soporta "include" (exacto) y "exclude" solamente
- Corregido: Filtro de brands ahora usa paymentSystem.id (alineado con script v6)
- Corregido: execute_update ahora descifra credenciales correctamente y construye cuerpo VTEX alineado con script v6

---

## [1.3.1] — 2026-05-26 — Rediseño filtros CRUD

### CRUD Medios de Pago
- Rediseñado: orden de operaciones ahora es Create → Read → Update → Delete
- Mejorado: operación seleccionada resaltada, las demás opacadas
- Mejorado: Brand con todos seleccionados por defecto
- Mejorado: Levels como chips seleccionables con valores reales (sin texto libre)
- Mejorado: Conector como select (Payway, Decidir, Todos)
- Mejorado: Cuotas con campo más grande y claro (acepta múltiples valores separados por coma)
- Mejorado: Horario con opciones Exacta/Incluye/Excluye
- Mejorado: Filtros posicionados debajo del selector de operación

---

## [1.3.0] — 2026-05-25 — Exportar/Importar Sellers y Usuarios

### Sellers
- Nuevo: Exportar tabla completa a Excel (sin credenciales) — disponible para admin y analista_senior
- Nuevo: Importar Excel para actualizaciones masivas (actualiza existentes, crea nuevos con credenciales vacías)
- Nuevo: Seller ID editable en formulario de edición

### Usuarios
- Nuevo: Exportar lista de usuarios a Excel (sin contraseñas)
- Nuevo: Importar usuarios desde Excel (actualiza existentes, crea nuevos con contraseña default — ver CREDENTIALS.md)

---

## [1.2.1] — 2026-05-25 — Cambio de contraseña propio + filtros CRUD + limpieza historial

### Usuarios
- Nuevo: Botón "Cambiar contraseña" en el sidebar (disponible para todos los roles)
- Nuevo: Modal con validación de contraseña actual, nueva y confirmación

### CRUD Medios de Pago
- Nuevo: Filtros por columna en tabla de resultados (Seller, Brand, Level, Estado, Resultado)
- Nuevo: Botón "Limpiar filtros" cuando hay filtros activos

### Backend
- Nuevo: Endpoint POST /api/users/me/change-password (autenticado, cualquier rol)
- Nuevo: Limpieza automática de historial al iniciar el servidor (operaciones con más de 90 días)
- Nuevo: Endpoint POST /api/crud-medios/cleanup (solo admin)

---

## [1.2.0] — 2026-05-25 — Mejoras formulario Sellers

### Sellers
- Nuevo: Campo Analista como select de usuarios activos de la plataforma
- Nuevo: Campo Fecha de creación con DatePicker y calendario
- Nuevo: Campo Integración como select con lista predefinida + opción crear nueva
- Nuevo: Campo Especificación de integración (solo para Manual/Propia) con opciones dinámicas + crear nueva
- Nuevo: Tabla integracion_specs en BD para almacenar especificaciones personalizadas

---

## [1.1.1] — 2026-05-25 — Correcciones post-release

### CRUD Medios de Pago
- Corregido: exportar Excel ahora abre diálogo nativo del sistema para elegir dónde guardar
- Corregido: tabla de resultados con scroll interno fijo (no requiere bajar al final de la página)

### Sellers
- Corregido: tabla con scroll interno fijo vertical y horizontal — funciona correctamente con 400+ sellers
- Corregido: scroll lateral accesible sin bajar hasta el final de la lista

### Usuarios
- Corregido: tabla con scroll interno fijo por consistencia
- Nuevo: Auto-update — el EXE chequea actualizaciones al abrirse y permite instalarlas sin reinstalar manualmente (requiere última reinstalación manual de este EXE)

---

## [1.1.0] — 2026-05-25 — Mejoras backlog v1

### CRUD Medios de Pago
- Corregido: Brand y Level ahora se muestran correctamente en tabla de resultados
- Corregido: Exportar ahora genera Excel (.xlsx) y descarga directamente
- Mejorado: Toggle Dry Run se oculta cuando la operación es Read

### Sellers
- Nuevo: Buscador global en tabla de sellers
- Nuevo: Filtros por columna (Estado Keys, Vendiendo, Estado, Analista)
- Nuevo: Scroll horizontal visible en tabla
- Nuevo: Campo Seller ID visible y editable en formulario
- Mejorado: Aclaración de confidencialidad en campos App Key y App Token

### Dashboard
- Nuevo: Métricas de sellers (activos, inactivos, keys vencidas) para admin y analista senior
- Nuevo: Total de operaciones del día para admin y analista senior
- Nuevo: Total de usuarios activos para admin
- Nuevo: Últimas 5 operaciones del usuario logueado
- Nuevo: Accesos rápidos a módulos según rol

### Correcciones post-release
- Exportar Excel: ahora abre diálogo nativo para elegir dónde guardar (requiere rebuild del EXE)
- Sellers: tabla con scroll interno fijo — no requiere bajar hasta el final de la lista para el scroll lateral
- Usuarios y CRUD resultados: misma mejora de tabla fija aplicada por consistencia

---

## [1.0.0] — 2026-05-25 — Release inicial

### Infraestructura
- Scaffold del proyecto: FastAPI + React + Vite + Tailwind + shadcn + Tauri 2
- PostgreSQL con SQLAlchemy async + Alembic para migraciones
- Deploy backend en Railway
- EXE instalable para Windows generado con Tauri 2
- SSH hardened en VM Ubuntu (clave ED25519, puerto 2222, fail2ban)
- Repositorio en GitHub

### Autenticación
- Login con JWT (access token 8hs + refresh token 7 días)
- Roles: admin, analista_senior, analista, viewer
- Refresh token con rotación, logout con revocación en BD
- Rutas privadas en frontend según rol

### Módulo Usuarios
- ABM de usuarios (solo admin)
- Reset de password sin requerir la anterior
- Badges de rol por color
- Protección: admin no puede desactivarse a sí mismo

### Módulo Sellers
- ABM de sellers con credenciales VTEX encriptadas con Fernet
- Importación masiva desde Excel (.xlsx)
- Botón "Probar conexión" que valida credenciales contra VTEX sin exponerlas
- Las credenciales nunca se devuelven al frontend (write-only)

### Módulo CRUD Medios de Pago
- Operaciones R/C/U/D masivas sobre reglas de pago VTEX
- Scope configurable: todos los sellers, uno específico, lista
- Filtros: brand, level (incluir/excluir), estado, nombre, conector, cuotas (exactas/contiene), fecha (exacta/rango), horario (incluir/excluir, con normalización UTC/AR automática)
- Modo Dry Run para simular sin ejecutar
- Ejecución paralela con ThreadPoolExecutor
- Tabla de resultados con búsqueda y paginación
- Historial de operaciones con auditoría completa por regla

### Dashboard
- Saludo con nombre y rol del usuario logueado
- Placeholder (mejoras pendientes en backlog)

---

## Backlog activo → ver BACKLOG.md
