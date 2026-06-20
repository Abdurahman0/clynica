import { apiClient } from '../../lib/api-client'

interface BookingStatusColorRecord {
	id: number
	status: string
	status_label: string
	color: string
}

function toRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
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

function toStringValue(value: unknown): string {
	return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function mapBookingStatusColor(value: unknown): BookingStatusColorRecord | null {
	const record = toRecord(value)
	const id = Number(record.id)
	const status = toStringValue(record.status)

	if (!Number.isFinite(id) || !status) {
		return null
	}

	return {
		id,
		status,
		status_label: toStringValue(record.status_label),
		color: toStringValue(record.color),
	}
}

export async function listBookingStatusColors(): Promise<BookingStatusColorRecord[]> {
	const { data } = await apiClient.get<unknown>('/api/crm/booking-status-colors/', {
		params: { page_size: 100 },
	})

	return extractItems(data)
		.map(mapBookingStatusColor)
		.filter((item): item is BookingStatusColorRecord => item !== null)
}
