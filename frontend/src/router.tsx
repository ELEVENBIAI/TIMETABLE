import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdaptiveLayout } from '@/layouts/AdaptiveLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HealthPage } from '@/pages/HealthPage';
import { LoginPage } from '@/pages/LoginPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  // Öffentliche Auth-Pages
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/change-password',
    element: (
      <ProtectedRoute isChangePasswordRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },

  // Geschützte App-Routen
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdaptiveLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HealthPage /> },
      // Platzhalter — Inhalt kommt mit Folge-Issues (ELE-180+)
      { path: 'schedule', element: <Navigate to="/" replace /> },
      { path: 'templates', element: <Navigate to="/" replace /> },
      { path: 'data', element: <Navigate to="/" replace /> },
      { path: 'reports', element: <Navigate to="/" replace /> },
      { path: 'profile', element: <Navigate to="/" replace /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
