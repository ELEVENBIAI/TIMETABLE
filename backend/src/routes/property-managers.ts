// Property-Managers CRUD + Schnellsuche (ELE-175)
// - Lesen: alle authentifizierten User
// - Schreiben/Löschen: ADMIN/PLANNER (DELETE: nur ADMIN)
// - Schnellsuche via pg_trgm-GIN-Index (Migration 0007)
//   Pattern: name % $q OR name ILIKE %$q% — der `%`-Operator nutzt den Index
// - DELETE blockiert wenn Verträge oder Properties referenzieren

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createPropertyManagerSchema,
  updatePropertyManagerSchema,
  type PropertyManagerRow,
} from '../schemas/property-managers.js';

const COLS = `id, tenant_id, name, contact_name, email, phone, address, notes,
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

async function loadPropertyManager(
  pool: ReturnType<typeof getOwnerPool>,
  id: string,
  tenantId: string
): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM property_managers
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [id, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.propertyManagerNotFound');
  return r.rows[0];
}

export async function propertyManagerRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/property-managers?q=...
  fastify.get<{ Querystring: { q?: string } }>('/api/property-managers', {
    preHandler: requireAuth,
    schema: {
      description:
        'Liefert alle Hausverwaltungen. ?q=<text> nutzt pg_trgm-GIN-Index für Schnellsuche (name + email + contact_name).',
      tags: ['property-managers'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { q: { type: 'string', maxLength: 100 } },
      },
    },
    handler: async (request): Promise<{ propertyManagers: PropertyManagerRow[] }> => {
      const actor = request.user!;
      const q = request.query.q?.trim();
      const pool = getOwnerPool();
      let result;
      if (q) {
        const pattern = `%${q}%`;
        // ILIKE über drei Trigram-indexierte Spalten — GIN nutzt den Trigram-Index.
        // (Trigram braucht ≥3 Zeichen; bei kürzeren Querys fällt der Planner auf
        //  Seq-Scan zurück, was bei der Datenmenge im Pilot kein Problem ist.)
        result = await pool.query<PropertyManagerRow>(
          `SELECT ${COLS} FROM property_managers
           WHERE tenant_id = $1 AND is_deleted = FALSE
             AND (
               name ILIKE $2
               OR (email IS NOT NULL AND email ILIKE $2)
               OR (contact_name IS NOT NULL AND contact_name ILIKE $2)
             )
           ORDER BY name
           LIMIT 100`,
          [actor.tenantId, pattern]
        );
      } else {
        result = await pool.query<PropertyManagerRow>(
          `SELECT ${COLS} FROM property_managers
           WHERE tenant_id = $1 AND is_deleted = FALSE
           ORDER BY name
           LIMIT 500`,
          [actor.tenantId]
        );
      }
      return { propertyManagers: result.rows };
    },
  });

  // GET /api/property-managers/:id
  fastify.get<{ Params: { id: string } }>('/api/property-managers/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert eine Hausverwaltung nach ID',
      tags: ['property-managers'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<PropertyManagerRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<PropertyManagerRow>(
        `SELECT ${COLS} FROM property_managers
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.propertyManagerNotFound');
      return row;
    },
  });

  // POST /api/property-managers
  fastify.post('/api/property-managers', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt eine neue Hausverwaltung an',
      tags: ['property-managers'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<PropertyManagerRow> => {
      const actor = request.user!;
      const input = parseOr400(createPropertyManagerSchema, request.body);
      const pool = getOwnerPool();
      const r = await pool.query<PropertyManagerRow>(
        `INSERT INTO property_managers
           (tenant_id, name, contact_name, email, phone, address, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${COLS}`,
        [
          actor.tenantId,
          input.name,
          input.contactName ?? null,
          input.email ?? null,
          input.phone ?? null,
          input.address ?? null,
          input.notes ?? null,
          actor.userId,
        ]
      );
      request.log.info(
        { action: 'property_manager.create', id: r.rows[0].id, by: actor.userId },
        'Property-Manager erstellt'
      );
      reply.code(201);
      return r.rows[0];
    },
  });

  // PUT /api/property-managers/:id
  fastify.put<{ Params: { id: string } }>('/api/property-managers/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert eine Hausverwaltung',
      tags: ['property-managers'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<PropertyManagerRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updatePropertyManagerSchema, request.body);
      const fieldMap: Record<string, string> = {
        name: 'name',
        contactName: 'contact_name',
        email: 'email',
        phone: 'phone',
        address: 'address',
        notes: 'notes',
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
      fields.push(`updated_by = $${p++}`);
      values.push(actor.userId);
      values.push(id);
      values.push(actor.tenantId);

      const pool = getOwnerPool();
      const r = await pool.query<PropertyManagerRow>(
        `UPDATE property_managers SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.propertyManagerNotFound');
      return row;
    },
  });

  // DELETE /api/property-managers/:id
  fastify.delete<{ Params: { id: string } }>('/api/property-managers/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn Verträge oder Properties referenzieren.',
      tags: ['property-managers'],
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
      await loadPropertyManager(pool, id, actor.tenantId);

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM contracts
           WHERE property_manager_id = $1 AND is_deleted = FALSE
         ) OR EXISTS (
           SELECT 1 FROM properties
           WHERE property_manager_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE property_managers SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
