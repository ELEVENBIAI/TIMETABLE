// Employee Skills (ELE-174)
// Drei nested Sub-Resources unter /api/employees/:employeeId/...
//   - qualifications  (M:N employee + qualification_type, mit valid_until)
//   - equipment       (M:N employee + equipment_type)
//   - availability    (1:N employee + day_of_week, UNIQUE)
//
// Lesen: alle authentifizierten User im Tenant. Schreiben: ADMIN/PLANNER.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  assignEquipmentSchema,
  assignQualificationSchema,
  updateEquipmentSchema,
  updateQualificationSchema,
  upsertAvailabilitySchema,
  type EmployeeAvailabilityRow,
  type EmployeeEquipmentRow,
  type EmployeeQualificationRow,
} from '../schemas/employee-skills.js';

const QUAL_COLS = `id, tenant_id, employee_id, qualification_type_id, valid_until,
  certificate_number, notes, created_at, updated_at`;
const EQ_COLS = `id, tenant_id, employee_id, equipment_type_id, assigned_at, notes,
  created_at, updated_at`;
const AVAIL_COLS = `id, tenant_id, employee_id, day_of_week, is_available,
  available_from, available_until, notes, created_at, updated_at`;

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

class DuplicateAssignmentError extends HttpError {
  constructor() {
    super(409, 'DUPLICATE_ASSIGNMENT', 'errors.duplicateAssignment', 'errors.duplicateAssignment');
  }
}

/** Sichert dass employee zum tenant gehört. */
async function loadEmployee(
  pool: ReturnType<typeof getOwnerPool>,
  employeeId: string,
  tenantId: string
): Promise<{ id: string; tenant_id: string }> {
  const r = await pool.query<{ id: string; tenant_id: string }>(
    `SELECT id, tenant_id FROM employees
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [employeeId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.employeeNotFound');
  return r.rows[0];
}

export async function employeeSkillsRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── Qualifications ────────────────────────────────────────────────────────
  fastify.get<{ Params: { employeeId: string } }>('/api/employees/:employeeId/qualifications', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert alle Qualifikationen eines Mitarbeiters',
      tags: ['employee-skills'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ qualifications: EmployeeQualificationRow[] }> => {
      const actor = request.user!;
      const { employeeId } = request.params;
      const pool = getOwnerPool();
      await loadEmployee(pool, employeeId, actor.tenantId);
      const result = await pool.query<EmployeeQualificationRow>(
        `SELECT ${QUAL_COLS} FROM employee_qualifications
           WHERE employee_id = $1 AND is_deleted = FALSE
           ORDER BY created_at`,
        [employeeId]
      );
      return { qualifications: result.rows };
    },
  });

  fastify.post<{ Params: { employeeId: string } }>('/api/employees/:employeeId/qualifications', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Weist einem Mitarbeiter eine Qualifikation zu',
      tags: ['employee-skills'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request, reply): Promise<EmployeeQualificationRow> => {
      const actor = request.user!;
      const { employeeId } = request.params;
      const input = parseOr400(assignQualificationSchema, request.body);
      const pool = getOwnerPool();
      await loadEmployee(pool, employeeId, actor.tenantId);

      // Quali muss im Tenant existieren
      const qt = await pool.query<{ id: string }>(
        `SELECT id FROM qualification_types
           WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [input.qualificationTypeId, actor.tenantId]
      );
      if (qt.rowCount === 0) throw new NotFoundError('errors.qualificationTypeNotFound');

      try {
        const result = await pool.query<EmployeeQualificationRow>(
          `INSERT INTO employee_qualifications
               (tenant_id, employee_id, qualification_type_id, valid_until, certificate_number, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING ${QUAL_COLS}`,
          [
            actor.tenantId,
            employeeId,
            input.qualificationTypeId,
            input.validUntil ?? null,
            input.certificateNumber ?? null,
            input.notes ?? null,
          ]
        );
        reply.code(201);
        return result.rows[0];
      } catch (err) {
        const e = err as { code?: string };
        if (e.code === '23505') throw new DuplicateAssignmentError();
        throw err;
      }
    },
  });

  fastify.put<{ Params: { employeeId: string; qualificationId: string } }>(
    '/api/employees/:employeeId/qualifications/:qualificationId',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Aktualisiert valid_until / certificate_number / notes einer Quali-Zuordnung',
        tags: ['employee-skills'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['employeeId', 'qualificationId'],
          properties: {
            employeeId: { type: 'string', format: 'uuid' },
            qualificationId: { type: 'string', format: 'uuid' },
          },
        },
      },
      handler: async (request): Promise<EmployeeQualificationRow> => {
        const actor = request.user!;
        const { employeeId, qualificationId } = request.params;
        const input = parseOr400(updateQualificationSchema, request.body);
        const pool = getOwnerPool();
        await loadEmployee(pool, employeeId, actor.tenantId);

        const fieldMap: Record<string, string> = {
          validUntil: 'valid_until',
          certificateNumber: 'certificate_number',
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
        values.push(qualificationId);
        values.push(employeeId);

        const result = await pool.query<EmployeeQualificationRow>(
          `UPDATE employee_qualifications SET ${fields.join(', ')}
           WHERE id = $${p++} AND employee_id = $${p} AND is_deleted = FALSE
           RETURNING ${QUAL_COLS}`,
          values
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('errors.employeeQualificationNotFound');
        return row;
      },
    }
  );

  fastify.delete<{ Params: { employeeId: string; qualificationId: string } }>(
    '/api/employees/:employeeId/qualifications/:qualificationId',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Entfernt eine Qualifikations-Zuordnung (Soft-Delete)',
        tags: ['employee-skills'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['employeeId', 'qualificationId'],
          properties: {
            employeeId: { type: 'string', format: 'uuid' },
            qualificationId: { type: 'string', format: 'uuid' },
          },
        },
      },
      handler: async (request, reply): Promise<{ ok: true }> => {
        const actor = request.user!;
        const { employeeId, qualificationId } = request.params;
        const pool = getOwnerPool();
        await loadEmployee(pool, employeeId, actor.tenantId);

        const r = await pool.query(
          `UPDATE employee_qualifications
           SET is_deleted = TRUE, deleted_at = NOW()
           WHERE id = $1 AND employee_id = $2 AND is_deleted = FALSE`,
          [qualificationId, employeeId]
        );
        if (r.rowCount === 0) throw new NotFoundError('errors.employeeQualificationNotFound');
        reply.code(204);
        return { ok: true };
      },
    }
  );

  // ─── Equipment ─────────────────────────────────────────────────────────────
  fastify.get<{ Params: { employeeId: string } }>('/api/employees/:employeeId/equipment', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert das Equipment eines Mitarbeiters',
      tags: ['employee-skills'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ equipment: EmployeeEquipmentRow[] }> => {
      const actor = request.user!;
      const { employeeId } = request.params;
      const pool = getOwnerPool();
      await loadEmployee(pool, employeeId, actor.tenantId);
      const result = await pool.query<EmployeeEquipmentRow>(
        `SELECT ${EQ_COLS} FROM employee_equipment
           WHERE employee_id = $1 AND is_deleted = FALSE
           ORDER BY created_at`,
        [employeeId]
      );
      return { equipment: result.rows };
    },
  });

  fastify.post<{ Params: { employeeId: string } }>('/api/employees/:employeeId/equipment', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Weist einem Mitarbeiter ein Equipment zu',
      tags: ['employee-skills'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request, reply): Promise<EmployeeEquipmentRow> => {
      const actor = request.user!;
      const { employeeId } = request.params;
      const input = parseOr400(assignEquipmentSchema, request.body);
      const pool = getOwnerPool();
      await loadEmployee(pool, employeeId, actor.tenantId);

      const et = await pool.query<{ id: string }>(
        `SELECT id FROM equipment_types
           WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [input.equipmentTypeId, actor.tenantId]
      );
      if (et.rowCount === 0) throw new NotFoundError('errors.equipmentTypeNotFound');

      try {
        const result = await pool.query<EmployeeEquipmentRow>(
          `INSERT INTO employee_equipment
               (tenant_id, employee_id, equipment_type_id, assigned_at, notes)
             VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5)
             RETURNING ${EQ_COLS}`,
          [
            actor.tenantId,
            employeeId,
            input.equipmentTypeId,
            input.assignedAt ?? null,
            input.notes ?? null,
          ]
        );
        reply.code(201);
        return result.rows[0];
      } catch (err) {
        const e = err as { code?: string };
        if (e.code === '23505') throw new DuplicateAssignmentError();
        throw err;
      }
    },
  });

  fastify.put<{ Params: { employeeId: string; equipmentId: string } }>(
    '/api/employees/:employeeId/equipment/:equipmentId',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Aktualisiert assigned_at / notes einer Equipment-Zuordnung',
        tags: ['employee-skills'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['employeeId', 'equipmentId'],
          properties: {
            employeeId: { type: 'string', format: 'uuid' },
            equipmentId: { type: 'string', format: 'uuid' },
          },
        },
      },
      handler: async (request): Promise<EmployeeEquipmentRow> => {
        const actor = request.user!;
        const { employeeId, equipmentId } = request.params;
        const input = parseOr400(updateEquipmentSchema, request.body);
        const pool = getOwnerPool();
        await loadEmployee(pool, employeeId, actor.tenantId);

        const fieldMap: Record<string, string> = {
          assignedAt: 'assigned_at',
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
        values.push(equipmentId);
        values.push(employeeId);

        const result = await pool.query<EmployeeEquipmentRow>(
          `UPDATE employee_equipment SET ${fields.join(', ')}
           WHERE id = $${p++} AND employee_id = $${p} AND is_deleted = FALSE
           RETURNING ${EQ_COLS}`,
          values
        );
        const row = result.rows[0];
        if (!row) throw new NotFoundError('errors.employeeEquipmentNotFound');
        return row;
      },
    }
  );

  fastify.delete<{ Params: { employeeId: string; equipmentId: string } }>(
    '/api/employees/:employeeId/equipment/:equipmentId',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Entfernt eine Equipment-Zuordnung (Soft-Delete)',
        tags: ['employee-skills'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['employeeId', 'equipmentId'],
          properties: {
            employeeId: { type: 'string', format: 'uuid' },
            equipmentId: { type: 'string', format: 'uuid' },
          },
        },
      },
      handler: async (request, reply): Promise<{ ok: true }> => {
        const actor = request.user!;
        const { employeeId, equipmentId } = request.params;
        const pool = getOwnerPool();
        await loadEmployee(pool, employeeId, actor.tenantId);
        const r = await pool.query(
          `UPDATE employee_equipment
           SET is_deleted = TRUE, deleted_at = NOW()
           WHERE id = $1 AND employee_id = $2 AND is_deleted = FALSE`,
          [equipmentId, employeeId]
        );
        if (r.rowCount === 0) throw new NotFoundError('errors.employeeEquipmentNotFound');
        reply.code(204);
        return { ok: true };
      },
    }
  );

  // ─── Availability ──────────────────────────────────────────────────────────
  fastify.get<{ Params: { employeeId: string } }>('/api/employees/:employeeId/availability', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert Verfügbarkeitsmuster pro Wochentag (1=Mo..7=So)',
      tags: ['employee-skills'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<{ availability: EmployeeAvailabilityRow[] }> => {
      const actor = request.user!;
      const { employeeId } = request.params;
      const pool = getOwnerPool();
      await loadEmployee(pool, employeeId, actor.tenantId);
      const result = await pool.query<EmployeeAvailabilityRow>(
        `SELECT ${AVAIL_COLS} FROM employee_availability
           WHERE employee_id = $1 AND is_deleted = FALSE
           ORDER BY day_of_week`,
        [employeeId]
      );
      return { availability: result.rows };
    },
  });

  fastify.put<{ Params: { employeeId: string; dayOfWeek: string } }>(
    '/api/employees/:employeeId/availability/:dayOfWeek',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Upsert Verfügbarkeit für Wochentag 1..7',
        tags: ['employee-skills'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['employeeId', 'dayOfWeek'],
          properties: {
            employeeId: { type: 'string', format: 'uuid' },
            dayOfWeek: { type: 'string', pattern: '^[1-7]$' },
          },
        },
      },
      handler: async (request): Promise<EmployeeAvailabilityRow> => {
        const actor = request.user!;
        const { employeeId, dayOfWeek } = request.params;
        const day = parseInt(dayOfWeek, 10);
        if (day < 1 || day > 7) {
          throw new ValidationError('errors.validationDetails', {
            details: 'dayOfWeek: 1..7',
          });
        }
        const input = parseOr400(upsertAvailabilitySchema, request.body);
        const pool = getOwnerPool();
        await loadEmployee(pool, employeeId, actor.tenantId);

        const result = await pool.query<EmployeeAvailabilityRow>(
          `INSERT INTO employee_availability
             (tenant_id, employee_id, day_of_week, is_available, available_from, available_until, notes)
           VALUES ($1, $2, $3, COALESCE($4, TRUE), $5, $6, $7)
           ON CONFLICT (employee_id, day_of_week) WHERE is_deleted = FALSE
           DO UPDATE SET
             is_available = COALESCE(EXCLUDED.is_available, employee_availability.is_available),
             available_from = EXCLUDED.available_from,
             available_until = EXCLUDED.available_until,
             notes = EXCLUDED.notes
           RETURNING ${AVAIL_COLS}`,
          [
            actor.tenantId,
            employeeId,
            day,
            input.isAvailable ?? null,
            input.availableFrom ?? null,
            input.availableUntil ?? null,
            input.notes ?? null,
          ]
        );
        return result.rows[0];
      },
    }
  );
}
