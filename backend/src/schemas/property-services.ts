import { z } from 'zod';

export const FREQUENCIES = [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'BIANNUAL',
  'ANNUAL',
  'ON_DEMAND',
] as const;
export type Frequency = (typeof FREQUENCIES)[number];

// ─── frequency_detail Zod-Schemas (typed pro Frequenz) ───────────────────────

const weekdaysSchema = z.array(z.number().int().min(1).max(7)).min(1).max(7);

const weeklyDetail = z
  .object({
    weekdays: weekdaysSchema.optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
  })
  .refine((d) => d.weekdays !== undefined || d.dayOfWeek !== undefined, {
    message: 'WEEKLY benötigt weekdays oder dayOfWeek',
  });

const biweeklyDetail = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  oddWeek: z.boolean().optional(),
});

const monthlyDetail = z
  .object({
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    weekOfMonth: z.number().int().min(1).max(5).optional(),
    dayOfWeek: z.number().int().min(1).max(7).optional(),
  })
  .refine(
    (d) => d.dayOfMonth !== undefined || (d.weekOfMonth !== undefined && d.dayOfWeek !== undefined),
    { message: 'MONTHLY benötigt dayOfMonth ODER weekOfMonth+dayOfWeek' }
  );

const periodicDetail = z
  .object({
    months: z.array(z.number().int().min(1).max(12)).min(1).max(12).optional(),
  })
  .optional();

const onDemandDetail = z.object({}).strict().optional();

/** Validiert frequency_detail gegen die gewählte frequency. */
export function validateFrequencyDetail(
  frequency: Frequency,
  detail: unknown
): Record<string, unknown> {
  const safe = (detail ?? {}) as Record<string, unknown>;
  switch (frequency) {
    case 'WEEKLY':
      return weeklyDetail.parse(safe);
    case 'BIWEEKLY':
      return biweeklyDetail.parse(safe);
    case 'MONTHLY':
      return monthlyDetail.parse(safe);
    case 'QUARTERLY':
    case 'BIANNUAL':
    case 'ANNUAL':
      return periodicDetail.parse(safe) ?? {};
    case 'ON_DEMAND':
      return onDemandDetail.parse(safe) ?? {};
  }
}

// ─── Property-Service Schemas ────────────────────────────────────────────────

const seasonalMonth = z.number().int().min(1).max(12);

export const createPropertyServiceSchema = z.object({
  propertyId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  frequency: z.enum(FREQUENCIES),
  frequencyDetail: z.record(z.unknown()).optional(),
  estimatedDurationMin: z.number().int().min(5).max(960),
  timeWindowStart: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  timeWindowEnd: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  priority: z.number().int().min(1).max(4).optional(),
  notes: z.string().max(2000).optional(),
  seasonalStart: seasonalMonth.optional(),
  seasonalEnd: seasonalMonth.optional(),
});

export const updatePropertyServiceSchema = createPropertyServiceSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreatePropertyServiceInput = z.infer<typeof createPropertyServiceSchema>;
export type UpdatePropertyServiceInput = z.infer<typeof updatePropertyServiceSchema>;

export interface PropertyServiceRow {
  id: string;
  tenant_id: string;
  property_id: string;
  service_type_id: string;
  frequency: string;
  frequency_detail: Record<string, unknown>;
  estimated_duration_min: number;
  time_window_start: string | null;
  time_window_end: string | null;
  priority: number;
  notes: string | null;
  seasonal_start: number | null;
  seasonal_end: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
