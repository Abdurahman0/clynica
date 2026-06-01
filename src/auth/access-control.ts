import { routePaths } from '../config/routes'
import type { AppRouteId } from '../config/routes'
import type { AppRole } from '../types/architecture'
import type { AuthenticatedUser, PermissionCode } from './types'

// Renaissance Clinic - Route to Permission Mapping
const ROUTE_REQUIRED_PERMISSIONS: Partial<Record<AppRouteId, PermissionCode>> =
	{
		clients: 'can_view_clients',
		chats: 'can_access_chats',
		tasks: 'can_view_tasks',
		users: 'can_view_users',
		integrations: 'can_manage_integrations',
		'ai-settings': 'can_view_settings',
	}

const IMPLIED_PERMISSIONS: Partial<Record<PermissionCode, PermissionCode[]>> = {
	can_access_chats: ['can_view_conversations', 'can_manage_conversations'],
	can_view_conversations: ['can_manage_conversations'],
	can_view_clients: ['can_manage_clients'],
	can_view_bookings: ['can_manage_bookings'],
	can_view_products: ['can_manage_products'],
	can_view_contracts: ['can_manage_contracts'],
	can_view_users: ['can_manage_users'],
	can_view_statuses: ['can_manage_statuses'],
	can_view_tasks: ['can_manage_tasks'],
	can_view_task_statuses: ['can_manage_task_statuses'],
	can_view_settings: [
		'can_manage_settings',
		'can_manage_ai_settings',
		'can_manage_integrations',
	],
	can_view_logs: ['can_view_audit_logs'],
}

const PUBLIC_ROUTE_IDS = new Set<AppRouteId>([
	'home',
	'login',
	'access-denied',
	'not-found',
])

const MODULE_PATH_BY_ROUTE_ID: Record<string, string> = {
	dashboard: routePaths.dashboard,
	clients: routePaths.clients,
	chats: routePaths.chats,
	tasks: routePaths.tasks,
	users: routePaths.users,
	integrations: routePaths.integrations,
	'ai-settings': routePaths['ai-settings'],
}

export function hasRole(
	user: AuthenticatedUser | null,
	role: AppRole | readonly AppRole[],
): boolean {
	if (!user) {
		return false
	}

	if (Array.isArray(role)) {
		return role.includes(user.role)
	}

	return user.role === role
}

export function hasPermission(
	user: AuthenticatedUser | null,
	permission: PermissionCode,
): boolean {
	if (!user) {
		return false
	}

	if (user.role === 'developer') {
		return true
	}

	const hasDirectPermission = user.permissionKeys.includes(permission)
	if (hasDirectPermission) {
		return true
	}

	const impliedBy = IMPLIED_PERMISSIONS[permission] ?? []
	return impliedBy.some(candidate => user.permissionKeys.includes(candidate))
}

export function canAccessRouteForUser(
	user: AuthenticatedUser | null,
	routeId: AppRouteId,
): boolean {
	if (PUBLIC_ROUTE_IDS.has(routeId)) {
		return true
	}

	if (!user) {
		return false
	}

	if (user.role === 'developer') {
		return true
	}

	if (routeId === 'profile') {
		return true
	}

	// Dashboard is intentionally visible to every authenticated user.
	if (routeId === 'dashboard') {
		return true
	}

	const requiredPermission = ROUTE_REQUIRED_PERMISSIONS[routeId]
	if (!requiredPermission) {
		return false
	}

	return hasPermission(user, requiredPermission)
}

export function resolveDefaultLandingPathForUser(
	user: AuthenticatedUser | null,
): string {
	if (!user) {
		return routePaths.login
	}

	return routePaths.dashboard
}
