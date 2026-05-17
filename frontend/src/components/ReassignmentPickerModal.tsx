// Reassignment-Picker-Modal (ELE-203). Backend von ELE-196 liefert Suggestions.
// Trigger: ScheduleEntryCard mit status='REASSIGNMENT_NEEDED' für ADMIN/PLANNER/FOREMAN.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Loader2, UserCheck, X } from 'lucide-react';
import i18n from '@/lib/i18n';
import { useReassignmentSuggestions, type I18nKey, type Suggestion } from '@/api/reassignment';
import { useMoveScheduleEntry } from '@/api/schedule';
import { FormError } from '@/components/FormError';

// Backend-Keys haben das Format "namespace.foo.bar" — wir konvertieren auf
// das i18next-Cross-Namespace-Format "namespace:foo.bar". Gleicher Pattern
// wie in FormError (siehe ADR-16).
function resolveBackendKey(key: string, vars?: Record<string, unknown>): string {
  const dotIdx = key.indexOf('.');
  if (dotIdx === -1) return i18n.t(key, vars);
  const ns = key.slice(0, dotIdx);
  const rest = key.slice(dotIdx + 1);
  return i18n.t(`${ns}:${rest}`, vars);
}

interface Props {
  entryId: string | null;
  scheduleId: string | null;
  propertyName: string;
  entryDate: string;
  startTime: string | null;
  onClose: () => void;
}

export function ReassignmentPickerModal({
  entryId,
  scheduleId,
  propertyName,
  entryDate,
  startTime,
  onClose,
}: Props) {
  const { t } = useTranslation('reassignment');
  const [expanded, setExpanded] = useState(false);
  const [mutationError, setMutationError] = useState<unknown>(null);
  const isOpen = !!entryId;

  const query = useReassignmentSuggestions(entryId, isOpen);
  const moveMut = useMoveScheduleEntry();

  // ESC schließt Modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !entryId) return null;

  async function handleSelect(s: Suggestion) {
    if (!scheduleId || !entryId) return;
    setMutationError(null);
    try {
      await moveMut.mutateAsync({
        id: entryId,
        scheduleId,
        employeeId: s.employeeId,
      });
      onClose();
    } catch (err) {
      setMutationError(err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      data-testid="reassignment-modal-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassignment-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="reassignment-modal"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 id="reassignment-modal-title" className="text-display font-semibold">
              {t('modal.title')}
            </h2>
            <p className="text-body text-text-secondary">
              {t('modal.subtitle', {
                property: propertyName,
                date: entryDate,
                time: startTime ? startTime.slice(0, 5) : '',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('modal.close')}
            className="rounded-md p-1 text-text-muted hover:bg-surface-sunken hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {query.isLoading ? (
            <div className="flex items-center gap-2 px-2 py-8 text-text-secondary">
              <Loader2 size={16} className="animate-spin" />
              {t('modal.loading')}
            </div>
          ) : query.isError ? (
            <FormError error={query.error} />
          ) : query.data?.suggestions.length === 0 ? (
            <div className="rounded-md border border-border bg-surface-sunken px-4 py-6 text-center text-body text-text-secondary">
              {t('modal.empty')}
            </div>
          ) : (
            <ul className="flex flex-col gap-3" data-testid="reassignment-suggestions">
              {query.data?.suggestions.map((s) => (
                <li key={s.employeeId}>
                  <SuggestionCard
                    suggestion={s}
                    onSelect={() => handleSelect(s)}
                    pending={moveMut.isPending}
                  />
                </li>
              ))}
            </ul>
          )}

          {mutationError ? (
            <div className="mt-3">
              <FormError error={mutationError} />
            </div>
          ) : null}

          {query.data && query.data.blocked.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-label font-medium text-text-secondary hover:bg-surface-sunken"
                data-testid="reassignment-blocked-toggle"
                aria-expanded={expanded}
              >
                <span>{t('modal.blockedHeader', { count: query.data.blocked.length })}</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {expanded ? (
                <ul className="mt-2 flex flex-col gap-2" data-testid="reassignment-blocked-list">
                  {query.data.blocked.map((s) => (
                    <li key={s.employeeId}>
                      <BlockedCard suggestion={s} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onSelect: () => void;
  pending: boolean;
}

function SuggestionCard({ suggestion, onSelect, pending }: SuggestionCardProps) {
  const { t } = useTranslation('reassignment');
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={pending}
      className="flex w-full flex-col gap-2 rounded-md border border-border bg-surface-raised px-4 py-3 text-left transition-colors hover:border-brand-primary hover:bg-surface disabled:opacity-60"
      data-testid={`suggestion-${suggestion.employeeId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="text-title font-semibold text-text-primary">
            {suggestion.employeeName}
          </div>
          <div className="text-label text-text-muted">
            {t('modal.factorsLabel')}: Kap {suggestion.factorScores.capacity} · Näh{' '}
            {suggestion.factorScores.proximity} · Qual {suggestion.factorScores.qualification} · Erf{' '}
            {suggestion.factorScores.experience} · Fair {suggestion.factorScores.fairness}
            {suggestion.factorScores.contingencyBonus > 0
              ? ` · +${suggestion.factorScores.contingencyBonus}`
              : ''}
          </div>
        </div>
        <ScoreBadge score={suggestion.score} />
      </div>
      {suggestion.reasonKeys.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-body text-text-secondary">
          {suggestion.reasonKeys.map((r, idx) => (
            <li key={idx} className="flex gap-2">
              <span aria-hidden="true">·</span>
              <span>{resolveBackendKey(r.key, r.vars)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1 inline-flex items-center gap-1 text-label font-medium text-brand-primary">
        <UserCheck size={14} aria-hidden="true" />
        {t('modal.confirm', { name: suggestion.employeeName })}
      </div>
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'bg-status-progress/20 text-status-progress'
      : score >= 50
        ? 'bg-status-planned/20 text-status-planned'
        : 'bg-status-conflict/20 text-status-conflict';
  return (
    <div
      className={`flex shrink-0 flex-col items-center rounded-md px-3 py-1 tabular-nums ${color}`}
      data-testid="score-badge"
    >
      <div className="text-headline font-semibold leading-none">{score}</div>
      <div className="text-label leading-tight">/100</div>
    </div>
  );
}

function BlockedCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-border bg-surface-sunken px-3 py-2 text-label opacity-80"
      data-testid={`blocked-${suggestion.employeeId}`}
    >
      <div className="font-medium text-text-secondary">{suggestion.employeeName}</div>
      <ul className="flex flex-col gap-0.5 text-text-muted">
        {suggestion.blockerKeys.map((b: I18nKey, idx) => (
          <li key={idx}>{resolveBackendKey(b.key, b.vars)}</li>
        ))}
      </ul>
    </div>
  );
}
