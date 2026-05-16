import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { applyUserLocale, setInitialLocale } from '../../src/lib/locale.js';

function makeRequest(headers: Record<string, string> = {}): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

describe('locale — setInitialLocale', () => {
  it('liest Accept-Language Header (de)', () => {
    const req = makeRequest({ 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' });
    setInitialLocale(req);
    expect(req.locale).toBe('de');
  });

  it('fällt auf en zurück bei fehlendem Header', () => {
    const req = makeRequest();
    setInitialLocale(req);
    expect(req.locale).toBe('en');
  });

  it('fällt auf en zurück bei nicht-unterstützter Sprache', () => {
    const req = makeRequest({ 'accept-language': 'fr-FR,fr;q=0.9' });
    setInitialLocale(req);
    expect(req.locale).toBe('en');
  });
});

describe('locale — applyUserLocale', () => {
  it('überschreibt mit JWT-Locale wenn valide', () => {
    const req = makeRequest();
    req.locale = 'en';
    applyUserLocale(req, 'de');
    expect(req.locale).toBe('de');
  });

  it('lässt Initial-Locale unverändert wenn JWT-Locale invalid', () => {
    const req = makeRequest();
    req.locale = 'de';
    applyUserLocale(req, 'invalid');
    expect(req.locale).toBe('de');
  });

  it('fällt auf en zurück wenn keine locale gesetzt + JWT invalid', () => {
    const req = makeRequest();
    applyUserLocale(req, undefined);
    expect(req.locale).toBe('en');
  });
});
