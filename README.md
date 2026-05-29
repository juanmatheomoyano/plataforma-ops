# Provincia Ops

Herramienta interna de Provincia Compras para gestión masiva de reglas de pago VTEX.
Reemplaza el script Python de consola `crud_medios_de_pago_v6.py` con una interfaz desktop Windows.

---

## Stack

| Capa | Tecnología |
|---|---|
| **Desktop** | Tauri 2 (Rust) — app Windows instalable |
| **Frontend** | React 19 + Vite 8, React Router 7, Tailwind CSS 3, shadcn/ui, TanStack Table |
| **Backend** | FastAPI + async SQLAlchemy 2, Alembic, Uvicorn |
| **Base de datos** | PostgreSQL |
| **Deploy backend** | Railway |
| **Auth** | JWT (access 8hs + refresh 7 días con rotación), roles por claim |
| **Encriptación** | Fernet (credenciales VTEX) |
| **Tipografía** | Encode Sans (fuente oficial Provincia Compras) |

---

## Módulos

| Módulo | Acceso | Descripción |
|---|---|---|
| **Dashboard** | todos | Métricas por rol, últimas operaciones, accesos rápidos |
| **Sellers** | todos (ABM: admin) | Gestión de sellers y credenciales VTEX encriptadas |
| **CRUD Medios de Pago** | todos | Operaciones R/C/U/D masivas sobre reglas de pago VTEX |
| **Eventos** | solo admin | Crear/administrar eventos planificados y verificar que sellers tengan reglas correctas |
| **Usuarios** | solo admin | ABM de usuarios y roles |
| **Configuración** | todos | Toggle dark/light mode, cambio de contraseña |

### Roles

`admin` > `analista_senior` > `analista` > `viewer`

---

## Estructura del proyecto

```
plataforma-ops/
├── backend/               # FastAPI
│   ├── app/
│   │   ├── core/          # auth, config, db, seguridad
│   │   └── modules/       # auth, crud_medios, sellers, updates, users
│   ├── alembic/           # migraciones de BD
│   ├── requirements.txt
│   └── .env.example
├── frontend/              # React + Tauri
│   ├── src/
│   │   ├── core/          # api client, auth, layout, theme
│   │   ├── modules/       # crud_medios, sellers, users, validacion_eventos
│   │   └── pages/         # Dashboard, Login, ConfiguracionPage
│   ├── src-tauri/         # capa Rust / config Tauri
│   ├── public/fonts/      # Encode Sans TTF
│   └── tailwind.config.js
├── BACKLOG.md
├── CHANGELOG.md
└── README.md
```

---

## Variables de entorno

### Backend (`backend/.env`)

```env
APP_ENV=production
APP_SECRET_KEY=...
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
FERNET_KEY=...          # generado con Fernet.generate_key()
VTEX_ACCOUNT=...
THREADS_READ=10         # paralelismo para operaciones Read
THREADS_WRITE=5         # paralelismo para Create/Update/Delete
APP_VERSION=1.3.0
RELEASE_URL=...         # URL del instalador .exe para auto-update
RELEASE_DATE=...
RELEASE_NOTES=...
```

### Frontend (`frontend/.env.production`)

```env
VITE_API_BASE_URL=https://plataforma-ops-production.up.railway.app/api
```

---

## Desarrollo local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # completar variables

# Migraciones
alembic upgrade head

# Seed inicial (crea usuario admin)
python seed.py

# Servidor
uvicorn app.main:app --reload --port 8000
```

### Frontend (modo dev, sin Tauri)

```bash
cd frontend
npm install
cp .env.example .env.development  # apuntar a localhost:8000
npm run dev
# abre http://localhost:5173
```

### Frontend con Tauri (ventana desktop)

```bash
cd frontend
npm run tauri dev
```

> Requiere tener el backend corriendo localmente o apuntar a prod en `.env.development`.

---

## Build del instalador Windows

```bash
cd frontend
npm run tauri build
```

Genera dos bundles en `frontend/src-tauri/target/release/bundle/`:
- `nsis/Provincia Ops_1.3.0_x64-setup.exe` — instalador NSIS (recomendado)
- `msi/Provincia Ops_1.3.0_x64_en-US.msi` — instalador MSI

**Instalación silenciosa:**

```powershell
Start-Process "Provincia Ops_1.3.0_x64-setup.exe" -ArgumentList "/S" -Wait
```

**Tiempo de build:** ~2 minutos (compila Rust en release).

---

## Migraciones de BD

```bash
# Crear migración nueva
alembic revision --autogenerate -m "descripción"

# Aplicar
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Deploy backend (Railway)

El backend se deploya automáticamente desde `main` vía Railway.
Procfile: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`

URL producción: `https://plataforma-ops-production.up.railway.app/api`

---

## Auto-update

La app desktop consulta `GET /api/updates/latest` al arrancar.
Si hay versión nueva disponible, ofrece instalarla sin salir de la app (Tauri Updater plugin).

Para publicar una nueva versión:
1. Buildear el instalador
2. Subir el `.exe` a un servidor accesible
3. Actualizar `APP_VERSION`, `RELEASE_URL`, `RELEASE_DATE`, `RELEASE_NOTES` en las env vars de Railway

---

## Referencia VTEX

API de reglas de pago:
```
GET/POST/PUT/DELETE https://{seller_id}.vtexcommercestable.com.br/api/payments/pvt/rules
```
Autenticación: headers `X-VTEX-API-AppKey` y `X-VTEX-API-AppToken`.

Lógica original de referencia: `frontend/.claude/crud_medios_de_pago_v6.py`

---

## Convenciones de código

- **Tokens de color**: siempre usar `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary` — nunca hardcodear `slate-*` ni hex
- **Excepción**: colores de estado semánticos (`emerald`, `red`, `blue`, `amber`, `violet`) se usan directamente en badges y alertas, con variantes `dark:` para light/dark mode
- **Dark mode**: default. Toggle en `/configuracion`. Implementado con `ThemeContext` + clase `.dark` en `<html>`

---

## Changelog

Ver [CHANGELOG.md](./CHANGELOG.md) para historial completo de versiones.

## Backlog

Ver [BACKLOG.md](./BACKLOG.md) para tareas pendientes y próximos sprints.
