/**
 * Chat service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
} from './common.contracts'

export type ChatMessageSender = 'customer' | 'ai' | 'operator' | 'system' | 'follow_up'

export interface ChatFollowUp {
	id: string
	scheduled_for: string
	message: string
	created_at?: string
	updated_at?: string
}

export interface ChatMessage extends BaseEntity {
	session_id: string
	sender_type: ChatMessageSender
	sender_id?: string
	content: string
	metadata?: Record<string, unknown>
	is_read?: boolean
}

export interface ChatSession extends BaseEntity {
	client_id?: string
	customer_id?: string
	operator_id?: string
	platform?: string
	external_id?: string
	status?: 'active' | 'closed' | 'archived'
	last_message_at?: string
	messages_count?: number
	metadata?: Record<string, unknown>
	active_follow_up?: ChatFollowUp | null
}

export interface CreateMessageInput {
	content: string
	sender_type?: ChatMessageSender
	metadata?: Record<string, unknown>
}

export interface ChatSessionsListParams extends ListParams {
	status?: string
	platform?: string
	search?: string
}

export interface ChatMessagesListParams extends ListParams {
	session_id: string
}

export interface IChatService {
	// Sessions
	listSessions(
		params?: ChatSessionsListParams,
	): Promise<PaginatedResponse<ChatSession>>
	getSession(id: string): Promise<ChatSession>

	// Messages
	listMessages(
		sessionId: string,
		params?: ChatMessagesListParams,
	): Promise<PaginatedResponse<ChatMessage>>
	getMessages(sessionId: string): Promise<ChatMessage[]>
	sendMessage(
		sessionId: string,
		input: CreateMessageInput,
	): Promise<ChatMessage>
	getActiveFollowUp(sessionId: string): Promise<ChatFollowUp | null>
	createFollowUp(
		sessionId: string,
		input: { scheduled_for: string; message: string },
	): Promise<ChatFollowUp>
	updateFollowUp(
		sessionId: string,
		input: { scheduled_for?: string; message?: string },
	): Promise<ChatFollowUp>
	cancelFollowUp(sessionId: string): Promise<void>

	// WebSocket
	subscribeToSession(
		sessionId: string,
		callback: (message: ChatMessage) => void,
	): () => void
}
