// @ts-nocheck


import { apiClient } from '../../lib/api-client';
import type {
  EntityId,
  IntegrationConfig,
  IntegrationConfigListParams,
  IntegrationConfigMutationInput,
  IntegrationConfigPatchInput,
  IntegrationEvent,
  IntegrationEventListParams,
  PaginatedResult,
} from '../../types/domain';
import {
  mapIntegrationConfigDtoToModel,
  mapIntegrationConfigListDtoToItems,
  mapIntegrationEventDtoToModel,
  mapIntegrationEventListDtoToItems,
  type IntegrationConfigDto,
  type IntegrationEventDto,
} from '../adapters/integrations.adapter';
import type { IntegrationsService } from '../core/contracts';

const ACTIVE_PROVIDER_FETCH_SIZE = 500;

function shouldEnforceSingleActivePerProvider(provider: IntegrationConfig['provider']): boolean {
  // New backend integrations API stores provider config as a single shared config object.
  // Enforcing per-provider exclusivity at this layer is not applicable.
  return false;
}

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

function toPaginatedResult<T>(
  allItems: T[],
  page: number,
  pageSize: number,
  totalItemsHint?: number | null,
): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  const hasServerPaginationHint = typeof totalItemsHint === 'number' && totalItemsHint >= 0;

  const items = hasServerPaginationHint
    ? allItems
    : allItems.slice(start, start + safePageSize);
  const totalItems = hasServerPaginationHint ? totalItemsHint : allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

  return {
    items,
    meta: {
      page: Math.min(safePage, totalPages),
      pageSize: safePageSize,
      totalItems,
      totalPages,
    },
  };
}

function toConfigPayload(
  input: IntegrationConfigMutationInput | IntegrationConfigPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.provider !== undefined) {
    payload.provider = input.provider;
  }
  if (input.key !== undefined) {
    payload.key = input.key;
  }
  if (input.label !== undefined) {
    payload.label = input.label;
    // Newer API schema uses `description` instead of `label`.
    payload.description = input.label;
  }
  if (input.value !== undefined) {
    payload.value = input.value;
  }
  if (input.is_secret !== undefined) {
    payload.is_secret = input.is_secret;
  }
  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return payload;
}

function extractConfigDto(value: unknown): IntegrationConfigDto | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nested =
    toRecord(payload.config) ??
    toRecord(payload.integration_config) ??
    toRecord(payload.result) ??
    toRecord(payload.data);
  if (nested) {
    return nested;
  }

  return payload;
}

function extractEventDto(value: unknown): IntegrationEventDto | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nested =
    toRecord(payload.event) ??
    toRecord(payload.integration_event) ??
    toRecord(payload.result) ??
    toRecord(payload.data);
  if (nested) {
    return nested;
  }

  return payload;
}

function mapSingleConfig(value: unknown, fallbackId?: EntityId): IntegrationConfig | null {
  const dto = extractConfigDto(value);
  if (!dto) {
    return null;
  }

  const dtoId =
    typeof dto.id === 'string' && dto.id.trim().length > 0 ? dto.id : null;

  return mapIntegrationConfigDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

function mapSingleEvent(value: unknown, fallbackId?: EntityId): IntegrationEvent | null {
  const dto = extractEventDto(value);
  if (!dto) {
    return null;
  }

  const dtoId =
    typeof dto.id === 'string' && dto.id.trim().length > 0 ? dto.id : null;

  return mapIntegrationEventDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

async function patchConfigRaw(
  id: EntityId,
  input: IntegrationConfigPatchInput,
): Promise<IntegrationConfig | null> {
  const payload = toConfigPayload(input);
  if (Object.keys(payload).length === 0) {
    return getConfigById(id);
  }

  const { data } = await apiClient.patch<unknown>(
    `/api/integrations/configs/${id}/`,
    payload,
  );

  return mapSingleConfig(data, id);
}

async function ensureSingleActivePerProvider(
  provider: IntegrationConfig['provider'],
  activeConfigId: EntityId,
): Promise<void> {
  if (!shouldEnforceSingleActivePerProvider(provider)) {
    return;
  }

  try {
    const activeConfigs = await listConfigs({
      page: 1,
      pageSize: ACTIVE_PROVIDER_FETCH_SIZE,
      provider,
      is_active: true,
      ordering: '-updated_at',
    });

    const deactivationTargets = activeConfigs.items.filter(
      (config) => config.id !== activeConfigId,
    );
    if (deactivationTargets.length === 0) {
      return;
    }

    await Promise.allSettled(
      deactivationTargets.map((config) =>
        patchConfigRaw(config.id, { is_active: false }),
      ),
    );
  } catch {
    // Backend may already enforce exclusivity.
  }
}

export async function listConfigs(
  params?: IntegrationConfigListParams,
): Promise<PaginatedResult<IntegrationConfig>> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const { data } = await apiClient.get<unknown>('/api/integrations/configs/', {
    params: {
      page,
      page_size: pageSize,
      search: params?.search,
      provider: params?.provider,
      is_active: params?.is_active,
      is_secret: params?.is_secret,
      ordering:
        params?.ordering ??
        (params?.sortBy
          ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
          : undefined),
    },
  });

  const items = mapIntegrationConfigListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, page, pageSize, totalItemsHint);
}

export async function getConfigById(id: EntityId): Promise<IntegrationConfig | null> {
  const { data } = await apiClient.get<unknown>(`/api/integrations/configs/${id}/`);
  return mapSingleConfig(data, id);
}

export async function createConfig(
  input: IntegrationConfigMutationInput,
): Promise<IntegrationConfig> {
  const { data } = await apiClient.post<unknown>(
    '/api/integrations/configs/',
    toConfigPayload(input),
  );

  const mapped = mapSingleConfig(data);
  if (!mapped) {
    throw new Error('Failed to create integration config: invalid API response.');
  }

  if (mapped.is_active) {
    await ensureSingleActivePerProvider(mapped.provider, mapped.id);
    const refreshed = await getConfigById(mapped.id);
    return refreshed ?? mapped;
  }

  return mapped;
}

export async function updateConfig(
  id: EntityId,
  input: IntegrationConfigMutationInput,
): Promise<IntegrationConfig | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/integrations/configs/${id}/`,
    toConfigPayload(input),
  );

  const mapped = mapSingleConfig(data, id);
  if (!mapped) {
    return null;
  }

  if (mapped.is_active) {
    await ensureSingleActivePerProvider(mapped.provider, mapped.id);
    const refreshed = await getConfigById(mapped.id);
    return refreshed ?? mapped;
  }

  return mapped;
}

export async function patchConfig(
  id: EntityId,
  input: IntegrationConfigPatchInput,
): Promise<IntegrationConfig | null> {
  const mapped = await patchConfigRaw(id, input);
  if (!mapped) {
    return null;
  }

  if (mapped.is_active) {
    await ensureSingleActivePerProvider(mapped.provider, mapped.id);
    const refreshed = await getConfigById(mapped.id);
    return refreshed ?? mapped;
  }

  return mapped;
}

export async function deleteConfig(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/integrations/configs/${id}/`);
  return true;
}

export async function listEvents(
  params?: IntegrationEventListParams,
): Promise<PaginatedResult<IntegrationEvent>> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const { data } = await apiClient.get<unknown>('/api/integrations/events/', {
    params: {
      page,
      page_size: pageSize,
      search: params?.search,
      platform: params?.platform,
      processed: params?.processed,
      ordering:
        params?.ordering ??
        (params?.sortBy
          ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
          : undefined),
    },
  });

  const items = mapIntegrationEventListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, page, pageSize, totalItemsHint);
}

export async function getInstagramBusinessProfile(): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(
    '/api/integrations/instagram/business-profile/',
  );
  return data;
}

export async function getInstagramWebhook(): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(
    '/api/integrations/instagram/webhook/',
  );
  return data;
}

export async function postInstagramWebhook(payload: string): Promise<boolean> {
  const { data } = await apiClient.post<unknown>(
    '/api/integrations/instagram/webhook/',
    { payload },
  );
  const response = toRecord(data);
  if (response && typeof response.data === 'boolean') {
    return response.data;
  }

  return true;
}

export async function postTelegramInbound(payload: string): Promise<boolean> {
  const { data } = await apiClient.post<unknown>(
    '/api/integrations/telegram/inbound/',
    { payload },
  );
  const response = toRecord(data);
  if (response && typeof response.data === 'boolean') {
    return response.data;
  }

  return true;
}

export async function getEventById(id: EntityId): Promise<IntegrationEvent | null> {
  const { data } = await apiClient.get<unknown>(`/api/integrations/events/${id}/`);
  return mapSingleEvent(data, id);
}

export const apiIntegrationsService: IntegrationsService = {
  async listIntegrationEvents(params) {
    return listEvents(params);
  },

  async getIntegrationEventById(id) {
    return getEventById(id);
  },

  async listIntegrationConfigs(params) {
    return listConfigs(params);
  },

  async getIntegrationConfigById(id) {
    return getConfigById(id);
  },

  async createIntegrationConfig(input) {
    return createConfig(input);
  },

  async updateIntegrationConfig(id, input) {
    return updateConfig(id, input);
  },

  async patchIntegrationConfig(id, input) {
    return patchConfig(id, input);
  },

  async deleteIntegrationConfig(id) {
    return deleteConfig(id);
  },

  async getInstagramBusinessProfile() {
    return getInstagramBusinessProfile();
  },

  async getInstagramWebhook() {
    return getInstagramWebhook();
  },

  async postInstagramWebhook(payload) {
    return postInstagramWebhook(payload);
  },

  async postTelegramInbound(payload) {
    return postTelegramInbound(payload);
  },
};

