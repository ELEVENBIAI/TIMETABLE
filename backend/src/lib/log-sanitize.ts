// PII-Sanitization für Logs (ADR-15)
// Entfernt Passwörter, Tokens, vollständige Email-Adressen aus Objekt-Strukturen.

const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'pw',
  'newpassword',
  'oldpassword',
  'token',
  'jwt',
  'authorization',
  'auth',
  'apikey',
  'api_key',
  'secret',
  'jwt_secret',
]);

/**
 * Rekursiv durch Objekt walken und sensible Felder durch '[REDACTED]' ersetzen.
 * Mutiert nicht das Original — gibt eine Kopie zurück.
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[depth-limit]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return maskEmail(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeForLog(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACTED_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

/**
 * Maskiert vollständige Email-Adressen: 'name@domain.com' → 'n***@domain.com'.
 * Sonstige Strings werden unverändert zurückgegeben.
 */
export function maskEmail(s: string): string {
  const match = s.match(/^([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]*)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (!match) return s;
  return `${match[1]}***@${match[3]}`;
}
