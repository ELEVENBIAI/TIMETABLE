import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface UserMenuProps {
  /** Layout-Hint — kompakter Stil im Mobile-Profile-Tab, oder Sidebar-Footer Desktop */
  variant?: 'sidebar' | 'mobile';
}

export function UserMenu({ variant = 'sidebar' }: UserMenuProps) {
  const { t } = useTranslation(['auth', 'users']);
  const navigate = useNavigate();
  const { payload, logout } = useAuth();

  if (!payload) return null;

  const isSidebar = variant === 'sidebar';
  const roleLabel = t(`users:role.${payload.role}`, { defaultValue: payload.role });

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div
      className={
        isSidebar
          ? 'flex items-center justify-between gap-2'
          : 'flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-4'
      }
    >
      <div className="min-w-0">
        <div className="truncate text-label font-medium text-text-primary">
          {payload.userId.slice(0, 8)}
        </div>
        <div className="truncate text-label text-text-muted">{roleLabel}</div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label={t('auth:logout')}
        className="flex h-9 items-center gap-2 rounded-md px-3 text-label text-text-secondary hover:bg-surface hover:text-text-primary"
      >
        <LogOut size={14} aria-hidden="true" />
        <span>{t('auth:logout')}</span>
      </button>
    </div>
  );
}
