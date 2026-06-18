/**
 * Clients service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import { ApiRequestor } from './api-requestor'
import type {
	BookingClientSummary,
	BookingItem,
	BookingsListParams,
	Client,
	ClientBookingItem,
	ClientsListParams,
	CreateCRMStatusInput,
	CRMStatusItem,
	CreateClientInput,
	IClientsService,
	PaginatedResponse,
	UpdateCRMStatusInput,
	UpdateClientInput,
} from '../../contracts'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}
	return value as UnknownRecord
}

function asString(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'number' && Number.isFinite(value)) return String(value)
	return ''
}

function mapSource(value: unknown): Client['source_platform'] {
	const source = asString(value).toLowerCase()
	if (source === 'telegram' || source === 'instagram' || source === 'manual') {
		return source
	}
	return 'manual'
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}

	return undefined
}

function mapStatusItem(dto: unknown): CRMStatusItem | null {
	const record = asRecord(dto)
	if (!record) {
		return null
	}

	const id = asString(record.id)
	const name = asString(record.name)
	if (!id || !name) {
		return null
	}

	return {
		id,
		name,
		color: asString(record.color) || undefined,
		position: typeof record.position === 'number' ? record.position : undefined,
		is_active:
			typeof record.is_active === 'boolean' ? record.is_active : undefined,
	}
}

function mapBookingClient(dto: unknown): BookingClientSummary | null {
	const record = asRecord(dto)
	if (!record) {
		return null
	}

	const id = asString(record.id)
	const fullName = asString(record.full_name)
	if (!id || !fullName) {
		return null
	}

	return {
		id,
		full_name: fullName,
		phone: asString(record.phone) || undefined,
		source: asString(record.source) || undefined,
		status: asString(record.status) || undefined,
		status_name: asString(record.status_name) || undefined,
		address_or_region: asString(record.address_or_region) || undefined,
		ai_summary: asString(record.ai_summary) || undefined,
		notes: asString(record.notes) || undefined,
		created_at: asString(record.created_at) || undefined,
		updated_at: asString(record.updated_at) || undefined,
	}
}

function mapBookingItem(dto: unknown): BookingItem | null {
	const record = asRecord(dto)
	if (!record) {
		return null
	}

	const id = asString(record.id)
	const scheduledFor = asString(record.scheduled_for)
	if (!id || !scheduledFor) {
		return null
	}

	const clientRecord = mapBookingClient(record.client)
	const clientId =
		clientRecord?.id || asString(record.client) || asString(record.client_id)

	return {
		id,
		client_id: clientId || undefined,
		client: clientRecord,
		requested_date: asString(record.requested_date) || null,
		scheduled_for: scheduledFor,
		duration_minutes: asNumber(record.duration_minutes),
		ends_at: asString(record.ends_at) || undefined,
		status: asString(record.status) || undefined,
		calendar_event_id: asString(record.calendar_event_id) || undefined,
		confirmed_by_name:
			asString(record.confirmed_by_name) || undefined,
		created_at: asString(record.created_at) || undefined,
		updated_at: asString(record.updated_at) || undefined,
	}
}

function mapBookingListResponse(
	payload: unknown,
): PaginatedResponse<BookingItem> {
	const record = asRecord(payload) ?? {}
	const rawItems = Array.isArray(record.items)
		? record.items
		: Array.isArray(record.results)
			? record.results
			: []
	const items = rawItems
		.map(mapBookingItem)
		.filter((item): item is BookingItem => item !== null)
	const total =
		typeof record.total === 'number'
			? record.total
			: typeof record.count === 'number'
				? record.count
				: items.length

	return {
		items,
		total,
		page: typeof record.page === 'number' ? record.page : 1,
		page_size:
			typeof record.page_size === 'number'
				? record.page_size
				: typeof record.pageSize === 'number'
					? (record.pageSize as number)
					: items.length,
		count: typeof record.count === 'number' ? record.count : total,
		next: typeof record.next === 'string' ? record.next : null,
		previous: typeof record.previous === 'string' ? record.previous : null,
	}
}

function toClientBookingItem(booking: BookingItem): ClientBookingItem {
	return {
		id: booking.id,
		requested_date: booking.requested_date ?? null,
		scheduled_for: booking.scheduled_for,
		status: booking.status,
		confirmed_by_name: booking.confirmed_by_name,
		created_at: booking.created_at,
	}
}

function mapClient(dto: unknown): Client {
	const record = asRecord(dto) ?? {}
	const statusName = asString(record.status_name)
	const notesSummary = asString(record.notes)
	const rawBookings = Array.isArray(record.bookings) ? record.bookings : []

	return {
		id: asString(record.id),
		chat_session_id: undefined,
		full_name: asString(record.full_name),
		phone: asString(record.phone),
		source_platform: mapSource(record.source),
		source_platform_label: asString(record.source) || undefined,
		status: asString(record.status) || undefined,
		status_label: statusName || undefined,
		notes: notesSummary || undefined,
		bookings_items: rawBookings
			.map(item => asRecord(item))
			.filter((item): item is UnknownRecord => item !== null)
			.map(item => ({
				id: asString(item.id),
				requested_date: asString(item.requested_date) || null,
				scheduled_for: asString(item.scheduled_for) || undefined,
				status: asString(item.status) || undefined,
				confirmed_by_name: asString(item.confirmed_by_name) || undefined,
				created_at: asString(item.created_at) || undefined,
			})),
		ai_summary: asString(record.ai_summary) || undefined,
		created_at: asString(record.created_at) || undefined,
		updated_at: asString(record.updated_at) || undefined,
		metadata: undefined,
	} as Client
}

function mapListResponse(payload: unknown): PaginatedResponse<Client> {
	const record = asRecord(payload) ?? {}
	const rawItems = Array.isArray(record.items)
		? record.items
		: Array.isArray(record.results)
			? record.results
			: []
	const items = rawItems.map(mapClient)
	const total =
		typeof record.total === 'number'
			? record.total
			: typeof record.count === 'number'
				? record.count
				: items.length

	return {
		items,
		total,
		page: typeof record.page === 'number' ? record.page : 1,
		page_size:
			typeof record.page_size === 'number'
				? record.page_size
				: typeof record.pageSize === 'number'
					? (record.pageSize as number)
					: items.length,
		count: typeof record.count === 'number' ? record.count : total,
		next: typeof record.next === 'string' ? record.next : null,
		previous: typeof record.previous === 'string' ? record.previous : null,
	}
}

function toBackendPayload(input: CreateClientInput | UpdateClientInput): UnknownRecord {
	const source = asString((input as UnknownRecord).source_platform).toLowerCase()
	const statusValue = (input as UnknownRecord).status
	const notes = asString((input as UnknownRecord).notes)
	const aiSummary = asString((input as UnknownRecord).ai_summary)

	const payload: UnknownRecord = {
		full_name: asString((input as UnknownRecord).full_name),
		phone: asString((input as UnknownRecord).phone),
		source:
			source === 'telegram' || source === 'instagram' || source === 'manual'
				? source
				: 'manual',
		notes: notes || '',
		ai_summary: aiSummary || '',
	}

	if (typeof statusValue === 'number' && Number.isFinite(statusValue)) {
		payload.status = statusValue
	} else if (typeof statusValue === 'string' && /^\d+$/.test(statusValue.trim())) {
		payload.status = Number(statusValue)
	}

	return payload
}

function toListQuery(params?: ClientsListParams): Record<string, unknown> | undefined {
	if (!params) {
		return undefined
	}

	const query: Record<string, unknown> = { ...params }
	const sourcePlatform = asString((params as UnknownRecord).source_platform).toLowerCase()
	if (sourcePlatform) {
		query.source = sourcePlatform
	}
	delete query.source_platform

	return query
}

function normalizeSourceFilter(
	value: unknown,
): Client['source_platform'] | undefined {
	const source = asString(value).toLowerCase()
	if (source === 'telegram' || source === 'instagram' || source === 'manual') {
		return source
	}
	return undefined
}

function applyClientSideFilters(
	items: Client[],
	params?: ClientsListParams,
): Client[] {
	if (!params) {
		return items
	}

	const sourceFilter = normalizeSourceFilter((params as UnknownRecord).source_platform)
	const statusFilter = asString((params as UnknownRecord).status)
	const searchFilter = asString((params as UnknownRecord).search).toLowerCase()

	return items.filter(item => {
		if (sourceFilter && item.source_platform !== sourceFilter) {
			return false
		}

		if (statusFilter && asString(item.status) !== statusFilter) {
			return false
		}

		if (searchFilter) {
			const haystack = [
				asString(item.full_name),
				asString(item.phone),
				asString(item.notes),
				asString(item.status_label),
			]
				.join(' ')
				.toLowerCase()
			if (!haystack.includes(searchFilter)) {
				return false
			}
		}

		return true
	})
}

function parseIso(value: unknown): number | null {
	const text = asString(value)
	if (!text) {
		return null
	}
	const parsed = Date.parse(text)
	return Number.isFinite(parsed) ? parsed : null
}

function sortClientsByOrdering(
	items: Client[],
	orderingValue: unknown,
): Client[] {
	const ordering = asString(orderingValue)
	if (!ordering) {
		return items
	}

	const key = ordering.startsWith('-') ? ordering.slice(1) : ordering
	const isDesc = ordering.startsWith('-')
	if (key !== 'updated_at' && key !== 'created_at') {
		return items
	}

	return [...items].sort((left, right) => {
		const leftValue =
			key === 'updated_at'
				? parseIso(left.updated_at)
				: parseIso(left.created_at)
		const rightValue =
			key === 'updated_at'
				? parseIso(right.updated_at)
				: parseIso(right.created_at)

		if (leftValue == null && rightValue == null) {
			return String(left.id).localeCompare(String(right.id))
		}
		if (leftValue == null) {
			return 1
		}
		if (rightValue == null) {
			return -1
		}
		if (leftValue === rightValue) {
			return String(left.id).localeCompare(String(right.id))
		}

		return isDesc ? rightValue - leftValue : leftValue - rightValue
	})
}

function paginateLocally(
	items: Client[],
	page: number,
	pageSize: number,
): PaginatedResponse<Client> {
	const safePage = Math.max(1, page || 1)
	const safePageSize = Math.max(1, pageSize || 20)
	const total = items.length
	const totalPages = Math.max(1, Math.ceil(total / safePageSize))
	const boundedPage = Math.min(safePage, totalPages)
	const start = (boundedPage - 1) * safePageSize
	const paginatedItems = items.slice(start, start + safePageSize)

	return {
		items: paginatedItems,
		total,
		page: boundedPage,
		page_size: safePageSize,
		count: total,
		next: boundedPage < totalPages ? `page=${boundedPage + 1}` : null,
		previous: boundedPage > 1 ? `page=${boundedPage - 1}` : null,
	}
}

export class ClientsAdapter
	extends BaseCrudAdapter<
		Client,
		ClientsListParams,
		CreateClientInput,
		UpdateClientInput
	>
	implements IClientsService
{
	private extraRequestor: ApiRequestor

	constructor(baseUrl: string) {
		super({
			endpoint: '/api/crm/clients/',
			baseUrl,
		})
		this.extraRequestor = new ApiRequestor(baseUrl)
	}

	async listClients(params?: ClientsListParams): Promise<PaginatedResponse<Client>> {
		const query = toListQuery(params)
		const response = await this.extraRequestor.get<unknown>(
			'/api/crm/clients/',
			query,
		)
		const mapped = mapListResponse(response)
		const ordering = (params as UnknownRecord | undefined)?.ordering
		const sortedMapped: PaginatedResponse<Client> = {
			...mapped,
			items: sortClientsByOrdering(mapped.items, ordering),
		}
		const sourceFilter = normalizeSourceFilter(
			(params as UnknownRecord | undefined)?.source_platform,
		)
		const shouldForceClientSideSourceFilter = Boolean(sourceFilter)

		if (!shouldForceClientSideSourceFilter) {
			return sortedMapped
		}

		const requestedPage = Number((params as UnknownRecord | undefined)?.page ?? 1) || 1
		const requestedPageSize =
			Number((params as UnknownRecord | undefined)?.page_size ?? 20) || 20

		const collected: Client[] = [...sortedMapped.items]
		const initialPageSize = Math.max(
			1,
			sortedMapped.page_size || sortedMapped.items.length || 1,
		)
		const totalPages = Math.max(
			1,
			Math.ceil((sortedMapped.total || 0) / initialPageSize),
		)
		const maxPages = Math.min(totalPages, 50)

		for (let page = 2; page <= maxPages; page += 1) {
			const nextQuery = { ...(query ?? {}), page }
			const pageResponse = await this.extraRequestor.get<unknown>(
				'/api/crm/clients/',
				nextQuery,
			)
			const nextMapped = mapListResponse(pageResponse)
			collected.push(...nextMapped.items)
		}

		const filtered = applyClientSideFilters(collected, params)
		const sortedFiltered = sortClientsByOrdering(filtered, ordering)
		return paginateLocally(sortedFiltered, requestedPage, requestedPageSize)
	}

	async getClient(id: string): Promise<Client> {
		const response = await this.extraRequestor.get<unknown>(`/api/crm/clients/${id}/`)
		return mapClient(response)
	}

	async createClient(input: CreateClientInput): Promise<Client> {
		const response = await this.extraRequestor.post<unknown>(
			'/api/crm/clients/',
			toBackendPayload(input),
		)
		return mapClient(response)
	}

	async bulkImportClient(input: CreateClientInput): Promise<Client> {
		return this.createClient(input)
	}

	async updateClient(id: string, input: UpdateClientInput): Promise<Client> {
		const response = await this.extraRequestor.patch<unknown>(
			`/api/crm/clients/${id}/`,
			toBackendPayload(input),
		)
		return mapClient(response)
	}

	async patchClient(id: string, input: UpdateClientInput): Promise<Client> {
		return this.updateClient(id, input)
	}

	async deleteClient(id: string): Promise<void> {
		await this.extraRequestor.delete(`/api/crm/clients/${id}/`)
	}

	async exportClients(): Promise<Blob> {
		const list = await this.listClients({ page: 1, page_size: 1000 })
		const header = 'id,full_name,phone,source,status_label\n'
		const rows = list.items
			.map(item =>
				[
					item.id,
					`"${(item.full_name ?? '').split('"').join('""')}"`,
					`"${(item.phone ?? '').split('"').join('""')}"`,
					item.source_platform ?? '',
					`"${(item.status_label ?? '').split('"').join('""')}"`,
				].join(','),
			)
			.join('\n')
		return new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
	}

	async bulkUpdateClients(ids: string[], input: UpdateClientInput): Promise<Client[]> {
		return Promise.all(ids.map(id => this.updateClient(id, input)))
	}

	async bulkDeleteClients(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteClient(id)))
	}

	async listStatuses(): Promise<CRMStatusItem[]> {
		const response = await this.extraRequestor.get<unknown>('/api/crm/statuses/')
		const record = asRecord(response) ?? {}
		const rawItems = Array.isArray(response)
			? response
			: Array.isArray(record.items)
				? record.items
				: Array.isArray(record.results)
					? record.results
					: []
		return rawItems
			.map(mapStatusItem)
			.filter((item): item is CRMStatusItem => item !== null)
	}

	async createStatus(input: CreateCRMStatusInput): Promise<CRMStatusItem> {
		const response = await this.extraRequestor.post<unknown>('/api/crm/statuses/', {
			name: asString(input.name),
			color: asString(input.color) || undefined,
			position:
				typeof input.position === 'number' && Number.isFinite(input.position)
					? input.position
					: undefined,
			is_active:
				typeof input.is_active === 'boolean' ? input.is_active : undefined,
		})
		const mapped = mapStatusItem(response)
		if (!mapped) {
			throw new Error('Failed to create status')
		}
		return mapped
	}

	async updateStatus(id: string, input: UpdateCRMStatusInput): Promise<CRMStatusItem> {
		const payload: UnknownRecord = {}
		if (input.name !== undefined) {
			payload.name = asString(input.name)
		}
		if (input.color !== undefined) {
			payload.color = asString(input.color)
		}
		if (input.position !== undefined) {
			payload.position =
				typeof input.position === 'number' && Number.isFinite(input.position)
					? input.position
					: null
		}
		if (input.is_active !== undefined) {
			payload.is_active = Boolean(input.is_active)
		}

		const response = await this.extraRequestor.patch<unknown>(
			`/api/crm/statuses/${id}/`,
			payload,
		)
		const mapped = mapStatusItem(response)
		if (!mapped) {
			throw new Error('Failed to update status')
		}
		return mapped
	}

	async deleteStatus(id: string): Promise<void> {
		await this.extraRequestor.delete(`/api/crm/statuses/${id}/`)
	}

	async listBookings(
		params?: BookingsListParams,
	): Promise<PaginatedResponse<BookingItem>> {
		const response = await this.extraRequestor.get<unknown>(
			'/api/crm/bookings/',
			params,
		)
		return mapBookingListResponse(response)
	}

	async listClientBookings(clientId: string): Promise<ClientBookingItem[]> {
		const response = await this.listBookings({
			client: clientId,
			page: 1,
			page_size: 100,
		})
		return response.items
			.filter(item => item.client_id === clientId)
			.map(toClientBookingItem)
	}

	async createClientBooking(
		clientId: string,
		input: { scheduled_for: string; status?: string; requested_date?: string },
	): Promise<ClientBookingItem> {
		const parsedClientId = Number(clientId)
		const normalizedClientId = Number.isFinite(parsedClientId)
			? parsedClientId
			: clientId

		const response = await this.extraRequestor.post<unknown>('/api/crm/bookings/', {
			client_id: normalizedClientId,
			scheduled_for: input.scheduled_for,
			status: input.status || 'pending',
			requested_date: input.requested_date || undefined,
		})
		const booking = mapBookingItem(response)
		if (!booking) {
			throw new Error('Failed to create booking')
		}
		return toClientBookingItem(booking)
	}

	async updateClientBooking(
		bookingId: string,
		input: { scheduled_for?: string; status?: string; requested_date?: string | null },
	): Promise<ClientBookingItem> {
		const payload: UnknownRecord = {}
		if (input.scheduled_for) {
			payload.scheduled_for = input.scheduled_for
		}
		if (input.status) {
			payload.status = input.status
		}
		if (typeof input.requested_date === 'string') {
			payload.requested_date = input.requested_date
		}
		if (input.requested_date === null) {
			payload.requested_date = null
		}

		const response = await this.extraRequestor.patch<unknown>(
			`/api/crm/bookings/${bookingId}/`,
			payload,
		)
		const booking = mapBookingItem(response)
		if (!booking) {
			throw new Error('Failed to update booking')
		}
		return toClientBookingItem(booking)
	}

	async deleteClientBooking(bookingId: string): Promise<void> {
		await this.extraRequestor.delete(`/api/crm/bookings/${bookingId}/`)
	}
}
