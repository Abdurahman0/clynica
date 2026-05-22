/**
 * Dashboard service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
} from './common.contracts'

export interface DashboardStats extends BaseEntity {
	metric_name: string
	metric_value: number | string
	previous_value?: number | string
	change_percent?: number
	period?: string
}

export interface DashboardData {
	stats: DashboardStats[]
	summary?: Record<string, unknown>
	period?: {
		from: string
		to: string
	}
}

export interface DashboardParams extends ListParams {
	date_from?: string
	date_to?: string
}

export interface IDashboardService {
	getDashboard(params?: DashboardParams): Promise<DashboardData>
	getStats(params?: DashboardParams): Promise<DashboardStats[]>
}
