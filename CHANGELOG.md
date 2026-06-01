# Changelog — Provincia Ops

Todos los cambios importantes del proyecto se documentan acá.
Formato: [versión] — fecha — descripción

---

## [1.6.2] — 2026-06-01 — Fix: export Excel Dashboard respeta grupos y eventos seleccionados

### Frontend
- **Un único botón Excel** reemplaza los dos anteriores (backend-export y DashboardTable-export)
- El export genera un archivo multi-hoja:
  - **Dashboard**: columnas exactas según grupos de cuotas activados + columnas de eventos seleccionados + columna Motivos
  - **Detalle**: todas las reglas procesadas con seller, brand, level, estado, resultado
- El botón queda deshabilitado mientras carga la validación de eventos para evitar exportar datos incompletos

---

## [1.6.1] — 2026-05-29 — Fix: eventos próximos visibles en CRUD Read

### Backend
- `GET /api/eventos/vigentes`: ahora devuelve eventos activos vigentes **y próximos** (`fecha_fin >= now`, sin requerir que ya hayan comenzado). Permite seleccionar un evento futuro para validar antes de que empiece.

### Frontend
- CRUD Read — panel Validación: los chips de eventos ahora muestran también eventos próximos con badge `PRÓX` (azul) para distinguirlos de los ya vigentes.
- Sección renombrada de "Eventos vigentes a validar" → "Eventos a validar"

---

## [1.6.0] — 2026-05-29 — Módulo Eventos + validación integrada en CRUD Read

### Backend
- Nuevo módulo `eventos`: CRUD completo de eventos planificados (POST/GET/PUT/PATCH/DELETE)
- Modelo BD: tabla `eventos` con nombre, fechas UTC, cuotas requeridas, scope, is_active, creado_por
- Migración Alembic: `f1a2b3c4d5e6_create_eventos`
- Endpoint `GET /api/eventos/vigentes`: devuelve eventos activos cuya ventana cubre el momento actual (accesible a cualquier usuario autenticado)

### Frontend — Módulo Eventos (solo admin)
- Reemplaza la antigua página "Validación de Eventos"
- **Tab "Administrar eventos"** (default): tabla de todos los eventos con badge VIGENTE, acciones editar / activar-desactivar / eliminar; modal de edición completo
- **Tab "Crear evento"**: formulario simple (nombre, cuotas preset, fechas ART, scope opcional) → guarda directamente en BD sin validar, redirige a Administrar

### Frontend — CRUD Medios de Pago: Read mejorado
- Nuevo panel **"Validación"** visible solo cuando operacion=Read
- **Grupos de cuotas**: chips seleccionables (1 pago / 6c / 9c / 12c / 18c / 24c) — la tabla Dashboard muestra solo las columnas activadas
- **Eventos vigentes**: chips por cada evento activo hoy; al seleccionar uno y ejecutar el Read, se valida ese evento por seller y aparece como columna adicional en el Dashboard (Ok / ✗ / —)
- Las fechas del evento se convierten correctamente de UTC a ART antes de llamar al validador

---

## [1.5.1] — 2026-05-29 — Fix light mode completo

### Frontend
- Migración completa a tokens semánticos en todos los componentes que habían quedado fuera de v1.5.0
- Badges de estado (Dashboard, Users, Sellers): dual `dark:`/light — light usa `bg-*-50 text-*-700`, dark mantiene el look neon
- CRUD OperacionSelector: botones C/R/U/D legibles en light mode, neon preservado en dark; chips de firmas/levels y aviso destructivo corregidos
- Validación de Eventos (ValidacionEventosPage, EventoConfigPanel, EventoResultsTable): migración completa de `slate-*` hardcodeados a tokens semánticos
- DashboardTable (CRUD Read): ídem, celdas de estado con variantes dual dark:/light
- `checkbox.jsx` y `tabs.jsx`: migrados a tokens (`border-input`, `bg-background`, `bg-muted`, `data-[state=checked]:bg-primary`)
- Botón "Validar evento" migrado a `bg-primary` (verde marca) en lugar de indigo hardcodeado

---

## [1.5.0] — 2026-05-29 — Brand redesign completo

### Frontend
- Tipografía: Encode Sans (fuente oficial Provincia Compras), pesos 300–700 desde `/public/fonts/`
- Colores de marca: Verde `#279D2E` como `--primary`, Cyan `#25B4BD`, Gris `#3C3C3B`
- Dark/Light mode: ThemeContext con localStorage, toggle en ConfiguracionPage
- Logo SVG oficial `logo_provincia_compras-02.svg` en sidebar y login
- Sistema de tokens semánticos completo: 22 archivos migrados de `slate-*` hardcodeados a tokens CSS
- Ruta `/configuracion`: toggle dark/light + cambio de contraseña (unificado desde sidebar)

---

## [1.4.6] — 2026-05-29 — Export Excel completo en Validación de Eventos

### CRUD / Validación de Eventos
- Nuevo: Export Excel del evento con 4 hojas: RESUMEN, VALIDACION_EVENTO, PAGOS_CONSOLIDADO, ERRORES
- PAGOS_CONSOLIDADO incluye detalle de todas las reglas procesadas por seller

---

## [1.4.5] — 2026-05-29 — Fix validación eventos

### Backend
- Corregido: cuotas superiores al máximo del evento ahora se marcan como "A corregir" (antes se ignoraban)

---

## [1.4.4] — 2026-05-28 — Fix presets de cuotas

### Backend
- Corregido: reglas con solo cuotas 1, 3 o 6 se excluyen correctamente de la validación de eventos
- Corregido: presets de cuotas corregidos (9→{9}, 12→{9,12}, 18→{9,12,18}, 24→{9,12,18,24})

---

## [1.4.0] — 2026-05-28 — Validación de Eventos + Dashboard Read enriquecido

### Nuevo módulo: Validación de Eventos
- Verifica que sellers tengan reglas _LC con cuotas altas (9+) para un evento dado
- Parámetros: nombre, fechas inicio/fin (ART), cuotas requeridas (preset)
- Estados: Ok / A corregir / No configurado, con motivos detallados
- Export Excel del resultado

### CRUD Medios de Pago — Read enriquecido
- Dashboard de grupos por seller (1 pago, 6c, 9c, 12c, 18c, 24c)
- Estados: Ok (vigente) / Ok (programado) / Ok (inactiva) / A corregir / No configurado
- Filtros por estado con chips, expansión de motivos por fila

---

## [1.3.3] — 2026-05-28 — Fix CREATE connector

### Backend
- Corregido: CREATE fallaba con 400 "Connector object can not be null"
- Fix: extraer connector de las reglas existentes del seller antes de crear nuevas

---

## [1.3.2] — 2026-05-27 — Create rediseño completo + nombres español + filtros bloqueados

### CRUD Medios de Pago
- Nuevo: Create ahora genera múltiples reglas por combinación de firma × level (N firmas × M levels por seller)
- Nuevo: Formulario Create con chips de firmas (Visa/Mastercard/Electron), chips de levels, cuotas como texto libre y preview de nombres generados
- Nuevo: Fechas de Create con hora (fecha+hora hora local AR convertida a UTC)
- Nuevo: Filtros bloqueados (pointer-events-none) con badge "Los filtros aplican solo a Leer" cuando se selecciona C/U/D
- Mejorado: Nombres de operaciones en español (Crear/Leer/Actualizar/Eliminar)
- Mejorado: Update usa chips de level (string) y cuotas como texto libre separado por comas
- Corregido: Filtro de levels ahora usa cardLevel.name (string) en lugar de valor numérico
- Corregido: Cuotas exacta ahora requiere igualdad de set (alineado con script v6)
- Corregido: Filtro de horario ahora soporta "include" (exacto) y "exclude" solamente
- Corregido: Filtro de brands ahora usa paymentSystem.id (alineado con script v6)
- Corregido: execute_update ahora descifra credenciales correctamente y construye cuerpo VTEX alineado con script v6

---

## [1.3.1] — 2026-05-26 — Rediseño filtros CRUD

### CRUD Medios de Pago
- Rediseñado: orden de operaciones ahora es Create → Read → Update → Delete
- Mejorado: operación seleccionada resaltada, las demás opacadas
- Mejorado: Brand con todos seleccionados por defecto
- Mejorado: Levels como chips seleccionables con valores reales (sin texto libre)
- Mejorado: Conector como select (Payway, Decidir, Todos)
- Mejorado: Cuotas con campo más grande y claro (acepta múltiples valores separados por coma)
- Mejorado: Horario con opciones Exacta/Incluye/Excluye
- Mejorado: Filtros posicionados debajo del selector de operación

---

## [1.3.0] — 2026-05-25 — Exportar/Importar Sellers y Usuarios

### Sellers
- Nuevo: Exportar tabla completa a Excel (sin credenciales) — disponible para admin y analista_senior
- Nuevo: Importar Excel para actualizaciones masivas (actualiza existentes, crea nuevos con credenciales vacías)
- Nuevo: Seller ID editable en formulario de edición

### Usuarios
- Nuevo: Exportar lista de usuarios a Excel (sin contraseñas)
- Nuevo: Importar usuarios desde Excel (actualiza existentes, crea nuevos con contraseña Provincia.2026)

---

## [1.2.1] — 2026-05-25 — Cambio de contraseña propio + filtros CRUD + limpieza historial

### Usuarios
- Nuevo: Botón "Cambiar contraseña" en el sidebar (disponible para todos los roles)
- Nuevo: Modal con validación de contraseña actual, nueva y confirmación

### CRUD Medios de Pago
- Nuevo: Filtros por columna en tabla de resultados (Seller, Brand, Level, Estado, Resultado)
- Nuevo: Botón "Limpiar filtros" cuando hay filtros activos

### Backend
- Nuevo: Endpoint POST /api/users/me/change-password (autenticado, cualquier rol)
- Nuevo: Limpieza automática de historial al iniciar el servidor (operaciones con más de 90 días)
- Nuevo: Endpoint POST /api/crud-medios/cleanup (solo admin)

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
