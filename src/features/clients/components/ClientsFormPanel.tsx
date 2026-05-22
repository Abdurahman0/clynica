import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { FilterSelect } from '../../../components/shared/data';
import { services } from '../../../services';
import type { Client, CreateClientInput, UpdateClientInput } from '../../../services/contracts';

export interface ClientsFormPanelProps {
  client?: Client;
  onClose?: () => void;
  onSuccess?: (client: Client) => void;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

export function ClientsFormPanel({ client, onClose, onSuccess }: ClientsFormPanelProps) {
  const { i18n } = useTranslation();
  const isRu = i18n.language === 'ru';
  const isEditing = Boolean(client);

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
        labels: {
          fullName: 'Ф.И.О',
          phone: 'Телефон',
          source: 'Источник',
          status: 'Статус',
          notes: 'Краткая заметка',
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
        labels: {
          fullName: 'F.I.SH.',
          phone: 'Telefon',
          source: 'Manba',
          status: 'Holat',
          notes: 'Qisqa izoh',
        },
      };

  const [form, setForm] = useState<CreateClientInput>({
    full_name: client?.full_name || '',
    phone: client?.phone || '',
    source_platform: client?.source_platform || 'manual',
    status: client?.status || '',
    notes: client?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusOptionsFromApi, setStatusOptionsFromApi] = useState<Array<{ label: string; value: string }>>([]);

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

    if (client?.status && client?.status_label) {
      return [{ value: String(client.status), label: String(client.status_label) }];
    }

    return [{ value: '', label: isRu ? 'Выберите статус' : 'Holatni tanlang' }];
  }, [client?.status, client?.status_label, isRu, statusOptionsFromApi]);

  const sourceOptions = useMemo(
    () => [
      { label: 'Instagram', value: 'instagram' },
      { label: 'Telegram', value: 'telegram' },
      { label: isRu ? 'Вручную' : 'Qo\'lda', value: 'manual' },
    ],
    [isRu],
  );

  function updateField<Key extends keyof CreateClientInput>(key: Key, value: CreateClientInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

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
        ? await services.clients.updateClient(client!.id, payload as UpdateClientInput)
        : await services.clients.createClient(payload as CreateClientInput);
      onSuccess?.(result as Client);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save client.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
            disabled={isSubmitting}
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

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={isSubmitting}
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
    </div>
  );
}

