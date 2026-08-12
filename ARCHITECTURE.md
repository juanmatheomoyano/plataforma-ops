# Arquitectura — Provincia Ops

Documento técnico. Cómo está armada la app por dentro, cómo fluyen los datos, qué decisiones se tomaron y por qué. Para usuarios finales ver [MANUAL_USUARIO.md](MANUAL_USUARIO.md). Para operar en producción ver [RUNBOOK.md](RUNBOOK.md). Para referencia de endpoints ver [API.md](API.md).

---

## 1. Vista de 10.000 pies

Provincia Ops es una app cliente-servidor:

- **Cliente**: aplicación desktop Windows empaquetada con **Tauri 2**. Dentro corre una SPA hecha con **React 19 + Vite 8**. La UI es 100% web; Tauri solo aporta el shell nativo (ventana, updater, WebView2).
- **Servidor**: API REST en **FastAPI** (Python 3.11+) sobre **PostgreSQL** (async con SQLAlchemy 2 + asyncpg). Hosteado en **Railway**.
- **Terceros**: la app consume dos APIs VTEX (reglas de pago por seller y el marketplace Marketplace).

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Windows desktop             │  HTTPS  │  Railway (backend)           │
│  ┌────────────────────────┐  │◄────────►  ┌──────────────────────┐   │
│  │ Tauri 2 shell          │  │ JWT     │  │ FastAPI + Uvicorn    │   │
│  │  └─ WebView2 (Edge)    │  │         │  │  └─ SQLAlchemy async │   │
│  │      └─ React 19 SPA   │  │         │  └──────────┬───────────┘   │
│  └────────────────────────┘  │         │             │               │
│      ▲ auto-updater          │         │  ┌──────────▼───────────┐   │
└──────┼───────────────────────┘         │  │ Postgres (Railway)   │   │
       │                                  │  └──────────────────────┘   │
       │ latest.json + .exe firmado       │             │               │
       │                                  │  ┌──────────▼───────────┐   │
GitHub Releases                           │  │ APScheduler (in-proc)│   │
                                          │  │  + DB lock           │   │
                                          │  └──────────┬───────────┘   │
                                          └─────────────┼───────────────┘
                                                        │ HTTPS
                                          ┌─────────────▼───────────────┐
                                          │ VTEX APIs                   │
                                          │  · rules por seller         │
                                          │  · marketplace Marketplace      │
                                          └─────────────────────────────┘
```

### Puntos clave

- **Sin backend-for-frontend**: React llama directo a FastAPI (`/api/*`).
- **Sin estado en el cliente**: los tokens JWT viven **solo en memoria** del renderer (no en localStorage, no en cookies). Cerrar la ventana desloguea.
- **Todo el trabajo pesado corre en el server**: exports Excel, llamadas paralelas a VTEX, encriptación de credenciales, jobs programados.
- **Los sellers guardan sus App Key / App Token de VTEX en la DB, encriptados con Fernet**. El backend los desencripta on-the-fly cuando necesita llamar a VTEX; nunca los devuelve al frontend.

---

## 2. Stack técnico

### Backend

| Componente | Versión | Rol |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | latest | Framework HTTP |
| Uvicorn | latest | Servidor ASGI |
| SQLAlchemy 2 | latest (async) | ORM |
| asyncpg | latest | Driver Postgres async |
| Alembic | latest | Migraciones |
| Pydantic v2 | via `pydantic-settings` | Validación + config |
| python-jose | latest | JWT encode/decode |
| bcrypt | latest | Hash de contraseñas |
| cryptography | latest | Fernet (encripta App Key/Token) |
| httpx | latest | Cliente HTTP async (VTEX/Marketplace) |
| openpyxl | latest | Excel read/write |
| pyzipper | ≥0.3.6 | Zip AES-256 (export con credenciales) |
| APScheduler | <4.0 | Jobs programados in-process |
| slowapi | latest | Rate limiting |
| sentry-sdk[fastapi] | ≥2.0 | Error tracking |
| pytest-asyncio | ≥1.0 | Tests async |

### Frontend

| Componente | Versión | Rol |
|---|---|---|
| React | 19 | UI |
| Vite | 8 | Bundler + dev server |
| Tauri | 2 | Shell nativo + updater |
| react-router-dom | 7 | Routing SPA |
| axios | latest | HTTP client |
| @tanstack/react-query | opcional | (uso puntual en algunas páginas) |
| tailwindcss | 3 | Estilos |
| shadcn/ui | — | Componentes base copiados en `src/components/ui/` |
| sonner | latest | Toasts |
| lucide-react | latest | Iconos |
| @sentry/react | ^10 | Error tracking browser |
| @tauri-apps/plugin-updater | 2 | Chequeo de updates |
| @tauri-apps/plugin-process | 2 | Relaunch tras update |

### Infra

- **Hosting backend + DB**: Railway (proyecto `plataforma-ops`, ver [CREDENTIALS.md](CREDENTIALS.md) para IDs).
- **Distribución del .exe**: GitHub Releases (repo del proyecto — ver CREDENTIALS.md).
- **Observabilidad**: Sentry (org `provincia-ops`, un proyecto por lado).
- **Firma de instaladores**: rsign (formato nativo de Tauri v2, no minisign). Ver `CREDENTIALS.md → Tauri Updater`.

---

## 3. Estructura del código

### Backend — `backend/app/`

```
app/
├── main.py              # FastAPI app, CORS, lifespan (jobs + shutdown), routers
├── core/
│   ├── config.py        # Settings (Pydantic BaseSettings, lee env vars)
│   ├── database.py      # engine async, AsyncSessionLocal, Base, get_db
│   ├── security.py      # bcrypt, JWT create/decode, Fernet encrypt/decrypt
│   ├── dependencies.py  # get_current_user, require_role(...)
│   ├── limiter.py       # slowapi limiter (para /auth/login)
│   ├── observability.py # init_sentry, set_sentry_user
│   └── scheduler.py     # SchedulerLock model + job_lock context manager
└── modules/
    ├── auth/            # Login, refresh, logout, /me
    ├── users/           # CRUD usuarios, cambio de password, import/export
    ├── sellers/         # CRUD sellers, sync marketplace, test-connection, export cifrado
    ├── crud_medios/     # Ejecución CRUD de reglas VTEX (el módulo más complejo)
    ├── eventos/         # Definición de eventos comerciales (fechas + cuotas)
    └── updates/         # /api/updates/latest (Tauri) + /updates/download (HTML público)
```

Cada módulo tiene la misma estructura:
- `models.py` — SQLAlchemy models
- `schemas.py` — Pydantic models (request/response)
- `service.py` — lógica de negocio (funciones async con `db: AsyncSession`)
- `router.py` — endpoints FastAPI, delgado, delega a service

### Frontend — `frontend/src/`

```
src/
├── main.jsx             # ReactDOM.render + initSentry
├── App.jsx              # Router + AuthProvider + ThemeProvider + RoleRoute
├── index.css            # Tailwind base
├── core/
│   ├── api/client.js    # axios instance con interceptors (Bearer + refresh 401)
│   ├── auth/            # AuthContext, useAuth, PrivateRoute
│   ├── theme/           # ThemeContext (dark/light)
│   ├── layout/          # Shell (header + sidebar + <Outlet>)
│   ├── hooks/useAutoUpdate.js
│   ├── observability.js # initSentry, setSentryUser
│   └── components/      # ChangePasswordModal, etc.
├── components/ui/       # shadcn/ui (button, input, dialog, ...)
├── lib/utils.js         # cn() helper de Tailwind
├── pages/               # Dashboard, Login, ConfiguracionPage
└── modules/
    ├── users/           # UsersPage + modales
    ├── sellers/         # SellersPage + form/export modales
    ├── crud_medios/     # CrudMediosPage + panels/tables
    └── eventos/         # EventosPage + admin/crear/validar panels
```

---

## 4. Flujos de datos

### 4.1 Login y sesión

```
1. Usuario ingresa username + password en /login
   → POST /api/auth/login {username, password}
2. Backend:
   - Rate-limit (10/min via slowapi)
   - Busca User por username
   - Verifica hash bcrypt (verify_password)
   - Genera access_token (HS256, exp 30 min) y refresh_token (exp 30 días)
   - Guarda hash del refresh en tabla refresh_tokens
   - Actualiza last_login
   - Responde {access_token, refresh_token, user: {...}}
3. Frontend:
   - setTokens(access, refresh) — SOLO en memoria (module state), no persiste
   - setUser(data.user)
   - setSentryUser(data.user) → tag {id, username, role} en Sentry
4. Cada request subsecuente:
   - axios interceptor agrega Authorization: Bearer <access_token>
5. Si un request devuelve 401:
   - interceptor.response llama POST /api/auth/refresh con refresh_token
   - Si refresh OK: guarda nuevo access, reintenta request original (una sola vez)
   - Si refresh falla: clearTokens() + redirect a /login
   - Requests concurrentes que fallan mientras se refresca se encolan y se reintentan
6. Logout:
   - POST /api/auth/logout revoca el refresh en DB
   - clearTokens() + setUser(null)
```

**Por qué tokens en memoria y no localStorage**: la app corre en un WebView2 con CSP restrictiva y sin extensiones. El vector típico de XSS-roba-token en un browser no aplica igual, pero mantenerlos en memoria es la opción más segura y evita persistencia cross-session accidental. Cerrar la app pide re-login (consciente).

### 4.2 Autorización por rol

Roles (enum `UserRole` en `auth/models.py`):

| Rol | Alcance típico |
|---|---|
| `admin` | Todo. Único que puede crear/borrar usuarios, ejecutar C/U/D en VTEX no-dry-run, exportar sellers con credenciales. |
| `supervisor` | Todo lo que hace admin salvo user management, escribir en VTEX y exportar credenciales. Ve todo el historial de operaciones. |
| `analista` | Puede leer VTEX, crear/editar sellers, ejecutar dry-runs. Ve solo su propio historial. |
| `viewer` | Solo lectura. Usa CRUD y Configuración. |

Se enforcean en dos capas:
- **Backend**: `Depends(require_role([...]))` en el router, o check explícito en handlers con lógica más fina (ej. `crud_medios/router.py:47` — solo admin puede escribir a VTEX no-dry-run, pero cualquier rol puede leer).
- **Frontend**: `<RoleRoute roles={[...]}>` en `App.jsx` bloquea la navegación por URL; el sidebar oculta ítems no permitidos. **El backend es la fuente de verdad**; el frontend solo mejora la UX.

Existe una matriz declarativa de tests en `backend/tests/test_role_permissions.py` que verifica esto en cada release.

### 4.3 Encriptación de credenciales VTEX (Fernet)

Cada `Seller` tiene un `app_key` y `app_token` (credenciales VTEX del seller). Nunca deben salir en JSON al frontend.

```
Escritura (create/update seller):
  frontend envía {app_key, app_token, ...}
  → service.create_seller: encrypt(app_key) → app_key_enc guardado en DB
  Igual para app_token

Lectura interna (backend hace request a VTEX en nombre del seller):
  get_decrypted_credentials(seller) → (app_key, app_token) en memoria
  Se pasan como headers X-VTEX-API-AppKey / X-VTEX-API-AppToken
  Nunca se serializan en respuesta

Export CON credenciales (solo admin):
  export_sellers_encrypted_zip(db):
    - Genera xlsx con credenciales en claro (en memoria)
    - Genera password random (secrets.token_urlsafe(12))
    - Empaqueta el xlsx en un .zip con AES-256 (pyzipper)
    - Devuelve (bytes, password)
  Router responde el .zip como StreamingResponse + header X-Export-Password
  Frontend muestra el password UNA vez y ofrece Copiar
  Se loguea WARNING con username + user_id + bytes
```

**`FERNET_KEY` es un secret crítico**. Si se pierde: todas las App Key/Token en DB quedan inutilizables (hay que re-cargar los sellers). Está en Railway env vars y respaldada en `CREDENTIALS.md` (local, gitignored).

### 4.4 CRUD Medios de Pago — el módulo core

Es el módulo más grande del backend (~1200 líneas de service). Ejecuta operaciones masivas sobre las **payment rules** de VTEX en muchos sellers a la vez.

**Modelo mental**: cada seller VTEX tiene un conjunto de "reglas de pago" (payment conditions). Una regla combina brand (Visa/Master/Electron), cardLevel (Classic/Gold/Platinum/…), cuotas disponibles (`[1,3,6,9]`), conector (`payway`, `promissory`), fechas de vigencia, etc. El módulo permite:

1. **Read (R)**: listar reglas de N sellers que matcheen filtros.
2. **Create (C)**: crear reglas con determinada combinación de brand × level × cuotas.
3. **Update (U)**: patchear campos en las reglas que matcheen los filtros.
4. **Delete (D)**: borrar reglas que matcheen.

Todas las operaciones aceptan `dry_run=true` — computa qué haría sin llamar a VTEX en modo write.

**Flujo de una operación**:

```
POST /api/crud-medios/execute
  {operacion: "R"|"C"|"U"|"D", dry_run: bool, scope: {seller_ids: [...]},
   filtros: {...}, accion?: {...}}
   
1. Router (crud_medios/router.py):
   - Valida rol (write no-dry-run = admin)
   - Delega a service.run_crud_operation

2. Service:
   a. Resuelve sellers del scope (activos, con credenciales)
   b. Desencripta App Key/Token de cada seller
   c. Llama VTEX en paralelo (asyncio.gather con Semaphore(8)):
      GET https://{seller_id}.vtexcommercestable.com.br/api/payments/pvt/rules
      3 retries con backoff exponencial (2^attempt)
      404 → tratado como [] (seller sin reglas)
      Timeout 15s por request
   d. Para cada seller, aplica matches_filters() para filtrar reglas
   e. Ejecuta la operación:
      - R: parse_rule_enriched() + devuelve rows
      - C: por cada seller, extrae el connector de sus reglas existentes,
           construye N combinaciones brand×level, POST /rules (o dry_run)
      - U: PUT por regla matcheada con el patch aplicado
      - D: DELETE por regla matcheada
   f. Persiste CrudOperation (metadata) + CrudOperationRow[] (resultado por regla)
   g. Devuelve CrudResponse

3. Frontend renderiza:
   - Vista Dashboard (solo R): agrupa por seller, muestra estado de cada grupo de cuotas
   - Vista Detalle: tabla plana con todos los rows
```

**Estado que se persiste**: `crud_operations` (una fila por ejecución) + `crud_operation_rows` (una fila por regla afectada). El historial se limpia con `cleanup_old_operations` en cada startup (borra ejecuciones > 30 días).

**Validación de evento**: hay una variante `run_evento_validation` que, para un evento (fechas + cuotas requeridas), verifica que cada seller tenga reglas correctas (firmas Visa+Mastercard, conector válido, `valor_minimo_cuota=1`, sin `interes_externo`, etc). La lógica vive en `check_cuota_group` y `build_seller_dashboard` (fiel al script legacy v3.5 del que se migró).

### 4.5 Sincronización marketplace Marketplace

Marketplace es la instancia VTEX del marketplace principal. Los sellers de Provincia Ops pueden estar registrados también como "marketplace sellers" en Marketplace. Necesitamos saber cuáles están activos.

**Job `marketplace_sync`** (definido en `main.py`):

- Corre en **startup** (en background, no bloquea el arranque).
- Corre **cada 24h** vía APScheduler in-process.
- Toma `job_lock('marketplace_sync', ttl=30min)` → si otra réplica lo tiene, skip.
- `Marketplace_client.list_sellers()`: pagina `?from=X&to=Y` de `/api/seller-register/pvt/sellers` (page_size=100) hasta cubrir el `paging.total`.
- Matchea por `account` (nombre de cuenta VTEX del seller) contra `Seller.seller_id`. Guarda:
  - `marketplace_activo` (bool)
  - `marketplace_seller_id` (id interno de Marketplace, a veces distinto del account)
  - `marketplace_sync_at` (timestamp)
- Errores no son fatales — solo loguean warning y devuelven `{"error": ...}`.

**Toggle manual**: `POST /sellers/{id}/marketplace-toggle` (admin/supervisor) llama primero a Marketplace (`PATCH /sellers/{Marketplace_id}` con `{"op":"replace","path":"/isActive","value":bool}`). **Solo si Marketplace responde 200**, actualiza la BD. Si Marketplace falla, devuelve 502 y no queda la BD desincronizada.

### 4.6 Scheduler in-process con lock distribuido

Railway puede correr múltiples réplicas del backend (aunque hoy corremos con 1, el código soporta N). APScheduler es in-process — sin lock, cada réplica correría el mismo job en paralelo, potencialmente pisándose contra VTEX/Marketplace.

Solución (`core/scheduler.py`):

```
Tabla scheduler_locks:
  job_name PK, locked_until, locked_by

try_acquire_lock(db, job_name, ttl):
  INSERT INTO scheduler_locks (...)
  ON CONFLICT (job_name) DO UPDATE SET ... WHERE locked_until < NOW()
  RETURNING job_name

Atómico. Si la fila ya existe con locked_until > NOW(), el WHERE no matchea y
el UPDATE no ocurre; RETURNING no devuelve nada → no obtuvimos el lock.
Si nadie lo tiene (o el TTL expiró), matchea y lo tomamos.

job_lock(db, name, ttl):
  async with job_lock(...) as acquired:
    if not acquired: return  # otra réplica lo tiene
    ...  # hacer el trabajo
  # release_lock() automático al salir (DELETE)
```

**TTL** protege contra crashes: si una réplica muere sin liberar, después de `ttl` segundos el lock queda "adquirible" por otra. En `marketplace_sync` el TTL es 30 min (worst case del sync completo).

**Instancia identificada por**: `RAILWAY_REPLICA_ID` env var (si existe), sino hostname, sino uuid short.

### 4.7 Auto-updater Tauri

Al arrancar la app (`useAutoUpdate` en `App.jsx`, con delay de 5s):

```
1. Si no estamos en Tauri (browser dev), skip.
2. Llama plugin-updater: check()
3. check() hace GET al endpoint definido en tauri.conf.json:
     <BASE-URL-BACKEND>/api/updates/latest
4. Backend responde:
   {
     "version": "1.7.7",
     "notes": "...",
     "pub_date": "2026-05-25T00:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "url": "https://github.com/.../releases/download/v1.7.7/Provincia.Ops_1.7.7_x64-setup.exe",
         "signature": "dW50cnVzdGVkIGNvbW1lbnQ6..."
       }
     }
   }
   (los valores vienen de env vars: APP_VERSION, RELEASE_URL, RELEASE_DATE,
    RELEASE_NOTES, RELEASE_SIGNATURE en Railway)
5. Si la version del server > version instalada → prompt al usuario
6. Si confirma:
   - Descarga el .exe desde url
   - Verifica la firma contra el pubkey embebido en tauri.conf.json (updater.pubkey)
     - Formato: rsign (Tauri v2 nativo)
     - Si la firma no valida: aborta con error
   - Instala + relaunch()
```

**Firmar un release** (después de `npm run tauri build`):
```cmd
npx @tauri-apps/cli signer sign -f "<ruta-a-tauri-signing.key>" -p "<password — ver CREDENTIALS.md>" "ruta\Provincia Ops_X.Y.Z_x64-setup.exe"
```
El comando genera un `.sig` cuya línea base64 (`dW50cnVzdGVkIGNvbW1lbnQ6...`) va a `RELEASE_SIGNATURE` en Railway.

**Si se pierde la private key** (`<ruta-a-tauri-signing.key>`): los usuarios instalados no podrán actualizar nunca más (el pubkey embebido no coincidirá con firmas nuevas). Habría que emitir una versión especial con nuevo pubkey, distribuir manualmente, y todos los usuarios reinstalar.

---

## 5. Base de datos

Postgres. Todos los IDs son `UUID`. Timestamps timezone-aware (UTC en DB, se muestran en AR en frontend cuando corresponde).

### Tablas

| Tabla | Rol | Notas |
|---|---|---|
| `users` | Usuarios internos | `role` enum `userrole`. `hashed_password` con bcrypt. |
| `refresh_tokens` | Refresh JWT hashed | Se marca `revoked=true` al logout. |
| `sellers` | Sellers VTEX | Credenciales en `app_key_enc` / `app_token_enc` (Fernet). |
| `integracion_specs` | Sub-tipos de integración | Unique `(integracion, spec)`. |
| `crud_operations` | Metadata de cada ejecución CRUD | `filtros_usados` JSONB, `sellers_scope` ARRAY. |
| `crud_operation_rows` | Resultado por regla afectada | FK cascade a `crud_operations`. |
| `eventos` | Definición de evento comercial | `cuotas_requeridas` ARRAY, `scope_seller_ids` ARRAY. |
| `scheduler_locks` | Locks distribuidos de jobs | `job_name` PK, `locked_until`, `locked_by`. |

### Migraciones (Alembic)

Todas en `backend/alembic/versions/`. Cadena actual:

```
ed150c691172  create_users_and_refresh_tokens
      ↓
3beb540e8c96  create_sellers
      ↓
aebf175eabcb  create_crud_operations_and_rows
      ↓
d7e8f9a0b1c2  add_integracion_specs
      ↓
f1a2b3c4d5e6  create_eventos
      ↓
a1b2c3d4e5f6  rename_analista_senior_to_supervisor
      ↓
b2c3d4e5f6a7  add_marketplace_fields_to_sellers
      ↓
c3d4e5f6a7b8  add_marketplace_seller_id
      ↓
d4e5f6a7b8c9  create_scheduler_locks     ← head
```

**Regla**: nunca modificar una migración ya aplicada en prod. Si algo salió mal, crear una nueva de fix. Ver [RETRO.md → migración modificada post-apply](RETRO.md).

Railway aplica `alembic upgrade head` en el startup command (definido en `railway.json` o similar). Ver [RUNBOOK.md](RUNBOOK.md) para detalles.

---

## 6. Observabilidad

### Sentry

- **Backend** (`core/observability.py`): `init_sentry()` gateado por env var `SENTRY_DSN`. Si no está seteada, no hace nada (dev local no reporta). Integraciones activas: FastAPI, Starlette, SQLAlchemy. `set_sentry_user()` se llama en `get_current_user` para taggear cada error con el user que lo disparó.
- **Frontend** (`core/observability.js`): `initSentry()` gateado por `VITE_SENTRY_DSN` (build-time). `setSentryUser()` se llama en login y logout.

Los dos proyectos son separados en Sentry (org `provincia-ops`).

### Logs

Backend usa `logging` estándar. Los handlers de log fluyen a stdout — Railway los captura y los muestra en la vista de logs del deploy. No hay logs estructurados JSON aún (está en el backlog como HU-10).

### Rate limiting

slowapi (`core/limiter.py`). Aplicado solo en `/auth/login` con `10/minute` por IP. Otros endpoints no tienen rate limit (podrían necesitarlo en el futuro si la app se expone públicamente, hoy es interna).

### CORS

Whitelist explícita en `main.py`:
- `http://tauri.localhost` / `https://tauri.localhost` (Tauri 2 Windows)
- `tauri://localhost` (Tauri 2 macOS/Linux, por si acaso)
- `http://localhost:5173` / `http://127.0.0.1:5173` (Vite dev)

`allow_credentials=False` (no usamos cookies), `expose_headers=["X-Export-Password", "X-Export-Filename"]` para que axios pueda leerlos.

---

## 7. Seguridad — decisiones y trade-offs

| Área | Decisión | Trade-off |
|---|---|---|
| Passwords | bcrypt con salt default (cost 12) | Rápido para volumen bajo (~50 users). Si se escala, revisar cost. |
| JWT | HS256 con `JWT_SECRET_KEY` | Simple, un solo servicio consume. Si se abre a terceros → migrar a RS256. |
| Refresh tokens | Hash SHA256 en DB (`token_hash`) | El token real solo lo tiene el cliente. Rotable/revocable. |
| Tokens en cliente | Solo en memoria | Cerrar la app desloguea (consciente). No hay "recordarme". |
| Credenciales VTEX | Fernet symmetric (`FERNET_KEY`) | Si se pierde la key, credenciales inutilizables. Ver backups en CREDENTIALS.md. |
| Export con credenciales | .zip AES-256, password one-shot | Admin-only. Log de auditoría en cada export. |
| CORS | Whitelist explícita | Si se agrega un origen (nueva plataforma dev), hay que hardcodearlo aquí. |
| Rate limit | Solo login | Está bien para app interna. Endpoints costosos (CRUD execute) confían en el rol. |
| CSP | `default-src 'self'`, `connect-src 'self' <backend prod>` | Bloquea llamadas fetch a cualquier otro dominio. Si se agrega tracking/analytics extra hay que agregarlo. |

### Lo que NO tenemos aún (backlog)

- Audit log persistente de acciones sensibles (HU-08).
- Force change password en primer login (HU-34).
- Bloqueo de cuenta tras N intentos fallidos (HU-35).
- Firma de código Windows (SmartScreen sigue advirtiendo). El instalador está firmado con rsign para el updater, pero eso no es code-signing de Microsoft.

---

## 8. Testing

En `backend/tests/`:

| Archivo | Cubre |
|---|---|
| `test_role_permissions.py` | Matriz: 18 endpoints × 4 roles + 1 no-auth. Verifica 200 vs 403. |
| `test_cors.py` | Regresión del bug de CORS (que `expose_headers` funcione). |
| `test_lifespan.py` | Startup no bloquea si Marketplace está caído. |
| `test_scheduler_lock.py` | Lock UPSERT atómico + TTL. |
| `test_crud_service.py` | Lógica de `matches_filters`, `check_cuota_group`, etc. (heredado del script v6). |

Correr todo: `cd backend && pytest`. Los tests usan `TestClient(app, raise_server_exceptions=False)` + dependency overrides para mockear DB.

**Frontend**: no hay tests automatizados aún. Verificación manual en cada release (checklist en [DOD.md](DOD.md)).

---

## 9. Deploy y release

Referencia rápida — el paso a paso de operaciones va en [RUNBOOK.md](RUNBOOK.md).

**Backend**:
1. `git push` a `main`.
2. Railway detecta el push → build + `alembic upgrade head` + reinicia.
3. Health check: `GET /health` debe devolver `{"status":"ok"}`.

**Frontend (.exe)**:
1. Bump `frontend/src-tauri/tauri.conf.json` → `version`.
2. Update `CHANGELOG.md`.
3. `cd frontend && npm run tauri build`.
4. Firmar el `.exe` con rsign (comando en CREDENTIALS.md).
5. Crear GitHub Release, subir `.exe`.
6. Actualizar env vars en Railway: `APP_VERSION`, `RELEASE_URL`, `RELEASE_DATE`, `RELEASE_NOTES`, `RELEASE_SIGNATURE`.
7. Verificar que `/api/updates/latest` responda con la nueva versión.
8. Instalar el .exe localmente y verificar los criterios del DoD.

---

## 10. Convenciones de código

- **Nunca comentar el "qué"** (el código ya lo dice). Solo comentar el "por qué" si es no-obvio, sobre todo restricciones externas (VTEX API quirks, decisiones históricas).
- **Sin abstracciones prematuras**: preferir 3 líneas duplicadas antes que un helper genérico usado en 2 lugares.
- **Async everywhere en backend**: nada de sync SQLAlchemy, nada de `requests` (usar `httpx`).
- **Pydantic para validación en boundaries** (request/response): dentro del service se pasan modelos, no dicts.
- **Nombres de tests**: `test_<action>_<condition>_<expected>` (ej. `test_login_wrong_password_returns_401`).
- **Migraciones**: mensaje descriptivo en snake_case. Nunca modificar una migración aplicada.
- **Frontend**: componentes en PascalCase, hooks en camelCase con prefijo `use`, imports absolutos con alias `@/` (definido en `vite.config.js`).

---

## 11. Referencias cruzadas

- [README.md](README.md) — quickstart, env vars, comandos.
- [MANUAL_USUARIO.md](MANUAL_USUARIO.md) — cómo usar cada módulo (usuario final).
- [API.md](API.md) — endpoints, request/response, permisos.
- [RUNBOOK.md](RUNBOOK.md) — operar en producción, incidentes, rollback.
- [DOD.md](DOD.md) — Definition of Done por feature.
- [BACKLOG.md](BACKLOG.md) — historias pendientes.
- [SPRINTS.md](SPRINTS.md) — sprints activos y planificados.
- [RETRO.md](RETRO.md) — lecciones aprendidas.
- [CHANGELOG.md](CHANGELOG.md) — historial versión por versión.
- `CREDENTIALS.md` — cuentas, tokens, secrets (gitignored, ver Google Drive privado).
