import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/errors';
import { listAdminBookings, patchAdminBookingStatus } from '../../features/admin/admin.api';

const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];

export function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: listAdminBookings,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => patchAdminBookingStatus(id, status),
    onSuccess: async () => {
      toast.success('Booking status updated.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update booking status.')),
  });

  const items = query.data || [];

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Bookings</h1>
      </header>
      <div className="overflow-x-auto rounded-xl border border-mint-200 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-accent">
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Guests</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-mint-200">
                <td className="px-3 py-2 text-brand">{item.service_title}</td>
                <td className="px-3 py-2 text-accent">{item.user_email}</td>
                <td className="px-3 py-2 text-accent">
                  {item.start_date} - {item.end_date}
                </td>
                <td className="px-3 py-2 text-accent">{item.persons_count}</td>
                <td className="px-3 py-2 text-brand">${Number(item.total_price_usd || 0).toFixed(0)}</td>
                <td className="px-3 py-2">
                  <select
                    value={item.status}
                    onChange={(event) => mutation.mutate({ id: item.id, status: event.target.value })}
                    className="rounded-md border border-mint-200 bg-white px-2 py-1 text-xs"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
