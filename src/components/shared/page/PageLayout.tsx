import type { PropsWithChildren, ReactNode } from 'react';

interface PageLayoutProps extends PropsWithChildren {
  header?: ReactNode;
}

function PageLayout({ header, children }: PageLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-page gap-4 min-[768px]:gap-6">
      {header}
      {children}
    </div>
  );
}

export default PageLayout;
