import { CatalogPageTemplate } from '../../features/catalog/CatalogPageTemplate';

export function FlightsPage() {
  return (
    <CatalogPageTemplate
      title="Flights"
      subtitle="Browse route options and compare prices."
      fixedKind="flight"
      showKindFilter={false}
      showFlightFields
    />
  );
}
