import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterSelect, Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import type {
  IntegrationConfig,
  IntegrationConfigMutationInput,
  IntegrationProvider,
  SelectOption,
} from '../../../types/domain';

interface IntegrationConfigFormPanelProps {
  mode: 'create' | 'edit';
  config?: IntegrationConfig | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: IntegrationConfigMutationInput) => void;
}

interface IntegrationConfigFormState {
  provider: IntegrationProvider;
  key: string;
  label: string;
  value: string;
  isSecret: boolean;
  isActive: boolean;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const textareaClassName = [inputClassName, 'min-h-[120px] resize-y leading-6'].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function createInitialState(
  mode: 'create' | 'edit',
  config: IntegrationConfig | null | undefined,
): IntegrationConfigFormState {
  if (mode === 'edit' && config) {
    return {
      provider: config.provider,
      key: config.key,
      label: config.label,
      value: config.value,
      isSecret: config.is_secret,
      isActive: config.is_active,
    };
  }

  return {
    provider: 'telegram',
    key: '',
    label: '',
    value: '',
    isSecret: true,
    isActive: true,
  };
}

function IntegrationConfigFormPanel({
  mode,
  config,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: IntegrationConfigFormPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<IntegrationConfigFormState>(() =>
    createInitialState(mode, config),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const canSubmit = useMemo(() => {
    return (
      form.key.trim().length > 0 &&
      form.label.trim().length > 0 &&
      form.value.trim().length > 0
    );
  }, [form.key, form.label, form.value]);

  useEffect(() => {
    setForm(createInitialState(mode, config));
    setFieldError(null);
  }, [mode, config]);

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

  const providerOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'telegram', label: t('integrations.providers.telegram') },
      { value: 'instagram', label: t('integrations.providers.instagram') },
      { value: 'openai', label: t('integrations.providers.openai') },
    ],
    [t],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const key = form.key.trim();
    const label = form.label.trim();
    const value = form.value.trim();

    if (!key || !label || !value) {
      setFieldError(t('integrations.configForm.requiredError'));
      return;
    }

    onSubmit({
      provider: form.provider,
      key,
      label,
      value,
      is_secret: form.isSecret,
      is_active: form.isActive,
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
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[640px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={
          mode === 'create'
            ? t('integrations.configForm.createTitle')
            : t('integrations.configForm.editTitle')
        }
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('integrations.configForm.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create'
                  ? t('integrations.configForm.createTitle')
                  : t('integrations.configForm.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {mode === 'create'
                  ? t('integrations.configForm.createSubtitle')
                  : t('integrations.configForm.editSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('integrations.configForm.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-1.5">
            <span className={labelClassName}>{t('integrations.configFields.provider')}</span>
            <FilterSelect
              value={form.provider}
              options={providerOptions}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  provider: value as IntegrationProvider,
                }))
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="integration-config-key">
                {t('integrations.configFields.key')}
              </label>
              <input
                id="integration-config-key"
                type="text"
                value={form.key}
                onChange={(event) =>
                  setForm((current) => ({ ...current, key: event.target.value }))
                }
                className={inputClassName}
                placeholder={t('integrations.configForm.keyPlaceholder')}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="integration-config-label">
                {t('integrations.configFields.label')}
              </label>
              <input
                id="integration-config-label"
                type="text"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
                className={inputClassName}
                placeholder={t('integrations.configForm.labelPlaceholder')}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="integration-config-value">
              {t('integrations.configFields.value')}
            </label>
            <textarea
              id="integration-config-value"
              value={form.value}
              onChange={(event) =>
                setForm((current) => ({ ...current, value: event.target.value }))
              }
              className={textareaClassName}
              placeholder={t('integrations.configForm.valuePlaceholder')}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {t('integrations.configFields.isSecret')}
                </p>
                <p className="m-0 text-[12px] text-text-secondary">
                  {t('integrations.configForm.secretHint')}
                </p>
              </div>
              <Switch
                checked={form.isSecret}
                onChange={(nextValue) =>
                  setForm((current) => ({ ...current, isSecret: nextValue }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {t('integrations.configFields.isActive')}
                </p>
                <p className="m-0 text-[12px] text-text-secondary">
                  {t('integrations.configForm.activeHint')}
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(nextValue) =>
                  setForm((current) => ({ ...current, isActive: nextValue }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          {fieldError || errorMessage ? (
            <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
              {fieldError ?? errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="ml-auto inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('integrations.configForm.creating')
                  : t('integrations.configForm.saving')
                : mode === 'create'
                  ? t('integrations.configForm.createSubmit')
                  : t('integrations.configForm.editSubmit')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default IntegrationConfigFormPanel;
