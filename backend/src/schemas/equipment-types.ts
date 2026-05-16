import { z } from 'zod';

export const EQUIPMENT_CATEGORIES = [
  'RASENMAEHER',
  'REINIGUNG',
  'WINTER',
  'GARTEN',
  'WERKZEUG',
  'FAHRZEUG',
  'OTHER',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const createEquipmentTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.enum(EQUIPMENT_CATEGORIES),
  hourlyRateFactor: z.number().min(0.3).max(2.0),
  description: z.string().max(2000).optional(),
});

export const updateEquipmentTypeSchema = z
  .object({
    code: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(200).optional(),
    category: z.enum(EQUIPMENT_CATEGORIES).optional(),
    hourlyRateFactor: z.number().min(0.3).max(2.0).optional(),
    description: z.string().max(2000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type CreateEquipmentTypeInput = z.infer<typeof createEquipmentTypeSchema>;
export type UpdateEquipmentTypeInput = z.infer<typeof updateEquipmentTypeSchema>;

export interface EquipmentTypeRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category: string;
  hourly_rate_factor: string; // DECIMAL → string
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
