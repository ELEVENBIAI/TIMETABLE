import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import { addDays } from 'date-fns';
import { Button } from '@/components/Button';
import { FormError } from '@/components/FormError';
import { ScheduleStatusBadge } from '@/components/ScheduleStatusBadge';
import { PublishScheduleButton } from '@/components/PublishScheduleButton';
import { WeekNavigator } from '@/components/WeekNavigator';
import { WeekGrid } from '@/components/WeekGrid/WeekGrid';
import { ViewModeSwitcher } from '@/components/WeekGrid/ViewModeSwitcher';
import { WorkloadSummary } from '@/components/WeekGrid/WorkloadSummary';
import type { FilterState, ViewMode } from '@/components/WeekGrid/WeekGrid.types';
import {
  useEmployees,
  useGenerateSchedule,
  useProperties,
  useSchedules,
  useScheduleEntries,
  useServiceTypes,
} from '@/api/schedule';
import { getCurrentWeekStart, getWeekMeta, parseISODate, toISODate } from '@/lib/date';

export function SchedulePage() {
  const { t } = useTranslation('schedule');
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<ViewMode>('team');
  const [filter, setFilter] = useState<FilterState>({});
  const [generateError, setGenerateError] = useState<unknown>(null);

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

  function setWeek(next: Date) {
    setSearchParams({ week: toISODate(next) });
  }

  // ─── Data fetching ────────────────────────────────────────────────────
  const schedulesQuery = useSchedules(weekStartISO);
  const schedule = schedulesQuery.data?.[0];

  const entriesQuery = useScheduleEntries(schedule?.id);
  const employeesQuery = useEmployees();
  const propertiesQuery = useProperties();
  const serviceTypesQuery = useServiceTypes();

  const generate = useGenerateSchedule();

  const isLoading =
    schedulesQuery.isLoading ||
    employeesQuery.isLoading ||
    propertiesQuery.isLoading ||
    serviceTypesQuery.isLoading;

  async function handleGenerate() {
    setGenerateError(null);
    // MVP: erstes Default-Template aus DB nehmen. Im Pilot ist das immer
    // "Standardwoche Gepard" mit fix UUID. Später eigene Template-Wahl-UI.
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
            {schedule && <PublishScheduleButton schedule={schedule} />}
          </div>
        </div>
      </header>

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
        <>
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
          />
          <WorkloadSummary
            entries={entriesQuery.data ?? []}
            employees={employeesQuery.data ?? []}
          />
        </>
      )}
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
