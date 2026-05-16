// GET /api/health
// Liefert Service-Status + DB-Connectivity-Check (ADR-12 Graceful Degradation)

import type { FastifyInstance } from 'fastify';
import { VERSION } from '../config.js';
import { getOwnerPool } from '../db/pools.js';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/health', {
    schema: {
      description: 'Health-Check inkl. DB-Connectivity',
      tags: ['system'],
    },
    handler: async (_request, reply) => {
      try {
        const pool = getOwnerPool();
        await pool.query('SELECT 1');
        return { status: 'ok', db: 'connected', version: VERSION };
      } catch (err) {
        _request.log.error({ err }, 'Health-Check: DB unreachable');
        return reply
          .code(503)
          .send({ error: { code: 'DB_UNAVAILABLE', message: 'Datenbank nicht erreichbar' } });
      }
    },
  });
}
