// @ts-nocheck

import { apiClient } from '../../lib/api-client';
import type {
  OperatorStatisticsDetail,
  OperatorStatisticsParams,
  OperatorStatisticsSummary,
} from '../../types/domain';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function unwrapData<T>(value: unknown): T {
  const payload = toRecord(value);
  if (!payload) {
    return value as T;
  }

  const nested = payload.data;
  return (nested ?? payload) as T;
}

function normalizeDateParam(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listOperatorStatistics(
  params?: OperatorStatisticsParams,
): Promise<OperatorStatisticsSummary[]> {
  const { data } = await apiClient.get<unknown>('/api/common/operator-statistics/', {
    params: {
      date_from: normalizeDateParam(params?.date_from),
      date_to: normalizeDateParam(params?.date_to),
    },
  });

  const unwrapped = unwrapData<unknown>(data);
  return Array.isArray(unwrapped) ? (unwrapped as OperatorStatisticsSummary[]) : [];
}

export async function getOperatorStatisticsById(
  operatorId: string,
  params?: OperatorStatisticsParams,
): Promise<OperatorStatisticsDetail | null> {
  const { data } = await apiClient.get<unknown>(
    `/api/common/operator-statistics/${operatorId}/`,
    {
      params: {
        date_from: normalizeDateParam(params?.date_from),
        date_to: normalizeDateParam(params?.date_to),
      },
    },
  );

  const unwrapped = unwrapData<unknown>(data);
  const record = toRecord(unwrapped);
  return record ? (record as OperatorStatisticsDetail) : null;
}

