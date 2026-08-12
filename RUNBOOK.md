# Runbook — Provincia Ops

Manual de operaciones en producción. Cómo deployar, cómo hacer rollback, qué hacer cuando algo rompe, y cómo recuperarse de escenarios de emergencia.

Para entender cómo funciona la app por dentro ver [ARCHITECTURE.md](ARCHITECTURE.md). Para referencia de endpoints ver [API.md](API.md). Para el manual de usuario final ver [MANUAL_USUARIO.md](MANUAL_USUARIO.md).

**Credenciales, DSN, tokens y URLs** — no están acá. Están en `CREDENTIALS.md` (local, gitignored). Si no lo tenés, pedilo antes de operar.

---

## 0. Inventario de infra

| Servicio | Dónde | Cómo se accede |
|---|---|---|
| Backend + DB Postgres | Railway (proyecto `plataforma-ops`) | https://railway.app → login GitHub |
| Distribución .exe | GitHub Releases (repo del proyecto — ver CREDENTIALS.md) | `gh release ...` o UI web |
| Error tracking | Sentry (`provincia-ops.sentry.io`) | login GitHub OAuth |
| VTEX (sellers) | Cada seller = subdominio `<seller_id>.vtexcommercestable.com.br` | credenciales por seller en DB (Fernet) |
| Marketplace marketplace | `Marketplace.vtexcommercestable.com.br` | env vars `Marketplace_APP_KEY` / `Marketplace_APP_TOKEN` |
| Firma updater | Local: `<ruta-a-tauri-signing.key>` | password (ver CREDENTIALS.md) |

---

## 1. Deploy — release completo (backend + frontend .exe)

Este es el flujo estándar. Sale una versión nueva a los usuarios.

### 1.1 Pre-deploy — checklist

- [ ] Todos los tests pasan (`cd backend && pytest`).
- [ ] Sin cambios sin commitear (`git status` limpio).
- [ ] `main` está al día con lo que se va a shipear.
- [ ] Actualicé `CHANGELOG.md` con la sección de la nueva versión.
- [ ] Actualicé `BACKLOG.md` marcando HU cerradas.
- [ ] Si hay migración nueva Alembic: revisada, aplicable, `down_revision` correcto.

### 1.2 Bump de versión

Elegir la versión nueva siguiendo semver:
- PATCH: bugfix (1.7.8 → 1.7.9)
- MINOR: feature nueva compatible (1.7.8 → 1.8.0)
- MAJOR: breaking (raro; 1.7.8 → 2.0.0)

Archivos a bumpear:
- `frontend/src-tauri/tauri.conf.json` → campo `version`.
- `frontend/src-tauri/Cargo.toml` → `[package] version = "..."`. (Se sincroniza a mano.)
- Sección nueva en `CHANGELOG.md`.

### 1.3 Backend (Railway)

Railway está configurado con `backend/railway.json`:
- Builder: NIXPACKS
- Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `GET /health`
- Restart policy: `ON_FAILURE`

Deploy = push a `main`:

```bash
git add .
git commit -m "release v1.7.8 — <resumen>"
git push origin main
```

Railway detecta el push y arranca el build. Verificar:

1. **Railway dashboard → proyecto plataforma-ops → deployments**: el nuevo deploy debe pasar de `Building` → `Deploying` → `Success` (~2-4 min).
2. **Migración aplicada**: en los logs del deploy debe aparecer `alembic upgrade head` sin errores. Si hay migración nueva, buscar la línea `Running upgrade <prev> -> <nuevo>`.
3. **Health check**:
   ```bash
   curl <BASE-URL-BACKEND>/health
   # Esperado: {"status":"ok","env":"production"}
   ```

Si el deploy falla:
- Ver logs del deploy en Railway. Los errores comunes:
  - **Migración falla**: revertir la migración local, crear una de fix, re-pushear. Ver §3.
  - **Env var faltante**: agregar en Railway → Variables. Ver §6.
  - **Import error**: falta una dep en `requirements.txt`. Agregarla, commit, push.
- Railway con `restartPolicyType: ON_FAILURE` va a reintentar. Si el fix no es inmediato, hacer rollback (§2).

### 1.4 Env vars nuevas del release

Si esta versión introduce env vars nuevas (o cambia defaults), setearlas en Railway ANTES del deploy o el deploy va a fallar.

Env vars actuales en backend (obligatorias marcadas):

| Var | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres URL. La setea Railway automáticamente al linkear la DB. |
| `APP_SECRET_KEY` | ✅ | Random hex 64 chars. |
| `JWT_SECRET_KEY` | ✅ | Random hex 64 chars. **NO ROTAR** salvo emergencia (deslogueá a todos). |
| `FERNET_KEY` | ✅ | Fernet key (44 chars base64). **NO ROTAR NUNCA** (perdés credenciales encriptadas). |
| `VTEX_ACCOUNT` | ✅ | Nombre de cuenta VTEX (`Marketplace`). |
| `Marketplace_APP_KEY` | ✅ | Credenciales para sync marketplace. |
| `Marketplace_APP_TOKEN` | ✅ | Idem. |
| `JWT_ALGORITHM` | opt | Default `HS256`. |
| `JWT_EXPIRE_MINUTES` | opt | Default `30`. |
| `JWT_REFRESH_EXPIRE_DAYS` | opt | Default `30`. |
| `APP_ENV` | opt | `production` en prod, default `development`. Activa echo SQL si es dev. |
| `APP_VERSION` | ⚠ | Para el updater. Debe matchear la versión del .exe releaseado. |
| `RELEASE_URL` | ⚠ | URL del .exe en GitHub Releases. |
| `RELEASE_DATE` | ⚠ | ISO datetime. |
| `RELEASE_NOTES` | ⚠ | String con las notes del release. |
| `RELEASE_SIGNATURE` | ⚠ | Firma base64 (`dW50cnVzdGVkIGNvbW1lbnQ6...`) del rsign. |
| `SENTRY_DSN` | opt | DSN del proyecto backend. Si vacío, no reporta. |

⚠ = se actualiza en cada release del .exe (§1.5 abajo).

### 1.5 Frontend (.exe)

Solo se hace después de que el backend deploy esté verde.

```cmd
cd frontend
npm install
npm run tauri build
```

Output: `frontend/src-tauri/target/release/bundle/nsis/Provincia Ops_X.Y.Z_x64-setup.exe` (~10 MB).

**Firmar el instalador**:
```cmd
npx @tauri-apps/cli signer sign -f "<ruta-a-tauri-signing.key>" -p "<password — ver CREDENTIALS.md>" "frontend\src-tauri\target\release\bundle\nsis\Provincia Ops_1.7.8_x64-setup.exe"
```

Output: se crea `Provincia Ops_1.7.8_x64-setup.exe.sig` en el mismo directorio. Su contenido es una línea base64 empezando con `dW50cnVzdGVkIGNvbW1lbnQ6...`.

**Copiar la firma** (todo el contenido del .sig) para pegarla como `RELEASE_SIGNATURE` en Railway.

### 1.6 GitHub Release

Usar `gh cli`:

```bash
gh release create v1.7.8 \
  "frontend/src-tauri/target/release/bundle/nsis/Provincia Ops_1.7.8_x64-setup.exe" \
  --title "v1.7.8" \
  --notes "Bugfixes de estabilización — sprint 1."
```

O crear a mano en el release page del repo GitHub (ver CREDENTIALS.md), subir el `.exe` como asset.

Copiar el URL del asset (algo como `https://github.com/.../releases/download/v1.7.8/Provincia.Ops_1.7.8_x64-setup.exe`) para setearlo como `RELEASE_URL` en Railway.

### 1.7 Actualizar env vars del updater en Railway

Ir a Railway → Variables. Setear/actualizar:
- `APP_VERSION` = `1.7.8`
- `RELEASE_URL` = URL del .exe en GitHub
- `RELEASE_DATE` = ISO datetime actual (`2026-07-29T14:00:00Z`)
- `RELEASE_NOTES` = texto corto de qué cambia
- `RELEASE_SIGNATURE` = contenido completo del `.sig` (base64)

Railway hace redeploy automáticamente cuando cambian env vars. Esperar el `Success`.

Verificar:
```bash
curl <BASE-URL-BACKEND>/api/updates/latest | jq
```

Debe devolver la version nueva, el URL nuevo y la signature nueva.

### 1.8 Verificación post-deploy

- [ ] Instalar el `.exe` localmente (o en una VM). Verificar los criterios del DoD:
  - Login funciona.
  - Sidebar muestra los módulos correctos según rol.
  - Dashboard carga sin errores.
  - CRUD Medios: ejecutar un dry-run de Read.
  - Sellers: listar y ver un seller.
  - Auto-updater: si tenías una versión anterior instalada, aparece el prompt.
- [ ] Sentry: no hay errores nuevos en los últimos 5 minutos.
- [ ] Railway logs: no hay warnings/errors post-deploy.
- [ ] Avisar a usuarios que hay versión nueva.

---

## 2. Rollback

### 2.1 Rollback backend (Railway)

Rápido y no destructivo (mientras no haya migración de DB nueva):

1. Railway dashboard → `plataforma-ops` → **Deployments**.
2. Buscar el deploy anterior que estaba OK. Click en los tres puntos → **Redeploy**.
3. Railway rebuildea el commit anterior y lo pone activo. ~2 min.
4. Verificar `/health` OK.

**Con migración de DB nueva** que se aplicó: el downgrade automático NO está garantizado. Ver §3.2.

### 2.2 Rollback frontend (.exe)

Si el `.exe` nuevo tiene un bug crítico y ya se distribuyó:

1. **Detener actualizaciones**: en Railway, cambiar `APP_VERSION` a la versión anterior (ej. `1.7.7`) y `RELEASE_URL` al asset viejo en GitHub. Los clientes que aún no actualizaron ya no verán el prompt de update.
2. **Usuarios que sí actualizaron**: no hay downgrade automático. Opciones:
   - Publicar `1.7.9` con el fix.
   - O pedirles a los usuarios que reinstalen manualmente el `.exe` viejo desde GitHub Releases (los releases anteriores siguen disponibles).

### 2.3 Rollback env vars

Si cambiaste una env var y algo rompió: Railway guarda historial. Variables → historial de cambios → revert. O simplemente setear el valor viejo (lo tenés en CREDENTIALS.md).

---

## 3. Migraciones Alembic

### 3.1 Crear una migración nueva

```bash
cd backend
alembic revision -m "descripcion_en_snake_case"
# Editar el archivo generado en alembic/versions/
# Verificar: down_revision apunta al head actual
```

**Regla de oro**: `alembic upgrade head` local antes de commitear. Si falla local, va a fallar en Railway.

### 3.2 Rollback de migración aplicada en prod

Este es el escenario delicado. Alembic tiene `alembic downgrade -1`, pero:
- Solo funciona si la migración implementó `def downgrade()`.
- Si la migración modificó datos (no solo schema), el downgrade puede perder datos.

**Proceso recomendado**:

1. **Backup primero**. Railway UI → Postgres service → Backups → **Create backup**. Verificar que el backup se creó OK antes de tocar nada.
2. Elegir el approach:
   - **Downgrade Alembic** (si el `downgrade()` es confiable):
     ```bash
     # Correr contra la DB de prod (usa DATABASE_URL de Railway con hostname público, ver §6.3)
     alembic downgrade -1
     ```
   - **Forward-fix**: crear una migración nueva que revierta lo malo. Suele ser más seguro.
3. Si Railway ya restarteó y la app está caída por el schema roto, primero fixear el schema, después redeploy.

Ver [RETRO.md → migración modificada post-apply](RETRO.md) para un ejemplo real.

### 3.3 Sincronizar `alembic_version` a mano

Si algo quedó descalibrado (typical: aplicaste el SQL a mano pero Alembic no sabe):

```sql
-- Ver el head actual
SELECT * FROM alembic_version;

-- Setearlo a lo que corresponde
UPDATE alembic_version SET version_num = 'd4e5f6a7b8c9';
```

Solo hacer esto si sabés exactamente qué migración corresponde al estado real del schema.

---

## 4. Incidentes

### 4.1 "Login no funciona / usuarios deslogueados masivos"

Diagnóstico:
1. Sentry → hay errores en `POST /api/auth/login` o `POST /api/auth/refresh`?
2. Railway logs → error de conexión a DB?
3. `curl /health` → responde?

Causas típicas:
- **DB caída**: Railway → Postgres service → ver estado. Si está `crashed`, restartear. Si sigue mal, contactar Railway support.
- **JWT_SECRET_KEY cambiada**: TODOS los tokens vigentes quedan inválidos. Usuarios deben re-loguearse. No hay fix; solo comunicar. Rotar `JWT_SECRET_KEY` es un evento a evitar.
- **Rate limit disparado por un solo user**: ver logs si aparece `429` repetido de una IP. Es 10/min por IP; si es legítimo, aumentar en `core/limiter.py` y redeployar.

### 4.2 "CRUD Medios devuelve muchos errores por seller"

Causas típicas:
- **Credenciales VTEX del seller vencidas**: ejecutar `POST /sellers/{id}/test-connection`. Si falla, actualizar `app_key` / `app_token` en el seller (módulo Sellers → editar).
- **VTEX caído**: verificar contra otro seller sano. Si es global, esperar y reintentar. VTEX suele publicar status.
- **Timeout de red**: `vtex_client.py` tiene 15s + 3 retries con backoff. Si aún así falla, hay algo raro con la conectividad Railway → VTEX. Ver logs para ver qué operación exactamente falla.

### 4.3 "Sync marketplace no actualiza sellers"

1. Ver logs de Railway con filtro `marketplace_sync`. Buscar:
   - `Marketplace sync (startup) skipped: otra réplica corriendo` → normal si hay otra réplica.
   - `Marketplace sync (...) falló (no fatal): ...` → problema. Leer el mensaje.
   - `Marketplace_APP_KEY/TOKEN no configuradas` → env vars faltantes.
2. Disparar manualmente: `POST /api/sellers/sync-marketplace`. Ver la response.
3. Si Marketplace devuelve 401/403: las credenciales cambiaron. Actualizar en Railway env vars.

### 4.4 "Actualización automática del .exe no funciona"

Diagnóstico:
1. En el cliente Windows, abrir la consola dev (si el build lo permite) o revisar logs de Sentry frontend.
2. `curl /api/updates/latest` → responde con la version esperada?
3. La `signature` en la response es válida para el `.exe` del `RELEASE_URL`?

Causas típicas:
- **Signature no coincide con el .exe**: el `.exe` en GitHub Releases no fue firmado con la key correspondiente al `pubkey` embebido, o `RELEASE_SIGNATURE` está mal copiado. Firmar de nuevo con `tauri-signing.key` y actualizar la env var.
- **`RELEASE_URL` inaccesible**: probar el URL en browser. Si es 404, revisar que el asset esté publicado en el release.
- **Version en `APP_VERSION` no es mayor que la instalada**: el updater compara semver.

### 4.5 "Sentry se llenó de errores repetidos"

- Silenciar temporalmente: en Sentry → issue → Ignore → For N events.
- Para errores conocidos que no queremos ver: agregar filtro en `init_sentry()` (`before_send` hook).
- Cuidado con `ignore_errors` sistemático: podemos ocultar bugs reales.

---

## 5. Escenarios de emergencia

### 5.1 Perdí `FERNET_KEY`

**Consecuencia**: todas las `app_key_enc` / `app_token_enc` de los sellers en DB quedan indescifrables. **Toda operación VTEX rompe**.

**Recuperación**:
- Si tenés el backup en Google Drive / pendrive → restaurar y setearlo en Railway. Los sellers siguen funcionando.
- Si NO tenés backup → generar `FERNET_KEY` nueva. Todos los sellers tienen que re-cargar sus credenciales manualmente. Consumers no operan hasta que se re-carguen (~400 sellers, ~1 día de trabajo).

**Prevención**: mantener 2 copias offline de `FERNET_KEY`. Ver checklist en `CREDENTIALS.md`.

### 5.2 Perdí `JWT_SECRET_KEY`

**Consecuencia**: todos los tokens vigentes quedan inválidos → todos los users deslogueados de golpe.

**Recuperación**: setear una nueva y avisar a los usuarios que vuelvan a loguearse. Menos grave que perder Fernet.

**Nota**: rotar `JWT_SECRET_KEY` es una acción válida para forzar deslogueo global (ej. después de un incidente de seguridad).

### 5.3 Perdí `tauri-signing.key`

**Consecuencia**: no podés emitir nuevas versiones firmadas que el updater instalado acepte.

**Recuperación**:
- Si tenés backup → restaurar y seguir. Ver checklist en CREDENTIALS.md (§ Tauri Updater).
- Si NO tenés backup:
  1. Generar keypair nuevo: `npx @tauri-apps/cli signer generate -w new-key.key`.
  2. Actualizar `pubkey` en `frontend/src-tauri/tauri.conf.json`.
  3. Rebuildear `.exe`, firmar con la nueva key.
  4. **Los usuarios ya instalados no van a poder actualizar** porque su updater tiene el pubkey viejo. Hay que distribuir el nuevo `.exe` manualmente y que reinstalen.

### 5.4 DB corrupta / borrada

1. Railway → Postgres service → Backups. Restore del backup más reciente.
2. Si no hay backup: pérdida total. Los sellers hay que re-cargar de un Excel de export previo. Los users también.

**Prevención**: verificar que Railway tenga backups automáticos habilitados. En el plan actual, Railway hace snapshots diarios por default.

### 5.5 Repositorio GitHub comprometido

- Rotar el PAT (ver CREDENTIALS.md → GitHub).
- Revisar releases publicados por si alguno fue reemplazado con `.exe` malicioso.
- Los usuarios instalados verifican firma → un `.exe` malicioso sin firma válida sería rechazado por el updater. Pero si consiguen la private key rsign, sí podrían firmar. Por eso el backup de la key debe estar offline.

---

## 6. Referencia rápida

### 6.1 Comandos útiles

```bash
# Health check prod
curl <BASE-URL-BACKEND>/health

# Ver la versión que anuncia el updater
curl <BASE-URL-BACKEND>/api/updates/latest | jq

# Correr tests backend
cd backend && pytest

# Correr una migración local
cd backend && alembic upgrade head

# Ver el status Alembic
cd backend && alembic current

# Build del .exe
cd frontend && npm run tauri build

# Firmar el .exe (ver password en CREDENTIALS.md)
npx @tauri-apps/cli signer sign -f "<ruta-a-tauri-signing.key>" -p "<password — ver CREDENTIALS.md>" "path\to\Provincia Ops_X.Y.Z_x64-setup.exe"

# Crear release GitHub
gh release create vX.Y.Z "path\to\setup.exe" --title "vX.Y.Z" --notes "..."
```

### 6.2 URLs

- Backend prod: <BASE-URL-BACKEND>
- Página descarga pública: <BASE-URL-BACKEND>/updates/download
- Railway dashboard, Sentry, GitHub repo y Releases: ver CREDENTIALS.md

### 6.3 Conectarse a la DB desde afuera

`DATABASE_URL` interna de Railway tiene hostname `postgres.railway.internal`, solo accesible desde adentro de la infra Railway. Para conectarte desde tu máquina:

1. Railway → Postgres service → **Connect** → copiar el hostname público (algo como `containers-us-west-XXX.railway.app`) y port.
2. Formar URL: `postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/railway`.
3. Ejemplo con `psql`:
   ```bash
   psql "postgresql://postgres:<PASSWORD>@containers-us-west-XXX.railway.app:6543/railway"
   ```
4. O con DBeaver / TablePlus: mismo URL.

Password: es el mismo que aparece en `DATABASE_URL` interna. Está en CREDENTIALS.md.

### 6.4 Ver logs en Railway

- UI: Railway → deployment → **Deploy Logs** (build/startup) o **Application Logs** (runtime).
- CLI:
  ```bash
  railway logs -s plataforma-ops
  ```
  (requiere `railway login` + `railway link`).

---

## 7. Checklist de release (ticket)

Copiar/pegar en la task del sprint cuando toque releasear:

```
## Release vX.Y.Z

- [ ] Tests backend en verde
- [ ] CHANGELOG.md actualizado
- [ ] BACKLOG.md con HU marcadas
- [ ] Version bumpeada: tauri.conf.json + Cargo.toml
- [ ] git commit + push a main
- [ ] Railway deploy verde + /health OK
- [ ] Migración aplicada (si aplica)
- [ ] npm run tauri build
- [ ] .exe firmado con tauri-signing.key
- [ ] GitHub Release creado + .exe subido
- [ ] Env vars Railway actualizadas (APP_VERSION, RELEASE_URL, RELEASE_DATE, RELEASE_NOTES, RELEASE_SIGNATURE)
- [ ] curl /api/updates/latest devuelve la versión nueva
- [ ] Instalación manual verificada (DoD criteria)
- [ ] Sentry sin errores nuevos
- [ ] Comunicado a usuarios
```

---

## 8. Referencias cruzadas

- [ARCHITECTURE.md](ARCHITECTURE.md) — cómo funcionan las cosas por dentro.
- [API.md](API.md) — referencia de endpoints.
- [DOD.md](DOD.md) — Definition of Done por feature.
- [RETRO.md](RETRO.md) — incidentes pasados y lecciones aprendidas.
- [CHANGELOG.md](CHANGELOG.md) — historial versión por versión.
- `CREDENTIALS.md` — cuentas, tokens, secrets (gitignored).
