// Schedules CRUD + Publish (ELE-179)
// Wochenpläne mit Status-Transitions: DRAFT → PUBLISHED → ARCHIVED (linear).
// - Lesen: alle Auth (per Tenant)
// - Schreiben: ADMIN/PLANNER
// - DELETE: ADMIN, blockiert wenn Entries vorhanden

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createScheduleSchema,
  updateScheduleSchema,
  type ScheduleRow,
  type ScheduleStatus,
} from '../schemas/schedules.js';
import { isValidStatusTransition } from '../services/scheduling/conflict-check.js';

const COLS = `id, tenant_id, week_start, week_number, year, status, template_id,
  generation_method, published_at, published_by, notes, created_at, updated_at`;

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

class DuplicateWeekError extends HttpError {
  constructor() {
    super(409, 'DUPLICATE_WEEK', 'errors.duplicateWeek', 'errors.duplicateWeek');
  }
}

class InvalidStatusTransitionError extends HttpError {
  constructor(from: string, to: string) {
    super(
      400,
      'INVALID_STATUS_TRANSITION',
      'errors.invalidStatusTransition',
      'errors.invalidStatusTransition',
      { from, to }
    );
  }
}

export async function scheduleRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/schedules?weekStart=&status=
  fastify.get<{ Querystring: { weekStart?: string; status?: string; year?: string } }>(
    '/api/schedules',
    {
      preHandler: requireAuth,
      schema: {
        description: 'Liefert Schedules. Filter ?weekStart=, ?status=, ?year=',
        tags: ['schedules'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            weekStart: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
            year: { type: 'string', pattern: '^\\d{4}$' },
          },
        },
      },
      handler: async (request): Promise<{ schedules: ScheduleRow[] }> => {
        const actor = request.user!;
        const pool = getOwnerPool();
        const params: unknown[] = [actor.tenantId];
        let where = `tenant_id = $1 AND is_deleted = FALSE`;
        if (request.query.weekStart) {
          params.push(request.query.weekStart);
          where += ` AND week_start = $${params.length}`;
        }
        if (request.query.status) {
          params.push(request.query.status);
          where += ` AND status = $${params.length}`;
        }
        if (request.query.year) {
          params.push(Number(request.query.year));
          where += ` AND year = $${params.length}`;
        }
        const r = await pool.query<ScheduleRow>(
          `SELECT ${COLS} FROM schedules WHERE ${where} ORDER BY week_start DESC`,
          params
        );
        return { schedules: r.rows };
      },
    }
  );

  // GET /api/reassignments/open-weeks — Übersicht: pro Woche wieviele REASSIGNMENT_NEEDED-Entries offen sind.
  // Banner-Datenquelle für SchedulePage damit Robert nicht wochenweise suchen muss.
  // Eigener Pfad damit keine Kollision mit /api/schedules/:id (UUID-Format-Validierung) entsteht.
  fastify.get('/api/reassignments/open-weeks', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert pro Schedule-Woche die Anzahl offener REASSIGNMENT_NEEDED-Entries.',
      tags: ['schedules'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (
      request
    ): Promise<{
      weeks: Array<{ scheduleId: string; weekStart: string; openCount: number }>;
    }> => {
      const actor = request.user!;
      if (
        actor.role !== 'ADMIN' &&
        actor.role !== 'PLANNER' &&
        actor.role !== 'FOREMAN' &&
        !actor.isSuperAdmin
      ) {
        return { weeks: [] };
      }
      const pool = getOwnerPool();
      const r = await pool.query<{ schedule_id: string; week_start: string; open_count: string }>(
        `SELECT s.id AS schedule_id, to_char(s.week_start, 'YYYY-MM-DD') AS week_start,
                COUNT(se.id) AS open_count
           FROM schedules s
           JOIN schedule_entries se ON se.schedule_id = s.id
          WHERE s.tenant_id = $1
            AND s.is_deleted = FALSE
            AND se.is_deleted = FALSE
            AND se.status = 'REASSIGNMENT_NEEDED'
          GROUP BY s.id, s.week_start
          ORDER BY s.week_start ASC`,
        [actor.tenantId]
      );
      return {
        weeks: r.rows.map((row) => ({
          scheduleId: row.schedule_id,
          weekStart: row.week_start,
          openCount: Number(row.open_count),
        })),
      };
    },
  });

  fastify.get<{ Params: { id: string } }>('/api/schedules/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert einen Schedule nach ID',
      tags: ['schedules'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<ScheduleRow>(
        `SELECT ${COLS} FROM schedules
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.scheduleNotFound');
      return row;
    },
  });

  // POST /api/schedules
  fastify.post('/api/schedules', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt einen neuen Schedule an (status default DRAFT)',
      tags: ['schedules'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<ScheduleRow> => {
      const actor = request.user!;
      const input = parseOr400(createScheduleSchema, request.body);
      const pool = getOwnerPool();
      try {
        const r = await pool.query<ScheduleRow>(
          `INSERT INTO schedules (
             tenant_id, week_start, week_number, year, template_id,
             generation_method, notes, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING ${COLS}`,
          [
            actor.tenantId,
            input.weekStart,
            input.weekNumber,
            input.year,
            input.templateId ?? null,
            input.generationMethod ?? null,
            input.notes ?? null,
            actor.userId,
          ]
        );
        reply.code(201);
        return r.rows[0];
      } catch (err) {
        const e = err as { code?: string; constraint?: string };
        if (e.code === '23505' && e.constraint === 'uq_schedules_week') {
          throw new DuplicateWeekError();
        }
        throw err;
      }
    },
  });

  // PUT /api/schedules/:id — status + notes
  fastify.put<{ Params: { id: string } }>('/api/schedules/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert status / notes mit Transition-Check',
      tags: ['schedules'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateScheduleSchema, request.body);
      const pool = getOwnerPool();

      // Aktuellen Status laden für Transition-Check
      const current = await pool.query<{ status: string }>(
        `SELECT status FROM schedules
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (current.rowCount === 0) throw new NotFoundError('errors.scheduleNotFound');

      if (input.status !== undefined) {
        const from = current.rows[0].status as ScheduleStatus;
        if (!isValidStatusTransition(from, input.status)) {
          throw new InvalidStatusTransitionError(from, input.status);
        }
      }

      const fields: string[] = [];
      const values: unknown[] = [];
      let p = 1;
      if (input.status !== undefined) {
        fields.push(`status = $${p++}`);
        values.push(input.status);
      }
      if (input.notes !== undefined) {
        fields.push(`notes = $${p++}`);
        values.push(input.notes);
      }
      values.push(id);
      values.push(actor.tenantId);

      const r = await pool.query<ScheduleRow>(
        `UPDATE schedules SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      return r.rows[0];
    },
  });

  // POST /api/schedules/:id/publish — DRAFT → PUBLISHED
  fastify.post<{ Params: { id: string } }>('/api/schedules/:id/publish', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Veröffentlicht einen Schedule (DRAFT → PUBLISHED) + setzt published_at/by',
      tags: ['schedules'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();

      const current = await pool.query<{ status: string }>(
        `SELECT status FROM schedules
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (current.rowCount === 0) throw new NotFoundError('errors.scheduleNotFound');
      const from = current.rows[0].status as ScheduleStatus;
      // Publish-Action: strikt nur aus DRAFT — Idempotenz wäre hier irreführend
      // (der Aufrufer soll wissen, dass der Plan schon veröffentlicht ist).
      if (from !== 'DRAFT') {
        throw new InvalidStatusTransitionError(from, 'PUBLISHED');
      }

      const r = await pool.query<ScheduleRow>(
        `UPDATE schedules
         SET status = 'PUBLISHED', published_at = NOW(), published_by = $1
         WHERE id = $2 AND tenant_id = $3
         RETURNING ${COLS}`,
        [actor.userId, id, actor.tenantId]
      );
      request.log.info({ action: 'schedule.publish', id, by: actor.userId }, 'Schedule published');
      return r.rows[0];
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/schedules/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn Entries vorhanden.',
      tags: ['schedules'],
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
        `SELECT id FROM schedules
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.scheduleNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM schedule_entries
           WHERE schedule_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(`UPDATE schedules SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, [
        id,
      ]);
      reply.code(204);
      return { ok: true };
    },
  });
}
