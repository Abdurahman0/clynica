import type { EntityId, TimestampString } from './common';

export interface OperatorStatisticsParams {
  date_from?: string;
  date_to?: string;
}

export interface OperatorStatisticsSummary {
  operator_id: EntityId;
  username: string;
  full_name: string;
  contacted_clients: number;
  contacted_sessions: number;
  messages_sent: number;
  contract_clients: number;
  lost_clients: number;
}

export interface OperatorStatisticsDistributionItem {
  status: string;
  total: number;
}

export interface OperatorStatisticsSourceDistributionItem {
  source: string;
  total: number;
}

export interface OperatorStatisticsRecentClient {
  id: EntityId;
  full_name: string;
  phone: string;
  status: string;
  source_platform: string;
  last_contact_at: TimestampString;
}

export interface OperatorStatisticsDetail extends OperatorStatisticsSummary {
  date_from: string;
  date_to: string;
  contract_count: number;
  client_status_distribution: OperatorStatisticsDistributionItem[];
  contract_status_distribution: OperatorStatisticsDistributionItem[];
  source_distribution: OperatorStatisticsSourceDistributionItem[];
  recent_clients: OperatorStatisticsRecentClient[];
}

