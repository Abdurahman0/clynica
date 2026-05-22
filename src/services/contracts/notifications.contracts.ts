/**
 * Notifications service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export type NotificationType =
	| 'info'
	| 'warning'
	| 'error'
	| 'success'
	| 'system'

export interface Notification extends BaseEntity {
	title: string
	message: string
	type: NotificationType
	status?: 'unread' | 'read'
	related_entity_type?: string
	related_entity_id?: string
	action_url?: string
	is_read?: boolean
	read_at?: string
	metadata?: Record<string, unknown>
}

export interface UpdateNotificationInput extends UpdateInput<Notification> {
	is_read?: boolean
	read_at?: string
}

export interface NotificationsListParams extends ListParams {
	type?: NotificationType
	status?: 'read' | 'unread'
	search?: string
}

export interface INotificationsService {
	// Read operations
	listNotifications(
		params?: NotificationsListParams,
	): Promise<PaginatedResponse<Notification>>
	getNotification(id: string): Promise<Notification>
	getUnreadCount(): Promise<number>

	// Write operations
	markAsRead(id: string): Promise<Notification>
	updateNotification(
		id: string,
		input: UpdateNotificationInput,
	): Promise<Notification>
	deleteNotification(id: string): Promise<void>

	// Bulk operations
	markAllAsRead(): Promise<void>
	bulkMarkAsRead(ids: string[]): Promise<Notification[]>
	bulkDeleteNotifications(ids: string[]): Promise<void>
}
