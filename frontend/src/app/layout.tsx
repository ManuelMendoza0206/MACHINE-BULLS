import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { SkipToContentLink } from '@/components/shell/SkipToContentLink';
import { TopNav } from '@/components/shell/TopNav';
import { BottomTabBar } from '@/components/shell/BottomTabBar';

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
        {/* First focusable element of the document. */}
        <SkipToContentLink />
        <AppProviders>
          <TopNav />
          <main id="main-content" tabIndex={-1} className="pb-16 lg:pb-0">
            {children}
          </main>
          <BottomTabBar />
        </AppProviders>
      </body>
    </html>
  );
}
