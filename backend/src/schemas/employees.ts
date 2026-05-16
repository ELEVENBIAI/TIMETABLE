import { z } from 'zod';

export const EMPLOYEE_TYPES = [
  'FULLTIME',
  'PARTTIME',
  'MINIJOB',
  'SUBCONTRACTOR',
  'FRANCHISEE',
] as const;
export type EmployeeType = (typeof EMPLOYEE_TYPES)[number];

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Color code must match #RRGGBB' });

const coordinateSchema = z.number().gte(-180).lte(180); // PostgreSQL DECIMAL(10,7) — fasst lat (-90..90) und lng (-180..180)

export const createEmployeeSchema = z.object({
  userId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200).optional(),
  employeeType: z.enum(EMPLOYEE_TYPES),
  weeklyHours: z.number().min(0).max(60).optional(),
  hourlyRate: z.number().min(0).max(999_999).optional(),
  colorCode: hexColorSchema.optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  homeAddress: z.string().max(500).optional(),
  homeLat: coordinateSchema.optional(),
  homeLng: coordinateSchema.optional(),
});

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export interface EmployeeRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  region_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string | null;
  employee_type: string;
  weekly_hours: string | null;
  hourly_rate: string | null;
  color_code: string | null;
  phone: string | null;
  email: string | null;
  home_address: string | null;
  home_lat: string | null;
  home_lng: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Liefert Employee ohne sensible Felder für nicht-ADMIN-User.
 * HOURLY_RATE wird nur an ADMIN + SUPER_ADMIN ausgeliefert (DSGVO-Mindestumfang).
 */
export function filterEmployeeForActor(
  row: EmployeeRow,
  actor: { role: string; isSuperAdmin: boolean }
): EmployeeRow {
  const isAdmin = actor.isSuperAdmin || actor.role === 'ADMIN';
  if (isAdmin) return row;
  return { ...row, hourly_rate: null };
}
