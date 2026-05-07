import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRecommendations } from '../../features/recommendations/recommendations.api';
import { RecommendationCard } from '../recommendations/RecommendationCard';

function toRecommendationParams(filters, limit) {
  const allowed = [
    'kind',
    'country_id',
    'city_id',
    'min_price_usd',
    'max_price_usd',
    'status',
    'cuisine',
    'activity_kind',
    'origin_city_id',
    'destination_city_id',
    'q',
  ];
  const next = { limit };
  allowed.forEach((key) => {
    if (filters?.[key] !== undefined && filters?.[key] !== null && filters?.[key] !== '') {
      next[key] = filters[key];
    }
  });
  return next;
}

export function RecommendationBlock({ title = 'Recommended for You', filters = {}, limit = 4 }) {
  const params = toRecommendationParams(filters, limit);
  const query = useQuery({
    queryKey: ['recommendations', params],
    queryFn: () => getRecommendations(params),
  });

  const items = query.data?.recommendations || [];

  return (
    <section className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand">{title}</h2>
        <Link to="/recommendations" className="text-xs text-accent hover:underline">
          See all
        </Link>
      </div>

      {query.isLoading ? (
        <p className="mt-2 text-sm text-accent">Loading recommendations...</p>
      ) : !items.length ? (
        <div className="mt-2 rounded-lg bg-surface p-3 text-sm text-accent">
          Not enough data for personalized recommendations yet. Browse catalog to improve suggestions.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <RecommendationCard key={item.service_id} recommendation={item} />
          ))}
        </div>
      )}
    </section>
  );
}
