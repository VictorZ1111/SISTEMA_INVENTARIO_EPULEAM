# Sistema de Inventario EPULEAM

Sistema institucional de gestión de inventario desarrollado para EPULEAM. El proyecto permite administrar bienes, existencias, bodegas, usuarios, solicitudes, movimientos, reportes y trazabilidad operativa mediante roles diferenciados.

> Estado del documento: versión funcional avanzada en etapa de saneamiento, regresión y cierre técnico. Actualizado al 8 de noviembre de 2026.

---

## 1. Objetivo del sistema

Centralizar el control de bienes institucionales y su distribución entre Inventario General, áreas principales y sucursales, manteniendo trazabilidad de entradas, transferencias, bajas, modificaciones, devoluciones, solicitudes y reversas.

El sistema trabaja con tres perfiles operativos:

- **Administrador**: controla la configuración general, usuarios, inventario, bodegas, solicitudes, movimientos y reportes.
- **Supervisor**: administra las áreas que tiene asignadas, recibe bienes en un stock técnico intermedio y distribuye o devuelve esos bienes.
- **Responsable**: consulta y gestiona el inventario operativo de la bodega o sucursal que tiene asignada.

---

## 2. Tecnologías principales

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Axios
- Lucide React
- CSS propio

### Backend

- NestJS 11
- TypeScript
- TypeORM
- PostgreSQL
- Passport + JWT
- bcrypt
- class-validator / class-transformer
- Joi para variables de entorno

### Base de datos

- PostgreSQL
- Migraciones TypeORM
- `synchronize: false`
- Las modificaciones estructurales se realizan mediante migraciones.

---

## 3. Estructura general

```text
SISTEMA-INVENTARIO-EPULEAM/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── data-source.ts
│   │   │   └── migrations/
│   │   ├── modulos/
│   │   │   ├── asignaciones/
│   │   │   ├── auditoria/
│   │   │   ├── auth/
│   │   │   ├── bodegas/
│   │   │   ├── categorias/
│   │   │   ├── inventario/
│   │   │   ├── movimientos/
│   │   │   ├── productos/
│   │   │   ├── reportes/
│   │   │   ├── solicitudes/
│   │   │   └── usuarios/
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── componentes/
│   │   ├── contexto/
│   │   ├── dominio/
│   │   ├── estilos/
│   │   ├── layouts/
│   │   ├── paginas/
│   │   │   ├── admin/
│   │   │   ├── autenticacion/
│   │   │   ├── responsable/
│   │   │   └── supervisor/
│   │   ├── rutas/
│   │   ├── tipos/
│   │   └── utilidades/
│   └── package.json
│
└── README.md
```

---

## 4. Roles y permisos

### 4.1 Administrador

Rutas principales:

```text
/admin
/admin/usuarios
/admin/inventario
/admin/bodegas
/admin/solicitudes
/admin/movimientos
/admin/reportes
/admin/configuracion
```

Funciones principales:

- Crear, editar, activar y desactivar usuarios.
- Asignar bodegas a Supervisores y Responsables.
- Crear bienes y registrar su cantidad inicial.
- Editar información de bienes.
- Dar de baja bienes.
- Asignar productos a áreas.
- Consultar inventario general y por bodega.
- Atender, rechazar y revertir solicitudes cuando aplique.
- Consultar movimientos.
- Generar reportes.
- Administrar categorías.

### 4.2 Supervisor

Rutas principales:

```text
/supervisor
/supervisor/stock
/supervisor/bodegas
/supervisor/solicitudes
/supervisor/movimientos
```

Funciones principales:

- Consultar sus áreas asignadas.
- Recibir bienes entregados por el Administrador en **Productos en stock**.
- Distribuir stock a la bodega final correspondiente.
- Distribuir Gastronomía hacia sucursales Tasty.
- Devolver bienes pendientes al Inventario General.
- Consultar y gestionar solicitudes permitidas por su rol.
- Consultar movimientos asociados a sus bodegas.
- Generar reportes de movimientos cuando corresponda.
- Reversar movimientos autorizados dentro de las reglas del sistema.

### 4.3 Responsable

Rutas principales:

```text
/responsable
/responsable/mi-bodega
/responsable/movimientos
```

La navegación de solicitudes del Responsable se integra actualmente con su panel principal según el flujo definido en rutas.

Funciones principales:

- Consultar inventario de su bodega o sucursal.
- Consultar movimientos relacionados con su asignación.
- Crear o revisar solicitudes según el flujo operativo habilitado.
- Consultar el estado de bienes y existencias disponibles.

---

## 5. Bodegas y jerarquía

El sistema distingue entre bodegas empresariales y bodegas técnicas.

### Inventario General

Es el punto inicial de ingreso de bienes.

```text
Inventario General
```

### Áreas principales

Nombre visible y canónico:

```text
Limpieza
Oficina
Gastronomía
```

**Importante:** el nombre institucional visible debe ser `Gastronomía`, no `Gastronomía Tasty`.

### Sucursales de Gastronomía

```text
Tasty 1
Tasty 2
Tasty 3
Tasty 4
Tasty 5
```

### Stock técnico del Supervisor

Existe una bodega de sistema de tipo:

```text
stock_supervisor
```

No debe tratarse visualmente como una bodega empresarial normal.

Su función actual es mantener temporalmente los productos entregados por el Administrador a un Supervisor antes de que este los distribuya a la bodega final.

---

## 6. Flujo de inventario actualmente vigente

Esta regla es intencional y **no debe modificarse todavía**:

```text
Inventario General
        ↓
Productos en stock del Supervisor
        ↓
Bodega final
```

Aplica actualmente a **todas** las áreas principales:

```text
Inventario General → Stock Supervisor Limpieza → Limpieza
Inventario General → Stock Supervisor Oficina → Oficina
Inventario General → Stock Supervisor Gastronomía → Tasty 1–5
```

Aunque en una futura mejora de auditoría podría cambiarse la representación empresarial de estos movimientos, el flujo técnico actual debe conservarse hasta que se rediseñe formalmente área por área.

---

## 7. Stock del Supervisor

Pantalla:

```text
/supervisor/stock
```

El Supervisor puede tener una o varias áreas asignadas simultáneamente.

Ejemplo:

```text
Gastronomía
Limpieza
```

### Selección de bodega al distribuir

El modal **Asignar producto** debe comenzar con:

```text
Selecciona una bodega
```

Solo se muestran las áreas asignadas al Supervisor.

#### Limpieza

Si selecciona Limpieza:

- Limpieza queda automáticamente como destino.
- No se muestran checkboxes adicionales.

#### Oficina

Si selecciona Oficina:

- Oficina queda automáticamente como destino.
- No se muestran checkboxes adicionales.

#### Gastronomía

Si selecciona Gastronomía se habilitan:

```text
Tasty 1
Tasty 2
Tasty 3
Tasty 4
Tasty 5
```

Puede seleccionar una o varias sucursales.

Cuando existen varios destinos, la cantidad debe poder repartirse de forma válida entre ellos. El sistema debe impedir repartos incompatibles y mostrar un mensaje entendible.

### Regla de separación de stock

El stock técnico pertenece a un área concreta.

Un producto recibido para Limpieza no puede utilizar existencias técnicas de Gastronomía, y viceversa.

Esto evita movimientos incoherentes como:

```text
Gastronomía → Limpieza
```

por utilizar un stock de origen incorrecto.

---

## 8. Consumibles y no consumibles

### Consumibles

Los consumibles representan cantidades transferibles.

Ejemplo:

```text
Inventario General: 100
Asignación: 30
Inventario General restante: 70
```

Si se asigna toda la cantidad disponible del Inventario General, el consumible deja de aparecer allí y queda representado únicamente en sus existencias de destino.

### No consumibles

Los no consumibles se mantienen como registro maestro del bien institucional.

Al asignarlos:

- No deben desaparecer del registro general.
- Debe actualizarse su ubicación.
- La bodega o destino actual debe poder consultarse.

Ejemplo conceptual:

```text
Antes: Laptop → Inventario General
Después: Laptop → Oficina
```

La regresión de este comportamiento debe formar parte de las pruebas finales.

---

## 9. Productos y operaciones administrativas

El Administrador puede:

- Agregar bienes.
- Editar bienes.
- Dar de baja.
- Consultar detalle.
- Asignar bienes.

Operaciones esperadas:

```text
Crear bien      → movimiento Entrada
Editar bien     → movimiento Modificación
Asignar bien    → movimiento Transferencia
Dar de baja     → movimiento Baja
Devolver stock  → movimiento Devolución
Reversar        → movimiento/reversa correspondiente
```

Los mensajes deben mostrar la causa real del error cuando sea posible.

Ejemplos:

```text
La cantidad ingresada supera el stock disponible.
```

```text
No existe un Supervisor activo asignado a la bodega seleccionada.
```

No se deben reemplazar errores específicos por un mensaje genérico de cantidad o estado cuando el backend ya conoce la causa real.

---

## 10. Usuarios y asignaciones

Los usuarios manejan estados activos/inactivos y roles.

Un Supervisor puede tener varias áreas principales asignadas.

### Desactivación

Un Supervisor **puede desactivarse aunque todavía tenga stock**.

Desactivar significa bloquear o suspender su uso del sistema; no significa retirar automáticamente los bienes bajo su control.

### Eliminación o cambios incompatibles

Las operaciones destructivas deben proteger la integridad del inventario y de las relaciones existentes.

No se debe eliminar o reasignar información si ello deja existencias o trazabilidad sin relación válida.

---

## 11. Solicitudes

Estados principales:

```text
pendiente
parcial
atendida
rechazada
```

El sistema permite manejar cantidades:

- Solicitadas.
- Entregadas.
- Rechazadas.
- Pendientes.

El Administrador puede atender total o parcialmente una solicitud y rechazarla cuando corresponda.

Mientras se mantenga el flujo técnico actual, las entregas derivadas de solicitudes deben respetar el uso del stock del Supervisor correspondiente.

---

## 12. Movimientos y trazabilidad

Tipos manejados en el sistema:

```text
entrada
transferencia
salida
ajuste
modificacion
baja
reversa
devolucion
```

La interfaz normaliza algunos tipos técnicos para mostrarlos con una terminología empresarial más clara.

Ejemplos visibles:

```text
Entrada
Transferencia
Modificación
Baja
Devolución
```

### Reversas

Determinadas transferencias, bajas y atenciones pueden revertirse dentro del límite definido por negocio.

Actualmente se utiliza una ventana de:

```text
3 horas
```

La validación existe tanto en frontend como en backend; el backend es la autoridad final.

### Stock técnico en la presentación

El stock técnico del Supervisor no debe mostrarse al usuario con nombres internos poco entendibles como:

```text
Productos en stock - Gastronomía
Stock Supervisor ...
```

La interfaz debe presentar nombres empresariales limpios.

### Mejora pendiente de auditoría

Existe una mejora conceptual pendiente: separar completamente la representación empresarial del movimiento respecto del traslado técnico por stock intermedio.

Esta mejora **no debe implementarse todavía** sin definir antes los flujos de Limpieza, Oficina y Gastronomía de forma independiente.

---

## 13. Reportes

Ruta:

```text
/admin/reportes
```

Permite generar documentos relacionados con:

- Inventario General.
- Bodegas principales.
- Sucursales Tasty.

Filtros principales:

- Periodo.
- Fecha / Mes / Año / Entre periodos.
- Custodio.
- Tipo de bien.
- Limpiar filtros.

Periodos:

```text
Día
Mes
Año
Entre periodos
```

### Selectores temporales

El sistema utiliza selectores personalizados para mantener una interfaz uniforme.

- Día: calendario con formato `dd/mm/aaaa`.
- Entre periodos: calendarios Desde y Hasta.
- Mes: selector visual de meses por año.
- Año: selector visual de años por bloques.

Todos los controles deben compartir la misma altura, borde, radio y lenguaje visual.

---

## 14. Componentes reutilizables importantes

Entre los componentes compartidos destacan:

```text
EncabezadoPagina
TablaBase
CampoDesplegable
SelectorFechaFiltro
SelectorPeriodoFiltro
BarraLateral
LayoutPrincipal
RutaProtegida
```

Regla de diseño:

> Si una acción o filtro ya existe visualmente en otra pantalla, debe reutilizarse el mismo patrón antes de crear uno nuevo.

---

## 15. Estado global del frontend

Los contextos principales son:

```text
AuthContext
ConfiguracionContext
InventarioContext
UsuariosContext
```

Responsabilidades generales:

- `AuthContext`: sesión, token, usuario actual y navegación por rol.
- `ConfiguracionContext`: categorías y configuración relacionada.
- `InventarioContext`: productos, inventario, movimientos y solicitudes.
- `UsuariosContext`: usuarios, bodegas disponibles y asignaciones.

La comunicación HTTP se centraliza mediante `clienteApi` y APIs especializadas.

---

## 16. API y autenticación

El backend utiliza prefijo global:

```text
/api
```

El frontend consume por defecto:

```text
http://localhost:3000/api
```

El token JWT se envía como:

```text
Authorization: Bearer <token>
```

Las rutas protegidas validan rol tanto en frontend como en backend.

---

## 17. Variables de entorno

Crear `backend/.env` a partir de `backend/.env.example`.

Variables relevantes:

```text
NODE_ENV
PORT
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_DATABASE
FRONTEND_URL
JWT_SECRET
JWT_EXPIRES_IN
ACCESS_CODE_PEPPER
ADMIN_GENERAL_NAME
ADMIN_GENERAL_EMAIL
ADMIN_GENERAL_CODE
```

No utilizar valores inseguros en producción ni subir secretos reales al repositorio.

Si el esquema de validación exige longitudes mínimas para secretos, el `.env` real debe respetarlas aunque el ejemplo sea simplificado.

---

## 18. Instalación local

### Requisitos

- Node.js compatible con las dependencias del proyecto.
- npm.
- PostgreSQL.
- Base de datos disponible para el backend.

### Backend

```powershell
cd backend
npm install
```

Configurar `.env` y ejecutar migraciones:

```powershell
npm run typeorm -- migration:run -d src/database/data-source.ts
```

Iniciar en desarrollo:

```powershell
npm run start:dev
```

Backend esperado:

```text
http://localhost:3000/api
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend esperado:

```text
http://localhost:5173
```

---

## 19. Build y validación

### Backend

```powershell
cd backend
npm run build
```

### Frontend

```powershell
cd frontend
npm run build
```

### Lint

```powershell
cd frontend
npm run lint
```

```powershell
cd backend
npm run lint
```

El proyecto ha pasado por una etapa de saneamiento progresivo; los avisos o reglas de lint deben resolverse sin alterar lógica funcional ya validada.

---

## 20. Migraciones

Las migraciones se encuentran en:

```text
backend/src/database/migrations
```

La migración que introdujo el stock técnico del Supervisor y las devoluciones es:

```text
1784870000000-StockSupervisorDevoluciones.ts
```

Después de agregar una migración nueva:

```powershell
cd backend
npm run build
npm run typeorm -- migration:run -d src/database/data-source.ts
```

No ejecutar `synchronize: true` para sustituir las migraciones.

---

## 21. Diseño y criterios visuales

El sistema usa un diseño institucional claro y compacto:

- Fondos blancos.
- Bordes suaves.
- Sombras discretas.
- Navegación lateral.
- Tablas con encabezado fijo cuando corresponde.
- Scroll interno en tablas largas.
- Modales compactos.
- Iconografía Lucide.

Convenciones de color:

- Inventario General: beige/café.
- Limpieza: azul.
- Oficina: verde.
- Gastronomía/Tasty: naranja.

### Reglas estrictas de UI

- No crear dos diseños diferentes para la misma acción.
- Botones de ordenar y limpiar deben ser iguales entre módulos.
- Los filtros de una misma fila deben compartir altura.
- Evitar scroll horizontal si las columnas pueden optimizarse.
- El scroll vertical debe quedar dentro de la tabla cuando ese patrón ya exista.
- Reutilizar `CampoDesplegable`, `TablaBase` y selectores compartidos.

---

## 22. Reglas de saneamiento del código

El proyecto se encuentra en una etapa donde se prioriza estabilidad sobre grandes refactorizaciones.

### Obligatorio

- Revisar primero si una solución ya existe.
- Evitar CSS duplicado.
- Evitar bloques de corrección acumulados al final de `dashboard.css` sin analizar selectores anteriores.
- Evitar `!important` salvo necesidad real.
- No modificar módulos ajenos al problema.
- Entregar cambios pequeños y verificables.
- Ejecutar build después de cambios funcionales.
- Usar migraciones solo cuando existe cambio de esquema.

### En cambios futuros

Preferir estilos encapsulados por componente cuando una nueva UI pueda quedar aislada del CSS histórico global.

---

## 23. Estado actual y trabajo pendiente

### Funcionalidad ya trabajada

- Autenticación por roles.
- Usuarios y asignaciones.
- Inventario General.
- Productos consumibles y no consumibles.
- Bodegas y sucursales.
- Stock técnico del Supervisor.
- Distribución desde stock.
- Devoluciones.
- Solicitudes.
- Movimientos.
- Reversas.
- Reportes.
- Categorías.
- Componentes compartidos y saneamiento visual progresivo.

### Pendiente antes del cierre

1. Terminar regresión completa del rol Administrador.
2. Ejecutar regresión completa del Supervisor.
3. Ejecutar regresión completa del Responsable.
4. Confirmar el comportamiento definitivo de no consumibles después de asignaciones.
5. Revisar permisos y accesos directos por URL.
6. Probar solicitudes completas, parciales, rechazadas y reversadas.
7. Probar todas las variantes de movimientos.
8. Revisar exportación de reportes con todos los periodos.
9. Limpiar datos de prueba.
10. Revisar CSS duplicado y reglas obsoletas restantes.
11. Ejecutar build final de frontend y backend.
12. Ejecutar pruebas finales con base de datos limpia o controlada.
13. Crear commit/tag de versión estable.

### Mejora de negocio expresamente aplazada

Rediseñar cómo se representa en auditoría el paso por Stock Supervisor.

No modificar todavía este flujo técnico:

```text
Inventario General → Stock Supervisor → Bodega final
```

La futura mejora debe definirse área por área antes de implementarse.

---

## 24. Flujo recomendado para continuar el desarrollo

Para cada error encontrado:

1. Reproducirlo.
2. Identificar si la causa es frontend, backend o datos.
3. Revisar componentes y reglas existentes antes de agregar código.
4. Corregir únicamente los archivos necesarios.
5. Ejecutar build.
6. Probar el caso corregido.
7. Ejecutar una prueba rápida de regresión relacionada.
8. Solo entonces continuar al siguiente punto.

---

## 25. Git y respaldo

Antes de una nueva etapa importante:

```powershell
git status
git add .
git commit -m "descripcion clara del cierre"
git push
```

La rama de saneamiento utilizada durante esta etapa ha sido:

```text
etapa-4-saneamiento
```

No mezclar cambios experimentales con una versión que ya fue validada sin crear antes un punto de recuperación.

---

## 26. Criterio de finalización de esta etapa

La etapa puede considerarse cerrada cuando:

- Frontend compila.
- Backend compila.
- Migraciones están aplicadas.
- Los tres roles pasan regresión funcional.
- No existen errores críticos de inventario.
- No existen movimientos incoherentes generados por una selección incorrecta de stock.
- Reportes funcionan por día, mes, año y rango.
- Mensajes de error explican la causa real.
- Datos de prueba innecesarios fueron eliminados.
- Se creó un commit/tag estable.

---

## 27. Nota final

Este README describe el **estado funcional actual**, no el diseño futuro ideal. Las reglas de negocio que todavía están en discusión se identifican explícitamente como pendientes para evitar que una refactorización automática cambie comportamientos ya aceptados.
