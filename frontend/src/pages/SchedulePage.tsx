import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Lock, UserMinus } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { ScheduleStatusBadge } from '@/components/ScheduleStatusBadge';
import { PublishScheduleButton } from '@/components/PublishScheduleButton';
import { WeekNavigator } from '@/components/WeekNavigator';
import { WeekGrid } from '@/components/WeekGrid/WeekGrid';
import { ScheduleEntryCard } from '@/components/WeekGrid/ScheduleEntryCard';
import { ViewModeSwitcher } from '@/components/WeekGrid/ViewModeSwitcher';
import { WorkloadSummary } from '@/components/WeekGrid/WorkloadSummary';
import { ScheduleConflictAlert, type ConflictInfo } from '@/components/ScheduleConflictAlert';
import { ReassignmentPickerModal } from '@/components/ReassignmentPickerModal';
import { ReportAbsenceModal } from '@/components/ReportAbsenceModal';
import { useAuth } from '@/lib/auth';
import type { FilterState, ViewMode } from '@/components/WeekGrid/WeekGrid.types';
import {
  indexById,
  useEmployees,
  useGenerateSchedule,
  useMoveScheduleEntry,
  useProperties,
  useSchedules,
  useScheduleEntries,
  useServiceTypes,
} from '@/api/schedule';
import { getCurrentWeekStart, getWeekMeta, parseISODate, toISODate } from '@/lib/date';
import { isLocale } from '@/lib/i18n';
import { ApiRequestError } from '@/types/api';
import type { Employee, ScheduleEntry } from '@/types/schedule';

const LOCALES = { en: enUS, de };

interface DragData {
  entry: ScheduleEntry;
}

interface DropData {
  day: number;
  employeeId: string;
  entryDate: string;
}

export function SchedulePage() {
  const { t, i18n } = useTranslation('schedule');
  const { t: tA } = useTranslation('absences');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
  const dfnsLocale = LOCALES[locale];
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<ViewMode>('team');
  const [filter, setFilter] = useState<FilterState>({});
  const [generateError, setGenerateError] = useState<unknown>(null);
  const [activeEntry, setActiveEntry] = useState<ScheduleEntry | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [moveError, setMoveError] = useState<unknown>(null);
  const [reassignEntryId, setReassignEntryId] = useState<string | null>(null);
  // Absence-Modal (ELE-204): null = zu. Wenn defaultEmployeeId gesetzt → preselected.
  const [absenceModalState, setAbsenceModalState] = useState<null | { defaultEmployeeId?: string }>(
    null
  );

  const { payload } = useAuth();
  const canReassign =
    payload?.role === 'ADMIN' ||
    payload?.role === 'PLANNER' ||
    payload?.role === 'FOREMAN' ||
    payload?.isSuperAdmin === true;

  // Wochenstart aus URL ?week=YYYY-MM-DD oder aktuelle KW
  const weekStartDate = useMemo(() => {
    const w = searchParams.get('week');
    if (w) {
      try {
        return parseISODate(w);
      } catch {
        return getCurrentWeekStart();
      }
    }
    return getCurrentWeekStart();
  }, [searchParams]);

  const weekStartISO = toISODate(weekStartDate);
  const meta = getWeekMeta(weekStartDate);

  // Smart-Default für Krankmelden-Modal: heute wenn in angezeigter Woche, sonst Montag der Woche
  const absenceDefaultStart = useMemo(() => {
    const todayISO = toISODate(new Date());
    const weekEndISO = toISODate(addDays(weekStartDate, 6));
    return todayISO >= weekStartISO && todayISO <= weekEndISO ? todayISO : weekStartISO;
  }, [weekStartDate, weekStartISO]);

  function setWeek(next: Date) {
    setSearchParams({ week: toISODate(next) });
  }

  const schedulesQuery = useSchedules(weekStartISO);
  const schedule = schedulesQuery.data?.[0];
  const isPublished = schedule?.status === 'PUBLISHED';
  const isArchived = schedule?.status === 'ARCHIVED';
  const dndDisabled = !schedule || isPublished || isArchived;

  const entriesQuery = useScheduleEntries(schedule?.id);
  const employeesQuery = useEmployees();
  const propertiesQuery = useProperties();
  const serviceTypesQuery = useServiceTypes();

  const employeeMap = useMemo(() => indexById(employeesQuery.data), [employeesQuery.data]);
  const propertyMap = useMemo(() => indexById(propertiesQuery.data), [propertiesQuery.data]);
  const serviceTypeMap = useMemo(() => indexById(serviceTypesQuery.data), [serviceTypesQuery.data]);

  const generate = useGenerateSchedule();
  const move = useMoveScheduleEntry();

  const isLoading =
    schedulesQuery.isLoading ||
    employeesQuery.isLoading ||
    propertiesQuery.isLoading ||
    serviceTypesQuery.isLoading;

  async function handleGenerate() {
    setGenerateError(null);
    const PILOT_TEMPLATE_ID = '20202020-3000-1111-1111-111111111111';
    try {
      await generate.mutateAsync({
        templateId: PILOT_TEMPLATE_ID,
        weekStart: weekStartISO,
        weekNumber: meta.weekNumber,
        year: meta.year,
      });
    } catch (err) {
      setGenerateError(err);
    }
  }

  // ─── DnD-Sensoren (Pointer + Keyboard für A11y) ────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const employeeLabel = useCallback((emp: Employee | undefined): string => {
    if (!emp) return '?';
    return `${emp.first_name} ${emp.last_name}`.trim();
  }, []);

  const dayLabelForDate = useCallback(
    (iso: string): string => {
      try {
        return format(parseISODate(iso), 'EEEE d. MMMM', { locale: dfnsLocale });
      } catch {
        return iso;
      }
    },
    [dfnsLocale]
  );

  // ─── Drag-Handlers ────────────────────────────────────────────────────
  function handleDragStart(ev: DragStartEvent) {
    const data = ev.active.data.current as DragData | undefined;
    if (data?.entry) {
      setActiveEntry(data.entry);
      setMoveError(null);
    }
  }

  async function handleDragEnd(ev: DragEndEvent) {
    const dragData = ev.active.data.current as DragData | undefined;
    const dropData = ev.over?.data.current as DropData | undefined;
    setActiveEntry(null);

    if (!dragData?.entry || !dropData || !schedule) return;
    const entry = dragData.entry;

    // No-op falls auf gleiche Position fallen gelassen
    if (entry.employee_id === dropData.employeeId && entry.entry_date === dropData.entryDate) {
      return;
    }

    try {
      await move.mutateAsync({
        id: entry.id,
        scheduleId: schedule.id,
        employeeId: dropData.employeeId,
        entryDate: dropData.entryDate,
        dayOfWeek: dropData.day,
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setConflict({
          employeeLabel: employeeLabel(employeeMap.get(dropData.employeeId)),
          dayLabel: dayLabelForDate(dropData.entryDate),
        });
      } else {
        setMoveError(err);
      }
    }
  }

  function handleDragCancel() {
    setActiveEntry(null);
  }

  // ─── ARIA-Live Announcements (Keyboard-A11y) ──────────────────────────
  const announcements: Announcements = useMemo(() => {
    function describeOver(overId: string | number | undefined) {
      if (typeof overId !== 'string') return null;
      const [dayStr, empId] = overId.split('-', 2);
      if (!empId) return null;
      const day = Number(dayStr);
      const emp = employeeMap.get(empId);
      const date = addDays(weekStartDate, day - 1);
      return {
        employee: employeeLabel(emp),
        day: format(date, 'EEEE', { locale: dfnsLocale }),
      };
    }
    return {
      onDragStart: () => t('dnd.announce.pickup'),
      onDragOver: ({ over }) => {
        const info = describeOver(over?.id);
        return info ? t('dnd.announce.over', info) : undefined;
      },
      onDragEnd: ({ over }) => {
        const info = describeOver(over?.id);
        return info ? t('dnd.announce.drop', info) : t('dnd.announce.cancel');
      },
      onDragCancel: () => t('dnd.announce.cancel'),
    };
  }, [t, employeeMap, employeeLabel, weekStartDate, dfnsLocale]);

  return (
    <section className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <header className="flex flex-col gap-3">
        <WeekNavigator weekStart={weekStartDate} onChange={setWeek} />
        <div className="flex flex-wrap items-center gap-3">
          {schedule && <ScheduleStatusBadge status={schedule.status} />}
          <ViewModeSwitcher value={mode} onChange={setMode} />
          {mode === 'employee' && (
            <select
              value={filter.selectedEmployeeId ?? ''}
              onChange={(e) =>
                setFilter({ ...filter, selectedEmployeeId: e.target.value || undefined })
              }
              className="rounded-sm border border-border bg-surface px-2 py-1 text-label"
              aria-label={t('filter.employee')}
            >
              <option value="">{t('filter.selectEmployee')}</option>
              {employeesQuery.data
                ?.filter((e) => e.is_active)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
            </select>
          )}
          {mode === 'day' && (
            <select
              value={filter.selectedDay ?? 1}
              onChange={(e) => setFilter({ ...filter, selectedDay: Number(e.target.value) })}
              className="rounded-sm border border-border bg-surface px-2 py-1 text-label"
              aria-label={t('filter.day')}
            >
              {[1, 2, 3, 4, 5].map((d) => {
                const dayDate = addDays(weekStartDate, d - 1);
                return (
                  <option key={d} value={d}>
                    {toISODate(dayDate)}
                  </option>
                );
              })}
            </select>
          )}
          {mode === 'property' && (
            <select
              value={filter.selectedPropertyId ?? ''}
              onChange={(e) =>
                setFilter({ ...filter, selectedPropertyId: e.target.value || undefined })
              }
              className="rounded-sm border border-border bg-surface px-2 py-1 text-label"
              aria-label={t('filter.property')}
            >
              <option value="">{t('filter.selectProperty')}</option>
              {propertiesQuery.data
                ?.filter((p) => p.is_active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          )}
          <div className="ml-auto flex items-center gap-2">
            {canReassign ? (
              <button
                type="button"
                onClick={() => setAbsenceModalState({})}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-label hover:border-status-conflict hover:text-status-conflict"
                data-testid="report-absence-global"
              >
                <UserMinus size={14} aria-hidden="true" />
                {tA('trigger.global')}
              </button>
            ) : null}
            {schedule && <PublishScheduleButton schedule={schedule} />}
          </div>
        </div>
        {isPublished && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2 text-label text-text-secondary"
            data-testid="schedule-locked-banner"
          >
            <Lock size={14} className="text-text-muted" aria-hidden="true" />
            {t('dnd.lockedHint')}
          </div>
        )}
      </header>

      <ScheduleConflictAlert conflict={conflict} onDismiss={() => setConflict(null)} />
      {moveError ? <FormError error={moveError} fallbackKey="schedule:dnd.error.generic" /> : null}

      {isLoading ? (
        <div className="flex items-center gap-2 p-8 text-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          {t('loading')}
        </div>
      ) : !schedule ? (
        <EmptyState
          onGenerate={handleGenerate}
          loading={generate.isPending}
          error={generateError}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToWindowEdges]}
          accessibility={{ announcements }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <WeekGrid
            context={{
              entries: entriesQuery.data ?? [],
              employees: employeesQuery.data ?? [],
              properties: propertiesQuery.data ?? [],
              serviceTypes: serviceTypesQuery.data ?? [],
              weekStart: weekStartDate,
            }}
            mode={mode}
            filter={filter}
            dndDisabled={dndDisabled}
            onReassignClick={canReassign ? setReassignEntryId : undefined}
          />
          <DragOverlay dropAnimation={null}>
            {activeEntry ? (
              <ScheduleEntryCard
                entry={activeEntry}
                property={propertyMap.get(activeEntry.property_id)}
                serviceType={serviceTypeMap.get(activeEntry.service_type_id)}
                originalEmployee={
                  activeEntry.original_employee_id
                    ? employeeMap.get(activeEntry.original_employee_id)
                    : undefined
                }
                presentational
              />
            ) : null}
          </DragOverlay>
          <WorkloadSummary
            entries={entriesQuery.data ?? []}
            employees={employeesQuery.data ?? []}
            onReportAbsence={
              canReassign
                ? (employeeId) => setAbsenceModalState({ defaultEmployeeId: employeeId })
                : undefined
            }
          />
        </DndContext>
      )}

      {/* Reassignment-Picker Modal (ELE-203) */}
      {reassignEntryId && schedule
        ? (() => {
            const entry = (entriesQuery.data ?? []).find((e) => e.id === reassignEntryId);
            if (!entry) return null;
            const prop = propertyMap.get(entry.property_id);
            return (
              <ReassignmentPickerModal
                entryId={entry.id}
                scheduleId={schedule.id}
                propertyName={prop?.name ?? '—'}
                entryDate={entry.entry_date}
                startTime={entry.start_time}
                onClose={() => setReassignEntryId(null)}
              />
            );
          })()
        : null}

      {/* Report-Absence Modal (ELE-204) */}
      <ReportAbsenceModal
        isOpen={absenceModalState !== null}
        onClose={() => setAbsenceModalState(null)}
        defaultEmployeeId={absenceModalState?.defaultEmployeeId}
        defaultStartDate={absenceDefaultStart}
        employees={employeesQuery.data ?? []}
        scheduleId={schedule?.id ?? null}
      />
    </section>
  );
}

interface EmptyStateProps {
  onGenerate: () => void;
  loading: boolean;
  error: unknown;
}

function EmptyState({ onGenerate, loading, error }: EmptyStateProps) {
  const { t } = useTranslation('schedule');
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-border bg-surface-sunken px-6 py-16 text-center">
      <Sparkles size={32} className="text-text-muted" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 className="text-headline font-semibold">{t('empty.title')}</h2>
        <p className="text-body text-text-secondary">{t('empty.subtitle')}</p>
      </div>
      <Button variant="primary" size="md" onClick={onGenerate} loading={loading}>
        {t('empty.generateButton')}
      </Button>
      {error ? (
        <div className="w-full max-w-md">
          <FormError error={error} />
        </div>
      ) : null}
    </div>
  );
}
