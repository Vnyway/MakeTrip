import { CalendarDays, Users, MapPin, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listMyBookings } from '../../features/bookings/bookings.api';
import { EmptyState, ErrorState } from '../../components/ui/AsyncState';
import { getErrorMessage } from '../../lib/errors';
import { MotionFade } from '../../components/ui/MotionFade';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function getKindLabel(kind) {
  if (kind === 'hotel') return 'hotel';
  if (kind === 'restaurant') return 'restaurant';
  if (kind === 'activity') return 'activity';
  if (kind === 'flight') return 'flight';
  return 'service';
}

function statusStyles(status) {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (status === 'completed') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function getNights(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

function BookingSkeleton() {
  return (
    <article className="animate-pulse overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
      <div className="grid gap-0 md:grid-cols-[130px_1fr_170px]">
        <div className="h-36 bg-mint-200 md:h-full" />
        <div className="space-y-2 p-4">
          <div className="h-4 w-24 rounded bg-mint-200" />
          <div className="h-5 w-48 rounded bg-mint-200" />
          <div className="h-4 w-36 rounded bg-mint-200" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="h-10 rounded bg-mint-200" />
            <div className="h-10 rounded bg-mint-200" />
            <div className="h-10 rounded bg-mint-200" />
          </div>
        </div>
        <div className="space-y-2 border-l border-mint-200 p-4">
          <div className="h-4 w-20 rounded bg-mint-200" />
          <div className="h-8 w-24 rounded bg-mint-200" />
          <div className="h-9 rounded bg-mint-200" />
        </div>
      </div>
    </article>
  );
}

function BookingCard({ booking }) {
  const nights = getNights(booking.start_date, booking.end_date);
  const service = booking.service;

  return (
    <article className="overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
      <div className="grid gap-0 md:grid-cols-[130px_1fr_170px]">
        <div className="h-36 bg-gradient-to-br from-accent/70 via-brand/80 to-brand md:h-full" />

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-semibold text-brand">
              {getKindLabel(service?.kind)}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyles(booking.status)}`}>
              {booking.status}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-brand">{service?.title || 'Service'}</h3>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
              <MapPin size={12} />
              Country #{service?.country_id}, city #{service?.city_id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <p className="text-accent">Check-in</p>
              <p className="mt-1 font-medium text-brand">{formatDate(booking.start_date)}</p>
            </div>
            <div>
              <p className="text-accent">Check-out</p>
              <p className="mt-1 font-medium text-brand">{formatDate(booking.end_date)}</p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1 text-accent">
                <CalendarDays size={12} />
                Duration
              </p>
              <p className="mt-1 font-medium text-brand">{nights ? `${nights} nights` : 'same-day'}</p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1 text-accent">
                <Users size={12} />
                Guests
              </p>
              <p className="mt-1 font-medium text-brand">{booking.persons_count}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between border-l border-mint-200 p-4">
          <div className="text-right">
            <p className="text-xs text-accent">Total Price</p>
            <p className="text-3xl font-semibold text-brand">${Number(booking.total_price_usd || 0).toFixed(0)}</p>
          </div>
          <Link to={`/bookings/${booking.id}`} className="btn-primary flex items-center justify-center gap-1 text-xs">
            View Details <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BookingsPage() {
  const query = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: listMyBookings,
  });

  const items = query.data || [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-brand">My Bookings</h1>
        <p className="mt-1 text-sm text-accent">View and manage all your reservations.</p>
      </header>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <BookingSkeleton key={idx} />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState message={getErrorMessage(query.error, 'Failed to load bookings.')} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description='Open any service and click "Book now" to create your first reservation.'
          action={
            <Link to="/catalog" className="btn-primary inline-flex">
              Browse services
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((booking, idx) => (
            <MotionFade key={booking.id} delay={Math.min(idx * 0.03, 0.18)}>
              <BookingCard booking={booking} />
            </MotionFade>
          ))}
        </div>
      )}
    </section>
  );
}
