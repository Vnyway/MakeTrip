import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard } from '../../features/admin/admin.api';

function StatCard({ label, value }) {
  return (
    <article className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
      <p className="text-xs text-accent">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-brand">{value}</p>
    </article>
  );
}

function PlaceholderChart({ title, rows }) {
  return (
    <article className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
      <h3 className="text-lg font-semibold text-brand">{title}</h3>
      <div className="mt-3 space-y-2">
        {(rows || []).length ? (
          rows.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm">
              <span className="text-accent">{row.day || row.kind || 'value'}</span>
              <span className="font-medium text-brand">{row.count}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-accent">No data yet.</p>
        )}
      </div>
    </article>
  );
}

export function AdminPage() {
  const query = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getAdminDashboard,
  });

  const kpis = query.data?.kpis || {};
  const charts = query.data?.charts || {};

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-accent">Overview of platform activity and operational metrics.</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Services" value={kpis.services_count ?? 0} />
        <StatCard label="Total Bookings" value={kpis.bookings_count ?? 0} />
        <StatCard label="Total Reviews" value={kpis.reviews_count ?? 0} />
        <StatCard label="Active Users (30d)" value={kpis.active_users_30d ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PlaceholderChart title="Bookings Trend (7d)" rows={charts.bookings_trend_7d} />
        <PlaceholderChart title="Services by Kind" rows={charts.services_by_kind} />
      </div>
    </section>
  );
}
