import { useTranslation } from 'react-i18next';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDetail } from '../../../components/hooks';
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page';
import { StatusBadge } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import { routePaths } from '../../../config/routes';
import type { Client } from '../../../services/contracts';

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

function getBookingStatusLabel(status: string | undefined, isRu: boolean): string {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'confirmed') return isRu ? 'Подтверждено' : 'Tasdiqlangan';
  if (normalized === 'came') return isRu ? 'Пришел' : 'Keldi';
  if (normalized === 'no_show') return isRu ? 'Не пришел' : 'Kelmadi';
  if (normalized === 'cancelled') return isRu ? 'Отменено' : 'Bekor qilingan';
  return isRu ? 'Ожидает' : 'Kutilmoqda';
}

export function ClientsDetailPanel({
  clientId,
  canManageClients = false,
  canViewBookings = false,
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
          bookings: 'Бронирования',
          bookingRequestedDate: 'Запрошенная дата',
          created: 'Создан',
          updated: 'Обновлен',
        },
        actions: {
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
          bookings: 'Bronlar',
          bookingRequestedDate: 'So\'ralgan sana',
          created: 'Yaratilgan',
          updated: 'Yangilangan',
        },
        actions: {
          edit: 'Tahrirlash',
          delete: 'O\'chirish',
        },
      };

  const [state] = useDetail(() => services.clients.getClient(clientId), { autoFetch: true });

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
  const hasStatusLabel = !isPlaceholderStatusText(client.status_label);
  const statusLabel =
    (hasStatusLabel ? client.status_label : undefined) ||
    (hasStatusValue ? String(client.status) : '-');

  return (
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
                      <StatusBadge
                        status={String(booking.status || 'pending')}
                        label={getBookingStatusLabel(booking.status, isRu)}
                        tone={getStatusTone(booking.status)}
                      />
                    </div>
                    <p className="mt-1 text-[12px] text-text-muted">
                      {tx.fields.bookingRequestedDate}: {booking.requested_date || '-'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-text-muted">-</p>
            )}
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
  );
}
