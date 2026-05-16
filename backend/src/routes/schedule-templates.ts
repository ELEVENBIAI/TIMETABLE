// Schedule-Templates CRUD + duplicate (ELE-183)
// IS_DEFAULT-Konflikt: max 1 Default-Template pro Tenant pro überlappendem
// Gültigkeitsbereich. Bei Überlappung → 409 DEFAULT_TEMPLATE_CONFLICT.
// DELETE blockiert wenn von Schedules referenziert.

import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { HttpError, NotFoundError, ValidationError } from '../lib/errors.js';
import {
  createScheduleTemplateSchema,
  updateScheduleTemplateSchema,
  type ScheduleTemplateRow,
} from '../schemas/schedule-templates.js';

const COLS = `id, tenant_id, name, description, is_default, valid_from, valid_until,
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

class InUseError extends HttpError {
  constructor() {
    super(409, 'IN_USE', 'errors.inUse', 'errors.inUse');
  }
}

class DefaultTemplateConflictError extends HttpError {
  constructor(conflictingId: string) {
    super(
      409,
      'DEFAULT_TEMPLATE_CONFLICT',
      'errors.defaultTemplateConflict',
      'errors.defaultTemplateConflict',
      { conflictingTemplateId: conflictingId }
    );
  }
}

/**
 * Sucht ein bestehendes Default-Template, dessen Gültigkeitsbereich mit dem
 * gegebenen überlappt. NULL-Boundaries (open-ended) werden als ±∞ behandelt.
 * Liefert die ID des konfligierenden Templates oder null.
 */
async function findDefaultConflict(
  client: QueryRunner,
  tenantId: string,
  validFrom: string | null,
  validUntil: string | null,
  excludeId?: string
): Promise<string | null> {
  // Überlappung: NOT (existing.end < new.start OR existing.start > new.end)
  // Mit NULL: NULL gilt als ±∞, also "kein Endpunkt" — wir bauen die Bedingung um.
  const params: unknown[] = [tenantId];
  let where = `tenant_id = $1 AND is_default = TRUE AND is_deleted = FALSE`;
  if (excludeId) {
    params.push(excludeId);
    where += ` AND id != $${params.length}`;
  }
  // Wenn neue Range einen Endpunkt hat, schließe Templates aus, deren Bereich
  // komplett dahinter/vorne liegt (mit NULL-Handling über COALESCE).
  if (validFrom !== null) {
    params.push(validFrom);
    // existing.valid_until < validFrom → kein Overlap (existing endet vor neuer Start)
    where += ` AND (valid_until IS NULL OR valid_until >= $${params.length})`;
  }
  if (validUntil !== null) {
    params.push(validUntil);
    where += ` AND (valid_from IS NULL OR valid_from <= $${params.length})`;
  }
  const r = await client.query<{ id: string }>(
    `SELECT id FROM schedule_templates WHERE ${where} LIMIT 1`,
    params
  );
  return r.rows[0]?.id ?? null;
}

export async function scheduleTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/schedule-templates
  fastify.get<{ Querystring: { isDefault?: string; validForDate?: string } }>(
    '/api/schedule-templates',
    {
      preHandler: requireAuth,
      schema: {
        description:
          'Liefert Schedule-Templates. Filter: ?isDefault=true, ?validForDate=YYYY-MM-DD',
        tags: ['schedule-templates'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            isDefault: { type: 'string', enum: ['true', 'false'] },
            validForDate: { type: 'string', format: 'date' },
          },
        },
      },
      handler: async (request): Promise<{ scheduleTemplates: ScheduleTemplateRow[] }> => {
        const actor = request.user!;
        const pool = getOwnerPool();
        const params: unknown[] = [actor.tenantId];
        let where = `tenant_id = $1 AND is_deleted = FALSE`;
        if (request.query.isDefault === 'true' || request.query.isDefault === 'false') {
          params.push(request.query.isDefault === 'true');
          where += ` AND is_default = $${params.length}`;
        }
        if (request.query.validForDate) {
          params.push(request.query.validForDate);
          where += ` AND (valid_from IS NULL OR valid_from <= $${params.length}) AND (valid_until IS NULL OR valid_until >= $${params.length})`;
        }
        const r = await pool.query<ScheduleTemplateRow>(
          `SELECT ${COLS} FROM schedule_templates WHERE ${where} ORDER BY name`,
          params
        );
        return { scheduleTemplates: r.rows };
      },
    }
  );

  fastify.get<{ Params: { id: string } }>('/api/schedule-templates/:id', {
    preHandler: requireAuth,
    schema: {
      description: 'Liefert ein Template nach ID',
      tags: ['schedule-templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleTemplateRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();
      const r = await pool.query<ScheduleTemplateRow>(
        `SELECT ${COLS} FROM schedule_templates
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.templateNotFound');
      return row;
    },
  });

  fastify.post('/api/schedule-templates', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Legt ein neues Schedule-Template an',
      tags: ['schedule-templates'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<ScheduleTemplateRow> => {
      const actor = request.user!;
      const input = parseOr400(createScheduleTemplateSchema, request.body);
      const pool = getOwnerPool();

      if (input.isDefault === true) {
        const conflict = await findDefaultConflict(
          pool,
          actor.tenantId,
          input.validFrom ?? null,
          input.validUntil ?? null
        );
        if (conflict) throw new DefaultTemplateConflictError(conflict);
      }

      const r = await pool.query<ScheduleTemplateRow>(
        `INSERT INTO schedule_templates (
           tenant_id, name, description, is_default, valid_from, valid_until, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COLS}`,
        [
          actor.tenantId,
          input.name,
          input.description ?? null,
          input.isDefault ?? false,
          input.validFrom ?? null,
          input.validUntil ?? null,
          actor.userId,
        ]
      );
      reply.code(201);
      return r.rows[0];
    },
  });

  fastify.put<{ Params: { id: string } }>('/api/schedule-templates/:id', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description: 'Aktualisiert ein Schedule-Template',
      tags: ['schedule-templates'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request): Promise<ScheduleTemplateRow> => {
      const actor = request.user!;
      const { id } = request.params;
      const input = parseOr400(updateScheduleTemplateSchema, request.body);
      const pool = getOwnerPool();

      // Wenn is_default=true gesetzt oder Gültigkeit verändert wird → Konflikt-Check
      if (
        input.isDefault === true ||
        input.validFrom !== undefined ||
        input.validUntil !== undefined
      ) {
        const cur = await pool.query<{
          is_default: boolean;
          valid_from: string | null;
          valid_until: string | null;
        }>(
          `SELECT is_default, valid_from, valid_until FROM schedule_templates
           WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
          [id, actor.tenantId]
        );
        if (cur.rowCount === 0) throw new NotFoundError('errors.templateNotFound');
        const willBeDefault = input.isDefault ?? cur.rows[0].is_default;
        if (willBeDefault) {
          const from = input.validFrom !== undefined ? input.validFrom : cur.rows[0].valid_from;
          const until = input.validUntil !== undefined ? input.validUntil : cur.rows[0].valid_until;
          const conflict = await findDefaultConflict(pool, actor.tenantId, from, until, id);
          if (conflict) throw new DefaultTemplateConflictError(conflict);
        }
      }

      const fieldMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        isDefault: 'is_default',
        validFrom: 'valid_from',
        validUntil: 'valid_until',
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

      const r = await pool.query<ScheduleTemplateRow>(
        `UPDATE schedule_templates SET ${fields.join(', ')}
         WHERE id = $${p++} AND tenant_id = $${p} AND is_deleted = FALSE
         RETURNING ${COLS}`,
        values
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundError('errors.templateNotFound');
      return row;
    },
  });

  fastify.delete<{ Params: { id: string } }>('/api/schedule-templates/:id', {
    preHandler: [requireAuth, requireRole('ADMIN')],
    schema: {
      description: 'Soft-Delete. 409 wenn Schedules das Template referenzieren.',
      tags: ['schedule-templates'],
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
        `SELECT id FROM schedule_templates
         WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
        [id, actor.tenantId]
      );
      if (existing.rowCount === 0) throw new NotFoundError('errors.templateNotFound');

      const refCheck = await pool.query<{ in_use: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM schedules
           WHERE template_id = $1 AND is_deleted = FALSE
         ) AS in_use`,
        [id]
      );
      if (refCheck.rows[0].in_use) throw new InUseError();

      await pool.query(
        `UPDATE schedule_templates SET is_deleted = TRUE, deleted_at = NOW()
         WHERE id = $1`,
        [id]
      );
      reply.code(204);
      return { ok: true };
    },
  });

  // POST /api/schedule-templates/:id/duplicate — Kopiert Template + alle Entries
  fastify.post<{ Params: { id: string }; Body: { name?: string } }>(
    '/api/schedule-templates/:id/duplicate',
    {
      preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
      schema: {
        description: 'Dupliziert ein Template + alle Template-Entries (für saisonale Varianten)',
        tags: ['schedule-templates'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: { name: { type: 'string', minLength: 1, maxLength: 200 } },
        },
      },
      handler: async (
        request,
        reply
      ): Promise<{ template: ScheduleTemplateRow; copiedEntries: number }> => {
        const actor = request.user!;
        const { id } = request.params;
        const newName = request.body?.name;
        const pool = getOwnerPool();
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const src = await client.query<ScheduleTemplateRow>(
            `SELECT ${COLS} FROM schedule_templates
             WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
            [id, actor.tenantId]
          );
          if (src.rowCount === 0) {
            await client.query('ROLLBACK');
            throw new NotFoundError('errors.templateNotFound');
          }
          const source = src.rows[0];

          // Neue Template-Row anlegen — is_default immer false bei Kopie
          const created = await client.query<ScheduleTemplateRow>(
            `INSERT INTO schedule_templates (
               tenant_id, name, description, is_default, valid_from, valid_until, created_by
             ) VALUES ($1, $2, $3, FALSE, $4, $5, $6)
             RETURNING ${COLS}`,
            [
              actor.tenantId,
              newName ?? `${source.name} (Kopie)`,
              source.description,
              source.valid_from,
              source.valid_until,
              actor.userId,
            ]
          );
          const newTemplate = created.rows[0];

          // Alle Template-Entries kopieren
          const copy = await client.query<{ id: string }>(
            `INSERT INTO template_entries (
               tenant_id, template_id, employee_id, day_of_week, property_id,
               service_type_id, start_time, duration_min, sort_order, notes
             )
             SELECT tenant_id, $2, employee_id, day_of_week, property_id,
                    service_type_id, start_time, duration_min, sort_order, notes
             FROM template_entries
             WHERE template_id = $1 AND is_deleted = FALSE
             RETURNING id`,
            [id, newTemplate.id]
          );

          await client.query('COMMIT');
          reply.code(201);
          return { template: newTemplate, copiedEntries: copy.rowCount ?? 0 };
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
    }
  );
}
