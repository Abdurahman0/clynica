export interface AuthTokens {
  access: string;
  refresh: string;
}

const ACCESS_TOKEN_KEY = 'renaissance-clinic-auth-access-token';
const REFRESH_TOKEN_KEY = 'renaissance-clinic-auth-refresh-token';
const LEGACY_SESSION_KEY = 'renaissance-clinic-auth-session-v1';

function readStorageValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return readStorageValue(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readStorageValue(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  } catch {
    // Ignore storage failures to avoid breaking in-memory auth flow.
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}
