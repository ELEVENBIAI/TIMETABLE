import { z } from 'zod';

export const createQualificationTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  requiresProof: z.boolean().optional(),
});

export const updateQualificationTypeSchema = z
  .object({
    code: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    requiresProof: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type CreateQualificationTypeInput = z.infer<typeof createQualificationTypeSchema>;
export type UpdateQualificationTypeInput = z.infer<typeof updateQualificationTypeSchema>;

export interface QualificationTypeRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  requires_proof: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
