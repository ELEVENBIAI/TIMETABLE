// User-CRUD (ELE-170)
// Routes:
//   GET    /api/users
//   GET    /api/users/:id
//   POST   /api/users
//   PUT    /api/users/:id
//   DELETE /api/users/:id              (Soft-Delete, kein self-delete)
//   POST   /api/users/:id/change-password
//   PATCH  /api/users/me/locale        (i18n, ELE-195-Vorbereitung)
//
// Authorization-Matrix siehe specs/ELE-170.md.
// Passwörter werden NIEMALS in Logs ausgegeben (siehe lib/log-sanitize.ts).

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { canActOnUser, ForbiddenError, requireRole } from '../auth/authorize.js';
import { comparePassword, hashPassword } from '../auth/password.js';
import { getOwnerPool } from '../db/pools.js';
import { NotFoundError, UnauthorizedError, ValidationError, HttpError } from '../lib/errors.js';
import {
  changePasswordSchema,
  createUserSchema,
  updateLocaleSchema,
  updateUserSchema,
  type UserPublicRow,
} from '../schemas/users.js';

const USER_COLUMNS = `id, tenant_id, email, display_name, role, is_super_admin, locale,
  must_change_password, last_login_at, created_at, updated_at`;

function parseOr400<T>(schema: { parse(v: unknown): T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      const isPasswordIssue = err.issues.some(
        (i) => i.path.includes('newPassword') || i.path.includes('password')
      );
      throw new ValidationError(
        isPasswordIssue ? 'errors.passwordPolicy' : 'errors.validationDetails',
        { details }
      );
    }
    throw err;
  }
}

class SelfDeleteForbiddenError extends HttpError {
  constructor() {
    super(400, 'SELF_DELETE_FORBIDDEN', 'errors.selfDeleteForbidden', 'errors.selfDeleteForbidden');
  }
}

class EmailExistsError extends HttpError {
  constructor() {
    super(409, 'EMAIL_EXISTS', 'errors.emailExists', 'errors.emailExists');
  }
}

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── GET /api/users ──────────────────────────────────────────────────────
  fastify.get('/api/users', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert User. ADMIN: alle im Tenant. Sonst: nur eigener User.',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ users: UserPublicRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();

      const isAdminScope = actor.isSuperAdmin || actor.role === 'ADMIN';
      let result;
      if (actor.isSuperAdmin) {
        result = await pool.query<UserPublicRow>(
          `SELECT ${USER_COLUMNS} FROM users WHERE is_deleted = FALSE ORDER BY display_name`
        );
      } else if (isAdminScope) {
        result = await pool.query<UserPublicRow>(
          `SELECT ${USER_COLUMNS} FROM users
           WHERE tenant_id = $1 AND is_deleted = FALSE
           ORDER BY display_name`,
          [actor.tenantId]
        );
      } else {
        result = await pool.query<UserPublicRow>(
          `SELECT ${USER_COLUMNS} FROM users
           WHERE id = $1 AND is_deleted = FALSE`,
          [actor.userId]
        );
      }
      return { users: result.rows };
    },
  });

  // ─── GET /api/users/:id ──────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/users/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen User. Eigener User oder Admin-Read.',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<UserPublicRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const result = await pool.query<UserPublicRow>(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND is_deleted = FALSE`,
        [id]
      );
      const user = result.rows[0];
      if (!user) throw new NotFoundError('errors.userNotFound');
      const { allowed } = canActOnUser(actor, user);
      if (!allowed) throw new ForbiddenError('errors.userCrossAccess');
      return user;
    },
  });

  // ─── POST /api/users ─────────────────────────────────────────────────────
  fastify.post('/api/users', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Legt einen neuen User im eigenen Tenant an (ADMIN/SUPER_ADMIN)',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<UserPublicRow> => {
      const actor = request.user!;
      const input = parseOr400(createUserSchema, request.body);

      // SUPER_ADMIN dürfte technisch in fremde Tenants schreiben — aktuell schränken wir
      // auf eigenen Tenant ein. Cross-Tenant-Insert wäre eine eigene Story.
      const tenantId = actor.tenantId;
      const passwordHash = await hashPassword(input.password);
      const locale = input.locale ?? 'en';

      const pool = getOwnerPool();
      try {
        const result = await pool.query<UserPublicRow>(
          `INSERT INTO users (tenant_id, email, password_hash, display_name, role, locale,
                              must_change_password, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
           RETURNING ${USER_COLUMNS}`,
          [tenantId, input.email, passwordHash, input.displayName, input.role, locale, actor.userId]
        );
        const user = result.rows[0];

        // AUDIT-LOG: User-Erzeugung dokumentieren (DSGVO Art. 30)
        await pool.query(
          `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
           VALUES ($1, $2, 'user.create', 'user', $3, $4::jsonb)`,
          [
            tenantId,
            actor.userId,
            user.id,
            JSON.stringify({ email: input.email, role: input.role }),
          ]
        );

        request.log.info(
          { action: 'user.create', userId: user.id, role: user.role, by: actor.userId },
          'User erstellt'
        );
        reply.code(201);
        return user;
      } catch (err) {
        // Postgres-Unique-Violation: Email existiert
        const e = err as { code?: string; constraint?: string };
        if (e.code === '23505' && e.constraint === 'uq_users_email') {
          throw new EmailExistsError();
        }
        throw err;
      }
    },
  });

  // ─── PUT /api/users/:id ──────────────────────────────────────────────────
  fastify.put<{ Params: { id: string } }>('/api/users/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Aktualisiert einen User. Self: nur displayName + locale. Admin: alle Felder.',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<UserPublicRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();

      const existing = await pool.query<{ id: string; tenant_id: string }>(
        `SELECT id, tenant_id FROM users WHERE id = $1 AND is_deleted = FALSE`,
        [id]
      );
      const target = existing.rows[0];
      if (!target) throw new NotFoundError('errors.userNotFound');

      const { allowed, isSelf, isAdminScope } = canActOnUser(actor, target);
      if (!allowed) throw new ForbiddenError('errors.userCrossAccess');

      const input = parseOr400(updateUserSchema, request.body);

      // Self-Update darf weder role noch email ändern
      if (isSelf && !isAdminScope) {
        if (input.role !== undefined) {
          throw new ForbiddenError('errors.roleChangeForbidden');
        }
        if (input.email !== undefined) {
          throw new ForbiddenError('errors.emailChangeForbidden');
        }
      }

      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      if (input.email !== undefined) {
        fields.push(`email = $${p++}`);
        values.push(input.email);
      }
      if (input.displayName !== undefined) {
        fields.push(`display_name = $${p++}`);
        values.push(input.displayName);
      }
      if (input.role !== undefined) {
        fields.push(`role = $${p++}`);
        values.push(input.role);
      }
      if (input.locale !== undefined) {
        fields.push(`locale = $${p++}`);
        values.push(input.locale);
      }
      fields.push(`updated_at = NOW()`);
      fields.push(`updated_by = $${p++}`);
      values.push(actor.userId);
      values.push(id);

      try {
        const result = await pool.query<UserPublicRow>(
          `UPDATE users SET ${fields.join(', ')}
           WHERE id = $${p} AND is_deleted = FALSE
           RETURNING ${USER_COLUMNS}`,
          values
        );
        const user = result.rows[0];
        if (!user) throw new NotFoundError('errors.userNotFound');
        request.log.info(
          { action: 'user.update', userId: id, by: actor.userId },
          'User aktualisiert'
        );
        return user;
      } catch (err) {
        const e = err as { code?: string; constraint?: string };
        if (e.code === '23505' && e.constraint === 'uq_users_email') {
          throw new EmailExistsError();
        }
        throw err;
      }
    },
  });

  // ─── DELETE /api/users/:id ───────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/api/users/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete eines Users. Kein self-delete.',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request, reply): Promise<{ ok: true }> => {
      const actor = request.user!;
      const { id } = request.params;
      if (id === actor.userId) throw new SelfDeleteForbiddenError();

      const pool = getOwnerPool();
      const existing = await pool.query<{ id: string; tenant_id: string }>(
        `SELECT id, tenant_id FROM users WHERE id = $1 AND is_deleted = FALSE`,
        [id]
      );
      const target = existing.rows[0];
      if (!target) throw new NotFoundError('errors.userNotFound');
      const { isAdminScope } = canActOnUser(actor, target);
      if (!isAdminScope) {
        throw new ForbiddenError('errors.forbidden');
      }

      await pool.query(
        `UPDATE users SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );

      await pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id)
         VALUES ($1, $2, 'user.delete', 'user', $3)`,
        [target.tenant_id, actor.userId, id]
      );

      request.log.info({ action: 'user.delete', userId: id, by: actor.userId }, 'User gelöscht');
      reply.code(204);
      return { ok: true };
    },
  });

  // ─── POST /api/users/:id/change-password ─────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/api/users/:id/change-password', {
    preHandler: requireAuth,
    schema: {
      description:
        'Passwort ändern. Self: oldPassword Pflicht. Admin: oldPassword optional, setzt must_change_password.',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ ok: true }> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();

      const existing = await pool.query<{
        id: string;
        tenant_id: string;
        password_hash: string;
      }>(
        `SELECT id, tenant_id, password_hash FROM users
         WHERE id = $1 AND is_deleted = FALSE`,
        [id]
      );
      const target = existing.rows[0];
      if (!target) throw new NotFoundError('errors.userNotFound');

      const { allowed, isSelf, isAdminScope } = canActOnUser(actor, target);
      if (!allowed) throw new ForbiddenError('errors.userCrossAccess');

      const input = parseOr400(changePasswordSchema, request.body);

      // Self-Pfad: jeder muss sein altes Passwort kennen — auch ein ADMIN.
      // Admin-Reset (für ANDEREN User): kein oldPassword nötig, must_change_password = TRUE.
      if (isSelf) {
        if (!input.oldPassword) {
          throw new ValidationError('errors.oldPasswordRequired');
        }
        const ok = await comparePassword(input.oldPassword, target.password_hash);
        if (!ok) throw new UnauthorizedError('errors.oldPasswordWrong');
      }

      const hash = await hashPassword(input.newPassword);
      const mustChange = !isSelf && isAdminScope; // Admin-Reset zwingt zum Wechsel
      await pool.query(
        `UPDATE users
         SET password_hash = $1,
             password_changed_at = NOW(),
             must_change_password = $3,
             failed_login_count = 0,
             locked_until = NULL,
             updated_at = NOW(),
             updated_by = $4
         WHERE id = $2`,
        [hash, id, mustChange, actor.userId]
      );

      request.log.info(
        { action: 'user.change_password', userId: id, by: actor.userId, adminReset: mustChange },
        'Passwort geändert'
      );
      return { ok: true };
    },
  });

  // ─── PATCH /api/users/me/locale ──────────────────────────────────────────
  fastify.patch('/api/users/me/locale', {
    preHandler: requireAuth,
    schema: {
      description: 'Setzt die Locale des eingeloggten Users (i18n, ADR-16)',
      tags: ['users'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ locale: string }> => {
      const actor = request.user!;
      const input = parseOr400(updateLocaleSchema, request.body);
      const pool = getOwnerPool();
      const result = await pool.query<{ locale: string }>(
        `UPDATE users SET locale = $1, updated_by = $2
         WHERE id = $2 AND is_deleted = FALSE
         RETURNING locale`,
        [input.locale, actor.userId]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.userNotFound');
      request.log.info(
        { action: 'user.locale_update', userId: actor.userId, locale: input.locale },
        'Locale geändert'
      );
      return { locale: row.locale };
    },
  });
}
