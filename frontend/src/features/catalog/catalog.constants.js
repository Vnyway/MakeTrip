export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended (CF)' },
  { value: 'created_at desc', label: 'Newest first' },
  { value: 'created_at asc', label: 'Oldest first' },
  { value: 'price_usd asc', label: 'Price: low to high' },
  { value: 'price_usd desc', label: 'Price: high to low' },
];

export const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

export const DEFAULT_LIMIT = 8;

export function getKindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}
