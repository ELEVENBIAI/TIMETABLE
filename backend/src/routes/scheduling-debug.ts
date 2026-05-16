// Debug-Endpoint für Frequenz-Engine (ELE-184)
// GET /api/due-services?weekStart=YYYY-MM-DD
// Liefert was in der Woche fällig wäre (Services + Waste) — ohne sie wirklich
// als Schedule-Entries anzulegen. Hilft Planern beim Vor-Schau-Check.

import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../auth/middleware.js';
import { requireRole } from '../auth/authorize.js';
import { getOwnerPool } from '../db/pools.js';
import { ValidationError } from '../lib/errors.js';
import {
  getDueServicesForWeek,
  getDueWasteSchedulesForWeek,
  normalizeToWeekStart,
  weekInfo,
  type DueService,
  type DueWasteSchedule,
} from '../services/scheduling/frequency-engine.js';

interface DebugResponse {
  weekStart: string;
  isoWeek: number;
  year: number;
  endDate: string;
  dueServices: DueService[];
  dueWasteSchedules: DueWasteSchedule[];
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function schedulingDebugRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { weekStart?: string } }>('/api/due-services', {
    preHandler: [requireAuth, requireRole('ADMIN', 'PLANNER')],
    schema: {
      description:
        'Debug: Liefert fällige Property-Services + Waste-Schedules für eine Kalenderwoche',
      tags: ['scheduling'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['weekStart'],
        properties: { weekStart: { type: 'string', format: 'date' } },
      },
    },
    handler: async (request): Promise<DebugResponse> => {
      const actor = request.user!;
      const { weekStart } = request.query;
      if (!weekStart || !isoDateRegex.test(weekStart)) {
        throw new ValidationError('errors.validationDetails', {
          details: 'weekStart: YYYY-MM-DD required',
        });
      }
      const weekStartDate = normalizeToWeekStart(weekStart);
      const pool = getOwnerPool();

      const [dueServices, dueWasteSchedules] = await Promise.all([
        getDueServicesForWeek(pool, actor.tenantId, weekStartDate),
        getDueWasteSchedulesForWeek(pool, actor.tenantId, weekStartDate),
      ]);
      const info = weekInfo(weekStartDate);
      return {
        weekStart: weekStart,
        isoWeek: info.isoWeek,
        year: info.year,
        endDate: info.end,
        dueServices,
        dueWasteSchedules,
      };
    },
  });
}
