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

function parseHexColor(hex: string): [number, number, number] | null {
  const n = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return null;
  return [
    Number.parseInt(n.slice(0, 2), 16),
    Number.parseInt(n.slice(2, 4), 16),
    Number.parseInt(n.slice(4, 6), 16),
  ];
}

function mixRgb(
  src: [number, number, number],
  tgt: [number, number, number],
  ratio: number,
): [number, number, number] {
  const r = Math.max(0, Math.min(1, ratio));
  return [src[0] + (tgt[0] - src[0]) * r, src[1] + (tgt[1] - src[1]) * r, src[2] + (tgt[2] - src[2]) * r];
}

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function getStatusBadgePalette(hexColor: string): { background: string; border: string; text: string } {
  const parsed = parseHexColor(hexColor);
  if (!parsed) return { background: '#EEF2F6', border: '#C9D2DC', text: '#1F2933' };
  const bg = mixRgb(parsed, [255, 255, 255], 0.84);
  const bd = mixRgb(parsed, [255, 255, 255], 0.58);
  const tx = mixRgb(parsed, [0, 0, 0], 0.34);
  return { background: toHex(...bg), border: toHex(...bd), text: toHex(...tx) };
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

function formatDateOnly(value: string | undefined, language: string, locale: string): string {
  if (!value) {
    return '-';
  }

  return formatLocalizedDate(value, language, {
    locale,
    withYear: true,
    withTime: false,
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

function findJsonRange(value: string): { start: number; end: number } | null {
  const start = value.indexOf('{');
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { start, end: index + 1 };
      }
    }
  }

  return null;
}

function formatSummaryKey(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function getAiSummaryJsonLabel(key: string, isRu: boolean): string {
  const labels: Record<string, { uz: string; ru: string }> = {
    lead_type: { uz: 'Murojaat turi', ru: 'Тип обращения' },
    city: { uz: 'Shahar', ru: 'Город' },
    age: { uz: 'Yosh', ru: 'Возраст' },
    concern: { uz: 'Murojaat sababi', ru: 'Запрос' },
    desired_result: { uz: 'Kutilgan natija', ru: 'Желаемый результат' },
    interested_operation: { uz: 'Qiziqqan operatsiya', ru: 'Интересующая операция' },
    suggested_operation: { uz: 'Tavsiya qilingan operatsiya', ru: 'Рекомендованная операция' },
    weight: { uz: 'Vazn', ru: 'Вес' },
    height: { uz: 'Bo‘y', ru: 'Рост' },
    bmi_range_hint: { uz: 'BMI oralig‘i', ru: 'Диапазон BMI' },
    pregnancy_or_birth_history: { uz: 'Homiladorlik yoki tug‘ruq tarixi', ru: 'Беременность или роды в анамнезе' },
    delivery_type: { uz: 'Tug‘ruq turi', ru: 'Тип родов' },
    skin_sagging: { uz: 'Teri osilishi', ru: 'Провисание кожи' },
    highest_weight: { uz: 'Eng yuqori vazn', ru: 'Максимальный вес' },
    asymmetry: { uz: 'Asimmetriya', ru: 'Асимметрия' },
    breastfeeding_history: { uz: 'Emizish tarixi', ru: 'История грудного вскармливания' },
    notes: { uz: 'Izoh', ru: 'Примечание' },
  };

  const label = labels[key];
  if (!label) {
    return formatSummaryKey(key);
  }

  return isRu ? label.ru : label.uz;
}

function hasSummaryValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== '-';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
}

function stringifySummaryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatAiSummaryText(value: string | undefined, isRu: boolean): string {
  const summary = String(value ?? '').trim();
  if (!summary) {
    return '-';
  }

  const jsonRange = findJsonRange(summary);
  if (!jsonRange) {
    return summary;
  }

  try {
    const parsed = JSON.parse(summary.slice(jsonRange.start, jsonRange.end)) as Record<string, unknown>;
    const jsonText = Object.entries(parsed)
      .filter(([, fieldValue]) => hasSummaryValue(fieldValue))
      .map(([key, fieldValue]) => `${getAiSummaryJsonLabel(key, isRu)}: ${stringifySummaryValue(fieldValue)}`)
      .join('\n');

    const beforeJson = summary.slice(0, jsonRange.start).trim();
    const afterJson = summary.slice(jsonRange.end).trim();
    return [beforeJson, jsonText, afterJson].filter(Boolean).join('\n');
  } catch {
    return summary;
  }
}

function AiSummaryView({ value, isRu }: { value: string | undefined; isRu: boolean }) {
  return (
    <p className="mt-1 text-sm leading-6 text-text-secondary [overflow-wrap:anywhere] whitespace-pre-wrap">
      {formatAiSummaryText(value, isRu)}
    </p>
  );
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
          {client.latest_status_transition && client.latest_status_transition.from_status_name && client.latest_status_transition.to_status_name ? (
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {(() => {
                const t = client.latest_status_transition;
                const fromColor = /^#([0-9a-fA-F]{6})$/.test(t.from_status_color ?? '') ? t.from_status_color! : '#9AA4AE';
                const toColor = /^#([0-9a-fA-F]{6})$/.test(t.to_status_color ?? '') ? t.to_status_color! : '#9AA4AE';
                const fromP = getStatusBadgePalette(fromColor);
                const toP = getStatusBadgePalette(toColor);
                return (
                  <>
                    <span
                      className="inline-flex min-w-0 shrink items-center truncate rounded-full px-2.5 py-0.5 text-[12px] font-semibold tracking-[0.02em]"
                      style={{ backgroundColor: fromP.background, color: fromP.text, border: `1px solid ${fromP.border}` }}
                    >
                      <span className="truncate">{t.from_status_name}</span>
                    </span>
                    <svg className="h-3 w-3 shrink-0 text-text-muted" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span
                      className="inline-flex min-w-0 shrink items-center truncate rounded-full px-2.5 py-0.5 text-[12px] font-semibold tracking-[0.02em]"
                      style={{ backgroundColor: toP.background, color: toP.text, border: `1px solid ${toP.border}` }}
                    >
                      <span className="truncate">{t.to_status_name}</span>
                    </span>
                  </>
                );
              })()}
            </div>
          ) : (
            <StatusBadge
              tone={hasStatusValue ? getStatusTone(client.status) : 'neutral'}
              status={hasStatusValue ? String(client.status) : 'neutral'}
              label={statusLabel}
            />
          )}
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
            <AiSummaryView value={client.ai_summary} isRu={isRu} />
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
                      {tx.fields.bookingRequestedDate}: {formatDateOnly(booking.requested_date || undefined, i18n.language, locale)}
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

      {Array.isArray(client.status_transitions) && client.status_transitions.length > 0 ? (
        <PageCard>
          <div className="grid gap-2.5">
            <p className={labelClassName}>{isRu ? 'История статусов' : 'Status tarixi'}</p>
            <div className="grid gap-2">
              {client.status_transitions.map((t) => {
                const fromColor = /^#([0-9a-fA-F]{6})$/.test(t.from_status_color ?? '') ? t.from_status_color! : '#9AA4AE';
                const toColor = /^#([0-9a-fA-F]{6})$/.test(t.to_status_color ?? '') ? t.to_status_color! : '#9AA4AE';
                const fromP = getStatusBadgePalette(fromColor);
                const toP = getStatusBadgePalette(toColor);
                return (
                  <div key={t.id} className="rounded-lg bg-surface-subtle/80 px-3 py-2.5 ring-1 ring-border-soft/35">
                    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                      <span
                        className="inline-flex min-w-0 shrink items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]"
                        style={{ backgroundColor: fromP.background, color: fromP.text, border: `1px solid ${fromP.border}` }}
                      >
                        <span className="truncate">{t.from_status_name}</span>
                      </span>
                      <svg className="h-2.5 w-2.5 shrink-0 text-text-muted" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span
                        className="inline-flex min-w-0 shrink items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em]"
                        style={{ backgroundColor: toP.background, color: toP.text, border: `1px solid ${toP.border}` }}
                      >
                        <span className="truncate">{t.to_status_name}</span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      {t.changed_by_name ? `${t.changed_by_name} · ` : ''}{formatDate(t.changed_at, i18n.language, locale)}
                    </p>
                  </div>
                );
              })}
            </div>
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
