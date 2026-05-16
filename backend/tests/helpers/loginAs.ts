// JWT-Erzeugung für Test-User (ELE-169/170).
// Generiert einen JWT mit demselben SECRET wie das Backend (process.env.JWT_SECRET).

import { signJwt } from '../../src/auth/jwt.js';
import type { Locale } from '../../src/auth/jwt.js';
import type { UserRole } from '../../src/auth/roles.js';

export interface TestUser {
  userId: string;
  tenantId: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  locale?: Locale;
}

export type AuthHeader = Record<string, string>;

export function loginAs(user: TestUser): AuthHeader {
  const token = signJwt({
    userId: user.userId,
    tenantId: user.tenantId,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin ?? false,
    locale: user.locale ?? 'en',
  });
  return { Authorization: `Bearer ${token}` };
}
