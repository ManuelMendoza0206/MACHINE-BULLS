import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { SkipToContentLink } from '@/components/shell/SkipToContentLink';
import { ThemeToggle } from '@/components/shell/ThemeToggle';

export const metadata: Metadata = {
  title: 'StyleMe',
  description: 'AI-powered fashion recommendation platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AppProviders>
          <SkipToContentLink />
          {/* Nav slot — Tarea 5 replaces this <header> with <TopNav /> (hidden lg-) and
              adds <BottomTabBar /> (hidden lg+) after <main>. The toggle moves into TopNav. */}
          <header className="flex justify-end p-4">
            <ThemeToggle />
          </header>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
