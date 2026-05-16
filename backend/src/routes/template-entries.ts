// Template-Entries CRUD (ELE-183)
// Einzelne Einträge in einem Schedule-Template. Cross-Tenant-Checks für
// alle FKs (template, employee, property, service_type) vor INSERT/UPDATE.
// Soft-Delete.

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createTemplateEntrySchema,
  updateTemplateEntrySchema,
  type TemplateEntryRow,
} from '../schemas/schedule-templates.js';

const COLS = `id, tenant_id, template_id, employee_id, day_of_week, property_id,
  service_type_id, start_time, duration_min, sort_order, notes,
  created_at, updated_at`;

type QueryRunner = Pick<PoolClient, 'query'>;

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

interface FkRefs {
  templateId?: string;
  employeeId?: string;
  propertyId?: string;
  serviceTypeId?: string;
}

async function assertFksInTenant(
  client: QueryRunner,
  refs: FkRefs,
  tenantId: string
): Promise<void> {
  const checks: Array<{ table: string; id: string; messageKey: string }> = [];
  if (refs.templateId)
    checks.push({
      table: 'schedule_templates',
      id: refs.templateId,
      messageKey: 'errors.templateNotFound',
    });
  if (refs.employeeId)
    checks.push({ table: 'employees', id: refs.employeeId, messageKey: 'errors.employeeNotFound' });
  if (refs.propertyId)
    checks.push({
      table: 'properties',
      id: refs.propertyId,
      messageKey: 'errors.propertyNotFound',
    });
  if (refs.serviceTypeId)
    checks.push({
      table: 'service_types',
      id: refs.serviceTypeId,
      messageKey: 'errors.serviceTypeNotFound',
    });

  for (const c of checks) {
    const r = await client.query<{ id: string }>(
      `SELECT id FROM ${c.table}
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      [c.id, tenantId]
    );
    if (r.rowCount === 0) throw new NotFoundError(c.messageKey);
  }
}

export async function templateEntryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { templateId?: string; employeeId?: string; dayOfWeek?: string } }>(
    '/api/template-entries',
    {
      preHandler: requireAuth,
      schema: {
        description: 'Liefert Template-Entries. Filter: ?templateId, ?employeeId, ?dayOfWeek',
        tags: ['template-entries'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            templateId: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string', format: 'uuid' },
            dayOfWeek: { type: 'string' },
          },
        },
      },
      handler: async (request): Promise<{ templateEntries: TemplateEntryRow[] }> => {
        const actor = request.user!;
        const pool = getOwnerPool();
        const params: unknown[] = [actor.tenantId];
        let where = `tenant_id = $1 AND is_deleted = FALSE`;
        if (request.query.templateId) {
          params.push(request.query.templateId);
          where += ` AND template_id = $${params.length}`;
        }
        if (request.query.employeeId) {
          params.push(request.query.employeeId);
          where += ` AND employee_id = $${params.length}`;
        }
        if (request.query.dayOfWeek) {
          const n = Number(request.query.dayOfWeek);
          if (!Number.isInteger(n) || n < 1 || n > 7) {
            throw new ValidationError('errors.validationDetails', {
              details: 'dayOfWeek: must be integer 1..7',
            });
          }
          params.push(n);
          where += ` AND day_of_week = $${params.length}`;
        }
        const r = await pool.query<TemplateEntryRow>(
          `SELECT ${COLS} FROM template_entries
           WHERE ${where}
           ORDER BY day_of_week, start_time, sort_order`,
          params
        );
        return { templateEntries: r.rows };
      },
    }
  );

  fastify.get<{ Params: { id: string } }>('/api/template-entries/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Template-Entry nach ID',
      tags: ['template-entries'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<TemplateEntryRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<TemplateEntryRow>(
        `SELECT ${COLS} FROM template_entries
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.templateEntryNotFound');
      return row;
    },
  });

  fastify.post('/api/template-entries', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen Template-Entry an',
      tags: ['template-entries'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<TemplateEntryRow> => {
      const actor = request.user!;
      const input = parseOr400(createTemplateEntrySchema, request.body);
      const pool = getOwnerPool();

      await assertFksInTenant(
        pool,
        {
          templateId: input.templateId,
          employeeId: input.employeeId,
          propertyId: input.propertyId,
          serviceTypeId: input.serviceTypeId,
        },
        actor.tenantId
      );

      const r = await pool.query<TemplateEntryRow>(
        `INSERT INTO template_entries (
           tenant_id, template_id, employee_id, day_of_week, property_id,
           service_type_id, start_time, duration_min, sort_order, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${COLS}`,
        [
          actor.tenantId,
          input.templateId,
          input.employeeId,
          input.dayOfWeek,
          input.propertyId,
          input.serviceTypeId,
          input.startTime,
          input.durationMin,
          input.sortOrder ?? 0,
          input.notes ?? null,
        ]
      );
      reply.code(201);
      return r.rows[0];
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/template-entries/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Template-Entry',
      tags: ['template-entries'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<TemplateEntryRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateTemplateEntrySchema, request.body);
      const pool = getOwnerPool();

      await assertFksInTenant(
        pool,
        {
          employeeId: input.employeeId,
          propertyId: input.propertyId,
          serviceTypeId: input.serviceTypeId,
        },
        actor.tenantId
      );

      const fieldMap: Record<string, string> = {
        employeeId: 'employee_id',
        dayOfWeek: 'day_of_week',
        propertyId: 'property_id',
        serviceTypeId: 'service_type_id',
        startTime: 'start_time',
        durationMin: 'duration_min',
        sortOrder: 'sort_order',
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
      values.push(id);
      values.push(actor.tenantId);

      const r = await pool.query<TemplateEntryRow>(
        `UPDATE template_entries SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.templateEntryNotFound');
      return row;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/template-entries/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Soft-Delete eines Template-Entry',
      tags: ['template-entries'],
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
        `UPDATE template_entries SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (r.rowCount === 0) throw new NotFoundError('errors.templateEntryNotFound');
      reply.code(204);
      return { ok: true };
    },
  });
}
