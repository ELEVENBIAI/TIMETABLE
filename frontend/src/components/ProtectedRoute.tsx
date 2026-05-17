import { Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  /** True wenn die Route der Change-Password-Page entspricht (kein Forced-Redirect). */
  isChangePasswordRoute?: boolean;
}

/**
 * Wrappt geschützte Routes. Verhalten:
 * - Kein JWT → Redirect /login?from=<originalPath>
 * - JWT vorhanden + mustChangePassword=true + Aufruf NICHT auf /change-password
 *   → Redirect /change-password (forced flow)
 * - sonst rendern
 */
export function ProtectedRoute({ children, isChangePasswordRoute = false }: ProtectedRouteProps) {
  const { isAuthenticated, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  if (mustChangePassword && !isChangePasswordRoute) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}
