/**
 * Common service contracts and types
 */

export interface PaginationParams {
	page?: number
	page_size?: number
	limit?: number
	offset?: number
}

export interface PaginatedResponse<T> {
	items: T[]
	total: number
	page?: number
	page_size?: number
	count?: number
	next?: string | null
	previous?: string | null
}

export interface ListParams extends PaginationParams {
	search?: string
	ordering?: string
	[key: string]: unknown
}

export interface ApiErrorResponse {
	detail?: string
	message?: string
	errors?: Record<string, string[]>
	code?: string
}

export class ServiceError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public errorData?: ApiErrorResponse,
	) {
		super(message)
		this.name = 'ServiceError'
	}
}

export interface BaseEntity {
	id: string
	created_at?: string
	updated_at?: string
}

export type CreateInput<T> = {
	[K in keyof T]?: T[K]
}

export type UpdateInput<T> = {
	[K in keyof T]?: T[K]
}
