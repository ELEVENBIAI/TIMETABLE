// Tenant-CRUD (ELE-170)
// - GET /api/tenants               — eigener Tenant (Default), SUPER_ADMIN: alle
// - GET /api/tenants/:id           — eigener oder SUPER_ADMIN-Cross
// - PUT /api/tenants/:id           — ADMIN eigener oder SUPER_ADMIN
//
// Authorization-Modell siehe ADR-09 + specs/ELE-170.md.

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware.js';
import { ForbiddenError, requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { updateTenantSchema, type TenantRow } from '../schemas/tenants.js';
import { ZodError } from 'zod';

export async function tenantRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── GET /api/tenants ────────────────────────────────────────────────────
  fastify.get('/api/tenants', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert eigenen Tenant; SUPER_ADMIN bekommt alle',
      tags: ['tenants'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ tenants: TenantRow[] }> => {
      const user = request.user!;
      const pool = getOwnerPool();
      const where = user.isSuperAdmin ? '' : 'WHERE id = $1 AND is_deleted = FALSE';
      const params = user.isSuperAdmin ? [] : [user.tenantId];
      const result = await pool.query<TenantRow>(
        `SELECT id, name, slug, brand, timezone, settings, created_at, updated_at
         FROM tenants ${where} ORDER BY name`,
        params
      );
      return { tenants: result.rows };
    },
  });

  // ─── GET /api/tenants/:id ────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/tenants/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Tenant nach ID',
      tags: ['tenants'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<TenantRow> => {
      const user = request.user!;
      const { id } = request.params;
      if (!user.isSuperAdmin && id !== user.tenantId) {
        throw new ForbiddenError('Zugriff auf fremden Tenant verweigert');
      }
      const pool = getOwnerPool();
      const result = await pool.query<TenantRow>(
        `SELECT id, name, slug, brand, timezone, settings, created_at, updated_at
         FROM tenants WHERE id = $1 AND is_deleted = FALSE`,
        [id]
      );
      const tenant = result.rows[0];
      if (!tenant) throw new NotFoundError('Tenant nicht gefunden');
      return tenant;
    },
  });

  // ─── PUT /api/tenants/:id ────────────────────────────────────────────────
  fastify.put<{ Params: { id: string } }>('/api/tenants/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Aktualisiert einen Tenant. ADMIN eigener, SUPER_ADMIN alle.',
      tags: ['tenants'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<TenantRow> => {
      const user = request.user!;
      const { id } = request.params;
      if (!user.isSuperAdmin && id !== user.tenantId) {
        throw new ForbiddenError('Zugriff auf fremden Tenant verweigert');
      }

      let input;
      try {
        input = updateTenantSchema.parse(request.body);
      } catch (err) {
        if (err instanceof ZodError) {
          const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
          throw new ValidationError(`Eingabe ungültig: ${issues}`);
        }
        throw err;
      }

      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      if (input.name !== undefined) {
        fields.push(`name = $${p++}`);
        values.push(input.name);
      }
      if (input.brand !== undefined) {
        fields.push(`brand = $${p++}`);
        values.push(input.brand);
      }
      if (input.timezone !== undefined) {
        fields.push(`timezone = $${p++}`);
        values.push(input.timezone);
      }
      if (input.settings !== undefined) {
        fields.push(`settings = $${p++}::jsonb`);
        values.push(JSON.stringify(input.settings));
      }
      fields.push(`updated_at = NOW()`);
      values.push(id);

      const pool = getOwnerPool();
      const result = await pool.query<TenantRow>(
        `UPDATE tenants SET ${fields.join(', ')}
         WHERE id = $${p} AND is_deleted = FALSE
         RETURNING id, name, slug, brand, timezone, settings, created_at, updated_at`,
        values
      );
      const tenant = result.rows[0];
      if (!tenant) throw new NotFoundError('Tenant nicht gefunden');

      request.log.info(
        { action: 'tenant.update', tenantId: id, by: user.userId },
        'Tenant aktualisiert'
      );
      return tenant;
    },
  });
}
