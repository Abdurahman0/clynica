import { apiClient } from '../../lib/api-client'

type UnknownRecord = Record<string, unknown>

export type TaskPriority = 'low' | 'medium' | 'high'

export interface CrmTaskStatus {
	id: number
	name: string
	color: string
	position: number
	is_active: boolean
	task_count: number
	created_by: number | null
	created_at: string
	updated_at: string
}

export interface CrmTask {
	id: number
	title: string
	description: string
	status: number
	status_name: string
	status_color: string
	priority: TaskPriority
	due_at: string
	client: number | null
	client_name: string
	client_phone: string
	booking: number | null
	booking_scheduled_for: string
	assigned_to: number | null
	assigned_to_name: string | null
	created_by: number | null
	created_by_name: string | null
	kind: 'manual' | 'booking_two_days' | 'booking_today' | string
	automation_key: string
	created_at: string
	updated_at: string
}

export interface TaskMutationInput {
	title: string
	description?: string
	status: number
	priority: TaskPriority
	due_at?: string | null
	client?: number | null
	booking?: number | null
	assigned_to?: number | null
}

export interface TaskStatusMutationInput {
	name: string
	color: string
	position: number
	is_active: boolean
}

export interface TaskListParams {
	status?: number
	client?: number
	booking?: number
	assigned_to?: number
	kind?: string
	priority?: TaskPriority
	search?: string
	ordering?: string
	page_size?: number
}

function toRecord(value: unknown): UnknownRecord {
	return value && typeof value === 'object' ? (value as UnknownRecord) : {}
}

function toNumber(value: unknown, fallback = 0): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : fallback
}

function toNullableNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === '') {
		return null
	}
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

function toStringValue(value: unknown): string {
	return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function toPriority(value: unknown): TaskPriority {
	return value === 'low' || value === 'high' ? value : 'medium'
}

function extractItems(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value
	}
	const record = toRecord(value)
	if (Array.isArray(record.results)) {
		return record.results
	}
	if (Array.isArray(record.items)) {
		return record.items
	}
	if (Array.isArray(record.data)) {
		return record.data
	}
	return []
}

async function fetchAllPages(
	url: string,
	params: Record<string, unknown>,
): Promise<unknown[]> {
	const items: unknown[] = []
	let page = 1

	for (;;) {
		const { data } = await apiClient.get<unknown>(url, { params: { ...params, page } })
		items.push(...extractItems(data))

		const record = toRecord(data)
		const hasNext = typeof record.next === 'string' && record.next.length > 0
		if (!hasNext) {
			break
		}
		page += 1
	}

	return items
}

function mapStatus(value: unknown): CrmTaskStatus {
	const record = toRecord(value)
	return {
		id: toNumber(record.id),
		name: toStringValue(record.name),
		color: toStringValue(record.color) || '#2563eb',
		position: toNumber(record.position),
		is_active: record.is_active !== false,
		task_count: toNumber(record.task_count),
		created_by: toNullableNumber(record.created_by),
		created_at: toStringValue(record.created_at),
		updated_at: toStringValue(record.updated_at),
	}
}

function mapTask(value: unknown): CrmTask {
	const record = toRecord(value)
	return {
		id: toNumber(record.id),
		title: toStringValue(record.title),
		description: toStringValue(record.description),
		status: toNumber(record.status),
		status_name: toStringValue(record.status_name),
		status_color: toStringValue(record.status_color),
		priority: toPriority(record.priority),
		due_at: toStringValue(record.due_at),
		client: toNullableNumber(record.client),
		client_name: toStringValue(record.client_name),
		client_phone: toStringValue(record.client_phone),
		booking: toNullableNumber(record.booking),
		booking_scheduled_for: toStringValue(record.booking_scheduled_for),
		assigned_to: toNullableNumber(record.assigned_to),
		assigned_to_name:
			record.assigned_to_name === null ? null : toStringValue(record.assigned_to_name),
		created_by: toNullableNumber(record.created_by),
		created_by_name:
			record.created_by_name === null ? null : toStringValue(record.created_by_name),
		kind: toStringValue(record.kind) || 'manual',
		automation_key: toStringValue(record.automation_key),
		created_at: toStringValue(record.created_at),
		updated_at: toStringValue(record.updated_at),
	}
}

function toTaskPayload(input: TaskMutationInput): Record<string, unknown> {
	return {
		title: input.title,
		description: input.description ?? '',
		status: input.status,
		priority: input.priority,
		due_at: input.due_at || null,
		client: input.client ?? null,
		booking: input.booking ?? null,
		assigned_to: input.assigned_to ?? null,
	}
}

function toPartialTaskPayload(input: Partial<TaskMutationInput>): Record<string, unknown> {
	const payload: Record<string, unknown> = {}
	if (input.title !== undefined) payload.title = input.title
	if (input.description !== undefined) payload.description = input.description
	if (input.status !== undefined) payload.status = input.status
	if (input.priority !== undefined) payload.priority = input.priority
	if (input.due_at !== undefined) payload.due_at = input.due_at || null
	if (input.client !== undefined) payload.client = input.client ?? null
	if (input.booking !== undefined) payload.booking = input.booking ?? null
	if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to ?? null
	return payload
}

export async function listTaskStatuses(): Promise<CrmTaskStatus[]> {
	const items = await fetchAllPages('/api/crm/task-statuses/', { page_size: 200 })
	return items
		.map(mapStatus)
		.filter(status => status.id > 0)
		.sort((left, right) => left.position - right.position)
}

export async function createTaskStatus(
	input: TaskStatusMutationInput,
): Promise<CrmTaskStatus> {
	const { data } = await apiClient.post<unknown>('/api/crm/task-statuses/', input)
	return mapStatus(data)
}

export async function updateTaskStatus(
	id: number,
	input: Partial<TaskStatusMutationInput>,
): Promise<CrmTaskStatus> {
	const { data } = await apiClient.patch<unknown>(
		`/api/crm/task-statuses/${id}/`,
		input,
	)
	return mapStatus(data)
}

export async function deleteTaskStatus(id: number): Promise<void> {
	await apiClient.delete(`/api/crm/task-statuses/${id}/`)
}

export async function listTasks(params?: TaskListParams): Promise<CrmTask[]> {
	const items = await fetchAllPages('/api/crm/tasks/', {
		page_size: params?.page_size ?? 200,
		ordering: params?.ordering ?? 'status__position',
		status: params?.status,
		client: params?.client,
		booking: params?.booking,
		assigned_to: params?.assigned_to,
		kind: params?.kind,
		priority: params?.priority,
		search: params?.search,
	})
	return items.map(mapTask).filter(task => task.id > 0)
}

export async function createTask(input: TaskMutationInput): Promise<CrmTask> {
	const { data } = await apiClient.post<unknown>('/api/crm/tasks/', toTaskPayload(input))
	return mapTask(data)
}

export async function updateTask(
	id: number,
	input: Partial<TaskMutationInput>,
): Promise<CrmTask> {
	const { data } = await apiClient.patch<unknown>(
		`/api/crm/tasks/${id}/`,
		toPartialTaskPayload(input),
	)
	return mapTask(data)
}

export async function deleteTask(id: number): Promise<void> {
	await apiClient.delete(`/api/crm/tasks/${id}/`)
}

export async function moveTask(id: number, status: number): Promise<CrmTask> {
	const { data } = await apiClient.post<unknown>(`/api/crm/tasks/${id}/move/`, {
		status,
	})
	return mapTask(data)
}
