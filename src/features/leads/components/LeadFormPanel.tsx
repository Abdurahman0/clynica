import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterSelect } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
} from '../../../services/contracts';
import type { SelectOption } from '../../../types/domain';

interface LeadFormPanelProps {
  mode: 'create' | 'edit';
  lead?: Lead | null;
  sourceOptions: SelectOption[];
  statusOptions: SelectOption[];
  operatorOptions: SelectOption[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateLeadInput | UpdateLeadInput) => void;
}

interface LeadFormState {
  fullName: string;
  phone: string;
  source: string;
  status: string;
  aiSummary: string;
  manager: string;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

const UNASSIGNED_OPERATOR_VALUE = '';

function normalizeLeadSource(source: string): string {
  return source;
}

function createInitialState(
  mode: 'create' | 'edit',
  lead: Lead | null | undefined,
): LeadFormState {
  if (mode === 'edit' && lead) {
    return {
      fullName: lead.full_name ?? '',
      phone: lead.phone ?? '',
      source: normalizeLeadSource(lead.source ?? 'manual'),
      status: lead.status ?? 'new',
      aiSummary: lead.ai_summary ?? '',
      manager: lead.manager ?? UNASSIGNED_OPERATOR_VALUE,
    };
  }

  return {
    fullName: '',
    phone: '',
    source: 'manual',
    status: 'new',
    aiSummary: '',
    manager: UNASSIGNED_OPERATOR_VALUE,
  };
}

function LeadFormPanel({
  mode,
  lead,
  sourceOptions,
  statusOptions,
  operatorOptions,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: LeadFormPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<LeadFormState>(() => createInitialState(mode, lead));
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setForm(createInitialState(mode, lead));
    setFieldError(null);
  }, [mode, lead]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length > 0 &&
      form.phone.trim().length > 0 &&
      form.source.length > 0 &&
      form.status.length > 0
    );
  }, [form]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const fullName = form.fullName.trim();
    const phone = form.phone.trim();
    const aiSummary = form.aiSummary.trim();

    if (!fullName || !phone) {
      setFieldError(t('leads.form.requiredError'));
      return;
    }

    onSubmit({
      full_name: fullName,
      phone,
      source: form.source as CreateLeadInput['source'],
      status: form.status as CreateLeadInput['status'],
      ai_summary: aiSummary || undefined,
      manager: form.manager || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background-overlay/72 backdrop-blur-[3px]"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[560px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={mode === 'create' ? t('leads.form.createTitle') : t('leads.form.editTitle')}
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('leads.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create' ? t('leads.form.createTitle') : t('leads.form.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {mode === 'create'
                  ? t('leads.form.createSubtitle')
                  : t('leads.form.editSubtitle')}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('leads.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="lead-form-full-name">
                {t('leads.form.fullName')}
              </label>
              <input
                id="lead-form-full-name"
                type="text"
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                className={inputClassName}
                placeholder={t('leads.form.fullNamePlaceholder')}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="lead-form-phone">
                {t('leads.form.phone')}
              </label>
              <input
                id="lead-form-phone"
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                className={inputClassName}
                placeholder="+998 90 123 45 67"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('leads.form.operator')}</span>
              <FilterSelect
                value={form.manager}
                options={operatorOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, manager: value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('leads.form.source')}</span>
              <FilterSelect
                value={form.source}
                options={sourceOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, source: value }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-1.5">
              <span className={labelClassName}>{t('leads.form.status')}</span>
              <FilterSelect
                value={form.status}
                options={statusOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, status: value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="lead-form-notes">
              {t('leads.form.notes')}
            </label>
            <textarea
              id="lead-form-notes"
              value={form.aiSummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, aiSummary: event.target.value }))
              }
              className={`${inputClassName} min-h-[96px] resize-y`}
              placeholder={t('leads.form.notesPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          {fieldError ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {fieldError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('leads.form.creating')
                  : t('leads.form.saving')
                : mode === 'create'
                  ? t('leads.form.createSubmit')
                  : t('leads.form.editSubmit')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default LeadFormPanel;
