import { z } from 'zod';

// ─── Employee Qualifications ─────────────────────────────────────────────────
export const assignQualificationSchema = z.object({
  qualificationTypeId: z.string().uuid(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  certificateNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateQualificationSchema = z
  .object({
    validUntil: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
    certificateNumber: z.union([z.string().max(100), z.null()]).optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export interface EmployeeQualificationRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  qualification_type_id: string;
  valid_until: string | null;
  certificate_number: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Employee Equipment ──────────────────────────────────────────────────────
export const assignEquipmentSchema = z.object({
  equipmentTypeId: z.string().uuid(),
  assignedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(2000).optional(),
});

export const updateEquipmentSchema = z
  .object({
    assignedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export interface EmployeeEquipmentRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  equipment_type_id: string;
  assigned_at: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Employee Availability ───────────────────────────────────────────────────
const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const upsertAvailabilitySchema = z
  .object({
    isAvailable: z.boolean().optional(),
    availableFrom: z.union([z.string().regex(timeRegex), z.null()]).optional(),
    availableUntil: z.union([z.string().regex(timeRegex), z.null()]).optional(),
    notes: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type AssignQualificationInput = z.infer<typeof assignQualificationSchema>;
export type UpdateQualificationInput = z.infer<typeof updateQualificationSchema>;
export type AssignEquipmentInput = z.infer<typeof assignEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type UpsertAvailabilityInput = z.infer<typeof upsertAvailabilitySchema>;

export interface EmployeeAvailabilityRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  day_of_week: number;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
