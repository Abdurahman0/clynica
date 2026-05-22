import type { EntityId, SortDirection, TimestampString } from './common';

export interface AISetting {
  id: EntityId;
  created_at: TimestampString;
  updated_at: TimestampString;
  name: string;
  system_prompt: string;
  follow_up_message?: string | null;
  model_name: string;
  temperature: number;
  auto_order_enabled: boolean;
  order_confidence_threshold: number;
  resume_after_operator_minutes: number;
  is_active: boolean;
  updated_by: EntityId | null;
  updated_by_name?: string | null;
}

export interface AISettingsListParams {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
  is_active?: boolean;
}

export interface AISettingMutationInput {
  name: string;
  system_prompt: string;
  follow_up_message?: string | null;
  model_name: string;
  temperature: number;
  auto_order_enabled: boolean;
  order_confidence_threshold: number;
  resume_after_operator_minutes: number;
  is_active?: boolean;
}

export type AISettingPatchInput = Partial<AISettingMutationInput>;
