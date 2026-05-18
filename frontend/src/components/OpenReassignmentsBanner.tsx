// Banner über offene REASSIGNMENT_NEEDED-Entries quer durch alle Wochen.
// Robert sieht damit auch dann offene Vertretungen, wenn er gerade in einer
// anderen Woche steht. Click auf eine Pille → Sprung zur Woche.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useOpenReassignments } from '@/api/schedule';
import { isLocale } from '@/lib/i18n';

interface Props {
  /** Aktuell angezeigte Woche (ISO YYYY-MM-DD) — wird visuell hervorgehoben. */
  currentWeekStart: string;
  /** Click auf eine Woche → Wechsel. */
  onJumpToWeek: (weekStart: string) => void;
}

export function OpenReassignmentsBanner({ currentWeekStart, onJumpToWeek }: Props) {
  const { t, i18n } = useTranslation('schedule');
  const dfnsLocale = isLocale(i18n.resolvedLanguage)
    ? { en: enUS, de }[i18n.resolvedLanguage]
    : enUS;
  const query = useOpenReassignments();

  const weeks = useMemo(() => {
    // Nur Wochen außerhalb der aktuellen anzeigen — die Cards der aktuellen
    // Woche sind ja bereits rot markiert im Grid.
    return (query.data ?? []).filter((w) => w.weekStart !== currentWeekStart);
  }, [query.data, currentWeekStart]);

  if (weeks.length === 0) return null;

  const totalOpen = weeks.reduce((sum, w) => sum + w.openCount, 0);

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-md border border-status-needs-reassign bg-status-needs-reassign-soft px-3 py-2 text-label"
      data-testid="open-reassignments-banner"
    >
      <AlertTriangle size={16} className="shrink-0 text-status-needs-reassign" aria-hidden="true" />
      <span className="font-medium text-status-needs-reassign">
        {t('openReassignments.summary', { count: totalOpen })}
      </span>
      <span className="text-text-secondary">·</span>
      <span className="text-text-secondary">{t('openReassignments.jumpHint')}:</span>
      {weeks.map((w) => {
        const d = parseISO(w.weekStart);
        const label = format(d, 'dd. MMM', { locale: dfnsLocale });
        return (
          <button
            key={w.scheduleId}
            type="button"
            onClick={() => onJumpToWeek(w.weekStart)}
            className="inline-flex items-center gap-1 rounded-full border border-status-needs-reassign bg-surface px-2 py-0.5 text-status-needs-reassign hover:bg-status-needs-reassign-soft"
            data-testid={`open-reassignments-week-${w.weekStart}`}
          >
            <span className="numeric tabular-nums">{label}</span>
            <span className="rounded-full bg-status-needs-reassign-soft px-1.5 text-label font-semibold">
              {w.openCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
