import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/errors';
import { getProfile, updatePreferences } from '../../features/profile/profile.api';

const vacationTypeOptions = ['relax', 'adventure', 'cultural', 'family', 'business'];
const kindOptions = ['hotel', 'restaurant', 'activity', 'flight'];

export function ProfilePage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const [form, setForm] = useState({
    vacation_type: '',
    budget_max_usd: '',
    preferred_kind: '',
    preferred_activity_kind: '',
  });

  useEffect(() => {
    if (!query.data?.preferences) return;
    const p = query.data.preferences;
    setForm({
      vacation_type: p.vacation_type || '',
      budget_max_usd: p.budget_max_usd ?? '',
      preferred_kind: p.preferred_kind || '',
      preferred_activity_kind: p.preferred_activity_kind || '',
    });
  }, [query.data?.preferences]);

  const mutation = useMutation({
    mutationFn: (payload) => updatePreferences(payload),
    onSuccess: async () => {
      toast.success('Preferences updated.');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save preferences.')),
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
        <p className="mt-2 text-sm text-accent">Manage your travel preferences and review activity summary.</p>
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
        <h2 className="text-xl font-semibold text-brand">Preferences</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              vacation_type: form.vacation_type || undefined,
              budget_max_usd: form.budget_max_usd === '' ? undefined : Number(form.budget_max_usd),
              preferred_kind: form.preferred_kind || undefined,
              preferred_activity_kind: form.preferred_activity_kind || undefined,
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand" htmlFor="vacationType">
                Vacation Type
              </label>
              <select
                id="vacationType"
                value={form.vacation_type}
                onChange={(event) => setForm((prev) => ({ ...prev, vacation_type: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              >
                <option value="">Not selected</option>
                {vacationTypeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand" htmlFor="budgetMax">
                Budget Max (USD)
              </label>
              <input
                id="budgetMax"
                type="number"
                min={1}
                value={form.budget_max_usd}
                onChange={(event) => setForm((prev) => ({ ...prev, budget_max_usd: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                placeholder="e.g. 500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand" htmlFor="preferredKind">
                Preferred Service Kind
              </label>
              <select
                id="preferredKind"
                value={form.preferred_kind}
                onChange={(event) => setForm((prev) => ({ ...prev, preferred_kind: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              >
                <option value="">Not selected</option>
                {kindOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand" htmlFor="preferredActivityKind">
                Preferred Activity Kind
              </label>
              <input
                id="preferredActivityKind"
                value={form.preferred_activity_kind}
                onChange={(event) => setForm((prev) => ({ ...prev, preferred_activity_kind: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                placeholder="e.g. museum, hiking, wellness"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save preferences'}
          </button>
        </form>
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
