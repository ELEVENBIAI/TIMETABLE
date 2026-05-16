// Contracts CRUD (ELE-175)
// monthly_value ist sensitive (Vertragsdaten) — nur ADMIN/PLANNER/SUPER_ADMIN
// sehen es. FOREMAN/EMPLOYEE/PROPERTY_MANAGER bekommen null in der Response.
// DELETE blockiert wenn von Properties referenziert.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createContractSchema,
  filterContractForActor,
  updateContractSchema,
  type ContractRow,
} from '../schemas/contracts.js';

const COLS = `id, tenant_id, property_manager_id, contract_type, start_date, end_date,
  notice_period_months, monthly_value, scope_description, created_at, updated_at`;

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

async function assertPropertyManagerInTenant(
  pool: ReturnType<typeof getOwnerPool>,
  pmId: string,
  tenantId: string
): Promise<void> {
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM property_managers
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [pmId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.propertyManagerNotFound');
}

export async function contractRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/contracts?propertyManagerId=
  fastify.get<{ Querystring: { propertyManagerId?: string } }>('/api/contracts', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert Verträge. Optional ?propertyManagerId=<uuid> als Filter.',
      tags: ['contracts'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: { propertyManagerId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ contracts: ContractRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const params: unknown[] = [actor.tenantId];
      let where = `tenant_id = $1 AND is_deleted = FALSE`;
      if (request.query.propertyManagerId) {
        params.push(request.query.propertyManagerId);
        where += ` AND property_manager_id = $${params.length}`;
      }
      const r = await pool.query<ContractRow>(
        `SELECT ${COLS} FROM contracts WHERE ${where} ORDER BY created_at DESC`,
        params
      );
      return { contracts: r.rows.map((row) => filterContractForActor(row, actor)) };
    },
  });

  // GET /api/contracts/:id
  fastify.get<{ Params: { id: string } }>('/api/contracts/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Vertrag nach ID',
      tags: ['contracts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ContractRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<ContractRow>(
        `SELECT ${COLS} FROM contracts
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.contractNotFound');
      return filterContractForActor(row, actor);
    },
  });

  // POST /api/contracts
  fastify.post('/api/contracts', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Vertrag an',
      tags: ['contracts'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<ContractRow> => {
      const actor = request.user!;
      const input = parseOr400(createContractSchema, request.body);
      const pool = getOwnerPool();
      await assertPropertyManagerInTenant(pool, input.propertyManagerId, actor.tenantId);

      const r = await pool.query<ContractRow>(
        `INSERT INTO contracts (
           tenant_id, property_manager_id, contract_type, start_date, end_date,
           notice_period_months, monthly_value, scope_description, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${COLS}`,
        [
          actor.tenantId,
          input.propertyManagerId,
          input.contractType,
          input.startDate ?? null,
          input.endDate ?? null,
          input.noticePeriodMonths ?? null,
          input.monthlyValue ?? null,
          input.scopeDescription ?? null,
          actor.userId,
        ]
      );
      request.log.info(
        { action: 'contract.create', id: r.rows[0].id, by: actor.userId },
        'Vertrag erstellt'
      );
      reply.code(201);
      return filterContractForActor(r.rows[0], actor);
    },
  });

  // PUT /api/contracts/:id
  fastify.put<{ Params: { id: string } }>('/api/contracts/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Vertrag',
      tags: ['contracts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ContractRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateContractSchema, request.body);
      const pool = getOwnerPool();

      if (input.propertyManagerId !== undefined) {
        await assertPropertyManagerInTenant(pool, input.propertyManagerId, actor.tenantId);
      }

      const fieldMap: Record<string, string> = {
        propertyManagerId: 'property_manager_id',
        contractType: 'contract_type',
        startDate: 'start_date',
        endDate: 'end_date',
        noticePeriodMonths: 'notice_period_months',
        monthlyValue: 'monthly_value',
        scopeDescription: 'scope_description',
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

      const r = await pool.query<ContractRow>(
        `UPDATE contracts SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.contractNotFound');
      return filterContractForActor(row, actor);
    },
  });

  // DELETE /api/contracts/:id
  fastify.delete<{ Params: { id: string } }>('/api/contracts/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn von Properties referenziert.',
      tags: ['contracts'],
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
        `SELECT id FROM contracts
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.contractNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM properties
           WHERE contract_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE contracts SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
