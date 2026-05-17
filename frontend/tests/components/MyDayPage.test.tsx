// ELE-182: MyDayPage rendert Today-Entries + Maps-Link + Empty-State.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MyDayPage } from '@/pages/MyDayPage';
import { initI18n } from '@/lib/i18n';
import { scheduleKeys, stammKeys } from '@/api/schedule';
import { toISODate, getCurrentWeekStart } from '@/lib/date';
import type { Employee, Property, Schedule, ScheduleEntry, ServiceType } from '@/types/schedule';

beforeAll(async () => {
  await initI18n('en');
});

const TENANT = '00000000-0000-0000-0000-000000000000';
const SCHEDULE_ID = 'sched-1';
const TODAY = toISODate(new Date());
const WEEK_START = toISODate(getCurrentWeekStart());

const SCHEDULE: Schedule = {
  id: SCHEDULE_ID,
  tenant_id: TENANT,
  week_start: WEEK_START,
  week_number: 21,
  year: 2026,
  status: 'PUBLISHED',
  template_id: null,
  generation_method: 'FROM_TEMPLATE',
  published_at: '2026-05-17T08:00:00Z',
  published_by: null,
  notes: null,
  created_at: '2026-05-16T00:00:00Z',
  updated_at: '2026-05-17T00:00:00Z',
};

const PROPERTY: Property = {
  id: 'prop-1',
  tenant_id: TENANT,
  name: 'Porzer Straße 12',
  street: 'Porzer Straße',
  house_number: '12',
  zip_code: '51143',
  city: 'Köln',
  property_type: 'APARTMENT_BUILDING',
  is_active: true,
};

const SERVICE: ServiceType = {
  id: 'svc-1',
  tenant_id: TENANT,
  name: 'Treppenhaus Reinigung',
  short_name: 'Treppe',
  category: 'CLEANING',
  color_code: '#F97316',
  icon: null,
  default_duration_min: 30,
  is_active: true,
};

const EMPLOYEE: Employee = {
  id: 'emp-1',
  tenant_id: TENANT,
  first_name: 'Daniel',
  last_name: 'K.',
  display_name: 'Daniel K.',
  employee_type: 'FULLTIME',
  weekly_hours: '40.0',
  color_code: '#FF6B6B',
  is_active: true,
};

function makeEntry(overrides: Partial<ScheduleEntry> & { id: string }): ScheduleEntry {
  return {
    tenant_id: TENANT,
    schedule_id: SCHEDULE_ID,
    employee_id: EMPLOYEE.id,
    entry_date: TODAY,
    day_of_week: 1,
    property_id: PROPERTY.id,
    service_type_id: SERVICE.id,
    property_service_id: null,
    start_time: '08:00:00',
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
    ...overrides,
  };
}

function renderPage(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}>
        <MyDayPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function preseedStammdaten(qc: QueryClient) {
  qc.setQueryData(stammKeys.employees, [EMPLOYEE]);
  qc.setQueryData(stammKeys.properties, [PROPERTY]);
  qc.setQueryData(stammKeys.serviceTypes, [SERVICE]);
}

describe('MyDayPage (ELE-182)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('zeigt heutige Einträge sortiert nach Startzeit', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    preseedStammdaten(qc);
    qc.setQueryData(scheduleKeys.list(WEEK_START), [SCHEDULE]);
    qc.setQueryData(scheduleKeys.entries(SCHEDULE_ID), [
      makeEntry({ id: 'e-late', start_time: '14:30:00' }),
      makeEntry({ id: 'e-early', start_time: '07:15:00' }),
      makeEntry({ id: 'e-other-day', entry_date: '2030-01-01', start_time: '06:00:00' }),
    ]);

    renderPage(qc);

    const list = screen.getByTestId('myday-list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2); // andere Tage rausgefiltert
    expect(items[0]).toHaveTextContent('07:15');
    expect(items[1]).toHaveTextContent('14:30');
  });

  it('Property + Service-Name + Maps-Link werden gerendert', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    preseedStammdaten(qc);
    qc.setQueryData(scheduleKeys.list(WEEK_START), [SCHEDULE]);
    qc.setQueryData(scheduleKeys.entries(SCHEDULE_ID), [makeEntry({ id: 'e-1' })]);

    renderPage(qc);

    expect(screen.getByText('Porzer Straße 12')).toBeInTheDocument();
    expect(screen.getByText('Treppe')).toBeInTheDocument();
    const link = screen.getByTestId('myday-maps-link');
    expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps/search'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('zeigt Empty-State wenn keine Einträge für heute', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    preseedStammdaten(qc);
    qc.setQueryData(scheduleKeys.list(WEEK_START), [SCHEDULE]);
    qc.setQueryData(scheduleKeys.entries(SCHEDULE_ID), [
      makeEntry({ id: 'e-other-day', entry_date: '2030-01-01' }),
    ]);

    renderPage(qc);
    expect(screen.getByTestId('myday-empty')).toBeInTheDocument();
  });

  it('Begrüßung mit Mitarbeiter-Vornamen wenn Einträge vorhanden', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    preseedStammdaten(qc);
    qc.setQueryData(scheduleKeys.list(WEEK_START), [SCHEDULE]);
    qc.setQueryData(scheduleKeys.entries(SCHEDULE_ID), [makeEntry({ id: 'e-1' })]);

    renderPage(qc);
    expect(screen.getByText(/Daniel/)).toBeInTheDocument();
  });
});
