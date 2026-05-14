import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Trash2, MapPin, ChevronRight, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { addTourItem, deleteTourItem, getTourDetails, updateTour, updateTourItem } from '../../features/tours/tours.api';
import { getErrorMessage } from '../../lib/errors';
import { ErrorState, LoadingState } from '../../components/ui/AsyncState';
import { MotionFade } from '../../components/ui/MotionFade';
import { CatalogCoverImage } from '../../components/catalog/ServiceCard';
import { useGeoDictionaries } from '../../features/geo/useGeoDictionaries';
import { formatDate, formatTime } from '../../lib/date';

function kindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}

/** Returns ISO date string (YYYY-MM-DD) for tour day N given start_date */
function dayToDate(startDate, dayNumber) {
  if (!startDate) return null;
  const d = new Date(`${startDate}T00:00:00`);
  d.setDate(d.getDate() + dayNumber - 1);
  return d.toISOString().slice(0, 10);
}

/** Returns day_number given start_date and a chosen date string */
function dateToDayNumber(startDate, chosenDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const chosen = new Date(`${chosenDate}T00:00:00`);
  const diff = Math.round((chosen - start) / 86400000);
  return diff + 1;
}

function TourItineraryItemCard({ item, tourStartDate, updateItemMutation, deleteItemMutation, geo }) {
  const service = item.service;
  const kind = service?.kind;
  const lineTotal = (Number(service?.price_usd || 0) * Number(item.quantity || 1)).toFixed(0);

  const itemDate = dayToDate(tourStartDate, item.day_number);
  const checkoutDate = item.end_day_number ? dayToDate(tourStartDate, item.end_day_number) : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
      <div className="grid gap-0 md:grid-cols-[120px_1fr_168px]">
        <div className="relative h-32 overflow-hidden border-b border-mint-200 md:h-auto md:min-h-[7.5rem] md:border-b-0 md:border-r md:border-mint-200">
          <CatalogCoverImage url={service?.cover_image_url} heightClass="h-full min-h-[8rem] w-full md:min-h-full" />
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-semibold text-brand">
              {kindLabel(kind)}
            </span>
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 md:hidden"
              onClick={() => deleteItemMutation.mutate(item.id)}
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold leading-snug text-brand">{service?.title}</h3>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
              <MapPin size={12} />
              {geo.getCountryName(service?.country_id)}, {geo.getCityName(service?.city_id)}
            </p>
            {service?.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-accent">{service.description}</p>
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-mint-100 pt-3 text-xs sm:grid-cols-2">

            {/* Date / check-in */}
            <label className="grid gap-1">
              <span className="font-medium text-brand">
                {kind === 'hotel' ? 'Check-in Date' : kind === 'flight' ? 'Departure Date' : 'Date'}
              </span>
              {tourStartDate ? (
                <input
                  type="date"
                  value={itemDate || ''}
                  min={tourStartDate}
                  onChange={(e) => {
                    const newDay = dateToDayNumber(tourStartDate, e.target.value);
                    if (newDay >= 1) {
                      updateItemMutation.mutate({ itemId: item.id, body: { day_number: newDay } });
                    }
                  }}
                  className="w-full rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm"
                />
              ) : (
                <span className="rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm text-accent">
                  Day {item.day_number} — set tour start date to see real dates
                </span>
              )}
            </label>

            {/* Time */}
            {(kind === 'restaurant' || kind === 'activity' || kind === 'flight') && (
              <label className="grid gap-1">
                <span className="font-medium text-brand">
                  {kind === 'flight' ? 'Departure Time' : 'Time'}
                </span>
                <input
                  type="time"
                  value={item.scheduled_time ? String(item.scheduled_time).slice(0, 5) : ''}
                  onChange={(e) =>
                    updateItemMutation.mutate({ itemId: item.id, body: { scheduled_time: e.target.value || null } })
                  }
                  className="w-full rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm"
                />
              </label>
            )}

            {/* Hotel: check-out date */}
            {kind === 'hotel' && (
              <label className="grid gap-1">
                <span className="font-medium text-brand">Check-out Date</span>
                {tourStartDate ? (
                  <input
                    type="date"
                    value={checkoutDate || ''}
                    min={itemDate || tourStartDate}
                    onChange={(e) => {
                      const newEndDay = dateToDayNumber(tourStartDate, e.target.value);
                      if (newEndDay > item.day_number) {
                        updateItemMutation.mutate({ itemId: item.id, body: { end_day_number: newEndDay } });
                      } else {
                        toast.error('Check-out must be after check-in.');
                      }
                    }}
                    className="w-full rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm"
                  />
                ) : (
                  <span className="rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm text-accent">
                    {item.end_day_number ? `Day ${item.end_day_number}` : '—'}
                  </span>
                )}
              </label>
            )}

            {/* Qty */}
            <label className="grid gap-1">
              <span className="font-medium text-brand">Quantity</span>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  updateItemMutation.mutate({ itemId: item.id, body: { quantity: Number(e.target.value) } })
                }
                className="w-full rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="grid gap-1 text-xs">
            <span className="font-medium text-brand">Note (optional)</span>
            <textarea
              value={item.note || ''}
              onChange={(e) =>
                updateItemMutation.mutate({ itemId: item.id, body: { note: e.target.value || null } })
              }
              rows={2}
              className="w-full resize-y rounded-md border border-mint-200 bg-surface px-2 py-1.5 text-sm"
              placeholder="Private reminder"
            />
          </label>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-mint-200 p-4 md:border-l md:border-t-0">
          <div className="text-right">
            <p className="text-xs text-accent">Line total</p>
            <p className="text-2xl font-semibold text-brand">${lineTotal}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              to={`/services/${service?.id}`}
              className="btn-soft flex items-center justify-center gap-1 px-2 py-2 text-xs"
            >
              View service <ChevronRight size={14} />
            </Link>
            <button
              type="button"
              className="btn-soft hidden items-center justify-center gap-1 border-red-200 text-red-600 hover:bg-red-50 md:inline-flex"
              onClick={() => deleteItemMutation.mutate(item.id)}
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function groupByDay(items) {
  const grouped = items.reduce((acc, item) => {
    const key = item.day_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => {
      const ta = a.scheduled_time || '99:99';
      const tb = b.scheduled_time || '99:99';
      return ta.localeCompare(tb);
    });
  });

  return grouped;
}

export function TourDetailsPage() {
  const { id } = useParams();
  const geo = useGeoDictionaries();
  const queryClient = useQueryClient();
  const [editTourMode, setEditTourMode] = useState(false);
  const [tourEditForm, setTourEditForm] = useState({ title: '', notes: '', start_date: '' });

  const detailsQuery = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getTourDetails(id),
    enabled: Boolean(id),
  });

  const tour = detailsQuery.data?.tour;
  const tourStartDate = tour?.start_date ? String(tour.start_date).slice(0, 10) : null;

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

  if (detailsQuery.isLoading) return <LoadingState message="Loading tour..." />;
  if (detailsQuery.error) return <ErrorState message={getErrorMessage(detailsQuery.error, 'Failed to load tour.')} />;
  if (!tour) return <div className="rounded-2xl border border-mint-200 bg-white p-6 text-sm text-accent shadow-card">Tour not found.</div>;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/tours" className="text-sm text-accent hover:underline">Back to tours</Link>
        <Link to={`/tours/${id}/checkout`} className="btn-primary">
          Book all ({allItems.length})
        </Link>
      </div>

      {/* Tour header */}
      <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
        {editTourMode ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateTourMutation.mutate({
                title: tourEditForm.title.trim(),
                notes: tourEditForm.notes.trim() || null,
                start_date: tourEditForm.start_date || null,
              });
            }}
          >
            <label className="grid gap-1">
              <span className="text-xs font-medium text-brand">Title</span>
              <input
                value={tourEditForm.title}
                onChange={(e) => setTourEditForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-brand">Start Date</span>
              <input
                type="date"
                value={tourEditForm.start_date}
                onChange={(e) => setTourEditForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-brand">Notes</span>
              <textarea
                value={tourEditForm.notes}
                onChange={(e) => setTourEditForm((p) => ({ ...p, notes: e.target.value }))}
                className="min-h-16 w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={updateTourMutation.isPending}>Save</button>
              <button type="button" className="btn-soft" onClick={() => setEditTourMode(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-brand">{tour.title}</h1>
              {tourStartDate ? (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
                  <CalendarDays size={14} />
                  Starts {formatDate(tourStartDate)}
                </p>
              ) : (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-amber-600">
                  <CalendarDays size={14} />
                  No start date — click &quot;Edit tour&quot; to set one and see real dates
                </p>
              )}
              {tour.notes && <p className="mt-2 text-sm text-accent">{tour.notes}</p>}
            </div>
            <button
              type="button"
              className="btn-soft"
              onClick={() => {
                setEditTourMode(true);
                setTourEditForm({ title: tour.title, notes: tour.notes || '', start_date: tourStartDate || '' });
              }}
            >
              Edit tour
            </button>
          </div>
        )}
      </article>

      {/* Itinerary */}
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
            const dayDate = dayToDate(tourStartDate, day);

            return (
              <MotionFade key={day} delay={Math.min(idx * 0.03, 0.18)}>
                <article className="rounded-2xl border border-mint-200 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-xl font-semibold text-brand">
                      {dayDate ? formatDate(dayDate) : `Day ${day}`}
                    </h2>
                    {dayDate && (
                      <span className="text-sm text-accent">Day {day}</span>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    {items.map((item) => (
                      <TourItineraryItemCard
                        key={item.id}
                        item={item}
                        tourStartDate={tourStartDate}
                        geo={geo}
                        updateItemMutation={updateItemMutation}
                        deleteItemMutation={deleteItemMutation}
                      />
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg bg-mint-100 px-3 py-2 text-right text-lg font-semibold text-brand">
                    {dayDate ? formatDate(dayDate) : `Day ${day}`} total: ${dayTotal.toFixed(0)}
                  </div>
                </article>
              </MotionFade>
            );
          })}
        </div>
      )}

      {/* Grand total */}
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
