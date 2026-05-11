import { CatalogPageTemplate } from '../../features/catalog/CatalogPageTemplate';

export function CatalogPage() {
  return (
    <CatalogPageTemplate
      title="Browse All Services"
      subtitle="Search travel offers across hotels, restaurants, activities, and flights."
      showKindFilter
    />
  );
}
