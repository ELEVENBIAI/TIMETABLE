import { QueryClient } from '@tanstack/react-query';

// Globaler Query-Client (ELE-180).
// staleTime: 30s für Schedules (Robert lädt halbminütlich) — Stammdaten infinite.
// retry: bei 4xx nie, bei 5xx + Network 2x.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
