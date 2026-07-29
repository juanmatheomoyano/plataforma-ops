# Definition of Done — Provincia Ops

Una historia está "hecha" solo si cumple **todos** estos criterios. No es "casi terminado" hasta que esté acá.

---

- [ ] **Código funciona local** — probado en `npm run tauri dev` o `uvicorn --reload` contra la BD real, no solo compila.
- [ ] **Migración aplicada y reversible** — si hay cambios de modelo: `alembic upgrade head` OK y `alembic downgrade -1` no rompe.
- [ ] **Permisos verificados por rol** — probar al menos con el rol de mayor privilegio y uno sin permiso; que el sin-permiso vea 403 o botón deshabilitado.
- [ ] **Deploy Railway verde** — el health check pasa y los logs de startup no muestran warnings nuevos.
- [ ] **Feature probada en el .exe instalado** (no solo en dev) para cambios de frontend / Tauri.
- [ ] **CHANGELOG.md actualizado** con la nueva versión (semver) y descripción.
- [ ] **BACKLOG.md actualizado** — historia marcada ✅ con el número de versión donde se cerró.
- [ ] **README.md actualizado** si cambia la superficie pública: nuevas env vars, módulos, endpoints documentados.
- [ ] **Sin secretos en el repo** — grep de `password|token|key` sobre el diff antes de commitear.
- [ ] **Retro actualizado** si algo salió mal, se descubrió una zona peligrosa, o funcionó un patrón repetible.

---

## Reglas específicas por tipo de cambio

**Cambios de rol / permisos**
- Actualizar `RoleRoute` en `App.jsx`, `Sidebar.jsx`, `dependencies=[...]` en routers, y validaciones de UI.
- Regla: si tocás uno, revisá los otros tres.

**Cambios en Alembic**
- Nunca modificar una migración ya aplicada en producción → crear una nueva.
- Verificar el `down_revision` apunta a la migración correcta (no a la anterior de tu working copy).

**Nuevas env vars**
- Agregar a `backend/.env.example` con placeholder y comentario.
- Documentar en `README.md` sección "Variables de entorno".
- Cargar en Railway **antes** de mergear (si no, deploy falla).

**Release oficial**
- Bump versión en `frontend/src-tauri/tauri.conf.json` y `README.md`.
- Build NSIS firmado.
- GitHub Release con el `.exe` adjunto.
- Env vars Railway: `APP_VERSION`, `RELEASE_URL`, `RELEASE_DATE`, `RELEASE_NOTES`, `RELEASE_SIGNATURE`.
