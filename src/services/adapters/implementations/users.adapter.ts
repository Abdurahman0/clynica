/**
 * Users service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import { ApiRequestor } from './api-requestor'
import { PERMISSION_CODES } from '../../../auth/types'
import type {
	CreateUserInput,
	IUsersService,
	ManagedUser,
	PermissionCode,
	PaginatedResponse,
	UpdateUserInput,
	UserPermission,
	UserRoleCatalogItem,
	UsersListParams,
} from '../../contracts'

type UnknownRecord = Record<string, unknown>

function toRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value as UnknownRecord
}

function toStringValue(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim()
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}

	return ''
}

function toBooleanValue(value: unknown, fallback = false): boolean {
	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (normalized === 'true') {
			return true
		}
		if (normalized === 'false') {
			return false
		}
	}

	return fallback
}

function toUserRole(value: unknown): ManagedUser['role'] {
	if (value === 'developer' || value === 'admin' || value === 'operator') {
		return value
	}

	return 'operator'
}

function splitFullName(
	fullName: string,
): { firstName: string; lastName: string } {
	const trimmed = fullName.trim()
	if (!trimmed) {
		return { firstName: '', lastName: '' }
	}

	const parts = trimmed.split(/\s+/)
	const firstName = parts[0] ?? ''
	const lastName = parts.slice(1).join(' ')
	return {
		firstName,
		lastName,
	}
}

function resolveFullName(payload: UnknownRecord): string {
	const explicit =
		toStringValue(payload.full_name) ||
		toStringValue(payload.fullName) ||
		toStringValue(payload.name)
	if (explicit) {
		return explicit
	}

	const firstName = toStringValue(payload.first_name)
	const lastName = toStringValue(payload.last_name)
	const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
	if (combined) {
		return combined
	}

	return (
		toStringValue(payload.username) ||
		toStringValue(payload.email) ||
		'N/A'
	)
}

function normalizePermissionCodes(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return []
	}

	const unique = new Set<string>()

	value.forEach(permission => {
		if (typeof permission === 'string') {
			const code = permission.trim()
			if (code) {
				unique.add(code)
			}
			return
		}

		const record = toRecord(permission)
		if (!record) {
			return
		}

		const permissionCode =
			toStringValue(record.code) ||
			toStringValue(record.id) ||
			toStringValue(record.permission_code)

		if (permissionCode) {
			unique.add(permissionCode)
		}
	})

	return Array.from(unique)
}

function mapUserPayload(value: unknown): ManagedUser | null {
	const payload = toRecord(value)
	if (!payload) {
		return null
	}

	const id = toStringValue(payload.id)
	if (!id) {
		return null
	}

	const permissionCodes = normalizePermissionCodes(
		payload.custom_permissions ??
			payload.custom_permission_ids ??
			payload.permissions,
	)
	const fullName = resolveFullName(payload)

	return {
		id,
		email: toStringValue(payload.email),
		full_name: fullName,
		phone: toStringValue(payload.phone) || null,
		role: toUserRole(payload.role),
		is_active: toBooleanValue(payload.is_active, true),
		custom_permissions: permissionCodes,
		custom_permission_ids: permissionCodes,
		created_by: toStringValue(payload.created_by) || null,
		created_by_name: toStringValue(payload.created_by_name) || null,
		created_at: toStringValue(payload.created_at) || undefined,
		updated_at: toStringValue(payload.updated_at) || undefined,
	}
}

function parseListResponse(
	data: unknown,
	params?: UsersListParams,
): PaginatedResponse<ManagedUser> {
	const payload = toRecord(data) ?? {}
	const rawItems = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []

	const items = rawItems
		.map(entry => mapUserPayload(entry))
		.filter((entry): entry is ManagedUser => entry !== null)
	const count = typeof payload.count === 'number' ? payload.count : items.length

	return {
		items,
		total: count,
		page: params?.page,
		page_size: params?.page_size,
		count,
		next: typeof payload.next === 'string' ? payload.next : null,
		previous: typeof payload.previous === 'string' ? payload.previous : null,
	}
}

function parseSingleUserResponse(data: unknown): ManagedUser | null {
	const payload = toRecord(data)
	if (!payload) {
		return null
	}

	if (payload.data !== undefined) {
		return mapUserPayload(payload.data)
	}

	return mapUserPayload(payload)
}

function toMutationPayload(
	input: CreateUserInput | UpdateUserInput,
): Record<string, unknown> {
	const fullName = typeof input.full_name === 'string' ? input.full_name : ''
	const { firstName, lastName } = splitFullName(fullName)
	const permissions = Array.isArray(input.custom_permission_ids)
		? input.custom_permission_ids
		: []

	const payload: Record<string, unknown> = {
		email: input.email,
		role: input.role,
		is_active: input.is_active,
		is_staff: input.role === 'developer' || input.role === 'admin',
		permissions,
		first_name: firstName || null,
		last_name: lastName || null,
	}

	const usernameCandidate =
		toStringValue((input as Record<string, unknown>).username) ||
		toStringValue(input.email)
	if (usernameCandidate) {
		payload.username = usernameCandidate
	}

	if (typeof input.password === 'string' && input.password.trim().length > 0) {
		payload.password = input.password
	}

	return payload
}

function toPermissionName(code: string): string {
	return code
		.replace(/^can_/, '')
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}

function parsePermissionCatalogResponse(value: unknown): UserPermission[] {
	const payload = toRecord(value)
	const rawItems = Array.isArray(value)
		? value
		: Array.isArray(payload?.results)
			? payload.results
			: Array.isArray(payload?.items)
				? payload.items
				: Array.isArray(payload?.permissions)
					? payload.permissions
					: Array.isArray(payload?.data)
						? payload.data
						: []

	const items: UserPermission[] = []
	const seen = new Set<string>()

	rawItems.forEach(entry => {
		const record = toRecord(entry)
		if (!record) {
			return
		}

		const code =
			toStringValue(record.code) ||
			toStringValue(record.key) ||
			toStringValue(record.permission) ||
			toStringValue(record.permission_code)
		if (!code) {
			return
		}

		const id = toStringValue(record.id) || code
		if (seen.has(id)) {
			return
		}

		const name =
			toStringValue(record.label) ||
			toStringValue(record.name) ||
			toPermissionName(code)
		const description =
			toStringValue(record.description) ||
			toStringValue(record.details)

		items.push({
			id,
			code: code as PermissionCode,
			name,
			description,
		})
		seen.add(id)
	})

	return items
}

const DEFAULT_ROLES_CATALOG: UserRoleCatalogItem[] = [
	{
		key: 'developer',
		label: 'Developer',
		default_permissions: [...PERMISSION_CODES],
	},
	{
		key: 'admin',
		label: 'Admin',
		default_permissions: [
			'can_view_dashboard',
			'can_view_clients',
			'can_manage_clients',
			'can_access_chats',
			'can_manage_users',
		],
	},
	{
		key: 'operator',
		label: 'Operator',
		default_permissions: [
			'can_view_dashboard',
			'can_view_clients',
			'can_access_chats',
		],
	},
]

export class UsersAdapter
	extends BaseCrudAdapter<
		ManagedUser,
		UsersListParams,
		CreateUserInput,
		UpdateUserInput
	>
	implements IUsersService
{
	constructor(baseUrl: string) {
		super({
			endpoint: '/api/users/',
			baseUrl,
		})
	}

	// User operations
	async listUsers(
		params?: UsersListParams,
	): Promise<PaginatedResponse<ManagedUser>> {
		const data = await this.requestor.get<unknown>(
			this.endpoint,
			params as Record<string, unknown>,
		)
		return parseListResponse(data, params)
	}

	async getUserById(id: string): Promise<ManagedUser> {
		const data = await this.requestor.get<unknown>(`${this.endpoint}${id}/`)
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('User not found')
		}
		return mapped
	}

	async createUser(input: CreateUserInput): Promise<ManagedUser> {
		const data = await this.requestor.post<unknown>(
			this.endpoint,
			toMutationPayload(input),
		)
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('Failed to create user')
		}
		return mapped
	}

	async updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
		const data = await this.requestor.patch<unknown>(
			`${this.endpoint}${id}/`,
			toMutationPayload(input),
		)
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('Failed to update user')
		}
		return mapped
	}

	async deleteUser(id: string): Promise<void> {
		return this.delete(id)
	}

	async toggleUserActive(id: string): Promise<ManagedUser> {
		const currentUser = await this.getUserById(id)
		const data = await this.requestor.patch<unknown>(`${this.endpoint}${id}/`, {
			is_active: !Boolean(currentUser.is_active),
		})
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('Failed to toggle user status')
		}
		return mapped
	}

	// Permission operations
	async listPermissions(): Promise<UserPermission[]> {
		const candidates = [
			'/api/users/permissions/',
			'/api/auth/all-permissions/',
			'/api/auth/permissions/catalog/',
			'/api/auth/permissions/',
		] as const

		for (const path of candidates) {
			try {
				const data = await this.requestor.get<unknown>(path)
				const mapped = parsePermissionCatalogResponse(data)
				if (mapped.length > 0) {
					return mapped
				}
			} catch {
				// Try next endpoint candidate.
			}
		}

		return []
	}

	async listRolesCatalog(): Promise<UserRoleCatalogItem[]> {
		return DEFAULT_ROLES_CATALOG
	}

	async listUserPermissions(userId: string): Promise<UserPermission[]> {
		const user = await this.getUserById(userId)
		const codes = normalizePermissionCodes(
			user.custom_permission_ids ?? user.custom_permissions ?? [],
		)
		return codes.map(code => ({
			id: code,
			code,
			name: toPermissionName(code),
		}))
	}

	async grantPermission(
		_userId: string,
		_permissionCode: PermissionCode,
	): Promise<void> {
		throw new Error(
			'Permission grant endpoint is not available in current backend API schema.',
		)
	}

	async revokePermission(
		_userId: string,
		_permissionCode: PermissionCode,
	): Promise<void> {
		throw new Error(
			'Permission revoke endpoint is not available in current backend API schema.',
		)
	}

	// Bulk operations
	async bulkUpdateUsers(
		ids: string[],
		input: UpdateUserInput,
	): Promise<ManagedUser[]> {
		return Promise.all(ids.map(id => this.updateUser(id, input)))
	}

	async bulkDeleteUsers(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteUser(id)))
	}
}
