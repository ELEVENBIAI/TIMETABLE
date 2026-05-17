// DSGVO Art. 30 — Audit-Log-Auswertung (ELE-187).
// Pure-ish: nimmt einen Pool + Filter, liefert Rows + Pagination-Meta oder CSV-String.
// Tenant-Scope wird vom Caller (Route) gesetzt — Service trusted das.

import type { Pool } from 'pg';

export interface AuditLogRow {
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

export interface AuditLogFilter {
  tenantId: string;
  userId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogPage {
  rows: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function queryAuditLog(pool: Pool, filter: AuditLogFilter): Promise<AuditLogPage> {
  const limit = Math.min(Math.max(filter.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const page = Math.max(filter.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const params: unknown[] = [filter.tenantId];
  const where: string[] = ['tenant_id = $1'];

  if (filter.userId) {
    params.push(filter.userId);
    where.push(`user_id = $${params.length}`);
  }
  if (filter.action) {
    params.push(filter.action);
    where.push(`action = $${params.length}`);
  }
  if (filter.targetType) {
    params.push(filter.targetType);
    where.push(`target_type = $${params.length}`);
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    where.push(`created_at >= $${params.length}`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    where.push(`created_at < $${params.length}`);
  }

  const whereClause = where.join(' AND ');

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM audit_log WHERE ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].total);

  params.push(limit, offset);
  const rowsResult = await pool.query<AuditLogRow>(
    `SELECT id, tenant_id, user_id, action, target_type, target_id, metadata,
            ip_address::text AS ip_address, user_agent, created_at
     FROM audit_log
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: rowsResult.rows, total, page, limit };
}

/** Konvertiert Audit-Rows in eine RFC-4180-kompatible CSV. */
export function toCsv(rows: AuditLogRow[]): string {
  const headers = [
    'id',
    'created_at',
    'user_id',
    'action',
    'target_type',
    'target_id',
    'metadata',
    'ip_address',
    'user_agent',
  ];
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    // RFC 4180: Felder mit ", \r, \n quoten + " verdoppeln
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.created_at,
        row.user_id,
        row.action,
        row.target_type,
        row.target_id,
        row.metadata,
        row.ip_address,
        row.user_agent,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\r\n') + '\r\n';
}
