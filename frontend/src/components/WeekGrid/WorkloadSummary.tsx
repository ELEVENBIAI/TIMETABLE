import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UserMinus } from 'lucide-react';
import { WorkloadBar } from '@/components/WorkloadBar';
import type { Employee, ScheduleEntry } from '@/types/schedule';

interface Props {
  entries: ScheduleEntry[];
  employees: Employee[];
  /** Callback bei "Krankmelden"-Klick auf einer Mitarbeiter-Zeile (ELE-204). */
  onReportAbsence?: (employeeId: string) => void;
}

export function WorkloadSummary({ entries, employees, onReportAbsence }: Props) {
  const { t } = useTranslation('schedule');
  const { t: tA } = useTranslation('absences');

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.status === 'SKIPPED' || e.status === 'REASSIGNED') continue;
      map.set(e.employee_id, (map.get(e.employee_id) ?? 0) + e.duration_min);
    }
    return employees
      .filter((e) => e.is_active)
      .map((emp) => ({
        emp,
        plannedMinutes: map.get(emp.id) ?? 0,
        weeklyHours: emp.weekly_hours ? Number(emp.weekly_hours) : null,
      }));
  }, [entries, employees]);

  return (
    <section
      className="rounded-md border border-border bg-surface-raised p-4"
      aria-label={t('workload.section')}
    >
      <h2 className="mb-3 text-title font-semibold">{t('workload.section')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(({ emp, plannedMinutes, weeklyHours }) => (
          <div key={emp.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-label font-medium text-text-primary">
                {emp.first_name} {emp.last_name}
              </div>
              {onReportAbsence ? (
                <button
                  type="button"
                  onClick={() => onReportAbsence(emp.id)}
                  aria-label={tA('trigger.context')}
                  title={tA('trigger.context')}
                  className="rounded p-1 text-text-muted hover:bg-status-conflict/10 hover:text-status-conflict"
                  data-testid={`report-absence-context-${emp.id}`}
                >
                  <UserMinus size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <WorkloadBar plannedMinutes={plannedMinutes} weeklyHours={weeklyHours} />
          </div>
        ))}
      </div>
    </section>
  );
}
