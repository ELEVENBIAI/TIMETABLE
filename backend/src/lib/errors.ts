// Strukturierte Error-Klassen für API-Responses (ADR-16, ELE-194)
// Format: { error: { code, messageKey, message } }
//   code       — stabiler Identifier (z.B. UNAUTHORIZED)
//   messageKey — i18next-Schlüssel (z.B. errors.unauthorized) für Frontend-Übersetzung
//   message    — server-seitig in request.locale gerenderter Text (Fallback)
//
// vars: optionale Interpolations-Variablen (z.B. { email: '...' })

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public messageKey?: string,
    public vars?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(messageKey = 'errors.unauthorized', vars?: Record<string, unknown>) {
    super(401, 'UNAUTHORIZED', messageKey, messageKey, vars);
  }
}

export class LockedError extends HttpError {
  constructor(messageKey = 'errors.accountLocked', vars?: Record<string, unknown>) {
    super(423, 'ACCOUNT_LOCKED', messageKey, messageKey, vars);
  }
}

export class ValidationError extends HttpError {
  constructor(messageKey = 'errors.validation', vars?: Record<string, unknown>) {
    super(400, 'VALIDATION_ERROR', messageKey, messageKey, vars);
  }
}

export class NotFoundError extends HttpError {
  constructor(messageKey = 'errors.notFound', vars?: Record<string, unknown>) {
    super(404, 'NOT_FOUND', messageKey, messageKey, vars);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(
    code = 'SERVICE_UNAVAILABLE',
    messageKey = 'errors.serviceUnavailable',
    vars?: Record<string, unknown>
  ) {
    super(503, code, messageKey, messageKey, vars);
  }
}
