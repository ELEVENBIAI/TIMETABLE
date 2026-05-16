// Request-Locale-Resolution (ELE-194, ADR-16)
// ────────────────────────────────────────────────────────────────────────────
// Setzt `request.locale` über den Fastify-Request-Lifecycle.
//
// Priorität:
//   1. JWT-Claim `locale` (gesetzt nach requireAuth)
//   2. Accept-Language Header (vor Auth oder bei nicht-authentifizierten Requests)
//   3. Fallback DEFAULT_LOCALE ('en')
//
// onRequest-Hook läuft VOR preHandler — request.user existiert dort noch nicht.
// Deshalb setzen wir eine Default-Locale aus Accept-Language im onRequest und
// überschreiben sie bei JWT-authentifizierten Routes in requireAuth().
// ────────────────────────────────────────────────────────────────────────────

import type { FastifyRequest } from 'fastify';
import { DEFAULT_LOCALE, isLocale, resolveLocaleFromAcceptLanguage, type Locale } from './i18n.js';

declare module 'fastify' {
  interface FastifyRequest {
    locale: Locale;
  }
}

/**
 * Setzt request.locale aus Accept-Language oder Default.
 * Wird im onRequest-Hook aufgerufen.
 */
export function setInitialLocale(request: FastifyRequest): void {
  const header = request.headers['accept-language'];
  request.locale = resolveLocaleFromAcceptLanguage(typeof header === 'string' ? header : undefined);
}

/**
 * Überschreibt request.locale aus JWT-Claim.
 * Wird in requireAuth() aufgerufen, NACHDEM request.user gesetzt wurde.
 */
export function applyUserLocale(request: FastifyRequest, jwtLocale: unknown): void {
  if (isLocale(jwtLocale)) {
    request.locale = jwtLocale;
  } else {
    // JWT enthielt keine valide Locale — Initial-Locale bleibt
    request.locale ??= DEFAULT_LOCALE;
  }
}
