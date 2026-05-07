import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, CircleX, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTourDetails } from '../../features/tours/tours.api';
import { createBooking } from '../../features/bookings/bookings.api';
import { getErrorMessage } from '../../lib/errors';

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base, days) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function TourCheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [form, setForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardholder: '',
  });

  const tourQuery = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getTourDetails(id),
    enabled: Boolean(id),
  });

  const items = tourQuery.data?.items || [];
  const total = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.service?.price_usd || 0) * Number(item.quantity || 1), 0),
    [items],
  );

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (simulateFailure) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        throw new Error('Simulated payment failure.');
      }

      const base = new Date();
      for (const item of items) {
        const date = addDays(base, Number(item.day_number || 1) - 1);
        await createBooking({
          service_id: item.service_id,
          start_date: toDateString(date),
          end_date: toDateString(date),
          persons_count: Math.max(1, Number(item.quantity || 1)),
          total_price_usd: Number(item.service?.price_usd || 0) * Number(item.quantity || 1),
          status: 'confirmed',
        });
      }
    },
    onSuccess: async () => {
      setStep(4);
      await queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      toast.success('Payment successful. Bookings created.');
    },
    onError: (error) => {
      setStep(4);
      toast.error(getErrorMessage(error, 'Payment failed. Please try again.'));
    },
  });

  if (tourQuery.isLoading) {
    return <div className="rounded-2xl border border-mint-200 bg-white p-6 text-sm text-accent shadow-card">Loading checkout...</div>;
  }

  if (tourQuery.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 shadow-card">
        {getErrorMessage(tourQuery.error, 'Failed to load tour checkout.')}
      </div>
    );
  }

  const isSuccess = step === 4 && !checkoutMutation.isError;
  const isFailure = step === 4 && checkoutMutation.isError;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to={`/tours/${id}`} className="text-sm text-accent hover:underline">
          Back to constructor
        </Link>
        <p className="text-xs text-accent">Step {step} / 4</p>
      </div>

      {step === 1 ? (
        <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
          <h1 className="text-2xl font-semibold text-brand">Review Tour Items</h1>
          {!items.length ? (
            <p className="mt-3 text-sm text-accent">No items in this tour yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-mint-200 bg-surface p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand">
                      Day {item.day_number}: {item.service?.title}
                    </p>
                    <p className="font-semibold text-brand">
                      ${(Number(item.service?.price_usd || 0) * Number(item.quantity || 1)).toFixed(0)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-accent">Qty: {item.quantity} | Position: {item.position}</p>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-mint-100 px-3 py-2">
                <span className="text-sm text-accent">Grand Total</span>
                <span className="text-2xl font-semibold text-brand">${total.toFixed(0)}</span>
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn-primary" disabled={!items.length} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </article>
      ) : null}

      {step === 2 ? (
        <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
          <h2 className="text-2xl font-semibold text-brand">Payment Method</h2>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`w-full rounded-lg border px-4 py-3 text-left ${paymentMethod === 'card' ? 'border-brand bg-mint-100' : 'border-mint-200'}`}
            >
              Credit / Debit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`w-full rounded-lg border px-4 py-3 text-left ${paymentMethod === 'paypal' ? 'border-brand bg-mint-100' : 'border-mint-200'}`}
            >
              PayPal
            </button>
          </div>
          <div className="mt-4 flex justify-between">
            <button type="button" className="btn-soft" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </article>
      ) : null}

      {step === 3 ? (
        <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
          <h2 className="text-2xl font-semibold text-brand">Payment Form (Simulation)</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              checkoutMutation.mutate();
            }}
          >
            <input
              value={form.cardNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, cardNumber: event.target.value }))}
              className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              placeholder="Card number"
              required={paymentMethod === 'card'}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.expiry}
                onChange={(event) => setForm((prev) => ({ ...prev, expiry: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                placeholder="MM/YY"
                required={paymentMethod === 'card'}
              />
              <input
                value={form.cvv}
                onChange={(event) => setForm((prev) => ({ ...prev, cvv: event.target.value }))}
                className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
                placeholder="CVV"
                required={paymentMethod === 'card'}
              />
            </div>
            <input
              value={form.cardholder}
              onChange={(event) => setForm((prev) => ({ ...prev, cardholder: event.target.value }))}
              className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
              placeholder="Cardholder name"
              required={paymentMethod === 'card'}
            />
            <label className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-accent">
              <input type="checkbox" checked={simulateFailure} onChange={(event) => setSimulateFailure(event.target.checked)} />
              Simulate failure
            </label>
            <div className="flex justify-between">
              <button type="button" className="btn-soft" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={checkoutMutation.isPending}>
                {checkoutMutation.isPending ? (
                  <span className="inline-flex items-center gap-1">
                    <LoaderCircle size={14} className="animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Pay $${total.toFixed(0)}`
                )}
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {step === 4 ? (
        <article className="rounded-2xl border border-mint-200 bg-white p-8 text-center shadow-card">
          {isSuccess ? (
            <>
              <CheckCircle2 className="mx-auto text-emerald-500" size={56} />
              <h2 className="mt-4 text-4xl font-semibold text-brand">Payment Successful</h2>
              <p className="mt-2 text-sm text-accent">Your combined checkout has been confirmed.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button type="button" className="btn-primary" onClick={() => navigate('/bookings')}>
                  View my bookings
                </button>
                <button type="button" className="btn-soft" onClick={() => navigate('/catalog')}>
                  Browse services
                </button>
              </div>
            </>
          ) : null}
          {isFailure ? (
            <>
              <CircleX className="mx-auto text-rose-500" size={56} />
              <h2 className="mt-4 text-4xl font-semibold text-brand">Payment Failed</h2>
              <p className="mt-2 text-sm text-accent">Simulation failed. You can retry checkout.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    checkoutMutation.reset();
                    setStep(3);
                  }}
                >
                  Retry
                </button>
                <button type="button" className="btn-soft" onClick={() => navigate(`/tours/${id}`)}>
                  Back to tour
                </button>
              </div>
            </>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

