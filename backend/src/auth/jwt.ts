// JWT Sign + Verify (ADR-09)
// Wir nutzen @fastify/jwt für die Plugin-Integration in Routes,
// aber hier zusätzlich Pure-Function-Helper für Tests + Server-internal.

import jsonwebtoken from 'jsonwebtoken';
import { SECURITY } from '../config.js';
import { isUserRole, type UserRole } from './roles.js';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  isSuperAdmin: boolean;
}

export interface JwtPayloadWithMeta extends JwtPayload {
  iat: number;
  exp: number;
}

function getSecret(): string {
  // process.env zur Laufzeit lesen — damit Tests es überschreiben können
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nicht gesetzt');
  }
  return secret;
}

export function signJwt(payload: JwtPayload): string {
  return jsonwebtoken.sign(payload, getSecret(), {
    expiresIn: SECURITY.JWT_EXPIRES_IN,
  } as jsonwebtoken.SignOptions);
}

export function verifyJwt(token: string): JwtPayloadWithMeta {
  const decoded = jsonwebtoken.verify(token, getSecret());
  if (typeof decoded === 'string') {
    throw new Error('JWT-Payload ist String statt Object');
  }
  // Pflicht-Felder prüfen
  const { userId, tenantId, role, isSuperAdmin, iat, exp } = decoded as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    typeof tenantId !== 'string' ||
    !isUserRole(role) ||
    typeof isSuperAdmin !== 'boolean' ||
    typeof iat !== 'number' ||
    typeof exp !== 'number'
  ) {
    throw new Error('JWT-Payload unvollständig');
  }
  return { userId, tenantId, role, isSuperAdmin, iat, exp };
}
