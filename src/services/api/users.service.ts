// @ts-nocheck


import { apiClient } from '../../lib/api-client';
import type {
  EntityId,
  ManagedUser,
  PaginatedResult,
  UserListParams,
  UserMutationInput,
  UserPatchInput,
  UserPermission,
} from '../../types/domain';
import {
  mapPermissionListDtoToItems,
  mapUserDtoToModel,
  mapUserListDtoToItems,
  mapUserPermissionDtoToModel,
  type UserDto,
  type UserPermissionDto,
} from '../adapters/users.adapter';
import type { UserService } from '../core/contracts';

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

function extractDto<T extends Record<string, unknown>>(value: unknown): T | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const nestedUser = toRecord(payload.user);
  if (nestedUser) {
    return nestedUser as T;
  }

  const nestedResult = toRecord(payload.result);
  if (nestedResult) {
    return nestedResult as T;
  }

  const nestedData = toRecord(payload.data);
  if (nestedData) {
    return nestedData as T;
  }

  return payload as T;
}

function toPaginatedResult(
  allItems: ManagedUser[],
  params?: UserListParams,
  totalItemsHint?: number | null,
): PaginatedResult<ManagedUser> {
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
  input: UserMutationInput | UserPatchInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const normalizeText = (value: string | null | undefined): string =>
    typeof value === 'string' ? value : '';

  const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }
    const parts = trimmed.split(/\s+/);
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
    };
  };

  if (input.email !== undefined) {
    payload.email = input.email;
  }
  const explicitFirstName = normalizeText((input as Record<string, unknown>).first_name as string | null | undefined).trim();
  const explicitLastName = normalizeText((input as Record<string, unknown>).last_name as string | null | undefined).trim();
  if (explicitFirstName || explicitLastName) {
    payload.first_name = explicitFirstName || null;
    payload.last_name = explicitLastName || null;
  } else if (input.full_name !== undefined) {
    const { firstName, lastName } = splitFullName(normalizeText(input.full_name));
    payload.first_name = firstName || null;
    payload.last_name = lastName || null;
  }
  if (input.phone !== undefined) {
    payload.phone = normalizeText(input.phone);
  }
  if (input.password !== undefined) {
    payload.password = input.password;
  }
  if (input.role !== undefined) {
    payload.role = input.role;
  }
  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }
  if (input.custom_permission_ids !== undefined) {
    payload.custom_permission_ids = input.custom_permission_ids;
  }

  return payload;
}

function mapSingleUser(value: unknown, fallbackId?: EntityId): ManagedUser | null {
  const dto = extractDto<UserDto>(value);
  if (!dto) {
    return null;
  }

  const dtoId =
    typeof dto.id === 'string' && dto.id.trim().length > 0 ? dto.id : null;

  return mapUserDtoToModel(dtoId || !fallbackId ? dto : { ...dto, id: fallbackId });
}

function mapSinglePermission(value: unknown): UserPermission | null {
  const dto = extractDto<UserPermissionDto>(value);
  if (!dto) {
    return null;
  }

  return mapUserPermissionDtoToModel(dto);
}

export async function listUsers(
  params?: UserListParams,
): Promise<PaginatedResult<ManagedUser>> {
  const { data } = await apiClient.get<unknown>('/api/users/', {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      search: params?.search,
      role: params?.role,
      is_active: params?.is_active,
      ordering: params?.ordering,
    },
  });

  const items = mapUserListDtoToItems(data);
  const payload = toRecord(data);
  const totalItemsHint = readNumber(payload?.count);

  return toPaginatedResult(items, params, totalItemsHint);
}

export async function getUserById(id: EntityId): Promise<ManagedUser | null> {
  const { data } = await apiClient.get<unknown>(`/api/users/${id}/`);
  return mapSingleUser(data, id);
}

export async function createUser(input: UserMutationInput): Promise<ManagedUser> {
  const { data } = await apiClient.post<unknown>('/api/users/', toMutationPayload(input));
  const mapped = mapSingleUser(data);

  if (!mapped) {
    throw new Error('Failed to create user: invalid API response.');
  }

  return mapped;
}

export async function updateUser(
  id: EntityId,
  input: UserMutationInput,
): Promise<ManagedUser | null> {
  const { data } = await apiClient.put<unknown>(
    `/api/users/${id}/`,
    toMutationPayload(input),
  );

  return mapSingleUser(data, id);
}

export async function patchUser(
  id: EntityId,
  input: UserPatchInput,
): Promise<ManagedUser | null> {
  const { data } = await apiClient.patch<unknown>(
    `/api/users/${id}/`,
    toMutationPayload(input),
  );

  return mapSingleUser(data, id);
}

export async function deleteUser(id: EntityId): Promise<boolean> {
  await apiClient.delete(`/api/users/${id}/`);
  return true;
}

export async function toggleUserActive(id: EntityId): Promise<ManagedUser | null> {
  const { data } = await apiClient.post<unknown>(`/api/users/${id}/toggle_active/`, {});
  const mapped = mapSingleUser(data, id);
  if (mapped) {
    return mapped;
  }

  return getUserById(id);
}

export async function listPermissions(): Promise<UserPermission[]> {
  // Preferred backend endpoint (Renaissance Clinic API): /api/auth/all-permissions/
  // Fallbacks are kept for older deployments.
  const candidates = [
    '/api/auth/all-permissions/',
    '/api/auth/permissions/catalog/',
    '/api/auth/permissions/',
    '/api/users/permissions/',
  ] as const;

  for (const path of candidates) {
    try {
      const { data } = await apiClient.get<unknown>(path);
      const items = mapPermissionListDtoToItems(data);
      if (items.length > 0) {
        return items;
      }
    } catch {
      // Try next candidate.
    }
  }

  return [];
}

export async function getPermissionById(id: EntityId): Promise<UserPermission | null> {
  const allPermissions = await listPermissions();
  return (
    allPermissions.find((permission) => permission.id === id) ??
    allPermissions.find((permission) => permission.code === id) ??
    null
  );
}

export const apiUserService: UserService = {
  async listUsers(params) {
    return listUsers(params);
  },

  async getUserById(id) {
    return getUserById(id);
  },

  async createUser(input) {
    return createUser(input);
  },

  async updateUser(id, input) {
    return updateUser(id, input);
  },

  async patchUser(id, input) {
    return patchUser(id, input);
  },

  async deleteUser(id) {
    return deleteUser(id);
  },

  async toggleUserActive(id) {
    return toggleUserActive(id);
  },

  async listPermissions() {
    return listPermissions();
  },

  async getPermissionById(id) {
    return getPermissionById(id);
  },
};

