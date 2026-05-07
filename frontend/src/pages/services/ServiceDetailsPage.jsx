import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, MapPin, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { useFavorites } from '../../features/favorites/useFavorites';

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
});

function getKindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function RelatedServiceCard({ item, favorites }) {
  const isFavorite = favorites.isFavorite(item.id);

  return (
    <article className="relative overflow-hidden rounded-xl border border-mint-200 bg-white shadow-card">
      <div className="h-36 bg-gradient-to-br from-accent/70 via-brand/80 to-brand" />
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
          <MapPin size={12} /> Country #{item.country_id}, city #{item.city_id}
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
  const favorites = useFavorites();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showAddToTour, setShowAddToTour] = useState(false);
  const [tourForm, setTourForm] = useState({ tourId: '', day_number: 1, position: 0, quantity: 1, note: '' });

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

  const toursQuery = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const { data } = await api.get('/api/tours');
      return data.tours || [];
    },
    enabled: showAddToTour,
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload) => {
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
      await reviewsQuery.refetch();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not submit review.')),
  });

  const addToTourMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post(`/api/tours/${payload.tourId}/items`, {
        service_id: id,
        day_number: payload.day_number,
        position: payload.position,
        quantity: payload.quantity,
        note: payload.note || null,
      });
    },
    onSuccess: () => {
      toast.success('Added to tour.');
      setShowAddToTour(false);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not add to tour.')),
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
        ? Back to catalog
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
            <MapPin size={14} /> Country #{service.country_id}, city #{service.city_id}
          </div>

          <div className="flex items-center gap-2 text-sm text-accent">
            <Star size={14} className="text-amber-500" />
            {ratingSummary.count ? `${ratingSummary.avg.toFixed(1)} (${ratingSummary.count} reviews)` : 'No reviews yet'}
          </div>

          <p className="text-sm text-accent">
            {service.description || 'No description provided for this service yet.'}
          </p>

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
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`btn-soft ${isFavorite ? 'text-red-500' : ''}`}
                onClick={() => favorites.toggleFavorite(service.id)}
                disabled={favorites.isToggling}
              >
                <Heart size={14} className="mr-1 inline-block" fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? 'Remove favorite' : 'Add to favorites'}
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowAddToTour(true)}>
                Add to Tour
              </button>
            </div>
            <button type="button" className="btn-soft mt-2 w-full" onClick={() => setShowReviewForm((prev) => !prev)}>
              {showReviewForm ? 'Close review form' : 'Add review'}
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
                {reviewMutation.isPending ? 'Saving review...' : 'Submit review'}
              </button>
            </form>
          ) : null}

          {showAddToTour ? (
            <form
              className="space-y-2 rounded-lg border border-mint-200 bg-white p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!tourForm.tourId) {
                  toast.error('Select a tour first.');
                  return;
                }

                addToTourMutation.mutate({
                  ...tourForm,
                  day_number: Number(tourForm.day_number),
                  position: Number(tourForm.position),
                  quantity: Number(tourForm.quantity),
                });
              }}
            >
              <h3 className="text-sm font-semibold text-brand">Add to Tour</h3>

              <label className="block text-sm font-medium text-brand" htmlFor="tourId">
                Tour
              </label>
              <select
                id="tourId"
                value={tourForm.tourId}
                onChange={(event) => setTourForm((prev) => ({ ...prev, tourId: event.target.value }))}
                className="w-full rounded-md border border-mint-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select tour</option>
                {(toursQuery.data || []).map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.title}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1}
                  value={tourForm.day_number}
                  onChange={(event) => setTourForm((prev) => ({ ...prev, day_number: event.target.value }))}
                  className="rounded-md border border-mint-200 px-2 py-2 text-sm"
                  placeholder="Day"
                />
                <input
                  type="number"
                  min={0}
                  value={tourForm.position}
                  onChange={(event) => setTourForm((prev) => ({ ...prev, position: event.target.value }))}
                  className="rounded-md border border-mint-200 px-2 py-2 text-sm"
                  placeholder="Position"
                />
                <input
                  type="number"
                  min={1}
                  value={tourForm.quantity}
                  onChange={(event) => setTourForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  className="rounded-md border border-mint-200 px-2 py-2 text-sm"
                  placeholder="Qty"
                />
              </div>

              <textarea
                value={tourForm.note}
                onChange={(event) => setTourForm((prev) => ({ ...prev, note: event.target.value }))}
                className="min-h-20 w-full rounded-md border border-mint-200 px-3 py-2 text-sm"
                placeholder="Optional note"
              />

              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={addToTourMutation.isPending || toursQuery.isLoading}>
                  {addToTourMutation.isPending ? 'Adding...' : 'Add'}
                </button>
                <button type="button" className="btn-soft" onClick={() => setShowAddToTour(false)}>
                  Cancel
                </button>
              </div>

              {toursQuery.isLoading ? <p className="text-xs text-accent">Loading tours...</p> : null}
              {!toursQuery.isLoading && !(toursQuery.data || []).length ? (
                <p className="text-xs text-accent">No tours found. Create one first in the Tours page.</p>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-brand">Reviews</h2>
        {reviewsQuery.isLoading ? (
          <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">Loading reviews...</div>
        ) : !(reviewsQuery.data || []).length ? (
          <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {(reviewsQuery.data || []).map((review, index) => (
              <article key={`${review.created_at}-${index}`} className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand">Rating: {review.rating}/5</p>
                  <p className="text-xs text-accent">{formatDate(review.created_at)}</p>
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
              <RelatedServiceCard key={item.id} item={item} favorites={favorites} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
