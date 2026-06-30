# Manual de usuario — Provincia Ops

**Provincia Compras · Herramienta operativa interna**
Versión 1.7.2

---

## Índice

1. [¿Qué es Provincia Ops?](#1-qué-es-provincia-ops)
2. [Instalación](#2-instalación)
3. [Primer ingreso — cambio de contraseña obligatorio](#3-primer-ingreso--cambio-de-contraseña-obligatorio)
4. [La pantalla principal](#4-la-pantalla-principal)
5. [Roles y permisos](#5-roles-y-permisos)
6. [Módulo Sellers](#6-módulo-sellers)
7. [Módulo CRUD Medios de Pago](#7-módulo-crud-medios-de-pago)
8. [Módulo Eventos](#8-módulo-eventos)
9. [Módulo Usuarios](#9-módulo-usuarios)
10. [Configuración personal](#10-configuración-personal)
11. [Actualizaciones automáticas](#11-actualizaciones-automáticas)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. ¿Qué es Provincia Ops?

Provincia Ops es una herramienta de escritorio exclusiva para el equipo interno de Provincia Compras. Permite gestionar de forma masiva las reglas de medios de pago de los sellers que operan en el marketplace, consultar su estado, y coordinar eventos comerciales (Hot Sale, Cyber Monday, etc.).

**No es una aplicación web** — se instala en tu computadora Windows y se conecta de forma segura a los servidores de Provincia Compras.

---

## 2. Instalación

1. Entrá al link de descarga que te compartió el administrador
2. Descargá el archivo `.exe` (aproximadamente 10 MB)
3. Ejecutá el instalador haciendo doble clic
4. Seguí los pasos del instalador (siguiente → siguiente → instalar)
5. Al terminar, buscá **"Provincia Ops"** en el menú inicio o en el escritorio

> **Nota:** Si Windows muestra una advertencia de seguridad ("aplicación desconocida"), hacé clic en **"Más información"** y luego en **"Ejecutar de todos modos"**. Es seguro — la advertencia aparece porque el instalador es interno y no está firmado por Microsoft.

---

## 3. Primer ingreso — cambio de contraseña obligatorio

### Contraseña inicial

Cuando el administrador crea tu usuario, la contraseña predeterminada es:

```
Provincia.2026
```

> ⚠️ **Importante:** Esta contraseña es temporal y genérica. **Debés cambiarla antes de usar la aplicación.** Si no la cambiás, cualquier persona que conozca esta contraseña podría acceder con tu usuario.

### Cómo iniciar sesión

1. Abrí la aplicación
2. En la pantalla de login, ingresá tu **usuario** (te lo da el administrador) y la contraseña `Provincia.2026`
3. Hacé clic en **"Ingresar"**

### Cómo cambiar la contraseña

1. Una vez adentro, mirá la barra lateral izquierda
2. Hacé clic en **"Configuración"** (ícono de engranaje, al fondo del menú)
3. En la sección **"Cambiar contraseña"**, completá:
   - **Contraseña actual:** `Provincia.2026`
   - **Nueva contraseña:** la que elegís vos (mínimo 8 caracteres, recomendamos incluir mayúsculas, números y un símbolo)
   - **Confirmar nueva contraseña:** repetí la nueva
4. Hacé clic en **"Guardar"**

✅ Listo. A partir de ahora usás tu contraseña nueva cada vez que entrés.

---

## 4. La pantalla principal

Al ingresar vas a ver el **Dashboard** — la pantalla de inicio con un resumen de actividad.

### Qué hay en el Dashboard

- **Saludo con tu nombre y rol** (arriba a la izquierda)
- **Métricas de sellers** *(visible según tu rol)*: sellers activos, inactivos, y con keys vencidas
- **Operaciones del día**: cuántas acciones se ejecutaron hoy en total
- **Accesos rápidos**: botones para ir directo a cada módulo disponible
- **Últimas operaciones**: las 5 últimas acciones que vos (o el equipo, si sos admin/supervisor) ejecutaron

### La barra lateral

En el costado izquierdo de la pantalla está el **menú de navegación**. Desde ahí accedés a todos los módulos. Lo que ves depende de tu rol:

| Sección | ¿Quién la ve? |
|---|---|
| Dashboard | Todos |
| Sellers | Admin, Supervisor, Analista |
| CRUD Medios de Pago | Todos |
| Eventos | Admin, Supervisor |
| Usuarios | Admin, Supervisor |
| Configuración | Todos |

---

## 5. Roles y permisos

Cada usuario tiene un rol que determina qué puede ver y hacer dentro de la aplicación.

| Rol | Descripción |
|---|---|
| **Admin** | Acceso total. Puede hacer todo: gestionar usuarios, sellers, eventos, y ejecutar operaciones reales en VTEX |
| **Supervisor** | Ve todo lo que ve el admin, puede gestionar sellers y eventos, pero **no puede ejecutar operaciones reales de escritura en VTEX** (solo lectura y simulación) |
| **Analista** | Puede ver y editar sellers. Ejecuta operaciones de lectura en VTEX. No puede ejecutar Crear/Actualizar/Eliminar reglas reales |
| **Viewer** | Solo lectura. Ve el dashboard y el módulo CRUD (solo lectura), sin poder modificar nada |

> Si creés que tu rol no refleja lo que necesitás para trabajar, contactá al administrador.

---

## 6. Módulo Sellers

En este módulo se gestionan todos los sellers que operan en el marketplace de Provincia Compras.

### Cómo llegar

Hacé clic en **"Sellers"** en el menú lateral izquierdo.

### Qué vas a ver

Una tabla con todos los sellers registrados, con columnas de:
- **Id Ecommerce** — identificador interno
- **Nombre** — nombre de fantasía del seller
- **Seller ID** — ID en VTEX
- **Analista** — analista asignado a ese seller
- **Estado Keys** — si las credenciales VTEX están activas, inactivas o vencidas
- **Vendiendo** — si el seller está actualmente activo en el marketplace
- **Estado** — si el seller está habilitado en la plataforma

### Buscar y filtrar

Arriba de la tabla hay una **barra de búsqueda** y varios **filtros**:

- Escribí en el buscador para encontrar un seller por nombre, ID o analista
- Usá los desplegables para filtrar por **Estado Keys**, **Vendiendo**, **Estado** o **Analista**

### Agregar un seller nuevo *(Admin, Supervisor, Analista)*

1. Hacé clic en el botón **"+ Nuevo seller"** (arriba a la derecha)
2. Completá el formulario:
   - **Id Ecommerce** y **Seller ID** — te los da el seller
   - **Nombre de fantasía** — el nombre que se muestra
   - **App Key** y **App Token** — las credenciales VTEX del seller (confidenciales)
   - **Analista** — seleccioná quién lo gestiona
   - **Integración** — cómo está integrado el seller
   - Los demás campos son opcionales
3. Hacé clic en **"Guardar"**

### Editar un seller *(Admin, Supervisor, Analista)*

1. Encontrá el seller en la tabla
2. Hacé clic en el ícono de **lápiz** ✏️ en la columna de acciones (derecha de la fila)
3. Modificá lo que necesitás y guardá

### Probar la conexión VTEX *(Admin, Supervisor)*

Sirve para verificar que las credenciales de un seller estén funcionando:

1. Hacé clic en el ícono de **enchufe** 🔌 en la fila del seller
2. La app va a conectarse a VTEX y te va a mostrar si la conexión fue exitosa o falló

### Exportar e importar sellers *(Admin, Supervisor)*

**Exportar:** hacé clic en **"Exportar Excel"** para descargar la lista completa de sellers con todas sus credenciales en un archivo `.xlsx`. Usá este archivo con cuidado — contiene información confidencial.

**Importar:** si necesitás actualizar datos de varios sellers a la vez, podés modificar el Excel exportado y subirlo con el botón **"Importar Excel"**. La app va a actualizar los registros existentes o crear los nuevos.

---

## 7. Módulo CRUD Medios de Pago

Este es el módulo principal. Permite consultar y modificar en masa las **reglas de pago VTEX** de los sellers — es decir, qué tarjetas aceptan, en cuántas cuotas, y cuándo.

### Cómo llegar

Hacé clic en **"CRUD Medios de Pago"** en el menú lateral.

### Las dos pestañas

Al entrar vas a ver dos pestañas:
- **Ejecutar** — para lanzar operaciones
- **Historial** — para ver operaciones anteriores

---

### Pestaña Ejecutar

Tiene cuatro secciones que se completan de arriba hacia abajo:

#### Sección 1 — Scope / Sellers (¿a quiénes aplica?)

Elegí sobre qué sellers va a ejecutarse la operación:

| Modo | Cuándo usarlo |
|---|---|
| **Todos los sellers activos** | La operación aplica a todos |
| **Por analista** | Seleccionás un analista y aplica solo a sus sellers |
| **Seller específico** | Buscás y seleccionás un solo seller |
| **Lista de sellers** | Seleccionás varios sellers individualmente |

#### Sección 2 — Operación (¿qué querés hacer?)

Seleccioná la operación:

- **Crear** — crea reglas de pago nuevas para los sellers del scope
- **Leer** — consulta las reglas existentes sin modificar nada *(disponible para todos)*
- **Actualizar** — modifica reglas existentes que cumplan los filtros
- **Eliminar** — elimina reglas que cumplan los filtros

> ⚠️ **Crear, Actualizar y Eliminar en modo real solo lo puede ejecutar el Admin.** El resto de los roles puede hacer estas operaciones en modo simulación (Dry Run).

#### Sección 3 — Validación *(solo aparece en Leer)*

Al seleccionar la operación **Leer**, aparece un panel de validación con dos tipos de chips:

**Grupos de cuotas:** chips que representan los grupos de cuotas configurados (1 pago, 6 cuotas, 9 cuotas, etc.). Seleccioná los que querés ver en el resultado — así el Dashboard solo muestra las columnas que te interesan.

**Eventos:** chips que muestran los eventos vigentes o próximos (ej: Hot Sale). Al seleccionar uno, la operación valida si cada seller tiene las reglas correctas para ese evento.

#### Sección 4 — Filtros

Permiten acotar qué reglas se ven o se modifican. Podés filtrar por:
- **Brand** (Visa, Mastercard, Electron)
- **Level** (Gold, Platinum, etc.)
- **Estado** (activo/inactivo)
- **Nombre** de la regla
- **Conector** (Payway, Decidir)
- **Cuotas** (exactas o que contengan ciertos valores)
- **Fechas** de vigencia
- **Horario**

> Si la operación es Crear, los filtros no aplican (aparece un aviso).

#### Dry Run (simulación)

Para operaciones de escritura (Crear, Actualizar, Eliminar) hay un toggle llamado **"Dry Run"**. Cuando está activado, la operación se **simula** sin hacer cambios reales en VTEX. Usalo siempre primero para verificar que el resultado es el esperado.

#### Ejecutar

Cuando todo está configurado, hacé clic en el botón **"Ejecutar"**.

- Si es Eliminar en modo real, la app va a pedir una confirmación adicional
- Mientras corre, vas a ver un indicador de carga
- Al terminar, aparece el resultado

---

### Los resultados

#### Vista Dashboard *(solo en Leer)*

Una tabla por seller que muestra:
- Resumen de tarjetas activas/inactivas
- El estado de cada grupo de cuotas seleccionado: **Ok**, **A corregir** o **No configurado**
- El resultado de validación de eventos (si seleccionaste alguno)
- Una columna de **Motivos** con el detalle de por qué algo está mal

Los estados tienen colores:
- 🟢 **Verde** — Ok (todo bien)
- 🔴 **Rojo** — A corregir (hay algo mal)
- ⚫ **Gris** — No configurado (no tiene reglas para ese grupo)

#### Vista Detalle

Muestra todas las reglas procesadas una por una, con seller, tarjeta, level, estado y resultado.

#### Exportar Excel completo

Hacé clic en **"Exportar Excel completo"** para descargar un archivo con cuatro hojas:
- **RESUMEN** — gráfico de torta con el estado general y KPIs
- **DASHBOARD_VENDEDORES** — la vista por seller con los grupos y eventos que seleccionaste, con colores
- **PAGOS_CONSOLIDADO** — detalle de todas las reglas procesadas
- **ERRORES** — sellers o reglas con problemas

---

### Pestaña Historial

Muestra las operaciones anteriores:
- **Admin y Supervisor** ven el historial de todo el equipo
- **Analista y Viewer** ven solo sus propias operaciones

---

## 8. Módulo Eventos

Permite crear y gestionar eventos comerciales planificados (Hot Sale, Cyber Monday, etc.) para luego validar si los sellers están correctamente configurados.

### Cómo llegar

Hacé clic en **"Eventos"** en el menú lateral. *(Visible para Admin y Supervisor)*

### Las dos pestañas

#### Administrar eventos

Muestra todos los eventos creados con un badge que indica si están **VIGENTES**, son **PRÓX** (próximos) o ya pasaron.

Para cada evento podés:
- **Editar** — hacé clic en el ícono de lápiz ✏️
- **Activar/Desactivar** — con el toggle de la fila
- **Eliminar** — con el ícono de papelera 🗑️ (pedirá confirmación)

#### Crear evento

Completá el formulario:
- **Nombre** — ej: "Hot Sale 2026"
- **Fechas** — inicio y fin del evento (en horario Argentina)
- **Cuotas requeridas** — seleccioná el preset (ej: 9 cuotas, 12 cuotas, etc.)
- **Scope** — podés limitarlo a ciertos sellers o dejarlo para todos

Hacé clic en **"Crear evento"** y va a aparecer en la pestaña Administrar.

### Cómo usar los eventos en el CRUD

Una vez creado el evento, cuando ejecutás un **Leer** en el módulo CRUD Medios de Pago, el evento aparece como un chip seleccionable. Al activarlo, la operación valida si cada seller tiene las reglas necesarias para ese evento.

---

## 9. Módulo Usuarios

Permite gestionar quién tiene acceso a la plataforma. *(Admin y Supervisor pueden verlo; solo Admin puede crear/editar/eliminar)*

### Cómo llegar

Hacé clic en **"Usuarios"** en el menú lateral.

### Crear un usuario nuevo *(solo Admin)*

1. Hacé clic en **"+ Nuevo usuario"**
2. Completá:
   - **Usuario** — nombre de login (sin espacios, ej: `mmartinez`)
   - **Nombre completo** — para que aparezca en la interfaz
   - **Email**
   - **Contraseña** — la inicial es `Provincia.2026` (el usuario debe cambiarla al entrar)
   - **Rol** — Admin, Supervisor, Analista o Viewer
3. Hacé clic en **"Guardar"**

### Editar o desactivar un usuario *(solo Admin)*

- Hacé clic en el ícono de **lápiz** ✏️ para editar
- Dentro del formulario de edición podés desactivar el usuario con el toggle **"Activo"**
- También podés resetearle la contraseña con el botón de **llave** 🔑

### Exportar la lista de usuarios *(Admin y Supervisor)*

Hacé clic en **"Exportar Excel"** para descargar la lista completa de usuarios.

---

## 10. Configuración personal

Hacé clic en **"Configuración"** en la parte inferior del menú lateral.

### Cambiar tema (oscuro / claro)

La aplicación viene en modo oscuro por defecto. Si preferís el modo claro, activá el toggle **"Modo claro"**.

### Cambiar contraseña

Ingresá tu contraseña actual, la nueva, y confirmala. Hacé clic en **"Guardar"**.

---

## 11. Actualizaciones automáticas

Cada vez que abrís la aplicación, esta verifica automáticamente si hay una versión nueva disponible.

- Si hay una actualización, aparece un aviso en pantalla con las novedades
- Hacé clic en **"Instalar actualización"** para aplicarla sin necesidad de descargar nada manualmente
- La aplicación se cierra, se actualiza y vuelve a abrirse sola

No necesitás hacer nada especial — el proceso es automático.

---

## 12. Preguntas frecuentes

**¿Olvidé mi contraseña, qué hago?**
Contactá al administrador para que te resetee la contraseña. El administrador te la vuelve a dejar como `Provincia.2026` y vos la cambiás al entrar.

**¿La aplicación no abre o se congela?**
Cerrala desde el Administrador de tareas (Ctrl + Shift + Esc, buscá "Provincia Ops", clic derecho → Finalizar tarea) y volvé a abrirla.

**¿Qué pasa si ejecuto una operación por error?**
Si usaste **Dry Run**, no pasó nada — fue una simulación. Si fue una operación real, contactá inmediatamente al administrador para coordinar una reversión manual.

**¿Con qué frecuencia debo ejecutar el Read?**
No hay una frecuencia obligatoria. Se recomienda ejecutarlo antes de cada evento comercial para validar que todos los sellers estén correctamente configurados.

**¿Puedo usar la aplicación desde casa?**
Sí, siempre que tengas conexión a internet. La app se conecta al servidor de Provincia Compras en la nube.

**¿Qué significa "Dry Run"?**
Es una simulación. La operación se ejecuta como si fuera real pero **no hace ningún cambio en VTEX**. Sirve para verificar qué sellers y reglas serían afectados antes de ejecutar en serio.

**¿Qué significa "A corregir" en el Dashboard de Read?**
Que ese seller tiene reglas de pago pero no están configuradas correctamente para el grupo de cuotas o evento que validaste. En la columna "Motivo" se detalla qué es lo que está mal.

---

*Ante cualquier duda o problema, contactá al equipo de Provincia Compras.*
