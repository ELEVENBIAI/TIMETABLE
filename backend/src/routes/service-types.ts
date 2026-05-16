// Service-Types CRUD (ELE-171)
// Stammdaten: Leistungsarten (Treppenhaus, Garten, Müll, Winter, ...).
// Lesen: alle authentifizierten User (UI-Picker).
// Schreiben/Löschen: nur ADMIN/PLANNER.
// DELETE blockiert wenn referenziert in property_services oder schedule_entries.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createServiceTypeSchema,
  updateServiceTypeSchema,
  type ServiceTypeRow,
} from '../schemas/service-types.js';

const COLUMNS = `id, tenant_id, name, short_name, category, color_code, icon,
  default_duration_min, requires_qualification, sort_order, is_active,
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

export async function serviceTypeRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── GET /api/service-types ──────────────────────────────────────────────
  fastify.get('/api/service-types', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert alle Service-Types des eigenen Tenants',
      tags: ['service-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ serviceTypes: ServiceTypeRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const result = await pool.query<ServiceTypeRow>(
        `SELECT ${COLUMNS} FROM service_types
         WHERE tenant_id = $1 AND is_deleted = FALSE
         ORDER BY sort_order, name`,
        [actor.tenantId]
      );
      return { serviceTypes: result.rows };
    },
  });

  // ─── GET /api/service-types/:id ──────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/service-types/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Service-Type nach ID',
      tags: ['service-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ServiceTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const result = await pool.query<ServiceTypeRow>(
        `SELECT ${COLUMNS} FROM service_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.serviceTypeNotFound');
      return row;
    },
  });

  // ─── POST /api/service-types ─────────────────────────────────────────────
  fastify.post('/api/service-types', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Service-Type im eigenen Tenant an',
      tags: ['service-types'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<ServiceTypeRow> => {
      const actor = request.user!;
      const input = parseOr400(createServiceTypeSchema, request.body);
      const pool = getOwnerPool();
      const result = await pool.query<ServiceTypeRow>(
        `INSERT INTO service_types (
           tenant_id, name, short_name, category, color_code, icon,
           default_duration_min, requires_qualification, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          input.name,
          input.shortName,
          input.category,
          input.colorCode,
          input.icon ?? null,
          input.defaultDurationMin,
          input.requiresQualification ?? null,
          input.sortOrder ?? 0,
        ]
      );
      request.log.info(
        { action: 'service_type.create', id: result.rows[0].id, by: actor.userId },
        'Service-Type erstellt'
      );
      reply.code(201);
      return result.rows[0];
    },
  });

  // ─── PUT /api/service-types/:id ──────────────────────────────────────────
  fastify.put<{ Params: { id: string } }>('/api/service-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Service-Type',
      tags: ['service-types'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ServiceTypeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateServiceTypeSchema, request.body);

      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      const fieldMap: Record<string, string> = {
        name: 'name',
        shortName: 'short_name',
        category: 'category',
        colorCode: 'color_code',
        icon: 'icon',
        defaultDurationMin: 'default_duration_min',
        requiresQualification: 'requires_qualification',
        sortOrder: 'sort_order',
        isActive: 'is_active',
      };
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && fieldMap[k]) {
          fields.push(`${fieldMap[k]} = $${p++}`);
          values.push(v);
        }
      }
      values.push(id);
      values.push(actor.tenantId);

      const pool = getOwnerPool();
      const result = await pool.query<ServiceTypeRow>(
        `UPDATE service_types SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLUMNS}`,
        values
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.serviceTypeNotFound');
      request.log.info(
        { action: 'service_type.update', id, by: actor.userId },
        'Service-Type aktualisiert'
      );
      return row;
    },
  });

  // ─── DELETE /api/service-types/:id ───────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/api/service-types/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete eines Service-Types. 409 wenn referenziert.',
      tags: ['service-types'],
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

      // Existenz-Check
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM service_types
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.serviceTypeNotFound');

      // Referenzen-Check
      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM property_services
           WHERE service_type_id = $1 AND is_deleted = FALSE
         ) OR EXISTS (
           SELECT 1 FROM schedule_entries
           WHERE service_type_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE service_types SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1`,
        [id]
      );
      request.log.info(
        { action: 'service_type.delete', id, by: actor.userId },
        'Service-Type gelöscht'
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
