import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, isLocale } from '@/lib/i18n';

export function LocaleSwitcher() {
  const { i18n, t } = useTranslation('common');
  const current = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  return (
    <label className="flex items-center gap-2 text-label text-text-secondary">
      <span className="sr-only">{t('languageSwitcher')}</span>
      <select
        value={current}
        onChange={(e) => {
          void i18n.changeLanguage(e.target.value);
        }}
        className="rounded-sm border border-border bg-surface px-2 py-1 text-label text-text-primary focus:border-brand-primary focus:outline-none"
        aria-label={t('languageSwitcher')}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {locale.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
