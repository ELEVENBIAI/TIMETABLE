// Absence-API (ELE-204).
// POST /api/absences markiert affected schedule_entries automatisch als REASSIGNMENT_NEEDED.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { scheduleKeys } from '@/api/schedule';

export const ABSENCE_TYPES = ['SICK', 'VACATION', 'PERSONAL', 'TRAINING', 'OTHER'] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export interface CreateAbsenceInput {
  employeeId: string;
  absenceType: AbsenceType;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  notes?: string;
}

export interface AbsenceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  absence_type: AbsenceType;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
}

export interface ReportAbsenceResult extends AbsenceRecord {
  affectedScheduleEntries: number;
}

export function useReportAbsence(scheduleId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAbsenceInput) => api.post<ReportAbsenceResult>('/absences', input),
    onSuccess: () => {
      // Schedule-Entries-Query invalidieren — Cards für betroffene Tage werden REASSIGNMENT_NEEDED
      if (scheduleId) {
        void qc.invalidateQueries({ queryKey: scheduleKeys.entries(scheduleId) });
      }
    },
  });
}
