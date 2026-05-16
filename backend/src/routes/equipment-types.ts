// Equipment-Types CRUD (ELE-172)
// hourly_rate_factor steuert Soll-Dauer-Berechnung im Scheduler.
// Lesen: alle authentifizierten User. Schreiben: ADMIN/PLANNER. Delete: ADMIN.
// DELETE blockiert wenn in employee_equipment referenziert.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createEquipmentTypeSchema,
  updateEquipmentTypeSchema,
  type EquipmentTypeRow,
} from '../schemas/equipment-types.js';

const COLUMNS = `id, tenant_id, code, name, category, hourly_rate_factor, description,
  is_active, created_at, updated_at`;

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

export async function equipmentTypeRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/equipment-types
  fastify.get('/api/equipment-types', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert alle Equipment-Typen des eigenen Tenants',
      tags: ['equipment-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ equipmentTypes: EquipmentTypeRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const result = await pool.query<EquipmentTypeRow>(
        `SELECT ${COLUMNS} FROM equipment_types
         WHERE tenant_id = $1 AND is_deleted = FALSE
         ORDER BY category, name`,
        [actor.tenantId]
      );
      return { equipmentTypes: result.rows };
    },
  });

  // GET /api/equipment-types/:id
  fastify.get<{ Params: { id: string } }>('/api/equipment-types/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Equipment-Typ nach ID',
      tags: ['equipment-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<EquipmentTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const result = await pool.query<EquipmentTypeRow>(
        `SELECT ${COLUMNS} FROM equipment_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.equipmentTypeNotFound');
      return row;
    },
  });

  // POST /api/equipment-types
  fastify.post('/api/equipment-types', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Equipment-Typ an',
      tags: ['equipment-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<EquipmentTypeRow> => {
      const actor = request.user!;
      const input = parseOr400(createEquipmentTypeSchema, request.body);
      const pool = getOwnerPool();
      try {
        const result = await pool.query<EquipmentTypeRow>(
          `INSERT INTO equipment_types (tenant_id, code, name, category, hourly_rate_factor, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING ${COLUMNS}`,
          [
            actor.tenantId,
            input.code,
            input.name,
            input.category,
            input.hourlyRateFactor,
            input.description ?? null,
          ]
        );
        request.log.info(
          { action: 'equipment_type.create', id: result.rows[0].id, by: actor.userId },
          'Equipment-Type erstellt'
        );
        reply.code(201);
        return result.rows[0];
      } catch (err) {
        mapPgError(err);
      }
    },
  });

  // PUT /api/equipment-types/:id
  fastify.put<{ Params: { id: string } }>('/api/equipment-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Equipment-Typ',
      tags: ['equipment-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<EquipmentTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateEquipmentTypeSchema, request.body);

      const fieldMap: Record<string, string> = {
        code: 'code',
        name: 'name',
        category: 'category',
        hourlyRateFactor: 'hourly_rate_factor',
        description: 'description',
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
        const result = await pool.query<EquipmentTypeRow>(
          `UPDATE equipment_types SET ${fields.join(', ')}
           WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
           RETURNING ${COLUMNS}`,
          values
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('errors.equipmentTypeNotFound');
        return row;
      } catch (err) {
        if (err instanceof HttpError) throw err;
        mapPgError(err);
      }
    },
  });

  // DELETE /api/equipment-types/:id
  fastify.delete<{ Params: { id: string } }>('/api/equipment-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn in employee_equipment referenziert.',
      tags: ['equipment-types'],
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

      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM equipment_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.equipmentTypeNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM employee_equipment
           WHERE equipment_type_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE equipment_types SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1`,
        [id]
      );
      request.log.info(
        { action: 'equipment_type.delete', id, by: actor.userId },
        'Equipment-Type gelöscht'
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
