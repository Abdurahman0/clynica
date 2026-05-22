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
import type { Client, ClientsListParams } from '../../../services/contracts';

export interface ClientsListViewProps {
  onRowClick?: (client: Client) => void;
  onEditClient?: (client: Client) => void;
  onDeleteClient?: (client: Client) => void;
  selectedClientId?: string | null;
  canManageClients?: boolean;
  onStatsChange?: (stats: { visible: number; total: number; loading: boolean }) => void;
}

type SelectOption = { value: string; label: string };

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

export function ClientsListView({
  onRowClick,
  onEditClient,
  onDeleteClient,
  selectedClientId,
  canManageClients = false,
  onStatsChange,
}: ClientsListViewProps) {
  const { i18n } = useTranslation();
  const isRu = i18n.language === 'ru';

  const tx = isRu
    ? {
        searchPlaceholder: 'Поиск по имени, телефону или заметкам...',
        allStatuses: 'Все статусы',
        allSources: 'Все источники',
        updatedNewest: 'Обновлено (новые)',
        updatedOldest: 'Обновлено (старые)',
        createdNewest: 'Создано (новые)',
        createdOldest: 'Создано (старые)',
        statusLabel: 'Статус',
        sourceLabel: 'Источник',
        orderLabel: 'Сортировка',
        listTitle: 'Список клиентов',
        listHint: 'Нажмите на строку, чтобы открыть профиль.',
        columns: {
          name: 'Клиент',
          phone: 'Телефон',
          source: 'Источник',
          status: 'Статус',
          actions: 'Действия',
        },
        edit: 'Редактировать',
        delete: 'Удалить',
        empty: 'Клиенты не найдены',
      }
    : {
        searchPlaceholder: 'Ism, telefon yoki izoh bo\'yicha qidiring...',
        allStatuses: 'Barcha holatlar',
        allSources: 'Barcha manbalar',
        updatedNewest: 'Yangilangan (yangi)',
        updatedOldest: 'Yangilangan (eski)',
        createdNewest: 'Yaratilgan (yangi)',
        createdOldest: 'Yaratilgan (eski)',
        statusLabel: 'Holat',
        sourceLabel: 'Manba',
        orderLabel: 'Saralash',
        listTitle: 'Mijozlar ro\'yxati',
        listHint: 'Profilni ko\'rish uchun satrni bosing.',
        columns: {
          name: 'Mijoz',
          phone: 'Telefon',
          source: 'Manba',
          status: 'Holat',
          actions: 'Amallar',
        },
        edit: 'Tahrirlash',
        delete: 'O\'chirish',
        empty: 'Mijozlar topilmadi',
      };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [ordering, setOrdering] = useState<string>('-updated_at');
  const [statusOptionsFromApi, setStatusOptionsFromApi] = useState<SelectOption[]>([]);
  const [filters, setFilters] = useState<ClientsListParams>({
    search: '',
    page: 1,
    page_size: 20,
    ordering: '-updated_at',
  });

  const fetcher = useCallback(
    (params?: ClientsListParams) => services.clients.listClients(params),
    [],
  );

  const [state, actions] = useList<Client, ClientsListParams>(fetcher, {
    params: filters,
    autoFetch: true,
  });

  useEffect(() => {
    onStatsChange?.({
      visible: state.items.length,
      total: state.total,
      loading: state.isLoading,
    });
  }, [onStatsChange, state.items.length, state.total, state.isLoading]);

  useEffect(() => {
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
          setStatusOptionsFromApi(mapped);
        }
      } catch {
        // fallback status options remain
      }
    })();
  }, []);

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
      { value: 'manual', label: isRu ? 'Вручную' : 'Qo\'lda' },
      { value: 'telegram', label: 'Telegram' },
      { value: 'instagram', label: 'Instagram' },
    ],
    [isRu, tx.allSources],
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

  const columns = useMemo<DataTableColumn<Client>[]>(
    () => [
      {
        key: 'full_name',
        label: tx.columns.name,
        render: (client) => (
          <div className="grid gap-0.5">
            <span className={tablePrimaryTextClassName}>{client.full_name}</span>
            <span className={tableSecondaryTextClassName}>{client.notes || '-'}</span>
          </div>
        ),
      },
      {
        key: 'phone',
        label: tx.columns.phone,
        render: (client) => <span className={tablePrimaryTextClassName}>{client.phone || '-'}</span>,
      },
      {
        key: 'source_platform',
        label: tx.columns.source,
        render: (client) => (
          <span className={tablePrimaryTextClassName}>
            {client.source_platform === 'manual'
              ? (isRu ? 'Вручную' : 'Qo\'lda')
              : client.source_platform === 'telegram'
              ? 'Telegram'
              : client.source_platform === 'instagram'
              ? 'Instagram'
              : (client.source_platform_label || client.source_platform || '-')}
          </span>
        ),
      },
      {
        key: 'status',
        label: tx.columns.status,
        render: (client) => {
          const resolvedLabel =
            client.status_label ||
            (client.status ? statusLabelByValue.get(String(client.status)) : undefined) ||
            String(client.status || '-');

          return (
            <StatusBadge
              status={String(client.status || 'unknown')}
              label={resolvedLabel}
              tone={getStatusTone(client.status, resolvedLabel)}
            />
          );
        },
      },
      ...(canManageClients
        ? [
            {
              key: 'actions',
              label: tx.columns.actions,
              align: 'right' as const,
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
            },
          ]
        : []),
    ],
    [canManageClients, isRu, onDeleteClient, onEditClient, statusLabelByValue, tx],
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

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <SearchInput
          value={searchQuery}
          onChange={handleSearch}
          placeholder={tx.searchPlaceholder}
        />

        <label className="grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]">
          <span className={labelClassName}>{tx.statusLabel}</span>
          <FilterSelect
            value={statusFilter}
            options={statusOptions}
            onChange={applyStatusFilter}
            disabled={state.isLoading}
          />
        </label>

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

      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[1rem] font-semibold text-text-primary">{tx.listTitle}</h2>
            <span className="text-[12px] font-medium text-text-muted">{tx.listHint}</span>
          </div>
        </div>

        <div className="min-w-0 [&_.data-table__row--clickable:hover_.status-badge]:-translate-y-px">
          <DataTable
            data={state.items}
            columns={columns}
            rowKey="id"
            selectedRowKey={selectedClientId ?? null}
            loading={state.isLoading}
            onRowClick={onRowClick}
            emptyTitle={tx.empty}
            emptyDescription={isRu ? 'Измените параметры поиска или фильтры.' : 'Qidiruv yoki filtrlarni o\'zgartiring.'}
          />
        </div>
      </div>

      {state.total > 0 ? (
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

