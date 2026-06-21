import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tridharaa Planning Hub — Durga Puja 2026',
  description: 'Internal planning tool for Tridharaa committee members',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
