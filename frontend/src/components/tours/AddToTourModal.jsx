import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/errors';
import { addTourItem, listTours } from '../../features/tours/tours.api';

function dateToDayNumber(startDate, chosenDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const chosen = new Date(`${chosenDate}T00:00:00`);
  const diff = Math.round((chosen - start) / 86400000);
  return diff + 1;
}

const SEAT_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

export function AddToTourModal({ service, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tourId: '',
    chosen_date: '',
    checkout_date: '',
    day_number: 1,
    end_day_number: '',
    scheduled_time: '',
    seat_class: 'economy',
    quantity: 1,
    note: '',
  });

  const kind = service?.kind;

  const toursQuery = useQuery({
    queryKey: ['tours'],
    queryFn: listTours,
    enabled: open,
  });

  const selectedTour = useMemo(
    () => (toursQuery.data || []).find((t) => t.id === form.tourId) ?? null,
    [toursQuery.data, form.tourId],
  );
  const tourStartDate = selectedTour?.start_date ? String(selectedTour.start_date).slice(0, 10) : null;

  const addMutation = useMutation({
    mutationFn: async (payload) => addTourItem(payload.tourId, payload.body),
    onSuccess: async (_, variables) => {
      toast.success('Added to tour.');
      onClose();
      setForm({ tourId: '', chosen_date: '', checkout_date: '', day_number: 1, end_day_number: '', scheduled_time: '', seat_class: 'economy', quantity: 1, note: '' });
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
      await queryClient.invalidateQueries({ queryKey: ['tour', variables.tourId] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add item to tour.')),
  });

  if (!open || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand/35 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
        <div className="flex items-start justify-between border-b border-mint-200 p-5">
          <div>
            <h3 className="text-2xl font-semibold text-brand">Add to Tour</h3>
            <p className="text-sm text-accent">{service.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-accent hover:bg-mint-100"
          >
            <X size={16} />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.tourId) { toast.error('Select a tour first.'); return; }

            // Resolve day_number from date picker or manual input
            let dayNum;
            if (tourStartDate && form.chosen_date) {
              dayNum = dateToDayNumber(tourStartDate, form.chosen_date);
              if (dayNum < 1) { toast.error('Date must be on or after tour start date.'); return; }
            } else {
              dayNum = Number(form.day_number);
            }

            const body = {
              service_id: service.id,
              day_number: dayNum,
              quantity: Number(form.quantity),
              note: form.note || null,
            };

            if (kind === 'hotel') {
              let endDay;
              if (tourStartDate && form.checkout_date) {
                endDay = dateToDayNumber(tourStartDate, form.checkout_date);
              } else if (form.end_day_number) {
                endDay = Number(form.end_day_number);
              }
              if (endDay) {
                if (endDay <= dayNum) { toast.error('Check-out must be after check-in.'); return; }
                body.end_day_number = endDay;
              }
            }

            if ((kind === 'restaurant' || kind === 'activity' || kind === 'flight') && form.scheduled_time) {
              body.scheduled_time = form.scheduled_time;
            }

            addMutation.mutate({ tourId: form.tourId, body });
          }}
        >
          {/* Tour selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand" htmlFor="tourSelect">Tour</label>
            <select
              id="tourSelect"
              value={form.tourId}
              onChange={(e) => setForm((p) => ({ ...p, tourId: e.target.value }))}
              className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
            >
              <option value="">Select tour</option>
              {(toursQuery.data || []).map((tour) => (
                <option key={tour.id} value={tour.id}>{tour.title}</option>
              ))}
            </select>
          </div>

          {/* Date/day fields — type-specific */}
          {kind === 'hotel' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-accent" htmlFor="tiCheckin">
                  {tourStartDate ? 'Check-in Date' : 'Check-in Day #'}
                </label>
                {tourStartDate ? (
                  <input id="tiCheckin" type="date" required min={tourStartDate}
                    value={form.chosen_date}
                    onChange={(e) => setForm((p) => ({ ...p, chosen_date: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                ) : (
                  <input id="tiCheckin" type="number" min={1}
                    value={form.day_number}
                    onChange={(e) => setForm((p) => ({ ...p, day_number: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-accent" htmlFor="tiCheckout">
                  {tourStartDate ? 'Check-out Date' : 'Check-out Day #'}
                </label>
                {tourStartDate ? (
                  <input id="tiCheckout" type="date" min={form.chosen_date || tourStartDate}
                    value={form.checkout_date}
                    onChange={(e) => setForm((p) => ({ ...p, checkout_date: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                ) : (
                  <input id="tiCheckout" type="number" min={1} placeholder="e.g. 3"
                    value={form.end_day_number}
                    onChange={(e) => setForm((p) => ({ ...p, end_day_number: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                )}
              </div>
            </div>
          )}

          {(kind === 'restaurant' || kind === 'activity') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-accent" htmlFor="tiDate">
                  {tourStartDate ? 'Date' : 'Day #'}
                </label>
                {tourStartDate ? (
                  <input id="tiDate" type="date" required min={tourStartDate}
                    value={form.chosen_date}
                    onChange={(e) => setForm((p) => ({ ...p, chosen_date: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                ) : (
                  <input id="tiDate" type="number" min={1}
                    value={form.day_number}
                    onChange={(e) => setForm((p) => ({ ...p, day_number: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-accent" htmlFor="tiTime">Time</label>
                <input id="tiTime" type="time"
                  value={form.scheduled_time}
                  onChange={(e) => setForm((p) => ({ ...p, scheduled_time: e.target.value }))}
                  className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                />
              </div>
            </div>
          )}

          {kind === 'flight' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-accent" htmlFor="tiDepDate">
                    {tourStartDate ? 'Departure Date' : 'Day #'}
                  </label>
                  {tourStartDate ? (
                    <input id="tiDepDate" type="date" required min={tourStartDate}
                      value={form.chosen_date}
                      onChange={(e) => setForm((p) => ({ ...p, chosen_date: e.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                    />
                  ) : (
                    <input id="tiDepDate" type="number" min={1}
                      value={form.day_number}
                      onChange={(e) => setForm((p) => ({ ...p, day_number: e.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-accent" htmlFor="tiFlightTime">Departure Time</label>
                  <input id="tiFlightTime" type="time"
                    value={form.scheduled_time}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_time: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-accent">Seat Class</label>
                <div className="flex gap-2">
                  {SEAT_CLASSES.map((sc) => (
                    <button key={sc.value} type="button"
                      onClick={() => setForm((p) => ({ ...p, seat_class: sc.value }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        form.seat_class === sc.value
                          ? 'border-brand bg-brand text-white'
                          : 'border-mint-200 bg-surface text-brand hover:border-brand'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {!kind && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-accent" htmlFor="tiDayFb">
                  {tourStartDate ? 'Date' : 'Day #'}
                </label>
                {tourStartDate ? (
                  <input id="tiDayFb" type="date" min={tourStartDate}
                    value={form.chosen_date}
                    onChange={(e) => setForm((p) => ({ ...p, chosen_date: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                ) : (
                  <input id="tiDayFb" type="number" min={1}
                    value={form.day_number}
                    onChange={(e) => setForm((p) => ({ ...p, day_number: e.target.value }))}
                    className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-accent" htmlFor="tiQty">Quantity</label>
                <input id="tiQty" type="number" min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-brand" htmlFor="tourNote">Note</label>
            <textarea
              id="tourNote"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="min-h-20 w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
              placeholder="Optional note"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" className="btn-soft" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add to Tour'}
            </button>
          </div>

          {!toursQuery.isLoading && !(toursQuery.data || []).length && (
            <p className="text-xs text-accent">No tours found. Create a tour first on the Tours page.</p>
          )}
        </form>
      </div>
    </div>
  );
}
