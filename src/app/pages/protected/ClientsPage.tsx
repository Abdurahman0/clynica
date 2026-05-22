import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { EmptyState, PageHeader, PageLayout, PageSection } from '../../../components/shared/page';
import ClientDeleteDialog from '../../../features/clients/components/ClientDeleteDialog';
import { ClientsDetailPanel } from '../../../features/clients/components/ClientsDetailPanel';
import { ClientsFormPanel } from '../../../features/clients/components/ClientsFormPanel';
import { ClientsListView } from '../../../features/clients/components/ClientsListView';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type { Client } from '../../../services/contracts';

function ClientsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManageClients = hasPermission('can_manage_clients');
  const canViewBookings = hasPermission('can_view_bookings');
  const canManageBookings = hasPermission('can_manage_bookings');

  const tx = {
    eyebrow: t('clients.page.eyebrow'),
    title: t('clients.page.title'),
    subtitle: t('clients.page.subtitle'),
    newClient: t('clients.page.newClient'),
    visible: t('clients.page.visible'),
    detailOpen: t('clients.page.detailOpen'),
    errorTitle: t('clients.page.errorTitle'),
    errorDescription: t('clients.page.errorDescription'),
  };

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [stats, setStats] = useState({ visible: 0, total: 0, loading: true });
  const [hasError, setHasError] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  }, [location.pathname]);

  function openCreateForm() {
    if (!canManageClients) {
      return;
    }

    setEditingClient(null);
    setIsFormOpen(true);
  }

  function openEditForm(client: Client) {
    if (!canManageClients) {
      return;
    }

    setEditingClient(client);
    setIsFormOpen(true);
  }

  function handleClientSaved(client: Client) {
    setIsFormOpen(false);
    setEditingClient(null);
    setSelectedClientId(client.id);
    setListRefreshKey((current) => current + 1);
  }

  function handleDeleteFromList(client: Client) {
    if (!canManageClients) {
      return;
    }

    setClientToDelete(client);
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
              onClick={openCreateForm}
            >
              <AppIcon name="plus" className="h-4 w-4" aria-hidden="true" />
              {tx.newClient}
            </button>
          ) : null}
          <span className="inline-flex min-h-8 items-center gap-2 rounded-pill bg-success-bg px-3 text-[12px] font-semibold text-success">
            <AppIcon name="clients" className="h-3.5 w-3.5" aria-hidden="true" />
            {stats.visible} {tx.visible}
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
            onRowClick={(client) => setSelectedClientId(client.id)}
            onEditClient={openEditForm}
            onDeleteClient={handleDeleteFromList}
            selectedClientId={selectedClientId}
            canManageClients={canManageClients}
            onStatsChange={handleStatsChange}
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
    </>
  );
}

export default ClientsPage;



