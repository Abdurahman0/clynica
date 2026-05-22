/**
 * Logs service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
} from './common.contracts'

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'
export type LogType = 'api' | 'ai'

export interface ApiLog extends BaseEntity {
	method: string
	endpoint: string
	status_code: number
	level: LogLevel
	request_data?: Record<string, unknown>
	response_data?: Record<string, unknown>
	error?: string
	duration_ms?: number
	user_id?: string
	ip_address?: string
}

export interface AILog extends BaseEntity {
	action: string
	model?: string
	prompt?: string
	response?: string
	level: LogLevel
	tokens_used?: number
	cost?: number
	error?: string
	duration_ms?: number
	user_id?: string
}

export interface LogsListParams extends ListParams {
	level?: LogLevel
	user_id?: string
	date_from?: string
	date_to?: string
	search?: string
}

export interface ILogsService {
	// API Logs
	listApiLogs(params?: LogsListParams): Promise<PaginatedResponse<ApiLog>>
	getApiLog(id: string): Promise<ApiLog>

	// AI Logs
	listAILogs(params?: LogsListParams): Promise<PaginatedResponse<AILog>>
	getAILog(id: string): Promise<AILog>
}
