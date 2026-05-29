/**
 * AI Settings service adapter implementation
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

function asNumber(value: unknown, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) return parsed
	}
	return fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') return value
	return fallback
}

function mapDefaultFollowUpItem(value: unknown): any | null {
	const record = asRecord(value)
	if (!record) return null

	const delayHours = asNumber(record.delay_hours, Number.NaN)
	const delayDays = asNumber(record.delay_days, Number.NaN)
	const item: any = {
		enabled: asBoolean(record.enabled, true),
		message: asString(record.message),
	}

	if (Number.isFinite(delayHours) && delayHours > 0) {
		item.delay_hours = Math.round(delayHours)
	} else if (Number.isFinite(delayDays) && delayDays > 0) {
		item.delay_days = Math.round(delayDays)
	}

	return item
}

function mapDefaultFollowUps(value: unknown): any[] {
	const record = asRecord(value)
	const items = Array.isArray(record?.items) ? record.items : []
	return items.map(mapDefaultFollowUpItem).filter(Boolean)
}

function parseValueRecord(value: unknown): UnknownRecord {
	const directRecord = asRecord(value)
	if (directRecord) {
		return directRecord
	}

	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed) {
			return {}
		}

		try {
			const parsed = JSON.parse(trimmed) as unknown
			return asRecord(parsed) ?? {}
		} catch {
			return {}
		}
	}

	return {}
}

function mapSetting(value: unknown): any {
	const record = asRecord(value) ?? {}
	const settingKey = asString(record.key) || asString(record.name)
	const rawValue = parseValueRecord(record.value)
	const systemPromptRaw =
		asString(record.system_prompt) ||
		asString(record.systemPrompt) ||
		asString(rawValue.system_prompt) ||
		asString(rawValue.systemPrompt) ||
		asString(rawValue.text) ||
		asString(record.value)
	const modelNameRaw =
		asString(record.model_name) ||
		asString(record.model) ||
		asString(record.modelName) ||
		asString(rawValue.model_name) ||
		asString(rawValue.model) ||
		asString(rawValue.modelName) ||
		asString(rawValue.name)

	return {
		id: asString(record.id),
		created_at: asString(record.created_at) || asString(record.updated_at),
		updated_at: asString(record.updated_at),
		name: settingKey,
		system_prompt: systemPromptRaw,
		follow_up_message:
			asString(record.follow_up_message) ||
			asString(rawValue.follow_up_message) ||
			asString(rawValue.followUpMessage) ||
			'',
		model_name: modelNameRaw || 'gpt-4.1-mini',
		temperature: asNumber(rawValue.temperature, 0.35),
		auto_order_enabled: asBoolean(rawValue.auto_order_enabled, true),
		order_confidence_threshold: asNumber(rawValue.order_confidence_threshold, 0.82),
		resume_after_operator_minutes: Math.max(
			0,
			Math.round(asNumber(rawValue.resume_after_operator_minutes, 15)),
		),
		default_follow_ups: mapDefaultFollowUps(rawValue),
		is_active: asBoolean(rawValue.is_active, false),
		updated_by: asString(record.updated_by) || null,
		updated_by_name: asString(record.updated_by_name) || null,
	}
}

function toMutationValue(input: any): UnknownRecord {
	if (Array.isArray(input?.default_follow_ups)) {
		return {
			items: input.default_follow_ups.map((item: any) => {
				const delayHours = asNumber(item?.delay_hours, Number.NaN)
				const delayDays = asNumber(item?.delay_days, Number.NaN)
				const payload: UnknownRecord = {
					enabled: asBoolean(item?.enabled, false),
					message: asString(item?.message),
				}

				if (Number.isFinite(delayHours) && delayHours > 0) {
					payload.delay_hours = Math.round(delayHours)
				} else {
					payload.delay_days = Math.max(1, Math.round(asNumber(delayDays, 1)))
				}

				return payload
			}),
		}
	}

	return {
		system_prompt: asString(input?.system_prompt),
		follow_up_message: asString(input?.follow_up_message),
		model_name: asString(input?.model_name),
		temperature: asNumber(input?.temperature, 0.35),
		auto_order_enabled: asBoolean(input?.auto_order_enabled, true),
		order_confidence_threshold: asNumber(input?.order_confidence_threshold, 0.82),
		resume_after_operator_minutes: Math.max(
			0,
			Math.round(asNumber(input?.resume_after_operator_minutes, 0)),
		),
		is_active: asBoolean(input?.is_active, false),
	}
}

function toMeta(totalItems: number, page: number, pageSize: number) {
	const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)))
	return { page, pageSize, totalItems, totalPages }
}

export class AISettingsAdapter {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async listSettings(params: any = {}): Promise<any> {
		const page = typeof params.page === 'number' ? params.page : 1
		const pageSize =
			typeof params.page_size === 'number'
				? params.page_size
				: typeof params.pageSize === 'number'
					? params.pageSize
					: 10
		const response = await this.requestor.get<unknown>('/api/settings/ai/', {
			page,
			page_size: pageSize,
			search: params.search,
			is_active: params.is_active,
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
		let items = rawItems.map(mapSetting)

		if (params.search) {
			const search = String(params.search).toLowerCase()
			items = items.filter(
				item =>
					String(item.name).toLowerCase().includes(search) ||
					String(item.model_name).toLowerCase().includes(search),
			)
		}
		if (typeof params.is_active === 'boolean') {
			items = items.filter(item => item.is_active === params.is_active)
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

	async getSetting(id: string): Promise<any> {
		const response = await this.requestor.get<unknown>(`/api/settings/ai/${id}/`)
		return mapSetting(response)
	}

	async getSettingById(id: string): Promise<any> {
		return this.getSetting(id)
	}

	async getActiveSetting(): Promise<any | null> {
		const response = await this.listSettings({ page: 1, pageSize: 200 })
		return response.items.find((item: any) => item.is_active) ?? null
	}

	async getCurrentSettings(): Promise<any> {
		const active = await this.getActiveSetting()
		if (active) {
			return active
		}
		const response = await this.listSettings({ page: 1, pageSize: 1 })
		return response.items[0] ?? null
	}

	async createSetting(input: any): Promise<any> {
		const response = await this.requestor.post<unknown>('/api/settings/ai/', {
			key: asString(input?.name),
			value: toMutationValue(input),
		})
		return mapSetting(response)
	}

	async updateSetting(id: string, input: any): Promise<any> {
		const response = await this.requestor.patch<unknown>(`/api/settings/ai/${id}/`, {
			key: asString(input?.name),
			value: toMutationValue(input),
		})
		return mapSetting(response)
	}

	async patchSetting(id: string, input: any): Promise<any> {
		return this.updateSetting(id, input)
	}

	async deleteSetting(id: string): Promise<boolean> {
		await this.requestor.delete(`/api/settings/ai/${id}/`)
		return true
	}
}
