// Absence-Records CRUD + Side-Effects (ELE-186)
//
// Side-Effects:
// - POST: alle SCHEDULE_ENTRIES des Mitarbeiters im Zeitraum mit status='PLANNED'
//   werden auf 'REASSIGNMENT_NEEDED' + reassignment_reason gesetzt
// - DELETE: betroffene SCHEDULE_ENTRIES mit status='REASSIGNMENT_NEEDED' werden
//   auf 'PLANNED' zurückgesetzt — aber nur wenn keine andere aktive Absence
//   denselben Tag des Mitarbeiters abdeckt
//
// Authorization:
// - ADMIN/PLANNER: alles
// - EMPLOYEE: darf eigene SICK/PERSONAL Absences anlegen (Self-Reporting)

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { ForbiddenError } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import {
  SELF_REPORTABLE_ABSENCE_TYPES,
  type AbsenceRow,
  type AbsenceType,
  createAbsenceSchema,
  updateAbsenceSchema,
} from '../schemas/absences.js';

const COLS = `id, tenant_id, employee_id, absence_type, start_date, end_date,
  is_full_day, start_time, end_time, notes, reported_at, reported_by,
  is_handled, handled_at, handled_by, created_at, updated_at`;

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

/** Absence-Type → Reassignment-Reason fürs Schedule-Entry */
function reasonFromAbsenceType(t: AbsenceType): string {
  switch (t) {
    case 'SICK':
      return 'SICK';
    case 'VACATION':
      return 'VACATION';
    default:
      return 'OTHER';
  }
}

async function assertEmployeeInTenant(
  client: QueryRunner,
  employeeId: string,
  tenantId: string
): Promise<{ user_id: string | null }> {
  const r = await client.query<{ user_id: string | null }>(
    `SELECT user_id FROM employees
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [employeeId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.employeeNotFound');
  return r.rows[0];
}

/**
 * Markiert betroffene Schedule-Entries als REASSIGNMENT_NEEDED.
 * Liefert die Anzahl der modifizierten Entries.
 */
async function applyAbsenceToScheduleEntries(
  client: QueryRunner,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  reason: string
): Promise<number> {
  const r = await client.query(
    `UPDATE schedule_entries
       SET status = 'REASSIGNMENT_NEEDED',
           reassignment_reason = $1,
           original_employee_id = COALESCE(original_employee_id, employee_id)
     WHERE tenant_id = $2
       AND employee_id = $3
       AND entry_date BETWEEN $4 AND $5
       AND status = 'PLANNED'
       AND is_deleted = FALSE`,
    [reason, tenantId, employeeId, startDate, endDate]
  );
  return r.rowCount ?? 0;
}

/**
 * Rollt REASSIGNMENT_NEEDED-Entries auf PLANNED zurück — aber NUR für Tage,
 * die nicht von einer anderen aktiven Absence abgedeckt sind.
 */
async function rollbackAbsenceOnScheduleEntries(
  client: QueryRunner,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeAbsenceId: string
): Promise<number> {
  const r = await client.query(
    `UPDATE schedule_entries
       SET status = 'PLANNED',
           reassignment_reason = NULL
     WHERE tenant_id = $1
       AND employee_id = $2
       AND entry_date BETWEEN $3 AND $4
       AND status = 'REASSIGNMENT_NEEDED'
       AND is_from_reassignment = FALSE
       AND is_deleted = FALSE
       AND NOT EXISTS (
         SELECT 1 FROM absence_records a
         WHERE a.tenant_id = $1
           AND a.employee_id = $2
           AND a.is_deleted = FALSE
           AND a.id != $5
           AND schedule_entries.entry_date BETWEEN a.start_date AND a.end_date
       )`,
    [tenantId, employeeId, startDate, endDate, excludeAbsenceId]
  );
  return r.rowCount ?? 0;
}

export async function absenceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Querystring: {
      employeeId?: string;
      fromDate?: string;
      toDate?: string;
      isHandled?: string;
      absenceType?: string;
    };
  }>('/api/absences', {
    preHandler: requireAuth,
    schema: {
      description:
        'Liefert Absence-Records. Filter: ?employeeId, ?fromDate, ?toDate, ?isHandled, ?absenceType',
      tags: ['absences'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          employeeId: { type: 'string', format: 'uuid' },
          fromDate: { type: 'string', format: 'date' },
          toDate: { type: 'string', format: 'date' },
          isHandled: { type: 'string', enum: ['true', 'false'] },
          absenceType: { type: 'string' },
        },
      },
    },
    handler: async (request): Promise<{ absences: AbsenceRow[] }> => {
      const actor = request.user!;
      const pool = getOwnerPool();
      const params: unknown[] = [actor.tenantId];
      let where = `tenant_id = $1 AND is_deleted = FALSE`;

      // EMPLOYEE darf nur eigene Absences sehen
      if (actor.role === 'EMPLOYEE') {
        const me = await pool.query<{ id: string }>(
          `SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
          [actor.userId, actor.tenantId]
        );
        if (me.rowCount === 0) throw new ForbiddenError('errors.forbidden');
        params.push(me.rows[0].id);
        where += ` AND employee_id = $${params.length}`;
      } else if (request.query.employeeId) {
        params.push(request.query.employeeId);
        where += ` AND employee_id = $${params.length}`;
      }

      if (request.query.fromDate) {
        params.push(request.query.fromDate);
        where += ` AND end_date >= $${params.length}`;
      }
      if (request.query.toDate) {
        params.push(request.query.toDate);
        where += ` AND start_date <= $${params.length}`;
      }
      if (request.query.isHandled === 'true' || request.query.isHandled === 'false') {
        params.push(request.query.isHandled === 'true');
        where += ` AND is_handled = $${params.length}`;
      }
      if (request.query.absenceType) {
        params.push(request.query.absenceType);
        where += ` AND absence_type = $${params.length}`;
      }

      const r = await pool.query<AbsenceRow>(
        `SELECT ${COLS} FROM absence_records
         WHERE ${where}
         ORDER BY start_date DESC, created_at DESC`,
        params
      );
      return { absences: r.rows };
    },
  });

  fastify.get<{ Params: { id: string } }>('/api/absences/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert ein Absence-Record nach ID',
      tags: ['absences'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<AbsenceRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<AbsenceRow>(
        `SELECT ${COLS} FROM absence_records
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.absenceNotFound');

      // EMPLOYEE darf nur eigene sehen
      if (actor.role === 'EMPLOYEE') {
        const me = await pool.query<{ id: string }>(
          `SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
          [actor.userId, actor.tenantId]
        );
        if (me.rowCount === 0 || me.rows[0].id !== row.employee_id) {
          throw new ForbiddenError('errors.forbidden');
        }
      }
      return row;
    },
  });

  fastify.post('/api/absences', {
    preHandler: requireAuth,
    schema: {
      description:
        'Legt eine Absence an. ADMIN/PLANNER: alle Felder. EMPLOYEE: nur eigene SICK/PERSONAL. ' +
        'Markiert betroffene Schedule-Entries als REASSIGNMENT_NEEDED.',
      tags: ['absences'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<AbsenceRow & { affectedScheduleEntries: number }> => {
      const actor = request.user!;
      const input = parseOr400(createAbsenceSchema, request.body);
      const pool = getOwnerPool();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const employee = await assertEmployeeInTenant(client, input.employeeId, actor.tenantId);

        // EMPLOYEE-Authorization: nur eigene SICK/PERSONAL
        if (actor.role === 'EMPLOYEE') {
          if (!SELF_REPORTABLE_ABSENCE_TYPES.includes(input.absenceType)) {
            throw new ForbiddenError('errors.absenceSelfReportingForbidden');
          }
          if (employee.user_id !== actor.userId) {
            throw new ForbiddenError('errors.absenceSelfReportingForbidden');
          }
        } else if (actor.role !== 'ADMIN' && actor.role !== 'PLANNER') {
          throw new ForbiddenError('errors.forbidden');
        }

        const r = await client.query<AbsenceRow>(
          `INSERT INTO absence_records (
             tenant_id, employee_id, absence_type, start_date, end_date,
             is_full_day, start_time, end_time, notes, reported_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING ${COLS}`,
          [
            actor.tenantId,
            input.employeeId,
            input.absenceType,
            input.startDate,
            input.endDate,
            input.isFullDay ?? true,
            input.startTime ?? null,
            input.endTime ?? null,
            input.notes ?? null,
            actor.userId,
          ]
        );
        const absence = r.rows[0];

        const affected = await applyAbsenceToScheduleEntries(
          client,
          actor.tenantId,
          input.employeeId,
          input.startDate,
          input.endDate,
          reasonFromAbsenceType(input.absenceType)
        );

        await client.query('COMMIT');
        reply.code(201);
        return { ...absence, affectedScheduleEntries: affected };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/absences/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Aktualisiert ein Absence-Record (ADMIN/PLANNER)',
      tags: ['absences'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<AbsenceRow> => {
      const actor = request.user!;
      if (actor.role !== 'ADMIN' && actor.role !== 'PLANNER') {
        throw new ForbiddenError('errors.forbidden');
      }
      const { id } = request.params;
      const input = parseOr400(updateAbsenceSchema, request.body);
      const pool = getOwnerPool();

      // Cross-Field-Range-Check: wenn beide Daten gesetzt sind, müssen sie konsistent sein
      // (oder gegenüber Bestand, falls nur eines geändert wird)
      const cur = await pool.query<{ start_date: string; end_date: string }>(
        `SELECT start_date, end_date FROM absence_records
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (cur.rowCount === 0) throw new NotFoundError('errors.absenceNotFound');
      const newStart = input.startDate ?? cur.rows[0].start_date;
      const newEnd = input.endDate ?? cur.rows[0].end_date;
      if (newStart > newEnd) {
        throw new ValidationError('errors.absenceInvalidDateRange');
      }

      const fieldMap: Record<string, string> = {
        absenceType: 'absence_type',
        startDate: 'start_date',
        endDate: 'end_date',
        isFullDay: 'is_full_day',
        startTime: 'start_time',
        endTime: 'end_time',
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

      const r = await pool.query<AbsenceRow>(
        `UPDATE absence_records SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.absenceNotFound');
      return row;
    },
  });

  // PATCH /:id/handle — markiert Absence als "behandelt"
  fastify.patch<{ Params: { id: string } }>('/api/absences/:id/handle', {
    preHandler: requireAuth,
    schema: {
      description: 'Markiert eine Absence als behandelt (Vertretung organisiert)',
      tags: ['absences'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<AbsenceRow> => {
      const actor = request.user!;
      if (actor.role !== 'ADMIN' && actor.role !== 'PLANNER') {
        throw new ForbiddenError('errors.forbidden');
      }
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<AbsenceRow>(
        `UPDATE absence_records
           SET is_handled = TRUE,
               handled_at = NOW(),
               handled_by = $1
         WHERE id = $2 AND tenant_id = $3 AND is_deleted = FALSE
         RETURNING ${COLS}`,
        [actor.userId, id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.absenceNotFound');
      return row;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/absences/:id', {
    preHandler: requireAuth,
    schema: {
      description:
        'Soft-Delete einer Absence. Rollt betroffene Schedule-Entries auf PLANNED zurück.',
      tags: ['absences'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request, reply): Promise<{ ok: true; restoredScheduleEntries: number }> => {
      const actor = request.user!;
      if (actor.role !== 'ADMIN' && actor.role !== 'PLANNER') {
        throw new ForbiddenError('errors.forbidden');
      }
      const { id } = request.params;
      const pool = getOwnerPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existing = await client.query<{
          employee_id: string;
          start_date: string;
          end_date: string;
        }>(
          `SELECT employee_id, start_date, end_date FROM absence_records
           WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
          [id, actor.tenantId]
        );
        if (existing.rowCount === 0) {
          await client.query('ROLLBACK');
          throw new NotFoundError('errors.absenceNotFound');
        }
        const row = existing.rows[0];

        await client.query(
          `UPDATE absence_records SET is_deleted = TRUE, deleted_at = NOW()
           WHERE id = $1`,
          [id]
        );

        const restored = await rollbackAbsenceOnScheduleEntries(
          client,
          actor.tenantId,
          row.employee_id,
          row.start_date,
          row.end_date,
          id
        );

        await client.query('COMMIT');
        reply.code(200);
        return { ok: true, restoredScheduleEntries: restored };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  });
}
