/**
 * AI Settings service contract
 */

import type {
	BaseEntity,
	CreateInput,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export interface AISettings extends BaseEntity {
	model?: string
	temperature?: number
	max_tokens?: number
	follow_up_delay?: number
	system_prompt?: string
	is_active?: boolean
	metadata?: Record<string, unknown>
}

export interface CreateAISettingsInput extends CreateInput<AISettings> {
	model?: string
}

export interface UpdateAISettingsInput extends UpdateInput<AISettings> {}

export interface AISettingsListParams extends ListParams {
	is_active?: boolean
}

export interface IAISettingsService {
	// Read operations
	listSettings(
		params?: AISettingsListParams,
	): Promise<PaginatedResponse<AISettings>>
	getSetting(id: string): Promise<AISettings>
	getCurrentSettings(): Promise<AISettings>

	// Write operations
	createSetting(input: CreateAISettingsInput): Promise<AISettings>
	updateSetting(id: string, input: UpdateAISettingsInput): Promise<AISettings>
	deleteSetting(id: string): Promise<void>
}
