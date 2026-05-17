import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RotateCw, ShieldAlert, WifiOff } from 'lucide-react';
import { healthApi } from '@/lib/api';
import { ApiRequestError, type HealthResponse } from '@/types/api';

type Status = 'checking' | 'connected' | 'degraded' | 'unreachable';

interface State {
  status: Status;
  version?: string;
  lastCheckedAt?: Date;
}

export function HealthPage() {
  const { t, i18n } = useTranslation('health');
  const [state, setState] = useState<State>({ status: 'checking' });

  const check = useCallback(async () => {
    setState({ status: 'checking' });
    try {
      const res: HealthResponse = await healthApi.check();
      setState({
        status: res.status === 'ok' ? 'connected' : 'degraded',
        version: res.version,
        lastCheckedAt: new Date(),
      });
    } catch (err) {
      // Unauthorized counts as "reachable but locked" — still treat as connected for smoke purposes.
      if (err instanceof ApiRequestError && err.status > 0) {
        setState({
          status: err.status === 401 ? 'degraded' : 'unreachable',
          lastCheckedAt: new Date(),
        });
        return;
      }
      setState({ status: 'unreachable', lastCheckedAt: new Date() });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <header>
        <h1 className="text-display font-semibold">{t('title')}</h1>
      </header>

      <div className="flex items-center gap-4 rounded-md border border-border bg-surface-raised p-5">
        <StatusIcon status={state.status} />
        <div className="flex-1">
          <div className="text-headline">
            {state.status === 'checking' && t('checking')}
            {state.status === 'connected' && t('connected', { version: state.version ?? '?' })}
            {state.status === 'degraded' && t('degraded')}
            {state.status === 'unreachable' && t('unreachable')}
          </div>
          {state.lastCheckedAt && (
            <div className="mt-1 text-label text-text-muted">
              {t('lastChecked', { time: formatter.format(state.lastCheckedAt) })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            void check();
          }}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-label text-text-primary hover:bg-surface-sunken"
        >
          <RotateCw size={14} aria-hidden="true" />
          {t('retry')}
        </button>
      </div>
    </section>
  );
}

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className="text-status-completed" size={28} aria-hidden="true" />;
    case 'degraded':
      return <ShieldAlert className="text-status-needs-reassign" size={28} aria-hidden="true" />;
    case 'unreachable':
      return <WifiOff className="text-status-conflict" size={28} aria-hidden="true" />;
    case 'checking':
    default:
      return <RotateCw className="animate-spin text-text-secondary" size={28} aria-hidden="true" />;
  }
}
