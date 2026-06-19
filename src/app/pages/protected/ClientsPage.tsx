import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../components/shared/dialogs/ConfirmDialog';
import { FilterSelect, Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, PageHeader, PageLayout, PageSection } from '../../../components/shared/page';
import ClientDeleteDialog from '../../../features/clients/components/ClientDeleteDialog';
import { ClientsDetailPanel } from '../../../features/clients/components/ClientsDetailPanel';
import { ClientsFormPanel } from '../../../features/clients/components/ClientsFormPanel';
import { ClientsListView } from '../../../features/clients/components/ClientsListView';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type { Client, CRMStatusItem } from '../../../services/contracts';

const STATUS_COLOR_OPTIONS = [
  { value: '#9AA4AE', key: 'neutral' },
  { value: '#2563EB', key: 'azure' },
  { value: '#0F766E', key: 'teal' },
  { value: '#1FA971', key: 'success' },
  { value: '#7C3AED', key: 'violet' },
  { value: '#C2418C', key: 'fuchsia' },
  { value: '#E0A84F', key: 'warning' },
  { value: '#F97316', key: 'orange' },
  { value: '#D95C5C', key: 'danger' },
  { value: '#7C4A2D', key: 'bronze' },
  { value: '#0F172A', key: 'midnight' },
] as const;

function ClientsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManageClients = hasPermission('can_manage_clients');
  const canViewStatuses = hasPermission('can_view_statuses');
  const canManageStatuses = hasPermission('can_manage_statuses');
  const canUseStatusesData = canViewStatuses || canManageStatuses;
  const canOpenStatusesTable = canManageStatuses;
  const canViewBookings = hasPermission('can_view_bookings');
  const canManageBookings = hasPermission('can_manage_bookings');
  const tx = {
    eyebrow: t('clients.page.eyebrow'),
    title: t('clients.page.title'),
    subtitle: t('clients.page.subtitle'),
    newClient: t('clients.page.newClient'),
    newStatus: t('clients.page.newStatus'),
    visible: t('clients.page.visible'),
    detailOpen: t('clients.page.detailOpen'),
    errorTitle: t('clients.page.errorTitle'),
    errorDescription: t('clients.page.errorDescription'),
    statusFormEyebrow: t('clients.statusForm.eyebrow'),
    statusFormTitleCreate: t('clients.statusForm.titleCreate'),
    statusFormTitleEdit: t('clients.statusForm.titleEdit'),
    statusFormName: t('clients.statusForm.name'),
    statusFormColor: t('clients.statusForm.color'),
    statusFormPosition: t('clients.statusForm.position'),
    statusFormActive: t('clients.statusForm.active'),
    statusDeleteEyebrow: t('clients.statusDelete.eyebrow'),
    statusDeleteDescription: t('clients.statusDelete.description'),
    statusDeleteAria: t('clients.statusDelete.ariaLabel'),
    statusPositionMustBeNumber: t('clients.statusMessages.positionMustBeNumber'),
    statusSaveFailed: t('clients.statusMessages.saveFailed'),
    statusDeleteFailed: t('clients.statusMessages.deleteFailed'),
    statusColorNeutral: t('clients.statusColors.neutral'),
    statusColorAzure: t('clients.statusColors.azure'),
    statusColorTeal: t('clients.statusColors.teal'),
    statusColorSuccess: t('clients.statusColors.success'),
    statusColorViolet: t('clients.statusColors.violet'),
    statusColorFuchsia: t('clients.statusColors.fuchsia'),
    statusColorWarning: t('clients.statusColors.warning'),
    statusColorOrange: t('clients.statusColors.orange'),
    statusColorDanger: t('clients.statusColors.danger'),
    statusColorBronze: t('clients.statusColors.bronze'),
    statusColorMidnight: t('clients.statusColors.midnight'),
  };

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [stats, setStats] = useState({ visible: 0, total: 0, loading: true });
  const [statusesCount, setStatusesCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tableMode, setTableMode] = useState<'clients' | 'statuses'>('clients');
  const [statusToDelete, setStatusToDelete] = useState<CRMStatusItem | null>(null);
  const [isDeletingStatus, setIsDeletingStatus] = useState(false);
  const [statusFormMode, setStatusFormMode] = useState<'create' | 'edit'>('create');
  const [editingStatus, setEditingStatus] = useState<CRMStatusItem | null>(null);
  const [isStatusFormOpen, setIsStatusFormOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({
    name: '',
    color: '#9AA4AE',
    position: '',
    is_active: true,
  });

  useEffect(() => {
    if (!canOpenStatusesTable) {
      setTableMode('clients');
    }
  }, [canOpenStatusesTable]);

  useEffect(() => {
    const state = location.state as { clientId?: string } | null;
    const requestedClientId = state?.clientId;
    if (!requestedClientId || typeof requestedClientId !== 'string') {
      return;
    }

    setSelectedClientId(requestedClientId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!actionMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActionMessage(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionMessage]);

  useEffect(() => {
    const state = location.state as { clientId?: string } | null;
    const requestedClientId = state?.clientId;

    if (!requestedClientId || typeof requestedClientId !== 'string') {
      setSelectedClientId(null);
    }

    setIsFormOpen(false);
    setEditingClient(null);
    setClientToDelete(null);
    setIsDeleting(false);
    setStatusToDelete(null);
    setIsDeletingStatus(false);
    setIsStatusFormOpen(false);
    setEditingStatus(null);
  }, [location.pathname]);

  function openCreateForm() {
    if (!canManageClients) {
      return;
    }

    setEditingClient(null);
    setIsFormOpen(true);
  }

  async function openCreateStatusForm() {
    if (!canManageStatuses) {
      return;
    }

    let nextPosition = '';
    try {
      const items = await (services.clients as any).listStatuses?.();
      if (Array.isArray(items) && items.length > 0) {
        const maxPosition = items.reduce((max: number, item: any) => {
          if (!item || item.position == null) {
            return max;
          }

          const positionNumber = Number(item.position);
          if (!Number.isFinite(positionNumber)) {
            return max;
          }

          return Math.max(max, positionNumber);
        }, 0);

        nextPosition = String(maxPosition + 1);
      } else {
        nextPosition = '1';
      }
    } catch {
      nextPosition = '';
    }

    setStatusFormMode('create');
    setEditingStatus(null);
    setStatusForm({
      name: '',
      color: '#9AA4AE',
      position: nextPosition,
      is_active: true,
    });
    setIsStatusFormOpen(true);
  }

  function openEditForm(client: Client) {
    if (!canManageClients) {
      return;
    }

    setEditingClient(client);
    setIsFormOpen(true);

    if (!canViewBookings) {
      return;
    }

    void services.clients
      .getClient(client.id)
      .then((detailedClient: Client) => {
        setEditingClient((current) =>
          current?.id === client.id ? detailedClient : current,
        );
      })
      .catch(() => {
        // Keep the already opened row payload if details are temporarily unavailable.
      });
  }

  function openEditStatusForm(status: CRMStatusItem) {
    if (!canManageStatuses) {
      return;
    }

    setStatusFormMode('edit');
    setEditingStatus(status);
    setStatusForm({
      name: status.name || '',
      color:
        status.color &&
        STATUS_COLOR_OPTIONS.some((entry) => entry.value === status.color)
          ? status.color
          : '#9AA4AE',
      position:
        typeof status.position === 'number' ? String(status.position) : '',
      is_active: status.is_active ?? true,
    });
    setIsStatusFormOpen(true);
  }

  function handleClientSaved(client: Client, options?: { close?: boolean }) {
    if (options?.close !== false) {
      setIsFormOpen(false);
      setEditingClient(null);
      setSelectedClientId(client.id);
    }
    setListRefreshKey((current) => current + 1);
  }

  function handleDeleteFromList(client: Client) {
    if (!canManageClients) {
      return;
    }

    setClientToDelete(client);
  }

  function handleDeleteStatusFromList(status: CRMStatusItem) {
    if (!canManageStatuses) {
      return;
    }

    setStatusToDelete(status);
  }






  async function handleConfirmDelete() {
    if (!clientToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await services.clients.deleteClient(clientToDelete.id);
      if (selectedClientId === clientToDelete.id) {
        setSelectedClientId(null);
      }
      setClientToDelete(null);
      setListRefreshKey((current) => current + 1);
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveStatus() {
    if (!canManageStatuses || !statusForm.name.trim()) {
      return;
    }

    setIsSavingStatus(true);

    try {
      const payload = {
        name: statusForm.name.trim(),
        color: statusForm.color.trim() || undefined,
        position:
          statusForm.position.trim().length > 0
            ? Number(statusForm.position)
            : undefined,
        is_active: statusForm.is_active,
      };

      if (
        payload.position !== undefined &&
        (!Number.isFinite(payload.position) || payload.position < 0)
      ) {
        throw new Error(tx.statusPositionMustBeNumber);
      }

      if (statusFormMode === 'create') {
        await (services.clients as any).createStatus?.(payload);
      } else if (editingStatus) {
        await (services.clients as any).updateStatus?.(editingStatus.id, payload);
      }

      setIsStatusFormOpen(false);
      setEditingStatus(null);
      setListRefreshKey((current) => current + 1);
    } catch (error) {
      setActionMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : tx.statusSaveFailed,
      });
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleConfirmDeleteStatus() {
    if (!statusToDelete || !canManageStatuses) {
      return;
    }

    setIsDeletingStatus(true);
    try {
      await (services.clients as any).deleteStatus?.(statusToDelete.id);
      setStatusToDelete(null);
      setListRefreshKey((current) => current + 1);
    } catch {
      setActionMessage({
        type: 'error',
        text: tx.statusDeleteFailed,
      });
    } finally {
      setIsDeletingStatus(false);
    }
  }

  const handleStatsChange = useCallback((next: { visible: number; total: number; loading: boolean }) => {
    setStats((current) => {
      if (
        current.visible === next.visible &&
        current.total === next.total &&
        current.loading === next.loading
      ) {
        return current;
      }

      return next;
    });

    if (!next.loading) {
      setHasError(false);
    }
  }, []);

  const statusColorSelectOptions = useMemo(
    () =>
      STATUS_COLOR_OPTIONS.map((entry) => ({
        value: entry.value,
        color: entry.value,
        label:
          entry.key === 'neutral'
            ? tx.statusColorNeutral
            : entry.key === 'azure'
              ? tx.statusColorAzure
              : entry.key === 'teal'
                ? tx.statusColorTeal
                : entry.key === 'success'
                  ? tx.statusColorSuccess
                  : entry.key === 'violet'
                    ? tx.statusColorViolet
                    : entry.key === 'fuchsia'
                      ? tx.statusColorFuchsia
                      : entry.key === 'warning'
                        ? tx.statusColorWarning
                        : entry.key === 'orange'
                          ? tx.statusColorOrange
                          : entry.key === 'danger'
                            ? tx.statusColorDanger
                            : entry.key === 'bronze'
                              ? tx.statusColorBronze
                              : tx.statusColorMidnight,
      })),
    [
      tx.statusColorAzure,
      tx.statusColorBronze,
      tx.statusColorDanger,
      tx.statusColorFuchsia,
      tx.statusColorMidnight,
      tx.statusColorNeutral,
      tx.statusColorOrange,
      tx.statusColorSuccess,
      tx.statusColorTeal,
      tx.statusColorViolet,
      tx.statusColorWarning,
    ],
  );

  const header = (
    <PageHeader
      eyebrow={tx.eyebrow}
      title={tx.title}
      subtitle={tx.subtitle}
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 min-[768px]:w-auto">
          {canManageClients ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={!canOpenStatusesTable || tableMode === 'clients' ? openCreateForm : openCreateStatusForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {tableMode === 'clients'
                ? tx.newClient
                : tx.newStatus}
            </button>
          ) : canOpenStatusesTable && tableMode === 'statuses' && canManageStatuses ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={openCreateStatusForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {tx.newStatus}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-success-bg px-3 text-[12px] font-semibold text-success">
            <AppIcon name="clients" className="h-3.5 w-3.5" aria-hidden="true" />
            {!canOpenStatusesTable || tableMode === 'clients'
              ? `${stats.visible} ${tx.visible}`
              : t('clients.page.statusesVisibleWithCount', { count: statusesCount })}
          </span>
          {selectedClientId ? (
            <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-primary/12 px-3 text-[12px] font-semibold text-text-accent">
              <AppIcon name="user" className="h-3.5 w-3.5" aria-hidden="true" />
              {tx.detailOpen}
            </span>
          ) : null}
        </div>
      }
    />
  );

  if (hasError) {
    return (
      <PageLayout header={header}>
        <EmptyState title={tx.errorTitle} description={tx.errorDescription} />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout header={header}>
        <PageSection>
          <ClientsListView
            key={listRefreshKey}
            tableMode={tableMode}
            onTableModeChange={setTableMode}
            onRowClick={(client) => setSelectedClientId(client.id)}
            onEditClient={openEditForm}
            onDeleteClient={handleDeleteFromList}
            onEditStatus={openEditStatusForm}
            onDeleteStatus={handleDeleteStatusFromList}
            selectedClientId={selectedClientId}
            canManageClients={canManageClients}
            canViewStatuses={canUseStatusesData}
            canManageStatuses={canManageStatuses}
            onStatsChange={handleStatsChange}
            onStatusesCountChange={setStatusesCount}
          />
        </PageSection>
      </PageLayout>

      {actionMessage ? (
        <div className="fixed bottom-4 right-4 z-[230] w-[min(92vw,460px)]">
          <div
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 backdrop-blur-sm ${
              actionMessage.type === 'success'
                ? 'bg-success-bg/95 text-success ring-success/35'
                : 'bg-danger-bg/95 text-danger ring-danger/35'
            }`}
            role="status"
            aria-live="polite"
          >
            <AppIcon
              name={actionMessage.type === 'success' ? 'check-circle' : 'activity'}
              className="mt-0.5 h-4.5 w-4.5 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 break-words">{actionMessage.text}</span>
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-card/55 text-current transition duration-fast hover:bg-surface-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/35"
              onClick={() => setActionMessage(null)}
              aria-label={t('common.close')}
            >
              <AppIcon name="close" className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {selectedClientId ? (
        <div
          className="fixed inset-0 z-[140] flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
          role="presentation"
          onClick={() => setSelectedClientId(null)}
        >
          <div
            className="h-full w-full max-w-[520px] overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <ClientsDetailPanel
              clientId={selectedClientId}
              canManageClients={canManageClients}
              canViewBookings={canViewBookings}
              canManageBookings={canManageBookings}
              onClose={() => setSelectedClientId(null)}
              onEdit={(client: Client) => {
                setSelectedClientId(null);
                openEditForm(client);
              }}
              onRequestDelete={(client: Client) => {
                setSelectedClientId(null);
                setClientToDelete(client);
              }}
            />
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <div
          className="fixed inset-0 z-[150] flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
          role="presentation"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="h-full w-full max-w-[560px] overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <ClientsFormPanel
              client={editingClient ?? undefined}
              canViewBookings={canViewBookings}
              canManageBookings={canManageBookings}
              onClose={() => {
                setIsFormOpen(false);
                setEditingClient(null);
              }}
              onSuccess={handleClientSaved}
            />
          </div>
        </div>
      ) : null}

      {clientToDelete ? (
        <ClientDeleteDialog
          client={clientToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setClientToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
        />
      ) : null}

      {isStatusFormOpen ? (
        <div
          className="fixed inset-0 z-[155] flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
          role="presentation"
          onClick={() => {
            if (!isSavingStatus) {
              setIsStatusFormOpen(false);
              setEditingStatus(null);
            }
          }}
        >
          <aside
            className="h-full w-full max-w-[560px] overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {tx.statusFormEyebrow}
                  </p>
                  <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                    {statusFormMode === 'create' ? tx.statusFormTitleCreate : tx.statusFormTitleEdit}
                  </h2>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
                  onClick={() => {
                    if (!isSavingStatus) {
                      setIsStatusFormOpen(false);
                      setEditingStatus(null);
                    }
                  }}
                  disabled={isSavingStatus}
                  aria-label={t('common.cancel')}
                >
                  <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {tx.statusFormName}
                </span>
                <input
                  type="text"
                  value={statusForm.name}
                  onChange={(event) =>
                    setStatusForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary placeholder:text-text-muted outline-none transition duration-fast focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  disabled={isSavingStatus}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {tx.statusFormColor}
                  </span>
                  <FilterSelect
                    value={statusForm.color}
                    options={statusColorSelectOptions}
                    onChange={(value) =>
                      setStatusForm((current) => ({ ...current, color: value }))
                    }
                    disabled={isSavingStatus}
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {tx.statusFormPosition}
                  </span>
                  <input
                    type="number"
                    value={statusForm.position}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, position: event.target.value }))
                    }
                    className="w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary placeholder:text-text-muted outline-none transition duration-fast focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    disabled={isSavingStatus}
                  />
                </label>
              </div>

              <div className="inline-flex items-center justify-between gap-4 rounded-lg bg-surface-card px-3.5 py-2.5 ring-1 ring-border-soft/35">
                <span className="text-sm font-medium text-text-primary">
                  {tx.statusFormActive}
                </span>
                <Switch
                  checked={statusForm.is_active}
                  onChange={(nextValue) =>
                    setStatusForm((current) => ({
                      ...current,
                      is_active: nextValue,
                    }))
                  }
                  disabled={isSavingStatus}
                />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary"
                  onClick={() => {
                    if (!isSavingStatus) {
                      setIsStatusFormOpen(false);
                      setEditingStatus(null);
                    }
                  }}
                  disabled={isSavingStatus}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:opacity-60"
                  onClick={() => {
                    void handleSaveStatus();
                  }}
                  disabled={isSavingStatus || !statusForm.name.trim()}
                >
                  {isSavingStatus ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {statusToDelete ? (
        <ConfirmDialog
          eyebrow={tx.statusDeleteEyebrow}
          title={t('clients.statusDelete.titleWithName', { name: statusToDelete.name })}
          description={tx.statusDeleteDescription}
          cancelLabel={t('common.cancel')}
          confirmLabel={t('common.delete')}
          confirmTone="danger"
          isBusy={isDeletingStatus}
          onCancel={() => {
            if (!isDeletingStatus) {
              setStatusToDelete(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmDeleteStatus();
          }}
          ariaLabel={tx.statusDeleteAria}
        />
      ) : null}
    </>
  );
}

export default ClientsPage;
