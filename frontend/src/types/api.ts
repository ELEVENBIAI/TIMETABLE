// Normalisierte API-Response-Typen, gespiegelt zum Backend (ADR-16 messageKey-Format).

export interface ApiError {
  code: string;
  messageKey?: string;
  message: string;
  vars?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    public messageKey: string | undefined,
    message: string,
    public vars?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}
