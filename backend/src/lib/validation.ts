// Zod-Validation-Helper für Fastify-Routes (ADR-03)

import type { FastifyRequest } from 'fastify';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Validiert request.body gegen ein Zod-Schema.
 * Wirft ValidationError mit detailliertem Pfad bei Fehler.
 */
export function validateBody<T>(schema: ZodSchema<T>, request: FastifyRequest): T {
  try {
    return schema.parse(request.body);
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new ValidationError(`Eingabe ungültig: ${issues}`);
    }
    throw err;
  }
}
