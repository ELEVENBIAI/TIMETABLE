// ELE-204 ReportAbsenceModal Tests.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportAbsenceModal } from '@/components/ReportAbsenceModal';
import { initI18n } from '@/lib/i18n';
import { api } from '@/lib/api';
import type { Employee } from '@/types/schedule';

beforeAll(async () => {
  await initI18n('en');
});

const TENANT = '00000000-0000-0000-0000-000000000000';
const EMPLOYEES: Employee[] = [
  {
    id: 'emp-daniel',
    tenant_id: TENANT,
    first_name: 'Daniel',
    last_name: 'K.',
    display_name: 'Daniel K.',
    employee_type: 'FULLTIME',
    weekly_hours: '40.0',
    color_code: null,
    is_active: true,
  },
  {
    id: 'emp-anna',
    tenant_id: TENANT,
    first_name: 'Anna',
    last_name: 'S.',
    display_name: 'Anna S.',
    employee_type: 'PARTTIME',
    weekly_hours: '20.0',
    color_code: null,
    is_active: true,
  },
];

function renderModal(props: {
  isOpen?: boolean;
  defaultEmployeeId?: string;
  onClose?: () => void;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ReportAbsenceModal
        isOpen={props.isOpen ?? true}
        onClose={props.onClose ?? (() => {})}
        defaultEmployeeId={props.defaultEmployeeId}
        employees={EMPLOYEES}
        scheduleId="sched-1"
      />
    </QueryClientProvider>
  );
}

describe('ReportAbsenceModal (ELE-204)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rendert alle Form-Felder ohne defaultEmployeeId', () => {
    renderModal({});
    expect(screen.getByTestId('report-absence-employee')).toBeInTheDocument();
    expect(screen.getByTestId('report-absence-type')).toBeInTheDocument();
    expect(screen.getByTestId('report-absence-start')).toBeInTheDocument();
    expect(screen.getByTestId('report-absence-end')).toBeInTheDocument();
    expect(screen.getByTestId('report-absence-notes')).toBeInTheDocument();
    expect(screen.getByTestId('report-absence-submit')).toBeInTheDocument();
  });

  it('mit defaultEmployeeId: Employee-Dropdown wird ersetzt durch Read-only-Anzeige', () => {
    renderModal({ defaultEmployeeId: 'emp-daniel' });
    expect(screen.queryByTestId('report-absence-employee')).toBeNull();
    expect(screen.getByText(/Daniel K\./)).toBeInTheDocument();
  });

  it('Submit ohne Mitarbeiter ist disabled', () => {
    renderModal({});
    const submit = screen.getByTestId('report-absence-submit');
    expect(submit).toBeDisabled();
  });

  it('Submit triggert POST /absences mit korrekten Feldern', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ id: 'abs-1' } as never);
    const onClose = vi.fn();
    renderModal({ defaultEmployeeId: 'emp-daniel', onClose });

    // Type ändern auf VACATION
    fireEvent.change(screen.getByTestId('report-absence-type'), {
      target: { value: 'VACATION' },
    });
    // Notes
    fireEvent.change(screen.getByTestId('report-absence-notes'), {
      target: { value: 'Sommerurlaub' },
    });

    fireEvent.click(screen.getByTestId('report-absence-submit'));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/absences',
        expect.objectContaining({
          employeeId: 'emp-daniel',
          absenceType: 'VACATION',
          notes: 'Sommerurlaub',
        })
      );
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('ESC schließt Modal', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Backdrop-Klick schließt Modal', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('report-absence-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('startDate > endDate → Submit disabled', () => {
    renderModal({ defaultEmployeeId: 'emp-daniel' });
    fireEvent.change(screen.getByTestId('report-absence-start'), {
      target: { value: '2026-06-10' },
    });
    fireEvent.change(screen.getByTestId('report-absence-end'), {
      target: { value: '2026-06-05' },
    });
    expect(screen.getByTestId('report-absence-submit')).toBeDisabled();
  });
});
