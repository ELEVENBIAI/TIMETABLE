// Error-Tracking (ELE-189 / ADR-17).
// Sentry-Protocol-kompatibel — funktioniert mit GlitchTip (self-hosted) und Sentry SaaS.
// Wenn SENTRY_DSN nicht gesetzt → kompletter No-Op (Dev-Default).

import * as Sentry from '@sentry/node';

let initialized = false;

export function initTracking(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // Dev-Default: kein Tracking
  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE,
      sampleRate: 1.0,
      // Tracing aus — Performance-Monitoring kommt mit Grafana-Stack (Wave 4)
      tracesSampleRate: 0,
      // PII-Scrubbing: Bodies + sensible Header weg
      beforeSend(event) {
        if (event.request) {
          delete event.request.data;
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
          }
          // IP nur in Sentry-/GlitchTip-Server-Settings auf "scrub-IP" stellen
        }
        return event;
      },
    });
    initialized = true;
  } catch {
    // Init-Failure darf das Backend NICHT crashen — Tracking ist optional
    initialized = false;
  }
}

export function isTrackingActive(): boolean {
  return initialized;
}

interface ErrorContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  statusCode?: number;
}

/**
 * Schickt einen Server-Error an das Tracking-Backend.
 * No-Op wenn Tracking nicht initialisiert ist.
 * Nur für 5xx-Errors aufrufen — 4xx ist Client-Fehler (zu viel Noise).
 */
export function captureServerError(err: Error, ctx: ErrorContext = {}): void {
  if (!initialized) return;
  try {
    Sentry.captureException(err, {
      tags: {
        ...(ctx.requestId && { requestId: ctx.requestId }),
        ...(ctx.tenantId && { tenantId: ctx.tenantId }),
        ...(ctx.route && { route: ctx.route }),
        ...(ctx.statusCode && { statusCode: String(ctx.statusCode) }),
      },
      ...(ctx.userId && { user: { id: ctx.userId } }),
    });
  } catch {
    // Tracking-Fehler dürfen den Request nicht aufhalten
  }
}

/** Wird beim Test-Shutdown aufgerufen, leert die Queue. */
export async function shutdownTracking(): Promise<void> {
  if (!initialized) return;
  try {
    await Sentry.close(2000);
  } catch {
    /* ignore */
  }
}
