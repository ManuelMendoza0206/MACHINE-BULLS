import type { JSX } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { SkipToContentLink } from '@/components/shell/SkipToContentLink';
import { TopNav } from '@/components/shell/TopNav';
import { BottomTabBar } from '@/components/shell/BottomTabBar';

export const metadata: Metadata = {
  title: {
    default: 'StyleMe — probate tu armario',
    template: '%s · StyleMe',
  },
  description:
    'Digitalizá tus prendas, descubrí combinaciones por armonía cromática y probátelas sobre tu propia foto con difusión multicapa.',
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
          <TopNav />
          <main id="main-content" tabIndex={-1} className="pb-24 lg:pb-0">
            {children}
          </main>
          <BottomTabBar />
        </AppProviders>
      </body>
    </html>
  );
}
