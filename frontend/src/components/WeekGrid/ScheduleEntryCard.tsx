import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { Lock } from 'lucide-react';
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
  /** DnD deaktiviert (PUBLISHED-Schedule oder Drag-Overlay) */
  disabled?: boolean;
  /** Wenn true: rein visuelle Darstellung ohne useDraggable (z.B. DragOverlay) */
  presentational?: boolean;
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
  disabled = false,
  presentational = false,
}: Props) {
  const { i18n, t } = useTranslation('schedule');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  const draggable = useDraggable({
    id: entry.id,
    data: { entry },
    disabled: disabled || presentational,
  });

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

  // Drag-Source: leichte Opacity + Tilt (Source bleibt sichtbar; Overlay folgt dem Cursor)
  if (!presentational && draggable.isDragging) {
    stylePos.opacity = 0.4;
  }

  const cursorClass = presentational
    ? 'cursor-grabbing'
    : disabled
      ? 'cursor-not-allowed'
      : 'cursor-grab active:cursor-grabbing';

  return (
    <article
      ref={presentational ? undefined : draggable.setNodeRef}
      {...(presentational ? {} : draggable.attributes)}
      {...(presentational ? {} : draggable.listeners)}
      className={[
        'group relative flex flex-col gap-0.5 overflow-hidden rounded-md border border-border bg-surface-raised pl-2 pr-2 py-1.5 text-label transition-colors hover:border-brand-primary',
        cursorClass,
        STATUS_CLASSES[entry.status],
        presentational ? 'shadow-lg rotate-1 ring-2 ring-brand-primary' : '',
      ].join(' ')}
      style={stylePos}
      data-entry-id={entry.id}
      data-day={entry.day_of_week}
      data-status={entry.status}
      data-draggable={!disabled && !presentational}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 truncate text-title font-semibold text-text-primary">
          {propertyName}
        </div>
        {disabled && (
          <Lock
            size={12}
            className="mt-0.5 shrink-0 text-text-muted"
            aria-label={t('dnd.locked')}
          />
        )}
      </div>
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
