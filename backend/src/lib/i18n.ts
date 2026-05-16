// Mini-i18n-Foundation (ADR-16)
// ────────────────────────────────────────────────────────────────────────────
// Vorläufige Implementierung bis i18next-Backend (Folge-Issue ELE-194) live ist.
// Liefert ein t(key, locale)-Helper, das auf eine kleine Resource-Map zugreift.
//
// Locale-Quelle (Priorität):
//   1. Explizit übergebene Locale (z.B. aus JWT-Claim)
//   2. Accept-Language Header (best-effort Parsing — primärer Tag)
//   3. Fallback DEFAULT_LOCALE ('en')
//
// Konvention für Keys: <namespace>.<key>
//   z.B. errors.unauthorized, auth.loginFailed, common.save
// ────────────────────────────────────────────────────────────────────────────

import { DEFAULT_LOCALE, isLocale, SUPPORTED_LOCALES, type Locale } from '../auth/jwt.js';
import enResources from '../locales/en/index.js';
import deResources from '../locales/de/index.js';

type Resources = Record<string, string>;

const RESOURCES: Record<Locale, Resources> = {
  en: enResources,
  de: deResources,
};

export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return RESOURCES[locale][key] ?? RESOURCES[DEFAULT_LOCALE][key] ?? key;
}

/**
 * Parst den Accept-Language Header und liefert die erste unterstützte Locale.
 * Best-effort — q-Werte werden ignoriert, primärer Tag (z.B. "de-DE" → "de") genügt.
 */
export function resolveLocaleFromAcceptLanguage(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase().split('-')[0])
    .filter(Boolean);
  for (const tag of tags) {
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale, type Locale };
