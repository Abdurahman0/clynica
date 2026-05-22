// @ts-nocheck


import type { ChatMessage, Conversation } from '../../types/domain';

export type ConversationDto = Record<string, unknown>;
export type ChatMessageDto = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function readBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return Boolean(value);
}

function readBooleanStrict(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return undefined;
}

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

const DEBUG_CONTENT_START_PATTERN =
  /\b(?:sender|recipient|timestamp|ai_processed|delivered|generated_by|public_base_url|product_image_ids)\s*:/i;

function sanitizeVisibleMessageContent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const debugStartIndex = trimmed.search(DEBUG_CONTENT_START_PATTERN);
  if (debugStartIndex > 0) {
    return trimmed.slice(0, debugStartIndex).trim();
  }

  return trimmed;
}

function extractContentFromPayloadRecord(record: Record<string, unknown> | null): string {
  if (!record) {
    return '';
  }

  const directText =
    readString(record.text) ||
    readString(record.content) ||
    readString(record.body);
  if (directText) {
    return sanitizeVisibleMessageContent(directText);
  }

  const nestedMessage = toRecord(record.message);
  if (nestedMessage) {
    const nestedText =
      readString(nestedMessage.text) ||
      readString(nestedMessage.content) ||
      readString(nestedMessage.body);
    if (nestedText) {
      return sanitizeVisibleMessageContent(nestedText);
    }
  }

  return '';
}

function readMessageContent(dto: ChatMessageDto): string {
  const rawContent = readString(dto.content);
  const directContent = sanitizeVisibleMessageContent(rawContent);
  if (directContent) {
    return directContent;
  }

  const parsedFromContent =
    rawContent.startsWith('{') || rawContent.startsWith('[')
      ? (() => {
          try {
            return extractContentFromPayloadRecord(toRecord(JSON.parse(rawContent) as unknown));
          } catch {
            return '';
          }
        })()
      : '';
  if (parsedFromContent) {
    return parsedFromContent;
  }

  const metadataRecord = toRecord(dto.metadata);
  const metadataText = extractContentFromPayloadRecord(metadataRecord);
  if (metadataText) {
    return metadataText;
  }

  return '';
}

const IMAGE_COLLECTION_KEYS = [
  'image_urls',
  'imageUrls',
  'images',
  'attachments',
  'photos',
  'media',
  'files',
  'payload',
  'message',
] as const;

function isLikelyImageLink(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith('https://') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('data:image/') ||
    normalized.startsWith('/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  ) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)([?#].*)?$/.test(normalized);
}

function addImageUrl(
  bucket: Set<string>,
  value: unknown,
) {
  const normalized = readString(value);
  if (!normalized || !isLikelyImageLink(normalized)) {
    return;
  }

  bucket.add(normalized);
}

function collectImageUrls(
  value: unknown,
  bucket: Set<string>,
  depth = 0,
) {
  if (depth > 6 || value == null) {
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        collectImageUrls(JSON.parse(trimmed) as unknown, bucket, depth + 1);
        return;
      } catch {
        // Preserve non-JSON string candidates.
      }
    }

    if (isLikelyImageLink(trimmed)) {
      bucket.add(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, bucket, depth + 1));
    return;
  }

  const record = toRecord(value);
  if (!record) {
    return;
  }

  const hasImageContext =
    record.image_url !== undefined ||
    record.imageUrl !== undefined ||
    record.image_urls !== undefined ||
    record.imageUrls !== undefined ||
    record.images !== undefined ||
    record.photo !== undefined ||
    record.photos !== undefined ||
    readString(record.type).toLowerCase().includes('image');

  addImageUrl(bucket, record.image_url);
  addImageUrl(bucket, record.imageUrl);
  addImageUrl(bucket, record.image);

  if (hasImageContext) {
    addImageUrl(bucket, record.url);
    addImageUrl(bucket, record.src);
  }

  IMAGE_COLLECTION_KEYS.forEach((key) => {
    collectImageUrls(record[key], bucket, depth + 1);
  });
}

function readMessageImageUrls(dto: ChatMessageDto): string[] {
  const collected = new Set<string>();

  collectImageUrls(dto.image_urls, collected);
  collectImageUrls(dto.imageUrls, collected);
  collectImageUrls(dto.images, collected);
  collectImageUrls(dto.metadata, collected);
  collectImageUrls(dto.message, collected);

  const contentText = readString(dto.content);
  if (contentText.startsWith('{') || contentText.startsWith('[')) {
    try {
      collectImageUrls(JSON.parse(contentText) as unknown, collected);
    } catch {
      // Ignore invalid JSON payload content.
    }
  }

  return Array.from(collected);
}

function normalizeMetadataValue(
  value: unknown,
): string | number | boolean | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function mapMetadata(
  value: unknown,
): ChatMessage['metadata'] {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const parsedRecord = toRecord(parsed);
      if (parsedRecord) {
        const mapped: Record<string, string | number | boolean | null> = {};
        for (const [key, metadataValue] of Object.entries(parsedRecord)) {
          mapped[key] = normalizeMetadataValue(metadataValue);
        }
        return Object.keys(mapped).length > 0 ? mapped : null;
      }
    } catch {
      // Preserve raw metadata string.
    }

    return { raw: trimmed };
  }

  const record = toRecord(value);
  if (!record) {
    if (Array.isArray(value)) {
      try {
        return { raw: JSON.stringify(value) };
      } catch {
        return null;
      }
    }
    return null;
  }

  const mapped: Record<string, string | number | boolean | null> = {};
  for (const [key, metadataValue] of Object.entries(record)) {
    mapped[key] = normalizeMetadataValue(metadataValue);
  }

  return Object.keys(mapped).length > 0 ? mapped : null;
}

function resolveChannel(value: unknown): Conversation['channel'] {
  if (value === 'telegram' || value === 'instagram' || value === 'web' || value === 'manual') {
    return value;
  }

  return 'manual';
}

function resolveSenderType(
  value: unknown,
  direction?: ChatMessage['direction'],
): ChatMessage['sender_type'] {
  if (value === 'customer' || value === 'ai' || value === 'operator' || value === 'system') {
    return value;
  }

  if (direction === 'incoming') {
    return 'customer';
  }

  if (direction === 'outgoing') {
    return 'operator';
  }

  return 'system';
}

function resolveDirection(value: unknown): ChatMessage['direction'] {
  if (value === 'incoming' || value === 'outgoing') {
    return value;
  }

  if (value === 'in') {
    return 'incoming';
  }

  if (value === 'out') {
    return 'outgoing';
  }

  return 'incoming';
}

function resolveConversationState(
  dto: ConversationDto,
  stateData: Record<string, unknown> | null,
): Conversation['state'] {
  const candidates = [
    dto.state,
    dto.state_status,
    dto.status,
    stateData?.status,
    stateData?.session_status,
  ];

  for (const candidate of candidates) {
    if (candidate === 'open' || candidate === 'pending' || candidate === 'resolved') {
      return candidate;
    }

    if (candidate === 'closed') {
      return 'resolved';
    }
  }

  return 'open';
}

function mapLeadSummary(value: unknown): Conversation['lead'] {
  if (typeof value === 'string') {
    const id = readString(value);
    return id
      ? { id, fullName: id, status: 'new' }
      : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: readString(record.fullName) || readString(record.full_name) || id,
    status:
      record.status === 'new' ||
      record.status === 'contacted' ||
      record.status === 'qualified' ||
      record.status === 'negotiating' ||
      record.status === 'converted' ||
      record.status === 'lost'
        ? record.status
        : 'new',
    phone: readString(record.phone) || undefined,
    username: readString(record.username) || undefined,
  };
}

function mapClientSummary(value: unknown): Conversation['client'] {
  if (typeof value === 'string') {
    const id = readString(value);
    return id
      ? { id, fullName: id }
      : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: readString(record.fullName) || readString(record.full_name) || id,
    phone: readString(record.phone) || undefined,
  };
}

function mapUserSummary(value: unknown): Conversation['assigned_operator'] {
  if (typeof value === 'string') {
    const id = readString(value);
    return id
      ? { id, fullName: id, role: 'operator' }
      : null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  if (!id) {
    return null;
  }

  return {
    id,
    fullName: readString(record.fullName) || readString(record.full_name) || id,
    role:
      record.role === 'developer' || record.role === 'admin' || record.role === 'operator'
        ? record.role
        : 'operator',
    avatarUrl: readString(record.avatarUrl) || readString(record.avatar_url) || undefined,
  };
}

export function mapConversationDtoToModel(dto: ConversationDto): Conversation {
  const nowIso = new Date().toISOString();
  const sessionId = readString(dto.id) || `session-${nowIso}`;
  const stateValue = toRecord(dto.state);
  const stateData =
    stateValue ??
    toRecord(dto.state_data) ??
    toRecord(dto.session_state) ??
    null;

  const embeddedMessages = Array.isArray(dto.messages)
    ? dto.messages
      .map((entry) => toRecord(entry))
      .filter((entry): entry is ChatMessageDto => entry !== null)
    : [];
  const lastEmbeddedMessage =
    embeddedMessages.length > 0 ? embeddedMessages[embeddedMessages.length - 1] : null;
  const rawLastMessage = dto.last_message ?? lastEmbeddedMessage;
  const lastMessagePayload = toRecord(rawLastMessage)
    ? mapChatMessageDtoToModel(toRecord(rawLastMessage) as ChatMessageDto, sessionId)
    : null;
  const sanitizedRawLastMessage = sanitizeVisibleMessageContent(readString(rawLastMessage));
  const lastMessageContent =
    lastMessagePayload?.content ??
    (sanitizedRawLastMessage || null);
  const explicitUnreadCount = readNumber(dto.unread_count) ?? readNumber(stateData?.unread_count);
  const inferredUnreadCount =
    lastMessagePayload &&
    lastMessagePayload.direction === 'incoming' &&
    lastMessagePayload.sender_type === 'customer' &&
    !lastMessagePayload.is_read
      ? 1
      : 0;
  const topLevelOperatorNeeded = readBooleanStrict(dto.operator_needed ?? dto.operatorNeeded);
  const stateOperatorNeeded = readBooleanStrict(
    stateData?.operator_needed ?? stateData?.operatorNeeded,
  );
  const operatorNeededDefined =
    topLevelOperatorNeeded !== undefined || stateOperatorNeeded !== undefined;
  const externalId =
    readString(dto.platform_user_id) ||
    readString(dto.external_id) ||
    readString(dto.externalId) ||
    null;
  const channel = resolveChannel(dto.platform ?? dto.channel);
  const lastMessageAt =
    readString(dto.last_message_at) ||
    readString(lastMessagePayload?.created_at) ||
    null;
  const title = readString(dto.title) || null;

  return {
    id: sessionId,
    channel,
    external_id: externalId,
    title,
    lead: mapLeadSummary(dto.lead),
    client: mapClientSummary(dto.client ?? dto.customer),
    assigned_operator: mapUserSummary(dto.assigned_operator),
    ai_paused_until: readString(dto.ai_paused_until) || null,
    is_operator_active: readBoolean(dto.is_operator_active),
    operator_needed: topLevelOperatorNeeded ?? stateOperatorNeeded ?? false,
    operator_needed_defined: operatorNeededDefined,
    last_message_at: lastMessageAt,
    state: resolveConversationState(dto, stateData),
    state_data: stateData,
    last_message: lastMessageContent,
    last_message_payload: lastMessagePayload,
    unread_count: explicitUnreadCount ?? inferredUnreadCount,
    created_at: readString(dto.created_at, nowIso),
    updated_at: readString(dto.updated_at, nowIso),
  };
}

export function mapChatMessageDtoToModel(
  dto: ChatMessageDto,
  sessionIdFallback?: string,
): ChatMessage {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `message-${nowIso}`;
  const direction = resolveDirection(dto.direction);
  const senderType = resolveSenderType(dto.sender_type, direction);
  const metadata = mapMetadata(dto.metadata ?? dto.raw_payload);

  return {
    id,
    created_at: readString(dto.created_at, nowIso),
    updated_at: readString(dto.updated_at, nowIso),
    sender_type: senderType,
    direction,
    content: readMessageContent(dto),
    image_urls: readMessageImageUrls(dto),
    external_message_id: readString(dto.external_message_id) || null,
    metadata,
    is_read: readBoolean(dto.is_read),
    session: readString(dto.session) || readString(dto.chat_session) || sessionIdFallback || '',
    sent_by: mapUserSummary(dto.sent_by),
  };
}

export function mapConversationListDtoToItems(payload: unknown): Conversation[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toRecord(item))
      .filter((item): item is ConversationDto => item !== null)
      .map((item) => mapConversationDtoToModel(item));
  }

  const record = toRecord(payload);
  if (!record) {
    return [];
  }

  const items = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.data)
        ? record.data
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is ConversationDto => item !== null)
    .map((item) => mapConversationDtoToModel(item));
}

export function mapMessageListDtoToItems(payload: unknown): ChatMessage[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toRecord(item))
      .filter((item): item is ChatMessageDto => item !== null)
      .map((item) => mapChatMessageDtoToModel(item));
  }

  const record = toRecord(payload);
  if (!record) {
    return [];
  }

  const items = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.items)
      ? record.items
      : Array.isArray(record.data)
        ? record.data
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is ChatMessageDto => item !== null)
    .map((item) => mapChatMessageDtoToModel(item));
}

