import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { defaultQueryClientConfig } from '@/lib/api/queryClient';

/**
 * Minimal provider wrapper for components/hooks that need TanStack Query — `retry: false`
 * (from `defaultQueryClientConfig`) so failed mutations/queries surface immediately in tests
 * instead of retrying and timing the suite out.
 */
export function renderWithProviders(ui: ReactElement): RenderResult {
  const queryClient = new QueryClient(defaultQueryClientConfig);
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
