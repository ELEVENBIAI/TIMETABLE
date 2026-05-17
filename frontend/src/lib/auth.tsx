// Auth-Context-Stub. Speichert JWT in localStorage. Keine Login-UI hier — nur Persist + Read + Logout.
// Login-Form kommt mit eigenem Folge-Issue.

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

export interface AuthState {
  token: string | null;
  payload: JwtPayload | null;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readInitial(): AuthState {
  if (typeof localStorage === 'undefined') {
    return { token: null, payload: null, isAuthenticated: false };
  }
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return { token: null, payload: null, isAuthenticated: false };
  const payload = decodeJwt(token);
  if (!payload || isJwtExpired(payload)) {
    localStorage.removeItem(STORAGE_KEY);
    return { token: null, payload: null, isAuthenticated: false };
  }
  return { token, payload, isAuthenticated: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitial);

  const login = useCallback((token: string) => {
    const payload = decodeJwt(token);
    if (!payload || isJwtExpired(payload)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, token);
    setState({ token, payload, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, payload: null, isAuthenticated: false });
  }, []);

  // Cross-Tab-Sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setState(readInitial());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout]
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
