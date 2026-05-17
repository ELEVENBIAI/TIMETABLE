// DSGVO Art. 15 — Self-Service-Datenexport (ELE-187).

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { downloadDataExport } from '@/api/dsgvo';
import { FormError } from '@/components/FormError';

export function DataExportPage() {
  const { t } = useTranslation('dsgvo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const blob = await downloadDataExport();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `meine-daten-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display font-semibold">{t('export.title')}</h1>
        <p className="text-body text-text-secondary">{t('export.subtitle')}</p>
      </header>

      <div className="rounded-md border border-border bg-surface-raised px-4 py-4">
        <h2 className="text-headline font-semibold">{t('export.legal.heading')}</h2>
        <ul className="mt-2 list-disc pl-5 text-body text-text-secondary">
          <li>{t('export.legal.point1')}</li>
          <li>{t('export.legal.point2')}</li>
          <li>{t('export.legal.point3')}</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-label font-medium text-brand-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
        data-testid="data-export-button"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {t('export.button')}
      </button>

      {error ? <FormError error={error} /> : null}
    </section>
  );
}
