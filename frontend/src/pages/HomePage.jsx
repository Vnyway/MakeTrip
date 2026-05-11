import { CatalogPageTemplate } from '../features/catalog/CatalogPageTemplate';
import { useAuth } from '../app/auth';

export function HomePage() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return (
      <section className="space-y-6">
        <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
          <h1 className="text-3xl font-bold tracking-tight text-brand">Home</h1>
          <p className="mt-2 text-sm text-accent">
            Sign in to browse the catalog, search offers, and build your trip.
          </p>
        </header>
      </section>
    );
  }

  return (
    <CatalogPageTemplate
      title="Browse All Services"
      subtitle="Search travel offers across hotels, restaurants, activities, and flights."
      showKindFilter
    />
  );
}
