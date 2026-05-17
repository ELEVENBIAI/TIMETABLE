// Tracking-Service Unit-Tests (ELE-189).
// Wir testen das No-Op-Verhalten ohne DSN — Sentry-Mock wäre Overkill für die Pflicht-Pfade.

import { afterEach, describe, expect, it } from 'vitest';

const ORIG_DSN = process.env.SENTRY_DSN;

afterEach(() => {
  if (ORIG_DSN === undefined) {
    delete process.env.SENTRY_DSN;
  } else {
    process.env.SENTRY_DSN = ORIG_DSN;
  }
});

describe('tracking.ts — ELE-189', () => {
  it('initTracking ist no-op ohne SENTRY_DSN', async () => {
    delete process.env.SENTRY_DSN;
    // Fresh import um initialized-State zu resetten ist nicht trivial im ESM-Loader,
    // wir importieren stattdessen einmal und prüfen das Verhalten.
    const mod = await import('../../src/lib/tracking.js');
    mod.initTracking();
    expect(mod.isTrackingActive()).toBe(false);
  });

  it('captureServerError schluckt Fehler bei nicht-initialisiertem Tracking', async () => {
    const mod = await import('../../src/lib/tracking.js');
    expect(() => mod.captureServerError(new Error('boom'), { route: 'GET /test' })).not.toThrow();
  });

  it('shutdownTracking bei nicht-initialisiertem Tracking ist OK', async () => {
    const mod = await import('../../src/lib/tracking.js');
    await expect(mod.shutdownTracking()).resolves.toBeUndefined();
  });
});
