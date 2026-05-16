// Waste-Bin-Types CRUD (ELE-178)
// Stammdaten der Tonnen-Arten (RESIDUAL/PAPER/YELLOW_SACK/...).
// Lesen: alle Auth. Schreiben: ADMIN/PLANNER. Delete: ADMIN.
// DELETE blockiert wenn in waste_schedules referenziert.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createWasteBinTypeSchema,
  updateWasteBinTypeSchema,
  type WasteBinTypeRow,
} from '../schemas/waste-bin-types.js';

const COLS = `id, tenant_id, code, name, color_code, description, is_active,
  created_at, updated_at`;

function parseOr400<T>(schema: { parse(v: unknown): T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      const isColor = err.issues.some((i) => i.path.includes('colorCode'));
      throw new ValidationError(
        isColor ? 'errors.invalidColorCode' : 'errors.validationDetails',
        isColor ? undefined : { details }
      );
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

export async function wasteBinTypeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/waste-bin-types', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert alle Waste-Bin-Types des eigenen Tenants',
      tags: ['waste-bin-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ wasteBinTypes: WasteBinTypeRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const r = await pool.query<WasteBinTypeRow>(
        `SELECT ${COLS} FROM waste_bin_types
         WHERE tenant_id = $1 AND is_deleted = FALSE
         ORDER BY name`,
        [actor.tenantId]
      );
      return { wasteBinTypes: r.rows };
    },
  });

  fastify.get<{ Params: { id: string } }>('/api/waste-bin-types/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Waste-Bin-Type nach ID',
      tags: ['waste-bin-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<WasteBinTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<WasteBinTypeRow>(
        `SELECT ${COLS} FROM waste_bin_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.wasteBinTypeNotFound');
      return row;
    },
  });

  fastify.post('/api/waste-bin-types', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Waste-Bin-Type an',
      tags: ['waste-bin-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<WasteBinTypeRow> => {
      const actor = request.user!;
      const input = parseOr400(createWasteBinTypeSchema, request.body);
      const pool = getOwnerPool();
      try {
        const r = await pool.query<WasteBinTypeRow>(
          `INSERT INTO waste_bin_types (tenant_id, code, name, color_code, description)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ${COLS}`,
          [
            actor.tenantId,
            input.code,
            input.name,
            input.colorCode ?? null,
            input.description ?? null,
          ]
        );
        request.log.info(
          { action: 'waste_bin_type.create', id: r.rows[0].id, by: actor.userId },
          'Waste-Bin-Type created'
        );
        reply.code(201);
        return r.rows[0];
      } catch (err) {
        mapPgError(err);
      }
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/waste-bin-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Waste-Bin-Type',
      tags: ['waste-bin-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<WasteBinTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateWasteBinTypeSchema, request.body);
      const fieldMap: Record<string, string> = {
        code: 'code',
        name: 'name',
        colorCode: 'color_code',
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
        const r = await pool.query<WasteBinTypeRow>(
          `UPDATE waste_bin_types SET ${fields.join(', ')}
           WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
           RETURNING ${COLS}`,
          values
        );
        const row = r.rows[0];
        if (!row) throw new NotFoundError('errors.wasteBinTypeNotFound');
        return row;
      } catch (err) {
        if (err instanceof HttpError) throw err;
        mapPgError(err);
      }
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/waste-bin-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn in waste_schedules referenziert.',
      tags: ['waste-bin-types'],
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
        `SELECT id FROM waste_bin_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.wasteBinTypeNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM waste_schedules
           WHERE waste_bin_type_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE waste_bin_types SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1`,
        [id]
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
