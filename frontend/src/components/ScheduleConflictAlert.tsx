// Inline-Banner für 409 TIME_CONFLICT beim Drag&Drop-Move (ELE-181).
// Auto-Dismiss nach 5s, manuell schließbar.

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';

export interface ConflictInfo {
  employeeLabel: string;
  dayLabel: string;
}

interface Props {
  conflict: ConflictInfo | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

export function ScheduleConflictAlert({ conflict, onDismiss }: Props) {
  const { t } = useTranslation('schedule');

  useEffect(() => {
    if (!conflict) return;
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [conflict, onDismiss]);

  if (!conflict) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-status-conflict/40 bg-status-conflict/5 px-4 py-3"
    >
      <AlertTriangle
        size={18}
        className="mt-0.5 shrink-0 text-status-conflict"
        aria-hidden="true"
      />
      <div className="flex-1">
        <div className="text-title font-semibold text-status-conflict">
          {t('dnd.conflict.title')}
        </div>
        <div className="text-body text-text-secondary">
          {t('dnd.conflict.body', {
            employee: conflict.employeeLabel,
            day: conflict.dayLabel,
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 text-text-muted hover:bg-surface-sunken hover:text-text-primary"
        aria-label={t('dnd.conflict.dismiss')}
      >
        <X size={16} />
      </button>
    </div>
  );
}
