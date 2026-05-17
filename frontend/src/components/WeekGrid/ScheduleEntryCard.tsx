import { useTranslation } from 'react-i18next';
import { formatTime, formatDurationLabel } from '@/lib/date';
import type { Employee, Property, ScheduleEntry, ServiceType } from '@/types/schedule';
import { isLocale } from '@/lib/i18n';

interface Props {
  entry: ScheduleEntry;
  property?: Property;
  serviceType?: ServiceType;
  originalEmployee?: Employee;
  /** Px-Höhe = duration_min × pxPerMinute (Outlook-Kalender-Modus). Wenn unset → height: auto */
  pxPerMinute?: number;
  /** Px-Top-Offset für absolute Positionierung im Kalender */
  topPx?: number;
}

// Status → Card-Modifier-Class
const STATUS_CLASSES: Record<ScheduleEntry['status'], string> = {
  PLANNED: '',
  IN_PROGRESS: 'ring-2 ring-status-progress',
  COMPLETED: 'opacity-60 line-through decoration-text-muted',
  SKIPPED: 'opacity-40',
  REASSIGNED: 'opacity-50',
  REASSIGNMENT_NEEDED: 'bg-status-needs-reassign/10 ring-1 ring-status-needs-reassign/40',
};

export function ScheduleEntryCard({
  entry,
  property,
  serviceType,
  originalEmployee,
  pxPerMinute,
  topPx,
}: Props) {
  const { i18n, t } = useTranslation('schedule');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  const stripeColor = serviceType?.color_code ?? 'var(--color-status-planned)';
  const propertyName = property?.name ?? `Property ${entry.property_id.slice(0, 6)}`;
  const serviceName = serviceType?.short_name ?? '—';
  const startLabel = formatTime(entry.start_time);
  const durationLabel = formatDurationLabel(entry.duration_min, locale);

  const stylePos: React.CSSProperties = pxPerMinute
    ? {
        position: 'absolute',
        top: topPx,
        height: entry.duration_min * pxPerMinute,
        left: 2,
        right: 2,
      }
    : {};

  return (
    <article
      className={[
        'group relative flex flex-col gap-0.5 overflow-hidden rounded-md border border-border bg-surface-raised pl-2 pr-2 py-1.5 text-label transition-colors hover:border-brand-primary',
        STATUS_CLASSES[entry.status],
      ].join(' ')}
      style={stylePos}
      data-entry-id={entry.id}
      data-day={entry.day_of_week}
      data-status={entry.status}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="truncate text-title font-semibold text-text-primary">{propertyName}</div>
      <div className="truncate text-label text-text-secondary">{serviceName}</div>
      <div className="numeric tabular-nums text-label text-text-muted">
        {startLabel} · {durationLabel}
      </div>
      {entry.is_from_reassignment && (
        <div className="mt-0.5 inline-flex w-fit items-center rounded bg-status-needs-reassign/10 px-1.5 py-0.5 text-label text-status-needs-reassign">
          {t('entry.reassignedFrom', {
            name: originalEmployee
              ? `${originalEmployee.first_name} ${originalEmployee.last_name}`
              : '?',
          })}
        </div>
      )}
    </article>
  );
}
