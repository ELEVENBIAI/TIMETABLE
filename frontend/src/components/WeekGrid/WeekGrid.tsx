// Outlook-Kalender-Style Wochenplan-Grid (ELE-180).
//
// Layout-Hierarchie:
//   ┌─ TimeAxis (sticky links) ─┬─ Day-Columns ─┐
//   │   07:00                   │  Mo  Di  Mi  Do  Fr
//   │   08:00                   │  [Entry-Cards absolut positioniert]
//   │   ...                     │
//   └───────────────────────────┴────────────────┘
//
// Default-View "team": innerhalb jeder Tag-Spalte wird pro Mitarbeiter eine
// Sub-Spalte gerendert. Andere Views (employee/day/property) reduzieren auf
// 1 Tag oder 1 Mitarbeiter oder filtern auf 1 Property.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { indexById } from '@/api/schedule';
import { minutesFromGridStart, toISODate } from '@/lib/date';
import { isLocale } from '@/lib/i18n';
import { ScheduleEntryCard } from './ScheduleEntryCard';
import { HourGridBackground, TimeAxis } from './TimeAxis';
import {
  GRID_HEIGHT_PX,
  PX_PER_MINUTE,
  WORKING_DAYS,
  type FilterState,
  type GridContext,
  type ViewMode,
} from './WeekGrid.types';

interface Props {
  context: GridContext;
  mode: ViewMode;
  filter: FilterState;
  /** Wenn true: DnD-Targets werden nicht aktiviert (PUBLISHED-Schedule). */
  dndDisabled?: boolean;
  /** Callback bei "Vertretung finden"-Klick auf einer Card (ELE-203). */
  onReassignClick?: (entryId: string) => void;
}

interface BucketProps {
  day: number;
  employeeId: string;
  entryDate: string;
  multiColumn: boolean;
  disabled: boolean;
  children: React.ReactNode;
}

function DroppableBucket({
  day,
  employeeId,
  entryDate,
  multiColumn,
  disabled,
  children,
}: BucketProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${day}-${employeeId}`,
    data: { day, employeeId, entryDate },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={[
        'relative flex-1 transition-colors',
        multiColumn ? 'border-r border-border/30 last:border-r-0' : '',
        isOver ? 'bg-brand-primary/10 ring-1 ring-brand-primary/30 ring-inset' : '',
      ].join(' ')}
      data-day={day}
      data-employee={employeeId}
      data-droppable={!disabled}
    >
      {children}
    </div>
  );
}

const LOCALES = { en: enUS, de };

export function WeekGrid({ context, mode, filter, dndDisabled = false, onReassignClick }: Props) {
  const { i18n } = useTranslation('schedule');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
  const loc = LOCALES[locale];

  const propertyMap = useMemo(() => indexById(context.properties), [context.properties]);
  const serviceTypeMap = useMemo(() => indexById(context.serviceTypes), [context.serviceTypes]);
  const employeeMap = useMemo(() => indexById(context.employees), [context.employees]);

  // ─── Filter entries je nach Mode ──────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let entries = context.entries;
    if (mode === 'property' && filter.selectedPropertyId) {
      entries = entries.filter((e) => e.property_id === filter.selectedPropertyId);
    }
    if (mode === 'employee' && filter.selectedEmployeeId) {
      entries = entries.filter((e) => e.employee_id === filter.selectedEmployeeId);
    }
    if (mode === 'day' && filter.selectedDay) {
      entries = entries.filter((e) => e.day_of_week === filter.selectedDay);
    }
    return entries;
  }, [context.entries, mode, filter]);

  // ─── Spalten-Konfiguration ────────────────────────────────────────────
  // team:     Tage × Mitarbeiter (5 × N)
  // employee: 1 Mitarbeiter × Tage (5 Spalten)
  // day:      1 Tag × Mitarbeiter (N Spalten)
  // property: Tage × Mitarbeiter, gefiltert
  const dayColumns = useMemo(() => {
    if (mode === 'day' && filter.selectedDay) {
      return [filter.selectedDay];
    }
    return [...WORKING_DAYS];
  }, [mode, filter]);

  const employeeColumns = useMemo(() => {
    if (mode === 'employee' && filter.selectedEmployeeId) {
      return context.employees.filter((e) => e.id === filter.selectedEmployeeId);
    }
    return context.employees.filter((e) => e.is_active);
  }, [mode, filter, context.employees]);

  // ─── Entries pro Tag × Mitarbeiter Bucket ─────────────────────────────
  type Bucket = string; // `${day}-${employeeId}`
  const bucketKey = (day: number, empId: string): Bucket => `${day}-${empId}`;

  const entriesByBucket = useMemo(() => {
    const map = new Map<Bucket, typeof filteredEntries>();
    for (const e of filteredEntries) {
      const key = bucketKey(e.day_of_week, e.employee_id);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [filteredEntries]);

  // ─── Mehrere Mitarbeiter pro Tag → Sub-Spalten ────────────────────────
  // In team/property/day-Mode mit mehreren Mitarbeitern: pro Tag eine Spalte
  // pro Mitarbeiter. In employee-Mode: pro Tag 1 Spalte.
  const employeesPerDay = mode === 'employee' ? 1 : employeeColumns.length;

  return (
    <div className="overflow-x-auto">
      <div
        className="flex"
        style={{ minHeight: GRID_HEIGHT_PX + 80 }} // +80 für Header-Zeile
      >
        {/* Y-Achse links */}
        <div className="sticky left-0 z-10 flex flex-col bg-surface">
          <div className="h-20 border-b border-border" />
          <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
            <TimeAxis />
          </div>
        </div>

        {/* Tages-Spalten */}
        {dayColumns.map((day, dayIdx) => {
          const dayDate = addDays(context.weekStart, day - 1);
          const isLast = dayIdx === dayColumns.length - 1;
          return (
            <div
              key={day}
              className={`flex flex-col ${isLast ? '' : 'border-r border-border'}`}
              style={{ minWidth: 140 * employeesPerDay }}
            >
              {/* Header: Wochentag */}
              <div className="flex h-20 flex-col items-center justify-center border-b border-border px-2 text-center">
                <div className="text-label text-text-muted">
                  {format(dayDate, 'EEE', { locale: loc })}
                </div>
                <div className="text-headline font-semibold tabular-nums">
                  {format(dayDate, 'd. MMM', { locale: loc })}
                </div>
                {/* Sub-Headers: Mitarbeiter-Namen wenn employeesPerDay > 1 */}
                {employeesPerDay > 1 && (
                  <div className="mt-1 flex w-full gap-1 text-label text-text-muted">
                    {employeeColumns.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex-1 truncate"
                        title={`${emp.first_name} ${emp.last_name}`}
                      >
                        {emp.first_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kalender-Tagesspalte */}
              <div className="relative flex" style={{ height: GRID_HEIGHT_PX }}>
                <HourGridBackground />
                {employeeColumns.map((emp) => {
                  const entries = entriesByBucket.get(bucketKey(day, emp.id)) ?? [];
                  return (
                    <DroppableBucket
                      key={emp.id}
                      day={day}
                      employeeId={emp.id}
                      entryDate={toISODate(dayDate)}
                      multiColumn={employeesPerDay > 1}
                      disabled={dndDisabled}
                    >
                      {entries.map((entry) => (
                        <ScheduleEntryCard
                          key={entry.id}
                          entry={entry}
                          property={propertyMap.get(entry.property_id)}
                          serviceType={serviceTypeMap.get(entry.service_type_id)}
                          originalEmployee={
                            entry.original_employee_id
                              ? employeeMap.get(entry.original_employee_id)
                              : undefined
                          }
                          pxPerMinute={PX_PER_MINUTE}
                          topPx={minutesFromGridStart(entry.start_time)}
                          disabled={dndDisabled}
                          onReassignClick={onReassignClick}
                        />
                      ))}
                    </DroppableBucket>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
