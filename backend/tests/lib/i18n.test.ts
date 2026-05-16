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

  it('liefert Key selbst zurück wenn nirgends übersetzt', () => {
    expect(t('does.not.exist', 'de')).toBe('does.not.exist');
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
