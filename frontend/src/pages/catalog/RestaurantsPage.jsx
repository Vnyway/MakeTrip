import { CatalogPageTemplate } from '../../features/catalog/CatalogPageTemplate';

export function RestaurantsPage() {
  return (
    <CatalogPageTemplate
      title="Restaurants"
      subtitle="Explore dining options by location and cuisine."
      fixedKind="restaurant"
      showKindFilter={false}
      showCuisine
    />
  );
}
