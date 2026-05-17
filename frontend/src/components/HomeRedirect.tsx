// Role-aware Default-Landing (ELE-182).
// EMPLOYEE → Mobile-Tagesansicht. ADMIN/PLANNER/FOREMAN → Schedule-Page (Desktop-Wochenplan).
// Default-Fallback: SchedulePage (für unbekannte Rollen).

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { SchedulePage } from '@/pages/SchedulePage';

export function HomeRedirect() {
  const { payload } = useAuth();
  if (payload?.role === 'EMPLOYEE') {
    return <Navigate to="/today" replace />;
  }
  return <SchedulePage />;
}
