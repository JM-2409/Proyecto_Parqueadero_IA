# ParqueoPro - Sistema de Gestión de Parqueaderos

Un sistema web moderno y completo para la administración y control de estacionamientos, construido con Next.js, React, Tailwind CSS y Supabase.

## 🚀 Características Principales

### Panel de Super Administrador (SaaS)
* **Gestión de Parqueaderos:** Creación, edición, suspensión y eliminación de múltiples parqueaderos en la plataforma.
* **Control de Suscripciones:** Asignación de planes (Mensual, Semestral, Anual) y fechas de vencimiento para cada parqueadero.
* **Gestión Global de Usuarios:** Administración de todos los usuarios del sistema, asignándolos a sus respectivos parqueaderos.
* **Bloqueo Automático:** Suspensión automática del acceso a parqueaderos con suscripciones vencidas.

### Panel de Administrador
* **Dashboard Estadístico:** Visualización de ingresos totales, vehículos activos e ingresos del día actual.
* **Gráficos Interactivos:** Comparativa de ingresos y cantidad de vehículos con filtros por rango de fechas y tipo de gráfico.
* **Gestión de Tarifas:** Creación y edición de múltiples tipos de tarifas (minuto, hora, día/noche, mensualidades).
* **Límites de Capacidad:** Configuración de límites máximos de vehículos por tipo con opción de bloqueo automático.
* **Control de Recaudo y Cierres de Caja:** Seguimiento del dinero recaudado y cierres de caja.
* **Gestión de Usuarios:** Creación de cuentas para vigilantes del parqueadero.
* **Gestión de Parqueaderos Privados:** Asignación de espacios, búsqueda, filtros, ordenamiento y limpieza masiva de columnas (ej. para sorteos de parqueaderos).
* **Personalización:** Configuración de dirección, teléfono, email y logo del parqueadero (Nombre y NIT gestionados por Super Admin).
* **Historial Completo:** Registro detallado de todas las entradas y salidas.

### Panel de Vigilante (Guarda)
* **Ingreso Rápido:** Registro de entrada de vehículos con un solo clic y autocompletado inteligente (ocultando nombre del vigilante).
* **Control en Tiempo Real:** Visualización de vehículos activos y disponibilidad de espacios.
* **Salida Automatizada:** Cálculo automático del valor a cobrar basado en las tarifas configuradas.
* **Gestión de Turnos:** Registro del nombre del guarda en turno y entrega de turno.
* **Parqueaderos Privados:** Visualización, búsqueda, ordenamiento y edición de datos de parqueaderos privados.
* **Recibos Personalizados:** Generación de recibos de pago con logo y datos del parqueadero, listos para imprimir o compartir.

### Seguridad y Base de Datos (Supabase)
* **Row Level Security (RLS):** Políticas de seguridad a nivel de fila estrictas para garantizar que los datos de cada parqueadero estén aislados y seguros.
* **Secuencias Seguras:** Generación de números de ticket consecutivos por parqueadero utilizando funciones `SECURITY DEFINER` para evitar saltos y colisiones.
* **Integridad Referencial:** Borrado en cascada (CASCADE) configurado para eliminar automáticamente tarifas, sesiones y configuraciones al eliminar un parqueadero.

### Landing Page y Pagos
* **Presentación del Servicio:** Página de inicio moderna con información sobre características, visión y misión.
* **Planes y Precios:** Integración con links de pago de Bold para suscripciones (Mensual: $50.000, Semestral: $270.000, Anual: $480.000).
* **Portal de Renovación:** Pantalla dedicada para usuarios con suscripción vencida, facilitando la renovación directa hacia la pasarela de pagos (Park app).

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
   Crea un archivo `.env.local` en la raíz del proyecto:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   ```

4. **Configurar la Base de Datos:**
   Aplica las migraciones de Supabase:
   ```bash
   npx supabase db push
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## 🔐 Roles del Sistema

* **Super Administrador:** Control total de la plataforma SaaS, parqueaderos y suscripciones.
* **Administrador:** Control total de un parqueadero específico (tarifas, reportes, vigilantes).
* **Vigilante:** Operación diaria del parqueadero (ingresos, salidas, cobros).

---
*Desarrollado para optimizar la gestión de parqueaderos de manera eficiente y segura.*
