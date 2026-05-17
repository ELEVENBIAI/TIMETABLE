// Waste-Schedules CRUD (ELE-178)
// Abfuhrpläne pro Property × Waste-Bin-Type.
// collection_days JSONB wird per Zod validiert.
// Property + Waste-Bin-Type müssen im selben Tenant existieren.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import {
  collectionDaysSchema,
  createWasteScheduleSchema,
  updateWasteScheduleSchema,
  type WasteScheduleRow,
} from '../schemas/waste-schedules.js';

const COLS = `id, tenant_id, property_id, waste_bin_type_id, collection_days,
  collection_time, latest_put_out, earliest_take_in, bin_count,
  location_description, notes, is_active, created_at, updated_at`;

function parseOr400<T>(schema: { parse(v: unknown): T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      // collection_days-Pfad → eigener messageKey für Frontend
      const isCollectionDays = err.issues.some((i) => i.path.includes('collectionDays'));
      throw new ValidationError(
        isCollectionDays ? 'errors.invalidCollectionDays' : 'errors.validationDetails',
        isCollectionDays ? undefined : { details }
      );
    }
    throw err;
  }
}

async function assertPropertyInTenant(
  pool: ReturnType<typeof getOwnerPool>,
  propertyId: string,
  tenantId: string
): Promise<void> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM properties
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [propertyId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.propertyNotFound');
}

async function assertWasteBinTypeInTenant(
  pool: ReturnType<typeof getOwnerPool>,
  binTypeId: string,
  tenantId: string
): Promise<void> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM waste_bin_types
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [binTypeId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.wasteBinTypeNotFound');
}

export async function wasteScheduleRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { propertyId?: string } }>('/api/waste-schedules', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert Abfuhrpläne. Optional ?propertyId=<uuid> als Filter.',
      tags: ['waste-schedules'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { propertyId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ wasteSchedules: WasteScheduleRow[] }> => {
      const actor = request.user!;
      const { propertyId } = request.query;
      const pool = getOwnerPool();
      const params: unknown[] = [actor.tenantId];
      let where = `tenant_id = $1 AND is_deleted = FALSE`;
      if (propertyId) {
        params.push(propertyId);
        where += ` AND property_id = $${params.length}`;
      }
      const r = await pool.query<WasteScheduleRow>(
        `SELECT ${COLS} FROM waste_schedules WHERE ${where} ORDER BY created_at`,
        params
      );
      return { wasteSchedules: r.rows };
    },
  });

  fastify.get<{ Params: { id: string } }>('/api/waste-schedules/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Abfuhrplan nach ID',
      tags: ['waste-schedules'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<WasteScheduleRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<WasteScheduleRow>(
        `SELECT ${COLS} FROM waste_schedules
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.wasteScheduleNotFound');
      return row;
    },
  });

  fastify.post('/api/waste-schedules', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen Abfuhrplan an',
      tags: ['waste-schedules'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<WasteScheduleRow> => {
      const actor = request.user!;
      const input = parseOr400(createWasteScheduleSchema, request.body);
      const pool = getOwnerPool();
      await assertPropertyInTenant(pool, input.propertyId, actor.tenantId);
      await assertWasteBinTypeInTenant(pool, input.wasteBinTypeId, actor.tenantId);

      const r = await pool.query<WasteScheduleRow>(
        `INSERT INTO waste_schedules (
           tenant_id, property_id, waste_bin_type_id, collection_days,
           collection_time, latest_put_out, earliest_take_in,
           bin_count, location_description, notes
         ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
         RETURNING ${COLS}`,
        [
          actor.tenantId,
          input.propertyId,
          input.wasteBinTypeId,
          JSON.stringify(input.collectionDays),
          input.collectionTime ?? null,
          input.latestPutOut ?? null,
          input.earliestTakeIn ?? null,
          input.binCount ?? 1,
          input.locationDescription,
          input.notes ?? null,
        ]
      );
      request.log.info(
        { action: 'waste_schedule.create', id: r.rows[0].id, by: actor.userId },
        'Waste-Schedule created'
      );
      reply.code(201);
      return r.rows[0];
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/waste-schedules/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Abfuhrplan',
      tags: ['waste-schedules'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<WasteScheduleRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateWasteScheduleSchema, request.body);
      const pool = getOwnerPool();

      if (input.propertyId !== undefined) {
        await assertPropertyInTenant(pool, input.propertyId, actor.tenantId);
      }
      if (input.wasteBinTypeId !== undefined) {
        await assertWasteBinTypeInTenant(pool, input.wasteBinTypeId, actor.tenantId);
      }

      const fieldMap: Record<string, string> = {
        propertyId: 'property_id',
        wasteBinTypeId: 'waste_bin_type_id',
        collectionTime: 'collection_time',
        latestPutOut: 'latest_put_out',
        earliestTakeIn: 'earliest_take_in',
        binCount: 'bin_count',
        locationDescription: 'location_description',
        notes: 'notes',
        isActive: 'is_active',
      };
      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      for (const [k, v] of Object.entries(input)) {
        if (v === undefined) continue;
        if (k === 'collectionDays') {
          fields.push(`collection_days = $${p++}::jsonb`);
          values.push(JSON.stringify(v));
        } else if (fieldMap[k]) {
          fields.push(`${fieldMap[k]} = $${p++}`);
          values.push(v);
        }
      }
      values.push(id);
      values.push(actor.tenantId);

      const r = await pool.query<WasteScheduleRow>(
        `UPDATE waste_schedules SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.wasteScheduleNotFound');
      return row;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/waste-schedules/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Soft-Delete eines Abfuhrplans',
      tags: ['waste-schedules'],
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
      const r = await pool.query(
        `UPDATE waste_schedules SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (r.rowCount === 0) throw new NotFoundError('errors.wasteScheduleNotFound');
      reply.code(204);
      return { ok: true };
    },
  });
}

// re-export für Test-Convenience
export { collectionDaysSchema };
