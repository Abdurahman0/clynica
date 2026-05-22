import { moduleMap } from './module-map';
import type {
  AccessStrategy,
  AppModule,
  AppRole,
  ModuleCategory,
} from '../types/architecture';

export type RouteAccess = 'public' | 'protected';

export type AppRouteId =
  | 'home'
  | 'login'
  | 'access-denied'
  | 'not-found'
  | AppModule['id'];

export interface AppRouteConfig {
  id: AppRouteId;
  path: string;
  title: string;
  description: string;
  access: RouteAccess;
  showInNavigation: boolean;
  moduleId?: AppModule['id'];
  moduleCategory?: ModuleCategory;
  allowedRoles?: AppRole[];
  accessStrategy?: AccessStrategy;
}

type ModuleRootPaths = Record<AppModule['id'], string>;

type RoutePaths = {
  root: '/';
  login: '/login';
  accessDenied: '/access-denied';
  notFound: '*';
} & ModuleRootPaths;

export const moduleRootPaths = moduleMap.reduce<ModuleRootPaths>((paths, module) => {
  paths[module.id] = module.pages[0]?.path ?? `/${module.id}`;
  return paths;
}, {} as ModuleRootPaths);

export const routePaths: RoutePaths = {
  root: '/',
  login: '/login',
  accessDenied: '/access-denied',
  notFound: '*',
  ...moduleRootPaths,
} as const;

export const publicRoutes: AppRouteConfig[] = [
  {
    id: 'home',
    path: routePaths.root,
    title: 'Home',
    description: 'Entry route that will later redirect based on session state.',
    access: 'public',
    showInNavigation: false,
  },
  {
    id: 'login',
    path: routePaths.login,
    title: 'Login',
    description: 'Authentication entry point placeholder.',
    access: 'public',
    showInNavigation: false,
  },
  {
    id: 'access-denied',
    path: routePaths.accessDenied,
    title: 'Access Denied',
    description: 'Unauthorized access fallback placeholder.',
    access: 'public',
    showInNavigation: false,
  },
];

export const moduleRoutes: AppRouteConfig[] = moduleMap.map((module) => ({
  id: module.id,
  path: moduleRootPaths[module.id],
  title: module.label,
  description: module.description,
  access: 'protected',
  showInNavigation: true,
  moduleId: module.id,
  moduleCategory: module.category,
  allowedRoles: module.allowedRoles,
  accessStrategy: module.accessStrategy,
}));

export const fallbackRoutes: AppRouteConfig[] = [
  {
    id: 'not-found',
    path: routePaths.notFound,
    title: 'Not Found',
    description: 'Fallback route for unknown paths.',
    access: 'public',
    showInNavigation: false,
  },
];

export const appRoutes: AppRouteConfig[] = [
  ...publicRoutes,
  ...moduleRoutes,
  ...fallbackRoutes,
];

export const navigationRoutes = moduleRoutes.filter((route) => route.showInNavigation);

const routeMap = new Map(appRoutes.map((route) => [route.id, route]));

export function getRouteById(id: AppRouteId): AppRouteConfig {
  const route = routeMap.get(id);

  if (!route) {
    throw new Error(`Unknown route id: ${id}`);
  }

  return route;
}

export function getRouteByPathname(pathname: string): AppRouteConfig | undefined {
  return appRoutes.find((route) => {
    if (route.path === '*') {
      return false;
    }

    if (route.path === '/') {
      return pathname === route.path;
    }

    return pathname === route.path || pathname.startsWith(`${route.path}/`);
  });
}
