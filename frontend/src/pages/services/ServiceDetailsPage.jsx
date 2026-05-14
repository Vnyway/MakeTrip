import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, MapPin, Star, Minus, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { useFavorites } from '../../features/favorites/useFavorites';
import { createBooking } from '../../features/bookings/bookings.api';
import { AddToTourModal } from '../../components/tours/AddToTourModal';
import { CatalogCoverImage } from '../../components/catalog/ServiceCard';
import { useGeoDictionaries } from '../../features/geo/useGeoDictionaries';
import { useAuth } from '../../app/auth';
import { deleteAdminReview } from '../../features/admin/admin.api';
import { getTagLabel } from '../../features/catalog/catalog.constants';
import { formatDate, formatTime } from '../../lib/date';

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
});

const SEAT_CLASSES = [
  { value: 'economy', label: 'Economy', multiplier: 1 },
  { value: 'business', label: 'Business', multiplier: 1.8 },
  { value: 'first', label: 'First Class', multiplier: 3 },
];

function getSeatMultiplier(seatClass) {
  return SEAT_CLASSES.find((c) => c.value === seatClass)?.multiplier ?? 1;
}

function getKindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}

function RelatedServiceCard({ item, favorites, geo }) {
  const isFavorite = favorites.isFavorite(item.id);

  return (
    <article className="relative overflow-hidden rounded-xl border border-mint-200 bg-white shadow-card">
      <CatalogCoverImage url={item.cover_image_url} heightClass="h-36" />
      <button
        type="button"
        onClick={() => favorites.toggleFavorite(item.id)}
        className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
          isFavorite ? 'border-red-200 bg-white text-red-500' : 'border-white/80 bg-white/90 text-brand'
        }`}
      >
        <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
      <div className="space-y-2 p-4">
        <div className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">
          {getKindLabel(item.kind)}
        </div>
        <h3 className="line-clamp-1 text-lg font-semibold text-brand">{item.title}</h3>
        <p className="line-clamp-1 text-sm text-accent">{item.description || 'No description'}</p>
        <div className="flex items-center gap-1 text-xs text-accent">
          <MapPin size={12} /> {geo.getCountryName(item.country_id)}, {geo.getCityName(item.city_id)}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-mint-200 pt-3">
          <p className="text-lg font-bold text-brand">${Number(item.price_usd || 0).toFixed(0)}</p>
          <Link className="btn-soft px-2 py-1.5 text-xs" to={`/services/${item.id}`}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ServiceDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const favorites = useFavorites();
  const geo = useGeoDictionaries();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showAddToTourModal, setShowAddToTourModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    start_date: '',
    end_date: '',
    start_time: '',
    persons_count: 1,
    seat_class: 'economy',
  });

  const serviceQuery = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/services/${id}`);
      return data.service;
    },
    enabled: Boolean(id),
  });

  const mediaListQuery = useQuery({
    queryKey: ['service-media', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/services/${id}/media`);
      return data.items || [];
    },
    enabled: Boolean(id),
  });

  const mediaQuery = useQuery({
    queryKey: ['service-media-read', id, mediaListQuery.data?.length],
    queryFn: async () => {
      const items = mediaListQuery.data || [];
      if (!items.length) return [];

      const resolved = await Promise.all(
        items.map(async (item) => {
          try {
            const { data } = await api.get(`/api/services/${id}/media/${item.id}/read`);
            return {
              ...item,
              url: data.download_url,
            };
          } catch {
            return {
              ...item,
              url: item.s3_url,
            };
          }
        }),
      );

      return resolved;
    },
    enabled: Boolean(id) && Array.isArray(mediaListQuery.data),
  });

  const reviewsQuery = useQuery({
    queryKey: ['service-reviews', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/reviews/by-service/${id}`);
      return data.items || [];
    },
    enabled: Boolean(id),
  });

  const myReview = useMemo(() => {
    const uid = auth.user?.id;
    if (!uid || !reviewsQuery.data?.length) return null;
    return reviewsQuery.data.find((r) => r.user_id === uid) ?? null;
  }, [auth.user?.id, reviewsQuery.data]);

  useEffect(() => {
    if (!myReview) return;
    setRating(myReview.rating);
    setComment(myReview.comment || '');
  }, [myReview?.id, myReview?.rating, myReview?.comment]);

  useEffect(() => {
    if (searchParams.get('review') !== 'edit') return;
    if (!auth.isAuthenticated || auth.isBootstrapping) return;
    if (!reviewsQuery.data?.length || !myReview?.id) return;
    setShowReviewForm(true);
  }, [searchParams, auth.isAuthenticated, auth.isBootstrapping, reviewsQuery.data, myReview?.id]);

  const relatedQuery = useQuery({
    queryKey: ['service-related', id, serviceQuery.data?.kind],
    queryFn: async () => {
      const { data } = await api.get('/api/services', {
        params: {
          kind: serviceQuery.data?.kind,
          status: 'active',
          limit: 8,
          page: 1,
          sort: 'created_at desc',
        },
      });

      return (data.items || []).filter((item) => item.id !== id).slice(0, 3);
    },
    enabled: Boolean(id) && Boolean(serviceQuery.data?.kind),
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload) => {
      const list = queryClient.getQueryData(['service-reviews', id]) || [];
      const uid = auth.user?.id;
      const existing = uid ? list.find((r) => r.user_id === uid) : null;

      if (existing) {
        await api.patch(`/api/reviews/${id}`, {
          rating: payload.rating,
          comment: payload.comment || null,
        });
        return;
      }

      try {
        await api.post('/api/reviews', {
          service_id: id,
          rating: payload.rating,
          comment: payload.comment || null,
        });
      } catch (error) {
        if (error?.response?.status === 409) {
          await api.patch(`/api/reviews/${id}`, {
            rating: payload.rating,
            comment: payload.comment || null,
          });
          return;
        }
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success('Review saved.');
      setShowReviewForm(false);
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      await reviewsQuery.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not submit review.')),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: deleteAdminReview,
    onSuccess: async () => {
      toast.success('Review deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['service-reviews', id] });
      await queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete review.')),
  });

  const bookingMutation = useMutation({
    mutationFn: async (form) => {
      const kind = serviceQuery.data?.kind;
      const basePrice = Number(serviceQuery.data?.price_usd || 0);
      const { start_date, end_date, start_time, persons_count, seat_class } = form;

      let totalPrice;
      let bookingMeta = {};

      if (kind === 'hotel') {
        const start = new Date(`${start_date}T00:00:00`);
        const end = new Date(`${end_date}T00:00:00`);
        const nights = Math.max(1, Math.round((end - start) / 86400000));
        totalPrice = basePrice * persons_count * nights;
      } else if (kind === 'flight') {
        const multiplier = getSeatMultiplier(seat_class);
        totalPrice = basePrice * persons_count * multiplier;
        bookingMeta = { seat_class };
      } else {
        totalPrice = basePrice * persons_count;
      }

      return createBooking({
        service_id: id,
        start_date,
        end_date: kind === 'hotel' ? end_date : start_date,
        start_time: start_time || null,
        persons_count,
        total_price_usd: totalPrice,
        booking_meta: bookingMeta,
        status: 'pending',
      });
    },
    onSuccess: async (booking) => {
      toast.success('Booking created.');
      setShowBookingModal(false);
      setBookingForm({ start_date: '', end_date: '', start_time: '', persons_count: 1, seat_class: 'economy' });
      await queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create booking.')),
  });

  const media = mediaQuery.data || [];
  const activeMedia = media[activeIndex];

  const ratingSummary = useMemo(() => {
    const list = reviewsQuery.data || [];
    if (!list.length) return { avg: 0, count: 0 };

    const sum = list.reduce((acc, item) => acc + Number(item.rating || 0), 0);
    return {
      avg: sum / list.length,
      count: list.length,
    };
  }, [reviewsQuery.data]);

  const bookingSummary = useMemo(() => {
    const { start_date, end_date, persons_count, seat_class } = bookingForm;
    const kind = serviceQuery.data?.kind;
    const basePrice = Number(serviceQuery.data?.price_usd || 0);

    if (!start_date || !persons_count) return { nights: 0, total: 0 };

    if (kind === 'hotel') {
      if (!end_date) return { nights: 0, total: 0 };
      const start = new Date(`${start_date}T00:00:00`);
      const end = new Date(`${end_date}T00:00:00`);
      const nights = Math.max(1, Math.round((end - start) / 86400000));
      return { nights, total: basePrice * persons_count * nights };
    }

    if (kind === 'flight') {
      const multiplier = getSeatMultiplier(seat_class);
      return { nights: 0, total: basePrice * persons_count * multiplier };
    }

    return { nights: 0, total: basePrice * persons_count };
  }, [bookingForm, serviceQuery.data?.price_usd, serviceQuery.data?.kind]);

  if (serviceQuery.isLoading) {
    return <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Loading service details...</div>;
  }

  if (serviceQuery.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-sm text-red-600 shadow-card">
        {getErrorMessage(serviceQuery.error, 'Failed to load service details.')}
      </div>
    );
  }

  if (!serviceQuery.data) {
    return <div className="rounded-xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">Service not found.</div>;
  }

  const service = serviceQuery.data;
  const isFavorite = favorites.isFavorite(service.id);

  return (
    <section className="space-y-8">
      <Link to="/catalog" className="text-sm font-medium text-accent hover:underline">
        Back to catalog
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
            {activeMedia?.url ? (
              <img
                src={activeMedia.url}
                alt={service.title}
                className="h-[320px] w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-[320px] bg-gradient-to-br from-accent/70 via-brand/80 to-brand" />
            )}

            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev - 1 + media.length) % media.length)}
                  className="absolute left-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % media.length)}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            ) : null}
          </div>

          {media.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {media.slice(0, 8).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`overflow-hidden rounded-lg border ${index === activeIndex ? 'border-brand' : 'border-mint-200'}`}
                >
                  {item.url ? (
                    <img src={item.url} alt={`media-${index + 1}`} className="h-16 w-full object-cover" />
                  ) : (
                    <div className="h-16 w-full bg-mint-100" />
                  )}
                </button>
              ))}
            </div>
          ) : null}

          {mediaListQuery.isLoading || mediaQuery.isLoading ? (
            <p className="text-xs text-accent">Loading media...</p>
          ) : null}

          {!media.length && !mediaListQuery.isLoading ? (
            <p className="text-xs text-accent">No media uploaded for this service yet.</p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-2xl border border-mint-200 bg-white p-5 shadow-card">
          <div className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">
            {getKindLabel(service.kind).toLowerCase()}
          </div>
          <h1 className="text-3xl font-bold text-brand">{service.title}</h1>
          <div className="flex items-center gap-2 text-sm text-accent">
            <MapPin size={14} /> {geo.getCountryName(service.country_id)}, {geo.getCityName(service.city_id)}
          </div>

          <div className="flex items-center gap-2 text-sm text-accent">
            <Star size={14} className="text-amber-500" />
            {ratingSummary.count ? `${ratingSummary.avg.toFixed(1)} (${ratingSummary.count} reviews)` : 'No reviews yet'}
          </div>

          <p className="text-sm text-accent">
            {service.description || 'No description provided for this service yet.'}
          </p>

          {service.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {service.tags.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full bg-mint-100 px-3 py-1 text-xs font-medium text-brand"
                >
                  {getTagLabel(slug)}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-mint-100 p-3">
              <p className="text-xs text-accent">Service type</p>
              <p className="font-semibold text-brand">{getKindLabel(service.kind)}</p>
            </div>
            <div className="rounded-lg bg-mint-100 p-3">
              <p className="text-xs text-accent">Status</p>
              <p className="font-semibold capitalize text-brand">{service.status}</p>
            </div>
            <div className="rounded-lg bg-mint-100 p-3">
              <p className="text-xs text-accent">Created</p>
              <p className="font-semibold text-brand">{formatDate(service.created_at)}</p>
            </div>
            <div className="rounded-lg bg-mint-100 p-3">
              <p className="text-xs text-accent">Updated</p>
              <p className="font-semibold text-brand">{formatDate(service.updated_at)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-mint-200 bg-mint-100 p-4">
            <p className="text-xs text-accent">Price from</p>
            <p className="text-3xl font-bold text-brand">${Number(service.price_usd || 0).toFixed(0)}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                className={`btn-soft ${isFavorite ? 'text-red-500' : ''}`}
                onClick={() => favorites.toggleFavorite(service.id)}
                disabled={favorites.isToggling}
              >
                <Heart size={14} className="mr-1 inline-block" fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? 'Remove favorite' : 'Add to favorites'}
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowAddToTourModal(true)}>
                Add to Tour
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowBookingModal(true)}>
                Book now
              </button>
            </div>
            <button type="button" className="btn-soft mt-2 w-full" onClick={() => setShowReviewForm((prev) => !prev)}>
              {showReviewForm ? 'Close review form' : myReview ? 'Edit your review' : 'Add review'}
            </button>
          </div>

          {showReviewForm ? (
            <form
              className="space-y-2 rounded-lg border border-mint-200 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();

                try {
                  const parsed = reviewSchema.parse({ rating, comment });
                  reviewMutation.mutate(parsed);
                } catch (error) {
                  toast.error(getErrorMessage(error, 'Invalid review data.'));
                }
              }}
            >
              <label className="block text-sm font-medium text-brand" htmlFor="rating">
                Rating
              </label>
              <select
                id="rating"
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-brand" htmlFor="comment">
                Comment
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-24 w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm"
                placeholder="Share your thoughts"
              />

              <button type="submit" className="btn-primary" disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? 'Saving review...' : myReview ? 'Save changes' : 'Submit review'}
              </button>
            </form>
          ) : null}

        </div>
      </div>

      {showBookingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand/35 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-mint-200 bg-white shadow-card">
            <div className="flex items-start justify-between border-b border-mint-200 p-5">
              <div>
                <h3 className="text-2xl font-semibold text-brand">Complete Your Booking</h3>
                <p className="text-sm text-accent">{service.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-accent hover:bg-mint-100"
              >
                <X size={16} />
              </button>
            </div>

            <form
              className="space-y-4 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const { start_date, end_date, persons_count } = bookingForm;
                if (!start_date) { toast.error('Please select a date.'); return; }
                if (service.kind === 'hotel' && !end_date) { toast.error('Please select check-out date.'); return; }
                if (service.kind === 'hotel') {
                  const s = new Date(`${start_date}T00:00:00`);
                  const e = new Date(`${end_date}T00:00:00`);
                  if (e <= s) { toast.error('Check-out must be after check-in.'); return; }
                }
                bookingMutation.mutate(bookingForm);
              }}
            >
              {/* HOTEL: check-in / check-out dates */}
              {service.kind === 'hotel' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand" htmlFor="bkStartDate">Check-in Date</label>
                    <input id="bkStartDate" type="date" required
                      value={bookingForm.start_date}
                      onChange={(e) => setBookingForm((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand" htmlFor="bkEndDate">Check-out Date</label>
                    <input id="bkEndDate" type="date" required
                      value={bookingForm.end_date}
                      onChange={(e) => setBookingForm((p) => ({ ...p, end_date: e.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                    />
                  </div>
                </div>
              )}

              {/* RESTAURANT / ACTIVITY: date + time */}
              {(service.kind === 'restaurant' || service.kind === 'activity') && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand" htmlFor="bkDate">Date</label>
                    <input id="bkDate" type="date" required
                      value={bookingForm.start_date}
                      onChange={(e) => setBookingForm((p) => ({ ...p, start_date: e.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand" htmlFor="bkTime">Time</label>
                    <input id="bkTime" type="time" required
                      value={bookingForm.start_time}
                      onChange={(e) => setBookingForm((p) => ({ ...p, start_time: e.target.value }))}
                      className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                    />
                  </div>
                </div>
              )}

              {/* FLIGHT: departure date + time + seat class */}
              {service.kind === 'flight' && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-brand" htmlFor="bkDepDate">Departure Date</label>
                      <input id="bkDepDate" type="date" required
                        value={bookingForm.start_date}
                        onChange={(e) => setBookingForm((p) => ({ ...p, start_date: e.target.value }))}
                        className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-brand" htmlFor="bkDepTime">Departure Time</label>
                      <input id="bkDepTime" type="time" required
                        value={bookingForm.start_time}
                        onChange={(e) => setBookingForm((p) => ({ ...p, start_time: e.target.value }))}
                        className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm text-brand"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-brand">Seat Class</label>
                    <div className="flex gap-2">
                      {SEAT_CLASSES.map((sc) => (
                        <button key={sc.value} type="button"
                          onClick={() => setBookingForm((p) => ({ ...p, seat_class: sc.value }))}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            bookingForm.seat_class === sc.value
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

              {bookingSummary.nights > 0 && (
                <div className="rounded-xl bg-surface p-3 text-sm text-brand">
                  Duration: <span className="font-semibold">{bookingSummary.nights} nights</span>
                </div>
              )}

              {/* Persons count — all except flight (per ticket) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-brand">
                  {service.kind === 'flight' ? 'Number of Passengers' : 'Number of Guests'}
                </label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setBookingForm((p) => ({ ...p, persons_count: Math.max(1, Number(p.persons_count) - 1) }))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-mint-200 bg-surface text-brand"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex h-10 min-w-20 items-center justify-center rounded-lg border border-mint-200 bg-surface px-3 text-brand">
                    {bookingForm.persons_count}
                  </div>
                  <button type="button"
                    onClick={() => setBookingForm((p) => ({ ...p, persons_count: Number(p.persons_count) + 1 }))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand bg-white text-brand"
                  >
                    <Plus size={14} />
                  </button>
                  <span className="text-sm text-accent">{bookingForm.persons_count}</span>
                </div>
              </div>

              <div className="rounded-xl bg-surface p-4">
                <h4 className="text-xl font-semibold text-brand">Price Summary</h4>
                <div className="mt-2 flex items-center justify-between text-sm text-accent">
                  {service.kind === 'hotel' && (
                    <span>${Number(service.price_usd || 0).toFixed(0)} × {bookingForm.persons_count} guests × {bookingSummary.nights} nights</span>
                  )}
                  {service.kind === 'flight' && (
                    <span>${Number(service.price_usd || 0).toFixed(0)} × {bookingForm.persons_count} passengers × {SEAT_CLASSES.find((c) => c.value === bookingForm.seat_class)?.multiplier ?? 1}× ({bookingForm.seat_class})</span>
                  )}
                  {(service.kind === 'restaurant' || service.kind === 'activity') && (
                    <span>${Number(service.price_usd || 0).toFixed(0)} × {bookingForm.persons_count} guests</span>
                  )}
                  <span className="font-semibold text-brand">${Number(bookingSummary.total || 0).toFixed(0)}</span>
                </div>
                <div className="my-3 h-px bg-mint-200" />
                <div className="flex items-end justify-between">
                  <span className="text-lg text-accent">Total Price (USD)</span>
                  <span className="text-4xl font-semibold text-brand">${Number(bookingSummary.total || 0).toFixed(0)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" className="btn-soft" onClick={() => setShowBookingModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? 'Creating...' : 'Proceed to Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <AddToTourModal
        service={service}
        open={showAddToTourModal}
        onClose={() => setShowAddToTourModal(false)}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand">Reviews</h2>
        {reviewsQuery.isLoading ? (
          <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">Loading reviews...</div>
        ) : !(reviewsQuery.data || []).length ? (
          <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {(reviewsQuery.data || []).map((review) => (
              <article key={review.id} className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-brand">Rating: {review.rating}/5</p>
                  <div className="flex items-center gap-2">
                    {auth.user?.id && review.user_id === auth.user.id ? (
                      <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-medium text-brand">Your review</span>
                    ) : null}
                    <p className="text-xs text-accent">{formatDate(review.created_at)}</p>
                    {auth.isAdmin ? (
                      <button
                        type="button"
                        className="btn-soft border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        disabled={deleteReviewMutation.isPending}
                        onClick={() => deleteReviewMutation.mutate(review.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-accent">{review.comment || 'No comment provided.'}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand">Related Services</h2>
        {relatedQuery.isLoading ? (
          <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">Loading related services...</div>
        ) : !(relatedQuery.data || []).length ? (
          <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">No related services found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(relatedQuery.data || []).map((item) => (
              <RelatedServiceCard key={item.id} item={item} favorites={favorites} geo={geo} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
