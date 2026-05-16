import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createScheduleTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  isDefault: z.boolean().optional(),
  validFrom: isoDate.optional(),
  validUntil: isoDate.optional(),
});

export const updateScheduleTemplateSchema = createScheduleTemplateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field' });

export type CreateScheduleTemplateInput = z.infer<typeof createScheduleTemplateSchema>;
export type UpdateScheduleTemplateInput = z.infer<typeof updateScheduleTemplateSchema>;

export interface ScheduleTemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Template-Entries ───────────────────────────────────────────────────────

const isoTime = z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);

export const createTemplateEntrySchema = z.object({
  templateId: z.string().uuid(),
  employeeId: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(7),
  propertyId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  startTime: isoTime,
  durationMin: z.number().int().min(5).max(480),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateTemplateEntrySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    propertyId: z.string().uuid().optional(),
    serviceTypeId: z.string().uuid().optional(),
    startTime: isoTime.optional(),
    durationMin: z.number().int().min(5).max(480).optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field' });

export type CreateTemplateEntryInput = z.infer<typeof createTemplateEntrySchema>;
export type UpdateTemplateEntryInput = z.infer<typeof updateTemplateEntrySchema>;

export interface TemplateEntryRow {
  id: string;
  tenant_id: string;
  template_id: string;
  employee_id: string;
  day_of_week: number;
  property_id: string;
  service_type_id: string;
  start_time: string;
  duration_min: number;
  sort_order: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
