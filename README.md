# Sistema de Gestión de Parqueaderos

Un sistema web moderno y completo para la administración y control de estacionamientos, construido con Next.js, React, Tailwind CSS y Supabase.

## 🚀 Características Principales

### Panel de Administrador
* **Dashboard Estadístico:** Visualización de ingresos totales, vehículos activos e ingresos del día actual.
* **Gráficos Interactivos:** Comparativa de los últimos 7 días mostrando ingresos vs cantidad de vehículos.
* **Gestión de Tarifas:** Creación y edición de múltiples tipos de tarifas:
  * Por minuto.
  * Hora y fracción.
  * Día / Noche (Con lógica de turnos de 06:00 a 18:00 y 18:00 a 06:00).
  * Configuración de **minutos de gracia** para evitar cobros injustos en los límites de los turnos.
* **Límites de Capacidad:** Configuración de límites máximos de vehículos por tipo (carros, motos, bicicletas) con opción de bloqueo automático al alcanzar la capacidad.
* **Control de Recaudo y Cierres de Caja:** Seguimiento del dinero recaudado por los vigilantes y opción para realizar cierres de caja, reiniciando el contador de ingresos.
* **Tarifas Especiales y Mensualidades:** Asignación de tarifas fijas, mensualidades o cobros especiales a vehículos específicos por placa, controlando si el pago se realiza a la administración o al vigilante.
* **Gestión de Usuarios:** Creación, edición y eliminación de cuentas para vigilantes y otros administradores. **Nota:** Por seguridad, el auto-registro está deshabilitado; solo los administradores pueden crear cuentas.
* **Historial Completo:** Registro detallado de todas las entradas y salidas con cálculo de tiempos y valores pagados, incluyendo búsqueda por placa o recibo.

### Panel de Vigilante (Guarda)
* **Ingreso Rápido:** Registro de entrada de vehículos (carros, motos o bicicletas) con un solo clic.
* **Autocompletado Inteligente:** Al ingresar una placa registrada anteriormente, el sistema autocompleta los datos adicionales del vehículo para agilizar el proceso.
* **Control en Tiempo Real:** Visualización de todos los vehículos actualmente en el parqueadero con su tiempo de estancia en vivo y búsqueda rápida.
* **Control de Capacidad:** Visualización de la disponibilidad actual de parqueaderos por tipo de vehículo. Los tipos de vehículos deshabilitados por administración se ocultan automáticamente.
* **Salida Automatizada:** Cálculo automático del valor a cobrar basado en las tarifas configuradas por el administrador, aplicando automáticamente tarifas especiales o mensualidades si corresponden.
* **Visibilidad de Recaudo:** (Opcional) Visualización del dinero recaudado en el turno actual, según la configuración del administrador.

## 🛠️ Tecnologías Utilizadas

* **Frontend:** Next.js 15 (App Router), React 19
* **Estilos:** Tailwind CSS
* **Iconos:** Lucide React
* **Gráficos:** Recharts
* **Backend & Base de Datos:** Supabase (PostgreSQL)
* **Autenticación:** Supabase Auth

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd parqueadero-app
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo `.env.local` en la raíz del proyecto y añade tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   ```

4. **Configurar la Base de Datos:**
   El proyecto incluye un script para inicializar las tablas necesarias en Supabase.
   ```bash
   npx tsx setup-settings.ts
   ```
   *(Asegúrate de tener las políticas de RLS configuradas correctamente en tu panel de Supabase).*

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   El proyecto estará disponible en `http://localhost:3000`.

## 🔐 Uso y Roles

* **Primer Inicio de Sesión:** Si la base de datos está vacía, el primer usuario que intente iniciar sesión será registrado automáticamente y se le asignará el rol de **Administrador**.
* **Administrador:** Tiene acceso total a estadísticas, creación de tarifas y gestión del personal.
* **Vigilante:** Solo tiene acceso a la pantalla de control de barrera (ingresar y dar salida a vehículos).

## 📝 Lógica de Cobro Día/Noche

El sistema incluye una lógica avanzada para el cobro por turnos:
* **Día:** 06:00 a 18:00
* **Noche:** 18:00 a 06:00
* **Minutos de Gracia:** Si un vehículo ingresa faltando X minutos (ej. 15 min) para terminar un turno, o sale X minutos después de iniciar un turno, el sistema omite el cobro de ese turno adicional, cobrando de manera justa.

---
*Desarrollado para optimizar la gestión de parqueaderos de manera eficiente y segura.*
