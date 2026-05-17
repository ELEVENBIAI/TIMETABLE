// Reassignment-Engine API-Hook (ELE-203).
// Liest Vorschläge vom Backend (ELE-196).

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface I18nKey {
  key: string;
  vars?: Record<string, unknown>;
}

export interface Suggestion {
  employeeId: string;
  employeeName: string;
  score: number;
  factorScores: {
    capacity: number;
    proximity: number;
    qualification: number;
    experience: number;
    fairness: number;
    contingencyBonus: number;
  };
  reasonKeys: I18nKey[];
  blockerKeys: I18nKey[];
}

export interface ReassignmentResponse {
  entryId: string;
  suggestions: Suggestion[];
  blocked: Suggestion[];
}

export const reassignmentKeys = {
  forEntry: (entryId: string) => ['reassignment', 'suggestions', entryId] as const,
};

export function useReassignmentSuggestions(entryId: string | null, enabled = true) {
  return useQuery({
    queryKey: reassignmentKeys.forEntry(entryId ?? ''),
    queryFn: () =>
      api.get<ReassignmentResponse>(`/schedule-entries/${entryId}/reassignment-suggestions`),
    enabled: enabled && !!entryId,
    staleTime: 30_000,
  });
}
