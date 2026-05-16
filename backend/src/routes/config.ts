// GET /api/config
// Liefert whitelisted Feature-Flags ans Frontend (ADR-12).
// Wir geben NUR explizit erlaubte Flags raus — kein direkter Dump von FEATURES.

import type { FastifyInstance } from 'fastify';
import { FEATURES, VERSION } from '../config.js';

export async function configRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/config', {
    schema: {
      description: 'Whitelisted Feature-Flags + Version fürs Frontend',
      tags: ['system'],
    },
    handler: async () => ({
      version: VERSION,
      features: {
        planGeneratorEnabled: FEATURES.PLAN_GENERATOR_ENABLED,
        reassignmentAiEnabled: FEATURES.REASSIGNMENT_AI_ENABLED,
        timeLogsGpsRequired: FEATURES.TIME_LOGS_GPS_REQUIRED,
        routingProvider: FEATURES.ROUTING_PROVIDER,
        maintenanceMode: FEATURES.MAINTENANCE_MODE,
      },
    }),
  });
}
