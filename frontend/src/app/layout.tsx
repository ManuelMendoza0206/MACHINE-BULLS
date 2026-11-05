import type { JSX } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { SkipToContentLink } from '@/components/shell/SkipToContentLink';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'StyleMe — prueba tu armario',
    template: '%s · StyleMe',
  },
  description:
    'Digitaliza tus prendas, descubre combinaciones por armonía cromática y pruébatelas sobre tu propia foto con difusión multicapa.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1B3A5B' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1012' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="grain">
        {/* First focusable element of the document. */}
        <SkipToContentLink />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
