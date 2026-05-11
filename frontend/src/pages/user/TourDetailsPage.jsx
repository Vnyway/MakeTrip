import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addTourItem, deleteTourItem, getTourDetails, updateTour, updateTourItem } from '../../features/tours/tours.api';
import { getErrorMessage } from '../../lib/errors';
import { ErrorState, LoadingState } from '../../components/ui/AsyncState';
import { MotionFade } from '../../components/ui/MotionFade';

function groupByDay(items) {
  const grouped = items.reduce((acc, item) => {
    const key = item.day_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => a.position - b.position);
  });

  return grouped;
}

export function TourDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [manualForm, setManualForm] = useState({
    service_id: '',
    day_number: 1,
    position: 0,
    quantity: 1,
    note: '',
  });
  const [editTourMode, setEditTourMode] = useState(false);
  const [tourEditForm, setTourEditForm] = useState({ title: '', notes: '' });

  const detailsQuery = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getTourDetails(id),
    enabled: Boolean(id),
  });

  const updateTourMutation = useMutation({
    mutationFn: (payload) => updateTour(id, payload),
    onSuccess: async () => {
      toast.success('Tour updated.');
      setEditTourMode(false);
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
      await queryClient.invalidateQueries({ queryKey: ['tour', id] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update tour.')),
  });

  const addItemMutation = useMutation({
    mutationFn: (payload) => addTourItem(id, payload),
    onSuccess: async () => {
      toast.success('Item added.');
      setManualForm({ service_id: '', day_number: 1, position: 0, quantity: 1, note: '' });
      await queryClient.invalidateQueries({ queryKey: ['tour', id] });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add item.')),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, body }) => updateTourItem(id, itemId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tour', id] });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update item.')),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => deleteTourItem(id, itemId),
    onSuccess: async () => {
      toast.success('Item removed.');
      await queryClient.invalidateQueries({ queryKey: ['tour', id] });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove item.')),
  });

  const groupedItems = useMemo(() => groupByDay(detailsQuery.data?.items || []), [detailsQuery.data?.items]);
  const dayNumbers = useMemo(() => Object.keys(groupedItems).map(Number).sort((a, b) => a - b), [groupedItems]);
  const allItems = detailsQuery.data?.items || [];
  const grandTotal = allItems.reduce(
    (acc, item) => acc + Number(item.service?.price_usd || 0) * Number(item.quantity || 1),
    0,
  );

  if (detailsQuery.isLoading) {
    return <LoadingState message="Loading tour..." />;
  }

  if (detailsQuery.error) {
    return <ErrorState message={getErrorMessage(detailsQuery.error, 'Failed to load tour.')} />;
  }

  const tour = detailsQuery.data?.tour;
  if (!tour) {
    return <div className="rounded-2xl border border-mint-200 bg-white p-6 text-sm text-accent shadow-card">Tour not found.</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/tours" className="text-sm text-accent hover:underline">
          Back to tours
        </Link>
        <Link to={`/tours/${id}/checkout`} className="btn-primary">
          Book all ({allItems.length})
        </Link>
      </div>

      <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
        {editTourMode ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateTourMutation.mutate({
                title: tourEditForm.title.trim(),
                notes: tourEditForm.notes.trim() || null,
              });
            }}
          >
            <input
              value={tourEditForm.title}
              onChange={(event) => setTourEditForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              required
            />
            <textarea
              value={tourEditForm.notes}
              onChange={(event) => setTourEditForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-20 w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={updateTourMutation.isPending}>
                Save
              </button>
              <button type="button" className="btn-soft" onClick={() => setEditTourMode(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-brand">{tour.title}</h1>
                <p className="mt-2 text-sm text-accent">
                  {tour.notes || 'No notes yet. Add services from catalog or service details using "Add to Tour".'}
                </p>
              </div>
              <button
                type="button"
                className="btn-soft"
                onClick={() => {
                  setEditTourMode(true);
                  setTourEditForm({ title: tour.title, notes: tour.notes || '' });
                }}
              >
                Edit tour
              </button>
            </div>
          </>
        )}
      </article>

      <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold text-brand">Add item manually</h2>
        <p className="mt-1 text-xs text-accent">
          Optional power-user form: paste a service id (same UUID as in the service URL). Available to you as the tour
          owner — not admin-only. Prefer adding from the catalog with &quot;Add to Tour&quot; when possible.
        </p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            addItemMutation.mutate({
              service_id: manualForm.service_id.trim(),
              day_number: Number(manualForm.day_number),
              position: Number(manualForm.position),
              quantity: Number(manualForm.quantity),
              note: manualForm.note || null,
            });
          }}
        >
          <label className="grid max-w-3xl gap-1">
            <span className="text-xs font-medium text-brand">Service id</span>
            <input
              value={manualForm.service_id}
              onChange={(event) => setManualForm((prev) => ({ ...prev, service_id: event.target.value }))}
              className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              placeholder="e.g. from /services/this-part-of-url"
              required
            />
          </label>

          <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-brand">Tour day</span>
              <input
                type="number"
                min={1}
                value={manualForm.day_number}
                onChange={(event) => setManualForm((prev) => ({ ...prev, day_number: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              />
              <span className="text-[11px] leading-snug text-accent">Which day block (1 = first day)</span>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-brand">Order in day</span>
              <input
                type="number"
                min={0}
                value={manualForm.position}
                onChange={(event) => setManualForm((prev) => ({ ...prev, position: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              />
              <span className="text-[11px] leading-snug text-accent">0 = first in that day</span>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-brand">Quantity</span>
              <input
                type="number"
                min={1}
                value={manualForm.quantity}
                onChange={(event) => setManualForm((prev) => ({ ...prev, quantity: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              />
              <span className="text-[11px] leading-snug text-accent">Multiplies list price</span>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-brand">Note (optional)</span>
            <textarea
              value={manualForm.note}
              onChange={(event) => setManualForm((prev) => ({ ...prev, note: event.target.value }))}
              className="min-h-20 w-full max-w-3xl rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              placeholder="Your reminder — not shown to guests, does not change price"
            />
          </label>

          <div className="flex justify-end border-t border-mint-100 pt-3">
            <button type="submit" className="btn-primary" disabled={addItemMutation.isPending}>
              {addItemMutation.isPending ? 'Adding...' : 'Add item'}
            </button>
          </div>
        </form>
      </article>

      {!dayNumbers.length ? (
        <div className="rounded-2xl border border-mint-200 bg-surface p-10 text-center">
          <p className="text-2xl text-brand">+</p>
          <p className="mt-2 text-sm text-accent">No activities added yet. Open catalog/services and use "Add to Tour".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayNumbers.map((day, idx) => {
            const items = groupedItems[day] || [];
            const dayTotal = items.reduce((acc, item) => acc + Number(item.service?.price_usd || 0) * Number(item.quantity || 1), 0);

            return (
              <MotionFade key={day} delay={Math.min(idx * 0.03, 0.18)}>
                <article className="rounded-2xl border border-mint-200 bg-white p-4 shadow-card">
                  <h2 className="text-xl font-semibold text-brand">Day {day}</h2>
                  <div className="mt-3 space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-mint-200 bg-surface p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-brand">{item.service?.title}</h3>
                          <p className="text-xs text-accent">{item.service?.description || 'No description'}</p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          aria-label="Remove this stop from the tour"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-accent">
                        <span className="font-medium text-brand">Tour day</span> — which day this stop belongs to. If
                        you change only this field, the server moves the stop to the <em>end</em> of that day&apos;s list
                        (next free order) so it never clashes with an existing slot.{' '}
                        <span className="font-medium text-brand">Order in day</span> — sort order inside that day; lower
                        numbers appear first. <span className="font-medium text-brand">Quantity</span> — how many units;
                        line total = service price × quantity.
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-brand">Tour day</span>
                          <input
                            type="number"
                            min={1}
                            value={item.day_number}
                            onChange={(event) =>
                              updateItemMutation.mutate({
                                itemId: item.id,
                                body: { day_number: Number(event.target.value) },
                              })
                            }
                            className="rounded-lg border border-mint-200 bg-white px-2 py-2 text-sm"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-brand">Order in day</span>
                          <input
                            type="number"
                            min={0}
                            value={item.position}
                            onChange={(event) =>
                              updateItemMutation.mutate({
                                itemId: item.id,
                                body: { position: Number(event.target.value) },
                              })
                            }
                            className="rounded-lg border border-mint-200 bg-white px-2 py-2 text-sm"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-brand">Quantity</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItemMutation.mutate({
                                itemId: item.id,
                                body: { quantity: Number(event.target.value) },
                              })
                            }
                            className="rounded-lg border border-mint-200 bg-white px-2 py-2 text-sm"
                          />
                        </label>
                        <div className="flex flex-col justify-end gap-1 rounded-lg border border-mint-100 bg-white px-3 py-2 sm:border-0 sm:bg-transparent sm:px-0">
                          <span className="text-xs font-medium text-brand">Line total</span>
                          <p className="text-lg font-semibold text-brand">
                            ${(Number(item.service?.price_usd || 0) * Number(item.quantity || 1)).toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <label className="mt-3 grid gap-1">
                        <span className="text-xs font-medium text-brand">Note (optional)</span>
                        <textarea
                          value={item.note || ''}
                          onChange={(event) =>
                            updateItemMutation.mutate({
                              itemId: item.id,
                              body: { note: event.target.value || null },
                            })
                          }
                          className="min-h-16 w-full rounded-lg border border-mint-200 bg-white px-3 py-2 text-sm"
                          placeholder="Private reminder — e.g. “book window seat”. Does not change price."
                        />
                      </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-mint-100 px-3 py-2 text-right text-lg font-semibold text-brand">
                    Day {day} total: ${dayTotal.toFixed(0)}
                  </div>
                </article>
              </MotionFade>
            );
          })}
        </div>
      )}

      <article className="rounded-2xl border border-mint-200 bg-mint-100 p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-accent">Total Duration</p>
            <p className="text-2xl font-semibold text-brand">{dayNumbers.length} days</p>
          </div>
          <div>
            <p className="text-xs text-accent">Total Items</p>
            <p className="text-2xl font-semibold text-brand">{allItems.length}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-accent">Grand Total</p>
            <p className="text-3xl font-semibold text-brand">${grandTotal.toFixed(0)}</p>
          </div>
        </div>
        <Link to={`/tours/${id}/checkout`} className="btn-primary mt-3 flex w-full justify-center">
          Proceed to checkout
        </Link>
      </article>
    </section>
  );
}
