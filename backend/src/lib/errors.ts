// Strukturierte Error-Klassen für API-Responses (ADR-16)
// Format: { error: { code, messageKey, message } }
//   code       — stabiler Identifier (z.B. UNAUTHORIZED)
//   messageKey — i18next-Schlüssel (z.B. errors.unauthorized) für Frontend-Übersetzung
//   message    — server-seitig in Request-Locale gerenderter Text (Fallback)

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public messageKey?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Nicht autorisiert', messageKey = 'errors.unauthorized') {
    super(401, 'UNAUTHORIZED', message, messageKey);
  }
}

export class LockedError extends HttpError {
  constructor(message = 'Account gesperrt', messageKey = 'errors.accountLocked') {
    super(423, 'ACCOUNT_LOCKED', message, messageKey);
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Ungültige Eingabe', messageKey = 'errors.validation') {
    super(400, 'VALIDATION_ERROR', message, messageKey);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Nicht gefunden', messageKey = 'errors.notFound') {
    super(404, 'NOT_FOUND', message, messageKey);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(
    code = 'SERVICE_UNAVAILABLE',
    message = 'Service nicht verfügbar',
    messageKey = 'errors.serviceUnavailable'
  ) {
    super(503, code, message, messageKey);
  }
}
