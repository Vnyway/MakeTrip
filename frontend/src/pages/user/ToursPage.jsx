import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, Pencil, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { createTour, deleteTour, listTours, updateTour } from '../../features/tours/tours.api';
import { getErrorMessage } from '../../lib/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/AsyncState';
import { MotionFade } from '../../components/ui/MotionFade';

export function ToursPage() {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState({ title: '', notes: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState({ title: '', notes: '' });

  const toursQuery = useQuery({
    queryKey: ['tours'],
    queryFn: listTours,
  });

  const createMutation = useMutation({
    mutationFn: createTour,
    onSuccess: async () => {
      toast.success('Tour created.');
      setCreateForm({ title: '', notes: '' });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create tour.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateTour(id, body),
    onSuccess: async () => {
      toast.success('Tour updated.');
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update tour.')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTour,
    onSuccess: async () => {
      toast.success('Tour deleted.');
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete tour.')),
  });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-brand">Tour Constructor</h1>
        <p className="mt-1 text-sm text-accent">
          Create your tours here, then add services from catalog cards or service details.
        </p>
      </header>

      <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold text-brand">Create New Tour</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate({
              title: createForm.title.trim(),
              notes: createForm.notes.trim() || null,
            });
          }}
        >
          <input
            value={createForm.title}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
            placeholder="Tour title"
            required
          />
          <textarea
            value={createForm.notes}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="min-h-24 w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
            placeholder="Notes (optional)"
          />
          <button type="submit" className="btn-primary inline-flex items-center gap-1" disabled={createMutation.isPending}>
            <Plus size={14} />
            {createMutation.isPending ? 'Creating...' : 'Create tour'}
          </button>
        </form>
      </article>

      {toursQuery.isLoading ? (
        <LoadingState message="Loading tours..." />
      ) : toursQuery.error ? (
        <ErrorState message={getErrorMessage(toursQuery.error, 'Failed to load tours.')} />
      ) : !(toursQuery.data || []).length ? (
        <EmptyState
          title="No tours yet"
          description="Create your first tour and start adding services from catalog pages."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(toursQuery.data || []).map((tour, idx) => {
            const isEditing = editingId === tour.id;

            return (
              <MotionFade key={tour.id} delay={Math.min(idx * 0.03, 0.18)}>
                <article className="rounded-2xl border border-mint-200 bg-white p-4 shadow-card">
                  {isEditing ? (
                  <form
                    className="space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateMutation.mutate({
                        id: tour.id,
                        body: {
                          title: editingForm.title.trim(),
                          notes: editingForm.notes.trim() || null,
                        },
                      });
                    }}
                  >
                    <input
                      value={editingForm.title}
                      onChange={(event) => setEditingForm((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                      required
                    />
                    <textarea
                      value={editingForm.notes}
                      onChange={(event) => setEditingForm((prev) => ({ ...prev, notes: event.target.value }))}
                      className="min-h-20 w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
                        Save
                      </button>
                      <button type="button" className="btn-soft" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                  ) : (
                  <>
                    <h3 className="text-xl font-semibold text-brand">{tour.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-accent">{tour.notes || 'No notes yet.'}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-accent">
                      <CalendarDays size={12} />
                      Updated: {new Date(tour.updated_at).toLocaleDateString()}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link to={`/tours/${tour.id}`} className="btn-primary">
                        Open constructor
                      </Link>
                      <button
                        type="button"
                        className="btn-soft inline-flex items-center gap-1"
                        onClick={() => {
                          setEditingId(tour.id);
                          setEditingForm({ title: tour.title, notes: tour.notes || '' });
                        }}
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-soft inline-flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(tour.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </>
                  )}
                </article>
              </MotionFade>
            );
          })}
        </div>
      )}
    </section>
  );
}
