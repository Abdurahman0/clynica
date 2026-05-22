// @ts-nocheck


import type {
  DashboardBreakdownItem,
  DashboardManagerPerformanceItem,
  DashboardOverview,
  DashboardRegionDemandItem,
  DashboardTopProduct,
  DashboardTimeSeriesPoint,
} from '../core/contracts';

export type DashboardOverviewDto = Record<string, unknown>;

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function readDecimalString(value: unknown): string {
  const raw = readString(value, '0');
  return raw.length > 0 ? raw : '0';
}

function readCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapBreakdownItems(value: unknown): DashboardBreakdownItem[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};
    const key = readString(itemRecord.key) || `item-${index}`;

    return {
      key,
      label: readString(itemRecord.label) || key,
      count: readCount(itemRecord.count),
    };
  });
}

function mapTopProducts(value: unknown): DashboardTopProduct[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};
    const productId =
      readString(itemRecord.product_id) ||
      readString(itemRecord.productId) ||
      readString(itemRecord.id) ||
      readString(itemRecord.key) ||
      `product-${index}`;
    const quantity = readCount(
      itemRecord.total !== undefined
        ? itemRecord.total
        : itemRecord.quantity !== undefined
          ? itemRecord.quantity
          : itemRecord.count,
    );
    const label = readString(itemRecord.name) || readString(itemRecord.label) || productId;

    return {
      product_id: productId,
      key: productId,
      label,
      count: quantity,
      revenue: readDecimalString(
        itemRecord.amount !== undefined ? itemRecord.amount : itemRecord.revenue,
      ),
    };
  });
}

function mapTimeSeries(value: unknown): DashboardTimeSeriesPoint[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};

    return {
      bucket_start: readString(itemRecord.bucket_start) || `bucket-${index}`,
      bucket_end: readString(itemRecord.bucket_end),
      label: readString(itemRecord.label),
      leads: readCount(itemRecord.leads),
      chats: readCount(itemRecord.chats),
      clients: readCount(itemRecord.clients ?? itemRecord.customers),
      contracts: readCount(itemRecord.contracts ?? itemRecord.orders),
      revenue: readDecimalString(itemRecord.revenue),
      collected_amount: readDecimalString(itemRecord.collected_amount),
    };
  });
}

function mapRegionDemand(value: unknown): DashboardRegionDemandItem[] {
  return toArray(value).map((item, index) => {
    const itemRecord = toRecord(item) ?? {};
    return {
      region: readString(itemRecord.region) || `region-${index + 1}`,
      total: readCount(itemRecord.total),
    };
  });
}

function mapManagerPerformance(value: unknown): DashboardManagerPerformanceItem[] {
  return toArray(value).map((item) => {
    const itemRecord = toRecord(item) ?? {};
    const managerIdRaw = itemRecord.manager_id;
    return {
      manager_id:
        typeof managerIdRaw === 'string'
          ? managerIdRaw
          : managerIdRaw == null
            ? null
            : String(managerIdRaw),
      manager_username: readString(itemRecord.manager_username),
      total: readCount(itemRecord.total),
      won: readCount(itemRecord.won),
      lost: readCount(itemRecord.lost),
    };
  });
}

export function mapDashboardOverviewDtoToModel(
  dto: DashboardOverviewDto,
): DashboardOverview {
  const payloadWrapper = toRecord(dto);
  const data =
    toRecord(payloadWrapper?.data) ??
    (readString(payloadWrapper?.status).toLowerCase() === 'success'
      ? payloadWrapper
      : payloadWrapper) ??
    {};
  const dateRange = toRecord(data.date_range) ?? {};
  const filteredSummary = toRecord(data.filtered_summary) ?? {};
  const breakdowns = toRecord(data.breakdowns) ?? {};

  const mappedLeadStatus =
    mapBreakdownItems(breakdowns.leads_by_status).length > 0
      ? mapBreakdownItems(breakdowns.leads_by_status)
      : [
          { key: 'new', label: 'New', count: readCount(data.leads) },
          { key: 'lost', label: 'Lost', count: readCount(data.lost_leads) },
          { key: 'converted', label: 'Converted', count: readCount(data.clients) },
        ];

  const mappedLeadSource =
    mapBreakdownItems(breakdowns.leads_by_source).length > 0
      ? mapBreakdownItems(breakdowns.leads_by_source)
      : toArray(data.source_distribution).map((item, index) => {
          const itemRecord = toRecord(item) ?? {};
          const source = readString(itemRecord.source) || `source-${index}`;
          return {
            key: source,
            label: source,
            count: readCount(itemRecord.total),
          };
        });

  const mappedContractsByStatus =
    mapBreakdownItems(breakdowns.contracts_by_status).length > 0
      ? mapBreakdownItems(breakdowns.contracts_by_status)
      : toArray(data.contract_status_distribution).length > 0
        ? toArray(data.contract_status_distribution).map((item, index) => {
            const itemRecord = toRecord(item) ?? {};
            const status = readString(itemRecord.status) || `status-${index}`;
            return {
              key: status,
              label: status,
              count: readCount(itemRecord.total),
            };
          })
      : [
          {
            key: 'all',
            label: 'Contracts',
            count: readCount(data.contracts),
          },
        ];

  const mappedChatsByChannel =
    mapBreakdownItems(breakdowns.chats_by_channel).length > 0
      ? mapBreakdownItems(breakdowns.chats_by_channel)
      : mappedLeadSource;

  const mappedTopProducts =
    mapTopProducts(breakdowns.top_products).length > 0
      ? mapTopProducts(breakdowns.top_products)
      : mapTopProducts(data.top_products);

  const mappedTimeSeries =
    mapTimeSeries(data.time_series).length > 0
      ? mapTimeSeries(data.time_series)
      : toArray(data.timeline).map((item, index) => {
          const itemRecord = toRecord(item) ?? {};
          const day = readString(itemRecord.date) || `day-${index}`;
          return {
            bucket_start: day,
            bucket_end: day,
            label: day,
            leads: readCount(itemRecord.leads),
            chats: readCount(itemRecord.chats),
            clients: readCount(itemRecord.clients),
            contracts: readCount(itemRecord.contracts),
            revenue: '0',
            collected_amount: '0',
          };
        });

  const dateFrom =
    readString(dateRange.date_from) || readString(data.date_from) || '';
  const dateTo = readString(dateRange.date_to) || readString(data.date_to) || '';

  return {
    leads: readCount(data.leads),
    clients: readCount(data.clients),
    products: readCount(data.products),
    chats: readCount(data.chats),
    notifications: readCount(data.notifications),
    customers: readCount(data.customers ?? data.clients),
    orders: readCount(data.orders ?? data.contracts),
    pending_payments: readCount(data.pending_payments),
    contracts: readCount(data.contracts),
    unread_messages: readCount(data.unread_messages ?? data.notifications),
    revenue: readDecimalString(data.revenue),
    collected_amount: readDecimalString(data.collected_amount),
    pipeline_amount: readDecimalString(data.pipeline_amount),
    date_range: {
      date_from: dateFrom,
      date_to: dateTo,
      interval: readString(dateRange.interval, 'day'),
      label_format: readString(dateRange.label_format),
      timezone: readString(dateRange.timezone, 'Asia/Tashkent'),
    },
    filtered_summary: {
      leads: readCount(filteredSummary.leads ?? data.leads),
      new_leads: readCount(filteredSummary.new_leads),
      converted_leads: readCount(filteredSummary.converted_leads),
      customers: readCount(filteredSummary.customers ?? data.clients),
      clients: readCount(filteredSummary.clients ?? data.clients),
      new_customers: readCount(filteredSummary.new_customers),
      new_clients: readCount(filteredSummary.new_clients),
      orders: readCount(filteredSummary.orders ?? data.contracts),
      total_contracts: readCount(filteredSummary.total_contracts ?? data.contracts),
      active_contracts: readCount(filteredSummary.active_contracts ?? data.contracts),
      draft_orders: readCount(filteredSummary.draft_orders),
      waiting_payment_orders: readCount(filteredSummary.waiting_payment_orders),
      pending_orders: readCount(filteredSummary.pending_orders),
      completed_orders: readCount(filteredSummary.completed_orders),
      paid_orders: readCount(filteredSummary.paid_orders),
      cancelled_orders: readCount(filteredSummary.cancelled_orders),
      total_payments: readCount(filteredSummary.total_payments),
      pending_payments: readCount(filteredSummary.pending_payments ?? data.pending_payments),
      approved_payments: readCount(filteredSummary.approved_payments),
      verified_payments: readCount(filteredSummary.verified_payments),
      unread_messages: readCount(filteredSummary.unread_messages ?? data.notifications),
      total_chat_sessions: readCount(filteredSummary.total_chat_sessions ?? data.chats),
      active_chat_sessions: readCount(filteredSummary.active_chat_sessions ?? data.chats),
      revenue: readDecimalString(filteredSummary.revenue ?? data.revenue),
      collected_amount: readDecimalString(filteredSummary.collected_amount ?? data.collected_amount),
      pending_payment_amount: readDecimalString(filteredSummary.pending_payment_amount),
      average_order_value: readDecimalString(filteredSummary.average_order_value),
      lead_conversion_rate: readDecimalString(filteredSummary.lead_conversion_rate),
      average_contract_value: readDecimalString(filteredSummary.average_contract_value),
      contract_renewal_rate: readDecimalString(filteredSummary.contract_renewal_rate),
      order_completion_rate: readDecimalString(filteredSummary.order_completion_rate),
    },
    breakdowns: {
      leads_by_status: mappedLeadStatus,
      leads_by_source: mappedLeadSource,
      contracts_by_status: mappedContractsByStatus,
      orders_by_status: mapBreakdownItems(breakdowns.orders_by_status),
      products_by_category: mapBreakdownItems(breakdowns.products_by_category),
      orders_by_source: mapBreakdownItems(breakdowns.orders_by_source),
      payments_by_status: mapBreakdownItems(breakdowns.payments_by_status),
      payments_by_method: mapBreakdownItems(breakdowns.payments_by_method),
      chats_by_channel: mappedChatsByChannel,
      top_products: mappedTopProducts,
    },
    time_series: mappedTimeSeries,
    region_demand: mapRegionDemand(data.region_demand),
    manager_performance: mapManagerPerformance(data.manager_performance),
  };
}

