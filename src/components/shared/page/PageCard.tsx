import type { PropsWithChildren } from 'react';

interface PageCardProps extends PropsWithChildren {
  muted?: boolean;
  allowOverflow?: boolean;
  className?: string;
}

function PageCard({
  muted = false,
  allowOverflow = false,
  className,
  children,
}: PageCardProps) {
  return (
    <div
      className={[
        'relative rounded-xl p-5 shadow-sm ring-1 ring-border-soft/40 transition duration-base max-[640px]:p-4 hover:shadow-md hover:ring-border-soft/60',
        allowOverflow ? 'overflow-visible' : 'overflow-hidden',
        muted
          ? 'bg-surface-subtle/75'
          : 'bg-surface-card',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default PageCard;
