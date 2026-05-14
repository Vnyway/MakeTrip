import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, MapPin, Users, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/errors';
import { getBookingById, updateBookingStatus } from '../../features/bookings/bookings.api';
import { useGeoDictionaries } from '../../features/geo/useGeoDictionaries';
import { CatalogCoverImage } from '../../components/catalog/ServiceCard';
import { formatDate, formatTime } from '../../lib/date';

function getKindLabel(kind) {
  if (kind === 'hotel') return 'hotel';
  if (kind === 'restaurant') return 'restaurant';
  if (kind === 'activity') return 'activity';
  if (kind === 'flight') return 'flight';
  return 'service';
}

function getNights(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

const SEAT_CLASS_LABELS = { economy: 'Economy', business: 'Business', first: 'First Class' };

function statusStyles(status) {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (status === 'completed') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

export function BookingDetailsPage() {
  const { id } = useParams();
  const geo = useGeoDictionaries();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id),
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateBookingStatus(id, status),
    onSuccess: async (booking) => {
      toast.success(`Booking marked as ${booking.status}.`);
      await queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      await queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update booking status.')),
  });

  if (query.isLoading) {
    return <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Loading booking details...</div>;
  }

  if (query.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-sm text-red-600 shadow-card">
        {getErrorMessage(query.error, 'Failed to load booking details.')}
      </div>
    );
  }

  if (!query.data) {
    return <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Booking not found.</div>;
  }

  const booking = query.data;
  const service = booking.service;
  const nights = getNights(booking.start_date, booking.end_date);
  const disableStatusButtons = statusMutation.isPending || booking.status === 'cancelled' || booking.status === 'completed';

  return (
    <section className="space-y-6">
      <button type="button" className="inline-flex items-center gap-1 text-sm text-accent hover:underline" onClick={() => navigate('/bookings')}>
        <ArrowLeft size={14} />
        Back to bookings
      </button>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_360px]">
        <div className="space-y-5">
          <article className="overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div>
                <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-semibold text-brand">{getKindLabel(service?.kind)}</span>
                <h1 className="mt-2 text-3xl font-bold text-brand">{service?.title || 'Service'}</h1>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
                  <MapPin size={13} />
                  {geo.getCountryName(service?.country_id)}, {geo.getCityName(service?.city_id)}
                </p>
              </div>

              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles(booking.status)}`}>{booking.status}</span>
            </div>

            <div className="relative h-56 overflow-hidden sm:h-64 md:h-72">
              <CatalogCoverImage url={service?.cover_image_url} heightClass="h-full w-full min-h-[14rem]" />
            </div>
          </article>

          <article className="rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
            <h2 className="text-xl font-semibold text-brand">Booking Details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              {/* HOTEL */}
              {service?.kind === 'hotel' && (
                <>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Check-in Date</p>
                    <p className="mt-1 font-medium text-brand">{formatDate(booking.start_date)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Check-out Date</p>
                    <p className="mt-1 font-medium text-brand">{formatDate(booking.end_date)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Duration</p>
                    <p className="mt-1 font-medium text-brand">{nights ? `${nights} nights` : '1 night'}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><Users size={12} />Guests</p>
                    <p className="mt-1 font-medium text-brand">{booking.persons_count} people</p>
                  </div>
                </>
              )}

              {/* RESTAURANT / ACTIVITY */}
              {(service?.kind === 'restaurant' || service?.kind === 'activity') && (
                <>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Date</p>
                    <p className="mt-1 font-medium text-brand">{formatDate(booking.start_date)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Time</p>
                    <p className="mt-1 font-medium text-brand">{formatTime(booking.start_time)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><Users size={12} />Guests</p>
                    <p className="mt-1 font-medium text-brand">{booking.persons_count} people</p>
                  </div>
                </>
              )}

              {/* FLIGHT */}
              {service?.kind === 'flight' && (
                <>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Departure Date</p>
                    <p className="mt-1 font-medium text-brand">{formatDate(booking.start_date)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Departure Time</p>
                    <p className="mt-1 font-medium text-brand">{formatTime(booking.start_time)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><Users size={12} />Passengers</p>
                    <p className="mt-1 font-medium text-brand">{booking.persons_count} people</p>
                  </div>
                  {booking.booking_meta?.seat_class && (
                    <div className="rounded-lg bg-surface p-3">
                      <p className="text-xs text-accent">Seat Class</p>
                      <p className="mt-1 font-medium text-brand">{SEAT_CLASS_LABELS[booking.booking_meta.seat_class] ?? booking.booking_meta.seat_class}</p>
                    </div>
                  )}
                </>
              )}

              {/* Fallback for unknown kind */}
              {!service?.kind && (
                <>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />Start Date</p>
                    <p className="mt-1 font-medium text-brand">{formatDate(booking.start_date)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><CalendarDays size={12} />End Date</p>
                    <p className="mt-1 font-medium text-brand">{formatDate(booking.end_date)}</p>
                  </div>
                  <div className="rounded-lg bg-surface p-3">
                    <p className="inline-flex items-center gap-1 text-xs text-accent"><Users size={12} />Guests</p>
                    <p className="mt-1 font-medium text-brand">{booking.persons_count} people</p>
                  </div>
                </>
              )}
            </div>
          </article>
        </div>

        <aside className="h-fit rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
          <h2 className="text-xl font-semibold text-brand">Price Summary</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-accent">
              <span>Booking ID</span>
              <span className="font-medium text-brand">{booking.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center justify-between text-accent">
              <span>Booked on</span>
              <span className="font-medium text-brand">{formatDate(booking.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-accent">
              <span>{service?.kind === 'flight' ? 'Passengers' : 'Guests'}</span>
              <span className="font-medium text-brand">{booking.persons_count}</span>
            </div>
            {service?.kind === 'hotel' && nights > 0 && (
              <div className="flex items-center justify-between text-accent">
                <span>Nights</span>
                <span className="font-medium text-brand">{nights}</span>
              </div>
            )}
            {(service?.kind === 'restaurant' || service?.kind === 'activity') && booking.start_time && (
              <div className="flex items-center justify-between text-accent">
                <span>Time</span>
                <span className="font-medium text-brand">{formatTime(booking.start_time)}</span>
              </div>
            )}
            {service?.kind === 'flight' && booking.booking_meta?.seat_class && (
              <div className="flex items-center justify-between text-accent">
                <span>Class</span>
                <span className="font-medium text-brand">{SEAT_CLASS_LABELS[booking.booking_meta.seat_class] ?? booking.booking_meta.seat_class}</span>
              </div>
            )}
          </div>

          <div className="my-4 h-px bg-mint-200" />

          <div className="flex items-end justify-between">
            <p className="text-accent">Total Price</p>
            <p className="text-3xl font-semibold text-brand">${Number(booking.total_price_usd || 0).toFixed(0)}</p>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={disableStatusButtons || booking.status === 'completed'}
              onClick={() => statusMutation.mutate('completed')}
              className="btn-primary flex w-full items-center justify-center gap-1 disabled:opacity-60"
            >
              <CheckCircle2 size={15} />
              Mark as completed
            </button>

            <button
              type="button"
              disabled={disableStatusButtons}
              onClick={() => statusMutation.mutate('cancelled')}
              className="btn-soft w-full border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Cancel booking
            </button>
          </div>

          <Link to={`/services/${booking.service_id}`} className="mt-3 inline-flex w-full justify-center text-xs text-accent hover:underline">
            Open service page
          </Link>
        </aside>
      </div>
    </section>
  );
}

