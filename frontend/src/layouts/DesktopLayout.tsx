import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ClipboardList, Database, FileBarChart, Home, User } from 'lucide-react';
import { getCurrentTenant } from '@/lib/theme';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { to: '/', icon: Home, key: 'nav.home' },
  { to: '/schedule', icon: Calendar, key: 'nav.schedule' },
  { to: '/templates', icon: ClipboardList, key: 'nav.templates' },
  { to: '/data', icon: Database, key: 'nav.data' },
  { to: '/reports', icon: FileBarChart, key: 'nav.reports' },
] as const;

export function DesktopLayout() {
  const { t } = useTranslation('common');
  const auth = useAuth();
  const tenant = getCurrentTenant();

  return (
    <div className="flex min-h-screen bg-surface text-text-primary">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-sunken">
        <div className="flex items-center gap-3 px-5 py-5">
          <div
            aria-hidden="true"
            className="h-8 w-8 rounded-md bg-brand-primary"
            data-testid="brand-mark"
          />
          <div>
            <div className="text-title font-semibold">{t('appName')}</div>
            <div className="text-label capitalize text-text-muted">{tenant}</div>
          </div>
        </div>

        <nav aria-label={t('nav.home')} className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-label transition-colors',
                  isActive
                    ? 'bg-brand-primary text-brand-on-primary'
                    : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                ].join(' ')
              }
            >
              <Icon size={16} aria-hidden="true" />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
          <NavLink
            to="/profile"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-label text-text-secondary hover:bg-surface hover:text-text-primary"
          >
            <User size={16} aria-hidden="true" />
            <span>{auth.payload?.userId ? t('nav.profile') : t('nav.profile')}</span>
          </NavLink>
          <LocaleSwitcher />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
