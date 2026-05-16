// Properties + Property Zones (ELE-176)
// - Geocoding deferred → Welle 5 (lat/lng werden direkt entgegengenommen)
// - Simple ILIKE-Suche auf name + street (pg_trgm-Index existiert via init-SQL)
// - DELETE blockiert wenn in property_services oder schedule_entries referenziert

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createPropertySchema,
  createZoneSchema,
  updatePropertySchema,
  updateZoneSchema,
  type PropertyRow,
  type PropertyZoneRow,
} from '../schemas/properties.js';

const PROP_COLS = `id, tenant_id, property_manager_id, contract_id, region_id, name, street,
  house_number, zip_code, city, lat, lng, property_type, unit_count, floor_count,
  green_area_sqm, paved_area_sqm, brand, is_bait_property, access_info,
  created_at, updated_at`;

const ZONE_COLS = `id, tenant_id, property_id, name, zone_type, area_sqm, floor_number, notes,
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

async function loadProperty(
  pool: ReturnType<typeof getOwnerPool>,
  propertyId: string,
  tenantId: string
): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM properties
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [propertyId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.propertyNotFound');
  return r.rows[0];
}

export async function propertyRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── GET /api/properties ──────────────────────────────────────────────────
  fastify.get<{ Querystring: { q?: string } }>('/api/properties', {
    preHandler: requireAuth,
    schema: {
      description:
        'Liefert alle Properties des eigenen Tenants. Optional ?q=<text> für ILIKE-Suche auf name + street.',
      tags: ['properties'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { q: { type: 'string', maxLength: 100 } },
      },
    },
    handler: async (request): Promise<{ properties: PropertyRow[] }> => {
      const actor = request.user!;
      const q = request.query.q;
      const pool = getOwnerPool();
      let result;
      if (q && q.trim()) {
        const pattern = `%${q.trim()}%`;
        result = await pool.query<PropertyRow>(
          `SELECT ${PROP_COLS} FROM properties
           WHERE tenant_id = $1 AND is_deleted = FALSE
             AND (name ILIKE $2 OR street ILIKE $2 OR city ILIKE $2)
           ORDER BY name`,
          [actor.tenantId, pattern]
        );
      } else {
        result = await pool.query<PropertyRow>(
          `SELECT ${PROP_COLS} FROM properties
           WHERE tenant_id = $1 AND is_deleted = FALSE
           ORDER BY name`,
          [actor.tenantId]
        );
      }
      return { properties: result.rows };
    },
  });

  fastify.get<{ Params: { id: string } }>('/api/properties/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert eine Property nach ID',
      tags: ['properties'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<PropertyRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<PropertyRow>(
        `SELECT ${PROP_COLS} FROM properties
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.propertyNotFound');
      return row;
    },
  });

  fastify.post('/api/properties', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt eine Property im eigenen Tenant an',
      tags: ['properties'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<PropertyRow> => {
      const actor = request.user!;
      const input = parseOr400(createPropertySchema, request.body);
      const pool = getOwnerPool();
      const result = await pool.query<PropertyRow>(
        `INSERT INTO properties (
           tenant_id, property_manager_id, contract_id, region_id, name, street, house_number,
           zip_code, city, lat, lng, property_type, unit_count, floor_count,
           green_area_sqm, paved_area_sqm, brand, is_bait_property, access_info
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING ${PROP_COLS}`,
        [
          actor.tenantId,
          input.propertyManagerId ?? null,
          input.contractId ?? null,
          input.regionId ?? null,
          input.name,
          input.street,
          input.houseNumber ?? null,
          input.zipCode,
          input.city,
          input.lat ?? null,
          input.lng ?? null,
          input.propertyType,
          input.unitCount ?? null,
          input.floorCount ?? null,
          input.greenAreaSqm ?? null,
          input.pavedAreaSqm ?? null,
          input.brand ?? null,
          input.isBaitProperty ?? false,
          input.accessInfo ?? null,
        ]
      );
      request.log.info(
        { action: 'property.create', id: result.rows[0].id, by: actor.userId },
        'Property erstellt'
      );
      reply.code(201);
      return result.rows[0];
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/properties/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert eine Property',
      tags: ['properties'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<PropertyRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updatePropertySchema, request.body);
      const fieldMap: Record<string, string> = {
        propertyManagerId: 'property_manager_id',
        contractId: 'contract_id',
        regionId: 'region_id',
        name: 'name',
        street: 'street',
        houseNumber: 'house_number',
        zipCode: 'zip_code',
        city: 'city',
        lat: 'lat',
        lng: 'lng',
        propertyType: 'property_type',
        unitCount: 'unit_count',
        floorCount: 'floor_count',
        greenAreaSqm: 'green_area_sqm',
        pavedAreaSqm: 'paved_area_sqm',
        brand: 'brand',
        isBaitProperty: 'is_bait_property',
        accessInfo: 'access_info',
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
      const r = await pool.query<PropertyRow>(
        `UPDATE properties SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${PROP_COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.propertyNotFound');
      return row;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/properties/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn referenziert in property_services / schedule_entries.',
      tags: ['properties'],
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
      await loadProperty(pool, id, actor.tenantId);

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM property_services
           WHERE property_id = $1 AND is_deleted = FALSE
         ) OR EXISTS (
           SELECT 1 FROM schedule_entries
           WHERE property_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE properties SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );
      reply.code(204);
      return { ok: true };
    },
  });

  // ─── Property Zones ────────────────────────────────────────────────────────
  fastify.get<{ Params: { propertyId: string } }>('/api/properties/:propertyId/zones', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert alle Zones einer Property',
      tags: ['property-zones'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['propertyId'],
        properties: { propertyId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ zones: PropertyZoneRow[] }> => {
      const actor = request.user!;
      const { propertyId } = request.params;
      const pool = getOwnerPool();
      await loadProperty(pool, propertyId, actor.tenantId);
      const result = await pool.query<PropertyZoneRow>(
        `SELECT ${ZONE_COLS} FROM property_zones
         WHERE property_id = $1 AND is_deleted = FALSE
         ORDER BY floor_number NULLS FIRST, name`,
        [propertyId]
      );
      return { zones: result.rows };
    },
  });

  fastify.post<{ Params: { propertyId: string } }>('/api/properties/:propertyId/zones', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt eine neue Zone für die Property an',
      tags: ['property-zones'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['propertyId'],
        properties: { propertyId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request, reply): Promise<PropertyZoneRow> => {
      const actor = request.user!;
      const { propertyId } = request.params;
      const input = parseOr400(createZoneSchema, request.body);
      const pool = getOwnerPool();
      await loadProperty(pool, propertyId, actor.tenantId);
      const result = await pool.query<PropertyZoneRow>(
        `INSERT INTO property_zones
             (tenant_id, property_id, name, zone_type, area_sqm, floor_number, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING ${ZONE_COLS}`,
        [
          actor.tenantId,
          propertyId,
          input.name,
          input.zoneType,
          input.areaSqm ?? null,
          input.floorNumber ?? null,
          input.notes ?? null,
        ]
      );
      reply.code(201);
      return result.rows[0];
    },
  });

  fastify.put<{ Params: { propertyId: string; zoneId: string } }>(
    '/api/properties/:propertyId/zones/:zoneId',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Aktualisiert eine Zone',
        tags: ['property-zones'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['propertyId', 'zoneId'],
          properties: {
            propertyId: { type: 'string', format: 'uuid' },
            zoneId: { type: 'string', format: 'uuid' },
          },
        },
      },
      handler: async (request): Promise<PropertyZoneRow> => {
        const actor = request.user!;
        const { propertyId, zoneId } = request.params;
        const input = parseOr400(updateZoneSchema, request.body);
        const pool = getOwnerPool();
        await loadProperty(pool, propertyId, actor.tenantId);

        const fieldMap: Record<string, string> = {
          name: 'name',
          zoneType: 'zone_type',
          areaSqm: 'area_sqm',
          floorNumber: 'floor_number',
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
        values.push(zoneId);
        values.push(propertyId);

        const r = await pool.query<PropertyZoneRow>(
          `UPDATE property_zones SET ${fields.join(', ')}
           WHERE id = $${p++} AND property_id = $${p} AND is_deleted = FALSE
           RETURNING ${ZONE_COLS}`,
          values
        );
        const row = r.rows[0];
        if (!row) throw new NotFoundError('errors.propertyZoneNotFound');
        return row;
      },
    }
  );

  fastify.delete<{ Params: { propertyId: string; zoneId: string } }>(
    '/api/properties/:propertyId/zones/:zoneId',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Soft-Delete einer Zone',
        tags: ['property-zones'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['propertyId', 'zoneId'],
          properties: {
            propertyId: { type: 'string', format: 'uuid' },
            zoneId: { type: 'string', format: 'uuid' },
          },
        },
      },
      handler: async (request, reply): Promise<{ ok: true }> => {
        const actor = request.user!;
        const { propertyId, zoneId } = request.params;
        const pool = getOwnerPool();
        await loadProperty(pool, propertyId, actor.tenantId);
        const r = await pool.query(
          `UPDATE property_zones SET is_deleted = TRUE, deleted_at = NOW()
           WHERE id = $1 AND property_id = $2 AND is_deleted = FALSE`,
          [zoneId, propertyId]
        );
        if (r.rowCount === 0) throw new NotFoundError('errors.propertyZoneNotFound');
        reply.code(204);
        return { ok: true };
      },
    }
  );
}
