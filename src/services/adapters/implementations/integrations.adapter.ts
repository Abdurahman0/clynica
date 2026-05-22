/**
 * Integrations service adapter implementation
 */

import { ApiRequestor } from './api-requestor'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	return value as UnknownRecord
}

function asString(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'number' && Number.isFinite(value)) return String(value)
	return ''
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') return value
	return fallback
}

function parseEncodedValue(raw: unknown): UnknownRecord {
	const text = asString(raw)
	if (!text) return {}
	try {
		const parsed = JSON.parse(text)
		return asRecord(parsed) ?? {}
	} catch {
		return {}
	}
}

function splitKey(rawKey: string): { provider: string; key: string } {
	const [provider, ...rest] = rawKey.split(':')
	if (!provider || rest.length === 0) {
		return { provider: 'telegram', key: rawKey || 'config' }
	}
	return { provider, key: rest.join(':') }
}

function mapConfig(value: unknown): any {
	const record = asRecord(value) ?? {}
	const rawKey = asString(record.key)
	const { provider, key } = splitKey(rawKey)
	const encoded = parseEncodedValue(record.value)

	return {
		id: asString(record.id),
		created_at: asString(record.updated_at),
		updated_at: asString(record.updated_at),
		provider: (asString(encoded.provider) || provider || 'telegram') as any,
		key: asString(encoded.key) || key,
		label: asString(encoded.label) || key,
		value: asString(encoded.value || record.value),
		is_secret: asBoolean(encoded.is_secret, true),
		is_active: asBoolean(encoded.is_active, true),
		updated_by: asString(record.updated_by) || null,
		updated_by_name: null,
	}
}

function packPayload(input: any): UnknownRecord {
	const provider = asString(input?.provider || 'telegram')
	const key = asString(input?.key)
	return {
		key: `${provider}:${key}`,
		value: JSON.stringify({
			provider,
			key,
			label: asString(input?.label),
			value: asString(input?.value),
			is_secret: asBoolean(input?.is_secret, true),
			is_active: asBoolean(input?.is_active, true),
		}),
	}
}

function toMeta(totalItems: number, page: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)))
	return { page, pageSize, totalItems, totalPages }
}

export class IntegrationsAdapter {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async listConfigs(params: any = {}): Promise<any> {
		const page = typeof params.page === 'number' ? params.page : 1
		const pageSize =
			typeof params.page_size === 'number'
				? params.page_size
				: typeof params.pageSize === 'number'
					? params.pageSize
					: 10
		const response = await this.requestor.get<unknown>('/api/settings/integrations/', {
			page,
			page_size: pageSize,
			search: params.search,
			provider: params.provider,
			is_active: params.is_active,
			is_secret: params.is_secret,
			ordering: params.ordering,
			sortBy: params.sortBy,
			sortDirection: params.sortDirection,
		})
		const record = asRecord(response) ?? {}
		const rawItems = Array.isArray(record.items)
			? record.items
			: Array.isArray(record.results)
				? record.results
				: []
		let items = rawItems.map(mapConfig)

		if (params.provider) {
			items = items.filter(item => item.provider === params.provider)
		}
		if (typeof params.is_active === 'boolean') {
			items = items.filter(item => item.is_active === params.is_active)
		}
		if (typeof params.is_secret === 'boolean') {
			items = items.filter(item => item.is_secret === params.is_secret)
		}
		if (params.search) {
			const search = String(params.search).toLowerCase()
			items = items.filter(item =>
				`${item.key} ${item.label} ${item.value}`.toLowerCase().includes(search),
			)
		}

		const totalItems =
			typeof record.count === 'number' ? record.count : items.length
		const resolvedPage =
			typeof record.page === 'number' ? record.page : page
		const resolvedPageSize =
			typeof record.page_size === 'number' ? record.page_size : pageSize
		return {
			items,
			meta: toMeta(totalItems, resolvedPage, resolvedPageSize),
			total: totalItems,
			page: resolvedPage,
			page_size: resolvedPageSize,
			count: totalItems,
			next: typeof record.next === 'string' ? record.next : null,
			previous: typeof record.previous === 'string' ? record.previous : null,
		}
	}

	async getConfig(id: string): Promise<any> {
		const response = await this.requestor.get<unknown>(`/api/settings/integrations/${id}/`)
		return mapConfig(response)
	}

	async createConfig(input: any): Promise<any> {
		const response = await this.requestor.post<unknown>(
			'/api/settings/integrations/',
			packPayload(input),
		)
		return mapConfig(response)
	}

	async updateConfig(id: string, input: any): Promise<any> {
		const response = await this.requestor.patch<unknown>(
			`/api/settings/integrations/${id}/`,
			packPayload(input),
		)
		return mapConfig(response)
	}

	async patchConfig(id: string, input: any): Promise<any> {
		const current = await this.getConfig(id)
		return this.updateConfig(id, { ...current, ...input })
	}

	async deleteConfig(id: string): Promise<void> {
		await this.requestor.delete(`/api/settings/integrations/${id}/`)
	}

	async listEvents(): Promise<any> {
		return {
			items: [],
			meta: toMeta(0, 1, 10),
			total: 0,
			page: 1,
			page_size: 10,
			count: 0,
			next: null,
			previous: null,
		}
	}

	async getEvent(_id: string): Promise<any> {
		return null
	}
}
