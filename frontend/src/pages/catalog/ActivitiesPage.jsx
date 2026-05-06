import { CatalogPageTemplate } from '../../features/catalog/CatalogPageTemplate';

export function ActivitiesPage() {
  return (
    <CatalogPageTemplate
      title="Activities"
      subtitle="Discover experiences, tickets, and excursions."
      fixedKind="activity"
      recommendationTitle="Recommended Activities"
      showKindFilter={false}
      showActivityKind
    />
  );
}
