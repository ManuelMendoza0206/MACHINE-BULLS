import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
};

export const queryClient = new QueryClient(defaultQueryClientConfig);
