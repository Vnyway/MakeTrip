import { SlidersHorizontal } from 'lucide-react';
import { SORT_OPTIONS, STATUS_OPTIONS } from '../../features/catalog/catalog.constants';

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
  return (
    <section className="space-y-4 rounded-xl border border-mint-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-brand">
        <SlidersHorizontal size={16} />
        <h2 className="text-sm font-semibold">Filters & Sorting</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        <Input label="Country ID" value={values.country_id} onChange={(v) => setValue('country_id', v)} type="number" />
        <Input label="City ID" value={values.city_id} onChange={(v) => setValue('city_id', v)} type="number" />
        <Input label="Min price" value={values.min_price_usd} onChange={(v) => setValue('min_price_usd', v)} type="number" />
        <Input label="Max price" value={values.max_price_usd} onChange={(v) => setValue('max_price_usd', v)} type="number" />

        {showCuisine ? <Input label="Cuisine" value={values.cuisine} onChange={(v) => setValue('cuisine', v)} /> : null}
        {showActivityKind ? (
          <Input label="Activity kind" value={values.activity_kind} onChange={(v) => setValue('activity_kind', v)} />
        ) : null}

        {showFlightFields ? (
          <>
            <Input
              label="Origin city ID"
              value={values.origin_city_id}
              onChange={(v) => setValue('origin_city_id', v)}
              type="number"
            />
            <Input
              label="Destination city ID"
              value={values.destination_city_id}
              onChange={(v) => setValue('destination_city_id', v)}
              type="number"
            />
          </>
        ) : null}
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
