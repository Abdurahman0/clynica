/**
 * Chat service contract
 */

import type {
	BaseEntity,
	ListParams,
	PaginatedResponse,
} from './common.contracts'

export type ChatMessageSender = 'customer' | 'ai' | 'operator' | 'system'

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

	// WebSocket
	subscribeToSession(
		sessionId: string,
		callback: (message: ChatMessage) => void,
	): () => void
}
