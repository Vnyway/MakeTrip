export function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  if (totalPages <= 1) {
    return null;
  }

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages = [];

  for (let p = windowStart; p <= windowEnd; p += 1) {
    pages.push(p);
  }

  return (
    <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Pagination">
      <button
        type="button"
        className="btn-soft"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Previous
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`rounded-md px-3 py-2 text-sm ${
            p === page ? 'bg-brand text-white' : 'btn-soft'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className="btn-soft"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Next
      </button>

      <span className="ml-2 text-sm text-accent">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
}
