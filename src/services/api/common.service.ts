// @ts-nocheck


import { apiClient } from '../../lib/api-client';
import type {
  AppLog,
  EntityId,
  LogCleanupSettingsPatchInput,
  LogListParams,
  PaginatedResult,
  SystemHealth,
} from '../../types/domain';
import {
  mapHealthDtoToModel,
  mapLogDtoToModel,
  mapLogListDtoToItems,
  type HealthDto,
  type LogDto,
} from '../adapters/common.adapter';
import type { LogsService } from '../core/contracts';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
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

function extractLogDto(value: unknown): LogDto | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nested =
    toRecord(payload.log) ??
    toRecord(payload.result) ??
    toRecord(payload.data);
  if (nested) {
    return nested;
  }

  return payload;
}

function toPaginatedResult(
  allItems: AppLog[],
  params?: LogListParams,
  totalItemsHint?: number | null,
): PaginatedResult<AppLog> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 10);
  const start = (page - 1) * pageSize;
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;

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

export async function getHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<unknown>('/api/common/health/');
  const payload =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as HealthDto)
      : {};
  return mapHealthDtoToModel(payload);
}

export async function getPublicCompanyInfo(): Promise<unknown> {
  const { data } = await apiClient.get<unknown>('/api/common/public/company-info/');
  const payload = toRecord(data);
  if (!payload) {
    return null;
  }

  return payload.data ?? payload;
}

export async function calculateSubsidy(input: {
  panel_type: string;
  inverter_type: string;
  requested_power_kw: number;
  audit_power_kw: number;
}): Promise<unknown> {
  const { data } = await apiClient.post<unknown>(
    '/api/common/public/subsidy-calculator/',
    input,
  );
  const payload = toRecord(data);
  if (!payload) {
    return null;
  }

  return payload.data ?? payload;
}

export async function getLogs(
  params?: LogListParams,
): Promise<PaginatedResult<AppLog>> {
  const { data } = await apiClient.get<unknown>('/api/common/logs/', {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      search: params?.search,
      type: params?.type,
      ordering:
        params?.ordering ??
        (params?.sortBy
          ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
          : undefined),
    },
  });

  const items = mapLogListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, params, totalItemsHint);
}

export async function getLogById(id: EntityId): Promise<AppLog | null> {
  const { data } = await apiClient.get<unknown>(`/api/common/logs/${id}/`);
  const dto = extractLogDto(data);
  return dto ? mapLogDtoToModel(dto) : null;
}

export async function getCleanupSettings(): Promise<AppLog | null> {
  const { data } = await apiClient.get<unknown>('/api/common/logs/cleanup-settings/');
  const dto = extractLogDto(data);
  return dto ? mapLogDtoToModel(dto) : null;
}

export async function patchCleanupSettings(
  input: LogCleanupSettingsPatchInput,
): Promise<AppLog | null> {
  const retentionHours = Math.max(1, Math.floor(input.retentionHours));
  const retentionDays = Number((retentionHours / 24).toFixed(4));
  const metadataObjectPayload = {
    retention_hours: retentionHours,
    retention_days: retentionDays,
  };
  const metadataStringPayload = JSON.stringify(metadataObjectPayload);

  const payloadCandidates: Array<Record<string, unknown>> = [
    {
      message: `Delete logs after ${retentionHours} hours`,
      metadata: metadataStringPayload,
    },
    {
      metadata: metadataStringPayload,
    },
    {
      metadata: metadataObjectPayload,
    },
  ];

  let lastError: unknown = null;

  for (const payload of payloadCandidates) {
    try {
      const { data } = await apiClient.patch<unknown>(
        '/api/common/logs/cleanup-settings/',
        payload,
      );
      const dto = extractLogDto(data);
      return dto ? mapLogDtoToModel(dto) : null;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export const apiLogsService: LogsService = {
  async getHealth() {
    return getHealth();
  },

  async getPublicCompanyInfo() {
    return getPublicCompanyInfo();
  },

  async calculateSubsidy(input) {
    return calculateSubsidy(input);
  },

  async listLogs(params) {
    return getLogs(params);
  },

  async getLogById(id) {
    return getLogById(id);
  },

  async getCleanupSettings() {
    return getCleanupSettings();
  },

  async patchCleanupSettings(input) {
    return patchCleanupSettings(input);
  },
};

