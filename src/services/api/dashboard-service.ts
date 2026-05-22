// @ts-nocheck


import {
  mapDashboardOverviewDtoToModel,
  type DashboardOverviewDto,
} from '../adapters/dashboard-adapter';
import type {
  DashboardOverview,
  DashboardOverviewParams,
  DashboardService,
} from '../core/contracts';
import { apiClient } from '../../lib/api-client';

export const apiDashboardService: DashboardService = {
  async getOverview(params?: DashboardOverviewParams): Promise<DashboardOverview> {
    const { data } = await apiClient.get<DashboardOverviewDto>('/api/common/dashboard/', {
      params: {
        date_from: params?.date_from,
        date_to: params?.date_to,
        interval: params?.interval,
      },
    });

    const payload =
      data && typeof data === 'object' && !Array.isArray(data)
        ? ((data as Record<string, unknown>).data ?? data)
        : data;

    return mapDashboardOverviewDtoToModel(payload as DashboardOverviewDto);
  },
};

