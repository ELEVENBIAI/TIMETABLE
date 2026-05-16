// Property Services (Leistungsverzeichnis, ELE-177)
// Pro Objekt: welche Leistung wird in welcher Frequenz erbracht.
// frequency_detail wird per Zod gegen die gewählte frequency validiert.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createPropertyServiceSchema,
  updatePropertyServiceSchema,
  validateFrequencyDetail,
  type Frequency,
  type PropertyServiceRow,
} from '../schemas/property-services.js';

const COLS = `id, tenant_id, property_id, service_type_id, frequency, frequency_detail,
  estimated_duration_min, time_window_start, time_window_end, priority, notes,
  seasonal_start, seasonal_end, is_active, created_at, updated_at`;

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

function validateFreq(frequency: Frequency, detail: unknown): Record<string, unknown> {
  try {
    return validateFrequencyDetail(frequency, detail);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new HttpError(
        400,
        'INVALID_FREQUENCY_DETAIL',
        'errors.invalidFrequencyDetail',
        'errors.invalidFrequencyDetail',
        { details }
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

async function assertServiceTypeInTenant(
  pool: ReturnType<typeof getOwnerPool>,
  serviceTypeId: string,
  tenantId: string
): Promise<void> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM service_types
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [serviceTypeId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.serviceTypeNotFound');
}

export async function propertyServiceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { propertyId?: string } }>('/api/property-services', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert Leistungen. Optional ?propertyId=<uuid> als Filter.',
      tags: ['property-services'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { propertyId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ propertyServices: PropertyServiceRow[] }> => {
      const actor = request.user!;
      const { propertyId } = request.query;
      const pool = getOwnerPool();
      const params: unknown[] = [actor.tenantId];
      let where = `tenant_id = $1 AND is_deleted = FALSE`;
      if (propertyId) {
        params.push(propertyId);
        where += ` AND property_id = $${params.length}`;
      }
      const result = await pool.query<PropertyServiceRow>(
        `SELECT ${COLS} FROM property_services WHERE ${where}
         ORDER BY priority, created_at`,
        params
      );
      return { propertyServices: result.rows };
    },
  });

  fastify.get<{ Params: { id: string } }>('/api/property-services/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert eine Leistung nach ID',
      tags: ['property-services'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<PropertyServiceRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<PropertyServiceRow>(
        `SELECT ${COLS} FROM property_services
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.propertyServiceNotFound');
      return row;
    },
  });

  fastify.post('/api/property-services', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt eine neue Leistungsverzeichnis-Position an',
      tags: ['property-services'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<PropertyServiceRow> => {
      const actor = request.user!;
      const input = parseOr400(createPropertyServiceSchema, request.body);
      const detail = validateFreq(input.frequency, input.frequencyDetail);

      const pool = getOwnerPool();
      await assertPropertyInTenant(pool, input.propertyId, actor.tenantId);
      await assertServiceTypeInTenant(pool, input.serviceTypeId, actor.tenantId);

      const result = await pool.query<PropertyServiceRow>(
        `INSERT INTO property_services (
           tenant_id, property_id, service_type_id, frequency, frequency_detail,
           estimated_duration_min, time_window_start, time_window_end, priority, notes,
           seasonal_start, seasonal_end, created_by
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING ${COLS}`,
        [
          actor.tenantId,
          input.propertyId,
          input.serviceTypeId,
          input.frequency,
          JSON.stringify(detail),
          input.estimatedDurationMin,
          input.timeWindowStart ?? null,
          input.timeWindowEnd ?? null,
          input.priority ?? 3,
          input.notes ?? null,
          input.seasonalStart ?? null,
          input.seasonalEnd ?? null,
          actor.userId,
        ]
      );
      request.log.info(
        { action: 'property_service.create', id: result.rows[0].id, by: actor.userId },
        'Property-Service erstellt'
      );
      reply.code(201);
      return result.rows[0];
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/property-services/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert eine Property-Service',
      tags: ['property-services'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<PropertyServiceRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updatePropertyServiceSchema, request.body);
      const pool = getOwnerPool();

      // Wenn frequency oder frequency_detail geändert wird → revalidate.
      // Aktuelle Werte aus DB laden, fehlende vom Input überlagern.
      if (input.frequency !== undefined || input.frequencyDetail !== undefined) {
        const cur = await pool.query<{ frequency: string; frequency_detail: unknown }>(
          `SELECT frequency, frequency_detail FROM property_services
           WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
          [id, actor.tenantId]
        );
        if (cur.rowCount === 0) throw new NotFoundError('errors.propertyServiceNotFound');
        const freq = (input.frequency ?? cur.rows[0].frequency) as Frequency;
        const detail = input.frequencyDetail ?? cur.rows[0].frequency_detail;
        const validated = validateFreq(freq, detail);
        input.frequencyDetail = validated;
      }

      const fieldMap: Record<string, string> = {
        propertyId: 'property_id',
        serviceTypeId: 'service_type_id',
        frequency: 'frequency',
        frequencyDetail: 'frequency_detail',
        estimatedDurationMin: 'estimated_duration_min',
        timeWindowStart: 'time_window_start',
        timeWindowEnd: 'time_window_end',
        priority: 'priority',
        notes: 'notes',
        seasonalStart: 'seasonal_start',
        seasonalEnd: 'seasonal_end',
        isActive: 'is_active',
      };
      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && fieldMap[k]) {
          if (k === 'frequencyDetail') {
            fields.push(`${fieldMap[k]} = $${p++}::jsonb`);
            values.push(JSON.stringify(v));
          } else {
            fields.push(`${fieldMap[k]} = $${p++}`);
            values.push(v);
          }
        }
      }
      fields.push(`updated_by = $${p++}`);
      values.push(actor.userId);
      values.push(id);
      values.push(actor.tenantId);

      const r = await pool.query<PropertyServiceRow>(
        `UPDATE property_services SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.propertyServiceNotFound');
      return row;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/property-services/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Soft-Delete. 409 wenn in schedule_entries referenziert.',
      tags: ['property-services'],
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
        `SELECT id FROM property_services
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.propertyServiceNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM schedule_entries
           WHERE property_service_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE property_services SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
