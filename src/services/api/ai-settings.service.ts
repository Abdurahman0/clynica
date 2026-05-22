// @ts-nocheck


import { apiClient } from '../../lib/api-client';
import type {
  AISetting,
  AISettingMutationInput,
  AISettingPatchInput,
  AISettingsListParams,
  EntityId,
  PaginatedResult,
} from '../../types/domain';
import {
  mapAISettingDtoToModel,
  mapAISettingListDtoToItems,
  type AISettingDto,
} from '../adapters/ai-settings.adapter';
import type { AISettingsService } from '../core/contracts';

const ACTIVE_SETTINGS_FETCH_SIZE = 500;

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

function toPaginatedResult(
  allItems: AISetting[],
  params?: AISettingsListParams,
  totalItemsHint?: number | null,
): PaginatedResult<AISetting> {
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

function toMutationPayload(
  input: AISettingMutationInput | AISettingPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }
  if (input.system_prompt !== undefined) {
    payload.system_prompt = input.system_prompt;
  }
  if (input.follow_up_message !== undefined) {
    payload.follow_up_message = input.follow_up_message;
  }
  if (input.model_name !== undefined) {
    payload.model = input.model_name;
  }
  if (input.temperature !== undefined) {
    payload.temperature = Number(input.temperature);
  }
  if (input.resume_after_operator_minutes !== undefined) {
    payload.follow_up_minutes = Math.round(
      Number(input.resume_after_operator_minutes),
    );
  }
  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  return payload;
}

function extractAISettingDto(value: unknown): AISettingDto | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nested = toRecord(payload.setting) ?? toRecord(payload.result) ?? toRecord(payload.data);
  if (nested) {
    return nested;
  }

  return payload;
}

function mapSingleAISetting(value: unknown, fallbackId?: EntityId): AISetting | null {
  const dto = extractAISettingDto(value);
  if (!dto) {
    return null;
  }

  const dtoId =
    typeof dto.id === 'string' && dto.id.trim().length > 0 ? dto.id : null;

  return mapAISettingDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

export async function listAiSettings(
  params?: AISettingsListParams,
): Promise<PaginatedResult<AISetting>> {
  const { data } = await apiClient.get<unknown>('/api/ai/settings/', {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      search: params?.search,
      is_active: params?.is_active,
      ordering:
        params?.ordering ??
        (params?.sortBy
          ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
          : undefined),
    },
  });

  const items = mapAISettingListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, params, totalItemsHint);
}

export async function getAiSettingById(id: EntityId): Promise<AISetting | null> {
  const { data } = await apiClient.get<unknown>(`/api/ai/settings/${id}/`);
  return mapSingleAISetting(data, id);
}

export async function getActiveAiSetting(): Promise<AISetting | null> {
  const { data } = await apiClient.get<unknown>('/api/ai/settings/active/');
  return mapSingleAISetting(data);
}

export async function createAiSetting(input: AISettingMutationInput): Promise<AISetting> {
  const { data } = await apiClient.post<unknown>(
    '/api/ai/settings/',
    toMutationPayload(input),
  );

  const mapped = mapSingleAISetting(data);
  if (!mapped) {
    throw new Error('Failed to create AI setting: invalid API response.');
  }

  return mapped;
}

export async function updateAiSetting(
  id: EntityId,
  input: AISettingMutationInput,
): Promise<AISetting | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/ai/settings/${id}/`,
    toMutationPayload(input),
  );

  return mapSingleAISetting(data, id);
}

export async function patchAiSetting(
  id: EntityId,
  input: AISettingPatchInput,
): Promise<AISetting | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/ai/settings/${id}/`,
    toMutationPayload(input),
  );

  return mapSingleAISetting(data, id);
}

export async function deleteAiSetting(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/ai/settings/${id}/`);
  return true;
}

export async function setActiveAiSetting(id: EntityId): Promise<AISetting | null> {
  try {
    const activeSettings = await listAiSettings({
      page: 1,
      pageSize: ACTIVE_SETTINGS_FETCH_SIZE,
      is_active: true,
      ordering: '-updated_at',
    });

    const deactivateTargets = activeSettings.items.filter((setting) => setting.id !== id);
    if (deactivateTargets.length > 0) {
      await Promise.allSettled(
        deactivateTargets.map((setting) =>
          patchAiSetting(setting.id, { is_active: false }),
        ),
      );
    }
  } catch {
    // Backend may already enforce single-active semantics.
  }

  const patched = await patchAiSetting(id, { is_active: true });
  if (patched) {
    return patched;
  }

  return getAiSettingById(id);
}

export const apiAISettingsService: AISettingsService = {
  async list(params) {
    return listAiSettings(params);
  },

  async getById(id) {
    return getAiSettingById(id);
  },

  async listAISettings(params) {
    return listAiSettings(params);
  },

  async getAISettingById(id) {
    return getAiSettingById(id);
  },

  async createAISetting(input) {
    return createAiSetting(input);
  },

  async updateAISetting(id, input) {
    return updateAiSetting(id, input);
  },

  async patchAISetting(id, input) {
    return patchAiSetting(id, input);
  },

  async deleteAISetting(id) {
    return deleteAiSetting(id);
  },

  async setActiveAISetting(id) {
    return setActiveAiSetting(id);
  },

  async getActiveAISetting() {
    return getActiveAiSetting();
  },
};

