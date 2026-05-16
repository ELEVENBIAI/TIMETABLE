// Autorisierungs-Helper für Routes (ELE-170)
// Wird nach requireAuth in den preHandler-Chain eingeklinkt.
// Wirft strukturierte Errors mit messageKey für Frontend-Übersetzung (ADR-16).

import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../lib/errors.js';
import type { UserRole } from './roles.js';

export class ForbiddenError extends HttpError {
  constructor(messageKey = 'errors.forbidden', vars?: Record<string, unknown>) {
    super(403, 'FORBIDDEN', messageKey, messageKey, vars);
  }
}

/**
 * preHandler-Factory: erlaubt Request nur wenn request.user.role in `allowed` enthalten ist
 * ODER request.user.isSuperAdmin === true.
 */
export function requireRole(...allowed: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      throw new ForbiddenError('errors.unauthorized');
    }
    if (user.isSuperAdmin) return;
    if (!allowed.includes(user.role)) {
      throw new ForbiddenError('errors.roleNotAllowed');
    }
  };
}

/**
 * Liefert true wenn der eingeloggte User die Operation auf das Ziel-Objekt ausführen darf.
 * - SUPER_ADMIN darf immer
 * - ADMIN darf wenn target im eigenen Tenant
 * - sonst nur wenn target === self
 */
export function canActOnUser(
  actor: { userId: string; tenantId: string; role: UserRole; isSuperAdmin: boolean },
  target: { id: string; tenant_id: string }
): { allowed: boolean; isSelf: boolean; isAdminScope: boolean } {
  const isSelf = actor.userId === target.id;
  const isAdminScope =
    actor.isSuperAdmin || (actor.role === 'ADMIN' && actor.tenantId === target.tenant_id);
  const allowed = isSelf || isAdminScope;
  return { allowed, isSelf, isAdminScope };
}
