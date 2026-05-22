import type { AppRouteConfig } from '../../config/routes';
import { useTranslation } from 'react-i18next';
import {
  EmptyState,
  LoadingState,
  PageCard,
  PageHeader,
  PageLayout,
  PageSection,
} from './page';

interface PagePlaceholderProps {
  route: AppRouteConfig;
  summary: string;
  sectionTitle?: string;
  sectionDescription?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

function PagePlaceholder({
  route,
  summary,
  sectionTitle,
  sectionDescription,
  emptyStateTitle,
  emptyStateDescription,
}: PagePlaceholderProps) {
  const { t } = useTranslation();
  const resolvedSectionTitle =
    sectionTitle ?? t('shared.placeholder.sectionTitle');
  const resolvedSectionDescription =
    sectionDescription ?? t('shared.placeholder.sectionDescription');
  const resolvedEmptyStateTitle =
    emptyStateTitle ?? t('shared.placeholder.emptyTitle');
  const resolvedEmptyStateDescription =
    emptyStateDescription ?? t('shared.placeholder.emptyDescription');
  const translatedRouteTitle = t(`routes.${route.id}.title`, {
    defaultValue: route.title,
  });

  const content = (
    <PageLayout
      header={
        <PageHeader
          eyebrow={
            route.access === 'public'
              ? t('shared.placeholder.publicRoute')
              : t('shared.placeholder.protectedRoute')
          }
          title={translatedRouteTitle}
          subtitle={summary}
          actions={
            <span className="inline-flex rounded-pill border border-border-accent bg-primary-soft px-[10px] py-[6px] font-mono text-[0.95rem] text-text-accent">
              {route.path}
            </span>
          }
        />
      }
    >
      <PageSection
        title={resolvedSectionTitle}
        description={resolvedSectionDescription}
      >
        <PageCard>
          <dl className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
            <div className="rounded-lg border border-border-subtle bg-background-subtle p-4">
              <dt className="text-[0.85rem] text-text-muted">
                {t('shared.placeholder.routeId')}
              </dt>
              <dd className="mt-2 text-[1.8rem] font-bold text-text-primary">
                {route.id}
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background-subtle p-4">
              <dt className="text-[0.85rem] text-text-muted">
                {t('shared.placeholder.navigation')}
              </dt>
              <dd className="mt-2 text-[1.8rem] font-bold text-text-primary">
                {route.showInNavigation
                  ? t('shared.placeholder.listed')
                  : t('shared.placeholder.hidden')}
              </dd>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background-subtle p-4">
              <dt className="text-[0.85rem] text-text-muted">
                {t('shared.placeholder.access')}
              </dt>
              <dd className="mt-2 text-[1.8rem] font-bold text-text-primary">
                {route.access}
              </dd>
            </div>
          </dl>
          {route.allowedRoles ? (
            <p className="mt-4 text-text-secondary">
              {t('shared.placeholder.allowedRoles')}:{' '}
              <strong>{route.allowedRoles.join(', ')}</strong>
            </p>
          ) : null}
          {route.accessStrategy ? (
            <p className="mt-4 text-text-secondary">
              {t('shared.placeholder.accessStrategy')}:{' '}
              <strong>{route.accessStrategy}</strong>
            </p>
          ) : null}
        </PageCard>
      </PageSection>

      <PageSection title={t('shared.placeholder.nextStateTitle')}>
        <EmptyState
          title={resolvedEmptyStateTitle}
          description={resolvedEmptyStateDescription}
        />
      </PageSection>

      <PageSection title={t('shared.placeholder.loadingPatternTitle')}>
        <LoadingState
          title={t('shared.placeholder.loadingPatternHeading')}
          description={t('shared.placeholder.loadingPatternDescription')}
        />
      </PageSection>
    </PageLayout>
  );

  if (route.access === 'public') {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        {content}
      </main>
    );
  }

  return content;
}

export default PagePlaceholder;
