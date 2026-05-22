import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../../../components/shared/data';
import AppIcon from '../../../components/shared/icons/AppIcon';
import type { AISetting, AISettingMutationInput } from '../../../types/domain';

interface AISettingFormPanelProps {
  mode: 'create' | 'edit';
  setting?: AISetting | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: AISettingMutationInput) => void;
}

interface AISettingFormState {
  name: string;
  systemPrompt: string;
  followUpMessage: string;
  modelName: string;
  temperature: string;
  autoOrderEnabled: boolean;
  orderConfidenceThreshold: string;
  followUpEnabled: boolean;
  followUpMinutes: string;
  isActive: boolean;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const textareaClassName = [
  inputClassName,
  'min-h-[220px] resize-y leading-6',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function createInitialState(
  mode: 'create' | 'edit',
  setting: AISetting | null | undefined,
): AISettingFormState {
  if (mode === 'edit' && setting) {
    return {
      name: setting.name,
      systemPrompt: setting.system_prompt,
      followUpMessage: setting.follow_up_message ?? '',
      modelName: setting.model_name,
      temperature: setting.temperature.toString(),
      autoOrderEnabled: setting.auto_order_enabled,
      orderConfidenceThreshold: setting.order_confidence_threshold.toString(),
      followUpEnabled: setting.resume_after_operator_minutes > 0,
      followUpMinutes:
        setting.resume_after_operator_minutes > 0
          ? setting.resume_after_operator_minutes.toString()
          : '15',
      isActive: setting.is_active,
    };
  }

  return {
    name: '',
    systemPrompt: '',
    followUpMessage: '',
    modelName: 'gpt-4.1-mini',
    temperature: '0.35',
    autoOrderEnabled: true,
    orderConfidenceThreshold: '0.82',
    followUpEnabled: true,
    followUpMinutes: '15',
    isActive: false,
  };
}

function normalizeUnitRangeValue(value: string, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
}

function AISettingFormPanel({
  mode,
  setting,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: AISettingFormPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AISettingFormState>(() =>
    createInitialState(mode, setting),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setForm(createInitialState(mode, setting));
    setFieldError(null);
  }, [mode, setting]);

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

  const canSubmit = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.systemPrompt.trim().length > 0 &&
      form.modelName.trim().length > 0,
    [form.modelName, form.name, form.systemPrompt],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const name = form.name.trim();
    const systemPrompt = form.systemPrompt.trim();
    const modelName = form.modelName.trim();
    const temperature = Number(form.temperature);
    const confidenceThreshold = Number(form.orderConfidenceThreshold);
    const followUpMinutes = Number(form.followUpMinutes);
    const followUpMessage = form.followUpMessage.trim();

    if (!name || !systemPrompt || !modelName) {
      setFieldError(t('aiSettings.form.requiredError'));
      return;
    }

    if (Number.isNaN(temperature) || temperature < 0 || temperature > 1) {
      setFieldError(t('aiSettings.form.temperatureError'));
      return;
    }

    if (
      Number.isNaN(confidenceThreshold) ||
      confidenceThreshold < 0 ||
      confidenceThreshold > 1
    ) {
      setFieldError(t('aiSettings.form.confidenceError'));
      return;
    }

    if (
      form.followUpEnabled &&
      (Number.isNaN(followUpMinutes) || followUpMinutes < 1)
    ) {
      setFieldError(t('aiSettings.form.followUpError'));
      return;
    }

    if (form.followUpEnabled && followUpMinutes > 0 && !followUpMessage) {
      setFieldError(t('aiSettings.form.followUpMessageError'));
      return;
    }

    onSubmit({
      name,
      system_prompt: systemPrompt,
      follow_up_message: form.followUpEnabled && followUpMinutes > 0 ? followUpMessage : '',
      model_name: modelName,
      temperature,
      auto_order_enabled: form.autoOrderEnabled,
      order_confidence_threshold: confidenceThreshold,
      resume_after_operator_minutes: form.followUpEnabled
        ? Math.round(followUpMinutes)
        : 0,
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
        className="h-full w-full overflow-y-auto bg-background-subtle p-4 shadow-xl ring-1 ring-border-soft/50 min-[641px]:max-w-[720px] min-[641px]:p-5"
        onClick={(event) => event.stopPropagation()}
        aria-label={
          mode === 'create'
            ? t('aiSettings.form.createTitle')
            : t('aiSettings.form.editTitle')
        }
      >
        <header className="mb-4 rounded-xl bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {t('aiSettings.form.eyebrow')}
              </p>
              <h2 className="mt-1 font-display text-[1.45rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-text-primary">
                {mode === 'create'
                  ? t('aiSettings.form.createTitle')
                  : t('aiSettings.form.editTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {mode === 'create'
                  ? t('aiSettings.form.createSubtitle')
                  : t('aiSettings.form.editSubtitle')}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary shadow-sm transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label={t('aiSettings.form.close')}
            >
              <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="ai-setting-name">
                {t('aiSettings.form.name')}
              </label>
              <input
                id="ai-setting-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className={inputClassName}
                placeholder={t('aiSettings.form.namePlaceholder')}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="ai-setting-model-name">
                {t('aiSettings.form.modelName')}
              </label>
              <input
                id="ai-setting-model-name"
                type="text"
                value={form.modelName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, modelName: event.target.value }))
                }
                className={inputClassName}
                placeholder="gpt-4.1-mini"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="ai-setting-system-prompt">
              {t('aiSettings.form.systemPrompt')}
            </label>
            <textarea
              id="ai-setting-system-prompt"
              value={form.systemPrompt}
              onChange={(event) =>
                setForm((current) => ({ ...current, systemPrompt: event.target.value }))
              }
              className={textareaClassName}
              placeholder={t('aiSettings.form.systemPromptPlaceholder')}
              disabled={isSubmitting}
              required
            />
            <p className="m-0 text-[12px] leading-5 text-text-secondary">
              {t('aiSettings.form.systemPromptHint')}
            </p>
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="ai-setting-follow-up-message">
              {t('aiSettings.form.followUpMessage')}
            </label>
            <textarea
              id="ai-setting-follow-up-message"
              value={form.followUpMessage}
              onChange={(event) =>
                setForm((current) => ({ ...current, followUpMessage: event.target.value }))
              }
              className={[inputClassName, 'min-h-[120px] resize-y leading-6'].join(' ')}
              placeholder={t('aiSettings.form.followUpMessagePlaceholder')}
              disabled={isSubmitting || !form.followUpEnabled}
            />
            <p className="m-0 text-[12px] leading-5 text-text-secondary">
              {t('aiSettings.form.followUpMessageHint')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="ai-setting-temperature">
                {t('aiSettings.form.temperature')}
              </label>
              <input
                id="ai-setting-temperature-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={normalizeUnitRangeValue(form.temperature, 0.35)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, temperature: event.target.value }))
                }
                disabled={isSubmitting}
              />
              <input
                id="ai-setting-temperature"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.temperature}
                onChange={(event) =>
                  setForm((current) => ({ ...current, temperature: event.target.value }))
                }
                className={inputClassName}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="ai-setting-threshold">
                {t('aiSettings.form.orderConfidenceThreshold')}
              </label>
              <input
                id="ai-setting-threshold-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={normalizeUnitRangeValue(form.orderConfidenceThreshold, 0.82)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    orderConfidenceThreshold: event.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
              <input
                id="ai-setting-threshold"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.orderConfidenceThreshold}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    orderConfidenceThreshold: event.target.value,
                  }))
                }
                className={inputClassName}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className={labelClassName} htmlFor="ai-setting-follow-up-minutes">
                {t('aiSettings.form.followUpMinutes')}
              </label>
              <input
                id="ai-setting-follow-up-range"
                type="range"
                min={1}
                max={180}
                step={1}
                value={Math.min(
                  180,
                  Math.max(1, Number(form.followUpMinutes) || 15),
                )}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    followUpMinutes: event.target.value,
                  }))
                }
                disabled={isSubmitting || !form.followUpEnabled}
              />
              <input
                id="ai-setting-follow-up-minutes"
                type="number"
                min={1}
                max={180}
                step={1}
                value={form.followUpMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    followUpMinutes: event.target.value,
                  }))
                }
                className={inputClassName}
                disabled={isSubmitting || !form.followUpEnabled}
                required={form.followUpEnabled}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {t('aiSettings.form.autoOrderEnabled')}
                </p>
                <p className="m-0 text-[12px] text-text-secondary">
                  {t('aiSettings.form.autoOrderHint')}
                </p>
              </div>
              <Switch
                checked={form.autoOrderEnabled}
                onChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    autoOrderEnabled: nextValue,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {t('aiSettings.form.followUpEnabled')}
                </p>
                <p className="m-0 text-[12px] text-text-secondary">
                  {t('aiSettings.form.followUpHint')}
                </p>
              </div>
              <Switch
                checked={form.followUpEnabled}
                onChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    followUpEnabled: nextValue,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-card px-4 py-4 ring-1 ring-border-soft/35">
              <div className="grid gap-0.5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  {t('aiSettings.form.isActive')}
                </p>
                <p className="m-0 text-[12px] text-text-secondary">
                  {t('aiSettings.form.isActiveHint')}
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(nextValue) =>
                  setForm((current) => ({
                    ...current,
                    isActive: nextValue,
                  }))
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
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('aiSettings.form.creating')
                  : t('aiSettings.form.saving')
                : mode === 'create'
                  ? t('aiSettings.form.createSubmit')
                  : t('aiSettings.form.editSubmit')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default AISettingFormPanel;
