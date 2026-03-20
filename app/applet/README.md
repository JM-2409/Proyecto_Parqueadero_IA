# Sistema de Gestión de Parqueaderos 🚗

Una aplicación web completa y moderna para la administración de parqueaderos, diseñada para optimizar el control de vehículos, la facturación y la gestión de usuarios con diferentes niveles de acceso.

## 🌟 Características Principales

*   **Control de Acceso Basado en Roles (RBAC):**
    *   **SuperAdmin:** Gestión global del sistema, creación de parqueaderos y asignación de administradores.
    *   **Admin:** Gestión de un parqueadero específico, configuración de tarifas, visualización de reportes financieros y gestión de guardias.
    *   **Guardia:** Operación diaria, registro de entrada/salida de vehículos, cobro y emisión de recibos.
*   **Gestión de Vehículos en Tiempo Real:** Registro rápido de placas y tipos de vehículos (Carro, Moto, Bicicleta, etc.).
*   **Sistema de Tarifas Dinámico:** Configuración flexible de cobros por minuto, hora, día o tarifa plana.
*   **Recibos Digitales:**
    *   Generación automática de recibos en formato PDF.
    *   Integración directa para enviar recibos a través de WhatsApp.
*   **Panel de Control y Reportes:** Visualización de ingresos diarios, vehículos actuales en el parqueadero y estadísticas de ocupación.
*   **Interfaz Moderna y Responsiva:** Diseño adaptable a dispositivos móviles y de escritorio, con soporte para modo oscuro.

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** [Next.js](https://nextjs.org/) (App Router), React, TypeScript.
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/), Lucide React (Iconos).
*   **Backend & Base de Datos:** [Firebase](https://firebase.google.com/) (Authentication, Firestore).
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
    Crea un archivo `.env.local` en la raíz del proyecto y añade tus credenciales de Firebase:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
    ```

4.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

## 📝 Notas de la Última Actualización
* Se simplificó el diseño de los recibos (PDF y WhatsApp) eliminando el detalle de la "Tarifa Aplicada" para una lectura más limpia y directa por parte del cliente.

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
