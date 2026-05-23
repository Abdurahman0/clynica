import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi';
import ConfirmDialog from '../../../components/shared/dialogs/ConfirmDialog';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { FilterSelect, StatusBadge } from '../../../components/shared/data';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { services } from '../../../services';
import type {
  Client,
  ClientBookingItem,
  CreateClientInput,
  UpdateClientInput,
} from '../../../services/contracts';
import { HandmadeDatePicker, HandmadeDateTimePicker } from './HandmadeDatePickers';

export interface ClientsFormPanelProps {
  client?: Client;
  onClose?: () => void;
  canViewBookings?: boolean;
  canManageBookings?: boolean;
  onSuccess?: (client: Client, options?: { close?: boolean }) => void;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function getStatusTone(status: string | undefined): 'success' | 'warning' | 'danger' | 'accent' | 'info' {
  const value = String(status || '').toLowerCase();
  if (value.includes('won') || value.includes('success') || value.includes('came')) {
    return 'success';
  }
  if (value.includes('lost') || value.includes('cancel') || value.includes('error') || value.includes('no_show')) {
    return 'danger';
  }
  if (value.includes('new') || value.includes('confirm')) {
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

function getBookingStatusLabel(status: string | undefined, isRu: boolean): string {
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

export function ClientsFormPanel({
  client,
  canViewBookings = false,
  canManageBookings = false,
  onClose,
  onSuccess,
}: ClientsFormPanelProps) {
  const { i18n } = useTranslation();
  const isRu = i18n.language === 'ru';
  const locale = isRu ? 'ru-RU' : 'uz-UZ';
  const [currentClient, setCurrentClient] = useState<Client | undefined>(client);
  const isEditing = Boolean(currentClient);

  const tx = isRu
    ? {
        titleCreate: 'Новый клиент',
        titleEdit: 'Редактировать клиента',
        submitCreate: 'Создать клиента',
        submitEdit: 'Сохранить изменения',
        saving: 'Сохранение...',
        requiredName: 'Полное имя обязательно',
        requiredPhone: 'Телефон обязателен',
        requiredStatus: 'Статус обязателен',
        requiredSource: 'Источник обязателен',
        createdContinue: 'Клиент создан. Теперь можно добавить бронирования.',
        saveFailed: 'Не удалось сохранить клиента.',
        bookingSaveFailed: 'Не удалось сохранить бронирование.',
        bookingDeleteFailed: 'Не удалось удалить бронирование.',
        labels: {
          fullName: 'Ф.И.О',
          phone: 'Телефон',
          source: 'Источник',
          status: 'Статус',
          notes: 'Краткая заметка',
        },
        booking: {
          title: 'Бронирования',
          empty: 'Бронирований пока нет.',
          bookingAt: 'Время визита',
          bookingStatus: 'Статус визита',
          bookingRequestedDate: 'Запрошенная дата',
          save: 'Создать бронирование',
          update: 'Обновить бронирование',
          cancelEdit: 'Отменить редактирование',
          edit: 'Редактировать бронь',
          delete: 'Удалить бронь',
          deleteTitle: 'Удалить бронирование?',
          deleteDescription: 'Это действие нельзя отменить.',
          needSaveClientFirst: 'Сначала сохраните клиента, затем добавляйте бронирования.',
        },
      }
    : {
        titleCreate: 'Yangi mijoz',
        titleEdit: 'Mijozni tahrirlash',
        submitCreate: 'Mijoz yaratish',
        submitEdit: 'O\'zgarishlarni saqlash',
        saving: 'Saqlanmoqda...',
        requiredName: 'To\'liq ism majburiy',
        requiredPhone: 'Telefon majburiy',
        requiredStatus: 'Holat majburiy',
        requiredSource: 'Manba majburiy',
        createdContinue: 'Mijoz yaratildi. Endi bron qo\'shishingiz mumkin.',
        saveFailed: 'Mijozni saqlab bo\'lmadi.',
        bookingSaveFailed: 'Bronni saqlab bo\'lmadi.',
        bookingDeleteFailed: 'Bronni o\'chirib bo\'lmadi.',
        labels: {
          fullName: 'F.I.SH.',
          phone: 'Telefon',
          source: 'Manba',
          status: 'Holat',
          notes: 'Qisqa izoh',
        },
        booking: {
          title: 'Bronlar',
          empty: 'Hozircha bronlar yo\'q.',
          bookingAt: 'Tashrif vaqti',
          bookingStatus: 'Tashrif holati',
          bookingRequestedDate: 'So\'ralgan sana',
          save: 'Bron yaratish',
          update: 'Bronni yangilash',
          cancelEdit: 'Tahrirlashni bekor qilish',
          edit: 'Bronni tahrirlash',
          delete: 'Bronni o\'chirish',
          deleteTitle: 'Bronni o\'chirishni tasdiqlaysizmi?',
          deleteDescription: 'Bu amalni bekor qilib bo\'lmaydi.',
          needSaveClientFirst: 'Avval mijozni saqlang, keyin bron qo\'shing.',
        },
      };

  const [form, setForm] = useState<CreateClientInput>({
    full_name: currentClient?.full_name || '',
    phone: currentClient?.phone || '',
    source_platform: currentClient?.source_platform || 'manual',
    status: currentClient?.status || '',
    notes: currentClient?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusOptionsFromApi, setStatusOptionsFromApi] = useState<Array<{ label: string; value: string }>>([]);
  const [bookingAt, setBookingAt] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'pending' | 'confirmed' | 'came' | 'no_show' | 'cancelled'>('pending');
  const [bookingRequestedDate, setBookingRequestedDate] = useState('');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [pendingDeleteBookingId, setPendingDeleteBookingId] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [bookingActionError, setBookingActionError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const fullNameOk = (form.full_name ?? '').trim().length > 0;
    const phoneOk = (form.phone ?? '').trim().length > 0;
    const statusOk = String(form.status ?? '').trim().length > 0;
    const sourceOk = String(form.source_platform ?? '').trim().length > 0;
    return fullNameOk && phoneOk && statusOk && sourceOk;
  }, [form.full_name, form.phone, form.source_platform, form.status]);

  const statusOptions = useMemo(() => {
    if (statusOptionsFromApi.length > 0) {
      return statusOptionsFromApi;
    }

    if (currentClient?.status && currentClient?.status_label) {
      return [{ value: String(currentClient.status), label: String(currentClient.status_label) }];
    }

    return [{ value: '', label: isRu ? 'Выберите статус' : 'Holatni tanlang' }];
  }, [currentClient?.status, currentClient?.status_label, isRu, statusOptionsFromApi]);

  const sourceOptions = useMemo(
    () => [
      { label: 'Instagram', value: 'instagram' },
      { label: 'Telegram', value: 'telegram' },
      { label: isRu ? 'Вручную' : 'Qo\'lda', value: 'manual' },
    ],
    [isRu],
  );

  const bookingStatusOptions = useMemo(
    () => [
      { value: 'pending', label: isRu ? 'Ожидает' : 'Kutilmoqda' },
      { value: 'confirmed', label: isRu ? 'Подтверждено' : 'Tasdiqlangan' },
      { value: 'came', label: isRu ? 'Пришел' : 'Keldi' },
      { value: 'no_show', label: isRu ? 'Не пришел' : 'Kelmadi' },
      { value: 'cancelled', label: isRu ? 'Отменено' : 'Bekor qilingan' },
    ],
    [isRu],
  );

  const bookingItems = useMemo(
    () => (Array.isArray(currentClient?.bookings_items) ? currentClient.bookings_items : []),
    [currentClient],
  );

  function updateField<Key extends keyof CreateClientInput>(key: Key, value: CreateClientInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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
    setBookingActionError(null);
  }

  async function refreshCurrentClient() {
    if (!currentClient) {
      return;
    }

    const nextClient = await services.clients.getClient(currentClient.id);
    setCurrentClient(nextClient);
    onSuccess?.(nextClient, { close: false });
  }

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

          if (!String(form.status ?? '').trim()) {
            setForm((current) => ({ ...current, status: mapped[0]!.value }));
          }
        }
      } catch {
        // fallback options remain
      }
    })();
  }, []);

  useEffect(() => {
    setCurrentClient(client);
    setForm({
      full_name: client?.full_name || '',
      phone: client?.phone || '',
      source_platform: client?.source_platform || 'manual',
      status: client?.status || '',
      notes: client?.notes || '',
    });
  }, [client]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.full_name?.trim()) {
      setErrorMessage(tx.requiredName);
      return;
    }
    if (!form.phone?.trim()) {
      setErrorMessage(tx.requiredPhone);
      return;
    }
    if (!form.status) {
      setErrorMessage(tx.requiredStatus);
      return;
    }
    if (!form.source_platform) {
      setErrorMessage(tx.requiredSource);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateClientInput | UpdateClientInput = {
        full_name: form.full_name?.trim(),
        phone: form.phone?.trim(),
        source_platform: form.source_platform,
        status: form.status,
        notes: form.notes?.trim() || undefined,
      };

      const result = isEditing
        ? await services.clients.updateClient(currentClient!.id, payload as UpdateClientInput)
        : await services.clients.createClient(payload as CreateClientInput);

      const nextClient = result as Client;
      setCurrentClient(nextClient);
      setForm({
        full_name: nextClient.full_name || '',
        phone: nextClient.phone || '',
        source_platform: nextClient.source_platform || 'manual',
        status: nextClient.status || '',
        notes: nextClient.notes || '',
      });

      if (isEditing) {
        onSuccess?.(nextClient);
        return;
      }

      setSuccessMessage(tx.createdContinue);
      onSuccess?.(nextClient, { close: false });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : tx.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitBooking() {
    if (!currentClient || !canManageBookings || !bookingAt || !(services.clients as any).createClientBooking) {
      return;
    }

    setIsSubmittingBooking(true);
    setBookingActionError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        scheduled_for: new Date(bookingAt).toISOString(),
        status: bookingStatus,
        requested_date: bookingRequestedDate || null,
      };

      if (editingBookingId && (services.clients as any).updateClientBooking) {
        await (services.clients as any).updateClientBooking(editingBookingId, payload);
      } else {
        await (services.clients as any).createClientBooking(currentClient.id, {
          ...payload,
          requested_date: bookingRequestedDate || undefined,
        });
      }

      resetBookingForm();
      await refreshCurrentClient();
    } catch (error) {
      setBookingActionError(error instanceof Error ? error.message : tx.bookingSaveFailed);
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  async function handleDeleteBooking(bookingId: string) {
    if (!canManageBookings || !(services.clients as any).deleteClientBooking) {
      return;
    }

    setDeletingBookingId(bookingId);
    setBookingActionError(null);
    setSuccessMessage(null);

    try {
      await (services.clients as any).deleteClientBooking(bookingId);
      if (editingBookingId === bookingId) {
        resetBookingForm();
      }
      await refreshCurrentClient();
    } catch (error) {
      setBookingActionError(error instanceof Error ? error.message : tx.bookingDeleteFailed);
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
                {isRu ? 'Форма клиента' : 'Mijoz formasi'}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {isEditing ? tx.titleEdit : tx.titleCreate}
              </h2>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting || isSubmittingBooking}
              aria-label={isRu ? 'Закрыть' : 'Yopish'}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName}>{tx.labels.fullName}</label>
              <input className={inputClassName} value={form.full_name || ''} onChange={(e) => updateField('full_name', e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName}>{tx.labels.phone}</label>
              <input className={inputClassName} value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName}>{tx.labels.source}</label>
              <FilterSelect
                value={form.source_platform || 'manual'}
                options={sourceOptions}
                onChange={(value) => updateField('source_platform', value as any)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={labelClassName}>{tx.labels.status}</label>
              <FilterSelect
                value={String(form.status || '')}
                options={statusOptions}
                onChange={(value) => updateField('status', value as any)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <label className={labelClassName}>{tx.labels.notes}</label>
              <textarea className={`${inputClassName} min-h-[92px] resize-y`} value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} disabled={isSubmitting} />
            </div>
          </div>

          {errorMessage ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">{errorMessage}</p>
          ) : null}
          {successMessage ? (
            <p className="m-0 rounded-lg bg-success-bg px-3 py-2 text-sm font-medium text-success">{successMessage}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting || isSubmittingBooking}
            >
              {isRu ? 'Отмена' : 'Bekor qilish'}
            </button>
            <button
              type="submit"
              className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? tx.saving : isEditing ? tx.submitEdit : tx.submitCreate}
            </button>
          </div>
        </form>

        {canViewBookings ? (
          <div className="rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
            <div className="grid gap-2.5">
              <p className={labelClassName}>{tx.booking.title}</p>
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
                            aria-label={tx.booking.edit}
                            title={tx.booking.edit}
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
                            aria-label={tx.booking.delete}
                            title={tx.booking.delete}
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-[12px] text-text-muted">
                        {tx.booking.bookingRequestedDate}: {formatDateOnly(booking.requested_date || undefined, i18n.language, locale)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-sm text-text-muted">{tx.booking.empty}</p>
              )}

              {currentClient ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label className={labelClassName}>{tx.booking.bookingAt}</label>
                      <HandmadeDateTimePicker
                        value={bookingAt}
                        onChange={setBookingAt}
                        placeholder={isRu ? 'Выберите дату и время' : 'Sana va vaqtni tanlang'}
                        locale={locale}
                        disabled={!canManageBookings || isSubmittingBooking}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className={labelClassName}>{tx.booking.bookingStatus}</label>
                      <FilterSelect
                        value={bookingStatus}
                        options={bookingStatusOptions}
                        onChange={(value) => setBookingStatus(value as any)}
                        disabled={!canManageBookings || isSubmittingBooking}
                      />
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                      <label className={labelClassName}>{tx.booking.bookingRequestedDate}</label>
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
                    {editingBookingId ? tx.booking.update : tx.booking.save}
                  </button>
                  {editingBookingId ? (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      onClick={resetBookingForm}
                      disabled={!canManageBookings || isSubmittingBooking}
                    >
                      {tx.booking.cancelEdit}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="m-0 rounded-lg bg-surface-subtle/75 px-3 py-2.5 text-sm text-text-muted ring-1 ring-border-soft/35">
                  {tx.booking.needSaveClientFirst}
                </p>
              )}

              {bookingActionError ? (
                <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                  {bookingActionError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {canManageBookings && pendingDeleteBookingId ? (
        <ConfirmDialog
          eyebrow={tx.booking.delete}
          title={tx.booking.deleteTitle}
          description={tx.booking.deleteDescription}
          cancelLabel={isRu ? 'Отмена' : 'Bekor qilish'}
          confirmLabel={tx.booking.delete}
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
          ariaLabel={tx.booking.delete}
        />
      ) : null}
    </>
  );
}
