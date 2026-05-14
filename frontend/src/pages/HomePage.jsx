import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CalendarDays, Shuffle, ShoppingBag } from 'lucide-react';
import { CatalogPageTemplate } from '../features/catalog/CatalogPageTemplate';
import { useAuth } from '../app/auth';

function TourConstructorBanner() {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem('maketrip_hide_tour_banner'),
  );

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-mint-200 bg-white shadow-card">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem('maketrip_hide_tour_banner', '1');
          setVisible(false);
        }}
        className="absolute right-3 top-3 rounded-md p-1 text-accent transition hover:bg-surface hover:text-brand"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-4">
          <div>
            <span className="inline-block rounded-full bg-mint-100 px-3 py-1 text-xs font-medium text-brand">
              Create Your Perfect Tour
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-brand">Tour Constructor</h2>
            <p className="mt-1 text-sm text-accent">
              Build your dream vacation day by day! Select hotels, restaurants, activities, and
              flights, organize them into a custom itinerary, and book everything in one go.
            </p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>
                <span className="font-medium text-brand">Day-by-Day Planning</span>
                <span className="text-accent"> — organize services by days and create a detailed itinerary</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <Shuffle size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>
                <span className="font-medium text-brand">Mix &amp; Match Services</span>
                <span className="text-accent"> — combine hotels, restaurants, activities, and flights into one tour</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <ShoppingBag size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>
                <span className="font-medium text-brand">Book Everything at Once</span>
                <span className="text-accent"> — save time by booking your entire tour in a single checkout</span>
              </span>
            </li>
          </ul>
          <Link to="/tours" className="btn-primary inline-flex items-center gap-2">
            Start Building Your Tour
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="hidden shrink-0 sm:block">
          <div className="flex flex-col gap-2">
            {['D1', 'D2', 'D3'].map((day) => (
              <div
                key={day}
                className="flex items-center gap-3 rounded-lg border border-mint-200 bg-surface px-4 py-3 pr-16"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {day}
                </span>
                <div className="space-y-1">
                  <div className="h-2 w-28 rounded-full bg-mint-200" />
                  <div className="h-2 w-20 rounded-full bg-mint-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-6">
      <TourConstructorBanner />
      <CatalogPageTemplate
        title="Browse All Services"
        subtitle="Search travel offers across hotels, restaurants, activities, and flights."
        showKindFilter
      />
    </div>
  );
}
