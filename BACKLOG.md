# Backlog de mejoras — Plataforma Operativa

---

## Dashboard
- [ ] Últimas 5 operaciones del usuario logueado (fecha, tipo R/C/U/D, sellers, resultado)
- [ ] Accesos rápidos a los módulos disponibles según rol
- [ ] Admin / Analista Senior: contador de sellers activos / inactivos / keys vencidas + alerta si hay vencidas
- [ ] Admin / Analista Senior: total de operaciones ejecutadas hoy en toda la plataforma
- [ ] Admin: total de usuarios activos + último usuario que ejecutó una operación

---

## Usuarios
- (sin cambios por ahora)

---

## Sellers

### Tabla
- [ ] Buscador global que filtre en todos los resultados (nombre, seller id, id ecommerce, analista)
- [ ] Filtros por columna: Estado Keys, Vendiendo, Estado (activo/inactivo), Analista
- [ ] Barra de scroll horizontal visible

### Formulario de alta/edición
- [ ] Campo Seller ID: visible y editable
- [ ] Campo Analista: select con usuarios activos (roles: admin, analista_senior, analista — excluye viewers)
- [ ] Campo Fecha de creación: DatePicker con calendario
- [ ] Campo Integración: select con lista predefinida + opción "Nueva integración..." que queda registrada para todos
  - Lista base: Base, Desarrollo propio, DUX Software, EcomExperts, Externa, Fulljaus, Grow2On de Wualá, Heaven, Hypevar, Manual, No VTEX, Pierce, Producteca, Propia, Seller Manager, Sincroshops, Yiqi
- [ ] Campo Especificación de integración: aparece solo si se elige Manual o Propia. Select dinámico con opciones ya registradas + "Nueva especificación..." que queda guardada para todos
- [ ] App Key y App Token: mostrar aclaración "Una vez guardado no podrás ver este valor nuevamente" en alta y edición
- [ ] Tabla integracion_specs en BD para almacenar opciones creadas por usuarios

---

## CRUD Medios de Pago

### Ejecución
- [ ] Ocultar toggle Dry Run cuando la operación seleccionada es Read
- [ ] Brand y Level muestran — en todos los resultados — investigar si el backend no los devuelve o el frontend no los mapea

### Tabla de resultados
- [ ] Exportar: reemplazar CSV por Excel (.xlsx) y corregir que no abre explorador ni descarga nada
- [ ] Buscador global en la tabla de resultados
- [ ] Filtros por columna en la tabla de resultados

---

## General
- [ ] Auto-update de Tauri 2: al abrir el EXE chequea versión nueva, descarga en segundo plano y notifica para instalar con un click

---
Última actualización: Mayo 2026
