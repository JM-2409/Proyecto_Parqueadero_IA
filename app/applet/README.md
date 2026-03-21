# Sistema de Gestión de Parqueaderos 🚗

Una aplicación web completa y moderna para la administración de parqueaderos, diseñada para optimizar el control de vehículos, la facturación y la gestión de usuarios con diferentes niveles de acceso.

## 🌟 Características Principales

*   **Control de Acceso Basado en Roles (RBAC):**
    *   **SuperAdmin:** Gestión global del sistema, creación de parqueaderos y asignación de administradores.
    *   **Admin:** Gestión de un parqueadero específico, configuración de tarifas, visualización de reportes financieros, gestión de guardas y configuración de capacidad.
    *   **Guarda:** Operación diaria, registro de entrada/salida de vehículos, cobro, emisión de recibos y registro de novedades.
*   **Gestión de Vehículos en Tiempo Real:** Registro rápido de placas y tipos de vehículos (Carro, Moto, Bicicleta, etc.).
*   **Sistema de Tarifas Dinámico:** Configuración flexible de cobros por minuto, hora, día o tarifa plana.
*   **Recibos Digitales:**
    *   Generación automática de recibos en formato PDF.
    *   Integración directa para enviar recibos a través de WhatsApp.
*   **Panel de Control y Reportes:** Visualización de ingresos diarios, vehículos actuales en el parqueadero, estadísticas de ocupación y control de caja.
*   **Notificaciones Modernas:** Sistema de alertas no intrusivas (Toasts) para una mejor experiencia de usuario.
*   **Formulario de Contacto Integrado:** Recepción de solicitudes de soporte o ventas directamente al correo sin recargar la página.
*   **Interfaz Moderna y Responsiva:** Diseño adaptable a dispositivos móviles y de escritorio, con soporte para modo oscuro.

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** [Next.js](https://nextjs.org/) (App Router), React, TypeScript.
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/), Lucide React (Iconos).
*   **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, Authentication).
*   **Notificaciones:** [Sonner](https://sonner.emilkowal.ski/) (Toasts).
*   **Formularios:** [Formspree](https://formspree.io/) (Contacto).
*   **Utilidades:** `date-fns` (manejo de fechas), `html2canvas` & `jspdf` (generación de PDFs).

## 🚀 Instalación y Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd parqueadero-app
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env.local` en la raíz del proyecto y añade tus credenciales de Supabase:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
    ```

4.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

## 📝 Notas de la Última Actualización
*   **Mejora de UX/UI:** Se reemplazaron todas las alertas nativas (`alert()`) por notificaciones modernas tipo Toast (`sonner`) en todos los paneles (SuperAdmin, Admin, Guarda).
*   **Formulario de Contacto:** Se implementó un formulario de contacto asíncrono con Formspree que no recarga la página e incluye estados de carga.
*   **Corrección de Errores:** Se solucionaron problemas de compilación y directivas `"use client"` en los componentes principales.

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
