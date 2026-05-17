import { useTranslation } from 'react-i18next';

export function LoginPlaceholder() {
  const { t } = useTranslation('auth');
  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-display font-semibold">{t('login.title')}</h1>
      <p className="mt-3 text-body text-text-secondary">{t('login.placeholder')}</p>
    </section>
  );
}
