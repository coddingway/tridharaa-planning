import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tridharaa Planning Hub',
  description: 'Durga Puja 2026 planning tool for committee members',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tridharaa',
  },
  icons: {
    apple: '/icon-192.png',
    icon: '/icon-512.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#5C1148',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      </body>
    </html>
  );
}
