# Sprints — Provincia Ops

Sprints de 2 semanas. Un tema de foco por sprint. **No es un commitment rígido**: si sale un bug crítico, el sprint se rompe y está bien. Las historias detalladas viven en [BACKLOG.md](BACKLOG.md).

**Convención de tamaños:** XS (<2h) · S (medio día) · M (1-2 días) · L (3-5 días) · XL (partir en más chico)

---

## 🚧 Sprint activo

### Sprint 1 — Estabilización crítica
**Fechas:** 2026-07-02 → 2026-07-16
**Foco:** tapar los 5 críticos de la auditoría antes de sumar features nuevas. La app tiene que ser confiable antes de crecer.

**Historias**
- [x] [HU-01](BACKLOG.md#hu-01) Dashboard con rol correcto — 🔴 S ✅
- [x] [HU-02](BACKLOG.md#hu-02) CORS restringido con test de regresión — 🔴 S ✅
- [x] [HU-03](BACKLOG.md#hu-03) Startup sync fuera del lifespan — 🔴 M ✅
- [x] [HU-04](BACKLOG.md#hu-04) APScheduler con lock DB — 🔴 M ✅
- [x] [HU-05](BACKLOG.md#hu-05) Export sellers con password Excel + auditoría — 🔴 M ✅
- [x] [HU-06](BACKLOG.md#hu-06) Sentry integrado backend + frontend — 🟡 M ✅
- [x] [HU-07](BACKLOG.md#hu-07) Matriz de tests de permisos por rol — 🟡 L ✅

**Total:** ~7-10 días de trabajo. Buffer para bugfixes.

**Riesgos**
- Sentry SDK gratis tiene rate limit — verificar plan.
- Lock DB para APScheduler puede requerir tabla nueva (`scheduler_locks`) — cuidado con migración.
- Restringir CORS puede romper el .exe si el origen Tauri no está en la lista → probar en instalador antes de mergear.

---

## 📋 Sprints planificados

### Sprint 2 — Observabilidad + Auditoría + UX post-update
**Target release:** v1.7.9
**Foco:** saber qué pasa en la app sin depender del usuario que reporte + avisarle al usuario cuando la app se actualizó.
- [ ] HU-08 Tabla `audit_log` + interceptor SQLAlchemy — L
- [ ] HU-09 Página `/auditoria` (solo admin) con filtros — M
- [ ] HU-10 Logs estructurados JSON en backend — S
- [ ] HU-11 GitHub Action con `alembic check` + `pytest` en cada PR — M
- [ ] HU-37 Modal "¿Qué hay de nuevo?" post-update — S

### Sprint 3 — Dashboard funcional v2
**Foco:** el dashboard es la primera pantalla, tiene que ser útil, no decorativa.
- [ ] HU-12 Endpoint `/dashboard/summary` con KPIs, series, alerts — L
- [ ] HU-13 Dashboard por rol con Recharts — L
- [ ] HU-14 TanStack Query + polling 60s — M
- [ ] HU-15 Centro de alertas (bell icon en header) — M

### Sprint 4 — Sellers pro
**Foco:** operar sellers al volumen real (400+) sin fricción.
- [ ] HU-16 Alertas de keys por vencer (30/15/7d) — M
- [ ] HU-17 Bulk actions en tabla (selección múltiple) — L
- [ ] HU-18 Test-connection agendado + auto-mark vencido — M
- [ ] HU-19 Historial de cambios en seller — M

### Sprint 5 — CRUD pro
**Foco:** el módulo que más se usa. Menos clicks, más control.
- [ ] HU-20 Plantillas de filtros guardables por analista — M
- [ ] HU-21 Diff preview real (no solo dry-run) — L
- [ ] HU-22 Undo/rollback última operación — L
- [ ] HU-23 Programar operaciones diferidas — L

### Sprint 6 — Eventos pro
**Foco:** eventos como planificación real, no como formulario aislado.
- [ ] HU-24 Calendario visual (mensual/semanal) — L
- [ ] HU-25 Estado computado del evento (Programado/Vigente/Finalizado) — S
- [ ] HU-26 Snapshot post-mortem al finalizar evento — M

---

## 🧊 Backlog frío

Historias válidas pero sin sprint asignado. Se revisan al cerrar Sprint 6.
- HU-27 API pública con API keys para sistemas externos
- HU-28 Multi-tenant / multi-cuenta VTEX
- HU-29 Módulo Catálogo VTEX (activar/desactivar categorías)
- HU-30 Módulo Shipping Policies
- HU-31 Módulo Prices Simulator (validar precios vs. políticas)
- HU-32 Panel admin de cron jobs configurables
- HU-33 Webhooks salientes para sistemas suscriptos
- HU-34 Forzar cambio de contraseña en primer login
- HU-35 Bloqueo de cuenta tras N intentos fallidos
- HU-36 Dashboard personalizable (reordenar/ocultar cards)

---

## ✅ Sprints cerrados

*(pendiente — se llena al cerrar Sprint 1)*
