import type {Metadata} from 'next';
import { Toaster } from 'sonner';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Sistema de Gestión de Parqueaderos',
  description: 'Sistema web moderno y completo para la administración y control de estacionamientos.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
