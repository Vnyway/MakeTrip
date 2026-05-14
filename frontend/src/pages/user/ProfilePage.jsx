import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '../../lib/errors';
import { getProfile } from '../../features/profile/profile.api';

export function ProfilePage() {
  const query = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  if (query.isLoading) {
    return <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Loading profile...</div>;
  }

  if (query.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-sm text-red-600 shadow-card">
        {getErrorMessage(query.error, 'Failed to load profile.')}
      </div>
    );
  }

  const user = query.data?.user;
  const summary = query.data?.activity_summary || {};

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Profile</h1>
        <p className="mt-2 text-sm text-accent">Your activity summary and account details.</p>
      </header>

      <article className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h2 className="text-xl font-semibold text-brand">Basic Information</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-accent">Email</p>
            <p className="font-medium text-brand">{user?.email || '-'}</p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-accent">Status</p>
            <p className="font-medium capitalize text-brand">{user?.status || '-'}</p>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h2 className="text-xl font-semibold text-brand">Activity Summary</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-accent">Favorites</p>
            <p className="text-2xl font-semibold text-brand">{summary.favorites_count ?? 0}</p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-accent">Bookings</p>
            <p className="text-2xl font-semibold text-brand">{summary.bookings_count ?? 0}</p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-accent">Reviews</p>
            <p className="text-2xl font-semibold text-brand">{summary.reviews_count ?? 0}</p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-accent">Interactions (30d)</p>
            <p className="text-2xl font-semibold text-brand">{summary.interactions_last_30_days ?? 0}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
