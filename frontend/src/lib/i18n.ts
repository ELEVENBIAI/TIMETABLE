// i18next-Setup, gespiegelt zu Backend (ADR-16).
// 6 Namespaces, 2 Sprachen initial (en, de). Locale-Resolution-Chain: JWT > Browser > Default 'en'.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '@/locales/en/common.json';
import enErrors from '@/locales/en/errors.json';
import enAuth from '@/locales/en/auth.json';
import enUsers from '@/locales/en/users.json';
import enValidation from '@/locales/en/validation.json';
import enHealth from '@/locales/en/health.json';
import enSchedule from '@/locales/en/schedule.json';
import enMyday from '@/locales/en/myday.json';
import enDsgvo from '@/locales/en/dsgvo.json';

import deCommon from '@/locales/de/common.json';
import deErrors from '@/locales/de/errors.json';
import deAuth from '@/locales/de/auth.json';
import deUsers from '@/locales/de/users.json';
import deValidation from '@/locales/de/validation.json';
import deHealth from '@/locales/de/health.json';
import deSchedule from '@/locales/de/schedule.json';
import deMyday from '@/locales/de/myday.json';
import deDsgvo from '@/locales/de/dsgvo.json';

export const SUPPORTED_LOCALES = ['en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const resources = {
  en: {
    common: enCommon,
    errors: enErrors,
    auth: enAuth,
    users: enUsers,
    validation: enValidation,
    health: enHealth,
    schedule: enSchedule,
    myday: enMyday,
    dsgvo: enDsgvo,
  },
  de: {
    common: deCommon,
    errors: deErrors,
    auth: deAuth,
    users: deUsers,
    validation: deValidation,
    health: deHealth,
    schedule: deSchedule,
    myday: deMyday,
    dsgvo: deDsgvo,
  },
} as const;

export async function initI18n(initialLocale?: string | null): Promise<typeof i18n> {
  const lng = isLocale(initialLocale) ? initialLocale : undefined;

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      lng,
      ns: [
        'common',
        'errors',
        'auth',
        'users',
        'validation',
        'health',
        'schedule',
        'myday',
        'dsgvo',
      ],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      detection: {
        order: ['navigator', 'htmlTag'],
        caches: [],
      },
    });

  return i18n;
}

export function changeLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
}

export default i18n;
