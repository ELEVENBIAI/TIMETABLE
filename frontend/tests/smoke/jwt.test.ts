import { describe, it, expect } from 'vitest';
import { decodeJwt, isJwtExpired } from '@/lib/jwt';

// Hilfsfunktion: minimaler JWT-Build aus Payload (signiert nicht, signature placeholder)
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.signature`;
}

describe('JWT decoder', () => {
  it('decodes payload of a valid 3-part JWT', () => {
    const token = makeJwt({ userId: 'u1', tenantId: 't1', role: 'PLANNER', exp: 9999999999 });
    const payload = decodeJwt(token);
    expect(payload).toMatchObject({ userId: 'u1', tenantId: 't1', role: 'PLANNER' });
  });

  it('returns null for non-JWT strings', () => {
    expect(decodeJwt('not a jwt')).toBeNull();
    expect(decodeJwt('only.two')).toBeNull();
    expect(decodeJwt('')).toBeNull();
  });

  it('returns null for malformed payload', () => {
    expect(decodeJwt('a.b.c')).toBeNull();
  });

  it('detects expired tokens', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(isJwtExpired({ userId: 'u', tenantId: 't', role: 'X', exp: past })).toBe(true);
  });

  it('considers tokens without exp as valid', () => {
    expect(isJwtExpired({ userId: 'u', tenantId: 't', role: 'X' })).toBe(false);
  });
});
