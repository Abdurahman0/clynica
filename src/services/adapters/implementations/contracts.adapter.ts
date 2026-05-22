/**
 * Contracts service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import { ApiRequestor } from './api-requestor'
import { getAccessToken } from '../../../lib/auth-storage'
import type {
	Contract,
	CreateInput,
	ContractsListParams,
	CreateContractInput,
	IContractsService,
	PaginatedResponse,
	PricingMatrixData,
	UpdateInput,
	UpdateContractInput,
} from '../../contracts'



export class ContractsAdapter
	extends BaseCrudAdapter<
		Contract,
		ContractsListParams,
		CreateInput<Contract>,
		UpdateInput<Contract>
	>
	implements IContractsService
{
	private fileRequestor: ApiRequestor
	private baseUrl: string

	constructor(baseUrl: string) {
		super({
			endpoint: '/api/contracts/',
			baseUrl,
		})
		this.fileRequestor = new ApiRequestor(baseUrl)
		this.baseUrl = baseUrl
	}

	async listContracts(
		params?: ContractsListParams,
	): Promise<PaginatedResponse<Contract>> {
		return this.list(params)
	}

	async getContract(id: string): Promise<Contract> {
		return this.get(id)
	}

	async createContract(
		input: CreateContractInput,
		file?: File | null,
	): Promise<Contract> {
		if (
			file ||
			input.file ||
			input.cadastre_file ||
			input.house_image ||
			input.home_cadastre_file ||
			input.audit_contract_file ||
			input.company_contract_file ||
			input.additional_file
		) {
			return this.uploadWithFile(input, file ?? undefined, 'create')
		}
		return this.create(input as CreateInput<Contract>)
	}

	async updateContract(
		id: string,
		input: UpdateContractInput,
		file?: File | null,
	): Promise<Contract> {
		if (
			file ||
			input.file ||
			input.cadastre_file ||
			input.house_image ||
			input.home_cadastre_file ||
			input.audit_contract_file ||
			input.company_contract_file ||
			input.additional_file
		) {
			return this.uploadWithFile(input, file ?? undefined, 'update', id)
		}
		return this.update(id, input as UpdateInput<Contract>)
	}

	async deleteContract(id: string): Promise<void> {
		return this.delete(id)
	}

	async downloadFile(id: string): Promise<Blob> {
		return this.fileRequestor.blob(`/api/contracts/${id}/download-file/`)
	}

	async getDownloadFileInfo(id: string): Promise<Contract> {
		return this.fileRequestor.get<Contract>(`/api/contracts/${id}/download-file/`)
	}

	async uploadFile(id: string, file: File): Promise<Contract> {
		const formData = new FormData()
		formData.append('file', file)

		return this.fileRequestor.request<Contract>(`/api/contracts/${id}/`, {
			method: 'PATCH',
			body: formData,
		})
	}

	async recalculate(id: string, input?: UpdateContractInput): Promise<Contract> {
		return this.fileRequestor.post<Contract>(
			`/api/contracts/${id}/recalculate/`,
			input ?? {},
		)
	}

	async getPricingMatrix(): Promise<PricingMatrixData> {
		const root = await this.fileRequestor.get<any>('/api/contracts/pricing-matrix/')

		const subsidyPercent =
			typeof root?.subsidy_percent === 'string'
				? root.subsidy_percent
				: String(root?.subsidy_percent ?? '0')
		const supportedAuditPowers = Array.isArray(root?.supported_audit_powers)
			? root.supported_audit_powers.filter(
					(power: any) => typeof power === 'number' && Number.isFinite(power),
				)
			: []
		const panels = Array.isArray(root?.panels) ? root.panels : []

		return {
			subsidy_percent: subsidyPercent,
			supported_audit_powers: supportedAuditPowers,
			panels: panels as PricingMatrixData['panels'],
		}
	}

	async bulkUpdateContracts(
		ids: string[],
		input: UpdateContractInput,
	): Promise<Contract[]> {
		return Promise.all(ids.map(id => this.updateContract(id, input)))
	}

	async bulkDeleteContracts(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteContract(id)))
	}

	private async uploadWithFile(
		input: CreateContractInput | UpdateContractInput,
		file: File | undefined,
		mode: 'create' | 'update',
		id?: string,
	): Promise<Contract> {
		const formData = new FormData()

		// Add form fields
		Object.entries(input).forEach(([key, value]) => {
			if (
				key === 'file' ||
				key === 'cadastre_file' ||
				key === 'house_image' ||
				key === 'home_cadastre_file' ||
				key === 'audit_contract_file' ||
				key === 'company_contract_file' ||
				key === 'additional_file'
			) {
				return
			}
			if (value !== undefined && value !== null) {
				if (key === 'items' && Array.isArray(value)) {
					formData.append(key, JSON.stringify(value))
					return
				}
				if (key === 'details') {
					// Backend expects valid JSON for details. For multipart we must send a JSON string.
					if (typeof value === 'object') {
						formData.append(key, JSON.stringify(value))
						return
					}
					const text = String(value).trim()
					if (!text.length) {
						return
					}
					formData.append(key, text)
					return
				}
				formData.append(key, String(value))
			}
		})

		if (file) {
			formData.append('file', file)
		}
		if (input.file instanceof File) {
			formData.append('file', input.file)
		}
		if (input.cadastre_file instanceof File) {
			formData.append('cadastre_file', input.cadastre_file)
		}
		if (input.house_image instanceof File) {
			formData.append('house_image', input.house_image)
		}
		if (input.home_cadastre_file instanceof File) {
			formData.append('home_cadastre_file', input.home_cadastre_file)
		}
		if (input.audit_contract_file instanceof File) {
			formData.append('audit_contract_file', input.audit_contract_file)
		}
		if (input.company_contract_file instanceof File) {
			formData.append('company_contract_file', input.company_contract_file)
		}
		if (input.additional_file instanceof File) {
			formData.append('additional_file', input.additional_file)
		}

		const token = getAccessToken()
		const headers: Record<string, string> = {}
		if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}

		const endpoint =
			mode === 'create' ? '/api/contracts/' : `/api/contracts/${id}/`
		const method = mode === 'create' ? 'POST' : 'PATCH'

		return this.fileRequestor.request<Contract>(endpoint, {
			method,
			body: formData,
		})
	}

}
