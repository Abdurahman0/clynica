// @ts-nocheck


import type { Lead, LeadSource, LeadStatus } from '../../types/domain';

export type LeadDto = Record<string, unknown>;

const ALLOWED_STATUSES: readonly LeadStatus[] = ['new', 'contacted', 'qualified', 'lost'];

const ALLOWED_SOURCES: readonly LeadSource[] = ['telegram', 'instagram', 'manual'];

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

function mapMetadata(value: unknown): Lead['metadata'] {
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
        const normalized: NonNullable<Lead['metadata']> = {};

        for (const [key, recordValue] of Object.entries(parsedRecord)) {
          normalized[key] = normalizeMetadataValue(recordValue);
        }

        return Object.keys(normalized).length > 0 ? normalized : null;
      }
    } catch {
      return { raw: trimmed };
    }

    return { raw: trimmed };
  }

  const metadataRecord = toRecord(value);
  if (!metadataRecord) {
    return null;
  }

  const normalized: NonNullable<Lead['metadata']> = {};
  for (const [key, recordValue] of Object.entries(metadataRecord)) {
    normalized[key] = normalizeMetadataValue(recordValue);
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeSource(value: unknown): LeadSource {
  const source = readString(value) as LeadSource;
  return ALLOWED_SOURCES.includes(source) ? source : 'manual';
}

function normalizeStatus(value: unknown): LeadStatus {
  const status = readString(value) as LeadStatus;
  return ALLOWED_STATUSES.includes(status) ? status : 'new';
}

export function mapLeadDtoToModel(dto: LeadDto): Lead {
  const nowIso = new Date().toISOString();
  const fullName = readString(dto.full_name) || readString(dto.fullName) || "Noma'lum lid";
  const phone = readString(dto.phone) || undefined;
  const status = normalizeStatus(dto.status);
  const managerId = readString(dto.manager) || undefined;
  const managerUsername = readString(dto.manager_username) || undefined;
  const aiSummary = readString(dto.ai_summary) || undefined;

  return {
    id: readString(dto.id) || `lead-${nowIso}`,
    full_name: fullName,
    fullName,
    phone,
    contact: {
      phone,
    },
    source: normalizeSource(dto.source),
    status,
    manager: managerId,
    managerId,
    manager_username: managerUsername,
    managerUsername,
    ai_summary: aiSummary,
    aiSummary,
    metadata: mapMetadata(dto.metadata),
    created_at: readString(dto.created_at, nowIso),
    updated_at: readString(dto.updated_at, nowIso),
    createdAt: readString(dto.created_at, nowIso),
    updatedAt: readString(dto.updated_at, nowIso),
  };
}

export function mapLeadListDtoToItems(value: unknown): Lead[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toRecord(item))
      .filter((item): item is LeadDto => item !== null)
      .map((item) => mapLeadDtoToModel(item));
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const wrappedData = toRecord(payload.data);
  const sourcePayload = wrappedData ?? payload;
  const items = Array.isArray(sourcePayload.results)
    ? sourcePayload.results
    : Array.isArray(sourcePayload.items)
      ? sourcePayload.items
      : Array.isArray(sourcePayload.data)
        ? sourcePayload.data
        : [];

  return items
    .map((item) => toRecord(item))
    .filter((item): item is LeadDto => item !== null)
    .map((item) => mapLeadDtoToModel(item));
}

