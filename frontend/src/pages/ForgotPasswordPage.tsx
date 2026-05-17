import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FormError } from '@/components/FormError';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { authApi } from '@/lib/auth-api';
import { getCurrentTenant } from '@/lib/theme';

export function ForgotPasswordPage() {
  const { t } = useTranslation(['auth', 'common']);
  const tenant = getCurrentTenant();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      // Backend antwortet immer 200 (Anti-Enumeration) — wir zeigen IMMER Success-Message.
      setSubmitted(true);
    } catch (err) {
      // Nur bei echten Netzwerk-/5xx-Fehlern.
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text-primary">
      <header className="flex justify-end p-4">
        <LocaleSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <section className="w-full max-w-[360px] rounded-md border border-border bg-surface-raised p-6 md:p-8">
          <div className="mb-6">
            <div className="text-title font-semibold">{t('common:appName')}</div>
            <div className="text-label capitalize text-text-muted">{tenant}</div>
          </div>

          <h1 className="mb-5 text-headline font-semibold">{t('auth:forgotPassword.title')}</h1>

          {submitted ? (
            <div className="flex flex-col gap-4">
              <p className="text-body text-text-primary">{t('auth:forgotPassword.success')}</p>
              <Link to="/login" className="text-label text-text-secondary hover:text-text-primary">
                ← {t('auth:forgotPassword.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <p className="text-label text-text-secondary">{t('auth:forgotPassword.intro')}</p>

              <Input
                label={t('auth:login.email')}
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              {error ? <FormError error={error} /> : null}

              <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
                {loading ? t('auth:forgotPassword.submitting') : t('auth:forgotPassword.submit')}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-label text-text-secondary hover:text-text-primary"
                >
                  ← {t('auth:forgotPassword.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
