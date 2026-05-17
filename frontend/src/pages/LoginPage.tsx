import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FormError } from '@/components/FormError';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth-api';
import { getCurrentTenant } from '@/lib/theme';

export function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = getCurrentTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Bereits eingeloggt → direkt weg von /login
  if (auth.isAuthenticated) {
    const fromParam = new URLSearchParams(location.search).get('from');
    const fallback = auth.payload?.locale ? '/' : '/';
    return <Navigate to={fromParam ?? fallback} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      auth.login(res.token, { mustChangePassword: res.mustChangePassword });

      // must_change_password aus Backend-Response zwingt zum Wechsel
      if (res.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }

      // Original-Path aus ?from= oder Default /
      const fromParam = new URLSearchParams(location.search).get('from');
      navigate(fromParam ?? '/', { replace: true });
    } catch (err) {
      setError(err);
      setPassword(''); // Passwort-Feld leeren bei Fehler
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
          {/* Wortmarke + Tenant-Hint (subtil, typografisch) */}
          <div className="mb-6">
            <div className="text-title font-semibold">{t('common:appName')}</div>
            <div className="text-label capitalize text-text-muted">{tenant}</div>
          </div>

          <h1 className="mb-5 text-headline font-semibold">{t('auth:login.title')}</h1>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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

            <Input
              label={t('auth:login.password')}
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              rightSlot={
                <button
                  type="button"
                  aria-label={
                    showPassword ? t('auth:login.hidePassword') : t('auth:login.showPassword')
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-surface text-text-secondary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {error ? <FormError error={error} fallbackKey="auth.loginFailed" /> : null}

            <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
              {loading ? t('auth:login.submitting') : t('auth:login.submit')}
            </Button>

            <div className="text-center">
              <a
                href="/forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
                className="text-label text-text-secondary hover:text-text-primary"
              >
                {t('auth:login.forgotPassword')}
              </a>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
