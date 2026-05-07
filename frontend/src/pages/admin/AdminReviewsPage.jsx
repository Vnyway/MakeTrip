import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { deleteAdminReview, listAdminReviews } from '../../features/admin/admin.api';
import { getErrorMessage } from '../../lib/errors';

export function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: listAdminReviews,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminReview,
    onSuccess: async () => {
      toast.success('Review deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete review.')),
  });

  const items = query.data || [];

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Reviews</h1>
      </header>

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-brand">{item.service_title}</h3>
                <p className="text-xs text-accent">{item.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">Rating: {item.rating}/5</span>
                <button
                  type="button"
                  className="btn-soft border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-accent">{item.comment || 'No comment.'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
