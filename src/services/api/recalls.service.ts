import { apiClient } from '../../lib/api-client'

type UnknownRecord = Record<string, unknown>

export interface CrmRecall {
	id: number
	client_id: string
	scheduled_for: string
	remind_at: string
	is_active: boolean
	reminder_sent_at: string | null
	created_by_name: string
	created_at: string
	updated_at: string
}

export interface RecallMutationInput {
	client_id: number
	scheduled_for: string
	is_active?: boolean
}

function toRecord(value: unknown): UnknownRecord {
	return value && typeof value === 'object' ? (value as UnknownRecord) : {}
}

function toStringValue(value: unknown): string {
	return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function toNullableString(value: unknown): string | null {
	const next = toStringValue(value)
	return next || null
}

function toNumber(value: unknown): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function extractItems(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value
	}

	const record = toRecord(value)
	if (Array.isArray(record.results)) {
		return record.results
	}
	if (Array.isArray(record.items)) {
		return record.items
	}
	return []
}

function mapRecall(value: unknown): CrmRecall | null {
	const record = toRecord(value)
	const id = toNumber(record.id)
	const clientRecord = toRecord(record.client)
	const clientId = toStringValue(record.client_id || clientRecord.id || record.client)
	const scheduledFor = toStringValue(record.scheduled_for)

	if (!id || !clientId || !scheduledFor) {
		return null
	}

	return {
		id,
		client_id: clientId,
		scheduled_for: scheduledFor,
		remind_at: toStringValue(record.remind_at),
		is_active: record.is_active !== false,
		reminder_sent_at: toNullableString(record.reminder_sent_at),
		created_by_name: toStringValue(record.created_by_name),
		created_at: toStringValue(record.created_at),
		updated_at: toStringValue(record.updated_at),
	}
}

export async function listRecalls(): Promise<CrmRecall[]> {
	const { data } = await apiClient.get<unknown>('/api/crm/recalls/', {
		params: { page: 1, page_size: 200 },
	})

	return extractItems(data)
		.map(mapRecall)
		.filter((item): item is CrmRecall => item !== null)
}

export async function listRecallsByClient(clientId: string | number): Promise<CrmRecall[]> {
	const { data } = await apiClient.get<unknown>(`/api/crm/recalls/by-client/${clientId}/`)

	return extractItems(data)
		.map(mapRecall)
		.filter((item): item is CrmRecall => item !== null)
}

export async function createRecall(input: RecallMutationInput): Promise<CrmRecall> {
	const { data } = await apiClient.post<unknown>('/api/crm/recalls/', {
		client_id: input.client_id,
		scheduled_for: input.scheduled_for,
		is_active: input.is_active ?? true,
	})

	const mapped = mapRecall(data)
	if (!mapped) {
		throw new Error('Failed to create recall')
	}
	return mapped
}

export async function updateRecall(
	id: number,
	input: Partial<RecallMutationInput>,
): Promise<CrmRecall> {
	const payload: UnknownRecord = {}
	if (input.client_id !== undefined) payload.client_id = input.client_id
	if (input.scheduled_for !== undefined) payload.scheduled_for = input.scheduled_for
	if (input.is_active !== undefined) payload.is_active = input.is_active

	const { data } = await apiClient.patch<unknown>(`/api/crm/recalls/${id}/`, payload)
	const mapped = mapRecall(data)
	if (!mapped) {
		throw new Error('Failed to update recall')
	}
	return mapped
}

export async function deleteRecall(id: number): Promise<void> {
	await apiClient.delete(`/api/crm/recalls/${id}/`)
}
