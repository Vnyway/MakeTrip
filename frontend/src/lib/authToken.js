const TOKEN_KEY = 'maketrip_token';

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseJwt(token) {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');

  try {
    const decoded = atob(normalized);
    return safeJsonParse(decoded);
  } catch {
    return null;
  }
}

export function getAuthSnapshotFromToken(token) {
  const payload = parseJwt(token);

  if (!payload?.sub) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  const exp = Number(payload.exp || 0);
  const now = Math.floor(Date.now() / 1000);
  if (exp && exp <= now) {
    return {
      isAuthenticated: false,
      user: null,
      token: null,
    };
  }

  return {
    isAuthenticated: true,
    token,
    user: {
      id: payload.sub,
      email: payload.email || '',
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    },
  };
}
