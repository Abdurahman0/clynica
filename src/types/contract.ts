import type { EntityId, TimestampString } from './common'

export type ContractStatus =
	| 'draft'
	| 'active'
	| 'expired'
	| 'terminated'
	| 'archived'

export interface ContractItem {
	id: EntityId
	product_id: EntityId
	quantity: number
	unit_price: string
	total_price: string
}

export interface Contract {
	id: EntityId
	client_id: EntityId
	contract_number: string
	title: string
	description?: string
	start_date: TimestampString
	end_date: TimestampString
	status: ContractStatus
	total_value: string
	items: ContractItem[]
	document_url?: string
	metadata?: Record<string, unknown>
	createdAt: TimestampString
	updatedAt?: TimestampString
}

export type ContractDto = Contract

export interface ContractMutationInput {
	client_id: EntityId
	contract_number: string
	title: string
	description?: string
	start_date: TimestampString
	end_date: TimestampString
	status?: ContractStatus
	total_value: string
	items: ContractItem[]
	document_url?: string
	metadata?: Record<string, unknown>
}

export interface ContractPatchInput {
	client_id?: EntityId
	contract_number?: string
	title?: string
	description?: string
	start_date?: TimestampString
	end_date?: TimestampString
	status?: ContractStatus
	total_value?: string
	items?: ContractItem[]
	document_url?: string
	metadata?: Record<string, unknown>
}

export interface ContractListParams {
	page?: number
	pageSize?: number
	search?: string
	status?: ContractStatus
	client_id?: EntityId
	ordering?: string
}
