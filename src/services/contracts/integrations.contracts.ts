/**
 * Integrations service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export type IntegrationPlatform =
	| 'telegram'
	| 'instagram'
	| 'userbot'
	| 'webhook'

export interface IntegrationConfig extends BaseEntity {
	platform: IntegrationPlatform
	is_active: boolean
	settings?: Record<string, unknown>
	token?: string
	webhook_url?: string
	metadata?: Record<string, unknown>
}

export interface IntegrationEvent extends BaseEntity {
	platform: IntegrationPlatform
	event_type: string
	data: Record<string, unknown>
	processed?: boolean
	error?: string
	metadata?: Record<string, unknown>
}

export interface UpdateIntegrationConfigInput extends UpdateInput<IntegrationConfig> {
	is_active?: boolean
	settings?: Record<string, unknown>
	token?: string
}

export interface IntegrationsListParams extends ListParams {
	platform?: IntegrationPlatform
	is_active?: boolean
}

export interface EventsListParams extends ListParams {
	platform?: IntegrationPlatform
	event_type?: string
	processed?: boolean
}

export interface IIntegrationsService {
	// Configs
	listConfigs(
		params?: IntegrationsListParams,
	): Promise<PaginatedResponse<IntegrationConfig>>
	getConfig(platform: IntegrationPlatform): Promise<IntegrationConfig>
	updateConfig(
		platform: IntegrationPlatform,
		input: UpdateIntegrationConfigInput,
	): Promise<IntegrationConfig>

	// Events
	listEvents(
		params?: EventsListParams,
	): Promise<PaginatedResponse<IntegrationEvent>>
	getEvent(id: string): Promise<IntegrationEvent>
}
