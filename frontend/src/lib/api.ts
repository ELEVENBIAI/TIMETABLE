// Minimaler fetch-Wrapper. JWT-Header, Locale-Header, Error-Normalisierung (ADR-16 messageKey).
// Bei 401 → Storage cleanen (Login-Flow folgt im Folge-Issue).

import { ApiRequestError, type ApiErrorResponse, type HealthResponse } from '@/types/api';
import { getStoredToken } from './auth';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  locale?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, locale, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const token = getStoredToken();
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (locale) {
    finalHeaders['Accept-Language'] = locale;
  }

  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorBody: ApiErrorResponse | null = null;
    if (isJson) {
      try {
        errorBody = (await response.json()) as ApiErrorResponse;
      } catch {
        errorBody = null;
      }
    }
    const err = errorBody?.error;

    if (response.status === 401) {
      // JWT abgelaufen oder ungültig → Storage leeren (Login-Flow später)
      const localStorageRef = typeof localStorage !== 'undefined' ? localStorage : null;
      localStorageRef?.removeItem('timetable.jwt');
    }

    throw new ApiRequestError(
      response.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.messageKey,
      err?.message ?? response.statusText,
      err?.vars
    );
  }

  if (!isJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// Convenience-Endpoints
export const healthApi = {
  check: () => api.get<HealthResponse>('/health'),
};
