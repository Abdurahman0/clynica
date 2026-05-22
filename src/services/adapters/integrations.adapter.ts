// @ts-nocheck


import type {
  IntegrationConfig,
  IntegrationEvent,
  IntegrationPlatform,
  IntegrationProvider,
} from '../../types/domain';

export type IntegrationConfigDto = Record<string, unknown>;
export type IntegrationEventDto = Record<string, unknown>;

const PROVIDERS: readonly IntegrationProvider[] = ['openai', 'telegram', 'instagram'];
const PLATFORMS: readonly IntegrationPlatform[] = [
  'telegram',
  'instagram',
  'userbot',
  'payment',
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnifiedConfigFieldType = 'string' | 'boolean' | 'number';

const UNIFIED_CONFIG_FIELDS: Record<
  string,
  {
    provider: IntegrationProvider;
    isSecret: boolean;
    type: UnifiedConfigFieldType;
  }
> = {
  telegram_bot_token: {
    provider: 'telegram',
    isSecret: true,
    type: 'string',
  },
  telegram_webhook_secret: {
    provider: 'telegram',
    isSecret: true,
    type: 'string',
  },
  telegram_polling_enabled: {
    provider: 'telegram',
    isSecret: false,
    type: 'boolean',
  },
  telegram_last_update_id: {
    provider: 'telegram',
    isSecret: false,
    type: 'number',
  },
  instagram_verify_token: {
    provider: 'instagram',
    isSecret: true,
    type: 'string',
  },
  instagram_business_id: {
    provider: 'instagram',
    isSecret: false,
    type: 'string',
  },
  instagram_access_token: {
    provider: 'instagram',
    isSecret: true,
    type: 'string',
  },
};

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

  if (typeof value === 'number') {
    return value !== 0;
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

  return fallback;
}

function isUuidLike(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return UUID_PATTERN.test(value);
}

function normalizeProvider(value: unknown): IntegrationProvider {
  const normalized = readString(value) as IntegrationProvider;
  return PROVIDERS.includes(normalized) ? normalized : 'openai';
}

function normalizePlatform(value: unknown): IntegrationPlatform {
  const normalized = readString(value) as IntegrationPlatform;
  return PLATFORMS.includes(normalized) ? normalized : 'telegram';
}

function mapUpdatedBy(value: unknown): {
  updatedById: string | null;
  updatedByName: string | null;
} {
  if (typeof value === 'string' || typeof value === 'number') {
    const raw = readString(value);
    return {
      updatedById: raw || null,
      updatedByName: raw && !isUuidLike(raw) ? raw : null,
    };
  }

  const record = toRecord(value);
  if (!record) {
    return {
      updatedById: null,
      updatedByName: null,
    };
  }

  const updatedById = readString(record.id) || null;
  const nameCandidate =
    readString(record.full_name) ||
    readString(record.fullName) ||
    readString(record.name) ||
    readString(record.email) ||
    null;

  return {
    updatedById,
    updatedByName: nameCandidate && !isUuidLike(nameCandidate) ? nameCandidate : null,
  };
}

function normalizePayload(value: unknown): Record<string, unknown> | null {
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
    } catch {
      // non-JSON payload string
    }

    return { raw: trimmed };
  }

  return { raw: String(value) };
}

function humanizeConfigKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mapUnifiedConfigDtoToItems(dto: IntegrationConfigDto): IntegrationConfig[] {
  const rootId = readString(dto.id) || 'integration-config';
  const createdAt = readString(dto.created_at) || new Date().toISOString();
  const updatedAt =
    readString(dto.updated_at) || readString(dto.created_at) || new Date().toISOString();

  return Object.entries(UNIFIED_CONFIG_FIELDS).map(([key, meta]) => {
    const rawValue = dto[key];
    const normalizedValue =
      meta.type === 'boolean'
        ? String(readBoolean(rawValue, false))
        : meta.type === 'number'
          ? String(readNumber(rawValue, 0))
          : readString(rawValue);
    const isActive =
      meta.type === 'boolean'
        ? readBoolean(rawValue, false)
        : normalizedValue.trim().length > 0;

    return {
      id: `${rootId}:${key}`,
      created_at: createdAt,
      updated_at: updatedAt,
      provider: meta.provider,
      key,
      label: humanizeConfigKey(key),
      value: normalizedValue,
      is_secret: meta.isSecret,
      is_active: isActive,
      updated_by: null,
      updated_by_name: null,
    };
  });
}

function mapErrorMessage(value: unknown): string | null {
  const normalized = readString(value);
  return normalized || null;
}

export function mapIntegrationConfigDtoToModel(dto: IntegrationConfigDto): IntegrationConfig {
  const nowIso = new Date().toISOString();
  const updatedBy = mapUpdatedBy(dto.updated_by ?? dto.updatedBy);
  const explicitUpdatedByName =
    readString(dto.updated_by_name) ||
    readString(dto.updatedByName) ||
    null;
  const updatedByName =
    explicitUpdatedByName && !isUuidLike(explicitUpdatedByName)
      ? explicitUpdatedByName
      : updatedBy.updatedByName;

  return {
    id: readString(dto.id) || `integration-config-${nowIso}`,
    created_at: readString(dto.created_at, nowIso) || readString(dto.createdAt, nowIso),
    updated_at: readString(dto.updated_at, nowIso) || readString(dto.updatedAt, nowIso),
    provider: normalizeProvider(dto.provider),
    key: readString(dto.key),
    label:
      readString(dto.label) ||
      readString(dto.description) ||
      readString(dto.name) ||
      readString(dto.key),
    value: readString(dto.value),
    is_secret: readBoolean(dto.is_secret ?? dto.isSecret, false),
    is_active: readBoolean(dto.is_active ?? dto.isActive, false),
    updated_by: updatedBy.updatedById,
    updated_by_name: updatedByName || null,
  };
}

export function mapIntegrationEventDtoToModel(dto: IntegrationEventDto): IntegrationEvent {
  const nowIso = new Date().toISOString();

  return {
    id: readString(dto.id) || `integration-event-${nowIso}`,
    created_at: readString(dto.created_at, nowIso) || readString(dto.createdAt, nowIso),
    updated_at: readString(dto.updated_at, nowIso) || readString(dto.updatedAt, nowIso),
    platform: normalizePlatform(dto.platform),
    event_type: readString(dto.event_type) || readString(dto.eventType) || 'event',
    external_id: readString(dto.external_id) || readString(dto.externalId) || '-',
    event_key: readString(dto.event_key) || readString(dto.eventKey) || '-',
    payload: normalizePayload(dto.payload),
    processed: readBoolean(dto.processed, false),
    processing_attempts: Math.max(0, Math.round(readNumber(dto.processing_attempts, 0))),
    error_message: mapErrorMessage(dto.error_message ?? dto.errorMessage),
  };
}

export function mapIntegrationConfigListDtoToItems(value: unknown): IntegrationConfig[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is IntegrationConfigDto => item !== null)
      .map((item) => mapIntegrationConfigDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  // New integrations API shape: { status, data: { telegram_*, instagram_* ... } }
  const nestedData = toRecord(payload.data);
  if (Array.isArray(payload.data)) {
    return payload.data
      .map((item) => toRecord(item))
      .filter((item): item is IntegrationConfigDto => item !== null)
      .map((item) => mapIntegrationConfigDtoToModel(item));
  }

  if (nestedData) {
    const hasUnifiedFields = Object.keys(UNIFIED_CONFIG_FIELDS).some(
      (field) => field in nestedData,
    );

    if (hasUnifiedFields) {
      return mapUnifiedConfigDtoToItems(nestedData);
    }
  }

  // Also support direct object payload returned without wrapper.
  const hasUnifiedFieldsOnRoot = Object.keys(UNIFIED_CONFIG_FIELDS).some(
    (field) => field in payload,
  );
  if (hasUnifiedFieldsOnRoot) {
    return mapUnifiedConfigDtoToItems(payload);
  }

  const items = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is IntegrationConfigDto => item !== null)
    .map((item) => mapIntegrationConfigDtoToModel(item));
}

export function mapIntegrationEventListDtoToItems(value: unknown): IntegrationEvent[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is IntegrationEventDto => item !== null)
      .map((item) => mapIntegrationEventDtoToModel(item));
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
    .filter((item): item is IntegrationEventDto => item !== null)
    .map((item) => mapIntegrationEventDtoToModel(item));
}

