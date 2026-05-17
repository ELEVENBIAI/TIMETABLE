// Auth-Context (ELE-199 + ELE-200). Speichert JWT in localStorage + flüchtigen Self-State.
// must_change_password ist NICHT im JWT-Payload — wird separat aus Login-Response persistiert,
// damit Page-Reloads den Forced-Change-Flow nicht verlieren.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { decodeJwt, isJwtExpired, type JwtPayload } from './jwt';

const STORAGE_KEY = 'timetable.jwt';
const FLAGS_KEY = 'timetable.auth.flags';

interface PersistedFlags {
  mustChangePassword?: boolean;
}

export interface AuthState {
  token: string | null;
  payload: JwtPayload | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (token: string, options?: { mustChangePassword?: boolean }) => void;
  logout: () => void;
  /** Markiert das Passwort als gewechselt → mustChangePassword wird false */
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readFlags(): PersistedFlags {
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem(FLAGS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PersistedFlags;
  } catch {
    return {};
  }
}

function writeFlags(flags: PersistedFlags): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

function clearFlags(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(FLAGS_KEY);
}

function readInitial(): AuthState {
  if (typeof localStorage === 'undefined') {
    return { token: null, payload: null, isAuthenticated: false, mustChangePassword: false };
  }
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    return { token: null, payload: null, isAuthenticated: false, mustChangePassword: false };
  }
  const payload = decodeJwt(token);
  if (!payload || isJwtExpired(payload)) {
    localStorage.removeItem(STORAGE_KEY);
    clearFlags();
    return { token: null, payload: null, isAuthenticated: false, mustChangePassword: false };
  }
  const flags = readFlags();
  return {
    token,
    payload,
    isAuthenticated: true,
    mustChangePassword: flags.mustChangePassword === true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitial);

  const login = useCallback((token: string, options?: { mustChangePassword?: boolean }) => {
    const payload = decodeJwt(token);
    if (!payload || isJwtExpired(payload)) return;
    localStorage.setItem(STORAGE_KEY, token);
    const mustChange = options?.mustChangePassword === true;
    writeFlags({ mustChangePassword: mustChange });
    setState({ token, payload, isAuthenticated: true, mustChangePassword: mustChange });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    clearFlags();
    setState({ token: null, payload: null, isAuthenticated: false, mustChangePassword: false });
  }, []);

  const clearMustChangePassword = useCallback(() => {
    writeFlags({ mustChangePassword: false });
    setState((s) => ({ ...s, mustChangePassword: false }));
  }, []);

  // Cross-Tab-Sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== FLAGS_KEY) return;
      setState(readInitial());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, clearMustChangePassword }),
    [state, login, logout, clearMustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
