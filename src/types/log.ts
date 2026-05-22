import type { EntityId, SortDirection, TimestampString } from './common';

export type LogType = 'ai' | 'webhook' | 'error' | 'payment' | 'system';

export interface SystemHealth {
  status: string;
  database: string;
  redis: string;
}

export interface AppLog {
  id: EntityId;
  type: LogType;
  message: string;
  metadata: Record<string, unknown> | string | null;
  created_at: TimestampString;
}

export interface LogListParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: LogType;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface LogCleanupSettingsPatchInput {
  retentionHours: number;
}
