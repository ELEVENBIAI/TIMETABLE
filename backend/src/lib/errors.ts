// Strukturierte Error-Klassen für API-Responses
// Format: { error: { code, message } }

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Nicht autorisiert') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class LockedError extends HttpError {
  constructor(message = 'Account gesperrt') {
    super(423, 'ACCOUNT_LOCKED', message);
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Ungültige Eingabe') {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Nicht gefunden') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(code = 'SERVICE_UNAVAILABLE', message = 'Service nicht verfügbar') {
    super(503, code, message);
  }
}
