import { useTranslation } from 'react-i18next';

interface Props {
  /** Geplante Minuten in dieser KW */
  plannedMinutes: number;
  /** Wochenstunden des Mitarbeiters */
  weeklyHours: number | null;
}

export function WorkloadBar({ plannedMinutes, weeklyHours }: Props) {
  const { t } = useTranslation('schedule');
  const plannedHours = Math.round((plannedMinutes / 60) * 10) / 10;

  if (!weeklyHours || weeklyHours <= 0) {
    return (
      <div className="flex items-center gap-2 text-label text-text-muted">
        <span className="numeric tabular-nums">{plannedHours}h</span>
      </div>
    );
  }

  const ratio = plannedMinutes / (weeklyHours * 60);
  const pct = Math.min(100, Math.round(ratio * 100));

  // Color-Coded: <80% under-utilized (muted), 80-100% normal, >100% overload (warning)
  let barClass = 'bg-status-progress';
  let labelClass = 'text-text-secondary';
  if (ratio > 1) {
    barClass = 'bg-status-needs-reassign';
    labelClass = 'text-status-needs-reassign';
  } else if (ratio < 0.8) {
    barClass = 'bg-text-muted';
    labelClass = 'text-text-muted';
  }

  return (
    <div className="flex flex-col gap-1" aria-label={t('workload.label')}>
      <div className={`text-label numeric tabular-nums ${labelClass}`}>
        {plannedHours}h / {weeklyHours}h{ratio > 1 && <span className="ml-1">⚠</span>}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
