// Krankmeldung/Abwesenheit melden — Modal (ELE-204).
// Backend markiert betroffene Schedule-Entries automatisch als REASSIGNMENT_NEEDED.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { ABSENCE_TYPES, useReportAbsence, type AbsenceType } from '@/api/absences';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/Button';
import { toISODate } from '@/lib/date';
import type { Employee } from '@/types/schedule';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: Mitarbeiter vorausgewählt (Kontext-Trigger aus WorkloadSummary). */
  defaultEmployeeId?: string;
  /** Optional: Start-Datum-Default (z.B. Montag der angezeigten Woche). Fallback heute. */
  defaultStartDate?: string;
  employees: Employee[];
  scheduleId: string | null;
}

export function ReportAbsenceModal({
  isOpen,
  onClose,
  defaultEmployeeId,
  defaultStartDate,
  employees,
  scheduleId,
}: Props) {
  const { t } = useTranslation('absences');
  const initialStart = defaultStartDate ?? toISODate(new Date());

  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId ?? '');
  const [absenceType, setAbsenceType] = useState<AbsenceType>('SICK');
  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialStart);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<unknown>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const mutation = useReportAbsence(scheduleId);

  // Reset bei jedem Open
  useEffect(() => {
    if (!isOpen) return;
    setEmployeeId(defaultEmployeeId ?? '');
    setAbsenceType('SICK');
    setStartDate(initialStart);
    setEndDate(initialStart);
    setNotes('');
    setError(null);
    setSuccessCount(null);
  }, [isOpen, defaultEmployeeId, initialStart]);

  // ESC schließt
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function isValid(): boolean {
    if (!employeeId) return false;
    if (!startDate || !endDate) return false;
    if (startDate > endDate) return false;
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;
    setError(null);
    try {
      const result = await mutation.mutateAsync({
        employeeId,
        absenceType,
        startDate,
        endDate,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      setSuccessCount(result.affectedScheduleEntries);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="report-absence-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-absence-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="report-absence-modal"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="report-absence-title" className="text-display font-semibold">
            {successCount === null ? t('modal.title') : t('success.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('modal.close')}
            className="rounded-md p-1 text-text-muted hover:bg-surface-sunken hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </header>

        {successCount !== null ? (
          <div className="flex flex-col gap-4 px-5 py-6" data-testid="report-absence-success">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={24}
                className="mt-0.5 shrink-0 text-status-success"
                aria-hidden="true"
              />
              <p className="text-body text-text-primary">
                {successCount > 0
                  ? t('success.withEntries', { count: successCount })
                  : t('success.withoutEntries')}
              </p>
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onClose}
                data-testid="report-absence-success-confirm"
              >
                {t('success.confirm')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            {/* Mitarbeiter — nur wenn nicht preselected */}
            {!defaultEmployeeId ? (
              <label className="flex flex-col gap-1">
                <span className="text-label text-text-secondary">{t('field.employee')}</span>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-body"
                  required
                  autoFocus
                  data-testid="report-absence-employee"
                >
                  <option value="">{t('field.employeePlaceholder')}</option>
                  {employees
                    .filter((emp) => emp.is_active)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <div className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-body">
                <span className="text-label text-text-muted">{t('field.employee')}: </span>
                <span className="font-medium text-text-primary">
                  {employees.find((e) => e.id === defaultEmployeeId)?.first_name}{' '}
                  {employees.find((e) => e.id === defaultEmployeeId)?.last_name}
                </span>
              </div>
            )}

            {/* Abwesenheits-Typ */}
            <label className="flex flex-col gap-1">
              <span className="text-label text-text-secondary">{t('field.type')}</span>
              <select
                value={absenceType}
                onChange={(e) => setAbsenceType(e.target.value as AbsenceType)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-body"
                required
                data-testid="report-absence-type"
              >
                {ABSENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`type.${type}`)}
                  </option>
                ))}
              </select>
            </label>

            {/* Zeitraum */}
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-label text-text-secondary">{t('field.startDate')}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-body"
                  required
                  data-testid="report-absence-start"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-label text-text-secondary">{t('field.endDate')}</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-body"
                  required
                  data-testid="report-absence-end"
                />
              </label>
            </div>

            {/* Notes */}
            <label className="flex flex-col gap-1">
              <span className="text-label text-text-secondary">
                {t('field.notes')} <span className="text-text-muted">({t('field.optional')})</span>
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={3}
                className="resize-none rounded-md border border-border bg-surface px-3 py-2 text-body"
                data-testid="report-absence-notes"
              />
            </label>

            {error ? <FormError error={error} /> : null}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border bg-surface px-4 py-2 text-label hover:bg-surface-sunken"
              >
                {t('modal.cancel')}
              </button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!isValid() || mutation.isPending}
                loading={mutation.isPending}
                data-testid="report-absence-submit"
              >
                {mutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : null}
                {t('modal.submit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
