import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="grid min-h-[208px] place-items-center gap-4 rounded-xl border border-border-subtle bg-surface-card p-7 text-center text-text-secondary shadow-sm">
      <div className="h-[54px] w-[54px] rounded-[18px] border border-border-accent bg-primary/10 shadow-sm" />
      <div className="grid max-w-[52ch] gap-3">
        <h3 className="m-0 text-[1.1rem] font-semibold text-text-primary">
          {title}
        </h3>
        <p className="m-0 leading-[1.55]">{description}</p>
      </div>
      {action ? (
        <div className="flex justify-center">{action}</div>
      ) : null}
    </div>
  );
}

export default EmptyState;
