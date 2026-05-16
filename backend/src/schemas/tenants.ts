import { z } from 'zod';

export const tenantBrandSchema = z.enum(['GEPARD', 'IMMOBILIENBUTLER', 'PAUL']);

export const updateTenantSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    brand: tenantBrandSchema.optional(),
    timezone: z.string().min(1).max(50).optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  brand: string;
  timezone: string;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}
