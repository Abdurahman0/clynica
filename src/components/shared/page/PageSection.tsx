import type { PropsWithChildren, ReactNode } from 'react';

interface PageSectionProps extends PropsWithChildren {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

function PageSection({
  title,
  description,
  actions,
  children,
}: PageSectionProps) {
  return (
    <section className="grid gap-4">
      {title || description || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="m-0 text-[1.02rem] font-semibold text-text-primary">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 max-w-[60ch] text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default PageSection;
