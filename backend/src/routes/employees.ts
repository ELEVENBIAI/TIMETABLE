// Employees CRUD (ELE-173)
// - hourly_rate nur an ADMIN/SUPER_ADMIN
// - user_id muss im selben Tenant sein (App-Layer-Check)
// - DSGVO-Audit: GET /:id schreibt employee.read in audit_log
// - Geocoding deferred → home_lat/home_lng werden direkt entgegengenommen
// - DELETE blockiert wenn referenziert in schedule_entries / time_logs

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createEmployeeSchema,
  filterEmployeeForActor,
  updateEmployeeSchema,
  type EmployeeRow,
} from '../schemas/employees.js';

const COLUMNS = `id, tenant_id, user_id, region_id, first_name, last_name, display_name,
  employee_type, weekly_hours, hourly_rate, color_code, phone, email,
  home_address, home_lat, home_lng, is_active, created_at, updated_at`;

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

class UserTenantMismatchError extends HttpError {
  constructor() {
    super(400, 'USER_TENANT_MISMATCH', 'errors.userTenantMismatch', 'errors.userTenantMismatch');
  }
}

/**
 * Prüft dass `userId` (falls gesetzt) zu `tenantId` gehört.
 * Wirft USER_TENANT_MISMATCH wenn nicht.
 */
async function assertUserInTenant(
  pool: ReturnType<typeof getOwnerPool>,
  userId: string | undefined,
  tenantId: string
): Promise<void> {
  if (!userId) return;
  const r = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [userId, tenantId]
  );
  if (r.rowCount === 0) throw new UserTenantMismatchError();
}

export async function employeeRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── GET /api/employees ──────────────────────────────────────────────────
  fastify.get('/api/employees', {
    preHandler: requireAuth,
    schema: {
      description:
        'Liefert alle Mitarbeiter des eigenen Tenants. hourly_rate nur für ADMIN/SUPER_ADMIN.',
      tags: ['employees'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request): Promise<{ employees: EmployeeRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const result = await pool.query<EmployeeRow>(
        `SELECT ${COLUMNS} FROM employees
         WHERE tenant_id = $1 AND is_deleted = FALSE
         ORDER BY last_name, first_name`,
        [actor.tenantId]
      );
      const employees = result.rows.map((r) => filterEmployeeForActor(r, actor));
      return { employees };
    },
  });

  // ─── GET /api/employees/:id ──────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/api/employees/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Mitarbeiter nach ID. Schreibt audit_log (DSGVO Art. 30).',
      tags: ['employees'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<EmployeeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const result = await pool.query<EmployeeRow>(
        `SELECT ${COLUMNS} FROM employees
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.employeeNotFound');

      // DSGVO Art. 30 — Lesezugriff auf HR-Daten protokollieren
      await pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id)
         VALUES ($1, $2, 'employee.read', 'employee', $3)`,
        [actor.tenantId, actor.userId, id]
      );

      return filterEmployeeForActor(row, actor);
    },
  });

  // ─── POST /api/employees ─────────────────────────────────────────────────
  fastify.post('/api/employees', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Legt einen neuen Mitarbeiter im eigenen Tenant an (ADMIN/SUPER_ADMIN)',
      tags: ['employees'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<EmployeeRow> => {
      const actor = request.user!;
      const input = parseOr400(createEmployeeSchema, request.body);
      const pool = getOwnerPool();

      await assertUserInTenant(pool, input.userId, actor.tenantId);

      const result = await pool.query<EmployeeRow>(
        `INSERT INTO employees (
           tenant_id, user_id, region_id, first_name, last_name, display_name,
           employee_type, weekly_hours, hourly_rate, color_code, phone, email,
           home_address, home_lat, home_lng, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          input.userId ?? null,
          input.regionId ?? null,
          input.firstName,
          input.lastName,
          input.displayName ?? null,
          input.employeeType,
          input.weeklyHours ?? null,
          input.hourlyRate ?? null,
          input.colorCode ?? null,
          input.phone ?? null,
          input.email ?? null,
          input.homeAddress ?? null,
          input.homeLat ?? null,
          input.homeLng ?? null,
          actor.userId,
        ]
      );
      const row = result.rows[0];

      await pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, 'employee.create', 'employee', $3, $4::jsonb)`,
        [actor.tenantId, actor.userId, row.id, JSON.stringify({ employeeType: row.employee_type })]
      );

      request.log.info(
        { action: 'employee.create', id: row.id, by: actor.userId },
        'Mitarbeiter angelegt'
      );
      reply.code(201);
      return filterEmployeeForActor(row, actor);
    },
  });

  // ─── PUT /api/employees/:id ──────────────────────────────────────────────
  fastify.put<{ Params: { id: string } }>('/api/employees/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Aktualisiert einen Mitarbeiter (ADMIN/SUPER_ADMIN)',
      tags: ['employees'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<EmployeeRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateEmployeeSchema, request.body);
      const pool = getOwnerPool();

      await assertUserInTenant(pool, input.userId, actor.tenantId);

      const fieldMap: Record<string, string> = {
        userId: 'user_id',
        regionId: 'region_id',
        firstName: 'first_name',
        lastName: 'last_name',
        displayName: 'display_name',
        employeeType: 'employee_type',
        weeklyHours: 'weekly_hours',
        hourlyRate: 'hourly_rate',
        colorCode: 'color_code',
        phone: 'phone',
        email: 'email',
        homeAddress: 'home_address',
        homeLat: 'home_lat',
        homeLng: 'home_lng',
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
      fields.push(`updated_by = $${p++}`);
      values.push(actor.userId);
      values.push(id);
      values.push(actor.tenantId);

      const result = await pool.query<EmployeeRow>(
        `UPDATE employees SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLUMNS}`,
        values
      );
      const row = result.rows[0];
      if (!row) throw new NotFoundError('errors.employeeNotFound');
      request.log.info(
        { action: 'employee.update', id, by: actor.userId },
        'Mitarbeiter aktualisiert'
      );
      return filterEmployeeForActor(row, actor);
    },
  });

  // ─── DELETE /api/employees/:id ───────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/api/employees/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete eines Mitarbeiters. 409 wenn in Schedules / Time-Logs verwendet.',
      tags: ['employees'],
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
        `SELECT id FROM employees
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.employeeNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM schedule_entries
           WHERE employee_id = $1 AND is_deleted = FALSE
         ) OR EXISTS (
           SELECT 1 FROM time_logs
           WHERE employee_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE employees SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );

      await pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, target_type, target_id)
         VALUES ($1, $2, 'employee.delete', 'employee', $3)`,
        [actor.tenantId, actor.userId, id]
      );

      request.log.info({ action: 'employee.delete', id, by: actor.userId }, 'Mitarbeiter gelöscht');
      reply.code(204);
      return { ok: true };
    },
  });
}
