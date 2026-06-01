import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient used by both the app layout and AuthProvider.
 * Exported here to avoid circular imports between _layout.tsx and providers/AuthProvider.tsx.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
