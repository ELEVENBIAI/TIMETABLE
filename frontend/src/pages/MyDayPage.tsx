// Mobile-Tagesansicht für Mitarbeiter (ELE-182).
// EMPLOYEE sieht seine eigenen Aufgaben für heute — Backend filtert automatisch
// via employees.user_id = actor.userId. Read-only.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarOff, Loader2, MapPin, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import {
  indexById,
  useEmployees,
  useProperties,
  useSchedules,
  useScheduleEntries,
  useServiceTypes,
} from '@/api/schedule';
import { formatDurationLabel, formatTime, getCurrentWeekStart, toISODate } from '@/lib/date';
import { formatAddress, googleMapsSearchUrl } from '@/lib/maps';
import { isLocale } from '@/lib/i18n';
import type { Property, ScheduleEntry, ServiceType } from '@/types/schedule';

const LOCALES = { en: enUS, de };

export function MyDayPage() {
  const { t, i18n } = useTranslation('myday');
  const locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';
  const dfnsLocale = LOCALES[locale];

  // Heute bestimmen + zugehörigen Wochenstart (Montag der aktuellen ISO-Woche)
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(today), [today]);
  const weekStartISO = useMemo(() => toISODate(getCurrentWeekStart()), []);

  // Wochenpläne der aktuellen Woche. Backend liefert für EMPLOYEE alle Schedules
  // der eigenen Tenant — wir nehmen den ersten (es gibt pro Woche max. 1).
  const schedulesQuery = useSchedules(weekStartISO);
  const schedule = schedulesQuery.data?.[0];
  // Backend zeigt EMPLOYEE nur Einträge des eigenen Mitarbeiters (user_id-Join).
  const entriesQuery = useScheduleEntries(schedule?.id);
  const propertiesQuery = useProperties();
  const serviceTypesQuery = useServiceTypes();
  const employeesQuery = useEmployees();

  const propertyMap = useMemo(() => indexById(propertiesQuery.data), [propertiesQuery.data]);
  const serviceTypeMap = useMemo(() => indexById(serviceTypesQuery.data), [serviceTypesQuery.data]);

  // Falls der eigene Mitarbeiter nicht aktiv ist, zeigen wir trotzdem den Plan.
  // Display-Name oben kommt aus dem ersten Eintrag (alle gehören dem gleichen MA).
  const todaysEntries = useMemo(() => {
    if (!entriesQuery.data) return [];
    return entriesQuery.data
      .filter((e) => e.entry_date === todayISO)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
  }, [entriesQuery.data, todayISO]);

  const employeeMap = useMemo(() => indexById(employeesQuery.data), [employeesQuery.data]);
  const myEmployee = todaysEntries[0] ? employeeMap.get(todaysEntries[0].employee_id) : undefined;

  const isLoading =
    schedulesQuery.isLoading ||
    entriesQuery.isLoading ||
    propertiesQuery.isLoading ||
    serviceTypesQuery.isLoading;

  return (
    <section className="flex flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <div className="text-label uppercase tracking-wide text-text-muted">
          {format(today, 'EEEE', { locale: dfnsLocale })}
        </div>
        <h1 className="text-display font-semibold tabular-nums">
          {format(today, 'd. MMMM', { locale: dfnsLocale })}
        </h1>
        {myEmployee ? (
          <div className="text-body text-text-secondary">
            {t('header.greeting', {
              name: myEmployee.first_name,
            })}
          </div>
        ) : null}
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 px-2 py-8 text-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          {t('loading')}
        </div>
      ) : todaysEntries.length === 0 ? (
        <EmptyDay scheduleStatus={schedule?.status} />
      ) : (
        <ol className="flex flex-col gap-3" data-testid="myday-list">
          {todaysEntries.map((entry) => (
            <li key={entry.id}>
              <EntryCard
                entry={entry}
                property={propertyMap.get(entry.property_id)}
                serviceType={serviceTypeMap.get(entry.service_type_id)}
                locale={locale}
              />
            </li>
          ))}
        </ol>
      )}

      {schedule?.status === 'DRAFT' && todaysEntries.length > 0 ? (
        <div
          role="status"
          className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-label text-text-secondary"
        >
          {t('draftHint')}
        </div>
      ) : null}
    </section>
  );
}

interface EntryCardProps {
  entry: ScheduleEntry;
  property?: Property;
  serviceType?: ServiceType;
  locale: 'en' | 'de';
}

function EntryCard({ entry, property, serviceType, locale }: EntryCardProps) {
  const { t } = useTranslation('myday');
  const stripeColor = serviceType?.color_code ?? 'var(--color-status-planned)';
  const propertyName = property?.name ?? `Property ${entry.property_id.slice(0, 6)}`;
  const serviceName = serviceType?.short_name ?? serviceType?.name ?? '—';
  const startLabel = formatTime(entry.start_time);
  const durationLabel = formatDurationLabel(entry.duration_min, locale);
  const address = property ? formatAddress(property) : null;
  const mapsUrl = property ? googleMapsSearchUrl(property) : null;

  return (
    <article
      className="relative flex flex-col gap-2 overflow-hidden rounded-md border border-border bg-surface-raised pl-3 pr-3 py-3"
      data-entry-id={entry.id}
      data-status={entry.status}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-headline font-semibold tabular-nums">{startLabel}</div>
          <div className="text-label text-text-muted">{durationLabel}</div>
        </div>
        <span
          className="rounded-sm px-2 py-0.5 text-label font-medium"
          style={{
            backgroundColor: `${stripeColor}1a`,
            color: stripeColor,
          }}
        >
          {serviceName}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="text-title font-semibold text-text-primary">{propertyName}</div>
        {address ? (
          <div className="flex items-start gap-1 text-body text-text-secondary">
            <MapPin size={14} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
            <span className="break-words">{address}</span>
          </div>
        ) : null}
      </div>
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-label font-medium text-text-primary transition-colors hover:border-brand-primary hover:bg-surface-raised"
          data-testid="myday-maps-link"
        >
          <Navigation size={14} aria-hidden="true" />
          {t('actions.navigate')}
        </a>
      ) : null}
    </article>
  );
}

function EmptyDay({ scheduleStatus }: { scheduleStatus?: string }) {
  const { t } = useTranslation('myday');
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface-sunken px-4 py-12 text-center"
      data-testid="myday-empty"
    >
      <CalendarOff size={32} className="text-text-muted" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 className="text-headline font-semibold">{t('empty.title')}</h2>
        <p className="text-body text-text-secondary">
          {scheduleStatus === 'DRAFT' ? t('empty.draftHint') : t('empty.subtitle')}
        </p>
      </div>
    </div>
  );
}
