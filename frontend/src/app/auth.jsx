import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredToken,
  getAuthSnapshotFromToken,
  getStoredToken,
  setStoredToken,
} from '../lib/authToken';
import { meRequest } from '../features/auth/auth.api';

const AuthContext = createContext(null);

function normalizeServerUser(user, fallback) {
  if (!user) return fallback || null;

  return {
    id: user.id || fallback?.id || null,
    email: user.email || fallback?.email || '',
    roles: Array.isArray(user.roles) ? user.roles : fallback?.roles || [],
  };
}

function createSessionFromToken(token, userOverride) {
  const base = getAuthSnapshotFromToken(token);

  if (!base.isAuthenticated) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  return {
    isAuthenticated: true,
    token,
    user: normalizeServerUser(userOverride, base.user),
  };
}

export function AuthProvider({ children }) {
  const storedToken = getStoredToken();
  const initial = createSessionFromToken(storedToken, null);

  const [state, setState] = useState({
    ...initial,
    isBootstrapping: Boolean(initial.isAuthenticated),
  });

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!initial.isAuthenticated) {
        if (active) {
          setState((prev) => ({ ...prev, isBootstrapping: false }));
        }
        return;
      }

      try {
        const data = await meRequest();
        const nextToken = getStoredToken();

        if (!active || !nextToken) return;

        const session = createSessionFromToken(nextToken, data?.user || null);
        setState({
          ...session,
          isBootstrapping: false,
        });
      } catch {
        if (!active) return;

        clearStoredToken();
        setState({
          isAuthenticated: false,
          user: null,
          token: null,
          isBootstrapping: false,
        });
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [initial.isAuthenticated]);

  function loginWithToken(token, user) {
    setStoredToken(token);
    const session = createSessionFromToken(token, user);

    setState({
      ...session,
      isBootstrapping: false,
    });
  }

  function logout() {
    clearStoredToken();
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      isBootstrapping: false,
    });
  }

  async function refreshCurrentUser() {
    if (!state.isAuthenticated) return null;

    const data = await meRequest();
    const token = getStoredToken();

    if (!token) return null;

    const session = createSessionFromToken(token, data?.user || null);
    setState((prev) => ({
      ...prev,
      ...session,
      isBootstrapping: false,
    }));

    return session.user;
  }

  const value = useMemo(
    () => ({
      ...state,
      loginWithToken,
      logout,
      refreshCurrentUser,
      isAdmin: state.user?.roles?.includes('admin') || false,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
