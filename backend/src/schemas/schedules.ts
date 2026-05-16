import { z } from 'zod';

export const SCHEDULE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const GENERATION_METHODS = [
  'MANUAL',
  'FROM_TEMPLATE',
  'AI_GENERATED',
  'AI_ADJUSTED',
] as const;
export type GenerationMethod = (typeof GENERATION_METHODS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createScheduleSchema = z.object({
  weekStart: isoDate,
  weekNumber: z.number().int().min(1).max(53),
  year: z.number().int().min(2020).max(2100),
  templateId: z.string().uuid().optional(),
  generationMethod: z.enum(GENERATION_METHODS).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateScheduleSchema = z
  .object({
    status: z.enum(SCHEDULE_STATUSES).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field' });

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

export interface ScheduleRow {
  id: string;
  tenant_id: string;
  week_start: string;
  week_number: number;
  year: number;
  status: string;
  template_id: string | null;
  generation_method: string | null;
  published_at: Date | null;
  published_by: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
