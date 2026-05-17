// Error-Tracking (ELE-189 / ADR-17). Sentry-Protocol-kompatibel (GlitchTip / Sentry SaaS).
// No-Op wenn VITE_SENTRY_DSN nicht gesetzt.

import * as Sentry from '@sentry/react';

let initialized = false;

export function initTracking(): void {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string') return;
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION as string | undefined,
      // Performance-Monitoring kommt mit Grafana-Stack (Wave 4)
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend(event) {
        // PII-Scrubbing: keine Cookies, keine User-Email
        if (event.request) {
          // Cookies aus Sentry-Event entfernen
          (event.request as { cookies?: unknown }).cookies = undefined;
        }
        if (event.user) {
          delete event.user.email;
          delete event.user.ip_address;
        }
        return event;
      },
    });
    initialized = true;
  } catch {
    initialized = false;
  }
}

export function isTrackingActive(): boolean {
  return initialized;
}

export function setUserContext(ctx: { id?: string; tenantId?: string; role?: string }): void {
  if (!initialized) return;
  try {
    Sentry.setUser({
      ...(ctx.id && { id: ctx.id }),
    });
    if (ctx.tenantId || ctx.role) {
      Sentry.setTags({
        ...(ctx.tenantId && { tenantId: ctx.tenantId }),
        ...(ctx.role && { role: ctx.role }),
      });
    }
  } catch {
    /* ignore */
  }
}

export function clearUserContext(): void {
  if (!initialized) return;
  try {
    Sentry.setUser(null);
  } catch {
    /* ignore */
  }
}

/** Manuelles Reporting für Errors die nicht durch ErrorBoundary fließen (z.B. fetch-Fehler). */
export function captureException(err: unknown, tags?: Record<string, string>): void {
  if (!initialized) return;
  try {
    Sentry.captureException(err, tags ? { tags } : undefined);
  } catch {
    /* ignore */
  }
}

export { Sentry };
