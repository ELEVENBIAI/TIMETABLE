// DSGVO Art. 30 — Audit-Trail-Auswertung (ELE-187). ADMIN/SUPER_ADMIN only.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { buildAuditLogCsvUrl, useAuditLog, type AuditLogFilter } from '@/api/dsgvo';
import { useAuth } from '@/lib/auth';
import { getStoredToken } from '@/lib/auth';
import { FormError } from '@/components/FormError';

export function AuditTrailPage() {
  const { t } = useTranslation('dsgvo');
  const { payload } = useAuth();
  const [filter, setFilter] = useState<AuditLogFilter>({ page: 1, limit: 50 });

  const query = useAuditLog(filter);

  const isAdmin = useMemo(
    () => payload?.role === 'ADMIN' || payload?.isSuperAdmin === true,
    [payload]
  );

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8">
        <FormError error={t('audit.forbidden')} />
      </section>
    );
  }

  async function handleCsvDownload() {
    const url = buildAuditLogCsvUrl(filter);
    const token = getStoredToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'audit-log.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-semibold">{t('audit.title')}</h1>
        <p className="text-body text-text-secondary">{t('audit.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-label text-text-secondary">
          {t('audit.filter.action')}
          <input
            type="text"
            value={filter.action ?? ''}
            onChange={(e) => setFilter({ ...filter, action: e.target.value || undefined, page: 1 })}
            placeholder="employee.read"
            className="rounded-md border border-border bg-surface px-2 py-1 text-body"
          />
        </label>
        <label className="flex flex-col gap-1 text-label text-text-secondary">
          {t('audit.filter.dateFrom')}
          <input
            type="date"
            value={filter.dateFrom ? filter.dateFrom.slice(0, 10) : ''}
            onChange={(e) =>
              setFilter({
                ...filter,
                dateFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                page: 1,
              })
            }
            className="rounded-md border border-border bg-surface px-2 py-1 text-body"
          />
        </label>
        <label className="flex flex-col gap-1 text-label text-text-secondary">
          {t('audit.filter.dateTo')}
          <input
            type="date"
            value={filter.dateTo ? filter.dateTo.slice(0, 10) : ''}
            onChange={(e) =>
              setFilter({
                ...filter,
                dateTo: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                page: 1,
              })
            }
            className="rounded-md border border-border bg-surface px-2 py-1 text-body"
          />
        </label>
        <button
          type="button"
          onClick={handleCsvDownload}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-label hover:border-brand-primary"
          data-testid="audit-csv-export"
        >
          <Download size={14} aria-hidden="true" />
          {t('audit.export')}
        </button>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 px-2 py-8 text-text-secondary">
          <Loader2 size={16} className="animate-spin" />
          {t('audit.loading')}
        </div>
      ) : query.isError ? (
        <FormError error={query.error} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-label">
              <thead className="bg-surface-sunken text-left text-text-muted">
                <tr>
                  <th className="px-3 py-2">{t('audit.cols.createdAt')}</th>
                  <th className="px-3 py-2">{t('audit.cols.user')}</th>
                  <th className="px-3 py-2">{t('audit.cols.action')}</th>
                  <th className="px-3 py-2">{t('audit.cols.target')}</th>
                </tr>
              </thead>
              <tbody data-testid="audit-table-body">
                {query.data?.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums">
                      {row.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-3 py-2 font-mono">{row.user_id?.slice(0, 8) ?? '—'}</td>
                    <td className="px-3 py-2 font-mono">{row.action}</td>
                    <td className="px-3 py-2 font-mono">
                      {row.target_type ?? '—'}
                      {row.target_id ? ` / ${row.target_id.slice(0, 8)}` : ''}
                    </td>
                  </tr>
                ))}
                {query.data?.rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-text-muted" colSpan={4}>
                      {t('audit.empty')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-label text-text-secondary">
            <span>
              {t('audit.pagination.summary', {
                shown: query.data?.rows.length ?? 0,
                total: query.data?.total ?? 0,
              })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={(filter.page ?? 1) === 1}
                onClick={() => setFilter({ ...filter, page: Math.max((filter.page ?? 1) - 1, 1) })}
                className="rounded-md border border-border bg-surface px-3 py-1 disabled:opacity-50"
              >
                {t('audit.pagination.prev')}
              </button>
              <button
                type="button"
                disabled={
                  query.data ? (filter.page ?? 1) * (filter.limit ?? 50) >= query.data.total : true
                }
                onClick={() => setFilter({ ...filter, page: (filter.page ?? 1) + 1 })}
                className="rounded-md border border-border bg-surface px-3 py-1 disabled:opacity-50"
              >
                {t('audit.pagination.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
