import { describe, expect, it } from 'vitest';
import { maskEmail, sanitizeForLog } from '../../src/lib/log-sanitize.js';

describe('sanitizeForLog', () => {
  it('redacted password-Felder', () => {
    const result = sanitizeForLog({ user: 'alice', password: 'Secret123' });
    expect(result).toEqual({ user: 'alice', password: '[REDACTED]' });
  });

  it('redacted token-Felder', () => {
    const result = sanitizeForLog({ token: 'jwt.token.here', x: 1 });
    expect(result).toEqual({ token: '[REDACTED]', x: 1 });
  });

  it('redacted authorization-Header (case-insensitive)', () => {
    const result = sanitizeForLog({ Authorization: 'Bearer abc' });
    expect(result).toEqual({ Authorization: '[REDACTED]' });
  });

  it('rekursiv durch verschachtelte Objekte', () => {
    const result = sanitizeForLog({ user: { id: 1, password: 'pw' } });
    expect(result).toEqual({ user: { id: 1, password: '[REDACTED]' } });
  });

  it('maskt Email-Adressen', () => {
    expect(maskEmail('alice@example.com')).toBe('a***@example.com');
    expect(maskEmail('no-email-format')).toBe('no-email-format');
  });
});
