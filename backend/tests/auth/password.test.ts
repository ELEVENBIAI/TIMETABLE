import { describe, expect, it } from 'vitest';
import { comparePassword, DUMMY_HASH, hashPassword } from '../../src/auth/password.js';

describe('password — hash + compare', () => {
  it('hash erzeugt validen bcrypt-Hash', async () => {
    const hash = await hashPassword('Test1234!');
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it('compare gibt true bei korrektem Passwort', async () => {
    const hash = await hashPassword('SecretPw!');
    expect(await comparePassword('SecretPw!', hash)).toBe(true);
  });

  it('compare gibt false bei falschem Passwort', async () => {
    const hash = await hashPassword('SecretPw!');
    expect(await comparePassword('WrongPw!', hash)).toBe(false);
  });

  it('DUMMY_HASH ist konstant und ist ein bcrypt-Hash', () => {
    expect(DUMMY_HASH).toMatch(/^\$2[aby]\$\d+\$/);
  });
});
