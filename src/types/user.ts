import type { AppRole } from './architecture';
import type { AuditInfo, EntityId, TimestampString } from './common';

export type UserRole = AppRole;

export type UserStatus = 'active' | 'inactive' | 'invited';

export interface UserSummary {
  id: EntityId;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AppUser extends AuditInfo {
  id: EntityId;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  permissionKeys?: string[];
  lastActiveAt?: TimestampString;
}

export type UserPermissionCode =
  | 'can_view_dashboard'
  | 'can_view_agents'
  | 'can_manage_agents'
  | 'can_view_couriers'
  | 'can_manage_couriers'
  | 'can_view_leads'
  | 'can_manage_leads'
  | 'can_view_customers'
  | 'can_manage_customers'
  | 'can_view_products'
  | 'can_manage_products'
  | 'can_view_orders'
  | 'can_update_orders'
  | 'can_view_payments'
  | 'can_manage_payments'
  | 'can_chat'
  | 'can_view_notifications'
  | 'can_manage_users'
  | 'can_manage_integrations'
  | 'can_manage_ai_settings'
  | 'can_view_logs';

export interface UserPermission {
  id: EntityId;
  code: UserPermissionCode;
  name: string;
  description: string;
}

export interface ManagedUser {
  id: EntityId;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  custom_permissions: EntityId[];
  created_by?: EntityId | null;
  created_by_name?: string | null;
  created_at: TimestampString;
  updated_at: TimestampString;
}

export interface UserListParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  is_active?: boolean;
  ordering?: string;
}

export interface UserMutationInput {
  email: string;
  full_name: string;
  phone?: string | null;
  password?: string;
  role: UserRole;
  is_active: boolean;
  custom_permission_ids?: EntityId[];
}

export type UserPatchInput = Partial<UserMutationInput>;
