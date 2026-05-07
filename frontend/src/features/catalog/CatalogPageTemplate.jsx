import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SearchBar } from '../../components/catalog/SearchBar';
import { FiltersPanel } from '../../components/catalog/FiltersPanel';
import { ServiceCard } from '../../components/catalog/ServiceCard';
import { ViewToggle } from '../../components/catalog/ViewToggle';
import { Pagination } from '../../components/catalog/Pagination';
import { RecommendationBlock } from '../../components/catalog/RecommendationBlock';
import { AddToTourModal } from '../../components/tours/AddToTourModal';
import { getServices } from './catalog.api';
import { useCatalogQueryState } from './useCatalogQueryState';
import { getErrorMessage } from '../../lib/errors';
import { useFavorites } from '../favorites/useFavorites';

function mapApiError(error) {
  return getErrorMessage(error, 'Failed to load services.');
}

function defaultFilterState(query, fixedKind) {
  return {
    kind: fixedKind || query.kind || '',
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
    sort: raw.sort || undefined,
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

export function CatalogPageTemplate({
  title,
  subtitle,
  fixedKind,
  recommendationTitle,
  showKindFilter = true,
  showCuisine = false,
  showActivityKind = false,
  showFlightFields = false,
}) {
  const { query, apiParams, applyFilters, setPage } = useCatalogQueryState({ fixedKind });
  const favorites = useFavorites();

  const [searchText, setSearchText] = useState(query.q || '');
  const [filters, setFilters] = useState(() => defaultFilterState(query, fixedKind));
  const [view, setView] = useState('grid');
  const [addToTourService, setAddToTourService] = useState(null);

  useEffect(() => {
    setSearchText(query.q || '');
    setFilters(defaultFilterState(query, fixedKind));
  }, [query, fixedKind]);

  const queryResult = useQuery({
    queryKey: ['services', apiParams],
    queryFn: () => getServices(apiParams),
    placeholderData: (previous) => previous,
  });

  const services = queryResult.data?.items || [];
  const pagination = queryResult.data?.pagination || {
    page: query.page,
    limit: query.limit,
    total: 0,
  };

  const noResults = !queryResult.isLoading && !queryResult.isFetching && services.length === 0;

  function setFilterValue(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    applyFilters({ q: searchText || undefined });
  }

  function handleApplyFilters() {
    const parsed = parseFilterValues(filters);
    applyFilters({ ...parsed, q: searchText || undefined });
  }

  function handleResetFilters() {
    const reset = defaultFilterState(
      {
        sort: 'created_at desc',
      },
      fixedKind,
    );

    setSearchText('');
    setFilters(reset);
    applyFilters({
      q: undefined,
      ...parseFilterValues(reset),
    });
  }

  useEffect(() => {
    if (!queryResult.error) return;
    toast.error(mapApiError(queryResult.error));
  }, [queryResult.error]);

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">{title}</h1>
        <p className="mt-2 text-sm text-accent">{subtitle}</p>
      </header>

      <SearchBar value={searchText} onChange={setSearchText} onSubmit={handleSearchSubmit} />

      <FiltersPanel
        values={filters}
        setValue={setFilterValue}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        showKind={showKindFilter && !fixedKind}
        showCuisine={showCuisine}
        showActivityKind={showActivityKind}
        showFlightFields={showFlightFields}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-accent">Total results: {pagination.total || 0}</p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {queryResult.isLoading ? (
        <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Loading services...</div>
      ) : noResults ? (
        <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">
          No services found for current filters.
        </div>
      ) : (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'
              : 'flex flex-col gap-3'
          }
        >
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              view={view}
              isFavorite={favorites.isFavorite(service.id)}
              onToggleFavorite={() => favorites.toggleFavorite(service.id)}
              favoriteLoading={favorites.isToggling}
              onAddToTour={setAddToTourService}
            />
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page || query.page}
        limit={pagination.limit || query.limit}
        total={pagination.total || 0}
        onPageChange={setPage}
      />

      <RecommendationBlock title={recommendationTitle} filters={apiParams} limit={4} />

      <AddToTourModal
        service={addToTourService}
        open={Boolean(addToTourService)}
        onClose={() => setAddToTourService(null)}
      />
    </section>
  );
}
