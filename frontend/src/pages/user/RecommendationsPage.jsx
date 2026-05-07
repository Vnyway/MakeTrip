import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SearchBar } from '../../components/catalog/SearchBar';
import { FiltersPanel } from '../../components/catalog/FiltersPanel';
import { RecommendationCard } from '../../components/recommendations/RecommendationCard';
import { getRecommendations } from '../../features/recommendations/recommendations.api';
import { useCatalogQueryState } from '../../features/catalog/useCatalogQueryState';
import { getErrorMessage } from '../../lib/errors';

function defaultFilterState(query) {
  return {
    kind: query.kind || '',
    sort: query.sort || 'created_at desc',
    status: query.status || '',
    country_id: query.country_id ?? '',
    city_id: query.city_id ?? '',
    min_price_usd: query.min_price_usd ?? '',
    max_price_usd: query.max_price_usd ?? '',
    cuisine: query.cuisine || '',
    activity_kind: query.activity_kind || '',
    origin_city_id: query.origin_city_id ?? '',
    destination_city_id: query.destination_city_id ?? '',
  };
}

function parseFilterValues(raw) {
  return {
    kind: raw.kind || undefined,
    status: raw.status || undefined,
    country_id: raw.country_id === '' ? undefined : Number(raw.country_id),
    city_id: raw.city_id === '' ? undefined : Number(raw.city_id),
    min_price_usd: raw.min_price_usd === '' ? undefined : Number(raw.min_price_usd),
    max_price_usd: raw.max_price_usd === '' ? undefined : Number(raw.max_price_usd),
    cuisine: raw.cuisine || undefined,
    activity_kind: raw.activity_kind || undefined,
    origin_city_id: raw.origin_city_id === '' ? undefined : Number(raw.origin_city_id),
    destination_city_id: raw.destination_city_id === '' ? undefined : Number(raw.destination_city_id),
  };
}

export function RecommendationsPage() {
  const { query, apiParams, applyFilters } = useCatalogQueryState({ fixedKind: undefined });
  const [searchText, setSearchText] = useState(query.q || '');
  const [filters, setFilters] = useState(() => defaultFilterState(query));

  useEffect(() => {
    setSearchText(query.q || '');
    setFilters(defaultFilterState(query));
  }, [query]);

  const recommendationParams = {
    ...apiParams,
    limit: 12,
  };
  delete recommendationParams.page;
  delete recommendationParams.sort;

  const queryResult = useQuery({
    queryKey: ['recommendations', 'page', recommendationParams],
    queryFn: () => getRecommendations(recommendationParams),
  });

  function setFilterValue(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    applyFilters({ q: searchText || undefined });
  }

  function handleApplyFilters() {
    applyFilters({
      ...parseFilterValues(filters),
      q: searchText || undefined,
    });
  }

  function handleResetFilters() {
    const reset = defaultFilterState({
      sort: 'created_at desc',
    });
    setSearchText('');
    setFilters(reset);
    applyFilters({
      q: undefined,
      ...parseFilterValues(reset),
    });
  }

  useEffect(() => {
    if (!queryResult.error) return;
    toast.error(getErrorMessage(queryResult.error, 'Failed to load recommendations.'));
  }, [queryResult.error]);

  const items = queryResult.data?.recommendations || [];

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Recommendations</h1>
        <p className="mt-2 text-sm text-accent">
          Personalized suggestions based on your preferences, interactions, and similar users.
        </p>
      </header>

      <SearchBar value={searchText} onChange={setSearchText} onSubmit={handleSearchSubmit} />

      <FiltersPanel
        values={filters}
        setValue={setFilterValue}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        showKind={true}
        showCuisine={true}
        showActivityKind={true}
        showFlightFields={true}
      />

      {queryResult.isLoading ? (
        <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Loading recommendations...</div>
      ) : !items.length ? (
        <div className="rounded-xl border border-mint-200 bg-white p-8 text-center shadow-card">
          <h2 className="text-xl font-semibold text-brand">No personalized recommendations yet</h2>
          <p className="mt-2 text-sm text-accent">
            Try changing filters or interact with more services in the catalog to improve your recommendations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <RecommendationCard key={item.service_id} recommendation={item} />
          ))}
        </div>
      )}
    </section>
  );
}
