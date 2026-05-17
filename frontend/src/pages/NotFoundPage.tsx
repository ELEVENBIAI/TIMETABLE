import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation('errors');
  const { t: tCommon } = useTranslation('common');
  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 px-6 py-12">
      <h1 className="text-display font-semibold">{t('notFound')}</h1>
      <Link to="/" className="text-label text-brand-primary hover:text-brand-primary-hover">
        ← {tCommon('back')}
      </Link>
    </section>
  );
}
