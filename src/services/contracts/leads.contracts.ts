/**
 * Leads service contract
 */

import type {
	BaseEntity,
	CreateInput,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export interface Lead extends BaseEntity {
	full_name: string
	phone?: string
	source: 'instagram' | 'manual' | 'telegram'
	status: 'new' | 'contacted' | 'qualified' | 'lost'
	manager?: string | null
	manager_username?: string
	ai_summary?: string
	metadata?: Record<string, unknown>
}

export interface CreateLeadInput extends CreateInput<Lead> {
	full_name: string
	source: 'instagram' | 'manual' | 'telegram'
	status: 'new' | 'contacted' | 'qualified' | 'lost'
}

export interface UpdateLeadInput extends UpdateInput<Lead> {}

export interface LeadsListParams extends ListParams {
	status?: 'new' | 'contacted' | 'qualified' | 'lost'
	source?: 'instagram' | 'manual' | 'telegram'
	manager?: string
	search?: string
}

export interface ILeadsService {
	// Read operations
	listLeads(params?: LeadsListParams): Promise<PaginatedResponse<Lead>>
	getLead(id: string): Promise<Lead>

	// Write operations
	createLead(input: CreateLeadInput): Promise<Lead>
	updateLead(id: string, input: UpdateLeadInput): Promise<Lead>
	deleteLead(id: string): Promise<void>

	// Bulk operations
	bulkUpdateLeads(ids: string[], input: UpdateLeadInput): Promise<Lead[]>
	bulkDeleteLeads(ids: string[]): Promise<void>
}
