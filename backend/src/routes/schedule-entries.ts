// Schedule-Entries CRUD + Bulk + Move (ELE-179)
// - GET /api/schedule-entries (mit Filtern)
// - POST single + POST /bulk (transactional)
// - PUT, PATCH /:id/move (mit Time-Conflict-Check)
// - DELETE (Soft)
//
// Conflict-Check: kein gleicher Mitarbeiter am gleichen Tag mit überlappendem
// Zeitfenster. Pure function in services/scheduling/conflict-check.ts.
// Cross-Tenant-Check für alle FKs (schedule, employee, property, service_type).
// Archivierte Schedules sind read-only (SCHEDULE_LOCKED).

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  bulkCreateScheduleEntriesSchema,
  createScheduleEntrySchema,
  moveScheduleEntrySchema,
  updateScheduleEntrySchema,
  type CreateScheduleEntryInput,
  type ScheduleEntryRow,
} from '../schemas/schedule-entries.js';

const COLS = `id, tenant_id, schedule_id, employee_id, entry_date, day_of_week,
  property_id, service_type_id, property_service_id, start_time, duration_min,
  sort_order, status, is_extra, is_from_reassignment, original_employee_id,
  reassignment_reason, notes, created_at, updated_at`;

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

class TimeConflictError extends HttpError {
  constructor(conflictingId: string) {
    super(409, 'TIME_CONFLICT', 'errors.timeConflict', 'errors.timeConflict', {
      conflictingEntryId: conflictingId,
    });
  }
}

class ScheduleLockedError extends HttpError {
  constructor() {
    super(403, 'SCHEDULE_LOCKED', 'errors.scheduleLocked', 'errors.scheduleLocked');
  }
}

type QueryRunner = Pick<PoolClient, 'query'>;

interface FkRefs {
  scheduleId: string;
  employeeId: string;
  propertyId: string;
  serviceTypeId: string;
  propertyServiceId?: string | null;
}

/** Lädt Schedule + verifiziert dass status != ARCHIVED. */
async function assertScheduleWritable(
  client: QueryRunner,
  scheduleId: string,
  tenantId: string
): Promise<void> {
  const r = await client.query<{ status: string }>(
    `SELECT status FROM schedules
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [scheduleId, tenantId]
  );
  if (r.rowCount === 0) throw new NotFoundError('errors.scheduleNotFound');
  if (r.rows[0].status === 'ARCHIVED') throw new ScheduleLockedError();
}

/** Verifiziert alle FK-Referenzen sind im selben Tenant. */
async function assertFksInTenant(
  client: QueryRunner,
  refs: FkRefs,
  tenantId: string
): Promise<void> {
  const checks: Array<{ table: string; id: string; messageKey: string }> = [
    { table: 'employees', id: refs.employeeId, messageKey: 'errors.employeeNotFound' },
    { table: 'properties', id: refs.propertyId, messageKey: 'errors.propertyNotFound' },
    { table: 'service_types', id: refs.serviceTypeId, messageKey: 'errors.serviceTypeNotFound' },
  ];
  if (refs.propertyServiceId) {
    checks.push({
      table: 'property_services',
      id: refs.propertyServiceId,
      messageKey: 'errors.propertyServiceNotFound',
    });
  }
  for (const c of checks) {
    const r = await client.query<{ id: string }>(
      `SELECT id FROM ${c.table}
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
      [c.id, tenantId]
    );
    if (r.rowCount === 0) throw new NotFoundError(c.messageKey);
  }
}

/**
 * Sucht überlappenden Entry für (tenant, employee, entry_date) — exkl. excludeId.
 * Liefert ID des Konfliktes oder null. Nutzt SQL-Range-Overlap auf TIME.
 * Entries ohne start_time können niemals überlappen (NULL filter).
 */
async function findTimeConflict(
  client: QueryRunner,
  tenantId: string,
  employeeId: string,
  entryDate: string,
  startTime: string | null | undefined,
  durationMin: number,
  excludeId?: string
): Promise<string | null> {
  if (!startTime) return null;
  const params: unknown[] = [tenantId, employeeId, entryDate, startTime, durationMin];
  let exclude = '';
  if (excludeId) {
    params.push(excludeId);
    exclude = ` AND id != $${params.length}`;
  }
  const r = await client.query<{ id: string }>(
    `SELECT id FROM schedule_entries
     WHERE tenant_id = $1 AND employee_id = $2 AND entry_date = $3
       AND is_deleted = FALSE AND start_time IS NOT NULL
       ${exclude}
       AND tsrange(
         ($3::date + start_time)::timestamp,
         ($3::date + start_time)::timestamp + (duration_min || ' minutes')::interval,
         '[)'
       ) && tsrange(
         ($3::date + $4::time)::timestamp,
         ($3::date + $4::time)::timestamp + ($5 || ' minutes')::interval,
         '[)'
       )
     LIMIT 1`,
    params
  );
  return r.rows[0]?.id ?? null;
}

async function insertEntry(
  client: QueryRunner,
  tenantId: string,
  actorUserId: string,
  input: CreateScheduleEntryInput
): Promise<ScheduleEntryRow> {
  const r = await client.query<ScheduleEntryRow>(
    `INSERT INTO schedule_entries (
       tenant_id, schedule_id, employee_id, entry_date, day_of_week,
       property_id, service_type_id, property_service_id, start_time,
       duration_min, sort_order, status, is_extra, notes, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING ${COLS}`,
    [
      tenantId,
      input.scheduleId,
      input.employeeId,
      input.entryDate,
      input.dayOfWeek,
      input.propertyId,
      input.serviceTypeId,
      input.propertyServiceId ?? null,
      input.startTime ?? null,
      input.durationMin,
      input.sortOrder ?? 0,
      input.status ?? 'PLANNED',
      input.isExtra ?? false,
      input.notes ?? null,
      actorUserId,
    ]
  );
  return r.rows[0];
}

export async function scheduleEntryRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/schedule-entries
  fastify.get<{
    Querystring: { scheduleId?: string; employeeId?: string; propertyId?: string };
  }>('/api/schedule-entries', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert Schedule-Entries. Filter: ?scheduleId, ?employeeId, ?propertyId',
      tags: ['schedule-entries'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          scheduleId: { type: 'string', format: 'uuid' },
          employeeId: { type: 'string', format: 'uuid' },
          propertyId: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: async (request): Promise<{ scheduleEntries: ScheduleEntryRow[] }> => {
      const actor = request.user!;
      const { scheduleId, employeeId, propertyId } = request.query;
      const pool = getOwnerPool();
      const params: unknown[] = [actor.tenantId];
      let where = `tenant_id = $1 AND is_deleted = FALSE`;
      if (scheduleId) {
        params.push(scheduleId);
        where += ` AND schedule_id = $${params.length}`;
      }
      if (employeeId) {
        params.push(employeeId);
        where += ` AND employee_id = $${params.length}`;
      }
      if (propertyId) {
        params.push(propertyId);
        where += ` AND property_id = $${params.length}`;
      }
      // EMPLOYEE: nur eigene Einträge (employee.user_id = actor.userId)
      if (
        !actor.isSuperAdmin &&
        actor.role !== 'ADMIN' &&
        actor.role !== 'PLANNER' &&
        actor.role !== 'FOREMAN'
      ) {
        params.push(actor.userId);
        where += ` AND employee_id IN (
          SELECT id FROM employees WHERE user_id = $${params.length} AND tenant_id = $1
        )`;
      }
      const r = await pool.query<ScheduleEntryRow>(
        `SELECT ${COLS} FROM schedule_entries WHERE ${where}
         ORDER BY entry_date, sort_order, start_time NULLS LAST`,
        params
      );
      return { scheduleEntries: r.rows };
    },
  });

  // GET /api/schedule-entries/:id
  fastify.get<{ Params: { id: string } }>('/api/schedule-entries/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Entry nach ID',
      tags: ['schedule-entries'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleEntryRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<ScheduleEntryRow>(
        `SELECT ${COLS} FROM schedule_entries
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.scheduleEntryNotFound');
      return row;
    },
  });

  // POST /api/schedule-entries
  fastify.post('/api/schedule-entries', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Schedule-Entry an',
      tags: ['schedule-entries'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<ScheduleEntryRow> => {
      const actor = request.user!;
      const input = parseOr400(createScheduleEntrySchema, request.body);
      const pool = getOwnerPool();

      await assertScheduleWritable(pool, input.scheduleId, actor.tenantId);
      await assertFksInTenant(pool, input, actor.tenantId);

      const conflict = await findTimeConflict(
        pool,
        actor.tenantId,
        input.employeeId,
        input.entryDate,
        input.startTime,
        input.durationMin
      );
      if (conflict) throw new TimeConflictError(conflict);

      const row = await insertEntry(pool, actor.tenantId, actor.userId, input);
      request.log.info(
        { action: 'schedule_entry.create', id: row.id, by: actor.userId },
        'Schedule-Entry created'
      );
      reply.code(201);
      return row;
    },
  });

  // POST /api/schedule-entries/bulk — Transaction
  fastify.post('/api/schedule-entries/bulk', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Bulk-Insert (max 200, atomar via Transaction)',
      tags: ['schedule-entries'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<{ scheduleEntries: ScheduleEntryRow[] }> => {
      const actor = request.user!;
      const input = parseOr400(bulkCreateScheduleEntriesSchema, request.body);
      const pool = getOwnerPool();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Schedule-Writable-Check pro distinct scheduleId (Performance)
        const scheduleIds = Array.from(new Set(input.entries.map((e) => e.scheduleId)));
        for (const sid of scheduleIds) {
          await assertScheduleWritable(client, sid, actor.tenantId);
        }

        const created: ScheduleEntryRow[] = [];
        for (const entry of input.entries) {
          await assertFksInTenant(client, entry, actor.tenantId);
          const conflict = await findTimeConflict(
            client,
            actor.tenantId,
            entry.employeeId,
            entry.entryDate,
            entry.startTime,
            entry.durationMin
          );
          if (conflict) throw new TimeConflictError(conflict);
          const row = await insertEntry(client, actor.tenantId, actor.userId, entry);
          created.push(row);
        }
        await client.query('COMMIT');
        request.log.info(
          { action: 'schedule_entry.bulk_create', count: created.length, by: actor.userId },
          'Bulk schedule-entries created'
        );
        reply.code(201);
        return { scheduleEntries: created };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  });

  // PUT /api/schedule-entries/:id — generischer Update
  fastify.put<{ Params: { id: string } }>('/api/schedule-entries/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert einen Schedule-Entry',
      tags: ['schedule-entries'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleEntryRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateScheduleEntrySchema, request.body);
      const pool = getOwnerPool();

      const existing = await pool.query<ScheduleEntryRow>(
        `SELECT ${COLS} FROM schedule_entries
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const current = existing.rows[0];
      if (!current) throw new NotFoundError('errors.scheduleEntryNotFound');

      await assertScheduleWritable(pool, current.schedule_id, actor.tenantId);

      // Cross-Tenant-Check für geänderte FKs
      if (input.employeeId || input.propertyId || input.serviceTypeId || input.propertyServiceId) {
        await assertFksInTenant(
          pool,
          {
            scheduleId: current.schedule_id,
            employeeId: input.employeeId ?? current.employee_id,
            propertyId: input.propertyId ?? current.property_id,
            serviceTypeId: input.serviceTypeId ?? current.service_type_id,
            propertyServiceId: input.propertyServiceId ?? current.property_service_id,
          },
          actor.tenantId
        );
      }

      // Time-Conflict-Check, wenn employeeId, entryDate, startTime oder durationMin geändert
      const newEmployeeId = input.employeeId ?? current.employee_id;
      const newEntryDate = input.entryDate ?? current.entry_date;
      const newStartTime = input.startTime !== undefined ? input.startTime : current.start_time;
      const newDuration = input.durationMin ?? current.duration_min;
      if (
        input.employeeId !== undefined ||
        input.entryDate !== undefined ||
        input.startTime !== undefined ||
        input.durationMin !== undefined
      ) {
        const conflict = await findTimeConflict(
          pool,
          actor.tenantId,
          newEmployeeId,
          newEntryDate,
          newStartTime,
          newDuration,
          id
        );
        if (conflict) throw new TimeConflictError(conflict);
      }

      const fieldMap: Record<string, string> = {
        employeeId: 'employee_id',
        entryDate: 'entry_date',
        dayOfWeek: 'day_of_week',
        propertyId: 'property_id',
        serviceTypeId: 'service_type_id',
        propertyServiceId: 'property_service_id',
        startTime: 'start_time',
        durationMin: 'duration_min',
        sortOrder: 'sort_order',
        status: 'status',
        isExtra: 'is_extra',
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

      const r = await pool.query<ScheduleEntryRow>(
        `UPDATE schedule_entries SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      return r.rows[0];
    },
  });

  // PATCH /api/schedule-entries/:id/move — Drag & Drop
  fastify.patch<{ Params: { id: string } }>('/api/schedule-entries/:id/move', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER', 'FOREMAN')],
    schema: {
      description: 'Verschiebt Entry (employee/date/startTime). Validiert Time-Conflict.',
      tags: ['schedule-entries'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleEntryRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(moveScheduleEntrySchema, request.body);
      const pool = getOwnerPool();

      const existing = await pool.query<ScheduleEntryRow>(
        `SELECT ${COLS} FROM schedule_entries
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const current = existing.rows[0];
      if (!current) throw new NotFoundError('errors.scheduleEntryNotFound');

      await assertScheduleWritable(pool, current.schedule_id, actor.tenantId);

      if (input.employeeId) {
        await assertFksInTenant(
          pool,
          {
            scheduleId: current.schedule_id,
            employeeId: input.employeeId,
            propertyId: current.property_id,
            serviceTypeId: current.service_type_id,
            propertyServiceId: current.property_service_id,
          },
          actor.tenantId
        );
      }

      const newEmployeeId = input.employeeId ?? current.employee_id;
      const newEntryDate = input.entryDate ?? current.entry_date;
      const newStartTime = input.startTime !== undefined ? input.startTime : current.start_time;

      const conflict = await findTimeConflict(
        pool,
        actor.tenantId,
        newEmployeeId,
        newEntryDate,
        newStartTime,
        current.duration_min,
        id
      );
      if (conflict) throw new TimeConflictError(conflict);

      // Reassignment-Logik (employee_id geändert):
      // - Move auf neuen Mitarbeiter → is_from_reassignment=TRUE, status='PLANNED' (Vertretung gelöst)
      // - Move zurück auf original_employee_id, wenn dieser im Zeitraum eine aktive Absence hat:
      //     status='REASSIGNMENT_NEEDED', is_from_reassignment=FALSE, original_employee_id=NULL
      // - Move zurück, ohne Absence → status='PLANNED' (sauber zurückgesetzt)
      const employeeChanged = input.employeeId && input.employeeId !== current.employee_id;
      const isUndoReassignment =
        employeeChanged &&
        current.original_employee_id != null &&
        input.employeeId === current.original_employee_id;
      const isForwardReassignment = employeeChanged && !isUndoReassignment;

      let originalStillAbsent = false;
      if (isUndoReassignment) {
        const ab = await pool.query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM absence_records
             WHERE tenant_id = $1
               AND employee_id = $2
               AND is_deleted = FALSE
               AND $3::date BETWEEN start_date AND end_date
           ) AS exists`,
          [actor.tenantId, current.original_employee_id, newEntryDate]
        );
        originalStillAbsent = ab.rows[0]?.exists === true;
      }

      const nextStatus = isForwardReassignment
        ? 'PLANNED'
        : isUndoReassignment
          ? originalStillAbsent
            ? 'REASSIGNMENT_NEEDED'
            : 'PLANNED'
          : current.status;
      const nextIsFromReassignment = isForwardReassignment
        ? true
        : isUndoReassignment
          ? false
          : current.is_from_reassignment;
      const nextOriginal = isForwardReassignment
        ? (current.original_employee_id ?? current.employee_id)
        : isUndoReassignment
          ? null
          : current.original_employee_id;
      const nextReassignReason = isForwardReassignment
        ? current.reassignment_reason
        : isUndoReassignment
          ? originalStillAbsent
            ? (current.reassignment_reason ?? 'SICK')
            : null
          : current.reassignment_reason;

      const r = await pool.query<ScheduleEntryRow>(
        `UPDATE schedule_entries SET
           employee_id = $1,
           entry_date = $2,
           day_of_week = $3,
           start_time = $4,
           status = $5,
           is_from_reassignment = $6,
           original_employee_id = $7,
           reassignment_reason = $8,
           updated_by = $9
         WHERE id = $10 AND tenant_id = $11 AND is_deleted = FALSE
         RETURNING ${COLS}`,
        [
          newEmployeeId,
          newEntryDate,
          input.dayOfWeek ?? current.day_of_week,
          newStartTime,
          nextStatus,
          nextIsFromReassignment,
          nextOriginal,
          nextReassignReason,
          actor.userId,
          id,
          actor.tenantId,
        ]
      );
      const isReassignment = isForwardReassignment;
      request.log.info(
        { action: 'schedule_entry.move', id, by: actor.userId, reassignment: isReassignment },
        'Schedule-Entry moved'
      );
      return r.rows[0];
    },
  });

  // DELETE /api/schedule-entries/:id
  fastify.delete<{ Params: { id: string } }>('/api/schedule-entries/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Soft-Delete eines Entries. Archivierte Schedules sind read-only.',
      tags: ['schedule-entries'],
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

      const existing = await pool.query<{ schedule_id: string }>(
        `SELECT schedule_id FROM schedule_entries
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.scheduleEntryNotFound');

      await assertScheduleWritable(pool, existing.rows[0].schedule_id, actor.tenantId);

      await pool.query(
        `UPDATE schedule_entries SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $2
         WHERE id = $1`,
        [id, actor.userId]
      );
      reply.code(204);
      return { ok: true };
    },
  });
}
