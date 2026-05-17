// JWT Sign + Verify (ADR-09)
// Wir nutzen @fastify/jwt für die Plugin-Integration in Routes,
// aber hier zusätzlich Pure-Function-Helper für Tests + Server-internal.

import jsonwebtoken from 'jsonwebtoken';
import { SECURITY } from '../config.js';
import { isUserRole, type UserRole } from './roles.js';

export type Locale = 'en' | 'de';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'de'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  locale: Locale;
}

export interface JwtPayloadWithMeta extends JwtPayload {
  iat: number;
  exp: number;
}

function getPrimarySecret(): string {
  // process.env zur Laufzeit lesen — damit Tests es überschreiben können
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nicht gesetzt');
  }
  return secret;
}

/**
 * Vorheriges Secret aus Rotation (ELE-188 / ADR-18). Optional —
 * wird nur zum Verifizieren benutzt, nie zum Signieren.
 */
function getPreviousSecret(): string | null {
  const secret = process.env.JWT_SECRET_PREVIOUS;
  return secret && secret.length > 0 ? secret : null;
}

export function signJwt(payload: JwtPayload): string {
  return jsonwebtoken.sign(payload, getPrimarySecret(), {
    expiresIn: SECURITY.JWT_EXPIRES_IN,
  } as jsonwebtoken.SignOptions);
}

function decodePayload(decoded: jsonwebtoken.JwtPayload | string): JwtPayloadWithMeta {
  if (typeof decoded === 'string') {
    throw new Error('JWT-Payload ist String statt Object');
  }
  const { userId, tenantId, role, isSuperAdmin, locale, iat, exp } = decoded as Record<
    string,
    unknown
  >;
  if (
    typeof userId !== 'string' ||
    typeof tenantId !== 'string' ||
    !isUserRole(role) ||
    typeof isSuperAdmin !== 'boolean' ||
    typeof iat !== 'number' ||
    typeof exp !== 'number'
  ) {
    throw new Error('JWT-Payload unvollständig');
  }
  const resolvedLocale: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return { userId, tenantId, role, isSuperAdmin, locale: resolvedLocale, iat, exp };
}

/**
 * Verifiziert einen JWT. Probiert primary zuerst, fällt bei Signatur-Fehler
 * zurück auf JWT_SECRET_PREVIOUS (ELE-188 / ADR-18) — erlaubt nahtlose Rotation.
 *
 * Bei beidseitigem Fail wird der **Primary-Fehler** weitergeworfen — die
 * Fehlermeldung bezieht sich also immer auf das aktuelle Secret.
 */
export function verifyJwt(token: string): JwtPayloadWithMeta {
  const primary = getPrimarySecret();
  const previous = getPreviousSecret();

  try {
    return decodePayload(jsonwebtoken.verify(token, primary));
  } catch (errPrimary) {
    if (!previous) throw errPrimary;
    try {
      return decodePayload(jsonwebtoken.verify(token, previous));
    } catch {
      // Beide Secrets fehlgeschlagen — Primary-Fehler weiterwerfen
      throw errPrimary;
    }
  }
}
