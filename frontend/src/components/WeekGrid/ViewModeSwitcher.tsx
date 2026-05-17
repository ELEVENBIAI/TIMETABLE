import { useTranslation } from 'react-i18next';
import type { ViewMode } from './WeekGrid.types';

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODES: ViewMode[] = ['team', 'employee', 'day', 'property'];

export function ViewModeSwitcher({ value, onChange }: Props) {
  const { t } = useTranslation('schedule');
  return (
    <div
      className="inline-flex rounded-md border border-border bg-surface p-0.5"
      role="tablist"
      aria-label={t('viewMode.label')}
    >
      {MODES.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className={[
              'rounded-sm px-3 py-1.5 text-label transition-colors',
              active
                ? 'bg-brand-primary text-brand-on-primary'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {t(`viewMode.${m}`)}
          </button>
        );
      })}
    </div>
  );
}
