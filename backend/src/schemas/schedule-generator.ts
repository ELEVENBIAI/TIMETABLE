import { z } from 'zod';
import type { ScheduleRow } from './schedules.js';
import type { ScheduleEntryRow } from './schedule-entries.js';

export const generateScheduleSchema = z.object({
  templateId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekNumber: z.number().int().min(1).max(53),
  year: z.number().int().min(2020).max(2100),
  notes: z.string().max(2000).optional(),
});

export type GenerateScheduleInput = z.infer<typeof generateScheduleSchema>;

export type WarningCode =
  | 'OVERLOAD'
  | 'QUALIFICATION_EXPIRY'
  | 'NO_TEMPLATE_MATCH'
  | 'ABSENCE'
  | 'OUTSIDE_AVAILABILITY'
  | 'NO_WASTE_SERVICE_TYPE';

export interface GeneratorWarning {
  code: WarningCode;
  messageKey: string;
  vars?: Record<string, unknown>;
}

export interface GeneratorStats {
  templateEntries: number;
  dueServices: number;
  wasteEvents: number;
  totalEntries: number;
}

export interface GeneratorResult {
  schedule: ScheduleRow;
  entries: ScheduleEntryRow[];
  warnings: GeneratorWarning[];
  stats: GeneratorStats;
}
