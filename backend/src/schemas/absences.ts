import { z } from 'zod';

export const ABSENCE_TYPES = ['SICK', 'VACATION', 'PERSONAL', 'TRAINING', 'OTHER'] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

/** Absences die Mitarbeiter selbst melden dürfen (Self-Reporting). */
export const SELF_REPORTABLE_ABSENCE_TYPES: readonly AbsenceType[] = ['SICK', 'PERSONAL'];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTime = z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);

export const createAbsenceSchema = z
  .object({
    employeeId: z.string().uuid(),
    absenceType: z.enum(ABSENCE_TYPES),
    startDate: isoDate,
    endDate: isoDate,
    isFullDay: z.boolean().optional(),
    startTime: isoTime.optional(),
    endTime: isoTime.optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });

export const updateAbsenceSchema = z
  .object({
    absenceType: z.enum(ABSENCE_TYPES).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    isFullDay: z.boolean().optional(),
    startTime: z.union([isoTime, z.null()]).optional(),
    endTime: z.union([isoTime, z.null()]).optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field' });

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof updateAbsenceSchema>;

export interface AbsenceRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  absence_type: string;
  start_date: string;
  end_date: string;
  is_full_day: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  reported_at: Date;
  reported_by: string | null;
  is_handled: boolean;
  handled_at: Date | null;
  handled_by: string | null;
  created_at: Date;
  updated_at: Date;
}
