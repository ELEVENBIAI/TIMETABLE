import { describe, expect, it } from 'vitest';
import { signJwt, verifyJwt } from '../../src/auth/jwt.js';

describe('JWT — sign + verify', () => {
  // JWT_SECRET wird über .env geladen, in Test-Env aber nicht automatisch.
  // Test-Setup: setze ein 64+ Zeichen Secret hart.
  process.env.JWT_SECRET ??= 'a'.repeat(64);

  const payload = {
    userId: '11111111-1111-1111-1111-111111111111',
    tenantId: '22222222-2222-2222-2222-222222222222',
    role: 'PLANNER' as const,
    isSuperAdmin: false,
    locale: 'de' as const,
  };

  it('sign erzeugt validen Token', () => {
    const token = signJwt(payload);
    expect(token.split('.')).toHaveLength(3);
  });

  it('verify dekodiert Pflicht-Claims korrekt (inkl. locale)', () => {
    const token = signJwt(payload);
    const decoded = verifyJwt(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.tenantId).toBe(payload.tenantId);
    expect(decoded.role).toBe('PLANNER');
    expect(decoded.isSuperAdmin).toBe(false);
    expect(decoded.locale).toBe('de');
    expect(decoded.iat).toBeGreaterThan(0);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it('verify fällt auf DEFAULT_LOCALE zurück wenn locale-Claim fehlt (Backwards-Compat)', async () => {
    // Pre-ADR-16-Token: ohne locale-Claim mit jsonwebtoken direkt signieren
    const { default: jsonwebtoken } = await import('jsonwebtoken');
    const legacyToken = jsonwebtoken.sign(
      {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        isSuperAdmin: payload.isSuperAdmin,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    const decoded = verifyJwt(legacyToken);
    expect(decoded.locale).toBe('en');
  });

  it('verify wirft bei manipuliertem Token', () => {
    expect(() => verifyJwt('not.a.jwt')).toThrow();
  });

  it('verify wirft bei verändertem Signing-Secret', () => {
    const token = signJwt(payload);
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'b'.repeat(64);
    expect(() => verifyJwt(token)).toThrow();
    process.env.JWT_SECRET = originalSecret;
  });
});
