// Schedule-API-Hooks via TanStack Query (ELE-180).
// Cache-Strategie: schedules 30s staleTime, Stammdaten (employees/properties/serviceTypes) 5min.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Employee, Property, Schedule, ScheduleEntry, ServiceType } from '@/types/schedule';

// ─── Query-Keys ───────────────────────────────────────────────────────────
export const scheduleKeys = {
  all: ['schedules'] as const,
  list: (weekStart?: string) => ['schedules', { weekStart }] as const,
  entries: (scheduleId: string) => ['schedule-entries', scheduleId] as const,
  openReassignments: ['schedules', 'open-reassignments'] as const,
};

export interface OpenReassignmentWeek {
  scheduleId: string;
  weekStart: string;
  openCount: number;
}

export function useOpenReassignments() {
  return useQuery({
    queryKey: scheduleKeys.openReassignments,
    queryFn: async () => {
      const r = await api.get<{ weeks: OpenReassignmentWeek[] }>('/reassignments/open-weeks');
      return r.weeks;
    },
    staleTime: 30_000,
  });
}

export const stammKeys = {
  employees: ['employees'] as const,
  properties: ['properties'] as const,
  serviceTypes: ['service-types'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────

export function useSchedules(weekStart?: string) {
  return useQuery({
    queryKey: scheduleKeys.list(weekStart),
    queryFn: async () => {
      const query = weekStart ? `?weekStart=${weekStart}` : '';
      const r = await api.get<{ schedules: Schedule[] }>(`/schedules${query}`);
      return r.schedules;
    },
  });
}

export function useScheduleEntries(scheduleId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.entries(scheduleId ?? ''),
    queryFn: async () => {
      const r = await api.get<{ scheduleEntries: ScheduleEntry[] }>(
        `/schedule-entries?scheduleId=${scheduleId}`
      );
      return r.scheduleEntries;
    },
    enabled: !!scheduleId,
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: stammKeys.employees,
    queryFn: async () => {
      const r = await api.get<{ employees: Employee[] }>('/employees');
      return r.employees;
    },
    staleTime: 5 * 60_000,
  });
}

export function useProperties() {
  return useQuery({
    queryKey: stammKeys.properties,
    queryFn: async () => {
      const r = await api.get<{ properties: Property[] }>('/properties');
      return r.properties;
    },
    staleTime: 5 * 60_000,
  });
}

export function useServiceTypes() {
  return useQuery({
    queryKey: stammKeys.serviceTypes,
    queryFn: async () => {
      const r = await api.get<{ serviceTypes: ServiceType[] }>('/service-types');
      return r.serviceTypes;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function usePublishSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) =>
      api.post<Schedule>(`/schedules/${scheduleId}/publish`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

interface GenerateScheduleInput {
  templateId: string;
  weekStart: string;
  weekNumber: number;
  year: number;
}

export function useGenerateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateScheduleInput) =>
      api.post<{
        schedule: Schedule;
        entries: ScheduleEntry[];
        warnings: unknown[];
      }>('/schedules/generate', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export interface MoveScheduleEntryInput {
  id: string;
  scheduleId: string;
  employeeId?: string;
  entryDate?: string;
  dayOfWeek?: number;
  startTime?: string;
}

export function useMoveScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scheduleId: _ignore, ...body }: MoveScheduleEntryInput) =>
      api.patch<ScheduleEntry>(`/schedule-entries/${id}/move`, body),
    onMutate: async (input) => {
      const key = scheduleKeys.entries(input.scheduleId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ScheduleEntry[]>(key);
      if (previous) {
        qc.setQueryData<ScheduleEntry[]>(
          key,
          previous.map((e) =>
            e.id === input.id
              ? {
                  ...e,
                  employee_id: input.employeeId ?? e.employee_id,
                  entry_date: input.entryDate ?? e.entry_date,
                  day_of_week: input.dayOfWeek ?? e.day_of_week,
                  start_time: input.startTime !== undefined ? input.startTime : e.start_time,
                }
              : e
          )
        );
      }
      return { previous, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _err, input) => {
      void qc.invalidateQueries({ queryKey: scheduleKeys.entries(input.scheduleId) });
      // Banner-Übersicht: Vertretung kann offene Counts reduzieren
      void qc.invalidateQueries({ queryKey: scheduleKeys.openReassignments });
    },
  });
}

// ─── Lookup-Helpers (für die Grid-Anzeige) ────────────────────────────────

export function indexById<T extends { id: string }>(items: T[] | undefined): Map<string, T> {
  if (!items) return new Map();
  return new Map(items.map((i) => [i.id, i]));
}
