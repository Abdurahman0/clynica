// @ts-nocheck


import { apiClient } from '../../lib/api-client';
import type { AuthTokens } from '../../lib/auth-storage';
import { PERMISSION_CODES, type AuthenticatedUser, type PermissionCode } from '../../auth/types';
import type { AppRole } from '../../types/architecture';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse extends Partial<AuthTokens> {
  user?: unknown;
}

type MeResponse = unknown;

const PERMISSION_CODE_SET = new Set<string>(PERMISSION_CODES);
const PRIMARY_PERMISSION_COLLECTION_KEYS = [
  'permissionKeys',
  'permission_keys',
  'custom_permissions',
  'custom_permission_ids',
  'effective_permissions',
  'role_permissions',
] as const;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function unwrapUserPayload(value: unknown): Record<string, unknown> {
  const record = toRecord(value);
  if (!record) {
    return {};
  }

  const nestedUser = toRecord(record.user);
  if (nestedUser) {
    return nestedUser;
  }

  const nestedData = toRecord(record.data);
  if (nestedData) {
    return nestedData;
  }

  const nestedResult = toRecord(record.result);
  if (nestedResult) {
    return nestedResult;
  }

  return record;
}

function readString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function resolveRole(value: unknown): AppRole {
  if (value === 'developer' || value === 'admin' || value === 'operator') {
    return value;
  }

  return 'operator';
}

function toPermissionCode(value: unknown): PermissionCode | null {
  const raw = readString(value);
  if (!raw) {
    return null;
  }

  return PERMISSION_CODE_SET.has(raw) ? (raw as PermissionCode) : null;
}

function mapBackendPermissionToken(token: string): PermissionCode[] {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const alias: Record<string, PermissionCode[]> = {
    'dashboard.view': ['can_view_dashboard'],

    'clients.view': ['can_view_clients'],
    'clients.manage': ['can_manage_clients'],

    'bookings.view': ['can_view_bookings'],
    'bookings.manage': ['can_manage_bookings'],

    'statuses.view': ['can_view_statuses'],
    'statuses.manage': ['can_manage_statuses'],
    'tasks.view': ['can_view_tasks'],
    'tasks.manage': ['can_manage_tasks'],
    'task_statuses.view': ['can_view_task_statuses'],
    'task_statuses.manage': ['can_manage_task_statuses'],

    'products.view': ['can_view_products'],
    'products.manage': ['can_manage_products'],

    'contracts.view': ['can_view_contracts'],
    'contracts.manage': ['can_manage_contracts'],

    'leads.view': ['can_view_leads'],
    'leads.manage': ['can_manage_leads'],

    // Chats can be exposed as `chat.*` or `chats.*`.
    'chat.view': ['can_access_chats', 'can_view_conversations'],
    'chat.manage': ['can_access_chats', 'can_manage_conversations'],
    'chats.view': ['can_access_chats', 'can_view_conversations'],
    'chats.manage': ['can_access_chats', 'can_manage_conversations'],
    'conversations.view': ['can_access_chats', 'can_view_conversations'],
    'conversations.manage': ['can_access_chats', 'can_manage_conversations'],

    'notifications.view': ['can_view_notifications'],
    'notifications.manage': ['can_view_notifications'],

    'users.view': ['can_view_users'],
    'users.manage': ['can_manage_users'],

    'logs.view': ['can_view_logs'],
    'audit_logs.view': ['can_view_audit_logs', 'can_view_logs'],

    'integrations.manage': ['can_manage_integrations', 'can_manage_settings'],

    'ai_settings.manage': ['can_manage_ai_settings', 'can_manage_settings'],
    'ai-settings.manage': ['can_manage_ai_settings', 'can_manage_settings'],
    'ai_settings.view': ['can_view_settings'],
    'ai-settings.view': ['can_view_settings'],
    'settings.view': ['can_view_settings'],
    'settings.manage': [
      'can_manage_settings',
      'can_manage_ai_settings',
      'can_manage_integrations',
    ],
  };

  const direct = alias[normalized];
  if (direct?.length) {
    return direct.filter((code) => PERMISSION_CODE_SET.has(code));
  }

  const parts = normalized.split('.').filter(Boolean);
  if (parts.length !== 2) {
    return [];
  }

  const [scopeRaw, actionRaw] = parts;
  const scope = scopeRaw.replace(/-/g, '_');
  const action = actionRaw.replace(/-/g, '_');

  if (scope === 'chat' || scope === 'chats') {
    if (action === 'view') {
      return ['can_access_chats', 'can_view_conversations'];
    }
    if (action === 'manage') {
      return ['can_access_chats', 'can_manage_conversations'];
    }
    return ['can_access_chats'];
  }

  if (scope === 'conversations') {
    if (action === 'view') {
      return ['can_access_chats', 'can_view_conversations'];
    }
    if (action === 'manage') {
      return ['can_access_chats', 'can_manage_conversations'];
    }
    return ['can_access_chats'];
  }

  if (scope === 'notifications') {
    return ['can_view_notifications'];
  }

  if (scope === 'users') {
    if (action === 'view') {
      return ['can_view_users'];
    }
    if (action === 'manage') {
      return ['can_manage_users'];
    }
    return ['can_view_users'];
  }

  if (scope === 'ai_settings') {
    if (action === 'view') {
      return ['can_view_settings'];
    }
    if (action === 'manage') {
      return ['can_manage_ai_settings', 'can_manage_settings'];
    }
    return [];
  }

  if (scope === 'integrations') {
    if (action === 'view') {
      return ['can_view_settings'];
    }
    if (action === 'manage') {
      return ['can_manage_integrations', 'can_manage_settings'];
    }
    return [];
  }

  if (scope === 'logs') {
    return ['can_view_logs'];
  }

  if (scope === 'audit_logs') {
    return ['can_view_audit_logs', 'can_view_logs'];
  }

  if (scope === 'settings') {
    if (action === 'view') {
      return ['can_view_settings'];
    }
    if (action === 'manage') {
      return [
        'can_manage_settings',
        'can_manage_ai_settings',
        'can_manage_integrations',
      ];
    }
  }

  const viewCode = `can_view_${scope}`;
  const manageCode = `can_manage_${scope}`;

  if (action === 'view' && PERMISSION_CODE_SET.has(viewCode)) {
    return [viewCode as PermissionCode];
  }

  if (action === 'manage' && PERMISSION_CODE_SET.has(manageCode)) {
    return [manageCode as PermissionCode];
  }

  return [];
}

function pushPermissionCode(value: unknown, bucket: Set<PermissionCode>): void {
  const directCode = toPermissionCode(value);
  if (directCode) {
    bucket.add(directCode);
    return;
  }

  const raw = readString(value);
  if (!raw || (!raw.includes(',') && !raw.includes(' '))) {
    if (!raw) {
      return;
    }

    mapBackendPermissionToken(raw).forEach((code) => bucket.add(code));
    return;
  }

  raw
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      if (PERMISSION_CODE_SET.has(token)) {
        bucket.add(token as PermissionCode);
        return;
      }

      mapBackendPermissionToken(token).forEach((code) => bucket.add(code));
    });
}

function collectPermissionCodes(
  value: unknown,
  bucket: Set<PermissionCode>,
  depth = 0,
): void {
  if (depth > 3 || value === null || typeof value === 'undefined') {
    return;
  }

  pushPermissionCode(value, bucket);

  if (Array.isArray(value)) {
    value.forEach((entry) => collectPermissionCodes(entry, bucket, depth + 1));
    return;
  }

  const record = toRecord(value);
  if (!record) {
    return;
  }

  pushPermissionCode(record.code, bucket);
  pushPermissionCode(record.permission, bucket);
  pushPermissionCode(record.permission_code, bucket);
  pushPermissionCode(record.key, bucket);
  pushPermissionCode(record.name, bucket);

  PRIMARY_PERMISSION_COLLECTION_KEYS.forEach((key) => {
    collectPermissionCodes(record[key], bucket, depth + 1);
  });

  collectPermissionCodes(record.results, bucket, depth + 1);
  collectPermissionCodes(record.items, bucket, depth + 1);
  collectPermissionCodes(record.data, bucket, depth + 1);
}

function resolvePermissionCodes(userRecord: Record<string, unknown>, role: AppRole): PermissionCode[] {
  if (role === 'developer') {
    return [...PERMISSION_CODES];
  }

  const resolvedCodes = new Set<PermissionCode>();

  PRIMARY_PERMISSION_COLLECTION_KEYS.forEach((key) => {
    collectPermissionCodes(userRecord[key], resolvedCodes);
  });

  PERMISSION_CODES.forEach((permissionCode) => {
    if (userRecord[permissionCode] === true) {
      resolvedCodes.add(permissionCode);
    }
  });

  if (resolvedCodes.size === 0) {
    // Fallback for backends that only expose assigned permissions as `permissions`.
    collectPermissionCodes(userRecord.permissions, resolvedCodes);
  }

  return Array.from(resolvedCodes);
}

function normalizeUser(rawUser: unknown): AuthenticatedUser {
  const userRecord = unwrapUserPayload(rawUser);
  const role = resolveRole(userRecord.role);
  const email = readString(userRecord.email) ?? '';
  const firstName = readString(userRecord.first_name) ?? readString(userRecord.firstName) ?? '';
  const lastName = readString(userRecord.last_name) ?? readString(userRecord.lastName) ?? '';
  const fullNameFromParts = `${firstName} ${lastName}`.trim();
  const fullName =
    readString(userRecord.fullName) ??
    readString(userRecord.full_name) ??
    (fullNameFromParts || null) ??
    readString(userRecord.name) ??
    readString(userRecord.username) ??
    email;

  const statusValue = userRecord.status;
  const isActiveValue = userRecord.is_active;
  const status =
    statusValue === 'active' || statusValue === 'inactive' || statusValue === 'invited'
      ? statusValue
      : isActiveValue === false
        ? 'inactive'
        : 'active';

  return {
    id: readString(userRecord.id) ?? email ?? `user-${Date.now()}`,
    fullName: fullName || "Noma'lum foydalanuvchi",
    email,
    phone: readString(userRecord.phone) ?? undefined,
    role,
    status,
    avatarUrl: readString(userRecord.avatarUrl) ?? readString(userRecord.avatar_url) ?? undefined,
    permissionKeys: resolvePermissionCodes(userRecord, role),
    createdAt:
      readString(userRecord.createdAt) ??
      readString(userRecord.created_at) ??
      '',
    updatedAt:
      readString(userRecord.updatedAt) ??
      readString(userRecord.updated_at) ??
      '',
  };
}

export interface AuthLoginResult extends AuthTokens {
  user: AuthenticatedUser;
}

export const authService = {
  async login(username: string, password: string): Promise<AuthLoginResult> {
    const payload: LoginRequest = { username, password };
    const { data } = await apiClient.post<any>('/api/auth/login/', payload, {
      _skipAuthRefresh: true,
    });

    // Handle both response formats:
    // Format 1: { access: "...", refresh: "...", user: {...} }
    // Format 2: { status: "success", data: { access: "...", refresh: "...", user: {...} } }
    const responseData = data.data || data;

    if (typeof responseData.access !== 'string' || typeof responseData.refresh !== 'string') {
      throw new Error('Invalid login response.');
    }

    return {
      access: responseData.access,
      refresh: responseData.refresh,
      user: normalizeUser(responseData.user),
    };
  },

  async getMe(): Promise<AuthenticatedUser> {
    const { data } = await apiClient.get<any>('/api/auth/me/');
    // Handle both response formats
    const responseData = data.data || data;
    const userData = responseData?.user ?? responseData;
    return normalizeUser(userData);
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout/', undefined, {
      _skipAuthRefresh: true,
    });
  },

};

