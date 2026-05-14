import { useState } from 'react';
import { Heart, MapPin, Star, Clock3, Plane, UtensilsCrossed, Hotel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getKindLabel } from '../../features/catalog/catalog.constants';
import { useGeoDictionaries } from '../../features/geo/useGeoDictionaries';

function KindIcon({ kind }) {
  if (kind === 'hotel') return <Hotel size={14} />;
  if (kind === 'restaurant') return <UtensilsCrossed size={14} />;
  if (kind === 'flight') return <Plane size={14} />;
  return <Clock3 size={14} />;
}

function AttributeBadge({ service, getCityName }) {
  if (service.kind === 'hotel' && service.hotel?.stars) return `${service.hotel.stars} stars`;
  if (service.kind === 'restaurant' && service.restaurant?.cuisine) return service.restaurant.cuisine;
  if (service.kind === 'activity' && service.activity?.duration_minutes) {
    return `${Math.max(1, Math.round(service.activity.duration_minutes / 60))}h`;
  }
  if (service.kind === 'flight') {
    const from = service.flight?.origin_city_id ?? '?';
    const to = service.flight?.destination_city_id ?? '?';
    return `${getCityName(from)} -> ${getCityName(to)}`;
  }
  return getKindLabel(service.kind);
}

function formatPrice(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function FavoriteButton({ active, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        active
          ? 'border-red-200 bg-white text-red-500'
          : 'border-white/80 bg-white/90 text-brand hover:bg-white'
      }`}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart size={16} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

export function CatalogCoverImage({ url, heightClass = 'h-40', roundedClass = '' }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className={`${heightClass} w-full bg-gradient-to-br from-accent/70 via-brand/80 to-brand ${roundedClass}`} />
    );
  }
  return (
    <img
      src={url}
      alt=""
      className={`${heightClass} w-full object-cover ${roundedClass}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function ServiceCard({
  service,
  view = 'grid',
  isFavorite = false,
  onToggleFavorite,
  favoriteLoading = false,
  onAddToTour,
}) {
  const geo = useGeoDictionaries();
  const countryName = geo.getCountryName(service.country_id);
  const cityName = geo.getCityName(service.city_id);

  if (view === 'list') {
    return (
      <article className="flex flex-col gap-3 rounded-xl border border-mint-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3 sm:items-center">
          {service.cover_image_url ? (
            <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-mint-200 sm:block">
              <CatalogCoverImage url={service.cover_image_url} heightClass="h-20" />
            </div>
          ) : null}
          <div className="min-w-0 space-y-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">
            <KindIcon kind={service.kind} /> {getKindLabel(service.kind).toLowerCase()}
          </div>
          <h3 className="text-lg font-semibold text-brand">{service.title}</h3>
          <p className="text-sm text-accent">{AttributeBadge({ service, getCityName: geo.getCityName })}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {typeof onToggleFavorite === 'function' ? (
            <button
              type="button"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${
                isFavorite ? 'border-red-200 bg-white text-red-500' : 'border-mint-200 bg-white text-brand'
              }`}
              onClick={onToggleFavorite}
              disabled={favoriteLoading}
            >
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          ) : null}
          <p className="text-xl font-bold text-brand">{formatPrice(service.price_usd)}</p>
          <Link to={`/services/${service.id}`} className="btn-soft">
            View details
          </Link>
          <button type="button" className="btn-primary" onClick={() => onAddToTour?.(service)}>
            Add to Tour
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="relative overflow-hidden rounded-xl border border-mint-200 bg-white shadow-card">
      <CatalogCoverImage url={service.cover_image_url} />
      {typeof onToggleFavorite === 'function' ? (
        <FavoriteButton active={isFavorite} onClick={onToggleFavorite} disabled={favoriteLoading} />
      ) : null}
      <div className="space-y-2 p-4">
        <div className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">
          <KindIcon kind={service.kind} /> {getKindLabel(service.kind).toLowerCase()}
        </div>
        <h3 className="line-clamp-1 text-lg font-semibold text-brand">{service.title}</h3>
        <p className="line-clamp-1 text-sm text-accent">{service.description || 'No description yet.'}</p>
        <div className="flex items-center gap-1 text-xs text-accent">
          <MapPin size={12} /> {countryName}, {cityName}
        </div>
        <p className="text-xs text-brand">{AttributeBadge({ service, getCityName: geo.getCityName })}</p>
        <div className="flex items-center gap-1 text-xs text-accent">
          <Star
            size={12}
            className={`shrink-0 ${service.avg_rating ? 'text-amber-500' : 'text-amber-500/40'}`}
            aria-hidden
          />
          {service.avg_rating
            ? <span className="tabular-nums">{service.avg_rating.toFixed(1)} <span className="text-accent/70">({service.review_count})</span></span>
            : <span className="text-accent/60">No reviews</span>
          }
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-mint-200 pt-3">
          <p className="text-xl font-bold text-brand">{formatPrice(service.price_usd)}</p>
          <div className="flex gap-2">
            <Link to={`/services/${service.id}`} className="btn-soft px-2 py-1.5 text-xs">
              View
            </Link>
            <button type="button" className="btn-primary px-2 py-1.5 text-xs" onClick={() => onAddToTour?.(service)}>
              Add to Tour
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
