import { z } from 'zod';

export const createPropertyManagerSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePropertyManagerSchema = createPropertyManagerSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreatePropertyManagerInput = z.infer<typeof createPropertyManagerSchema>;
export type UpdatePropertyManagerInput = z.infer<typeof updatePropertyManagerSchema>;

export interface PropertyManagerRow {
  id: string;
  tenant_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
