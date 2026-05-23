import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDetail } from '../../../components/hooks';
import ConfirmDialog from '../../../components/shared/dialogs/ConfirmDialog';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { FilterSelect, StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import { routePaths } from '../../../config/routes';
import type { Client, ClientBookingItem } from '../../../services/contracts';
import { HandmadeDatePicker, HandmadeDateTimePicker } from './HandmadeDatePickers';

export interface ClientsDetailPanelProps {
  clientId: string;
  canManageClients?: boolean;
  canViewBookings?: boolean;
  canManageBookings?: boolean;
  onClose?: () => void;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
  onRequestDelete?: (client: Client) => void;
}

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const valueClassName =
  'text-sm font-semibold text-text-primary [overflow-wrap:anywhere]';

function isUuidLike(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function getStatusTone(status: string | undefined): 'success' | 'warning' | 'danger' | 'accent' | 'info' {
  const value = String(status || '').toLowerCase();
  if (value.includes('won') || value.includes('success')) {
    return 'success';
  }
  if (value.includes('lost') || value.includes('cancel') || value.includes('error')) {
    return 'danger';
  }
  if (value.includes('new')) {
    return 'info';
  }
  return 'warning';
}

function formatDate(value: string | undefined, language: string, locale: string): string {
  if (!value) {
    return '-';
  }

  return formatLocalizedDate(value, language, {
    locale,
    withYear: true,
    withTime: value.includes('T'),
    shortMonth: true,
    fallback: value,
  });
}

function toDateTimeFieldValue(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (!match) {
      return '';
    }
    return `${match[1]}T${match[2]}`;
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hour = `${parsed.getHours()}`.padStart(2, '0');
  const minute = `${parsed.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getBookingStatusLabel(
  status: string | undefined,
  isRu: boolean,
): string {
  const normalized = String(status || 'pending').toLowerCase();

  if (normalized === 'confirmed') {
    return isRu ? 'Подтверждено' : 'Tasdiqlangan';
  }

  if (normalized === 'came') {
    return isRu ? 'Пришел' : 'Keldi';
  }

  if (normalized === 'no_show') {
    return isRu ? 'Не пришел' : 'Kelmadi';
  }

  if (normalized === 'cancelled') {
    return isRu ? 'Отменено' : 'Bekor qilingan';
  }

  return isRu ? 'Ожидает' : 'Kutilmoqda';
}

export function ClientsDetailPanel({
  clientId,
  canManageClients = false,
  canViewBookings = false,
  canManageBookings = false,
  onClose,
  onEdit,
  onDelete,
  onRequestDelete,
}: ClientsDetailPanelProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isRu = i18n.language === 'ru';
  const locale = isRu ? 'ru-RU' : 'uz-UZ';

  const tx = isRu
    ? {
        title: 'Профиль клиента',
        loadingTitle: 'Загрузка...',
        loadingDescription: 'Получение данных клиента.',
        errorTitle: 'Клиент не найден',
        errorDescription: 'Клиент недоступен или был удален.',
        fields: {
          phone: 'Телефон',
          source: 'Источник',
          manager: 'Менеджер',
          chatSession: 'Перейти в чат',
          aiSummary: 'AI резюме',
          notes: 'Заметки',
          created: 'Создан',
          updated: 'Обновлен',
          bookings: 'Бронирования',
          bookingAt: 'Время визита',
          bookingStatus: 'Статус визита',
          bookingRequestedDate: 'Запрошенная дата',
        },
        actions: {
          scheduleBooking: 'Создать бронирование',
          updateBooking: 'Обновить бронирование',
          cancelBookingEdit: 'Отменить редактирование',
          editBooking: 'Редактировать бронь',
          deleteBooking: 'Удалить бронь',
          deleteBookingConfirmTitle: 'Удалить бронирование?',
          deleteBookingConfirmDescription: 'Это действие нельзя отменить.',
          edit: 'Редактировать',
          delete: 'Удалить',
        },
      }
    : {
        title: 'Mijoz profili',
        loadingTitle: 'Yuklanmoqda...',
        loadingDescription: 'Mijoz ma\'lumotlari olinmoqda.',
        errorTitle: 'Mijoz topilmadi',
        errorDescription: 'Mijoz mavjud emas yoki o\'chirilgan.',
        fields: {
          phone: 'Telefon',
          source: 'Manba',
          manager: 'Menejer',
          chatSession: 'Chatga o\'tish',
          aiSummary: 'AI xulosa',
          notes: 'Izohlar',
          created: 'Yaratilgan',
          updated: 'Yangilangan',
          bookings: 'Bronlar',
          bookingAt: 'Tashrif vaqti',
          bookingStatus: 'Tashrif holati',
          bookingRequestedDate: 'So\'ralgan sana',
        },
        actions: {
          scheduleBooking: 'Bron yaratish',
          updateBooking: 'Bronni yangilash',
          cancelBookingEdit: 'Tahrirlashni bekor qilish',
          editBooking: 'Bronni tahrirlash',
          deleteBooking: 'Bronni o\'chirish',
          deleteBookingConfirmTitle: 'Bronni o\'chirishni tasdiqlaysizmi?',
          deleteBookingConfirmDescription: 'Bu amalni bekor qilib bo\'lmaydi.',
          edit: 'Tahrirlash',
          delete: 'O\'chirish',
        },
      };

  const [state, detailActions] = useDetail(() => services.clients.getClient(clientId), { autoFetch: true });
  const [bookingAt, setBookingAt] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'pending' | 'confirmed' | 'came' | 'no_show' | 'cancelled'>('pending');
  const [bookingRequestedDate, setBookingRequestedDate] = useState('');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [pendingDeleteBookingId, setPendingDeleteBookingId] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (state.isLoading) {
    return <LoadingState title={tx.loadingTitle} description={tx.loadingDescription} />;
  }

  if (state.error || !state.data) {
    return <EmptyState title={tx.errorTitle} description={tx.errorDescription} />;
  }

  const client = state.data as Client;
  const bookingItems = Array.isArray(client.bookings_items) ? client.bookings_items : [];

  const sourceLabel =
    client.source_platform === 'manual'
      ? (isRu ? 'Вручную' : 'Qo\'lda')
      : client.source_platform === 'telegram'
      ? 'Telegram'
      : client.source_platform === 'instagram'
      ? 'Instagram'
      : (client.source_platform_label || client.source_platform || '-');

  const normalizedStatus = String(client.status ?? '').trim().toLowerCase();
  const hasStatusValue =
    normalizedStatus.length > 0 &&
    normalizedStatus !== 'unknown' &&
    normalizedStatus !== 'none' &&
    normalizedStatus !== 'null' &&
    normalizedStatus !== 'undefined' &&
    normalizedStatus !== '-';
  const statusLabel = client.status_label || (hasStatusValue ? String(client.status) : '-');
  const bookingStatusOptions = [
    { value: 'pending', label: isRu ? 'Ожидает' : 'Kutilmoqda' },
    { value: 'confirmed', label: isRu ? 'Подтверждено' : 'Tasdiqlangan' },
    { value: 'came', label: isRu ? 'Пришел' : 'Keldi' },
    { value: 'no_show', label: isRu ? 'Не пришел' : 'Kelmadi' },
    { value: 'cancelled', label: isRu ? 'Отменено' : 'Bekor qilingan' },
  ];

  function resetBookingForm() {
    setBookingAt('');
    setBookingRequestedDate('');
    setBookingStatus('pending');
    setEditingBookingId(null);
  }

  function handleEditBookingStart(booking: ClientBookingItem) {
    if (!canManageBookings) {
      return;
    }

    setEditingBookingId(booking.id);
    setBookingAt(toDateTimeFieldValue(booking.scheduled_for));
    setBookingRequestedDate(booking.requested_date || '');
    setBookingStatus((booking.status as any) || 'pending');
    setActionError(null);
  }

  async function handleSubmitBooking() {
    if (!canManageBookings || !bookingAt || !(services.clients as any).createClientBooking) {
      return;
    }

    setIsSubmittingBooking(true);
    setActionError(null);

    try {
      const payload = {
        scheduled_for: new Date(bookingAt).toISOString(),
        status: bookingStatus,
        requested_date: bookingRequestedDate || null,
      };

      if (editingBookingId && (services.clients as any).updateClientBooking) {
        await (services.clients as any).updateClientBooking(editingBookingId, payload);
      } else {
        await (services.clients as any).createClientBooking(client.id, {
          ...payload,
          requested_date: bookingRequestedDate || undefined,
        });
      }

      resetBookingForm();
      await detailActions.fetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to save booking');
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  async function handleDeleteBooking(bookingId: string) {
    if (!canManageBookings || !(services.clients as any).deleteClientBooking) {
      return;
    }

    setDeletingBookingId(bookingId);
    setActionError(null);

    try {
      await (services.clients as any).deleteClientBooking(bookingId);
      if (editingBookingId === bookingId) {
        resetBookingForm();
      }
      await detailActions.fetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete booking');
    } finally {
      setDeletingBookingId(null);
    }
  }

  return (
    <>
    <div className="grid gap-3">
      <header className="mb-1 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {tx.title}
            </p>
            <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
              {client.full_name}
            </h2>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            onClick={onClose}
            aria-label={tx.title}
          >
            <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3">
          <StatusBadge
            tone={hasStatusValue ? getStatusTone(client.status) : 'neutral'}
            status={hasStatusValue ? String(client.status) : 'neutral'}
            label={statusLabel}
          />
        </div>
      </header>

      <PageCard>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-subtle/80 p-3">
            <p className={labelClassName}>{tx.fields.phone}</p>
            <p className={`mt-1 ${valueClassName}`}>{client.phone || '-'}</p>
          </div>
          <div className="rounded-lg bg-surface-subtle/80 p-3">
            <p className={labelClassName}>{tx.fields.source}</p>
            <p className={`mt-1 ${valueClassName}`}>{sourceLabel}</p>
          </div>
          <div className="rounded-lg bg-surface-subtle/80 p-3">
            <p className={labelClassName}>{tx.fields.manager}</p>
            <p className={`mt-1 ${valueClassName}`}>
              {client.manager_username && !isUuidLike(client.manager_username)
                ? client.manager_username
                : '-'}
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-surface-subtle/80 p-3 text-left transition duration-fast hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!client.chat_session_id}
            onClick={() => {
              if (!client.chat_session_id) {
                return;
              }

              navigate(routePaths.chats, {
                state: { sessionId: client.chat_session_id },
              });
              onClose?.();
            }}
          >
            <p className={valueClassName}>
              {client.chat_session_id ? tx.fields.chatSession : '-'}
            </p>
          </button>

          <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
            <p className={labelClassName}>{tx.fields.aiSummary}</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere] whitespace-pre-wrap">
              {client.ai_summary || '-'}
            </p>
          </div>

          <div className="rounded-lg bg-surface-subtle/80 p-3 sm:col-span-2">
            <p className={labelClassName}>{tx.fields.notes}</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere] whitespace-pre-wrap">
              {client.notes || '-'}
            </p>
          </div>
        </div>
      </PageCard>

      {canViewBookings ? (
      <PageCard>
        <div className="grid gap-2.5">
          <p className={labelClassName}>{tx.fields.bookings}</p>
          {bookingItems.length > 0 ? (
            <div className="grid gap-2">
              {bookingItems.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg bg-surface-subtle/80 px-3 py-2.5 ring-1 ring-border-soft/35"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="m-0 text-sm font-semibold text-text-primary">
                      {formatDate(booking.scheduled_for, i18n.language, locale)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge
                        status={String(booking.status || 'pending')}
                        label={getBookingStatusLabel(booking.status, isRu)}
                        tone={getStatusTone(booking.status)}
                      />
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-surface-card/75 text-text-secondary transition duration-fast hover:bg-surface-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                        onClick={() => handleEditBookingStart(booking)}
                        disabled={!canManageBookings || isSubmittingBooking}
                        aria-label={tx.actions.editBooking}
                        title={tx.actions.editBooking}
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-danger-bg/70 text-danger transition duration-fast hover:bg-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          setPendingDeleteBookingId(booking.id);
                        }}
                        disabled={
                          !canManageBookings ||
                          isSubmittingBooking ||
                          deletingBookingId === booking.id
                        }
                        aria-label={tx.actions.deleteBooking}
                        title={tx.actions.deleteBooking}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[12px] text-text-muted">
                    {tx.fields.bookingRequestedDate}: {booking.requested_date || '-'}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName}>{tx.fields.bookingAt}</label>
              <HandmadeDateTimePicker
                value={bookingAt}
                onChange={setBookingAt}
                placeholder={isRu ? 'Выберите дату и время' : 'Sana va vaqtni tanlang'}
                locale={locale}
                disabled={!canManageBookings || isSubmittingBooking}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName}>{tx.fields.bookingStatus}</label>
              <FilterSelect
                value={bookingStatus}
                options={bookingStatusOptions}
                onChange={(value) => setBookingStatus(value as any)}
                disabled={!canManageBookings || isSubmittingBooking}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <label className={labelClassName}>{tx.fields.bookingRequestedDate}</label>
              <HandmadeDatePicker
                value={bookingRequestedDate}
                onChange={setBookingRequestedDate}
                placeholder={isRu ? 'Выберите дату' : 'Sanani tanlang'}
                locale={locale}
                disabled={!canManageBookings || isSubmittingBooking}
              />
            </div>
          </div>

          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              void handleSubmitBooking();
            }}
            disabled={!canManageBookings || isSubmittingBooking || !bookingAt}
          >
            <FiCalendar className="h-4 w-4" />
            {editingBookingId ? tx.actions.updateBooking : tx.actions.scheduleBooking}
          </button>
          {editingBookingId ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={resetBookingForm}
              disabled={!canManageBookings || isSubmittingBooking}
            >
              {tx.actions.cancelBookingEdit}
            </button>
          ) : null}
        </div>
      </PageCard>
      ) : null}

      <PageCard>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-subtle/35 p-3 ring-1 ring-border-soft/20">
            <p className={labelClassName}>{tx.fields.created}</p>
            <p className={`mt-1 ${valueClassName}`}>{formatDate(client.created_at, i18n.language, locale)}</p>
          </div>
          <div className="rounded-lg bg-surface-subtle/35 p-3 ring-1 ring-border-soft/20">
            <p className={labelClassName}>{tx.fields.updated}</p>
            <p className={`mt-1 ${valueClassName}`}>{formatDate(client.updated_at, i18n.language, locale)}</p>
          </div>
        </div>
      </PageCard>

      {actionError ? (
        <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">{actionError}</p>
      ) : null}

      {canManageClients ? (
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          onClick={() => onEdit?.(client)}
        >
          <FiEdit2 className="h-4 w-4" />
          {tx.actions.edit}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-card px-4 text-sm font-semibold text-danger shadow-sm ring-1 ring-danger/25 transition duration-fast hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
          onClick={() => {
            onRequestDelete?.(client);
            onDelete?.(client);
          }}
        >
          <FiTrash2 className="h-4 w-4" />
          {tx.actions.delete}
        </button>
      </div>
      ) : null}
    </div>
    {canManageBookings && pendingDeleteBookingId ? (
      <ConfirmDialog
        eyebrow={tx.actions.deleteBooking}
        title={tx.actions.deleteBookingConfirmTitle}
        description={tx.actions.deleteBookingConfirmDescription}
        cancelLabel={isRu ? 'Отмена' : 'Bekor qilish'}
        confirmLabel={tx.actions.deleteBooking}
        isBusy={deletingBookingId === pendingDeleteBookingId}
        confirmTone="danger"
        onCancel={() => {
          if (deletingBookingId !== pendingDeleteBookingId) {
            setPendingDeleteBookingId(null);
          }
        }}
        onConfirm={() => {
          if (!pendingDeleteBookingId) {
            return;
          }

          void (async () => {
            await handleDeleteBooking(pendingDeleteBookingId);
            setPendingDeleteBookingId(null);
          })();
        }}
        ariaLabel={tx.actions.deleteBooking}
      />
    ) : null}
    </>
  );
}
