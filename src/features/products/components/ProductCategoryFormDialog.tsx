import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductCategory } from '../../../types/domain';

interface ProductCategoryFormDialogProps {
  mode: 'create' | 'edit';
  category?: ProductCategory | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    code: string;
    sortOrder: number;
  }) => void;
}

const inputClassName = [
  'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-sm font-medium text-text-primary',
  'placeholder:text-text-muted outline-none transition duration-fast',
  'focus:border-primary/50 focus:ring-2 focus:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const labelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted';

function normalizeCategoryCode(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function ProductCategoryFormDialog({
  mode,
  category,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ProductCategoryFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('1');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && category) {
      setName(category.name);
      setSortOrder(String((category.sortOrder ?? 0) + 1));
      return;
    }

    setName('');
    setSortOrder('1');
  }, [mode, category]);

  const code = useMemo(() => normalizeCategoryCode(name), [name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const normalizedName = name.trim();
    const parsedSortOrder = Math.max(1, Math.floor(Number(sortOrder)));
    if (!normalizedName) {
      setFieldError(t('products.categoryForm.requiredError'));
      return;
    }

    if (!Number.isFinite(parsedSortOrder)) {
      setFieldError(t('products.categoryForm.sortOrderError'));
      return;
    }

    onSubmit({
      name: normalizedName,
      code: normalizeCategoryCode(normalizedName),
      sortOrder: parsedSortOrder - 1,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background-overlay/64 px-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        className="w-full max-w-[460px] rounded-2xl bg-surface-card p-5 shadow-xl ring-1 ring-border-soft/45"
        onClick={(event) => event.stopPropagation()}
        aria-label={t('products.categoryForm.ariaLabel')}
      >
        <div className="grid gap-2">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t('products.categoryForm.eyebrow')}
          </p>
          <h2 className="m-0 font-display text-[1.24rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-text-primary">
            {mode === 'create'
              ? t('products.categoryForm.createTitle')
              : t('products.categoryForm.editTitle')}
          </h2>
          <p className="m-0 text-sm leading-6 text-text-secondary">
            {mode === 'create'
              ? t('products.categoryForm.createSubtitle')
              : t('products.categoryForm.editSubtitle')}
          </p>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-category-name">
              {t('products.categoryForm.name')}
            </label>
            <input
              id="product-category-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder={t('products.categoryForm.namePlaceholder')}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-category-code-preview">
              {t('products.categoryForm.code')}
            </label>
            <input
              id="product-category-code-preview"
              type="text"
              value={code}
              className={inputClassName}
              disabled
              readOnly
            />
          </div>

          <div className="grid gap-1.5">
            <label className={labelClassName} htmlFor="product-category-sort-order">
              {t('products.categoryForm.sortOrder')}
            </label>
            <input
              id="product-category-sort-order"
              type="number"
              min="0"
              step="1"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
              required
            />
            <p className="m-0 text-[12px] leading-5 text-text-secondary">
              {t('products.categoryForm.sortOrderHint')}
            </p>
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-surface-subtle px-4 text-sm font-semibold text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="ml-auto inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition duration-fast hover:bg-primary-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || name.trim().length === 0}
            >
              {isSubmitting
                ? mode === 'create'
                  ? t('products.categoryForm.creating')
                  : t('products.categoryForm.saving')
                : mode === 'create'
                  ? t('products.categoryForm.create')
                  : t('products.categoryForm.save')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProductCategoryFormDialog;
