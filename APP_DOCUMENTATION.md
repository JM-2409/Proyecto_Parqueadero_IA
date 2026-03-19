# Documentación Interna de ParqueoPro

Este documento es de uso exclusivo para desarrolladores y administradores del sistema. Contiene la arquitectura, lógica de negocio y flujos principales de la aplicación.

## 1. Arquitectura General

La aplicación está construida utilizando:
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS.
- **Backend/Base de Datos:** Supabase (PostgreSQL, Auth, Storage).
- **Iconos:** Lucide React.
- **Manejo de Fechas:** date-fns.
- **Generación de Recibos:** html2canvas.

## 2. Roles y Permisos

El sistema maneja tres roles principales:

1.  **Super Admin:**
    - Tiene acceso a la gestión global del sistema.
    - Puede crear, editar y eliminar parqueaderos (`parking_lots`).
    - Puede crear usuarios administradores y asignarles parqueaderos.
    - Puede configurar ajustes globales (Nombre de la app, Logo, NIT, etc.) desde la pestaña "Configuración".

2.  **Admin (Administrador de Parqueadero):**
    - Gestiona un parqueadero específico asignado por el Super Admin.
    - Puede crear y gestionar guardias (`guards`).
    - Configura las tarifas (`rates`) para diferentes tipos de vehículos (carro, moto, bicicleta).
    - Define campos personalizados (`custom_fields`) que se solicitarán al registrar un vehículo (ej. Nombre del visitante, Apartamento).
    - Configura límites de capacidad (`capacity_settings`).
    - Puede ver el historial completo de sesiones de parqueo y exportar reportes.
    - Puede dar salida manual a vehículos en caso de emergencia o error del guardia.

3.  **Guard (Guardia de Seguridad):**
    - Opera el sistema en el día a día.
    - Registra el ingreso de vehículos (placa, tipo, campos personalizados).
    - Registra la salida de vehículos, calculando automáticamente el costo basado en el tiempo y la tarifa.
    - Genera y comparte recibos de pago (imagen vía WhatsApp o descarga).
    - El sistema autocompleta los datos de vehículos recurrentes basándose en su historial.

## 3. Estructura de la Base de Datos (Supabase)

Las tablas principales son:

- `profiles`: Extiende la tabla de usuarios de Supabase Auth. Almacena el rol (`super_admin`, `admin`, `guard`) y el `parking_lot_id` asociado.
- `parking_lots`: Almacena la información de los parqueaderos (nombre, dirección, teléfono, NIT).
- `rates`: Define las tarifas por tipo de vehículo y parqueadero (valor por minuto, valor por hora, valor por día, tarifa plana).
- `custom_fields`: Define los campos adicionales a solicitar en el ingreso (nombre, tipo, si es requerido).
- `capacity_settings`: Configuración de capacidad máxima por tipo de vehículo.
- `parking_sessions`: La tabla transaccional principal. Registra cada ingreso y salida.
  - Campos clave: `license_plate`, `vehicle_type`, `entry_time`, `exit_time`, `status` (active/completed), `amount_paid`, `metadata` (JSONB para campos personalizados).
- `global_settings`: Tabla de una sola fila para configuraciones globales de la app (nombre, logo_url).

## 4. Flujos Principales

### 4.1. Ingreso de Vehículo (Guardia)
1. El guardia ingresa la placa.
2. **Autocompletado:** El sistema busca en `parking_sessions` la última sesión de esa placa usando `.maybeSingle()`. Si existe, autocompleta el tipo de vehículo y los campos personalizados (limpiando campos internos).
3. El guardia completa/modifica los datos y presiona "Registrar Ingreso".
4. Se crea un nuevo registro en `parking_sessions` con `status = 'active'`.

### 4.2. Salida de Vehículo (Guardia)
1. El guardia busca el vehículo activo por placa o lo selecciona de la lista.
2. El sistema calcula el tiempo transcurrido usando `differenceInMinutes` de `date-fns`.
3. Se aplica la tarifa correspondiente (buscando la mejor coincidencia en `rates`).
4. El guardia confirma el pago.
5. Se actualiza el registro en `parking_sessions` con `status = 'completed'`, `exit_time`, y `amount_paid`.
6. Se muestra el modal con el **Recibo de Parqueo** generado.

### 4.3. Generación de Recibos
- El recibo se renderiza en HTML/Tailwind dentro de un div con `id="receipt-content"`.
- Utiliza un diseño tipo "ticket térmico" (fuente monoespaciada, bordes punteados).
- Se usa `html2canvas` para convertir este div en una imagen (PNG).
- La imagen se puede descargar o enviar por WhatsApp mediante un enlace pre-generado.

### 4.4. Configuración Global (Super Admin)
- El Super Admin accede a la pestaña "Configuración".
- Puede subir un logo (se guarda en Supabase Storage, bucket `logos`).
- Puede cambiar el nombre de la app, NIT, dirección y teléfono.
- Estos datos se guardan en la tabla `global_settings` y se reflejan en toda la app (incluyendo los recibos).

## 5. Notas de Desarrollo
- **Manejo de Errores:** Se implementaron bloques `try...catch` en las llamadas a Supabase, especialmente en el autocompletado, para evitar que la UI se bloquee si no hay resultados o hay fallos de red.
- **Fechas:** Se utiliza la zona horaria local del navegador. Para los recibos, se usa el locale `es` de `date-fns` para formato en español.
- **Seguridad:** Las políticas RLS (Row Level Security) en Supabase deben asegurar que los usuarios solo vean datos de su `parking_lot_id`.
