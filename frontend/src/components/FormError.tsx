import { AlertCircle } from 'lucide-react';
import i18n from '@/lib/i18n';
import { ApiRequestError } from '@/types/api';

interface FormErrorProps {
  /** Direkter Error-String oder ApiRequestError (mit messageKey-Übersetzung) */
  error: unknown;
  /** Fallback-i18n-Key falls error keine messageKey hat */
  fallbackKey?: string;
}

// messageKey-Format ist "namespace.key" (Backend ADR-16). i18next nutzt das Colon-Format
// für Cross-Namespace-Resolution. Wir konvertieren den Punkt zum Colon einmalig.
function resolveMessageKey(key: string, vars?: Record<string, unknown>): string {
  const dotIdx = key.indexOf('.');
  if (dotIdx === -1) return i18n.t(key, vars);
  const ns = key.slice(0, dotIdx);
  const rest = key.slice(dotIdx + 1);
  return i18n.t(`${ns}:${rest}`, vars);
}

export function FormError({ error, fallbackKey = 'errors.unknown' }: FormErrorProps) {
  if (!error) return null;

  let message: string;
  if (error instanceof ApiRequestError) {
    message = error.messageKey ? resolveMessageKey(error.messageKey, error.vars) : error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = resolveMessageKey(fallbackKey);
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-sm bg-surface-sunken px-3 py-2 text-label text-status-conflict"
    >
      <AlertCircle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
