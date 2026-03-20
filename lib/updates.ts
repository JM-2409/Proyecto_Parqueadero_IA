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
