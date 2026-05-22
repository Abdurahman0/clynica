/**
 * Base CRUD adapter for reusable service implementations
 */

import { ApiRequestor } from './api-requestor'
import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
	CreateInput,
	UpdateInput,
} from '../../contracts'

export interface CrudAdapterConfig {
	endpoint: string
	baseUrl: string
}

export abstract class BaseCrudAdapter<
	T extends BaseEntity,
	ListP extends ListParams = ListParams,
	CreateI extends CreateInput<T> = CreateInput<T>,
	UpdateI extends UpdateInput<T> = UpdateInput<T>,
> {
	protected requestor: ApiRequestor
	protected endpoint: string

	constructor(config: CrudAdapterConfig) {
		this.requestor = new ApiRequestor(config.baseUrl)
		this.endpoint = config.endpoint
	}

	async list(params?: ListP): Promise<PaginatedResponse<T>> {
		return this.requestor.get<PaginatedResponse<T>>(
			this.endpoint,
			params as Record<string, unknown>,
		)
	}

	async get(id: string): Promise<T> {
		return this.requestor.get<T>(`${this.endpoint}${id}/`)
	}

	async create(input: CreateI): Promise<T> {
		return this.requestor.post<T>(this.endpoint, input)
	}

	async update(id: string, input: UpdateI): Promise<T> {
		return this.requestor.patch<T>(`${this.endpoint}${id}/`, input)
	}

	async delete(id: string): Promise<void> {
		await this.requestor.delete(`${this.endpoint}${id}/`)
	}
}
