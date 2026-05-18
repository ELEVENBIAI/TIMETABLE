import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { Lock, UserPlus } from 'lucide-react';
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
  /** Callback bei "Vertretung finden"-Klick (ELE-203). Wenn gesetzt + status=REASSIGNMENT_NEEDED → Button sichtbar. */
  onReassignClick?: (entryId: string) => void;
}

// Status → Card-Modifier-Class. Drei Sonder-Layer werden im Render zusätzlich
// angewendet (rot/grün/gelb) — siehe Render-Logik unten.
const STATUS_CLASSES: Record<ScheduleEntry['status'], string> = {
  PLANNED: '',
  IN_PROGRESS: 'ring-2 ring-status-progress',
  COMPLETED: 'opacity-60 line-through decoration-text-muted',
  SKIPPED: 'opacity-40',
  REASSIGNED: 'opacity-50',
  REASSIGNMENT_NEEDED: '',
};
// !-Präfix erzwingt override — base className enthält bg-surface-raised,
// das alphabetisch (bg-status-* < bg-surface-*) sonst gewinnen würde.
// Pastell-Look: Hintergrund /25, Ring /60 — gut sichtbar, aber nicht knallig.
const REASSIGN_NEEDED_CLASS =
  '!bg-status-needs-reassign/25 ring-2 ring-inset ring-status-needs-reassign/60';
const REASSIGN_SOLVED_CLASS = '!bg-status-completed/25 ring-2 ring-inset ring-status-completed/60';
const REASSIGN_MOVED_CLASS = '!bg-status-moved/25 ring-2 ring-inset ring-status-moved/60';

export function ScheduleEntryCard({
  entry,
  property,
  serviceType,
  originalEmployee,
  pxPerMinute,
  topPx,
  disabled = false,
  presentational = false,
  onReassignClick,
}: Props) {
  const { i18n, t } = useTranslation('schedule');
  const { t: tR } = useTranslation('reassignment');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
  const showReassign =
    !presentational && entry.status === 'REASSIGNMENT_NEEDED' && !!onReassignClick;

  const draggable = useDraggable({
    id: entry.id,
    data: { entry },
    disabled: disabled || presentational,
  });

  const stripeColor = serviceType?.color_code ?? 'var(--color-status-planned)';
  const propertyName = property?.name ?? `Property ${entry.property_id.slice(0, 6)}`;
  const serviceFullName = serviceType?.name ?? serviceType?.short_name ?? '—';
  const serviceName = serviceType?.short_name ?? '—';
  const startLabel = formatTime(entry.start_time);
  const durationLabel = formatDurationLabel(entry.duration_min, locale);

  // Native HTML-Tooltip — Hover zeigt vollständige Card-Info (Cards sind im
  // Outlook-Layout schmal, nur per Hover voll lesbar).
  const tooltipParts: string[] = [];
  if (property) {
    const addr = [property.street, property.house_number, property.zip_code, property.city]
      .filter(Boolean)
      .join(' ');
    tooltipParts.push(`${property.name}${addr ? ` — ${addr}` : ''}`);
  }
  tooltipParts.push(`${serviceFullName} (${durationLabel})`);
  if (entry.start_time) tooltipParts.push(`${startLabel} Uhr`);
  if (entry.status === 'REASSIGNMENT_NEEDED') {
    tooltipParts.push(`⚠ ${tR('tooltip.needsReassign')}`);
  }
  if (entry.is_from_reassignment && entry.status === 'PLANNED') {
    if (entry.reassignment_reason != null) {
      tooltipParts.push(`✓ ${tR('tooltip.reassignSolved')}`);
    } else {
      tooltipParts.push(`↪ ${tR('tooltip.manuallyMoved')}`);
    }
  }
  if (entry.is_from_reassignment && originalEmployee) {
    tooltipParts.push(
      `Vertretung für ${originalEmployee.first_name} ${originalEmployee.last_name}`
    );
  }
  if (entry.notes) tooltipParts.push(entry.notes);
  const tooltip = tooltipParts.join('\n');

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

  const isReassignNeeded = entry.status === 'REASSIGNMENT_NEEDED';
  // Vertretung wegen Absence (Backend setzt reassignment_reason nur bei Absence-Move)
  const reassignSolved =
    entry.is_from_reassignment && entry.status === 'PLANNED' && entry.reassignment_reason != null;
  // Manueller Move (Drag&Drop ohne Krankmeldung): is_from_reassignment=TRUE, aber kein Grund
  const reassignManual =
    entry.is_from_reassignment && entry.status === 'PLANNED' && entry.reassignment_reason == null;
  const variantClass = isReassignNeeded
    ? REASSIGN_NEEDED_CLASS
    : reassignSolved
      ? REASSIGN_SOLVED_CLASS
      : reassignManual
        ? REASSIGN_MOVED_CLASS
        : STATUS_CLASSES[entry.status];

  return (
    <article
      ref={presentational ? undefined : draggable.setNodeRef}
      {...(presentational ? {} : draggable.attributes)}
      {...(presentational ? {} : draggable.listeners)}
      className={[
        'group relative flex flex-col gap-0.5 overflow-hidden rounded-md border border-border bg-surface-raised pl-2 pr-2 py-1.5 text-label transition-colors hover:border-brand-primary',
        cursorClass,
        variantClass,
        presentational ? 'shadow-lg rotate-1 ring-2 ring-brand-primary' : '',
      ].join(' ')}
      style={stylePos}
      data-entry-id={entry.id}
      data-day={entry.day_of_week}
      data-status={entry.status}
      data-draggable={!disabled && !presentational}
      title={presentational ? undefined : tooltip}
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
        {showReassign ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onReassignClick?.(entry.id);
            }}
            className="mt-0.5 shrink-0 rounded p-0.5 text-status-needs-reassign hover:bg-status-needs-reassign/20"
            aria-label={tR('trigger.button')}
            data-testid="reassign-trigger-icon"
          >
            <UserPlus size={14} aria-hidden="true" />
          </button>
        ) : null}
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
        <div
          className={[
            'mt-0.5 inline-flex w-fit items-center rounded px-1.5 py-0.5 text-label',
            reassignSolved
              ? 'bg-status-completed/15 text-status-completed'
              : reassignManual
                ? 'bg-status-moved/15 text-status-moved'
                : 'bg-status-needs-reassign/10 text-status-needs-reassign',
          ].join(' ')}
        >
          {t('entry.reassignedFrom', {
            name: originalEmployee
              ? `${originalEmployee.first_name} ${originalEmployee.last_name}`
              : '?',
          })}
        </div>
      )}
      {showReassign ? (
        <button
          type="button"
          onPointerDown={(e) => {
            // Verhindert DnD-Start beim Klick auf den Button
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onReassignClick?.(entry.id);
          }}
          className="mt-1 inline-flex items-center gap-1 self-start rounded bg-status-needs-reassign/15 px-2 py-0.5 text-label font-medium text-status-needs-reassign hover:bg-status-needs-reassign/25"
          data-testid="reassign-trigger"
        >
          <UserPlus size={12} aria-hidden="true" />
          {tR('trigger.button')}
        </button>
      ) : null}
    </article>
  );
}
