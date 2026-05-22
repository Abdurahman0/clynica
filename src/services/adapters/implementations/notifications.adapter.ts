/**
 * Notifications service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
	INotificationsService,
	Notification,
	NotificationsListParams,
	PaginatedResponse,
	UpdateNotificationInput,
} from '../../contracts'

export class NotificationsAdapter implements INotificationsService {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async listNotifications(
		params?: NotificationsListParams,
	): Promise<PaginatedResponse<Notification>> {
		return this.requestor.get<PaginatedResponse<Notification>>(
			'/api/notifications/',
			params as Record<string, unknown>,
		)
	}

	async getNotification(id: string): Promise<Notification> {
		return this.requestor.get<Notification>(`/api/notifications/${id}/`)
	}

	async getUnreadCount(): Promise<number> {
		const response = await this.requestor.get<{ unread_count: number }>(
			'/api/notifications/unread-count/',
		)
		return response.unread_count
	}

	async markAsRead(id: string): Promise<Notification> {
		return this.requestor.patch<Notification>(`/api/notifications/${id}/`, {
			is_read: true,
			read_at: new Date().toISOString(),
		})
	}

	async updateNotification(
		id: string,
		input: UpdateNotificationInput,
	): Promise<Notification> {
		return this.requestor.patch<Notification>(
			`/api/notifications/${id}/`,
			input,
		)
	}

	async deleteNotification(id: string): Promise<void> {
		await this.requestor.delete(`/api/notifications/${id}/`)
	}

	async markAllAsRead(): Promise<void> {
		await this.requestor.post('/api/notifications/mark-all-as-read/')
	}

	async bulkMarkAsRead(ids: string[]): Promise<Notification[]> {
		return Promise.all(ids.map(id => this.markAsRead(id)))
	}

	async bulkDeleteNotifications(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteNotification(id)))
	}
}
