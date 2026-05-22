/**
 * Dashboard service adapter implementation
 */

import { ApiRequestor } from './api-requestor'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	return value as UnknownRecord
}

function asString(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'number' && Number.isFinite(value)) return String(value)
	return ''
}

function asNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) return parsed
	}
	return 0
}

function nowDate(): string {
	return new Date().toISOString().slice(0, 10)
}

function resolveDateValue(value: unknown, fallback: string): string {
	const text = asString(value)
	return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback
}

export class DashboardAdapter {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async getDashboardOverview(params?: Record<string, unknown>): Promise<any> {
		const defaultDate = nowDate()
		const dateFrom = resolveDateValue(params?.date_from, defaultDate)
		const dateTo = resolveDateValue(params?.date_to, defaultDate)
		const response = await this.requestor.get<unknown>('/api/crm/clients/dashboard/', {
			date_from: dateFrom,
			date_to: dateTo,
			interval: asString(params?.interval) || 'day',
		})
		const record = asRecord(response) ?? {}
		const clients = asNumber(record.total_clients)
		const chats = asNumber(record.total_chats)
		const activeBookings = asNumber(record.active_bookings)
		const cameCount = asNumber(record.came_count)
		const noShowCount = asNumber(record.no_show_count)
		const bySource = Array.isArray(record.by_source) ? record.by_source : []
		const byStatus = Array.isArray(record.by_status) ? record.by_status : []

		return {
			leads: 0,
			clients,
			products: 0,
			chats,
			notifications: 0,
			contracts: activeBookings,
			unread_messages: 0,
			revenue: '0',
			collected_amount: '0',
			pipeline_amount: '0',
			date_range: {
				date_from: dateFrom,
				date_to: dateTo,
				interval: asString(params?.interval) || 'day',
				label_format: 'date',
				timezone: 'Asia/Tashkent',
			},
			filtered_summary: {
				leads: 0,
				new_leads: 0,
				converted_leads: 0,
				clients,
				new_clients: clients,
				total_contracts: activeBookings,
				active_contracts: activeBookings,
				revenue: '0',
				collected_amount: '0',
				average_contract_value: '0',
				lead_conversion_rate: '0',
				contract_renewal_rate: '0',
			},
			breakdowns: {
				leads_by_status: byStatus.map(item => {
					const bucket = asRecord(item) ?? {}
					const label = asString(bucket.status__name) || 'Unknown'
					return {
						key: label.toLowerCase().replace(/\s+/g, '_'),
						label,
						count: asNumber(bucket.total),
					}
				}),
				leads_by_source: bySource.map(item => {
					const bucket = asRecord(item) ?? {}
					const source = asString(bucket.source) || 'manual'
					return {
						key: source.toLowerCase(),
						label: source,
						count: asNumber(bucket.total),
					}
				}),
				contracts_by_status: byStatus.map(item => {
					const bucket = asRecord(item) ?? {}
					const label = asString(bucket.status__name) || 'Unknown'
					return {
						key: label.toLowerCase().replace(/\s+/g, '_'),
						label,
						count: asNumber(bucket.total),
					}
				}),
				products_by_category: [],
				chats_by_channel: [],
				top_products: [],
			},
			time_series: [
				{
					bucket_start: dateFrom,
					bucket_end: dateTo,
					label: dateFrom,
					leads: 0,
					chats,
					clients,
					contracts: activeBookings,
					revenue: '0',
					collected_amount: '0',
				},
			],
			region_demand: [],
			manager_performance: [],
			crm_metrics: {
				total_clients: clients,
				active_bookings: activeBookings,
				came_count: cameCount,
				no_show_count: noShowCount,
			},
		}
	}
}
