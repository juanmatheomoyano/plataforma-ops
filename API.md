# API Reference — Provincia Ops

Referencia de los endpoints REST del backend. Para entender los flujos internos ver [ARCHITECTURE.md](ARCHITECTURE.md). Para operar en producción ver [RUNBOOK.md](RUNBOOK.md).

**Base URL prod**: `<BASE-URL-BACKEND>`
**Prefijo API**: `/api` (todo salvo `/health` y `/updates/download`)
**Auth**: JWT Bearer en header `Authorization: Bearer <access_token>` (obtenido de `/api/auth/login`).
**Content-Type**: `application/json` salvo endpoints de upload que usan `multipart/form-data`.

---

## Convenciones

- IDs de recursos son UUID v4.
- Timestamps se serializan en ISO-8601 UTC (`2026-05-25T12:34:56.789Z`).
- Errores siguen el formato FastAPI estándar: `{"detail": "mensaje"}` para strings, `{"detail": [...]}` para validación Pydantic.
- Roles: `admin`, `supervisor`, `analista`, `viewer`.

### Códigos de error comunes

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Creado (POST de recurso nuevo) |
| 204 | No Content (DELETE, logout, cambio de password) |
| 400 | Request mal formado (validación de negocio) |
| 401 | Token ausente, inválido o expirado |
| 403 | Autenticado pero sin permisos para el endpoint |
| 404 | Recurso no encontrado |
| 409 | Conflicto (unique constraint violado, ej. seller_id repetido) |
| 422 | Validación Pydantic falló |
| 429 | Rate limit excedido (solo `/auth/login`) |
| 500 | Error interno (revisar Sentry + logs Railway) |
| 502 | Falla contra API externa (VTEX/BaproAR) |
| 503 | Servicio no disponible (credenciales BaproAR no configuradas) |

---

## 1. Health

### `GET /health`

Público. Usado por Railway para health checks y para chequeo rápido de la app.

**Response 200:**
```json
{ "status": "ok", "env": "production" }
```

---

## 2. Auth — `/api/auth`

### `POST /api/auth/login`

**Público**. Rate limit: `10/minute` por IP.

**Request:**
```json
{ "username": "usuario", "password": "..." }
```

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "usuario",
    "email": "juan@example.com",
    "full_name": "Nombre Apellido",
    "role": "admin"
  }
}
```

**Errores:** `401` si credenciales incorrectas, `429` si excedió el rate limit.

### `GET /api/auth/me`

Auth requerida. Devuelve el usuario del token.

**Response 200:** `UserOut` (mismo shape que arriba).

### `POST /api/auth/refresh`

**Público** (no requiere access token, sí refresh). Rota el access token.

**Request:** `{ "refresh_token": "..." }`

**Response 200:** `{ "access_token": "...", "token_type": "bearer" }`

**Errores:** `401` si el refresh está revocado o expirado.

### `POST /api/auth/logout`

Auth requerida. Revoca el refresh token.

**Request:** `{ "refresh_token": "..." }`
**Response:** `204 No Content`.

---

## 3. Users — `/api/users`

Todos requieren auth.

### `GET /api/users`

**Rol:** admin, supervisor.

**Response 200:** `list[UserOut]`

```json
[
  {
    "id": "uuid",
    "username": "usuario",
    "email": "juan@...",
    "full_name": "Nombre Apellido",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-01-01T...",
    "last_login": "2026-07-29T..."
  }
]
```

### `GET /api/users/{user_id}`

**Rol:** admin.
**Response 200:** `UserOut` | **404** si no existe.

### `POST /api/users`

**Rol:** admin. Crea usuario nuevo.

**Request:**
```json
{
  "username": "nvarela",
  "email": "n@example.com",
  "full_name": "Natalia Varela",
  "password": "<password>",
  "role": "analista"
}
```

**Response 201:** `UserOut`. **409** si username o email ya existen.

### `PATCH /api/users/{user_id}`

**Rol:** admin. Actualiza campos opcionales.

**Request** (todos opcionales):
```json
{ "email": "...", "full_name": "...", "role": "supervisor", "is_active": true }
```

**Response 200:** `UserOut`.

### `POST /api/users/{user_id}/deactivate`

**Rol:** admin. Setea `is_active=false`. No puede desactivarse a sí mismo (devuelve `400`).

**Response 200:** `UserOut` con `is_active=false`.

### `POST /api/users/{user_id}/reset-password`

**Rol:** admin. Fuerza password nuevo para otro usuario.

**Request:** `{ "new_password": "..." }`
**Response 200:** `UserOut`.

### `POST /api/users/me/change-password`

Cualquier rol autenticado. Cambia el propio password.

**Request:**
```json
{ "current_password": "...", "new_password": "...", "confirm_password": "..." }
```

**Response:** `204`. `400` si `current_password` incorrecto o `new != confirm`.

### `GET /api/users/export`

**Rol:** admin, supervisor. Devuelve `.xlsx` con todos los usuarios.

**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (streaming).

### `POST /api/users/import-update`

**Rol:** admin. Bulk import/update desde `.xlsx`.

**Request:** `multipart/form-data` con campo `file`.
**Response 200:**
```json
{
  "total": 20,
  "actualizados": 15,
  "creados": 3,
  "errores": 2,
  "detalle_errores": [{"fila": 5, "username": "x", "motivo": "..."}]
}
```

---

## 4. Sellers — `/api/sellers`

### `GET /api/sellers`

**Auth:** cualquier rol.
**Query params:** `skip=0`, `limit=200`.
**Response 200:** `list[SellerOut]` (nunca incluye `app_key` / `app_token`).

```json
[
  {
    "id": "uuid",
    "id_ecommerce": "SELLER001",
    "seller_name": "Comercio SA",
    "seller_id": "comerciosa",
    "creado_por": "usuario",
    "fecha_creacion": "2026-01-15",
    "estado_keys": "activo",
    "integracion": "Base",
    "integracion_spec": null,
    "vendiendo": true,
    "analista": "usuario",
    "notas": "...",
    "is_active": true,
    "marketplace_activo": true,
    "marketplace_sync_at": "2026-07-29T...",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### `GET /api/sellers/{seller_id}`

**Auth:** cualquier rol.
**Response 200:** `SellerOut`. **404** si no existe.

### `POST /api/sellers`

**Rol:** admin, supervisor, analista.

**Request** (`app_key` / `app_token` se encriptan Fernet server-side):
```json
{
  "id_ecommerce": "SELLER001",
  "seller_name": "Comercio SA",
  "seller_id": "comerciosa",
  "app_key": "vtexappkey-...",
  "app_token": "...",
  "creado_por": "usuario",
  "fecha_creacion": "2026-01-15",
  "estado_keys": "activo",
  "integracion": "Base",
  "integracion_spec": null,
  "vendiendo": true,
  "analista": "usuario",
  "notas": null
}
```

**Response 201:** `SellerOut`. **409** si `id_ecommerce` o `seller_id` ya existen.

### `PATCH /api/sellers/{seller_id}`

**Rol:** admin, supervisor, analista. Body con campos opcionales (mismos que `SellerCreate` + `is_active`). Si se envía `app_key` / `app_token`, se re-encripta.

**Response 200:** `SellerOut`.

### `POST /api/sellers/{seller_id}/deactivate`

**Rol:** admin, supervisor, analista. Setea `is_active=false`.
**Response 200:** `SellerOut`.

### `POST /api/sellers/{seller_id}/test-connection`

**Rol:** admin, supervisor. Prueba las credenciales VTEX del seller haciendo un `GET /api/catalog_system/pub/products/search?_from=0&_to=1`.

**Response 200:**
- OK: `{ "ok": true }`
- Fallo: `{ "ok": false, "error": "HTTP 403" | "Timeout al conectar con VTEX" | "..." }`

### `POST /api/sellers/{seller_id}/marketplace-toggle`

**Rol:** admin, supervisor. Activa/desactiva el seller en BaproAR. Solo actualiza la BD si BaproAR responde OK.

**Response 200:** `SellerOut` con `marketplace_activo` invertido.
**Errores:** `400` si el seller no está en BaproAR, `502` si BaproAR rechaza, `503` si credenciales BaproAR no configuradas.

### `GET /api/sellers/export`

**Query:** `include_credentials=false` (default) | `true`.

- `include_credentials=false`:
  - **Rol:** admin, supervisor.
  - Devuelve `.xlsx` plano sin credenciales.
- `include_credentials=true`:
  - **Rol:** solo admin.
  - Devuelve `.zip` con AES-256; el `.xlsx` interno tiene las credenciales.
  - Password random en header **`X-Export-Password`** (mostrar UNA vez al usuario).
  - Se loguea WARNING con `user, user_id, bytes` para auditoría.

### `POST /api/sellers/import`

**Rol:** admin, supervisor. Bulk insert desde `.xlsx`. Falla si algún `seller_id` ya existe.

**Request:** `multipart/form-data` con `file`.
**Response 200:** `SellerImportResult` (mismo shape que users import).

### `POST /api/sellers/import-update`

**Rol:** admin, supervisor. Upsert (crea si no existe, actualiza si sí). Formato más flexible que `/import`.

**Response 200:** `SellerImportUpdateResult`.

### `POST /api/sellers/sync-marketplace`

**Rol:** admin, supervisor. Dispara manualmente el sync BaproAR (normalmente corre cada 24h).

**Response 200:** `{ "synced": 15, "total_marketplace": 20 }` o `{ "synced": 0, "total_marketplace": 0, "error": "..." }`.

### `GET /api/sellers/analistas`

**Auth:** cualquier rol. Lista usuarios con rol `admin`/`supervisor`/`analista` (para populate del combo "analista asignado").

**Response 200:** `[{ "username": "...", "full_name": "..." }]`.

### `GET /api/sellers/integraciones`

**Auth:** cualquier rol. Devuelve la lista hardcoded de tipos de integración (`["Base", "DUX Software", ...]`).

### `POST /api/sellers/integraciones/specs`

**Auth:** cualquier rol. Crea spec (sub-tipo) para una integración.

**Request:** `{ "integracion": "Fulljaus", "spec": "v2" }`
**Response 201:** `IntegracionSpecOut`. **409** si el par ya existe.

### `GET /api/sellers/integraciones/{integracion}/specs`

**Auth:** cualquier rol. Lista specs de una integración.

---

## 5. CRUD Medios de Pago — `/api/crud-medios`

### `POST /api/crud-medios/execute`

**Auth:** cualquier rol. **Regla adicional:** operaciones `C`/`U`/`D` con `dry_run=false` requieren rol `admin`.

**Request:**
```json
{
  "operacion": "R",
  "scope": { "seller_ids": ["seller1", "seller2"] },
  "filtros": {
    "brands": ["Visa", "Mastercard"],
    "levels": ["classic", "gold"],
    "levels_mode": "include",
    "estado": "activo",
    "nombre": null,
    "connector": null,
    "cuotas": [1, 3, 6],
    "cuotas_mode": "exacta",
    "fecha_mode": "todos",
    "fecha_ini_date": null,
    "fecha_fin_date": null,
    "horario_ini": null,
    "horario_ini_mode": "include",
    "horario_fin": null,
    "horario_fin_mode": "include"
  },
  "accion_create": null,
  "accion_update": null,
  "dry_run": true
}
```

- `scope.seller_ids` vacío = todos los sellers activos.
- `filtros.levels`: acepta valores de level (`"gold"`, `"platinum"`, `"corporate t"`, etc.) y el sentinel `"__no_level__"` para matchear reglas sin `cardLevel` (1 pago). Combinable con `levels_mode: include|exclude`.
- `accion_create` obligatorio si `operacion=C`:
  ```json
  {
    "rule_name_prefix": "PROMO",
    "ps_names": ["Visa", "Mastercard"],
    "levels": ["gold", "platinum"],
    "cuotas": [1, 3, 6],
    "begin_date": "2026-08-01T03:00:00Z",
    "end_date": "2026-08-31T03:00:00Z",
    "enabled": true
  }
  ```
- `accion_update` obligatorio si `operacion=U`:
  ```json
  { "cuotas": [1, 3, 6, 9], "enabled": true }
  ```
- **Levels sin cardLevel:** en `accion_create.levels` o `accion_update.level`, el sentinel `"__no_level__"` produce (Create) o limpia (Update) el `cardLevel` de la regla. En Create el nombre generado omite el segmento de level. Válido solo con `cuotas = [1]` (regla operativa VTEX; enforced en frontend).

**Response 200:**
```json
{
  "operation_id": "uuid",
  "operacion": "R",
  "dry_run": true,
  "total_sellers": 50,
  "total_matched": 120,
  "total_success": 120,
  "total_errors": 0,
  "duration_secs": 12.34,
  "rows": [
    {
      "seller_id": "comerciosa",
      "id_ecommerce": "SELLER001",
      "rule_id": "123",
      "rule_name": "VISA_GOLD_6",
      "brand": "Visa",
      "level": "gold",
      "estado": "activo",
      "detalle": "vigente: Sí | cuotas: 1,3,6 | conector: payway"
    }
  ],
  "dashboard": []
}
```

**Errores:** `403` si intenta write no-dry-run sin ser admin.

### `GET /api/crud-medios/operations`

**Auth:** cualquier rol. Historial de operaciones (últimas 200).

- `admin` / `supervisor` ven todas.
- `analista` / `viewer` ven solo las propias.

**Response 200:** `list[OperationSummary]`.

### `GET /api/crud-medios/operations/{operation_id}`

**Auth:** cualquier rol (con misma restricción por ownership). Detalle completo con todas las rows.

**Response 200:** `CrudResponse` (mismo shape que `/execute`). **404** si no existe o no tiene permiso.

### `GET /api/crud-medios/sellers`

**Auth:** cualquier rol. Lista sellers activos con datos mínimos para el selector.

**Response 200:** `list[SellerScopeOut]`
```json
[{ "id_ecommerce": "SELLER001", "seller_name": "Comercio SA", "seller_id": "comerciosa", "analista": "usuario" }]
```

### `GET /api/crud-medios/stats`

**Auth:** cualquier rol.

**Response 200:**
```json
{
  "total_sellers_activos": 400,
  "total_sellers_inactivos": 50,
  "total_sellers_keys_vencidas": 12,
  "total_operaciones_hoy": 8,
  "total_usuarios_activos": 15
}
```
`total_usuarios_activos` es `null` para `analista`/`viewer`.

### `POST /api/crud-medios/cleanup`

**Rol:** admin. Borra operaciones > 30 días.
**Response 200:** `{ "deleted": 42 }`.

### `POST /api/crud-medios/export`

**Auth:** cualquier rol. Genera Excel completo (Resumen + Dashboards + Consolidado + Errores).

**Request:**
```json
{
  "scope": { "seller_ids": [...] },
  "grupos_seleccionados": ["Tarjetas en 6 cuotas", "Tarjetas en 12 cuotas"],
  "evento_resultados": [{ "nombre": "Hot Sale", "result_map": { "seller1": "Ok" } }]
}
```

**Response:** `.xlsx` con nombre `vtex_payments_YYYYMMDD_HHMMSS.xlsx`.

### `POST /api/crud-medios/validate-evento`

**Auth:** cualquier rol. Valida que los sellers del scope tengan reglas correctas para un evento.

**Request:**
```json
{
  "scope": { "seller_ids": [...] },
  "filtros": { ... },
  "evento": {
    "nombre": "Hot Sale",
    "cuotas_requeridas": [1, 3, 6, 9, 12],
    "max_cuota": 12,
    "fecha_ini_art": "2026-08-01T00:00:00",
    "fecha_fin_art": "2026-08-07T23:59:00"
  }
}
```

**Response 200:**
```json
{
  "evento_nombre": "Hot Sale",
  "total_sellers": 50,
  "sellers_ok": 40,
  "sellers_a_corregir": 8,
  "sellers_no_configurado": 2,
  "duration_secs": 8.5,
  "results": [
    {
      "seller_id": "comerciosa",
      "seller_name": "Comercio SA",
      "estado_general": "Ok (vigente)",
      "motivos": [],
      "total_rules_evento": 6
    }
  ]
}
```

### `POST /api/crud-medios/export-evento`

**Auth:** cualquier rol. Excel completo de validación de evento. Mismo body que `/validate-evento`. Devuelve `.xlsx` con nombre `evento_<NOMBRE>_YYYYMMDD.xlsx`.

---

## 6. Eventos — `/api/eventos`

### `POST /api/eventos/`

**Rol:** admin, supervisor.

**Request:**
```json
{
  "nombre": "Hot Sale",
  "fecha_ini_art": "2026-08-01T00:00:00",
  "fecha_fin_art": "2026-08-07T23:59:00",
  "cuotas_requeridas": [1, 3, 6, 9, 12],
  "max_cuota": 12,
  "scope_seller_ids": ["seller1", "seller2"]
}
```

`fecha_ini_art` / `fecha_fin_art` se interpretan en Argentina (UTC-3) y se guardan como UTC en DB.

**Response 200:** `EventoOut` (incluye `creado_por_username`).

### `GET /api/eventos/`

**Rol:** admin, supervisor. Lista todos los eventos.
**Response 200:** `list[EventoOut]`.

### `GET /api/eventos/vigentes`

**Auth:** cualquier rol. Eventos activos cuya ventana `[fecha_ini, fecha_fin]` incluye ahora.
**Response 200:** `list[EventoVigenteOut]` (shape reducido).

### `PUT /api/eventos/{evento_id}`

**Rol:** admin, supervisor. Update completo. Campos opcionales.
**Response 200:** `EventoOut`. **404** si no existe.

### `PATCH /api/eventos/{evento_id}/toggle-active`

**Rol:** admin, supervisor. Invierte `is_active`.
**Response 200:** `EventoOut`.

### `DELETE /api/eventos/{evento_id}`

**Rol:** admin, supervisor. Borra el evento (soft-delete no implementado — es DELETE físico).
**Response 200:** `{ "ok": true }`.

---

## 7. Updates — `/api/updates` y `/updates/download`

### `GET /api/updates/latest`

**Público.** Usado por el auto-updater de Tauri. Response derivado de env vars del backend.

**Response 200:**
```json
{
  "version": "1.7.7",
  "notes": "Bugfixes y mejoras",
  "pub_date": "2026-05-25T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/.../releases/download/v1.7.7/Provincia.Ops_1.7.7_x64-setup.exe",
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6..."
    }
  }
}
```

### `GET /updates/download`

**Público** (sin prefijo `/api`). HTML con botón de descarga apuntando al último `.exe`. Se le pasa el link a compañeros para instalar la app la primera vez.

---

## Ejemplos con curl

### Login + request autenticado
```bash
TOKEN=$(curl -s -X POST <BASE-URL-BACKEND>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario","password":"..."}' | jq -r .access_token)

curl <BASE-URL-BACKEND>/api/sellers \
  -H "Authorization: Bearer $TOKEN"
```

### Ejecutar dry-run de READ
```bash
curl -X POST <BASE-URL-BACKEND>/api/crud-medios/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operacion": "R",
    "scope": {"seller_ids": ["comerciosa"]},
    "filtros": {"brands": ["Visa"], "estado": "activo"},
    "dry_run": true
  }'
```

### Export sellers CON credenciales (solo admin)
```bash
curl -o sellers.zip -D headers.txt \
  "<BASE-URL-BACKEND>/api/sellers/export?include_credentials=true" \
  -H "Authorization: Bearer $TOKEN"

grep -i "x-export-password" headers.txt
```

---

## Cambios recientes en la API

Ver [CHANGELOG.md](CHANGELOG.md) para el historial completo. Cambios notables:

- **v1.7.8** (sprint 1): CORS restringido con whitelist explícita, header `X-Export-Password` expuesto, endpoint `/sellers/export?include_credentials=true` protegido por rol admin.
- **v1.7.2**: rol `analista_senior` renombrado a `supervisor` (migración `a1b2c3d4e5f6`).
- **v1.7.5+**: `marketplace_activo` y `marketplace_seller_id` agregados a `SellerOut`.
