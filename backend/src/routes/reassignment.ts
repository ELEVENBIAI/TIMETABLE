// Reassignment-Vorschläge-Endpoint (ELE-196).
// GET /api/schedule-entries/:id/reassignment-suggestions

import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { NotFoundError } from '../lib/errors.js';
import {
  EntryNotFoundError,
  getReassignmentSuggestions,
} from '../services/scheduling/reassignment-engine.js';

export async function reassignmentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { id: string } }>('/api/schedule-entries/:id/reassignment-suggestions', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER', 'FOREMAN')],
    schema: {
      description:
        'DSGVO-konforme Vertretungsvorschläge für einen Schedule-Entry (ELE-196 / ADR-19). ' +
        'Liefert Top-N gescorte Kandidaten + Hard-blocked Liste mit i18n-Keys.',
      tags: ['reassignment'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    handler: async (request) => {
      const actor = request.user!;
      const { id } = request.params;
      const pool = getOwnerPool();

      try {
        const result = await getReassignmentSuggestions(pool, actor.tenantId, id);
        request.log.info(
          {
            action: 'reassignment.suggestions',
            entryId: id,
            topCount: result.suggestions.length,
            blockedCount: result.blocked.length,
          },
          'Reassignment suggestions generated'
        );
        return result;
      } catch (err) {
        if (err instanceof EntryNotFoundError) {
          throw new NotFoundError('errors.scheduleEntryNotFound');
        }
        throw err;
      }
    },
  });
}
