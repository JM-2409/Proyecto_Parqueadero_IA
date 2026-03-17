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
* **Personalización:** Configuración de dirección, teléfono, email y logo del parqueadero (Nombre y NIT gestionados por Super Admin).
* **Historial Completo:** Registro detallado de todas las entradas y salidas.

### Panel de Vigilante (Guarda)
* **Ingreso Rápido:** Registro de entrada de vehículos con un solo clic y autocompletado inteligente.
* **Control en Tiempo Real:** Visualización de vehículos activos y disponibilidad de espacios.
* **Salida Automatizada:** Cálculo automático del valor a cobrar basado en las tarifas configuradas.
* **Gestión de Turnos:** Registro del nombre del guarda en turno y entrega de turno.
* **Recibos Personalizados:** Generación de recibos de pago con logo y datos del parqueadero, listos para imprimir o compartir.

### Landing Page y Pagos
* **Presentación del Servicio:** Página de inicio moderna con información sobre características, visión y misión.
* **Planes y Precios:** Integración con links de pago de Bold para suscripciones mensuales, semestrales y anuales.
* **Portal de Renovación:** Pantalla dedicada para usuarios con suscripción vencida, facilitando la renovación directa.

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
