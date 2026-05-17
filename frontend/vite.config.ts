import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'node:path';

// Conditional Sentry-Source-Maps-Upload (ELE-189 / ADR-17).
// Aktiv nur wenn alle drei Env-Vars gesetzt sind. Dev/CI ohne Vars läuft normal durch.
const sentryEnabled = !!(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default defineConfig({
  plugins: [
    react(),
    ...(sentryEnabled
      ? [
          sentryVitePlugin({
            authToken: process.env.SENTRY_AUTH_TOKEN!,
            org: process.env.SENTRY_ORG!,
            project: process.env.SENTRY_PROJECT!,
            url: process.env.SENTRY_URL,
            telemetry: false,
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Timetable',
        short_name: 'Timetable',
        description: 'Wochenplan-Plattform für Hausmeisterservice',
        theme_color: '#7c5e3b',
        background_color: '#fafaf8',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/gepard-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/gepard-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/gepard-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Mobile-Tagesansicht (ELE-182): Schedules + Entries + Stammdaten
          // werden agressiver gecacht damit Daniel offline seinen Plan sieht.
          // StaleWhileRevalidate liefert sofort den Cache und holt im Hintergrund frisch.
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/schedules') ||
              url.pathname.startsWith('/api/schedule-entries') ||
              url.pathname.startsWith('/api/properties') ||
              url.pathname.startsWith('/api/service-types') ||
              url.pathname.startsWith('/api/employees'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'myday-data',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Default für andere /api/*-Calls: NetworkFirst mit kurzem Timeout
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
