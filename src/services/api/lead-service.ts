// @ts-nocheck


import type { LeadService } from '../core/contracts';
import type {
  EntityId,
  Lead,
  LeadMutationInput,
  LeadPatchInput,
  PaginatedResult,
  TableQueryParams,
} from '../../types/domain';
import { apiClient } from '../../lib/api-client';
import {
  mapLeadDtoToModel,
  mapLeadListDtoToItems,
  type LeadDto,
} from '../adapters/lead-adapter';

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
  allItems: Lead[],
  params?: TableQueryParams,
  totalItemsHint?: number | null,
): PaginatedResult<Lead> {
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

function normalizePayload(
  input: LeadMutationInput | LeadPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.full_name !== undefined) {
    payload.full_name = input.full_name;
  }
  if (input.phone !== undefined) {
    payload.phone = input.phone;
  }
  if (input.source !== undefined) {
    payload.source = input.source;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }
  if (input.ai_summary !== undefined) {
    payload.ai_summary = input.ai_summary;
  }
  if (input.manager !== undefined) {
    payload.manager = input.manager;
  }
  if (input.metadata !== undefined) {
    payload.metadata = input.metadata;
  }

  return payload;
}

export const apiLeadService: LeadService = {
  async list(params) {
    return apiLeadService.listLeads(params);
  },

  async getById(id) {
    return apiLeadService.getLeadById(id);
  },

  async create(input) {
    return apiLeadService.createLead(input);
  },

  async update(id, input) {
    return apiLeadService.updateLead(id, input);
  },

  async patch(id, input) {
    return apiLeadService.patchLead(id, input);
  },

  async delete(id) {
    return apiLeadService.deleteLead(id);
  },

  async listLeads(params) {
    const { data } = await apiClient.get<unknown>('/api/leads/', {
      params: {
        page: params?.page,
        page_size: params?.pageSize ?? params?.page_size,
        search: params?.search,
        status: params?.status,
        source: params?.source,
        manager: params?.assignedOperator ?? params?.assigned_operator ?? params?.manager,
        ordering:
          params?.ordering ??
          (params?.sortBy
            ? `${params.sortDirection === 'desc' ? '-' : ''}${params.sortBy}`
            : undefined),
      },
    });

    const items = mapLeadListDtoToItems(data);
    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : null;
    const totalItemsHint = readNumber(payload?.count);

    return toPaginatedResult(items, params, totalItemsHint);
  },

  async getLeadById(id) {
    const { data } = await apiClient.get<LeadDto>(`/api/leads/${id}/`);
    return mapLeadDtoToModel(data);
  },

  async createLead(input) {
    const { data } = await apiClient.post<LeadDto>('/api/leads/', normalizePayload(input));
    return mapLeadDtoToModel(data);
  },

  async updateLead(id, input) {
    const { data } = await apiClient.put<LeadDto>(
      `/api/leads/${id}/`,
      normalizePayload(input),
    );
    return mapLeadDtoToModel(data);
  },

  async patchLead(id, input) {
    const { data } = await apiClient.patch<LeadDto>(
      `/api/leads/${id}/`,
      normalizePayload(input),
    );
    return mapLeadDtoToModel(data);
  },

  async deleteLead(id: EntityId) {
    await apiClient.delete(`/api/leads/${id}/`);
    return true;
  },
};

