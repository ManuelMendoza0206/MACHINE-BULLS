import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { SkipToContentLink } from '@/components/shell/SkipToContentLink';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AppProviders>
          <SkipToContentLink />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
