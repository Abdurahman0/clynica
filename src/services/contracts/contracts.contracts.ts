/**
 * Contracts service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
} from './common.contracts'

export interface Contract extends BaseEntity {
	client: string
	client_name: string
	title: string
	status:
		| 'draft'
		| 'audit_pending'
		| 'audit_paid'
		| 'moderation'
		| 'contract_ready'
		| 'payment_pending'
		| 'paid'
		| 'delivered'
		| 'sent'
		| 'completed'
		| 'signed'
		| 'canceled'
	panel_type: 'jinko_ja' | 'longi_hi_mo_x10' | ''
	panel_type_label?: string
	inverter_type: 'deye' | 'solax' | ''
	inverter_type_label?: string
	requested_power_kw: number | null
	audit_power_kw?: number | null
	audit_conclusion_kw?: number | null
	eligible_subsidy_kw?: number | null
	estimated_subsidy_amount?: string | number | null
	subsidy_percent?: string | number | null
	subsidy_amount?: string | number | null
	customer_amount?: string | number | null
	customer_phone?: string
	one_id_code?: string
	agreed_amount?: string | number | null
	paid_amount?: string | number | null
	installation_address?: string
	auditor_organization_name?: string
	auditor_phone?: string
	audit_conclusion?: string
	lot_deadline?: string | null
	installer_fee_amount?: string | number | null
	delivery_status?: string
	delivery_status_label?: string
	delivery_notes?: string
	total_amount?: string | number | null
	file?: string | null
	file_url?: string | null
	download_url?: string | null
	cadastre_file?: string | null
	cadastre_file_url?: string | null
	house_image?: string | null
	house_image_url?: string | null
	home_cadastre_file?: string | null
	home_cadastre_file_url?: string | null
	audit_contract_file?: string | null
	audit_contract_file_url?: string | null
	company_contract_file?: string | null
	company_contract_file_url?: string | null
	additional_file?: string | null
	additional_file_url?: string | null
	details?: string | Record<string, unknown> | null
	items: ContractItem[]
}

export interface ContractItem {
	id?: string
	product: string
	product_name?: string
	quantity: number
	unit_price: string | number
}

export interface CreateContractInput {
	client: string
	title: string
	status?: Contract['status']
	panel_type?: Contract['panel_type']
	inverter_type?: Contract['inverter_type']
	requested_power_kw?: number
	audit_power_kw?: number | null
	audit_conclusion_kw?: number | null
	eligible_subsidy_kw?: number | null
	estimated_subsidy_amount?: string | number | null
	subsidy_percent?: string | number | null
	one_id_code?: string
	customer_phone?: string
	agreed_amount?: string | number | null
	paid_amount?: string | number | null
	subsidy_amount?: string | number | null
	auditor_organization_name?: string
	auditor_phone?: string
	audit_conclusion?: string
	lot_deadline?: string | null
	installer_fee_amount?: string | number | null
	installation_address?: string
	delivery_status?: string
	delivery_notes?: string
	details?: string | Record<string, unknown> | null
	items?: Array<{
		product: string
		quantity: number
		unit_price: string | number
	}>
	file?: string | File | null
	cadastre_file?: string | File | null
	house_image?: string | File | null
	home_cadastre_file?: string | File | null
	audit_contract_file?: string | File | null
	company_contract_file?: string | File | null
	additional_file?: string | File | null
}

export interface UpdateContractInput {
	client?: string
	title?: string
	status?: Contract['status']
	panel_type?: Contract['panel_type'] | null
	inverter_type?: Contract['inverter_type'] | null
	requested_power_kw?: number | null
	audit_power_kw?: number | null
	audit_conclusion_kw?: number | null
	eligible_subsidy_kw?: number | null
	estimated_subsidy_amount?: string | number | null
	subsidy_percent?: string | number | null
	one_id_code?: string
	customer_phone?: string
	agreed_amount?: string | number | null
	paid_amount?: string | number | null
	subsidy_amount?: string | number | null
	auditor_organization_name?: string
	auditor_phone?: string
	audit_conclusion?: string
	lot_deadline?: string | null
	installer_fee_amount?: string | number | null
	installation_address?: string
	delivery_status?: string
	delivery_notes?: string
	details?: string | Record<string, unknown> | null
	file?: string | File | null
	cadastre_file?: string | File | null
	house_image?: string | File | null
	home_cadastre_file?: string | File | null
	audit_contract_file?: string | File | null
	company_contract_file?: string | File | null
	additional_file?: string | File | null
	items?: Array<{
		product: string
		quantity: number
		unit_price: string | number
	}>
}

export interface ContractsListParams extends ListParams {
	status?: string
	client?: string
	inverter_type?: 'deye' | 'solax'
	panel_type?: 'jinko_ja' | 'longi_hi_mo_x10'
	requested_power_kw?: number
	search?: string
}

export interface PricingMatrixRow {
	power_kw: number
	base_prices: Record<string, string>
	default_customer_prices: Record<string, string>
	audit_customer_prices: Record<string, Record<string, string>>
}

export interface PricingMatrixPanel {
	panel_type: Contract['panel_type'] | string
	label: string
	rows: PricingMatrixRow[]
}

export interface PricingMatrixData {
	subsidy_percent: string
	supported_audit_powers: number[]
	panels: PricingMatrixPanel[]
}

export interface IContractsService {
	// Read operations
	listContracts(
		params?: ContractsListParams,
	): Promise<PaginatedResponse<Contract>>
	getContract(id: string): Promise<Contract>

	// Write operations
	createContract(input: CreateContractInput, file?: File): Promise<Contract>
	updateContract(
		id: string,
		input: UpdateContractInput,
		file?: File,
	): Promise<Contract>
	deleteContract(id: string): Promise<void>

	// File operations
	downloadFile(id: string): Promise<Blob>
	getDownloadFileInfo(id: string): Promise<Contract>
	uploadFile(id: string, file: File): Promise<Contract>

	// Business operations
	recalculate(id: string, input?: UpdateContractInput): Promise<Contract>
	getPricingMatrix(): Promise<PricingMatrixData>

	// Bulk operations
	bulkUpdateContracts(
		ids: string[],
		input: UpdateContractInput,
	): Promise<Contract[]>
	bulkDeleteContracts(ids: string[]): Promise<void>
}
