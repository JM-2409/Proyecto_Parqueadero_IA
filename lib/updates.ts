export interface UpdateEntry {
  version: string;
  date: string;
  roles: ('superadmin' | 'admin' | 'guard')[];
  title: string;
  description: string;
  changes: string[];
}

export const UPDATES: UpdateEntry[] = [
  {
    version: "3.0.0",
    date: "2024-03-22",
    roles: ['guard', 'admin', 'superadmin'],
    title: "NexoPark Enterprise: Rebranding & Optimization",
    description: "Gran actualización con rediseño corporativo total, optimización de velocidad operativa y soporte PWA.",
    changes: [
      "Diseño: Nueva identidad visual 'NexoPark' con colores corporativos (Navy Primario, Turquesa, Menta) y Glassmorphism.",
      "Vigilancia: Flujo de ingreso 'Zero-Click' controlado por teclado (shortcuts Ctrl+K/F2 y Enter para registro automático).",
      "Vigilancia: Impresión automática de recibos digitales mediante iframe silencioso.",
      "Base de Datos: Optimización de velocidad mediante índices y lógica automatizada para residentes ($0 fee).",
      "Rendimiento: Compresión de imágenes del lado del cliente y migración a funciones ligeras (date-fns).",
      "PWA: Soporte para instalación como aplicación nativa en móviles y tablets."
    ]
  },
  {
    version: "2.1.0",
    date: "2024-03-20",
    roles: ['guard', 'admin', 'superadmin'],
    title: "Mejora de Recibos y Visualización",
    description: "Se han optimizado los detalles de los vehículos y la funcionalidad de los recibos digitales.",
    changes: [
      "Vigilancia: Los recibos ahora muestran todos los campos de información adicional correctamente etiquetados.",
      "Vigilancia: Se corrigió un error visual donde aparecían IDs técnicos (campo_...) en lugar de nombres legibles.",
      "Administración: Mejora en la sincronización de etiquetas personalizadas al visualizar el historial.",
      "Administración: Nueva lógica de mapeo inteligente para campos de entrada."
    ]
  },
  {
    version: "2.0.5",
    date: "2024-03-19",
    roles: ['guard', 'admin', 'superadmin'],
    title: "Branding Global y Modales",
    description: "Actualización mayor enfocada en la personalización de marca y usabilidad en dispositivos móviles.",
    changes: [
      "SaaS: Opción para cambiar el logo y nombre de la aplicación globalmente desde Super Admin.",
      "SaaS: Encabezados unificados y modernos en todas las vistas del sistema.",
      "General: Modales con botón de cierre (X) y desplazamiento interno (Scroll) para pantallas pequeñas.",
      "Vigilancia: Función de 'Compartir' recibo integrada con el sistema del dispositivo y WhatsApp.",
      "Administración: Gráficos de Ingresos y Tráfico separados con filtros avanzados por fecha."
    ]
  },
  {
    version: "2.0.0",
    date: "2024-03-10",
    roles: ['superadmin'],
    title: "Lanzamiento NexoPark SaaS",
    description: "Migración exitosa a plataforma multi-parqueadero.",
    changes: [
      "Infraestructura: Aislamiento de datos por parqueadero mediante RLS.",
      "SaaS: Implementación de panel de control para gestión de suscripciones.",
      "DB: Generación segura de tickets consecutivos."
    ]
  }
];
