import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_LIMIT } from './catalog.constants';

function asNumberOrUndefined(value) {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useCatalogQueryState({ fixedKind }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(() => {
    const q = {
      page: asNumberOrUndefined(searchParams.get('page')) || 1,
      limit: asNumberOrUndefined(searchParams.get('limit')) || DEFAULT_LIMIT,
      sort: searchParams.get('sort') || 'recommended',
      q: searchParams.get('q') || '',
      kind: fixedKind || searchParams.get('kind') || '',
      status: searchParams.get('status') || '',
      country_id: asNumberOrUndefined(searchParams.get('country_id')),
      city_id: asNumberOrUndefined(searchParams.get('city_id')),
      min_price_usd: asNumberOrUndefined(searchParams.get('min_price_usd')),
      max_price_usd: asNumberOrUndefined(searchParams.get('max_price_usd')),
      cuisine: searchParams.get('cuisine') || '',
      activity_kind: searchParams.get('activity_kind') || '',
      origin_city_id: asNumberOrUndefined(searchParams.get('origin_city_id')),
      destination_city_id: asNumberOrUndefined(searchParams.get('destination_city_id')),
      tags: searchParams.get('tags')
        ? searchParams.get('tags').split(',').filter(Boolean)
        : [],
    };

    return q;
  }, [fixedKind, searchParams]);

  function writeParams(nextState) {
    const merged = { ...query, ...nextState };

    const next = new URLSearchParams();

    Object.entries(merged).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (fixedKind && key === 'kind') return;
      next.set(key, String(value));
    });

    if (fixedKind) {
      next.delete('kind');
    }

    setSearchParams(next, { replace: true });
  }

  function setPage(page) {
    writeParams({ page });
  }

  function applyFilters(filters) {
    writeParams({ ...filters, page: 1 });
  }

  const apiParams = useMemo(() => {
    const payload = {
      ...query,
      kind: fixedKind || query.kind || undefined,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] == null) delete payload[key];
    });

    if (Array.isArray(payload.tags) && payload.tags.length) {
      payload.tags = payload.tags.join(',');
    } else {
      delete payload.tags;
    }

    return payload;
  }, [fixedKind, query]);

  return {
    query,
    apiParams,
    applyFilters,
    setPage,
  };
}
