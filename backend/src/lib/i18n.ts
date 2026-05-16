// Backend-i18n (ELE-194, ADR-16)
// ────────────────────────────────────────────────────────────────────────────
// Produktive i18next-Integration: lädt JSON-Resources synchron beim Bootstrap,
// stellt `t(key, locale, vars?)` mit Interpolation + Plural-Forms zur Verfügung.
//
// Default `en`, erste übersetzte Sprache `de` (BCP 47, ADR-16).
// Resources: backend/src/locales/{en,de}/{common,auth,errors,users,validation}.json
// ────────────────────────────────────────────────────────────────────────────

import i18next from 'i18next';
import { DEFAULT_LOCALE, isLocale, SUPPORTED_LOCALES, type Locale } from '../auth/jwt.js';

import enCommon from '../locales/en/common.json' with { type: 'json' };
import enErrors from '../locales/en/errors.json' with { type: 'json' };
import enAuth from '../locales/en/auth.json' with { type: 'json' };
import enUsers from '../locales/en/users.json' with { type: 'json' };
import enValidation from '../locales/en/validation.json' with { type: 'json' };

import deCommon from '../locales/de/common.json' with { type: 'json' };
import deErrors from '../locales/de/errors.json' with { type: 'json' };
import deAuth from '../locales/de/auth.json' with { type: 'json' };
import deUsers from '../locales/de/users.json' with { type: 'json' };
import deValidation from '../locales/de/validation.json' with { type: 'json' };

const NAMESPACES = ['common', 'errors', 'auth', 'users', 'validation'] as const;
export type Namespace = (typeof NAMESPACES)[number];

let initialized = false;

export function initI18n(): void {
  if (initialized) return;
  // i18next ist eine Singleton-Instanz — synchrone Init (initImmediate via init-opts).
  void i18next.init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [...NAMESPACES],
    defaultNS: 'common',
    // Key-Konvention: 'errors.unauthorized' → ns=errors, key=unauthorized
    nsSeparator: '.',
    keySeparator: false,
    initImmediate: false,
    resources: {
      en: {
        common: enCommon,
        errors: enErrors,
        auth: enAuth,
        users: enUsers,
        validation: enValidation,
      },
      de: {
        common: deCommon,
        errors: deErrors,
        auth: deAuth,
        users: deUsers,
        validation: deValidation,
      },
    },
    interpolation: {
      // Backend-Strings landen in JSON-Responses — kein HTML-Escape nötig.
      escapeValue: false,
    },
    // Nachgeladene Schlüssel sollen NICHT als Default zurückkommen — wir wollen sehen,
    // wenn ein Key fehlt.
    returnNull: false,
    returnEmptyString: false,
  } as Parameters<typeof i18next.init>[0]);
  initialized = true;
}

/**
 * Übersetze einen Schlüssel (`namespace:key` oder default-namespace `common`).
 * Beispiele:
 *   t('errors.userNotFound', 'de')
 *   t('errors.passwordTooShort', 'de', { min: 8 })
 *   t('users.count', 'de', { count: 5 })
 */
export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, unknown>
): string {
  if (!initialized) initI18n();
  return i18next.t(key, { lng: locale, ...(vars ?? {}) });
}

/**
 * Parst Accept-Language Header und liefert die erste unterstützte Locale.
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
