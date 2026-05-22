import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AppRouteConfig } from '../../config/routes';
import { routePaths } from '../../config/routes';
import { useAuth } from '../../auth';
import { getAccessToken } from '../../lib/auth-storage';

interface RouteGateProps extends PropsWithChildren {
  route: AppRouteConfig;
}

function RouteGate({ route, children }: RouteGateProps) {
  const location = useLocation();
  const {
    isAuthenticated,
    isBootstrapping,
    canAccessRoute,
    resolveDefaultLandingPath,
  } = useAuth();
  const hasAccessToken = Boolean(getAccessToken());

  if (route.access === 'public') {
    if (route.id === 'login' && hasAccessToken) {
      return <Navigate replace to={resolveDefaultLandingPath()} />;
    }

    return <>{children}</>;
  }

  if (isBootstrapping) {
    return (
      <main className="grid min-h-screen place-items-center bg-background-default p-6">
        <p className="text-sm font-semibold text-text-secondary">Loading session...</p>
      </main>
    );
  }

  // For protected routes, check for access token instead of isAuthenticated state
  // since the auth state subscription might be delayed
  if (!hasAccessToken) {
    return (
      <Navigate
        replace
        to={routePaths.login}
        state={{ from: location.pathname }}
      />
    );
  }

  if (!canAccessRoute(route.id)) {
    return <Navigate replace to={routePaths.accessDenied} />;
  }

  return <>{children}</>;
}

export default RouteGate;

