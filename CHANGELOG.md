# Changelog — Plataforma Operativa

Todos los cambios importantes del proyecto se documentan acá.
Formato: [versión] — fecha — descripción

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
- Deploy backend en Railway (plataforma-ops-production.up.railway.app)
- EXE instalable para Windows generado con Tauri 2
- SSH hardened en VM Ubuntu (clave ED25519, puerto 2222, fail2ban)
- Repositorio privado en GitHub: juanmatheomoyano/plataforma-ops

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
