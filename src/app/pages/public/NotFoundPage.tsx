import { getRouteById } from '../../../config/routes';
import PagePlaceholder from '../../../components/shared/PagePlaceholder';
import { useTranslation } from 'react-i18next';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <PagePlaceholder
      route={getRouteById('not-found')}
      summary={t('placeholders.notFound.summary')}
      sectionTitle={t('placeholders.notFound.sectionTitle')}
      sectionDescription={t('placeholders.notFound.sectionDescription')}
      emptyStateTitle={t('placeholders.notFound.emptyTitle')}
      emptyStateDescription={t('placeholders.notFound.emptyDescription')}
    />
  );
}

export default NotFoundPage;

