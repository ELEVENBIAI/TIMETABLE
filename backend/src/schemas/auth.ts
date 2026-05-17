import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface LoginResponse {
  token: string;
  expiresIn: string;
  mustChangePassword: boolean;
}

// Forgot-Password — Anti-Enumeration Stub (ELE-201).
// Backend responds always 200, kein Hinweis ob User existiert.
export const forgotPasswordRequestSchema = z.object({
  email: z.string().email().max(255),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export interface ForgotPasswordResponse {
  ok: true;
}
