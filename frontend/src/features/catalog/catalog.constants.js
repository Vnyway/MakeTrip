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

export const TAGS = [
  { slug: 'relaxation',  label: 'Relaxation' },
  { slug: 'adventure',   label: 'Adventure' },
  { slug: 'romantic',    label: 'Romantic' },
  { slug: 'family',      label: 'Family' },
  { slug: 'cultural',    label: 'Cultural' },
  { slug: 'beach',       label: 'Beach & Sea' },
  { slug: 'mountains',   label: 'Mountains' },
  { slug: 'city',        label: 'City' },
  { slug: 'nature',      label: 'Nature' },
  { slug: 'islands',     label: 'Islands' },
  { slug: 'sightseeing', label: 'Sightseeing' },
  { slug: 'wellness',    label: 'Wellness & Spa' },
  { slug: 'active',      label: 'Active Sports' },
  { slug: 'gastronomy',  label: 'Gastronomy' },
  { slug: 'nightlife',   label: 'Nightlife' },
  { slug: 'shopping',    label: 'Shopping' },
];

export function getTagLabel(slug) {
  return TAGS.find((t) => t.slug === slug)?.label ?? slug;
}

export function getKindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}
