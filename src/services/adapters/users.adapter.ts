// @ts-nocheck


import type { ManagedUser, UserPermission, UserPermissionCode, UserRole } from '../../types/domain';

export type UserDto = Record<string, unknown>;
export type UserPermissionDto = Record<string, unknown>;

const DEFAULT_USER_NAME = "Noma'lum foydalanuvchi";
const DEFAULT_PERMISSION_NAME = "Noma'lum ruxsat";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
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

  return fallback;
}

function normalizeRole(value: unknown): UserRole {
  if (value === 'developer' || value === 'admin' || value === 'operator') {
    return value;
  }

  return 'operator';
}

function isUuidLike(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function resolveUserName(dto: UserDto): string {
  const explicitName =
    readString(dto.full_name) ||
    readString(dto.fullName) ||
    readString(dto.name);
  if (explicitName && !isUuidLike(explicitName)) {
    return explicitName;
  }

  const email = readString(dto.email);
  if (email.includes('@')) {
    const localPart = email.split('@')[0]?.trim();
    if (localPart) {
      return localPart;
    }
  }

  return DEFAULT_USER_NAME;
}

function normalizePermissionCode(value: unknown): UserPermissionCode {
  const normalized = readString(value);
  return (normalized || 'can_view_dashboard') as UserPermissionCode;
}

function mapPermissionId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const id = readString(value);
    return id || null;
  }

  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id);
  return id || null;
}

function mapCustomPermissionIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();

  value.forEach((entry) => {
    const id = mapPermissionId(entry);
    if (id) {
      unique.add(id);
    }
  });

  return Array.from(unique);
}

function mapCreatedBy(value: unknown): {
  createdById: string | null;
  createdByName: string | null;
} {
  if (typeof value === 'string' || typeof value === 'number') {
    const id = readString(value);
    return {
      createdById: id || null,
      createdByName: null,
    };
  }

  const record = toRecord(value);
  if (!record) {
    return {
      createdById: null,
      createdByName: null,
    };
  }

  const createdById = readString(record.id) || null;
  const createdByName =
    readString(record.full_name) ||
    readString(record.fullName) ||
    readString(record.name) ||
    readString(record.email) ||
    null;

  return {
    createdById,
    createdByName,
  };
}

export function mapUserPermissionDtoToModel(
  dto: UserPermissionDto,
): UserPermission | null {
  // Backend variants:
  // - { id, code, name, description }
  // - { key, label, module, description } (e.g. /api/auth/all-permissions/)
  const id = readString(dto.id) || readString(dto.key) || readString(dto.code);
  if (!id) {
    return null;
  }

  const codeCandidate =
    readString(dto.code) ||
    readString(dto.key) ||
    readString(dto.permission) ||
    readString(dto.permission_code);

  const name =
    readString(dto.name) ||
    readString(dto.label) ||
    codeCandidate ||
    DEFAULT_PERMISSION_NAME;
  const description =
    readString(dto.description) ||
    readString(dto.details);

  return {
    id,
    code: normalizePermissionCode(codeCandidate),
    name,
    description,
  };
}

export function mapPermissionListDtoToItems(value: unknown): UserPermission[] {
  const fromArray = (items: unknown[]): UserPermission[] =>
    items
      .map((item) => toRecord(item))
      .filter((item): item is UserPermissionDto => item !== null)
      .map((item) => mapUserPermissionDtoToModel(item))
      .filter((item): item is UserPermission => item !== null);

  if (Array.isArray(value)) {
    return fromArray(value);
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  const items = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.permissions)
        ? payload.permissions
        : Array.isArray(payload.data)
          ? payload.data
        : [];

  return fromArray(items);
}

export function mapUserDtoToModel(dto: UserDto): ManagedUser {
  const nowIso = new Date().toISOString();
  const id = readString(dto.id) || `managed-user-${nowIso}`;
  const createdBy = mapCreatedBy(dto.created_by ?? dto.createdBy);
  const explicitCreatedByName =
    readString(dto.created_by_name) ||
    readString(dto.createdByName);
  const createdByNameCandidate = explicitCreatedByName || createdBy.createdByName;
  const createdByName =
    createdByNameCandidate && !isUuidLike(createdByNameCandidate)
      ? createdByNameCandidate
      : null;

  return {
    id,
    email: readString(dto.email),
    full_name: resolveUserName(dto),
    phone: readString(dto.phone) || null,
    role: normalizeRole(dto.role),
    is_active: readBoolean(dto.is_active, true),
    custom_permissions: mapCustomPermissionIds(
      dto.custom_permissions ??
        dto.custom_permission_ids ??
        dto.effective_permissions ??
        dto.direct_permissions,
    ),
    created_by: createdBy.createdById,
    created_by_name: createdByName || null,
    created_at: readString(dto.created_at) || readString(dto.createdAt) || nowIso,
    updated_at: readString(dto.updated_at) || readString(dto.updatedAt) || nowIso,
  };
}

export function mapUserListDtoToItems(value: unknown): ManagedUser[] {
  const fromArray = (items: unknown[]): ManagedUser[] =>
    items
      .map((item) => toRecord(item))
      .filter((item): item is UserDto => item !== null)
      .map((item) => mapUserDtoToModel(item));

  if (Array.isArray(value)) {
    return fromArray(value);
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

  return fromArray(items);
}

