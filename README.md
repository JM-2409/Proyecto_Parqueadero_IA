# NexoPark - Sistema de Gestión de Parqueaderos (SaaS) 🚗

NexoPark es una solución integral en la nube (SaaS) diseñada para optimizar y modernizar la administración de estacionamientos de cualquier tamaño. Construido con tecnologías de vanguardia para garantizar rapidez, seguridad y una excelente experiencia de usuario.

---

## 🚀 Características Principales

### 👑 Panel de Super Administrador (Control SaaS)
*   **Gestión Multi-Parqueadero:** Creación y control total de múltiples establecimientos.
*   **Control de Suscripciones:** Gestión de planes (Prueba, Mensual, Semestral, Anual) con bloqueos automáticos por vencimiento.
*   **Marca Blanca Global:** Configuración centralizada del nombre de la app y logo para toda la plataforma.
*   **Administración de Usuarios:** Gestión de todos los roles (Admin/Guarda) a nivel de base de datos.

### 💼 Panel de Administrador (Gestión del Negocio)
*   **Dashboard de Analíticas:** Gráficos avanzados e independientes para Ingresos y Tráfico de vehículos.
*   **Filtros Inteligentes:** Consulta de estadísticas por Hoy, 7 días, 30 días o rangos personalizados.
*   **Tarifas Flexibles:** Configuración de cobros por minuto, hora, fracción, día, noche y tarifas especiales.
*   **Control de Capacidad:** Límites automáticos de cupos para carros, motos y bicicletas.
*   **Gestión de Parqueaderos Privados:** Mapeo de espacios fijos con herramientas de limpieza masiva de datos.
*   **Cierres de Caja:** Control riguroso de ingresos acumulados con historial de cierres por turno.

### 🛡️ Panel de Vigilante (Operación Diaria)
*   **Ingreso Eficiente:** Registro rápido de placas con autocompletado inteligente de datos recurrentes.
*   **Registro de Novedades:** Captura de fotos y observaciones ante daños o incidentes.
*   **Salidas Automatizadas:** Cálculo de cobro instantáneo basado en el tiempo de permanencia.
*   **Gestión de Turnos:** Bloqueo de pantalla y registro obligatorio del operador en turno.
*   **Recibos Digitales:** Generación de tickets profesionales con opción de imprimir o compartir vía WhatsApp y Web Share API.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** Next.js 15 (App Router), React 19.
*   **Estilos:** Tailwind CSS 4.0 (Diseño Responsivo y Moderno).
*   **Base de Datos y Auth:** Supabase (PostgreSQL con Row Level Security).
*   **Analíticas:** Recharts para gráficos de alto rendimiento.
*   **Utilidades:** `date-fns` (Fechas en español), `html2canvas` (Tickets), `Lucide React` (Iconografía).

---

## 📦 Versiones y Actualizaciones

NexoPark utiliza un sistema de control de versiones semántico. Cada rol dentro de la plataforma tiene acceso a su historial de actualizaciones específico:

*   📌 **Vigilancia:** Solo visualiza mejoras operativas y de recibos.
*   👔 **Administrador:** Visualiza mejoras operativas y herramientas de gestión/analíticas.
*   🚀 **Super Admin:** Acceso al historial completo de cambios en la infraestructura SaaS.

---

## ⚙️ Instalación Local

1.  **Clonar:** `git clone <repo-url>`
2.  **Dependencias:** `npm install`
3.  **Variables de Entorno:** Configurar `.env.local` con las credenciales de Supabase.
4.  **Desarrollo:** `npm run dev`

---
*NexoPark: La tecnología que tu parqueadero necesita para crecer.*
