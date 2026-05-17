import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FormError } from '@/components/FormError';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth-api';
import { getCurrentTenant } from '@/lib/theme';

export function ChangePasswordPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const auth = useAuth();
  const navigate = useNavigate();
  const tenant = getCurrentTenant();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [mismatch, setMismatch] = useState(false);

  if (!auth.isAuthenticated || !auth.payload) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMismatch(false);

    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }

    if (!auth.payload) return;

    setLoading(true);
    try {
      await authApi.changePassword(auth.payload.userId, {
        oldPassword,
        newPassword,
      });
      // Backend hat must_change_password auf false gesetzt. Persisted-Flag updaten,
      // sonst Endlos-Redirect durch ProtectedRoute.
      auth.clearMustChangePassword();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
      setOldPassword('');
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

          <h1 className="mb-2 text-headline font-semibold">{t('auth:changePassword.title')}</h1>
          {auth.payload?.userId && (
            <p className="mb-5 text-label text-text-secondary">{t('auth:changePassword.hint')}</p>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label={t('auth:changePassword.oldPassword')}
              type="password"
              name="oldPassword"
              autoComplete="current-password"
              autoFocus
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
            />

            <Input
              label={t('auth:changePassword.newPassword')}
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              hint={t('auth:changePassword.policy')}
            />

            <Input
              label={t('auth:changePassword.confirm')}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              error={mismatch ? t('auth:changePassword.mismatch') : undefined}
            />

            {error ? <FormError error={error} /> : null}

            <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
              {loading ? t('auth:changePassword.submitting') : t('auth:changePassword.submit')}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
