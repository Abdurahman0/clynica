import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AppRouteId } from '../config/routes';
import type { AppRole } from '../types/architecture';
import {
  canAccessRouteForUser,
  hasPermission as hasPermissionForUser,
  hasRole as hasRoleForUser,
  resolveDefaultLandingPathForUser,
} from './access-control';
import type { AuthSession, AuthenticatedUser, LoginInput, PermissionCode } from './types';
import {
  getAuthState,
  login as loginWithApi,
  logout as logoutFromApi,
  restoreSession,
  subscribeAuthState,
} from '../features/auth/auth-store';
import { getAccessToken, getRefreshToken } from '../lib/auth-storage';

interface AuthContextValue {
  currentUser: AuthenticatedUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<AuthenticatedUser>;
  logout: () => void;
  hasPermission: (permission: PermissionCode) => boolean;
  hasRole: (role: AppRole | readonly AppRole[]) => boolean;
  canAccessRoute: (routeId: AppRouteId) => boolean;
  resolveDefaultLandingPath: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [storeState, setStoreState] = useState(getAuthState);

  useEffect(() => {
    const unsubscribe = subscribeAuthState(setStoreState);
    void restoreSession();

    return unsubscribe;
  }, []);

  const currentUser = storeState.user;
  const isAuthenticated = storeState.isAuthenticated;
  const isBootstrapping = storeState.loading;

  const session = useMemo<AuthSession | null>(() => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!currentUser || !accessToken || !refreshToken) {
      return null;
    }

    const now = new Date().toISOString();
    return {
      accessToken,
      refreshToken,
      issuedAt: now,
      expiresAt: now,
      user: currentUser,
    };
  }, [currentUser]);

  const login = useCallback(async (input: LoginInput) => {
    return loginWithApi(input.username, input.password);
  }, []);

  const logout = useCallback(() => {
    logoutFromApi();
  }, []);

  const hasPermission = useCallback(
    (permission: PermissionCode) => hasPermissionForUser(currentUser, permission),
    [currentUser],
  );

  const hasRole = useCallback(
    (role: AppRole | readonly AppRole[]) => hasRoleForUser(currentUser, role),
    [currentUser],
  );

  const canAccessRoute = useCallback(
    (routeId: AppRouteId) => canAccessRouteForUser(currentUser, routeId),
    [currentUser],
  );

  const resolveDefaultLandingPath = useCallback(
    () => resolveDefaultLandingPathForUser(currentUser),
    [currentUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      session,
      isAuthenticated,
      isBootstrapping,
      login,
      logout,
      hasPermission,
      hasRole,
      canAccessRoute,
      resolveDefaultLandingPath,
    }),
    [
      currentUser,
      session,
      isAuthenticated,
      isBootstrapping,
      login,
      logout,
      hasPermission,
      hasRole,
      canAccessRoute,
      resolveDefaultLandingPath,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
