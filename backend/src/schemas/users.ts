import { z } from 'zod';
import { USER_ROLES } from '../auth/roles.js';
import { SUPPORTED_LOCALES } from '../auth/jwt.js';

/**
 * Passwort-Policy (ADR-09 / ELE-170):
 *   - ≥ 8 Zeichen
 *   - ≥ 1 Großbuchstabe
 *   - ≥ 1 Zahl
 * Bewusst kein Sonderzeichen-Zwang — NIST-Empfehlung: Länge schlägt Komplexität.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Passwort muss mindestens 8 Zeichen lang sein' })
  .max(200, { message: 'Passwort zu lang' })
  .refine((v) => /[A-Z]/.test(v), { message: 'Passwort braucht mindestens einen Großbuchstaben' })
  .refine((v) => /[0-9]/.test(v), { message: 'Passwort braucht mindestens eine Zahl' });

export const roleSchema = z.enum(USER_ROLES);
export const localeSchema = z.enum(SUPPORTED_LOCALES as readonly [string, ...string[]]);

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: passwordSchema,
  displayName: z.string().min(1).max(200),
  role: roleSchema,
  locale: localeSchema.optional(),
});

export const updateUserSchema = z
  .object({
    email: z.string().email().max(255).optional(),
    displayName: z.string().min(1).max(200).optional(),
    role: roleSchema.optional(),
    locale: localeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Mindestens ein Feld muss angegeben werden',
  });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1).max(200).optional(),
    newPassword: passwordSchema,
  })
  .strict();

export const updateLocaleSchema = z.object({
  locale: localeSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;

export interface UserPublicRow {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: string;
  is_super_admin: boolean;
  locale: string;
  must_change_password: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Self-Profile Response (GET /api/users/me, ELE-201).
// camelCase für Frontend-Konsum. Soft-deleted Users werden vor Mapping als 401 abgewiesen.
export interface UserMeResponse {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: string;
  isSuperAdmin: boolean;
  locale: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
