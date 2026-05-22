/**
 * Leads service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import type {
	CreateLeadInput,
	ILeadsService,
	Lead,
	LeadsListParams,
	PaginatedResponse,
	UpdateLeadInput,
} from '../../contracts'

export class LeadsAdapter
	extends BaseCrudAdapter<
		Lead,
		LeadsListParams,
		CreateLeadInput,
		UpdateLeadInput
	>
	implements ILeadsService
{
	constructor(baseUrl: string) {
		super({
			endpoint: '/api/leads/',
			baseUrl,
		})
	}

	async listLeads(params?: LeadsListParams): Promise<PaginatedResponse<Lead>> {
		return this.list(params)
	}

	async getLead(id: string): Promise<Lead> {
		return this.get(id)
	}

	async createLead(input: CreateLeadInput): Promise<Lead> {
		return this.create(input)
	}

	async updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
		return this.update(id, input)
	}

	async deleteLead(id: string): Promise<void> {
		return this.delete(id)
	}

	async bulkUpdateLeads(
		ids: string[],
		input: UpdateLeadInput,
	): Promise<Lead[]> {
		return Promise.all(ids.map(id => this.updateLead(id, input)))
	}

	async bulkDeleteLeads(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteLead(id)))
	}
}
