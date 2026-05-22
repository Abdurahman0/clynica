/**
 * Chat service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
  ChatMessage,
  ChatMessagesListParams,
  ChatSession,
  ChatSessionsListParams,
  CreateMessageInput,
  IChatService,
  PaginatedResponse,
} from '../../contracts'

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

function mapSenderType(value: unknown): ChatMessage['sender_type'] {
  const sender = asString(value).toLowerCase()
  if (sender === 'operator' || sender === 'ai' || sender === 'system') return sender
  return 'customer'
}

function mapMessage(value: unknown): ChatMessage {
  const record = asRecord(value) ?? {}
  const senderType = mapSenderType(record.sender_type)
  const metadata = asRecord(record.metadata)

  return {
    id: asString(record.id),
    created_at: asString(record.created_at),
    updated_at: asString(record.created_at),
    sender_type: senderType,
    direction: senderType === 'customer' ? 'incoming' : 'outgoing',
    content: asString(record.content),
    session_id: asString(record.conversation),
    sender_id: asString(record.sender_user) || undefined,
    image_urls: [],
    external_message_id: asString(record.channel_message_id) || null,
    metadata: metadata as Record<string, string | number | boolean | null> | null,
    is_read: senderType !== 'customer',
    session: asString(record.conversation),
    sent_by: record.sender_user
      ? {
          id: asString(record.sender_user),
          fullName: asString(record.sender_username) || null,
          role: null,
        }
      : null,
  } as unknown as ChatMessage
}

function mapConversation(value: unknown): ChatSession {
  const record = asRecord(value) ?? {}
  const channelRaw = asString(record.channel).toLowerCase()
  const channel = channelRaw === 'telegram' || channelRaw === 'instagram' ? channelRaw : 'manual'
  const operatorActive =
    typeof record.is_operator_active === 'boolean'
      ? record.is_operator_active
      : asString(record.ai_status) === 'paused'

  return {
    id: asString(record.id),
    channel: channel as any,
    external_id: asString(record.external_chat_id) || null,
    lead: null,
    client: record.client
      ? {
          id: asString(record.client),
          fullName:
            asString(record.client_name) ||
            asString(record.display_name) ||
            asString(record.phone),
          phone: asString(record.phone) || null,
        }
      : null,
    assigned_operator: null,
    ai_paused_until: asString(record.paused_until) || null,
    is_operator_active: operatorActive,
    operator_needed: Boolean(record.needs_operator),
    operator_needed_defined: true,
    last_message_at: asString(record.last_message_at) || null,
    state: Boolean(record.needs_operator) ? 'pending' : 'open',
    last_message: asString(record.last_message_preview) || null,
    last_message_payload: null,
    unread_count: 0,
    created_at: asString(record.created_at),
    updated_at: asString(record.updated_at),
  } as unknown as ChatSession
}

function asPaginated<T>(
  items: T[],
  page = 1,
  pageSize = items.length || 1,
  total = items.length,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    page_size: pageSize,
    count: total,
    next: null,
    previous: null,
  }
}

function toTimestamp(value: unknown): number | null {
  const raw = asString(value)
  if (!raw) return null
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function sortSessionsByOrdering(
  items: any[],
  ordering?: string,
): any[] {
  if (!ordering) return items

  const key = ordering.replace(/^-/, '')
  const isDesc = ordering.startsWith('-')
  if (key !== 'last_message_at' && key !== 'created_at') {
    return items
  }

  return [...items].sort((left, right) => {
    const leftValue =
      key === 'last_message_at'
        ? toTimestamp(left.last_message_at)
        : toTimestamp(left.created_at)
    const rightValue =
      key === 'last_message_at'
        ? toTimestamp(right.last_message_at)
        : toTimestamp(right.created_at)

    if (leftValue == null && rightValue == null) {
      return String(left.id).localeCompare(String(right.id))
    }
    if (leftValue == null) return 1
    if (rightValue == null) return -1
    if (leftValue === rightValue) {
      return String(left.id).localeCompare(String(right.id))
    }

    return isDesc ? rightValue - leftValue : leftValue - rightValue
  })
}

export class ChatAdapter implements IChatService {
  private requestor: ApiRequestor

  constructor(baseUrl: string) {
    this.requestor = new ApiRequestor(baseUrl)
  }

  async listSessions(
    params?: ChatSessionsListParams,
  ): Promise<PaginatedResponse<ChatSession>> {
    const query: Record<string, unknown> = {
      page: (params as any)?.page,
      page_size: (params as any)?.page_size ?? (params as any)?.pageSize,
      search: params?.search,
      ordering: (params as any)?.ordering,
      channel: (params as any)?.channel,
      is_operator_active: (params as any)?.is_operator_active,
    }

    const response = await this.requestor.get<unknown>(
      '/api/conversations/',
      query,
    )
    const record = asRecord(response) ?? {}
    const rawItems = Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.results)
        ? record.results
        : []

    let items: any[] = rawItems.map(mapConversation)

    if (params?.status) {
      const statusFilter = String(params.status).toLowerCase()
      items = items.filter(item => String(item.state).toLowerCase() === statusFilter)
    }

    if (params?.platform) {
      const platformFilter = String(params.platform).toLowerCase()
      items = items.filter(item => String(item.channel).toLowerCase() === platformFilter)
    }

    if ((params as any)?.channel) {
      items = items.filter(item => item.channel === (params as any).channel)
    }

    if (typeof (params as any)?.is_operator_active === 'boolean') {
      items = items.filter(
        item => item.is_operator_active === (params as any).is_operator_active,
      )
    }

    items = sortSessionsByOrdering(items, (params as any)?.ordering)

    const total =
      typeof record.total === 'number'
        ? record.total
        : typeof record.count === 'number'
          ? record.count
          : items.length

    return {
      items,
      total,
      page: typeof record.page === 'number' ? record.page : Number((params as any)?.page ?? 1),
      page_size:
        typeof record.page_size === 'number'
          ? record.page_size
          : Number(((params as any)?.page_size ?? (params as any)?.pageSize ?? items.length) || 1),
      count: typeof record.count === 'number' ? record.count : total,
      next: typeof record.next === 'string' ? record.next : null,
      previous: typeof record.previous === 'string' ? record.previous : null,
    }
  }

  async getSession(id: string): Promise<ChatSession> {
    const response = await this.requestor.get<unknown>(`/api/conversations/${id}/`)
    return mapConversation(response)
  }

  async getSessionById(id: string): Promise<ChatSession> {
    return this.getSession(id)
  }

  async listMessages(
    sessionIdOrParams: string | ChatMessagesListParams,
    params?: ChatMessagesListParams,
  ): Promise<PaginatedResponse<ChatMessage>> {
    const resolvedParams =
      typeof sessionIdOrParams === 'string'
        ? { ...(params ?? {}), session_id: sessionIdOrParams }
        : sessionIdOrParams

    const sessionId = asString(
      (resolvedParams as UnknownRecord).session_id ??
        (resolvedParams as UnknownRecord).session,
    )

    if (!sessionId) {
      return asPaginated([], 1, 1, 0)
    }

    const response = await this.requestor.get<unknown>(
      `/api/conversations/${sessionId}/messages/`,
      {
        page: (resolvedParams as any).page,
        page_size: (resolvedParams as any).page_size ?? (resolvedParams as any).pageSize,
        ordering: (resolvedParams as any).ordering,
      },
    )
    // Backend may return either a plain array or a paginated object.
    if (Array.isArray(response)) {
      const items = response.map(mapMessage)
      const requestedPage = Number((resolvedParams as any).page ?? 1)
      const requestedPageSize =
        Number((resolvedParams as any).page_size ?? (resolvedParams as any).pageSize ?? items.length) ||
        items.length ||
        1

      return {
        items,
        total: items.length,
        page: requestedPage,
        page_size: requestedPageSize,
        count: items.length,
        next: null,
        previous: null,
      }
    }

    const record = asRecord(response) ?? {}
    const rawItems = Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.results)
        ? record.results
        : []
    const items = rawItems.map(mapMessage)

    const total =
      typeof record.total === 'number'
        ? record.total
        : typeof record.count === 'number'
          ? record.count
          : items.length

    return {
      items,
      total,
      page: typeof record.page === 'number' ? record.page : Number((resolvedParams as any).page ?? 1),
      page_size:
        typeof record.page_size === 'number'
          ? record.page_size
          : Number(((resolvedParams as any).page_size ?? (resolvedParams as any).pageSize ?? items.length) || 1),
      count: typeof record.count === 'number' ? record.count : total,
      next: typeof record.next === 'string' ? record.next : null,
      previous: typeof record.previous === 'string' ? record.previous : null,
    }
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await this.listMessages(sessionId)
    return response.items
  }

  async sendMessage(sessionId: string, input: CreateMessageInput): Promise<ChatMessage> {
    const response = await this.requestor.post<unknown>(
      `/api/conversations/${sessionId}/send-message/`,
      {
        content: input.content,
      },
    )
    return mapMessage(response)
  }

  async markSessionRead(sessionId: string): Promise<ChatSession> {
    return this.getSession(sessionId)
  }

  async pauseSessionAI(sessionId: string, pausedUntilIso: string): Promise<ChatSession> {
    const response = await this.requestor.post<unknown>(
      `/api/conversations/${sessionId}/pause_ai/`,
      pausedUntilIso ? { paused_until: pausedUntilIso } : {},
    )
    return mapConversation(response)
  }

  async resumeSessionAI(sessionId: string): Promise<ChatSession> {
    const response = await this.requestor.post<unknown>(
      `/api/conversations/${sessionId}/resume_ai/`,
      {},
    )
    return mapConversation(response)
  }

  async requestOperator(sessionId: string): Promise<ChatSession> {
    const response = await this.requestor.post<unknown>(
      `/api/conversations/${sessionId}/mark_operator_needed/`,
      {},
    )
    return mapConversation(response)
  }

  async deleteSession(_sessionId: string): Promise<void> {
    // Conversation delete endpoint is not available in backend schema.
  }

  subscribeToSession(
    _sessionId: string,
    _callback: (message: ChatMessage) => void,
  ): () => void {
    return () => {}
  }
}
