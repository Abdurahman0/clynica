import type { PropsWithChildren, ReactNode } from 'react';

interface FilterBarProps extends PropsWithChildren {
  actions?: ReactNode;
}

function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <div
      className={[
        'filter-bar relative z-20 flex flex-wrap items-end justify-between gap-3 overflow-visible rounded-xl',
        'bg-surface-card p-4 shadow-sm ring-1 ring-border-soft/25 backdrop-blur-[12px]',
      ].join(' ')}
    >
      <div className="filter-bar__filters flex min-w-0 flex-1 flex-wrap items-end gap-3">
        {children}
      </div>
      {actions ? (
        <div className="filter-bar__actions ml-auto flex min-w-0 flex-wrap items-center gap-2.5 max-[820px]:ml-0 max-[820px]:w-full max-[820px]:justify-start">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export default FilterBar;
