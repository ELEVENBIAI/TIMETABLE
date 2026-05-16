// POST /api/schedules/generate (ELE-185)
// Erzeugt einen kompletten DRAFT-Wochenplan aus einem Template in einer
// DB-Transaktion. Rollback bei Fehler.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { ValidationError } from '../lib/errors.js';
import { generateScheduleSchema, type GeneratorResult } from '../schemas/schedule-generator.js';
import { generateSchedule } from '../services/scheduling/schedule-generator.js';

export async function scheduleGeneratorRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/schedules/generate', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description:
        'Generiert einen DRAFT-Wochenplan aus einem Template. Output: schedule + entries + warnings.',
      tags: ['schedules'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request, reply): Promise<GeneratorResult> => {
      const actor = request.user!;
      let input;
      try {
        input = generateScheduleSchema.parse(request.body);
      } catch (err) {
        if (err instanceof ZodError) {
          const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
          throw new ValidationError('errors.validationDetails', { details });
        }
        throw err;
      }

      const pool = getOwnerPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await generateSchedule(client, actor.tenantId, actor.userId, input);
        await client.query('COMMIT');
        request.log.info(
          {
            action: 'schedule.generate',
            scheduleId: result.schedule.id,
            entries: result.entries.length,
            warnings: result.warnings.length,
            by: actor.userId,
          },
          'Schedule generated from template'
        );
        reply.code(201);
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  });
}
