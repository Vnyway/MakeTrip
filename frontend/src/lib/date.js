/**
 * Format a date value as "05 May 26".
 * Accepts ISO strings, Date objects, or any value parseable by `new Date()`.
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

/**
 * Format a time string "HH:MM:SS" or "HH:MM" as "HH:MM".
 */
export function formatTime(value) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}
