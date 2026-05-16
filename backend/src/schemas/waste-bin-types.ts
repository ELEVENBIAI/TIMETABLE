import { z } from 'zod';

export const WASTE_BIN_CODES = [
  'RESIDUAL',
  'PAPER',
  'YELLOW_SACK',
  'YELLOW_BIN',
  'BIO',
  'GLASS',
  'BULKY',
  'OTHER',
] as const;
export type WasteBinCode = (typeof WASTE_BIN_CODES)[number];

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const createWasteBinTypeSchema = z.object({
  code: z.enum(WASTE_BIN_CODES),
  name: z.string().min(1).max(100),
  colorCode: hexColor.optional(),
  description: z.string().max(2000).optional(),
});

export const updateWasteBinTypeSchema = z
  .object({
    code: z.enum(WASTE_BIN_CODES).optional(),
    name: z.string().min(1).max(100).optional(),
    colorCode: hexColor.optional(),
    description: z.string().max(2000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreateWasteBinTypeInput = z.infer<typeof createWasteBinTypeSchema>;
export type UpdateWasteBinTypeInput = z.infer<typeof updateWasteBinTypeSchema>;

export interface WasteBinTypeRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  color_code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
