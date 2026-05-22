// @ts-nocheck


import type { AISetting } from '../../types/domain';

export type AISettingDto = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
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

  if (typeof value === 'number') {
    return value !== 0;
  }

  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isUuidLike(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return UUID_PATTERN.test(value);
}

function mapUpdatedBy(value: unknown): {
  updatedById: string | null;
  updatedByName: string | null;
} {
  if (typeof value === 'string' || typeof value === 'number') {
    const rawValue = readString(value);
    if (!rawValue) {
      return { updatedById: null, updatedByName: null };
    }

    return {
      updatedById: rawValue,
      updatedByName: isUuidLike(rawValue) ? null : rawValue,
    };
  }

  const record = toRecord(value);
  if (!record) {
    return { updatedById: null, updatedByName: null };
  }

  const id = readString(record.id) || null;
  const nameCandidate =
    readString(record.full_name) ||
    readString(record.fullName) ||
    readString(record.name) ||
    readString(record.email) ||
    null;

  return {
    updatedById: id,
    updatedByName: nameCandidate && !isUuidLike(nameCandidate) ? nameCandidate : null,
  };
}

export function mapAISettingDtoToModel(dto: AISettingDto): AISetting {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `ai-setting-${nowIso}`;
  const updatedByPayload = mapUpdatedBy(dto.updated_by ?? dto.updatedBy);
  const explicitUpdatedByName =
    readString(dto.updated_by_name) ||
    readString(dto.updatedByName) ||
    null;
  const updatedByName =
    explicitUpdatedByName && !isUuidLike(explicitUpdatedByName)
      ? explicitUpdatedByName
      : updatedByPayload.updatedByName;
  const followUpMessageRaw =
    readString(dto.follow_up_message) || readString(dto.followUpMessage) || '';
  const followUpMessage = followUpMessageRaw.trim().length ? followUpMessageRaw : null;

  return {
    id,
    created_at: readString(dto.created_at, nowIso) || readString(dto.createdAt, nowIso),
    updated_at: readString(dto.updated_at, nowIso) || readString(dto.updatedAt, nowIso),
    name: readString(dto.name) || 'AI Setting',
    system_prompt: readString(dto.system_prompt) || readString(dto.systemPrompt),
    follow_up_message: followUpMessage,
    model_name:
      readString(dto.model_name) ||
      readString(dto.model) ||
      readString(dto.modelName) ||
      'gpt-4.1-mini',
    temperature: Number(clamp(readNumber(dto.temperature, 0.2), 0, 1).toFixed(2)),
    auto_order_enabled: readBoolean(dto.auto_order_enabled ?? dto.autoOrderEnabled, false),
    order_confidence_threshold: Number(
      clamp(
        readNumber(dto.order_confidence_threshold ?? dto.orderConfidenceThreshold, 0.8),
        0,
        1,
      ).toFixed(2),
    ),
    resume_after_operator_minutes: Math.max(
      0,
      Math.round(
        readNumber(
          dto.resume_after_operator_minutes ??
            dto.follow_up_minutes ??
            dto.resumeAfterOperatorMinutes,
          15,
        ),
      ),
    ),
    is_active: readBoolean(dto.is_active ?? dto.isActive, false),
    updated_by: updatedByPayload.updatedById,
    updated_by_name: updatedByName || null,
  };
}

export function mapAISettingListDtoToItems(value: unknown): AISetting[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is AISettingDto => item !== null)
      .map((item) => mapAISettingDtoToModel(item));
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
    .filter((item): item is AISettingDto => item !== null)
    .map((item) => mapAISettingDtoToModel(item));
}

