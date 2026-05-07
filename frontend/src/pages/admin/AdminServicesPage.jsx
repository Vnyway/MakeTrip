import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createAdminService, deleteAdminService, listAdminServices, updateAdminService } from '../../features/admin/admin.api';
import { getErrorMessage } from '../../lib/errors';

function baseForm(kind = 'hotel') {
  return {
    title: '',
    description: '',
    country_id: 1,
    city_id: 1,
    price_usd: 0,
    status: 'active',
    kind,
    restaurant_cuisine: '',
    activity_kind: '',
    flight_origin_city_id: 1,
    flight_destination_city_id: 2,
  };
}

function toPayload(form) {
  const common = {
    title: form.title,
    description: form.description || null,
    country_id: Number(form.country_id),
    city_id: Number(form.city_id),
    price_usd: Number(form.price_usd),
    status: form.status,
    kind: form.kind,
  };
  if (form.kind === 'hotel') return { ...common, hotel: {} };
  if (form.kind === 'restaurant') return { ...common, restaurant: { cuisine: form.restaurant_cuisine || null } };
  if (form.kind === 'activity') return { ...common, activity: { activity_kind: form.activity_kind || 'general' } };
  return {
    ...common,
    flight: {
      origin_city_id: Number(form.flight_origin_city_id),
      destination_city_id: Number(form.flight_destination_city_id),
    },
  };
}

export function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(baseForm());
  const query = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: listAdminServices,
  });

  const createMutation = useMutation({
    mutationFn: createAdminService,
    onSuccess: async () => {
      toast.success('Service created.');
      setForm(baseForm(form.kind));
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create service.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateAdminService(id, body),
    onSuccess: async () => {
      toast.success('Service updated.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update service.')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminService,
    onSuccess: async () => {
      toast.success('Service deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete service.')),
  });

  const items = query.data || [];

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Services</h1>
      </header>

      <article className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
        <h2 className="text-lg font-semibold text-brand">Create Service</h2>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate(toPayload(form));
          }}
        >
          <input className="rounded border border-mint-200 px-2 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <select className="rounded border border-mint-200 px-2 py-2 text-sm" value={form.kind} onChange={(e) => setForm((p) => ({ ...baseForm(e.target.value), title: p.title }))}>
            <option value="hotel">hotel</option>
            <option value="restaurant">restaurant</option>
            <option value="activity">activity</option>
            <option value="flight">flight</option>
          </select>
          <input type="number" className="rounded border border-mint-200 px-2 py-2 text-sm" placeholder="Country id" value={form.country_id} onChange={(e) => setForm((p) => ({ ...p, country_id: e.target.value }))} />
          <input type="number" className="rounded border border-mint-200 px-2 py-2 text-sm" placeholder="City id" value={form.city_id} onChange={(e) => setForm((p) => ({ ...p, city_id: e.target.value }))} />
          <input type="number" className="rounded border border-mint-200 px-2 py-2 text-sm" placeholder="Price USD" value={form.price_usd} onChange={(e) => setForm((p) => ({ ...p, price_usd: e.target.value }))} />
          <select className="rounded border border-mint-200 px-2 py-2 text-sm" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="active">active</option>
            <option value="draft">draft</option>
            <option value="inactive">inactive</option>
          </select>
          {form.kind === 'restaurant' ? (
            <input className="rounded border border-mint-200 px-2 py-2 text-sm sm:col-span-2" placeholder="Cuisine" value={form.restaurant_cuisine} onChange={(e) => setForm((p) => ({ ...p, restaurant_cuisine: e.target.value }))} />
          ) : null}
          {form.kind === 'activity' ? (
            <input className="rounded border border-mint-200 px-2 py-2 text-sm sm:col-span-2" placeholder="Activity kind" value={form.activity_kind} onChange={(e) => setForm((p) => ({ ...p, activity_kind: e.target.value }))} />
          ) : null}
          {form.kind === 'flight' ? (
            <>
              <input type="number" className="rounded border border-mint-200 px-2 py-2 text-sm" placeholder="Origin city id" value={form.flight_origin_city_id} onChange={(e) => setForm((p) => ({ ...p, flight_origin_city_id: e.target.value }))} />
              <input type="number" className="rounded border border-mint-200 px-2 py-2 text-sm" placeholder="Destination city id" value={form.flight_destination_city_id} onChange={(e) => setForm((p) => ({ ...p, flight_destination_city_id: e.target.value }))} />
            </>
          ) : null}
          <textarea className="rounded border border-mint-200 px-2 py-2 text-sm sm:col-span-2 lg:col-span-4" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <button type="submit" className="btn-primary w-fit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </article>

      <div className="overflow-x-auto rounded-xl border border-mint-200 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-accent">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-mint-200">
                <td className="px-3 py-2 text-brand">{item.title}</td>
                <td className="px-3 py-2 text-accent">{item.kind}</td>
                <td className="px-3 py-2 text-accent">${Number(item.price_usd || 0).toFixed(0)}</td>
                <td className="px-3 py-2">
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateMutation.mutate({
                        id: item.id,
                        body: { status: event.target.value },
                      })
                    }
                    className="rounded-md border border-mint-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="inactive">inactive</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="btn-soft border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
