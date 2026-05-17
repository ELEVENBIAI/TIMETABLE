import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { MobileLayout } from '@/layouts/MobileLayout';
import { initI18n } from '@/lib/i18n';
import { applyTenantTheme } from '@/lib/theme';

beforeAll(async () => {
  await initI18n('en');
  applyTenantTheme('gepard');
});

function renderInsideRoute(element: JSX.Element) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={element}>
            <Route index element={<main data-testid="content">Hello</main>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('DesktopLayout', () => {
  it('renders sidebar with brand mark and all primary nav items', () => {
    renderInsideRoute(<DesktopLayout />);
    expect(screen.getByTestId('brand-mark')).toBeInTheDocument();
    expect(screen.getByText('Timetable')).toBeInTheDocument();
    expect(screen.getByText('gepard')).toBeInTheDocument();
    // Nav items aus common.json
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Home')).toBeInTheDocument();
    expect(within(nav).getByText('Schedule')).toBeInTheDocument();
    expect(within(nav).getByText('Templates')).toBeInTheDocument();
    expect(within(nav).getByText('Data')).toBeInTheDocument();
    expect(within(nav).getByText('Reports')).toBeInTheDocument();
  });

  it('renders child content via <Outlet>', () => {
    renderInsideRoute(<DesktopLayout />);
    expect(screen.getByTestId('content')).toHaveTextContent('Hello');
  });
});

describe('MobileLayout', () => {
  it('renders header and bottom tabs', () => {
    renderInsideRoute(<MobileLayout />);
    expect(screen.getByText('Timetable')).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Today')).toBeInTheDocument();
    expect(within(nav).getByText('Week')).toBeInTheDocument();
    expect(within(nav).getByText('Profile')).toBeInTheDocument();
  });
});

describe('Theme resolution', () => {
  it('applies data-tenant attribute to <html>', () => {
    applyTenantTheme('immobilienbutler');
    expect(document.documentElement.dataset.tenant).toBe('immobilienbutler');
    applyTenantTheme('gepard');
    expect(document.documentElement.dataset.tenant).toBe('gepard');
  });
});
