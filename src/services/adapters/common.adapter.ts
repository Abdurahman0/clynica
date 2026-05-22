// @ts-nocheck


import type { AppLog, LogType, SystemHealth } from '../../types/domain';

export type HealthDto = Record<string, unknown>;
export type LogDto = Record<string, unknown>;

const ALLOWED_LOG_TYPES: readonly LogType[] = [
  'ai',
  'webhook',
  'error',
  'payment',
  'system',
];

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

function normalizeLogType(value: unknown): LogType {
  const normalized = readString(value).toLowerCase() as LogType;
  return ALLOWED_LOG_TYPES.includes(normalized) ? normalized : 'system';
}

function normalizeStatus(value: unknown): string {
  const normalized = readString(value).toLowerCase();
  if (
    normalized === 'ok' ||
    normalized === 'up' ||
    normalized === 'healthy'
  ) {
    return 'ok';
  }

  if (normalized === 'warning' || normalized === 'degraded') {
    return 'warning';
  }

  if (normalized === 'error' || normalized === 'down' || normalized === 'unhealthy') {
    return 'error';
  }

  return normalized || 'warning';
}

function normalizeTimestamp(value: unknown): string {
  const normalized = readString(value);
  if (!normalized) {
    return new Date().toISOString();
  }

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
}

function parseMetadata(
  value: unknown,
): Record<string, unknown> | string | null {
  if (value == null) {
    return null;
  }

  const record = toRecord(value);
  if (record) {
    return record;
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
        return parsedRecord;
      }

      if (typeof parsed === 'string') {
        return parsed;
      }

      return { value: parsed };
    } catch {
      return trimmed;
    }
  }

  return String(value);
}

export function mapHealthDtoToModel(dto: HealthDto): SystemHealth {
  const payload = toRecord(dto?.data) ?? dto;
  const health =
    readString(payload.health) ||
    readString(payload.status) ||
    readString(dto?.status);
  const normalizedHealth = normalizeStatus(health);

  return {
    status: normalizedHealth,
    database: normalizeStatus(payload.database || health),
    redis: normalizeStatus(payload.redis || health),
  };
}

export function mapLogDtoToModel(dto: LogDto): AppLog {
  const nowIso = new Date().toISOString();

  return {
    id: readString(dto.id) || `log-${nowIso}`,
    type: normalizeLogType(dto.type),
    message: readString(dto.message) || "Xabar yo'q",
    metadata: parseMetadata(dto.metadata),
    created_at: normalizeTimestamp(dto.created_at),
  };
}

export function mapLogListDtoToItems(value: unknown): AppLog[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is LogDto => item !== null)
      .map((item) => mapLogDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const items = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is LogDto => item !== null)
    .map((item) => mapLogDtoToModel(item));
}

