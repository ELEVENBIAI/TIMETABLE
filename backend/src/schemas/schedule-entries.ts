import { z } from 'zod';

export const SCHEDULE_ENTRY_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
  'REASSIGNED',
  'REASSIGNMENT_NEEDED',
] as const;
export type ScheduleEntryStatus = (typeof SCHEDULE_ENTRY_STATUSES)[number];

export const REASSIGNMENT_REASONS = [
  'SICK',
  'VACATION',
  'EMERGENCY',
  'OPTIMIZATION',
  'OTHER',
] as const;
export type ReassignmentReason = (typeof REASSIGNMENT_REASONS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTime = z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);

export const createScheduleEntrySchema = z.object({
  scheduleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  entryDate: isoDate,
  dayOfWeek: z.number().int().min(1).max(7),
  propertyId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  propertyServiceId: z.string().uuid().optional(),
  startTime: isoTime.optional(),
  durationMin: z.number().int().min(5).max(480),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  status: z.enum(SCHEDULE_ENTRY_STATUSES).optional(),
  isExtra: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateScheduleEntrySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    entryDate: isoDate.optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    propertyId: z.string().uuid().optional(),
    serviceTypeId: z.string().uuid().optional(),
    propertyServiceId: z.string().uuid().optional(),
    startTime: z.union([isoTime, z.null()]).optional(),
    durationMin: z.number().int().min(5).max(480).optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
    status: z.enum(SCHEDULE_ENTRY_STATUSES).optional(),
    isExtra: z.boolean().optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field' });

export const moveScheduleEntrySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    entryDate: isoDate.optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
    startTime: z.union([isoTime, z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one move field' });

export const bulkCreateScheduleEntriesSchema = z.object({
  entries: z.array(createScheduleEntrySchema).min(1).max(200),
});

export type CreateScheduleEntryInput = z.infer<typeof createScheduleEntrySchema>;
export type UpdateScheduleEntryInput = z.infer<typeof updateScheduleEntrySchema>;
export type MoveScheduleEntryInput = z.infer<typeof moveScheduleEntrySchema>;
export type BulkCreateScheduleEntriesInput = z.infer<typeof bulkCreateScheduleEntriesSchema>;

export interface ScheduleEntryRow {
  id: string;
  tenant_id: string;
  schedule_id: string;
  employee_id: string;
  entry_date: string;
  day_of_week: number;
  property_id: string;
  service_type_id: string;
  property_service_id: string | null;
  start_time: string | null;
  duration_min: number;
  sort_order: number;
  status: string;
  is_extra: boolean;
  is_from_reassignment: boolean;
  original_employee_id: string | null;
  reassignment_reason: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
