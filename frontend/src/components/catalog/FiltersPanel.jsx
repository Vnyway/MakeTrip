import { SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SORT_OPTIONS, STATUS_OPTIONS, TAGS } from '../../features/catalog/catalog.constants';
import { listCities, listCountries } from '../../features/geo/geo.api';

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-brand">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
    </label>
  );
}

export function FiltersPanel({
  values,
  setValue,
  onApply,
  onReset,
  showKind,
  showCuisine,
  showActivityKind,
  showFlightFields,
}) {
  const selectedTags = Array.isArray(values.tags) ? values.tags : [];
  const countriesQuery = useQuery({
    queryKey: ['geo', 'countries', 'filters'],
    queryFn: listCountries,
  });
  const cityByCountryQuery = useQuery({
    queryKey: ['geo', 'cities', 'filters', values.country_id || 'none'],
    queryFn: () => listCities(values.country_id),
    enabled: Boolean(values.country_id),
  });
  const allCitiesQuery = useQuery({
    queryKey: ['geo', 'cities', 'filters', 'all'],
    queryFn: () => listCities(),
  });
  const countries = countriesQuery.data || [];
  const citiesByCountry = cityByCountryQuery.data || [];
  const allCities = allCitiesQuery.data || [];

  return (
    <section className="space-y-4 rounded-xl border border-mint-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-brand">
        <SlidersHorizontal size={16} />
        <h2 className="text-sm font-semibold">Filters & Sorting</h2>
      </div>

      <p className="text-xs leading-relaxed text-accent">
        <span className="font-medium text-brand">Sort tip:</span> &quot;Recommended&quot; ranks with CF; price or date
        sorts ignore CF and order the list strictly.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
        {showKind ? (
          <label className="space-y-1 text-sm">
            <span className="font-medium text-brand">Category</span>
            <select
              value={values.kind}
              onChange={(event) => setValue('kind', event.target.value)}
              className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
            >
              <option value="">All categories</option>
              <option value="hotel">Hotels</option>
              <option value="restaurant">Restaurants</option>
              <option value="activity">Activities</option>
              <option value="flight">Flights</option>
            </select>
          </label>
        ) : null}

        <label className="space-y-1 text-sm">
          <span className="font-medium text-brand">Sort</span>
          <select
            value={values.sort}
            onChange={(event) => setValue('sort', event.target.value)}
            className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-brand">Status</span>
          <select
            value={values.status}
            onChange={(event) => setValue('status', event.target.value)}
            className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'any'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-brand">Country</span>
          <select
            value={values.country_id ?? ''}
            onChange={(event) => {
              setValue('country_id', event.target.value);
              setValue('city_id', '');
            }}
            className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
          >
            <option value="">All countries</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-brand">City</span>
          <select
            value={values.city_id ?? ''}
            onChange={(event) => setValue('city_id', event.target.value)}
            className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
          >
            <option value="">{values.country_id ? 'All cities in country' : 'Select country first (optional)'}</option>
            {citiesByCountry.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Min price" value={values.min_price_usd} onChange={(v) => setValue('min_price_usd', v)} type="number" />
          <Input label="Max price" value={values.max_price_usd} onChange={(v) => setValue('max_price_usd', v)} type="number" />
        </div>

        {showCuisine ? <Input label="Cuisine" value={values.cuisine} onChange={(v) => setValue('cuisine', v)} /> : null}
        {showActivityKind ? (
          <Input label="Activity kind" value={values.activity_kind} onChange={(v) => setValue('activity_kind', v)} />
        ) : null}

        {showFlightFields ? (
          <>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-brand">Origin city</span>
              <select
                value={values.origin_city_id ?? ''}
                onChange={(event) => setValue('origin_city_id', event.target.value)}
                className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
              >
                <option value="">Any origin city</option>
                {allCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-brand">Destination city</span>
              <select
                value={values.destination_city_id ?? ''}
                onChange={(event) => setValue('destination_city_id', event.target.value)}
                className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm text-brand outline-none"
              >
                <option value="">Any destination city</option>
                {allCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-brand">Vibes & Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => {
            const active = selectedTags.includes(tag.slug);
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => {
                  const next = active
                    ? selectedTags.filter((s) => s !== tag.slug)
                    : [...selectedTags, tag.slug];
                  setValue('tags', next);
                }}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : 'border-mint-200 bg-white text-accent hover:border-brand hover:text-brand'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-primary" type="button" onClick={onApply}>
          Apply filters
        </button>
        <button className="btn-soft" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  );
}
