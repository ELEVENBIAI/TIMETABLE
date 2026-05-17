import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, User } from 'lucide-react';
import { getCurrentTenant } from '@/lib/theme';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

const TABS = [
  { to: '/today', icon: Clock, key: 'tabs.today' },
  { to: '/schedule', icon: CalendarDays, key: 'tabs.week' },
  { to: '/profile', icon: User, key: 'tabs.profile' },
] as const;

export function MobileLayout() {
  const { t } = useTranslation('common');
  const tenant = getCurrentTenant();

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text-primary">
      <header className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-3">
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="h-7 w-7 rounded-md bg-brand-primary" />
          <div className="leading-tight">
            <div className="text-title font-semibold">{t('appName')}</div>
            <div className="text-label capitalize text-text-muted">{tenant}</div>
          </div>
        </div>
        <LocaleSwitcher />
      </header>

      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.home')}
        className="fixed inset-x-0 bottom-0 z-10 flex items-stretch border-t border-border bg-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-label transition-colors',
                isActive ? 'text-brand-primary' : 'text-text-muted',
              ].join(' ')
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
