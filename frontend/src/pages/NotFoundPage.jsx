import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="rounded-2xl border border-mint-200 bg-surface p-8 text-center shadow-card">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold text-brand">Page not found</h1>
      <p className="mt-3 text-accent">The page you are looking for does not exist in the current UI shell.</p>
      <Link className="btn-primary mt-6 inline-flex" to="/">
        Back to home
      </Link>
    </section>
  );
}
