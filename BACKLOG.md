# Backlog de mejoras — Plataforma Operativa

---

## Dashboard
- [x] Últimas 5 operaciones del usuario logueado
- [x] Accesos rápidos a módulos según rol
- [x] Admin / Analista Senior: contador sellers activos / inactivos / keys vencidas
- [x] Admin / Analista Senior: total operaciones del día
- [x] Admin: total usuarios activos + último usuario que operó

---

## Usuarios
- (sin cambios por ahora)

---

## Sellers

### Tabla
- [x] Buscador global
- [x] Filtros por columna (Estado Keys, Vendiendo, Estado, Analista)
- [x] Scroll horizontal visible / tabla con scroll interno fijo

### Formulario
- [x] Seller ID visible y editable
- [x] Aclaración confidencialidad en App Key y App Token
- [ ] Campo Analista: select con usuarios activos (admin, analista_senior, analista)
- [ ] Campo Fecha de creación: DatePicker con calendario
- [ ] Campo Integración: select con lista predefinida + "Nueva integración..." registrada para todos
  - Lista: Base, Desarrollo propio, DUX Software, EcomExperts, Externa, Fulljaus, Grow2On de Wualá, Heaven, Hypevar, Manual, No VTEX, Pierce, Producteca, Propia, Seller Manager, Sincroshops, Yiqi
- [ ] Campo Especificación: aparece solo si es Manual o Propia, select dinámico + "Nueva especificación..."
- [ ] Tabla integracion_specs en BD

---

## CRUD Medios de Pago

### Ejecución
- [x] Ocultar Dry Run en Read
- [x] Brand y Level corregidos en tabla de resultados

### Tabla de resultados
- [x] Exportar Excel (.xlsx) con diálogo nativo de guardado
- [x] Scroll interno fijo en tabla
- [ ] Filtros por columna en tabla de resultados

---

## General
- [x] Auto-update de Tauri 2
- [ ] Limpieza automática de historial: borrar operaciones con más de 90 días
