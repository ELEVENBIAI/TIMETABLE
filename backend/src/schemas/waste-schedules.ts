import { z } from 'zod';

// collection_days JSONB-Struktur (ELE-178)
// {
//   daysOfWeek: [1..7],
//   frequency: 'WEEKLY' | 'BIWEEKLY',
//   evenWeeks?: boolean,   // nur bei BIWEEKLY
//   oddWeeks?: boolean,    // nur bei BIWEEKLY (genau eines von even/odd)
// }
export const collectionDaysSchema = z
  .object({
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    frequency: z.enum(['WEEKLY', 'BIWEEKLY']),
    evenWeeks: z.boolean().optional(),
    oddWeeks: z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (d.frequency === 'WEEKLY') return true;
      // BIWEEKLY: genau eines von evenWeeks XOR oddWeeks
      const e = d.evenWeeks === true;
      const o = d.oddWeeks === true;
      return e !== o;
    },
    { message: 'BIWEEKLY needs exactly one of evenWeeks or oddWeeks' }
  );

const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const createWasteScheduleSchema = z.object({
  propertyId: z.string().uuid(),
  wasteBinTypeId: z.string().uuid(),
  collectionDays: collectionDaysSchema,
  collectionTime: z.string().regex(timeRegex).optional(),
  latestPutOut: z.string().regex(timeRegex).optional(),
  earliestTakeIn: z.string().regex(timeRegex).optional(),
  binCount: z.number().int().min(1).max(100).optional(),
  // Pflicht laut Spec — DB ist nullable, wir erzwingen Pflicht im Zod.
  locationDescription: z.string().min(1).max(2000),
  notes: z.string().max(2000).optional(),
});

export const updateWasteScheduleSchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    wasteBinTypeId: z.string().uuid().optional(),
    collectionDays: collectionDaysSchema.optional(),
    collectionTime: z.string().regex(timeRegex).optional(),
    latestPutOut: z.string().regex(timeRegex).optional(),
    earliestTakeIn: z.string().regex(timeRegex).optional(),
    binCount: z.number().int().min(1).max(100).optional(),
    locationDescription: z.string().min(1).max(2000).optional(),
    notes: z.string().max(2000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreateWasteScheduleInput = z.infer<typeof createWasteScheduleSchema>;
export type UpdateWasteScheduleInput = z.infer<typeof updateWasteScheduleSchema>;

export interface WasteScheduleRow {
  id: string;
  tenant_id: string;
  property_id: string;
  waste_bin_type_id: string;
  collection_days: Record<string, unknown>;
  collection_time: string | null;
  latest_put_out: string | null;
  earliest_take_in: string | null;
  bin_count: number;
  location_description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
