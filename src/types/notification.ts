import type { EntityId, SortDirection, TimestampString } from './common';
import type { UserSummary } from './user';

export type NotificationChannel = 'in_app' | 'telegram' | 'system';

export interface AppNotification {
  id: EntityId;
  created_at: TimestampString;
  updated_at: TimestampString;
  title: string;
  message: string;
  channel: NotificationChannel;
  is_read: boolean;
  metadata: Record<string, string | number | boolean | null> | null;
  user: UserSummary | null;
}

export interface NotificationListParams {
  page: number;
  pageSize: number;
  search?: string;
  channel?: NotificationChannel;
  is_read?: boolean;
  ordering?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}
