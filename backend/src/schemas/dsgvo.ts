// DSGVO-Routes Input-Schemas (ELE-187).

import { z } from 'zod';

export const dataExportInputSchema = z.object({
  userId: z.string().uuid().optional(),
});

export const deleteRequestInputSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(3).max(500),
  /** Phishing-Schutz: für Self-Service-Lösch-Requests muss diese E-Mail dem
   *  eingeloggten User entsprechen. Für ADMIN-Requests kann das Feld fehlen. */
  confirmEmail: z.string().email().optional(),
});

export const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z
    .string()
    .regex(/^[a-z_]+\.[a-z_]+$/)
    .optional(),
  targetType: z.string().min(1).max(50).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

export type DataExportInput = z.infer<typeof dataExportInputSchema>;
export type DeleteRequestInput = z.infer<typeof deleteRequestInputSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
