import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

const PAGINATION_BUTTON_CLASS_NAME = [
  'inline-flex min-h-[38px] min-w-[96px] items-center justify-center rounded-lg border-0',
  'bg-surface-card px-3.5 text-sm font-semibold text-text-primary shadow-sm ring-1 ring-border-soft/25 transition duration-fast',
  'hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none max-[820px]:flex-1',
].join(' ');

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation();
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      className="pagination flex flex-wrap items-center justify-end gap-3 px-0.5 pt-1"
      aria-label="Pagination"
    >
      <div className="pagination__summary flex flex-wrap items-center gap-2 text-sm font-medium text-text-secondary">
        <span className="pagination__current inline-flex min-h-7 items-center rounded-pill bg-primary/12 px-2.5 text-[12px] font-semibold text-text-accent">
          {t('shared.pagination.page')} {currentPage}
        </span>
        <span className="text-text-primary">
          {t('shared.pagination.of')} {Math.max(totalPages, 1)}
        </span>
        {typeof totalItems === 'number' ? (
          <span>
            {totalItems} {t('shared.pagination.totalItems')}
          </span>
        ) : null}
      </div>
      <div className="pagination__actions flex items-center gap-3">
        <button
          type="button"
          className={PAGINATION_BUTTON_CLASS_NAME}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          {t('shared.pagination.previous')}
        </button>
        <button
          type="button"
          className={PAGINATION_BUTTON_CLASS_NAME}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          {t('shared.pagination.next')}
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
