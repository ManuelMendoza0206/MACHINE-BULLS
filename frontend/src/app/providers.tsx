'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { defaultQueryClientConfig } from '@/lib/api/queryClient';

/**
 * Single place where library providers are instantiated. The `QueryClient` is created once
 * per session via `useState` (never a module singleton — that would share cache across
 * requests during SSR).
 */
export function AppProviders({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(() => new QueryClient(defaultQueryClientConfig));

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
