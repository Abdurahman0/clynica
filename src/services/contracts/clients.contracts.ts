/**
 * Clients service contract
 */

import type {
	BaseEntity,
	CreateInput,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export interface ClientSelectedProduct {
	contract_id?: string
	contract_title?: string
	contract_status?: string
	product_id?: string
	product_name?: string
	quantity?: number
	unit_price?: string | number
	created_at?: string
}

export interface ClientRecentContract {
	id: string
	title?: string
	status?: string
	total_amount?: string | number
	created_at?: string
	items?: ClientSelectedProduct[]
}

export interface ClientNoteItem {
	id: string
	body: string
	author_name?: string
	created_at?: string
}

export interface ClientBookingItem {
	id: string
	requested_date?: string | null
	scheduled_for?: string
	status?: string
	status_color?: string
	confirmed_by_name?: string
	created_at?: string
}

export interface BookingClientSummary {
	id: string
	full_name: string
	phone?: string
	source?: string
	status?: string
	status_name?: string
	address_or_region?: string
	ai_summary?: string
	notes?: string
	created_at?: string
	updated_at?: string
}

export interface BookingItem extends BaseEntity {
	client_id?: string
	client?: BookingClientSummary | null
	requested_date?: string | null
	scheduled_for?: string
	duration_minutes?: number
	ends_at?: string
	status?: string
	status_color?: string
	calendar_event_id?: string
	confirmed_by_name?: string
}

export interface BookingsListParams extends ListParams {
	client?: string
}

export interface CRMStatusItem {
	id: string
	name: string
	color?: string
	position?: number
	is_active?: boolean
}

export interface CreateCRMStatusInput {
	name: string
	color?: string
	position?: number
	is_active?: boolean
}

export interface UpdateCRMStatusInput {
	name?: string
	color?: string
	position?: number
	is_active?: boolean
}

export interface Client extends BaseEntity {
	lead?: string | null
	lead_id?: string | null
	chat_session_id?: string | null
	full_name: string
	phone?: string
	region?: string
	address?: string
	object_type?: string
	customer_segment?: string
	electricity_consumption?: string
	desired_power_kw?: number | null
	audit_conclusion_kw?: number | null
	eligible_subsidy_kw?: number | null
	estimated_subsidy_amount?: string | number
	monthly_bill?: string | number
	solution_type?: string
	budget_range?: string
	source_platform?: 'instagram' | 'manual' | 'telegram'
	source_platform_label?: string
	status?: string
	status_label?: string
	manager?: string | null
	manager_username?: string
	notes?: string
	bookings_items?: ClientBookingItem[]
	ai_summary?: string
	recall_at?: string | null
	metadata?: Record<string, unknown>
	selected_products?: ClientSelectedProduct[]
	recent_contracts?: ClientRecentContract[]
}

export interface CreateClientInput extends CreateInput<Client> {
	full_name: string
}

export interface UpdateClientInput extends UpdateInput<Client> {}

export interface ClientsListParams extends ListParams {
	status?: Client['status']
	source_platform?: Client['source_platform']
	customer_segment?: string
	manager?: string
	region?: string
	search?: string
}

export interface IClientsService {
	// Read operations
	listClients(params?: ClientsListParams): Promise<PaginatedResponse<Client>>
	getClient(id: string): Promise<Client>

	// Write operations
	createClient(input: CreateClientInput): Promise<Client>
	bulkImportClient(input: CreateClientInput): Promise<Client>
	updateClient(id: string, input: UpdateClientInput): Promise<Client>
	patchClient?(id: string, input: UpdateClientInput): Promise<Client>
	deleteClient(id: string): Promise<void>
	exportClients(): Promise<Blob>

	// Bulk operations
	bulkUpdateClients(ids: string[], input: UpdateClientInput): Promise<Client[]>
	bulkDeleteClients(ids: string[]): Promise<void>

	// Backend crm extensions
	listStatuses?(): Promise<CRMStatusItem[]>
	createStatus?(input: CreateCRMStatusInput): Promise<CRMStatusItem>
	updateStatus?(id: string, input: UpdateCRMStatusInput): Promise<CRMStatusItem>
	deleteStatus?(id: string): Promise<void>
	listBookings?(
		params?: BookingsListParams,
	): Promise<PaginatedResponse<BookingItem>>
	listClientBookings?(clientId: string): Promise<ClientBookingItem[]>
	createClientBooking?(
		clientId: string,
		input: { scheduled_for: string; status?: string; requested_date?: string },
	): Promise<ClientBookingItem>
	updateClientBooking?(
		bookingId: string,
		input: { scheduled_for?: string; status?: string; requested_date?: string | null },
	): Promise<ClientBookingItem>
	deleteClientBooking?(bookingId: string): Promise<void>
}
