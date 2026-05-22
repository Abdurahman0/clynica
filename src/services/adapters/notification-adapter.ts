// @ts-nocheck


import type { AppNotification } from '../../types/domain';
import type { AppRole } from '../../types/architecture';
import type { UserSummary } from '../../types/domain';

export type NotificationDto = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function unwrapNotificationPayload(dto: NotificationDto): NotificationDto {
  const nestedData = toRecord(dto.data);
  if (nestedData) {
    return nestedData;
  }

  const nestedResult = toRecord(dto.result);
  if (nestedResult) {
    return nestedResult;
  }

  const nestedNotification = toRecord(dto.notification);
  if (nestedNotification) {
    return nestedNotification;
  }

  return dto;
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

function resolveChannel(
  value: unknown,
): AppNotification['channel'] {
  if (value === 'in_app' || value === 'telegram' || value === 'system') {
    return value;
  }

  if (value === 'inapp' || value === 'app') {
    return 'in_app';
  }

  return 'system';
}

function resolveRole(value: unknown): AppRole {
  if (value === 'developer' || value === 'admin' || value === 'operator') {
    return value;
  }

  return 'operator';
}

function readDisplayNameFromUserRecord(userRecord: Record<string, unknown>): string {
  const directName =
    readString(userRecord.fullName) ||
    readString(userRecord.full_name) ||
    readString(userRecord.name) ||
    readString(userRecord.displayName) ||
    readString(userRecord.display_name) ||
    readString(userRecord.username);

  if (directName) {
    return directName;
  }

  const firstName = readString(userRecord.first_name) || readString(userRecord.firstName);
  const lastName = readString(userRecord.last_name) || readString(userRecord.lastName);
  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (combinedName) {
    return combinedName;
  }

  return '';
}

function mapUser(value: unknown): UserSummary | null {
  if (typeof value === 'string') {
    const userId = readString(value);
    if (!userId) {
      return null;
    }

    return {
      id: userId,
      fullName: userId,
      role: 'operator',
    };
  }

  const userRecord = toRecord(value);
  if (!userRecord) {
    return null;
  }

  const resolvedName = readDisplayNameFromUserRecord(userRecord);
  const userId =
    readString(userRecord.id) ||
    readString(userRecord.user_id) ||
    readString(userRecord.uid) ||
    readString(userRecord.pk) ||
    readString(userRecord.email) ||
    readString(userRecord.username) ||
    resolvedName;

  if (!userId && !resolvedName) {
    return null;
  }

  return {
    id: userId || resolvedName,
    fullName: resolvedName || userId,
    role: resolveRole(userRecord.role),
    avatarUrl: readString(userRecord.avatarUrl) || readString(userRecord.avatar_url) || undefined,
  };
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

function mapMetadataFromObject(
  metadataRecord: Record<string, unknown>,
): AppNotification['metadata'] {
  const normalized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(metadataRecord)) {
    normalized[key] = normalizeMetadataValue(value);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function mapMetadata(value: unknown): AppNotification['metadata'] {
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
      const metadataRecord = toRecord(parsed);
      if (metadataRecord) {
        return mapMetadataFromObject(metadataRecord);
      }
    } catch {
      // Fall back to raw string value.
    }

    return { raw: trimmed };
  }

  if (Array.isArray(value)) {
    try {
      return { raw: JSON.stringify(value) };
    } catch {
      return null;
    }
  }

  const metadataRecord = toRecord(value);
  if (!metadataRecord) {
    return null;
  }

  return mapMetadataFromObject(metadataRecord);
}

export function mapNotificationDtoToModel(dto: NotificationDto): AppNotification {
  const payload = unwrapNotificationPayload(dto);
  const nowIso = new Date().toISOString();
  const id = readString(payload.id);
  const title = readString(payload.title);
  const message = readString(payload.body) || readString(payload.message);
  const category = readString(payload.category);
  const channel = resolveChannel(payload.channel || category);
  const user =
    mapUser(payload.user) ||
    mapUser(payload.actor) ||
    mapUser(payload.created_by) ||
    mapUser(payload.updated_by);

  return {
    id: id || `notification-${nowIso}`,
    created_at: readString(payload.created_at, nowIso),
    updated_at: readString(payload.updated_at, nowIso),
    title: title || "Bildirishnoma",
    message: message || '',
    channel,
    is_read: readBoolean(payload.is_read),
    metadata: mapMetadata(payload.metadata),
    user,
  };
}

export function mapNotificationListDtoToItems(value: unknown): AppNotification[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is NotificationDto => item !== null)
      .map((item) => mapNotificationDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const nestedData = toRecord(payload.data);
  const container = nestedData ?? payload;

  const results = Array.isArray(container.results)
    ? container.results
    : Array.isArray(container.items)
      ? container.items
      : Array.isArray(container.data)
        ? container.data
        : [];

  return results
    .map((item) => toRecord(item))
    .filter((item): item is NotificationDto => item !== null)
    .map((item) => mapNotificationDtoToModel(item));
}

