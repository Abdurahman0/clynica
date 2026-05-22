import type { AuthSession } from './types';

const AUTH_STORAGE_KEY = 'renaissance-clinic-auth-session-v1';

function isValidSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<AuthSession>;
  const user = session.user;

  return (
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.issuedAt === 'string' &&
    typeof session.expiresAt === 'string' &&
    !!user &&
    typeof user === 'object' &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    Array.isArray(user.permissionKeys)
  );
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isValidSessionShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage write failures to keep in-memory auth usable.
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
