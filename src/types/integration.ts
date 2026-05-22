import type { EntityId, SortDirection, TimestampString } from './common';

export type IntegrationPlatform = 'instagram' | 'telegram' | 'userbot' | 'payment';

export type IntegrationProvider = 'openai' | 'telegram' | 'instagram';

export interface IntegrationEvent {
  id: EntityId;
  created_at: TimestampString;
  updated_at: TimestampString;
  platform: IntegrationPlatform;
  event_type: string;
  external_id: string;
  event_key: string;
  payload: Record<string, unknown> | null;
  processed: boolean;
  processing_attempts: number;
  error_message: string | null;
}

export interface IntegrationConfig {
  id: EntityId;
  created_at: TimestampString;
  updated_at: TimestampString;
  provider: IntegrationProvider;
  key: string;
  label: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
  updated_by: EntityId | null;
  updated_by_name?: string | null;
}

export interface IntegrationEventListParams {
  page: number;
  pageSize: number;
  search?: string;
  platform?: IntegrationPlatform;
  processed?: boolean;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface IntegrationConfigListParams {
  page: number;
  pageSize: number;
  search?: string;
  provider?: IntegrationProvider;
  is_active?: boolean;
  is_secret?: boolean;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface IntegrationConfigMutationInput {
  provider: IntegrationProvider;
  key: string;
  label: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
}

export type IntegrationConfigPatchInput = Partial<IntegrationConfigMutationInput>;
