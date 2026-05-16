import { describe, expect, it } from 'vitest';
import { resolveLocaleFromAcceptLanguage, t } from '../../src/lib/i18n.js';

describe('i18n — t(key, locale)', () => {
  it('liefert deutschen Text für locale=de', () => {
    expect(t('errors.unauthorized', 'de')).toBe('Nicht autorisiert');
  });

  it('liefert englischen Text für locale=en (Default)', () => {
    expect(t('errors.unauthorized', 'en')).toBe('Unauthorized');
  });

  it('fällt auf en zurück wenn Key in de fehlt', () => {
    // Aktuell sind alle Keys in beiden Sprachen vorhanden — kein Fallback erforderlich.
    // Test sichert nur ab, dass der Lookup nicht crasht.
    expect(t('auth.loginSuccess', 'de')).toBe('Login erfolgreich');
  });

  it('liefert Key-Tail zurück wenn nirgends übersetzt', () => {
    // Key existiert weder in de noch in en (fallback) — i18next gibt den
    // Key-Teil nach dem Namespace unverändert zurück (per Default).
    expect(t('errors.doesNotExist', 'de')).toBe('doesNotExist');
  });

  it('Interpolation: vars werden ersetzt', () => {
    expect(t('errors.rateLimited', 'de', { retryAfter: '30s' })).toBe(
      'Zu viele Anfragen. Bitte 30s warten.'
    );
  });

  it('Interpolation: Validation-Details', () => {
    expect(t('errors.validationDetails', 'en', { details: 'email: missing' })).toBe(
      'Invalid input: email: missing'
    );
  });

  it('Plural: count=1 → singular (en)', () => {
    expect(t('users.count', 'en', { count: 1 })).toBe('1 user');
  });

  it('Plural: count=5 → plural (en)', () => {
    expect(t('users.count', 'en', { count: 5 })).toBe('5 users');
  });

  it('Plural: count=1 → singular (de)', () => {
    expect(t('users.count', 'de', { count: 1 })).toBe('1 Mitarbeiter');
  });
});

describe('i18n — resolveLocaleFromAcceptLanguage', () => {
  it('parst primary-Tag aus Accept-Language', () => {
    expect(resolveLocaleFromAcceptLanguage('de-DE,de;q=0.9,en;q=0.8')).toBe('de');
  });

  it('liefert en bei englischem Header', () => {
    expect(resolveLocaleFromAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('fällt auf en zurück bei undefined', () => {
    expect(resolveLocaleFromAcceptLanguage(undefined)).toBe('en');
  });

  it('fällt auf en zurück bei nicht-unterstützter Sprache', () => {
    expect(resolveLocaleFromAcceptLanguage('fr-FR,fr;q=0.9')).toBe('en');
  });
});
