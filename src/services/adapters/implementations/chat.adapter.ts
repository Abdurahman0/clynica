/**
 * Chat service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
  ChatFollowUp,
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
  if (
    sender === 'operator' ||
    sender === 'ai' ||
    sender === 'system' ||
    sender === 'follow_up'
  ) {
    return sender
  }
  return 'customer'
}

function toUtcIsoOrRaw(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toISOString()
}

function mapFollowUp(value: unknown): ChatFollowUp | null {
  const record = asRecord(value)
  if (!record) return null

  const scheduledFor = asString(record.scheduled_for)
  const message = asString(record.message)
  if (!scheduledFor || !message) return null

  return {
    id: asString(record.id) || `follow-up-${scheduledFor}`,
    scheduled_for: scheduledFor,
    message,
    created_at: asString(record.created_at) || undefined,
    updated_at: asString(record.updated_at) || undefined,
  }
}

function getUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function inferInstagramPreviewMediaType(value: string): string | null {
  const url = getUrl(value.trim())
  if (!url) return null

  const hostname = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()

  if (hostname.endsWith('instagram.com') && /^\/(p|reel|tv)\//i.test(url.pathname)) {
    return 'ig_reel'
  }

  if (hostname.endsWith('fbsbx.com') && pathname.includes('/ig_messaging_cdn/')) {
    return 'video'
  }

  if (/\.(aac|m4a|mp3|ogg|opus|wav|weba)([?#].*)?$/i.test(pathname)) {
    return 'audio'
  }

  if (/\.(m4v|mov|mp4|webm)([?#].*)?$/i.test(pathname)) {
    return 'video'
  }

  if (/\.(avif|gif|jpe?g|png|webp)([?#].*)?$/i.test(pathname)) {
    return 'image'
  }

  return null
}

function formatLastMessagePreview(value: string, channel: string): string | null {
  const preview = value.trim()
  if (!preview) return null

  if (channel !== 'instagram') {
    return preview
  }

  const mediaType = inferInstagramPreviewMediaType(preview)
  if (mediaType === 'audio') return 'Voice message'
  if (mediaType === 'video') return 'Video'
  if (mediaType === 'image') return 'Image'
  if (mediaType === 'ig_reel') return 'Instagram reel'

  return preview
}

function createLastMessagePayload(
  record: UnknownRecord,
  sessionId: string,
  channel: string,
): ChatMessage | null {
  const preview = asString(record.last_message_preview)
  const mediaType = channel === 'instagram' ? inferInstagramPreviewMediaType(preview) : null
  if (!preview || !mediaType) return null

  return {
    id: `${sessionId}-last-preview`,
    created_at: asString(record.last_message_at) || asString(record.updated_at),
    updated_at: asString(record.last_message_at) || asString(record.updated_at),
    sender_type: 'customer',
    direction: 'incoming',
    content: preview,
    session_id: sessionId,
    image_urls: [],
    external_message_id: null,
    metadata: {
      media_url: preview,
      media_type: mediaType,
      is_non_text_media: true,
    },
    is_read: true,
    session: sessionId,
    sent_by: null,
  } as unknown as ChatMessage
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
  const displayName = asString(record.display_name).trim()
  const externalChatId = asString(record.external_chat_id).trim()
  const externalUserId = asString(record.external_user_id).trim()
  const operatorActive =
    typeof record.is_operator_active === 'boolean'
      ? record.is_operator_active
      : asString(record.ai_status) === 'paused'
  const followUpContainer = asRecord(record.follow_up)
  const activeFollowUp = mapFollowUp(
    record.active_follow_up ??
      followUpContainer?.active_follow_up ??
      followUpContainer?.follow_up ??
      followUpContainer,
  )

  const lastMessagePreview = asString(record.last_message_preview)

  return {
    id: asString(record.id),
    channel: channel as any,
    external_id: externalChatId || externalUserId || null,
    title: displayName || null,
    lead: null,
    client: record.client
      ? {
          id: asString(record.client),
          fullName:
            displayName ||
            asString(record.client_name) ||
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
    last_message: formatLastMessagePreview(lastMessagePreview, channel) || null,
    last_message_payload: createLastMessagePayload(record, asString(record.id), channel),
    unread_count: 0,
    created_at: asString(record.created_at),
    updated_at: asString(record.updated_at),
    active_follow_up: activeFollowUp,
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

  async getActiveFollowUp(sessionId: string): Promise<ChatFollowUp | null> {
    const response = await this.requestor.get<unknown>(
      `/api/conversations/${sessionId}/follow-up/`,
    )
    const record = asRecord(response)
    if (!record) {
      return mapFollowUp(response)
    }

    return mapFollowUp(record.follow_up ?? record.active_follow_up ?? record)
  }

  async createFollowUp(
    sessionId: string,
    input: { scheduled_for: string; message: string },
  ): Promise<ChatFollowUp> {
    const response = await this.requestor.post<unknown>(
      `/api/conversations/${sessionId}/follow-up/`,
      {
        ...input,
        scheduled_for: toUtcIsoOrRaw(input.scheduled_for),
      },
    )
    const record = asRecord(response)
    const followUp = mapFollowUp(record?.follow_up ?? record?.active_follow_up ?? response)
    if (!followUp) {
      throw new Error('Failed to parse follow-up response')
    }
    return followUp
  }

  async updateFollowUp(
    sessionId: string,
    input: { scheduled_for?: string; message?: string },
  ): Promise<ChatFollowUp> {
    const payload: { scheduled_for?: string; message?: string } = { ...input }
    if (payload.scheduled_for) {
      payload.scheduled_for = toUtcIsoOrRaw(payload.scheduled_for)
    }
    const response = await this.requestor.patch<unknown>(
      `/api/conversations/${sessionId}/follow-up/`,
      payload,
    )
    const record = asRecord(response)
    const followUp = mapFollowUp(record?.follow_up ?? record?.active_follow_up ?? response)
    if (!followUp) {
      throw new Error('Failed to parse follow-up response')
    }
    return followUp
  }

  async cancelFollowUp(sessionId: string): Promise<void> {
    await this.requestor.delete(`/api/conversations/${sessionId}/follow-up/`)
  }

  async deleteSession(_sessionId: string): Promise<void> {
    const sessionId = asString(_sessionId)
    if (!sessionId) {
      return
    }

    const candidates = [
      `/api/conversations/${sessionId}/`,
      `/api/conversations/${sessionId}/delete/`,
      `/api/chat/sessions/${sessionId}/`,
    ] as const

    let lastError: unknown = null

    for (const endpoint of candidates) {
      try {
        await this.requestor.delete<void>(endpoint)
        return
      } catch (error) {
        const statusCode =
          typeof (error as { statusCode?: unknown })?.statusCode === 'number'
            ? (error as { statusCode: number }).statusCode
            : null

        // Try the next known endpoint when method/path is not available.
        if (statusCode === 404 || statusCode === 405) {
          lastError = error
          continue
        }

        throw error
      }
    }

    if (lastError) {
      throw lastError
    }
  }

  subscribeToSession(
    _sessionId: string,
    _callback: (message: ChatMessage) => void,
  ): () => void {
    return () => {}
  }
}
