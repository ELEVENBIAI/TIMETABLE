import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@/lib/i18n';
import { ScheduleStatusBadge } from '@/components/ScheduleStatusBadge';
import { WorkloadBar } from '@/components/WorkloadBar';
import { ScheduleEntryCard } from '@/components/WeekGrid/ScheduleEntryCard';
import { ViewModeSwitcher } from '@/components/WeekGrid/ViewModeSwitcher';
import type { ScheduleEntry, ServiceType, Property } from '@/types/schedule';
import { formatWeekRange, getWeekMeta, minutesFromGridStart, parseISODate } from '@/lib/date';

beforeAll(async () => {
  await initI18n('de');
});

function withClient(ui: JSX.Element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe('ScheduleStatusBadge', () => {
  it('rendert DRAFT-Badge mit Label', () => {
    render(withClient(<ScheduleStatusBadge status="DRAFT" />));
    expect(screen.getByText(/Entwurf/i)).toBeInTheDocument();
  });

  it('rendert PUBLISHED-Badge mit Label', () => {
    render(withClient(<ScheduleStatusBadge status="PUBLISHED" />));
    expect(screen.getByText(/Veröffentlicht/i)).toBeInTheDocument();
  });
});

describe('WorkloadBar', () => {
  it('zeigt "h / h"-Format bei vorhandenen weekly_hours', () => {
    render(<WorkloadBar plannedMinutes={1800} weeklyHours={40} />);
    expect(screen.getByText(/30h \/ 40h/)).toBeInTheDocument();
  });

  it('zeigt Overload-Warnung bei > 100%', () => {
    render(<WorkloadBar plannedMinutes={2700} weeklyHours={40} />);
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
  });

  it('fällt bei fehlenden weekly_hours auf nackte Stunden zurück', () => {
    render(<WorkloadBar plannedMinutes={900} weeklyHours={null} />);
    expect(screen.getByText(/15h/)).toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });
});

describe('ScheduleEntryCard', () => {
  const baseEntry: ScheduleEntry = {
    id: 'e1',
    tenant_id: 't',
    schedule_id: 's',
    employee_id: 'emp1',
    entry_date: '2026-05-18',
    day_of_week: 1,
    property_id: 'p1',
    service_type_id: 'st1',
    property_service_id: null,
    start_time: '07:00:00',
    duration_min: 30,
    sort_order: 1,
    status: 'PLANNED',
    is_extra: false,
    is_from_reassignment: false,
    original_employee_id: null,
    reassignment_reason: null,
    notes: null,
    created_at: '',
    updated_at: '',
  };

  const property: Property = {
    id: 'p1',
    tenant_id: 't',
    name: 'Lorweg 3',
    street: 'Lorweg',
    house_number: null,
    zip_code: '51147',
    city: 'Köln',
    property_type: 'APARTMENT_BUILDING',
    is_active: true,
  };

  const serviceType: ServiceType = {
    id: 'st1',
    tenant_id: 't',
    name: 'Treppenhaus Reinigung',
    short_name: 'Treppenhaus',
    category: 'CLEANING',
    color_code: '#F97316',
    icon: null,
    default_duration_min: 30,
    is_active: true,
  };

  it('rendert Property-Name + Service + Zeit + Dauer', () => {
    render(
      withClient(
        <ScheduleEntryCard entry={baseEntry} property={property} serviceType={serviceType} />
      )
    );
    expect(screen.getByText('Lorweg 3')).toBeInTheDocument();
    expect(screen.getByText('Treppenhaus')).toBeInTheDocument();
    expect(screen.getByText(/07:00.*30 min/)).toBeInTheDocument();
  });

  it('zeigt Vertretungs-Badge bei is_from_reassignment', () => {
    render(
      withClient(
        <ScheduleEntryCard
          entry={{ ...baseEntry, is_from_reassignment: true, original_employee_id: 'orig' }}
          property={property}
          serviceType={serviceType}
          originalEmployee={{
            id: 'orig',
            tenant_id: 't',
            first_name: 'Daniel',
            last_name: 'K.',
            display_name: null,
            employee_type: 'FULLTIME',
            weekly_hours: '40',
            color_code: null,
            is_active: true,
          }}
        />
      )
    );
    expect(screen.getByText(/vertritt Daniel/i)).toBeInTheDocument();
  });
});

describe('ViewModeSwitcher', () => {
  it('rendert 4 Tabs mit aktiver Selection', () => {
    render(withClient(<ViewModeSwitcher value="team" onChange={() => {}} />));
    expect(screen.getByRole('tab', { name: /Team/i, selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mitarbeiter/i, selected: false })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tag/i, selected: false })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Objekt/i, selected: false })).toBeInTheDocument();
  });
});

describe('Date-Utils', () => {
  it('formatWeekRange für KW 21/2026', () => {
    const ws = parseISODate('2026-05-18');
    const range = formatWeekRange(ws, 'de');
    expect(range).toMatch(/KW 21/);
    expect(range).toMatch(/18\..*Mai/);
    expect(range).toMatch(/22\..*Mai/);
  });

  it('getWeekMeta für 2026-05-18', () => {
    const meta = getWeekMeta(parseISODate('2026-05-18'));
    expect(meta.weekNumber).toBe(21);
    expect(meta.year).toBe(2026);
  });

  it('minutesFromGridStart: 07:00 = 0, 08:30 = 90, 13:15 = 375', () => {
    expect(minutesFromGridStart('07:00:00')).toBe(0);
    expect(minutesFromGridStart('08:30:00')).toBe(90);
    expect(minutesFromGridStart('13:15:00')).toBe(375);
  });
});
