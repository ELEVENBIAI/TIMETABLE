// JWT-Secret-Rotation (ELE-188 / ADR-18).
// Multi-Secret-Strategie: primary signs+verifies, previous verifies-only.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signJwt, verifyJwt } from '../../src/auth/jwt.js';

const SECRET_A = 'a'.repeat(64);
const SECRET_B = 'b'.repeat(64);
const SECRET_C = 'c'.repeat(64);

const PAYLOAD = {
  userId: '11111111-1111-1111-1111-111111111111',
  tenantId: '22222222-2222-2222-2222-222222222222',
  role: 'PLANNER' as const,
  isSuperAdmin: false,
  locale: 'de' as const,
};

const ORIG_PRIMARY = process.env.JWT_SECRET;
const ORIG_PREVIOUS = process.env.JWT_SECRET_PREVIOUS;

beforeEach(() => {
  process.env.JWT_SECRET = SECRET_A;
  delete process.env.JWT_SECRET_PREVIOUS;
});

afterEach(() => {
  if (ORIG_PRIMARY === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = ORIG_PRIMARY;
  }
  if (ORIG_PREVIOUS === undefined) {
    delete process.env.JWT_SECRET_PREVIOUS;
  } else {
    process.env.JWT_SECRET_PREVIOUS = ORIG_PREVIOUS;
  }
});

describe('JWT-Secret-Rotation (ELE-188)', () => {
  it('sign + verify mit dem aktuellen Secret funktioniert', () => {
    const token = signJwt(PAYLOAD);
    const decoded = verifyJwt(token);
    expect(decoded.userId).toBe(PAYLOAD.userId);
  });

  it('Token signiert mit ALTEM Secret + Rotation aktiv (PREVIOUS=alt, JWT_SECRET=neu) → verify klappt', () => {
    // 1) Sign mit SECRET_A
    const oldToken = signJwt(PAYLOAD);

    // 2) Rotation simulieren: SECRET_A → PREVIOUS, neues SECRET_B → primary
    process.env.JWT_SECRET = SECRET_B;
    process.env.JWT_SECRET_PREVIOUS = SECRET_A;

    // 3) Verify findet das Token über PREVIOUS
    const decoded = verifyJwt(oldToken);
    expect(decoded.userId).toBe(PAYLOAD.userId);
  });

  it('Neuer Token (signiert mit neuem primary) verifiziert über primary, NICHT über previous', () => {
    process.env.JWT_SECRET = SECRET_B;
    process.env.JWT_SECRET_PREVIOUS = SECRET_A;

    const newToken = signJwt(PAYLOAD);
    const decoded = verifyJwt(newToken);
    expect(decoded.userId).toBe(PAYLOAD.userId);
  });

  it('Token mit DRITTEM Secret (weder primary noch previous) → verify wirft', () => {
    // Sign mit SECRET_C, aber laufzeit kennt nur SECRET_A (primary) und SECRET_B (previous)
    process.env.JWT_SECRET = SECRET_C;
    const aliasToken = signJwt(PAYLOAD);

    process.env.JWT_SECRET = SECRET_A;
    process.env.JWT_SECRET_PREVIOUS = SECRET_B;
    expect(() => verifyJwt(aliasToken)).toThrow();
  });

  it('Ohne JWT_SECRET_PREVIOUS: Tokens mit altem Secret schlagen fehl', () => {
    const oldToken = signJwt(PAYLOAD);
    // Rotation ohne PREVIOUS: altes Token wird abgelehnt
    process.env.JWT_SECRET = SECRET_B;
    expect(() => verifyJwt(oldToken)).toThrow();
  });

  it('signJwt nutzt IMMER primary, niemals previous', () => {
    process.env.JWT_SECRET = SECRET_A;
    process.env.JWT_SECRET_PREVIOUS = SECRET_B;

    const token = signJwt(PAYLOAD);

    // Token sollte mit SECRET_A signiert sein → wenn wir es ohne primary verify-en
    // (nur SECRET_B als primary, kein previous), schlägt es fehl
    process.env.JWT_SECRET = SECRET_B;
    delete process.env.JWT_SECRET_PREVIOUS;
    expect(() => verifyJwt(token)).toThrow();
  });
});
