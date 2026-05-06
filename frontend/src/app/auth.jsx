import { createContext, useContext, useMemo, useState } from 'react';
import {
  clearStoredToken,
  getAuthSnapshotFromToken,
  getStoredToken,
  setStoredToken,
} from '../lib/authToken';

const AuthContext = createContext(null);

const initialSnapshot = getAuthSnapshotFromToken(getStoredToken());

export function AuthProvider({ children }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  function loginWithToken(token) {
    setStoredToken(token);
    setSnapshot(getAuthSnapshotFromToken(token));
  }

  function logout() {
    clearStoredToken();
    setSnapshot({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  }

  const value = useMemo(
    () => ({
      ...snapshot,
      loginWithToken,
      logout,
      isAdmin: snapshot.user?.roles?.includes('admin') || false,
    }),
    [snapshot],
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
