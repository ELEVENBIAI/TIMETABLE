import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdaptiveLayout } from '@/layouts/AdaptiveLayout';
import { HealthPage } from '@/pages/HealthPage';
import { LoginPlaceholder } from '@/pages/LoginPlaceholder';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPlaceholder />,
  },
  {
    path: '/',
    element: <AdaptiveLayout />,
    children: [
      { index: true, element: <HealthPage /> },
      // Platzhalter-Routes — Inhalt kommt mit Folge-Issues.
      { path: 'schedule', element: <Navigate to="/" replace /> },
      { path: 'templates', element: <Navigate to="/" replace /> },
      { path: 'data', element: <Navigate to="/" replace /> },
      { path: 'reports', element: <Navigate to="/" replace /> },
      { path: 'profile', element: <Navigate to="/" replace /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
