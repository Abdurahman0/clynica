// @ts-nocheck


import type { ConversationService } from '../core/contracts';
import type {
  ChatMessage,
  Conversation,
  MessageListParams,
  PaginatedResult,
  SessionListParams,
  SendMessageInput,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapChatMessageDtoToModel,
  mapConversationDtoToModel,
  mapConversationListDtoToItems,
  mapMessageListDtoToItems,
  type ChatMessageDto,
  type ConversationDto,
} from '../adapters/conversation-adapter';

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function unwrapResponseData(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const nestedData = asRecord(record.data);
  return nestedData ?? record;
}

function looksLikeMessageRecord(record: Record<string, unknown> | null): boolean {
  if (!record) {
    return false;
  }

  return (
    typeof record.content === 'string' ||
    typeof record.text === 'string' ||
    typeof record.body === 'string' ||
    typeof record.sender_type === 'string' ||
    typeof record.direction === 'string'
  );
}

function extractMessageRecord(
  payload: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!payload) {
    return null;
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const lastMessageCandidate =
    messages.length > 0 ? asRecord(messages[messages.length - 1]) : null;
  const directLastMessage = asRecord(payload.last_message);

  const nestedMessage =
    asRecord(payload.message) ??
    asRecord(payload.outgoing) ??
    asRecord(payload.incoming) ??
    asRecord(payload.result) ??
    asRecord(payload.data);

  const candidate =
    lastMessageCandidate ??
    directLastMessage ??
    nestedMessage ??
    (looksLikeMessageRecord(payload) ? payload : null);

  return candidate && looksLikeMessageRecord(candidate) ? candidate : candidate;
}

function createFallbackOperatorMessage(sessionId: string, content: string): ChatMessage {
  const nowIso = new Date().toISOString();

  return mapChatMessageDtoToModel(
    {
      id: `local-${sessionId}-${Date.now()}`,
      created_at: nowIso,
      updated_at: nowIso,
      sender_type: 'operator',
      direction: 'outgoing',
      content,
      image_urls: [],
      external_message_id: null,
      metadata: null,
      is_read: true,
      session: sessionId,
      sent_by: null,
    } as unknown as ChatMessageDto,
    sessionId,
  );
}

function toPaginatedResult<T>(
  allItems: T[],
  params: { page?: number; pageSize?: number } | undefined,
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 50);
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;
  const start = (page - 1) * pageSize;

  const items = hasServerPaginationHint
    ? allItems
    : allItems.slice(start, start + pageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    items,
    meta: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

export const apiConversationService: ConversationService = {
  async list(params) {
    return apiConversationService.listSessions(params);
  },

  async getById(id) {
    return apiConversationService.getSessionById(id);
  },

  async getSessions(params) {
    return apiConversationService.listSessions(params);
  },

  async listSessions(params?: SessionListParams): Promise<PaginatedResult<Conversation>> {
    const { data } = await apiClient.get<unknown>('/api/chat/sessions/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        search: params?.search,
        channel: params?.channel,
        assigned_operator: params?.assigned_operator,
        is_operator_active: params?.is_operator_active,
        ordering: params?.ordering,
      },
    });

    const items = mapConversationListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getSessionById(id) {
    const { data } = await apiClient.get<ConversationDto>(`/api/chat/sessions/${id}/`);
    return mapConversationDtoToModel(data);
  },

  async getMessages(params) {
    return apiConversationService.listMessages(params);
  },

  async listMessages(params?: MessageListParams): Promise<PaginatedResult<ChatMessage>> {
    const sessionId = params?.session;
    if (!sessionId) {
      return toPaginatedResult([], params);
    }

    const { data } = await apiClient.get<unknown>(`/api/chat/sessions/${sessionId}/messages/`, {
      params: {
        page: params?.page,
        page_size: params?.pageSize,
        sender_type: params?.sender_type,
        direction: params?.direction,
        search: params?.search,
        ordering: params?.ordering,
      },
    });

    const items = mapMessageListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getMessageById(id) {
    const { data } = await apiClient.get<ChatMessageDto>(`/api/chat/messages/${id}/`);
    return mapChatMessageDtoToModel(data);
  },

  async deleteSession(sessionId) {
    await apiClient.delete(`/api/chat/sessions/${sessionId}/`);
    return true;
  },

  async sendMessage(sessionId, payload: SendMessageInput) {
    try {
      const { data } = await apiClient.post<unknown>(
        `/api/chat/sessions/${sessionId}/send-message/`,
        {
          content: payload.content,
        },
      );

      const sessionRecord = unwrapResponseData(data);
      if (sessionRecord) {
        const candidateMessage = extractMessageRecord(sessionRecord);
        if (candidateMessage) {
          return mapChatMessageDtoToModel(candidateMessage, sessionId);
        }
      }

      // Request succeeded but payload shape is unexpected. Preserve optimistic UX.
      return createFallbackOperatorMessage(sessionId, payload.content);
    } catch (error) {
      const status =
        typeof (error as any)?.response?.status === 'number'
          ? (error as any).response.status
          : typeof (error as any)?.statusCode === 'number'
            ? (error as any).statusCode
            : null;

      // Only fall back when the endpoint is missing/not allowed.
      if (status !== 404 && status !== 405) {
        throw error;
      }
    }

    try {
      const { data } = await apiClient.post<unknown>(
        `/api/chat/sessions/${sessionId}/operator-message/`,
        {
          content: payload.content,
        },
      );

      const sessionRecord = unwrapResponseData(data);
      if (sessionRecord) {
        const candidateMessage = extractMessageRecord(sessionRecord);
        if (candidateMessage) {
          return mapChatMessageDtoToModel(candidateMessage, sessionId);
        }
      }

      return createFallbackOperatorMessage(sessionId, payload.content);
    } catch (error) {
      throw error ?? new Error('Failed to send operator message');
    }
  },

  async markSessionRead(sessionId) {
    const { data } = await apiClient.post<unknown>(
      `/api/chat/sessions/${sessionId}/mark-read/`,
      {},
    );
    return mapConversationDtoToModel(unwrapResponseData(data) ?? {});
  },

  async pauseSessionAI(sessionId, pausedUntilIso) {
    const { data } = await apiClient.post<unknown>(
      `/api/chat/sessions/${sessionId}/pause-ai/`,
      pausedUntilIso ? { paused_until: pausedUntilIso } : {},
    );
    return mapConversationDtoToModel(unwrapResponseData(data) ?? {});
  },

  async resumeSessionAI(sessionId) {
    const { data } = await apiClient.post<unknown>(
      `/api/chat/sessions/${sessionId}/resume-ai/`,
      {},
    );
    return mapConversationDtoToModel(unwrapResponseData(data) ?? {});
  },

  async requestOperator(sessionId) {
    const { data } = await apiClient.post<unknown>(
      `/api/chat/sessions/${sessionId}/request-operator/`,
      {},
    );
    return mapConversationDtoToModel(unwrapResponseData(data) ?? {});
  },
};

