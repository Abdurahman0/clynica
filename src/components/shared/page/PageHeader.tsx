import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header--nova mb-4 grid gap-3 min-[768px]:mb-5 min-[768px]:grid-cols-[minmax(0,1fr)_auto] min-[768px]:items-start">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="m-0 font-display text-[clamp(1.6rem,2.7vw,2.2rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-text-primary [overflow-wrap:anywhere]">
          {title}
        </h1>
        {subtitle ? (
          <p className="m-0 max-w-[60ch] text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-start gap-2 min-[768px]:w-auto min-[768px]:gap-3">{actions}</div>
      ) : null}
    </header>
  );
}

export default PageHeader;
