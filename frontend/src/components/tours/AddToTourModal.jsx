import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/errors';
import { addTourItem, listTours } from '../../features/tours/tours.api';

export function AddToTourModal({ service, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tourId: '',
    day_number: 1,
    position: 0,
    quantity: 1,
    note: '',
  });

  const toursQuery = useQuery({
    queryKey: ['tours'],
    queryFn: listTours,
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (payload) => addTourItem(payload.tourId, payload.body),
    onSuccess: async (_, variables) => {
      toast.success('Added to tour.');
      onClose();
      setForm({ tourId: '', day_number: 1, position: 0, quantity: 1, note: '' });
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
            if (!form.tourId) {
              toast.error('Select a tour first.');
              return;
            }

            addMutation.mutate({
              tourId: form.tourId,
              body: {
                service_id: service.id,
                day_number: Number(form.day_number),
                position: Number(form.position),
                quantity: Number(form.quantity),
                note: form.note || null,
              },
            });
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-brand" htmlFor="tourSelect">
              Tour
            </label>
            <select
              id="tourSelect"
              value={form.tourId}
              onChange={(event) => setForm((prev) => ({ ...prev, tourId: event.target.value }))}
              className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
            >
              <option value="">Select tour</option>
              {(toursQuery.data || []).map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs text-accent" htmlFor="tourDay">
                Day
              </label>
              <input
                id="tourDay"
                type="number"
                min={1}
                value={form.day_number}
                onChange={(event) => setForm((prev) => ({ ...prev, day_number: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-accent" htmlFor="tourPosition">
                Position
              </label>
              <input
                id="tourPosition"
                type="number"
                min={0}
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-accent" htmlFor="tourQty">
                Quantity
              </label>
              <input
                id="tourQty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand" htmlFor="tourNote">
              Note
            </label>
            <textarea
              id="tourNote"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              className="min-h-24 w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
              placeholder="Optional note"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" className="btn-soft" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add to Tour'}
            </button>
          </div>

          {!toursQuery.isLoading && !(toursQuery.data || []).length ? (
            <p className="text-xs text-accent">No tours found. Create a tour first on the Tours page.</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

