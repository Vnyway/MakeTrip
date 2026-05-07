import { Star, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyReviews } from '../../features/reviews/reviews.api';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function getKindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}

function ReviewSkeletonCard() {
  return (
    <article className="animate-pulse overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
      <div className="h-28 bg-mint-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-1/4 rounded bg-mint-200" />
        <div className="h-5 w-2/3 rounded bg-mint-200" />
        <div className="h-4 w-1/2 rounded bg-mint-200" />
        <div className="h-4 w-1/3 rounded bg-mint-200" />
      </div>
    </article>
  );
}

function ReviewCard({ item }) {
  const service = item.service;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-accent to-mint-300" />

      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-mint-100 px-2 py-1 text-xs font-medium text-brand">
            <span>{getKindLabel(service.kind)}</span>
            <span className="h-3 w-px bg-mint-300" />
            <span className="capitalize text-accent">{service.status}</span>
          </div>
          <h3 className="line-clamp-1 text-lg font-semibold text-brand">{service.title}</h3>
          <p className="line-clamp-2 text-sm text-accent">
            {service.description || 'No description provided for this service yet.'}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-accent">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              Country #{service.country_id}, city #{service.city_id}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-medium text-brand">
              ${Number(service.price_usd || 0).toFixed(0)}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col justify-between rounded-xl bg-surface p-4 sm:w-64">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
                <Star size={14} className="text-amber-500" fill="currentColor" />
                <span>{item.rating}/5</span>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-accent">
                {item.comment || 'You did not leave a comment for this review.'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-accent">
            <span>Created: {formatDate(item.created_at)}</span>
            {item.updated_at ? <span>Updated: {formatDate(item.updated_at)}</span> : null}
          </div>

          <Link
            to={`/services/${service.id}`}
            className="mt-3 inline-flex items-center justify-center rounded-lg border border-mint-300 bg-white px-3 py-1.5 text-xs font-medium text-brand transition group-hover:border-brand group-hover:bg-mint-100"
          >
            View service & edit review
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ReviewsPage() {
  const query = useQuery({
    queryKey: ['my-reviews'],
    queryFn: getMyReviews,
  });

  const items = query.data || [];

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand">My Reviews</h1>
          <p className="mt-1 text-sm text-accent">All reviews you have left for services.</p>
        </div>
        {items.length ? (
          <span className="rounded-full bg-mint-100 px-3 py-1 text-xs font-medium text-brand">
            Total: {items.length}
          </span>
        ) : null}
      </header>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <ReviewSkeletonCard key={idx} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-mint-200 bg-white p-8 text-center shadow-card">
          <Star size={40} className="text-accent" />
          <h2 className="mt-4 text-xl font-semibold text-brand">You have not left any reviews yet</h2>
          <p className="mt-2 text-sm text-accent">
            After staying in hotels, visiting restaurants or activities you can rate them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

