// Zod-Validation-Helper für Fastify-Routes (ADR-03, ADR-16)

import type { FastifyRequest } from 'fastify';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Validiert request.body gegen ein Zod-Schema.
 * Wirft ValidationError mit `errors.validationDetails` + Detail-Vars bei Fehler.
 */
export function validateBody<T>(schema: ZodSchema<T>, request: FastifyRequest): T {
  try {
    return schema.parse(request.body);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new ValidationError('errors.validationDetails', { details });
    }
    throw err;
  }
}
