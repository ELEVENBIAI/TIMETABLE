import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { initI18n } from '@/lib/i18n';
import { applyTenantTheme } from '@/lib/theme';

beforeAll(async () => {
  await initI18n('en');
  applyTenantTheme('gepard');
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Welcome</div>
              </ProtectedRoute>
            }
          />
          <Route path="/change-password" element={<div data-testid="change-pw">Change PW</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('LoginPage', () => {
  it('rendert E-Mail + Passwort + Submit + Forgot-Link', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('zeigt Wortmarke + Tenant-Hint', () => {
    renderLogin();
    expect(screen.getByText('Timetable')).toBeInTheDocument();
    expect(screen.getByText('gepard')).toBeInTheDocument();
  });

  it('Show/Hide-Password-Toggle wechselt Input-Typ', async () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggle);
    expect(passwordInput.type).toBe('text');
  });

  it('zeigt Error wenn API 401 wirft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'UNAUTHORIZED', messageKey: 'auth.loginFailed', message: 'Login failed' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'a@b.local');
    await user.type(screen.getByLabelText(/^password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // FormError zeigt loginFailed-Text
      expect(screen.getByText(/email or password/i)).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute', () => {
  it('redirected zu /login wenn nicht authenticated', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div data-testid="protected-content">Welcome</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login here</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
