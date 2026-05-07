import { Heart, MapPin, Star, Clock3, Plane, UtensilsCrossed, Hotel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getKindLabel } from '../../features/catalog/catalog.constants';

function KindIcon({ kind }) {
  if (kind === 'hotel') return <Hotel size={14} />;
  if (kind === 'restaurant') return <UtensilsCrossed size={14} />;
  if (kind === 'flight') return <Plane size={14} />;
  return <Clock3 size={14} />;
}

function AttributeBadge({ service }) {
  if (service.kind === 'hotel' && service.hotel?.stars) return `${service.hotel.stars} stars`;
  if (service.kind === 'restaurant' && service.restaurant?.cuisine) return service.restaurant.cuisine;
  if (service.kind === 'activity' && service.activity?.duration_minutes) {
    return `${Math.max(1, Math.round(service.activity.duration_minutes / 60))}h`;
  }
  if (service.kind === 'flight') {
    const from = service.flight?.origin_city_id ?? '?';
    const to = service.flight?.destination_city_id ?? '?';
    return `${from} ? ${to}`;
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

export function ServiceCard({
  service,
  view = 'grid',
  isFavorite = false,
  onToggleFavorite,
  favoriteLoading = false,
  onAddToTour,
}) {
  if (view === 'list') {
    return (
      <article className="flex flex-col gap-3 rounded-xl border border-mint-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">
            <KindIcon kind={service.kind} /> {getKindLabel(service.kind).toLowerCase()}
          </div>
          <h3 className="text-lg font-semibold text-brand">{service.title}</h3>
          <p className="text-sm text-accent">{AttributeBadge({ service })}</p>
        </div>

        <div className="flex items-center gap-3">
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
      <div className="h-40 bg-gradient-to-br from-accent/70 via-brand/80 to-brand" />
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
          <MapPin size={12} /> Country #{service.country_id}, city #{service.city_id}
        </div>
        <p className="text-xs text-brand">{AttributeBadge({ service })}</p>
        <div className="flex items-center gap-1 text-xs text-accent">
          <Star size={12} className="text-amber-500" /> 4.8 (sample)
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
