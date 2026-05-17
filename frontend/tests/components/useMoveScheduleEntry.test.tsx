// ELE-181: Optimistic-Update + Rollback in useMoveScheduleEntry.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useMoveScheduleEntry, scheduleKeys } from '@/api/schedule';
import { api } from '@/lib/api';
import { ApiRequestError } from '@/types/api';
import type { ScheduleEntry } from '@/types/schedule';

const TENANT = '00000000-0000-0000-0000-000000000000';
const SCHEDULE_ID = '22222222-2222-2222-2222-222222222222';

const ENTRY: ScheduleEntry = {
  id: '11111111-1111-1111-1111-111111111111',
  tenant_id: TENANT,
  schedule_id: SCHEDULE_ID,
  employee_id: 'emp-a',
  entry_date: '2026-05-18',
  day_of_week: 1,
  property_id: 'prop-1',
  service_type_id: 'svc-1',
  property_service_id: null,
  start_time: '08:00:00',
  duration_min: 30,
  sort_order: 0,
  status: 'PLANNED',
  is_extra: false,
  is_from_reassignment: false,
  original_employee_id: null,
  reassignment_reason: null,
  notes: null,
  created_at: '2026-05-16T00:00:00Z',
  updated_at: '2026-05-16T00:00:00Z',
};

function setupHook() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  qc.setQueryData<ScheduleEntry[]>(scheduleKeys.entries(SCHEDULE_ID), [ENTRY]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveScheduleEntry(), { wrapper });
  return { qc, result };
}

describe('useMoveScheduleEntry — Optimistic Update (ELE-181)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aktualisiert Cache sofort onMutate', async () => {
    const patchSpy = vi.spyOn(api, 'patch').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ ...ENTRY, employee_id: 'emp-b', entry_date: '2026-05-19' }),
            100
          );
        })
    );

    const { qc, result } = setupHook();

    void act(() => {
      void result.current.mutate({
        id: ENTRY.id,
        scheduleId: SCHEDULE_ID,
        employeeId: 'emp-b',
        entryDate: '2026-05-19',
        dayOfWeek: 2,
      });
    });

    // Cache muss SOFORT die neuen Werte zeigen (optimistic)
    await waitFor(() => {
      const cached = qc.getQueryData<ScheduleEntry[]>(scheduleKeys.entries(SCHEDULE_ID));
      expect(cached?.[0].employee_id).toBe('emp-b');
      expect(cached?.[0].entry_date).toBe('2026-05-19');
      expect(cached?.[0].day_of_week).toBe(2);
    });

    expect(patchSpy).toHaveBeenCalledWith(`/schedule-entries/${ENTRY.id}/move`, {
      employeeId: 'emp-b',
      entryDate: '2026-05-19',
      dayOfWeek: 2,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rollt Cache bei Backend-Error zurück', async () => {
    vi.spyOn(api, 'patch').mockRejectedValue(
      new ApiRequestError(409, 'TIME_CONFLICT', 'errors.timeConflict', 'Conflict')
    );

    const { qc, result } = setupHook();

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: ENTRY.id,
          scheduleId: SCHEDULE_ID,
          employeeId: 'emp-b',
          entryDate: '2026-05-19',
          dayOfWeek: 2,
        });
      } catch {
        // erwarteter Fehler
      }
    });

    // Cache muss auf Ausgangs-Werten sein
    const cached = qc.getQueryData<ScheduleEntry[]>(scheduleKeys.entries(SCHEDULE_ID));
    expect(cached?.[0].employee_id).toBe('emp-a');
    expect(cached?.[0].entry_date).toBe('2026-05-18');
    expect(cached?.[0].day_of_week).toBe(1);
  });
});
