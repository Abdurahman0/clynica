import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  FilterBar,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/shared/data';
import { useList } from '../../../components/hooks';
import { services } from '../../../services';
import type { Client, ClientsListParams, CRMStatusItem } from '../../../services/contracts';

export interface ClientsListViewProps {
  tableMode?: TableMode;
  onTableModeChange?: (mode: TableMode) => void;
  onRowClick?: (client: Client) => void;
  onEditClient?: (client: Client) => void;
  onDeleteClient?: (client: Client) => void;
  onEditStatus?: (status: CRMStatusItem) => void;
  onDeleteStatus?: (status: CRMStatusItem) => void;
  selectedClientId?: string | null;
  canManageClients?: boolean;
  canViewStatuses?: boolean;
  canManageStatuses?: boolean;
  onStatsChange?: (stats: { visible: number; total: number; loading: boolean }) => void;
  onStatusesCountChange?: (count: number) => void;
}

type SelectOption = { value: string; label: string };
type TableMode = 'clients' | 'statuses';

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const tablePrimaryTextClassName =
  'block max-w-[140px] truncate text-sm font-semibold leading-[1.35] text-text-primary min-[640px]:max-w-[220px]';

const tableSecondaryTextClassName =
  'block max-w-[140px] truncate text-[12px] leading-[1.45] text-text-secondary min-[640px]:max-w-[220px]';

const actionButtonClassName =
  'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20';

function getStatusTone(status: string | undefined, label: string | undefined): 'info' | 'warning' | 'accent' | 'success' | 'danger' {
  const value = `${status ?? ''} ${label ?? ''}`.toLowerCase();

  if (value.includes('won') || value.includes('success') || value.includes('yut')) {
    return 'success';
  }

  if (value.includes('lost') || value.includes('cancel') || value.includes('yo\'qot') || value.includes('error')) {
    return 'danger';
  }

  if (value.includes('new') || value.includes('нов')) {
    return 'info';
  }

  if (value.includes('qualified') || value.includes('saral')) {
    return 'accent';
  }

  return 'warning';
}

function isPlaceholderStatusText(value: string | undefined | null): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === 'unknown' ||
    normalized === 'noma\'lum' ||
    normalized === 'неизвестно' ||
    normalized === 'none' ||
    normalized === 'null' ||
    normalized === 'undefined' ||
    normalized === '-'
  );
}

function parseHexColor(hexColor: string): [number, number, number] | null {
  const normalized = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  if (![red, green, blue].every(Number.isFinite)) {
    return null;
  }

  return [red, green, blue];
}

function rgbToHex(red: number, green: number, blue: number): string {
  const toHex = (value: number) => {
    const safe = Math.max(0, Math.min(255, Math.round(value)));
    return safe.toString(16).padStart(2, '0');
  };

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function mixRgb(
  source: [number, number, number],
  target: [number, number, number],
  ratio: number,
): [number, number, number] {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  return [
    source[0] + (target[0] - source[0]) * safeRatio,
    source[1] + (target[1] - source[1]) * safeRatio,
    source[2] + (target[2] - source[2]) * safeRatio,
  ];
}

function getStatusBadgePalette(hexColor: string): { background: string; border: string; text: string } {
  const parsed = parseHexColor(hexColor);
  if (!parsed) {
    return {
      background: '#EEF2F6',
      border: '#C9D2DC',
      text: '#1F2933',
    };
  }

  const backgroundRgb = mixRgb(parsed, [255, 255, 255], 0.84);
  const borderRgb = mixRgb(parsed, [255, 255, 255], 0.58);
  const textRgb = mixRgb(parsed, [0, 0, 0], 0.34);

  return {
    background: rgbToHex(backgroundRgb[0], backgroundRgb[1], backgroundRgb[2]),
    border: rgbToHex(borderRgb[0], borderRgb[1], borderRgb[2]),
    text: rgbToHex(textRgb[0], textRgb[1], textRgb[2]),
  };
}

export function ClientsListView({
  tableMode = 'clients',
  onTableModeChange,
  onRowClick,
  onEditClient,
  onDeleteClient,
  onEditStatus,
  onDeleteStatus,
  selectedClientId,
  canManageClients = false,
  canViewStatuses = false,
  canManageStatuses = false,
  onStatsChange,
  onStatusesCountChange,
}: ClientsListViewProps) {
  const { t } = useTranslation();
  const [isPhoneLayout, setIsPhoneLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  const tx = {
    searchPlaceholder: t('clients.list.searchPlaceholder'),
    allStatuses: t('clients.list.filters.allStatuses'),
    allSources: t('clients.list.filters.allSources'),
    updatedNewest: t('clients.list.ordering.updatedNewest'),
    updatedOldest: t('clients.list.ordering.updatedOldest'),
    createdNewest: t('clients.list.ordering.createdNewest'),
    createdOldest: t('clients.list.ordering.createdOldest'),
    statusLabel: t('clients.list.filters.statusLabel'),
    sourceLabel: t('clients.list.filters.sourceLabel'),
    orderLabel: t('clients.list.filters.orderLabel'),
    clientsTab: t('clients.list.tabs.clients'),
    statusesTab: t('clients.list.tabs.statuses'),
    listTitle: t('clients.list.title'),
    listHint: t('clients.list.hint'),
    statusesListTitle: t('clients.list.statusesTitle'),
    statusesListHint: t('clients.list.statusesHint'),
    columns: {
      name: t('clients.list.columns.name'),
      phone: t('clients.list.columns.phone'),
      source: t('clients.list.columns.source'),
      status: t('clients.list.columns.status'),
      actions: t('clients.list.columns.actions'),
    },
    edit: t('clients.list.actions.edit'),
    delete: t('clients.list.actions.delete'),
    empty: t('clients.list.empty.title'),
    emptyDescription: t('clients.list.empty.description'),
    statusesEmpty: t('clients.list.statusesEmpty.title'),
    statusesEmptyDescription: t('clients.list.statusesEmpty.description'),
    sourceManual: t('clients.list.sources.manual'),
    statusColumnLabel: t('clients.list.statusesColumns.status'),
    colorColumnLabel: t('clients.list.statusesColumns.color'),
    positionColumnLabel: t('clients.list.statusesColumns.position'),
    stateColumnLabel: t('clients.list.statusesColumns.state'),
    activeLabel: t('clients.list.statusesColumns.active'),
    inactiveLabel: t('clients.list.statusesColumns.inactive'),
    noStatus: t('common.na'),
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [ordering, setOrdering] = useState<string>('-updated_at');
  const [statusCatalog, setStatusCatalog] = useState<CRMStatusItem[]>([]);
  const [statusOptionsFromApi, setStatusOptionsFromApi] = useState<SelectOption[]>([]);
  const [filters, setFilters] = useState<ClientsListParams>({
    search: '',
    page: 1,
    page_size: 20,
    ordering: '-updated_at',
  });

  useEffect(() => {
    function handleResize() {
      setIsPhoneLayout(window.innerWidth < 640);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetcher = useCallback(
    (params?: ClientsListParams) => services.clients.listClients(params),
    [],
  );

  const [state, actions] = useList<Client, ClientsListParams>(fetcher, {
    params: filters,
    autoFetch: true,
  });
  const canUseStatusData = canViewStatuses || canManageStatuses;
  const canOpenStatusesTable = canManageStatuses;

  useEffect(() => {
    onStatsChange?.({
      visible: state.items.length,
      total: state.total,
      loading: state.isLoading,
    });
  }, [onStatsChange, state.items.length, state.total, state.isLoading]);

  useEffect(() => {
    if (!canOpenStatusesTable) {
      onStatusesCountChange?.(0);
      return;
    }
    onStatusesCountChange?.(statusCatalog.length);
  }, [canOpenStatusesTable, onStatusesCountChange, statusCatalog.length]);

  useEffect(() => {
    if (!canUseStatusData) {
      setStatusCatalog([]);
      setStatusOptionsFromApi([]);
      return;
    }

    void (async () => {
      try {
        const items = await (services.clients as any).listStatuses?.();
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }

        const mapped = items
          .filter((item: any) => item && item.id != null && item.name)
          .map((item: any) => ({
            value: String(item.id),
            label: String(item.name),
          }));

        if (mapped.length > 0) {
          const catalog = items
            .filter((item: any) => item && item.id != null && item.name)
            .map((item: any) => ({
              id: String(item.id),
              name: String(item.name),
              color: typeof item.color === 'string' ? item.color : undefined,
              position: typeof item.position === 'number' ? item.position : undefined,
              is_active:
                typeof item.is_active === 'boolean' ? item.is_active : undefined,
            }));
          setStatusCatalog(catalog);
          setStatusOptionsFromApi(mapped);
        }
      } catch {
        // fallback status options remain
      }
    })();
  }, [canUseStatusData]);

  const statusOptions = useMemo<SelectOption[]>(() => {
    const base = [{ value: 'all', label: tx.allStatuses }];
    if (statusOptionsFromApi.length > 0) {
      return [...base, ...statusOptionsFromApi];
    }
    return base;
  }, [statusOptionsFromApi, tx.allStatuses]);

  const sourceOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'all', label: tx.allSources },
      { value: 'manual', label: tx.sourceManual },
      { value: 'telegram', label: 'Telegram' },
      { value: 'instagram', label: 'Instagram' },
    ],
    [tx.allSources, tx.sourceManual],
  );

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-updated_at', label: tx.updatedNewest },
      { value: 'updated_at', label: tx.updatedOldest },
      { value: '-created_at', label: tx.createdNewest },
      { value: 'created_at', label: tx.createdOldest },
    ],
    [tx.createdNewest, tx.createdOldest, tx.updatedNewest, tx.updatedOldest],
  );

  const statusLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    statusOptionsFromApi.forEach((item) => map.set(item.value, item.label));
    return map;
  }, [statusOptionsFromApi]);

  const statusColorByValue = useMemo(() => {
    const map = new Map<string, string>();
    statusCatalog.forEach((status) => {
      if (status?.id && status?.color) {
        map.set(String(status.id), status.color);
      }
    });
    return map;
  }, [statusCatalog]);

  const statusesTableData = useMemo(() => {
    return [...statusCatalog].sort((left, right) => {
      const leftPos = typeof left.position === 'number' ? left.position : Number.MAX_SAFE_INTEGER;
      const rightPos = typeof right.position === 'number' ? right.position : Number.MAX_SAFE_INTEGER;
      if (leftPos === rightPos) {
        return left.name.localeCompare(right.name);
      }
      return leftPos - rightPos;
    });
  }, [statusCatalog]);

  const columns = useMemo<DataTableColumn<Client>[]>(() => {
    const nameColumn: DataTableColumn<Client> = {
      key: 'full_name',
      label: tx.columns.name,
      render: (client) => (
        <div className="grid gap-0.5">
          <span className={tablePrimaryTextClassName}>{client.full_name}</span>
          <span className={tableSecondaryTextClassName}>{client.notes || '-'}</span>
        </div>
      ),
    };

    const actionColumn: DataTableColumn<Client> | null = canManageClients
      ? {
          key: 'actions',
          label: tx.columns.actions,
          align: 'right',
          render: (client: Client) => (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                className={actionButtonClassName}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditClient?.(client);
                }}
                aria-label={tx.edit}
              >
                <FiEdit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={actionButtonClassName}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteClient?.(client);
                }}
                aria-label={tx.delete}
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ),
        }
      : null;

    const phoneColumn: DataTableColumn<Client> = {
      key: 'phone',
      label: tx.columns.phone,
      render: (client) => <span className={tablePrimaryTextClassName}>{client.phone || '-'}</span>,
    };

    const sourceColumn: DataTableColumn<Client> = {
      key: 'source_platform',
      label: tx.columns.source,
      render: (client) => (
        <span className={tablePrimaryTextClassName}>
          {client.source_platform === 'manual'
            ? tx.sourceManual
            : client.source_platform === 'telegram'
            ? 'Telegram'
            : client.source_platform === 'instagram'
            ? 'Instagram'
            : (client.source_platform_label || client.source_platform || '-')}
        </span>
      ),
    };

    const statusColumn: DataTableColumn<Client> = {
      key: 'status',
      label: tx.columns.status,
      render: (client) => {
        const transition = client.latest_status_transition;
        if (transition && transition.from_status_name && transition.to_status_name) {
          const fromColor = /^#([0-9a-fA-F]{6})$/.test(transition.from_status_color ?? '')
            ? transition.from_status_color!
            : '#9AA4AE';
          const toColor = /^#([0-9a-fA-F]{6})$/.test(transition.to_status_color ?? '')
            ? transition.to_status_color!
            : '#9AA4AE';
          const fromPalette = getStatusBadgePalette(fromColor);
          const toPalette = getStatusBadgePalette(toColor);
          return (
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              <span
                className="inline-flex min-w-0 shrink items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]"
                style={{
                  backgroundColor: fromPalette.background,
                  color: fromPalette.text,
                  border: `1px solid ${fromPalette.border}`,
                }}
              >
                <span className="truncate">{transition.from_status_name}</span>
              </span>
              <svg className="h-2.5 w-2.5 shrink-0 text-text-muted" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span
                className="inline-flex min-w-0 shrink items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]"
                style={{
                  backgroundColor: toPalette.background,
                  color: toPalette.text,
                  border: `1px solid ${toPalette.border}`,
                }}
              >
                <span className="truncate">{transition.to_status_name}</span>
              </span>
            </div>
          );
        }

        const normalizedStatus = String(client.status ?? '').trim().toLowerCase();
        const hasStatusValue =
          normalizedStatus.length > 0 &&
          normalizedStatus !== 'unknown' &&
          normalizedStatus !== 'none' &&
          normalizedStatus !== 'null' &&
          normalizedStatus !== 'undefined' &&
          normalizedStatus !== '-';
        const hasStatusLabel = !isPlaceholderStatusText(client.status_label);

        const resolvedLabel =
          (hasStatusLabel ? client.status_label : undefined) ||
          (hasStatusValue ? statusLabelByValue.get(String(client.status)) : undefined) ||
          (hasStatusValue ? String(client.status) : tx.noStatus);
        const statusColor =
          hasStatusValue && client.status
            ? statusColorByValue.get(String(client.status))
            : undefined;

        if (statusColor) {
          const normalizedColor =
            /^#([0-9a-fA-F]{6})$/.test(statusColor) ? statusColor : '#9AA4AE';
          const palette = getStatusBadgePalette(normalizedColor);
          return (
            <span
              className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[12px] font-semibold tracking-[0.02em]"
              style={{
                backgroundColor: palette.background,
                color: palette.text,
                border: `1px solid ${palette.border}`,
              }}
            >
              {resolvedLabel}
            </span>
          );
        }

        return (
          <StatusBadge
            status={hasStatusValue ? String(client.status) : 'neutral'}
            label={resolvedLabel}
            tone={hasStatusValue ? getStatusTone(client.status, resolvedLabel) : 'neutral'}
          />
        );
      },
    };

    const desktopColumns = [
      nameColumn,
      phoneColumn,
      sourceColumn,
      statusColumn,
      ...(actionColumn ? [actionColumn] : []),
    ];

    if (!isPhoneLayout || !actionColumn) {
      return desktopColumns;
    }

    return [nameColumn, actionColumn, phoneColumn, sourceColumn, statusColumn];
  }, [
    canManageClients,
    isPhoneLayout,
    onDeleteClient,
    onEditClient,
    statusColorByValue,
    statusLabelByValue,
    tx,
  ]);

  const statusColumns = useMemo<DataTableColumn<CRMStatusItem>[]>(
    () => [
      {
        key: 'name',
        label: tx.statusColumnLabel,
        render: (status) => (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full ring-1 ring-border-soft/45"
              style={{ backgroundColor: status.color || 'currentColor' }}
            />
            <span className={tablePrimaryTextClassName}>{status.name}</span>
          </div>
        ),
      },
      {
        key: 'color',
        label: tx.colorColumnLabel,
        render: (status) => (
          <span className={tableSecondaryTextClassName}>
            {status.color || '-'}
          </span>
        ),
      },
      {
        key: 'position',
        label: tx.positionColumnLabel,
        render: (status) => (
          <span className={tablePrimaryTextClassName}>
            {typeof status.position === 'number' ? status.position : '-'}
          </span>
        ),
      },
      {
        key: 'is_active',
        label: tx.stateColumnLabel,
        render: (status) => (
          <StatusBadge
            status={status.is_active ? 'active' : 'inactive'}
            label={status.is_active ? tx.activeLabel : tx.inactiveLabel}
            tone={status.is_active ? 'success' : 'neutral'}
          />
        ),
      },
      ...(canManageStatuses
        ? [
            {
              key: 'actions',
              label: tx.columns.actions,
              align: 'right' as const,
              render: (status: CRMStatusItem) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    className={actionButtonClassName}
                    onClick={() => onEditStatus?.(status)}
                    aria-label={tx.edit}
                  >
                    <FiEdit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={actionButtonClassName}
                    onClick={() => onDeleteStatus?.(status)}
                    aria-label={tx.delete}
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManageStatuses, onDeleteStatus, onEditStatus, tx],
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    actions.setPage(1);
    setFilters((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const applyStatusFilter = (value: string) => {
    setStatusFilter(value);
    actions.setPage(1);
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: value === 'all' ? undefined : (value as any),
    }));
  };

  const applySourceFilter = (value: string) => {
    setSourceFilter(value);
    actions.setPage(1);
    setFilters((prev) => ({
      ...prev,
      page: 1,
      source_platform: value === 'all' ? undefined : (value as any),
    }));
  };

  const applyOrdering = (value: string) => {
    setOrdering(value);
    actions.setPage(1);
    setFilters((prev) => ({ ...prev, page: 1, ordering: value }));
  };

  const totalPages = Math.max(1, Math.ceil((state.total || 0) / (filters.page_size || 20)));
  const currentPage = filters.page || 1;

  const isClientsMode = !canOpenStatusesTable || tableMode === 'clients';

  return (
    <div className="flex flex-col gap-4">
      {isClientsMode ? (
        <FilterBar>
          <SearchInput
            value={searchQuery}
            onChange={handleSearch}
            placeholder={tx.searchPlaceholder}
          />

          {canUseStatusData ? (
            <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
              <span className={labelClassName}>{tx.statusLabel}</span>
              <FilterSelect
                value={statusFilter}
                options={statusOptions}
                onChange={applyStatusFilter}
                disabled={state.isLoading}
              />
            </label>
          ) : null}

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
            <span className={labelClassName}>{tx.sourceLabel}</span>
            <FilterSelect
              value={sourceFilter}
              options={sourceOptions}
              onChange={applySourceFilter}
              disabled={state.isLoading}
            />
          </label>

          <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_240px]">
            <span className={labelClassName}>{tx.orderLabel}</span>
            <FilterSelect
              value={ordering}
              options={orderingOptions}
              onChange={applyOrdering}
              disabled={state.isLoading}
            />
          </label>
        </FilterBar>
      ) : null}

      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
              {isClientsMode ? tx.listTitle : tx.statusesListTitle}
            </h2>
            <span className="text-[12px] font-medium text-text-muted">
              {isClientsMode ? tx.listHint : tx.statusesListHint}
            </span>
          </div>
          {canOpenStatusesTable ? (
            <div className="inline-flex items-center gap-1 rounded-lg bg-surface-subtle p-1 ring-1 ring-border-soft/40">
              <button
                type="button"
                className={[
                  'inline-flex min-h-8 items-center rounded-md px-3 text-xs font-semibold transition duration-fast',
                  isClientsMode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-secondary hover:bg-surface-card hover:text-text-primary',
                ].join(' ')}
                onClick={() => onTableModeChange?.('clients')}
              >
                {tx.clientsTab}
              </button>
              <button
                type="button"
                className={[
                  'inline-flex min-h-8 items-center rounded-md px-3 text-xs font-semibold transition duration-fast',
                  !isClientsMode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-secondary hover:bg-surface-card hover:text-text-primary',
                ].join(' ')}
                onClick={() => onTableModeChange?.('statuses')}
              >
                {tx.statusesTab}
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 [&_.data-table__row--clickable:hover_.status-badge]:-translate-y-px">
          {isClientsMode ? (
            <DataTable
              data={state.items}
              columns={columns}
              rowKey="id"
              selectedRowKey={selectedClientId ?? null}
              loading={state.isLoading}
              onRowClick={onRowClick}
              emptyTitle={tx.empty}
              emptyDescription={tx.emptyDescription}
            />
          ) : (
            <DataTable
              data={statusesTableData}
              columns={statusColumns}
              rowKey="id"
              loading={false}
              emptyTitle={tx.statusesEmpty}
              emptyDescription={tx.statusesEmptyDescription}
            />
          )}
        </div>
      </div>

      {isClientsMode && state.total > 0 ? (
        <Pagination
          currentPage={Math.min(currentPage, totalPages)}
          totalPages={totalPages}
          totalItems={state.total}
          onPageChange={(page) => {
            actions.setPage(page);
            setFilters((prev) => ({ ...prev, page }));
          }}
        />
      ) : null}
    </div>
  );
}

