# Changelog — Plataforma Operativa

Todos los cambios importantes del proyecto se documentan acá.
Formato: [versión] — fecha — descripción

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
