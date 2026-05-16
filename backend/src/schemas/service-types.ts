import { z } from 'zod';

export const SERVICE_CATEGORIES = [
  'CLEANING',
  'GARDEN',
  'WASTE',
  'WINTER',
  'MAINTENANCE',
  'OTHER',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Color code must match #RRGGBB' });

export const createServiceTypeSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z.string().min(1).max(30),
  category: z.enum(SERVICE_CATEGORIES),
  colorCode: hexColorSchema,
  icon: z.string().max(50).optional(),
  defaultDurationMin: z.number().int().min(5).max(480),
  requiresQualification: z.string().max(50).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateServiceTypeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    shortName: z.string().min(1).max(30).optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    colorCode: hexColorSchema.optional(),
    icon: z.string().max(50).optional(),
    defaultDurationMin: z.number().int().min(5).max(480).optional(),
    requiresQualification: z.string().max(50).optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>;

export interface ServiceTypeRow {
  id: string;
  tenant_id: string;
  name: string;
  short_name: string;
  category: string;
  color_code: string;
  icon: string | null;
  default_duration_min: number;
  requires_qualification: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
