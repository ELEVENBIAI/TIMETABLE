import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Page-Komponenten = Integration-Layer, abgedeckt durch Playwright E2E
        // statt durch Vitest-Unit-Tests. Logik ist in api/ + lib/ ausgelagert
        // und dort einzeln getestet.
        'src/pages/**',
        'src/router.tsx',
        // Layout-Wrappers + Adaptive-Switch: rein deklarativ, indirekt via
        // smoke-tests gerendert. Kein eigenes Test-Asset.
        'src/layouts/**',
        'src/components/HomeRedirect.tsx',
        // Tracking / Push / Theme / QueryClient: Browser-API-Wrappers ohne
        // sinnvoll testbare Logik (Sentry SDK init, Notification.permission,
        // DOM-Mutation, TanStack-Query Konstanten). E2E deckt die Pfade ab.
        'src/lib/tracking.ts',
        'src/lib/push.ts',
        'src/lib/theme.ts',
        'src/lib/queryClient.ts',
        'src/lib/auth-api.ts',
        // Type-only Files (interfaces, coverage erkennt sie als 0%)
        'src/types/**',
        'src/components/WeekGrid/WeekGrid.types.ts',
        // WeekGrid-Integration: DnD + Layout, durch Playwright E2E
        // (schedule-smoke + schedule-dnd) abgedeckt
        'src/components/WeekGrid/WeekGrid.tsx',
        'src/components/WeekGrid/TimeAxis.tsx',
        'src/components/WeekGrid/WorkloadSummary.tsx',
        'src/components/WeekNavigator.tsx',
        // Browser-API-Hook (matchMedia)
        'src/hooks/useMediaQuery.ts',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
