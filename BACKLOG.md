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
- [x] Campo Analista: select con usuarios activos (admin, analista_senior, analista)
- [x] Campo Fecha de creación: DatePicker con calendario
- [x] Campo Integración: select con lista predefinida + "Nueva integración..." registrada para todos
- [x] Campo Especificación: aparece solo si es Manual o Propia, select dinámico + "Nueva especificación..."
- [x] Tabla integracion_specs en BD

---

## CRUD Medios de Pago

### Ejecución
- [x] Ocultar Dry Run en Read
- [x] Brand y Level corregidos en tabla de resultados

### Tabla de resultados
- [x] Exportar Excel (.xlsx) con diálogo nativo de guardado
- [x] Scroll interno fijo en tabla
- [x] Filtros por columna en tabla de resultados

---

## General
- [x] Auto-update de Tauri 2
- [x] Limpieza automática de historial: borrar operaciones con más de 90 días
- [x] Cambio de contraseña propio (sidebar, cualquier rol)

---

## Próximos pasos — Sprint 2

### 1. Módulo Eventos (reemplaza Validación de Eventos) ✓ (v1.6.3, 2026-06-01)
- [x] Renombrar "Validación de Eventos" → "Eventos", acceso solo admin
- [x] Tab "Crear evento": formulario simple que guarda en BD sin validar (nombre, cuotas, fechas, scope)
- [x] Tab "Administrar eventos": tabla con badge VIGENTE, editar / activar-desactivar / eliminar
- [x] Modelo BD: tabla `eventos` (nombre, fecha_ini, fecha_fin, cuotas_requeridas, max_cuota, scope_seller_ids, creado_por, is_active)
- [x] CRUD Read — panel de validación: chips de grupos de cuotas (1p/6c/9c/12c/18c/24c) seleccionables; chips de eventos vigentes y próximos seleccionables → columnas adicionales en Dashboard por seller
- [x] CRUD Read — export Excel: un único botón genera Dashboard (grupos + eventos + motivos) + Detalle (reglas), respetando exactamente lo que el usuario activó

### 2. Filtro de analista en CRUD Read
- [ ] En el módulo CRUD Medios de Pago, operación Read: agregar filtro "Analista" al scope selector
- [ ] Al seleccionar un analista, el scope se limita automáticamente a los sellers asignados a ese analista
- [ ] El filtro debe mostrar solo analistas con sellers activos asignados

### 3. Desencriptar y exponer credenciales VTEX (solo admin)
- [ ] Agregar endpoint `GET /api/sellers/{id}/credentials` (solo admin) que devuelva `app_key` y `app_token` desencriptados
- [ ] En la UI de Sellers: solo admins ven botón "Ver credenciales" que abre un modal con las keys visibles (con advertencia de confidencialidad)
- [ ] El export de Excel de Sellers (solo admin) debe incluir opción de exportar con o sin credenciales desencriptadas
- [ ] Registrar en auditoría cada acceso a credenciales (quién, cuándo, qué seller)
- [ ] Roles no-admin: sin cambios, solo lectura de datos no sensibles

### 4. Dashboard personalizado por rol con gráficos
- [ ] Reemplazar el dashboard actual por uno con gráficos dinámicos según el rol del usuario
- [ ] Implementar gráficos de torta y métricas actualizadas (frecuencia a definir: horaria o diaria)
- [ ] Admin: visión completa — sellers activos/inactivos, operaciones por módulo, usuarios activos, actividad reciente
- [ ] Analista Senior: sellers de su área, estado de eventos vigentes, operaciones del día
- [ ] Analista: solo sus sellers asignados y métricas propias
- [ ] Viewer: métricas de solo lectura
- [ ] Definir librería de gráficos (Recharts ya disponible en el stack)
- [ ] Las actualizaciones automáticas (polling o WebSocket) se definirán en iteración siguiente

### 5. Optimización de almacenamiento — historial ligero
- [ ] Cambiar modelo de historial: dejar de guardar el detalle de cada regla procesada (tabla `crud_operation_rows` o similar)
- [ ] Solo persistir: quién ejecutó, qué operación, qué módulo, cuándo, scope utilizado, cantidad de registros afectados, resultado general (ok / error / parcial)
- [ ] Los resultados detallados se muestran en frontend en el momento y se pueden exportar — no se persisten
- [ ] Eliminar limpieza automática de 90 días (ya no necesaria si no se guarda detalle)
- [ ] Revisar y ajustar retención: el log de auditoría liviano puede mantenerse indefinidamente
- [ ] Aplica también al módulo Eventos (reemplaza Validación de Eventos)

### 6. Revisión de accesibilidad visual — colores ✓ (v1.5.1, 2026-05-29)
- [x] Auditar componentes con bajo contraste
- [x] Badges de estado (Dashboard, Users, Sellers): dual `dark:`/light — light usa `bg-*-50 text-*-700`, dark mantiene el look neon
- [x] CRUD OperacionSelector: botones C/R/U/D legibles en light, neon en dark; chips de firmas/levels y aviso destructivo corregidos
- [x] Validación de Eventos (ValidacionEventosPage, EventoConfigPanel, EventoResultsTable): migración completa a tokens semánticos
- [x] DashboardTable (CRUD Read): migración completa, celdas de estado con dual dark:/light
- [x] `checkbox.jsx` y `tabs.jsx`: migrados a tokens (`border-input`, `bg-background`, `bg-muted`, `data-[state=checked]:bg-primary`)
