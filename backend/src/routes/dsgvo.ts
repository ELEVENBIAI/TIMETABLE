// DSGVO-Routes (ELE-187):
//   POST /api/dsgvo/data-export       — Art. 15 Auskunft (ZIP-Download)
//   POST /api/dsgvo/delete-request    — Art. 17 Löschung (Phase 1: Soft-Delete)
//   GET  /api/dsgvo/audit-log         — Art. 30 Auswertung (JSON oder CSV)
//
// Alle Endpoints schreiben ihre Aktion in audit_log (Append-Only).

import type { FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { ForbiddenError } from '../auth/authorize.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import { aggregateUserData, buildReport } from '../services/dsgvo/export.js';
import { softDeleteUser } from '../services/dsgvo/delete.js';
import { queryAuditLog, toCsv } from '../services/dsgvo/audit.js';
import {
  auditLogQuerySchema,
  dataExportInputSchema,
  deleteRequestInputSchema,
} from '../schemas/dsgvo.js';

class ConfirmEmailMismatchError extends HttpError {
  constructor() {
    super(
      400,
      'CONFIRM_EMAIL_MISMATCH',
      'errors.dsgvo.confirmEmailMismatch',
      'errors.dsgvo.confirmEmailMismatch'
    );
  }
}

function parseOr400<T>(schema: { parse(v: unknown): T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new ValidationError('errors.validationDetails', { details });
    }
    throw err;
  }
}

export async function dsgvoRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── POST /api/dsgvo/data-export ────────────────────────────────────────
  fastify.post('/api/dsgvo/data-export', {
    preHandler: requireAuth,
    schema: {
      description:
        'DSGVO Art. 15 Datenauskunft. EMPLOYEE: nur eigene Daten. ADMIN: beliebigen userId.',
      tags: ['dsgvo'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: { userId: { type: 'string', format: 'uuid' } },
      },
      response: {
        200: { type: 'string', description: 'ZIP-Datei mit data.json + report.md' },
      },
    },
    handler: async (request, reply) => {
      const actor = request.user!;
      const input = parseOr400(dataExportInputSchema, request.body ?? {});

      // EMPLOYEE darf nur sich selbst exportieren, ADMIN beliebige User
      const isAdminScope = actor.isSuperAdmin || actor.role === 'ADMIN';
      const targetUserId = input.userId ?? actor.userId;
      if (!isAdminScope && targetUserId !== actor.userId) {
        throw new ForbiddenError('errors.roleNotAllowed');
      }

      const pool = getOwnerPool();

      // User muss im selben Tenant existieren
      const userExists = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1 AND tenant_id = $2`,
        [targetUserId, actor.tenantId]
      );
      if (userExists.rowCount === 0) {
        throw new NotFoundError('errors.userNotFound');
      }

      const data = await aggregateUserData(pool, actor.tenantId, targetUserId);
      const report = buildReport(data);

      const zip = new JSZip();
      zip.file('data.json', JSON.stringify(data, null, 2));
      zip.file('report.md', report);
      const buf = await zip.generateAsync({ type: 'nodebuffer' });

      // Audit-Log
      await pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, 'dsgvo.export', 'user', $3, $4::jsonb)`,
        [
          actor.tenantId,
          actor.userId,
          targetUserId,
          JSON.stringify({ selfService: targetUserId === actor.userId }),
        ]
      );

      reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="dsgvo-export-${targetUserId}.zip"`);
      return reply.send(buf);
    },
  });

  // ─── POST /api/dsgvo/delete-request ─────────────────────────────────────
  fastify.post('/api/dsgvo/delete-request', {
    preHandler: requireAuth,
    schema: {
      description:
        'DSGVO Art. 17 Löschung (Phase 1 Soft-Delete). Self-Service mit confirmEmail-Check oder ADMIN-Action.',
      tags: ['dsgvo'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId', 'reason'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          reason: { type: 'string', minLength: 3, maxLength: 500 },
          confirmEmail: { type: 'string', format: 'email' },
        },
      },
    },
    handler: async (request) => {
      const actor = request.user!;
      const input = parseOr400(deleteRequestInputSchema, request.body);
      const pool = getOwnerPool();

      const isAdminScope = actor.isSuperAdmin || actor.role === 'ADMIN';
      const isSelf = input.userId === actor.userId;

      if (!isAdminScope && !isSelf) {
        throw new ForbiddenError('errors.roleNotAllowed');
      }

      // User-Email für confirm-check (Self-Service)
      const userRes = await pool.query<{ email: string }>(
        `SELECT email FROM users WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [input.userId, actor.tenantId]
      );
      if (userRes.rowCount === 0) {
        throw new NotFoundError('errors.userNotFound');
      }

      // Self-Service-Lösch-Bestätigung
      if (isSelf && !isAdminScope) {
        if (!input.confirmEmail || input.confirmEmail !== userRes.rows[0].email) {
          throw new ConfirmEmailMismatchError();
        }
      }

      const result = await softDeleteUser(pool, {
        userId: input.userId,
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        reason: input.reason,
      });

      request.log.info(
        { action: 'dsgvo.delete_requested', userId: input.userId, by: actor.userId },
        'DSGVO soft-delete requested'
      );

      return {
        ok: true,
        hardDeleteAt: result.hardDeleteAt,
        affectedTables: result.affectedTables,
      };
    },
  });

  // ─── GET /api/dsgvo/audit-log ───────────────────────────────────────────
  fastify.get('/api/dsgvo/audit-log', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description:
        'DSGVO Art. 30 Audit-Log-Auswertung. ADMIN/SUPER_ADMIN only. Pagination + CSV-Export.',
      tags: ['dsgvo'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          action: { type: 'string', pattern: '^[a-z_]+\\.[a-z_]+$' },
          targetType: { type: 'string', minLength: 1, maxLength: 50 },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' },
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 200 },
          format: { type: 'string', enum: ['json', 'csv'] },
        },
      },
    },
    handler: async (request, reply) => {
      const actor = request.user!;
      const query = parseOr400(auditLogQuerySchema, request.query ?? {});
      const pool = getOwnerPool();

      const result = await queryAuditLog(pool, {
        tenantId: actor.tenantId,
        userId: query.userId,
        action: query.action,
        targetType: query.targetType,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        page: query.page,
        limit: query.limit,
      });

      if (query.format === 'csv') {
        reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="audit-log.csv"`);
        return reply.send(toCsv(result.rows));
      }

      return result;
    },
  });
}
