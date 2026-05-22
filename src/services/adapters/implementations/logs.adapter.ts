/**
 * Logs service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
	AILog,
	ApiLog,
	ILogsService,
	LogsListParams,
	PaginatedResponse,
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

function toNumberValue(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string') {
		const parsed = Number(value.trim())
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}
	return fallback
}

function eventToLevel(eventType: string): 'debug' | 'info' | 'warning' | 'error' | 'critical' {
	const normalized = eventType.toLowerCase()
	if (normalized.includes('error') || normalized.includes('fail')) {
		return 'error'
	}
	if (normalized.includes('delete') || normalized.includes('remove')) {
		return 'warning'
	}
	return 'info'
}

function parseAuditLog(value: unknown): ApiLog | null {
	const payload = toRecord(value)
	if (!payload) {
		return null
	}

	const id = toStringValue(payload.id)
	if (!id) {
		return null
	}

	const eventType = toStringValue(payload.event_type) || 'event'
	const targetType = toStringValue(payload.target_type)
	const targetId = toStringValue(payload.target_id)
	const endpoint = [targetType, targetId].filter(Boolean).join('/') || '-'
	const metadata = toRecord(payload.metadata) ?? payload.metadata

	return {
		id,
		method: eventType.toUpperCase(),
		endpoint,
		status_code: 0,
		level: eventToLevel(eventType),
		request_data: metadata && typeof metadata === 'object'
			? (metadata as Record<string, unknown>)
			: undefined,
		response_data: undefined,
		error: undefined,
		duration_ms: 0,
		user_id: toStringValue(payload.actor) || undefined,
		created_at: toStringValue(payload.created_at) || undefined,
	}
}

function parseListResponse<T>(
	data: unknown,
	params: LogsListParams | undefined,
	mapper: (entry: unknown) => T | null,
): PaginatedResponse<T> {
	const payload = toRecord(data) ?? {}
	const rawItems = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []
	const items = rawItems
		.map(entry => mapper(entry))
		.filter((entry): entry is T => entry !== null)
	const count = toNumberValue(payload.count, items.length)

	return {
		items,
		total: count,
		page:
			typeof payload.page === 'number'
				? payload.page
				: params?.page,
		page_size:
			typeof payload.page_size === 'number'
				? payload.page_size
				: params?.page_size,
		count,
		next: typeof payload.next === 'string' ? payload.next : null,
		previous: typeof payload.previous === 'string' ? payload.previous : null,
	}
}

export class LogsAdapter implements ILogsService {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async getHealth(): Promise<{ status: string; database: string; redis: string }> {
		return {
			status: 'ok',
			database: 'ok',
			redis: 'warning',
		}
	}

	// API Logs mapped from backend audit logs
	async listApiLogs(
		params?: LogsListParams,
	): Promise<PaginatedResponse<ApiLog>> {
		const data = await this.requestor.get<unknown>(
			'/api/audit-logs/',
			params as Record<string, unknown>,
		)
		return parseListResponse(data, params, parseAuditLog)
	}

	async getApiLog(id: string): Promise<ApiLog> {
		const data = await this.requestor.get<unknown>(
			'/api/audit-logs/',
			{ page: 1 },
		)
		const parsed = parseListResponse(data, { page: 1 }, parseAuditLog)
		const found = parsed.items.find(item => item.id === id)
		if (!found) {
			throw new Error('API log not found')
		}
		return found
	}

	// AI logs are not provided by current backend contract.
	async listAILogs(_params?: LogsListParams): Promise<PaginatedResponse<AILog>> {
		return {
			items: [],
			total: 0,
			count: 0,
			page: 1,
			page_size: 10,
			next: null,
			previous: null,
		}
	}

	async getAILog(_id: string): Promise<AILog> {
		throw new Error('AI log endpoint is not available in backend')
	}
}

