import { CatalogPageTemplate } from '../../features/catalog/CatalogPageTemplate';

export function HotelsPage() {
  return (
    <CatalogPageTemplate
      title="Hotels"
      subtitle="Find accommodation offers for your next trip."
      fixedKind="hotel"
      recommendationTitle="Recommended Hotels"
      showKindFilter={false}
    />
  );
}
