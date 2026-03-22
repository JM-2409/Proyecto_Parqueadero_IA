import type {Metadata} from 'next';
import { Toaster } from 'sonner';
import './globals.css'; // Global styles

import type { Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sistema de Gestión de Parqueaderos',
  description: 'Sistema web moderno y completo para la administración y control de estacionamientos.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NexoPark',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B3B54',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
