import { z } from 'zod';

export const CONTRACT_TYPES = ['STANDARD', 'PREMIUM', 'FRANCHISE'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createContractSchema = z.object({
  propertyManagerId: z.string().uuid(),
  contractType: z.enum(CONTRACT_TYPES),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  noticePeriodMonths: z.number().int().min(0).max(60).optional(),
  monthlyValue: z.number().min(0).max(99_999_999).optional(),
  scopeDescription: z.string().max(2000).optional(),
});

export const updateContractSchema = createContractSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

export interface ContractRow {
  id: string;
  tenant_id: string;
  property_manager_id: string;
  contract_type: string;
  start_date: string | null;
  end_date: string | null;
  notice_period_months: number | null;
  monthly_value: string | null;
  scope_description: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Versteckt sensitive Vertragsdaten für nicht-privilegierte User.
 * monthly_value ist DSGVO-relevant (Vertragsdaten) — nur ADMIN/SUPER_ADMIN/PLANNER sehen es.
 */
export function filterContractForActor(
  row: ContractRow,
  actor: { role: string; isSuperAdmin: boolean }
): ContractRow {
  const allowed = actor.isSuperAdmin || actor.role === 'ADMIN' || actor.role === 'PLANNER';
  if (allowed) return row;
  return { ...row, monthly_value: null };
}
