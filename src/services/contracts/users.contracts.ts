/**
 * Users service contract
 */

import type {
	BaseEntity,
	CreateInput,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export type UserRole = 'admin' | 'operator' | 'developer'
export type PermissionCode = string

export interface UserPermission extends BaseEntity {
	code: PermissionCode
	name: string
	description?: string
}

export interface UserRoleCatalogItem {
	key: UserRole
	label: string
	default_permissions: PermissionCode[]
}

export interface ManagedUser extends BaseEntity {
	email: string
	full_name: string
	first_name?: string
	last_name?: string
	phone?: string | null
	role: UserRole
	status?: 'active' | 'inactive'
	is_active?: boolean
	direct_permissions?: string[]
	effective_permissions?: string[]
	custom_permissions?: string[]
	custom_permission_ids?: string[]
	created_by?: string | null
	created_by_name?: string | null
	last_login?: string
	permissions?: UserPermission[]
	metadata?: Record<string, unknown>
}

export interface CreateUserInput extends CreateInput<ManagedUser> {
	email: string
	full_name?: string
	first_name?: string
	last_name?: string
	password: string
	role: UserRole
	is_active?: boolean
	phone?: string | null
	custom_permission_ids?: string[]
}

export interface UpdateUserInput extends UpdateInput<ManagedUser> {
	password?: string
	custom_permission_ids?: string[]
}

export interface UsersListParams extends ListParams {
	role?: UserRole
	status?: 'active' | 'inactive'
	is_active?: boolean
	search?: string
}

export interface IUsersService {
	// User operations
	listUsers(params?: UsersListParams): Promise<PaginatedResponse<ManagedUser>>
	getUserById(id: string): Promise<ManagedUser>
	createUser(input: CreateUserInput): Promise<ManagedUser>
	updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser>
	deleteUser(id: string): Promise<void>
	toggleUserActive(id: string): Promise<ManagedUser>

	// Permission operations
	listPermissions(): Promise<UserPermission[]>
	listRolesCatalog(): Promise<UserRoleCatalogItem[]>
	listUserPermissions(userId: string): Promise<UserPermission[]>
	grantPermission(userId: string, permissionCode: PermissionCode): Promise<void>
	revokePermission(
		userId: string,
		permissionCode: PermissionCode,
	): Promise<void>

	// Bulk operations
	bulkUpdateUsers(ids: string[], input: UpdateUserInput): Promise<ManagedUser[]>
	bulkDeleteUsers(ids: string[]): Promise<void>
}
