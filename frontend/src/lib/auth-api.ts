// Auth-API-Wrapper (ELE-200). Verwendet den gemeinsamen api-Client.
// Daten-Fetching-Layer (TanStack Query) folgt mit ELE-180 — hier reichen direkte Calls,
// weil der Auth-Flow imperativ ist (Submit → Token → Redirect).

import { api } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  mustChangePassword: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  ok: true;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  ok: true;
}

export interface UserMe {
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

export const authApi = {
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body),
  forgotPassword: (body: ForgotPasswordRequest) =>
    api.post<ForgotPasswordResponse>('/auth/forgot-password', body),
  changePassword: (userId: string, body: ChangePasswordRequest) =>
    api.post<ChangePasswordResponse>(`/users/${userId}/change-password`, body),
  me: () => api.get<UserMe>('/users/me'),
};
