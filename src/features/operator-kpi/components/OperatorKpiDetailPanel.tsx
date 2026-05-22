import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { DataTable, type DataTableColumn } from '../../../components/shared/data';
import {
  EmptyState,
  LoadingState,
  PageCard,
} from '../../../components/shared/page';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../components/ui/chart';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { getChannelLabel, getLeadStatusLabel } from '../../../i18n/labels';
import { services } from '../../../services';
import type {
  OperatorStatisticsDetail,
  OperatorStatisticsParams,
  OperatorStatisticsDistributionItem,
  OperatorStatisticsSourceDistributionItem,
  OperatorStatisticsRecentClient,
} from '../../../types/domain';
import { Cell, Pie, PieChart } from 'recharts';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const primaryMetricClassName =
  'font-display text-[1.35rem] font-extrabold leading-none text-text-primary';

const metricLabelClassName =
  'mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-text-muted';

const COLORS_FALLBACK = [
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#059669',
  '#EF4444',
  '#0EA5E9',
] as const;

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultDateRange(): Required<OperatorStatisticsParams> {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - 29);

  return {
    date_from: toIsoDate(dateFrom),
    date_to: toIsoDate(dateTo),
  };
}

type PieSlice = {
  key: string;
  label: string;
  count: number;
  share: number;
  color: string;
};

interface OperatorKpiDetailPanelProps {
  operatorId: string;
  params?: OperatorStatisticsParams;
  onClose: () => void;
}

function OperatorKpiDetailPanel({
  operatorId,
  params,
  onClose,
}: OperatorKpiDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ';
  const query = useMemo(() => ({ ...defaultDateRange(), ...params }), [params]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [detail, setDetail] = useState<OperatorStatisticsDetail | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      setIsLoading(true);
      setHasError(false);

      try {
        const next = await services.operatorStatistics.getOperatorStatisticsById(
          operatorId,
          query,
        );

        if (!active) {
          return;
        }

        setDetail(next);
      } catch {
        if (!active) {
          return;
        }

        setHasError(true);
        setDetail(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [operatorId, query]);

  const chartConfig = useMemo(
    () =>
      ({
        count: {},
      }) satisfies ChartConfig,
    [],
  );

  const contractStatusPie = useMemo(
    () => {
      const items = Array.isArray(detail?.contract_status_distribution)
        ? detail.contract_status_distribution
        : [];
      const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
      if (total <= 0) {
        return [];
      }

      return items
        .filter((item) => (item.total ?? 0) > 0)
        .map((item, index) => {
          const statusKey = String(item.status ?? `status-${index}`);
          return {
            key: statusKey,
            label: t(`contractsPage.statuses.${statusKey}`, { defaultValue: statusKey }),
            count: Number(item.total ?? 0),
            share: (Number(item.total ?? 0) / total) * 100,
            color: COLORS_FALLBACK[index % COLORS_FALLBACK.length]!,
          };
        });
    },
    [detail, t],
  );

  const clientStatusPie = useMemo(
    () => {
      const items = Array.isArray(detail?.client_status_distribution)
        ? detail.client_status_distribution
        : [];
      const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
      if (total <= 0) {
        return [];
      }

      return items
        .filter((item) => (item.total ?? 0) > 0)
        .map((item, index) => {
          const statusKey = String(item.status ?? `status-${index}`);
          return {
            key: statusKey,
            label: getLeadStatusLabel(t, statusKey, statusKey),
            count: Number(item.total ?? 0),
            share: (Number(item.total ?? 0) / total) * 100,
            color: COLORS_FALLBACK[index % COLORS_FALLBACK.length]!,
          };
        });
    },
    [detail, t],
  );

  const sourcePie = useMemo(
    () => {
      const items = Array.isArray(detail?.source_distribution)
        ? detail.source_distribution
        : [];
      const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
      if (total <= 0) {
        return [];
      }

      return items
        .filter((item) => (item.total ?? 0) > 0)
        .map((item, index) => {
          const sourceKey = String(item.source ?? `source-${index}`);
          return {
            key: sourceKey,
            label: getChannelLabel(t, sourceKey, sourceKey),
            count: Number(item.total ?? 0),
            share: (Number(item.total ?? 0) / total) * 100,
            color: COLORS_FALLBACK[index % COLORS_FALLBACK.length]!,
          };
        });
    },
    [detail, t],
  );

  const recentClientColumns = useMemo<DataTableColumn<OperatorStatisticsRecentClient>[]>(() => {
    return [
      {
        key: 'full_name',
        label: t('operatorKpi.recentClients.columns.client', { defaultValue: 'Client' }),
        render: (item) => (
          <div className="grid gap-0.5">
            <span className="text-sm font-semibold text-text-primary">{item.full_name}</span>
            <span className="text-[12px] text-text-secondary">{item.phone}</span>
          </div>
        ),
      },
      {
        key: 'status',
        label: t('operatorKpi.recentClients.columns.status', { defaultValue: 'Status' }),
        render: (item) => (
          <span className="text-sm font-semibold text-text-secondary">
            {getLeadStatusLabel(t, item.status, item.status)}
          </span>
        ),
      },
      {
        key: 'source',
        label: t('operatorKpi.recentClients.columns.source', { defaultValue: 'Source' }),
        render: (item) => (
          <span className="text-sm font-semibold text-text-secondary">
            {getChannelLabel(t, item.source_platform, item.source_platform)}
          </span>
        ),
      },
      {
        key: 'last_contact_at',
        label: t('operatorKpi.recentClients.columns.lastContact', { defaultValue: 'Last Contact' }),
        align: 'right',
        render: (item) => (
          <span className="block text-right text-[12px] font-semibold text-text-muted">
            {formatLocalizedDate(item.last_contact_at, i18n.language, { locale })}
          </span>
        ),
      },
    ];
  }, [i18n.language, locale, t]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[860px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('operatorKpi.detail.ariaLabel', { defaultValue: 'Operator KPI detail' })}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('operatorKpi.detail.eyebrow', { defaultValue: 'Operator KPI' })}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {detail?.full_name || detail?.username || t('common.notAvailable')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {query.date_from} — {query.date_to}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              aria-label={t('operatorKpi.detail.close', { defaultValue: 'Close' })}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {isLoading ? (
          <PageCard>
            <LoadingState
              title={t('operatorKpi.detail.loadingTitle', { defaultValue: 'Loading KPI…' })}
              description={t('operatorKpi.detail.loadingDescription', { defaultValue: 'Fetching operator statistics.' })}
            />
          </PageCard>
        ) : hasError || !detail ? (
          <PageCard>
            <EmptyState
              title={t('operatorKpi.detail.errorTitle', { defaultValue: 'Unable to load KPI' })}
              description={t('operatorKpi.detail.errorDescription', { defaultValue: 'Please try again later.' })}
            />
          </PageCard>
        ) : (
          <div className="grid gap-4">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PageCard>
                <div className="p-4">
                  <p className={primaryMetricClassName}>{detail.contacted_clients}</p>
                  <p className={metricLabelClassName}>{t('operatorKpi.metrics.contactedClients', { defaultValue: 'Contacted clients' })}</p>
                </div>
              </PageCard>
              <PageCard>
                <div className="p-4">
                  <p className={primaryMetricClassName}>{detail.messages_sent}</p>
                  <p className={metricLabelClassName}>{t('operatorKpi.metrics.messagesSent', { defaultValue: 'Messages sent' })}</p>
                </div>
              </PageCard>
              <PageCard>
                <div className="p-4">
                  <p className={primaryMetricClassName}>{detail.contract_count ?? 0}</p>
                  <p className={metricLabelClassName}>{t('operatorKpi.metrics.contracts', { defaultValue: 'Contracts' })}</p>
                </div>
              </PageCard>
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
              <PageCard>
                <div className="p-4">
                  <p className={labelClassName}>{t('operatorKpi.distributions.contractStatus', { defaultValue: 'Contract status' })}</p>
                  {contractStatusPie.length === 0 ? (
                    <p className="mt-3 text-sm text-text-muted">{t('common.na')}</p>
                  ) : (
                    <div className="mt-3">
                      <div className="h-[190px] w-full">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                          <PieChart>
                            <Pie
                              data={contractStatusPie}
                              dataKey="count"
                              nameKey="label"
                              innerRadius={45}
                              outerRadius={74}
                              paddingAngle={3}
                              cornerRadius={6}
                              stroke="rgb(var(--color-border-soft) / 0.45)"
                              strokeWidth={2}
                            >
                              {contractStatusPie.map((item) => (
                                <Cell key={item.key} fill={item.color} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    </div>
                  )}
                </div>
              </PageCard>

              <PageCard>
                <div className="p-4">
                  <p className={labelClassName}>{t('operatorKpi.distributions.clientStatus', { defaultValue: 'Client status' })}</p>
                  {clientStatusPie.length === 0 ? (
                    <p className="mt-3 text-sm text-text-muted">{t('common.na')}</p>
                  ) : (
                    <div className="mt-3">
                      <div className="h-[190px] w-full">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                          <PieChart>
                            <Pie
                              data={clientStatusPie}
                              dataKey="count"
                              nameKey="label"
                              innerRadius={45}
                              outerRadius={74}
                              paddingAngle={3}
                              cornerRadius={6}
                              stroke="rgb(var(--color-border-soft) / 0.45)"
                              strokeWidth={2}
                            >
                              {clientStatusPie.map((item) => (
                                <Cell key={item.key} fill={item.color} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    </div>
                  )}
                </div>
              </PageCard>

              <PageCard>
                <div className="p-4">
                  <p className={labelClassName}>{t('operatorKpi.distributions.sources', { defaultValue: 'Sources' })}</p>
                  {sourcePie.length === 0 ? (
                    <p className="mt-3 text-sm text-text-muted">{t('common.na')}</p>
                  ) : (
                    <div className="mt-3">
                      <div className="h-[190px] w-full">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                          <PieChart>
                            <Pie
                              data={sourcePie}
                              dataKey="count"
                              nameKey="label"
                              innerRadius={45}
                              outerRadius={74}
                              paddingAngle={3}
                              cornerRadius={6}
                              stroke="rgb(var(--color-border-soft) / 0.45)"
                              strokeWidth={2}
                            >
                              {sourcePie.map((item) => (
                                <Cell key={item.key} fill={item.color} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    </div>
                  )}
                </div>
              </PageCard>
            </section>

            <section>
              <PageCard>
                <div className="p-4">
                  <p className="m-0 text-[1.05rem] font-semibold text-text-primary">
                    {t('operatorKpi.recentClients.title', { defaultValue: 'Recent clients' })}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {t('operatorKpi.recentClients.subtitle', { defaultValue: 'Latest contacted clients for the selected date range.' })}
                  </p>
                </div>
                <div className="px-3 pb-3">
                  <DataTable
                    data={detail.recent_clients ?? []}
                    columns={recentClientColumns}
                    rowKey="id"
                    emptyTitle={t('operatorKpi.recentClients.emptyTitle', { defaultValue: 'No clients' })}
                    emptyDescription={t('operatorKpi.recentClients.emptyDescription', { defaultValue: 'No recent contacts found.' })}
                  />
                </div>
              </PageCard>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

export default OperatorKpiDetailPanel;
