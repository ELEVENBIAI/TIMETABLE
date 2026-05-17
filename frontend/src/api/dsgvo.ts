// DSGVO-Frontend-API (ELE-187).

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  rows: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const dsgvoKeys = {
  auditLog: (filter: AuditLogFilter) => ['dsgvo', 'audit-log', filter] as const,
};

export function useAuditLog(filter: AuditLogFilter) {
  return useQuery({
    queryKey: dsgvoKeys.auditLog(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(filter)) {
        if (v !== undefined && v !== '') params.set(k, String(v));
      }
      return api.get<AuditLogResponse>(`/dsgvo/audit-log?${params.toString()}`);
    },
    staleTime: 15_000,
  });
}

/**
 * Datenexport. Liefert die ZIP-Datei als Blob — wir bauen den fetch selbst,
 * weil der api-Wrapper auf JSON-Antworten ausgelegt ist.
 */
export async function downloadDataExport(targetUserId?: string): Promise<Blob> {
  const token = getStoredToken();
  const res = await fetch('/api/dsgvo/data-export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(targetUserId ? { userId: targetUserId } : {}),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.blob();
}

export interface DeleteRequestInput {
  userId: string;
  reason: string;
  confirmEmail?: string;
}

export function useDeleteRequest() {
  return useMutation({
    mutationFn: (input: DeleteRequestInput) =>
      api.post<{ ok: boolean; hardDeleteAt: string }>('/dsgvo/delete-request', input),
  });
}

export function buildAuditLogCsvUrl(filter: AuditLogFilter): string {
  const params = new URLSearchParams({ format: 'csv' });
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  return `/api/dsgvo/audit-log?${params.toString()}`;
}
