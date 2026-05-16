// Qualification-Types CRUD (ELE-172)
// Lesen: alle authentifizierten User. Schreiben: ADMIN/PLANNER. Delete: ADMIN.
// DELETE blockiert wenn in employee_qualifications oder
// service_types.requires_qualification (Code-Match) referenziert.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createQualificationTypeSchema,
  updateQualificationTypeSchema,
  type QualificationTypeRow,
} from '../schemas/qualification-types.js';

const COLUMNS = `id, tenant_id, code, name, description, requires_proof, is_active,
  created_at, updated_at`;

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

class InUseError extends HttpError {
  constructor() {
    super(409, 'IN_USE', 'errors.inUse', 'errors.inUse');
  }
}

class DuplicateCodeError extends HttpError {
  constructor() {
    super(409, 'DUPLICATE_CODE', 'errors.duplicateCode', 'errors.duplicateCode');
  }
}

function mapPgError(err: unknown): never {
  const e = err as { code?: string };
  if (e.code === '23505') throw new DuplicateCodeError();
  throw err as Error;
}

export async function qualificationTypeRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/qualification-types
  fastify.get('/api/qualification-types', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert alle Qualifikations-Typen des eigenen Tenants',
      tags: ['qualification-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ qualificationTypes: QualificationTypeRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const result = await pool.query<QualificationTypeRow>(
        `SELECT ${COLUMNS} FROM qualification_types
         WHERE tenant_id = $1 AND is_deleted = FALSE
         ORDER BY name`,
        [actor.tenantId]
      );
      return { qualificationTypes: result.rows };
    },
  });

  // GET /api/qualification-types/:id
  fastify.get<{ Params: { id: string } }>('/api/qualification-types/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Qualifikations-Typ nach ID',
      tags: ['qualification-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<QualificationTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const result = await pool.query<QualificationTypeRow>(
        `SELECT ${COLUMNS} FROM qualification_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.qualificationTypeNotFound');
      return row;
    },
  });

  // POST /api/qualification-types
  fastify.post('/api/qualification-types', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Qualifikations-Typ an',
      tags: ['qualification-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<QualificationTypeRow> => {
      const actor = request.user!;
      const input = parseOr400(createQualificationTypeSchema, request.body);
      const pool = getOwnerPool();
      try {
        const result = await pool.query<QualificationTypeRow>(
          `INSERT INTO qualification_types (tenant_id, code, name, description, requires_proof)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ${COLUMNS}`,
          [
            actor.tenantId,
            input.code,
            input.name,
            input.description ?? null,
            input.requiresProof ?? false,
          ]
        );
        request.log.info(
          { action: 'qualification_type.create', id: result.rows[0].id, by: actor.userId },
          'Qualification-Type erstellt'
        );
        reply.code(201);
        return result.rows[0];
      } catch (err) {
        mapPgError(err);
      }
    },
  });

  // PUT /api/qualification-types/:id
  fastify.put<{ Params: { id: string } }>('/api/qualification-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Qualifikations-Typ',
      tags: ['qualification-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<QualificationTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateQualificationTypeSchema, request.body);

      const fieldMap: Record<string, string> = {
        code: 'code',
        name: 'name',
        description: 'description',
        requiresProof: 'requires_proof',
        isActive: 'is_active',
      };
      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && fieldMap[k]) {
          fields.push(`${fieldMap[k]} = $${p++}`);
          values.push(v);
        }
      }
      values.push(id);
      values.push(actor.tenantId);

      const pool = getOwnerPool();
      try {
        const result = await pool.query<QualificationTypeRow>(
          `UPDATE qualification_types SET ${fields.join(', ')}
           WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
           RETURNING ${COLUMNS}`,
          values
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('errors.qualificationTypeNotFound');
        return row;
      } catch (err) {
        if (err instanceof HttpError) throw err;
        mapPgError(err);
      }
    },
  });

  // DELETE /api/qualification-types/:id
  fastify.delete<{ Params: { id: string } }>('/api/qualification-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description:
        'Soft-Delete. 409 wenn in employee_qualifications oder service_types.requires_qualification referenziert.',
      tags: ['qualification-types'],
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
      const pool = getOwnerPool();

      const existing = await pool.query<{ id: string; code: string }>(
        `SELECT id, code FROM qualification_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const target = existing.rows[0];
      if (!target) throw new NotFoundError('errors.qualificationTypeNotFound');

      // Referenzen-Check: junction table + service_types.requires_qualification (Code-Match)
      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM employee_qualifications
           WHERE qualification_type_id = $1 AND is_deleted = FALSE
         ) OR EXISTS (
           SELECT 1 FROM service_types
           WHERE tenant_id = $3 AND requires_qualification = $2 AND is_deleted = FALSE
         ) AS in_use`,
        [id, target.code, actor.tenantId]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE qualification_types SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1`,
        [id]
      );
      request.log.info(
        { action: 'qualification_type.delete', id, by: actor.userId },
        'Qualification-Type gelöscht'
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
