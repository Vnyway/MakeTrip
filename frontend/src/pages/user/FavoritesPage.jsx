import { Heart } from 'lucide-react';
import { ServiceCard } from '../../components/catalog/ServiceCard';
import { useFavorites } from '../../features/favorites/useFavorites';

function FavoriteSkeletonCard() {
  return (
    <article className="animate-pulse overflow-hidden rounded-xl border border-mint-200 bg-white shadow-card">
      <div className="h-40 bg-mint-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-1/4 rounded bg-mint-200" />
        <div className="h-5 w-2/3 rounded bg-mint-200" />
        <div className="h-4 w-1/2 rounded bg-mint-200" />
        <div className="h-4 w-1/3 rounded bg-mint-200" />
        <div className="mt-3 h-9 rounded bg-mint-200" />
      </div>
    </article>
  );
}

export function FavoritesPage() {
  const favorites = useFavorites();

  const items = favorites.favoritesQuery.data || [];
  const loading = favorites.favoritesQuery.isLoading;

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2 text-brand">
        <Heart size={18} className="text-red-500" fill="currentColor" />
        <h1 className="text-3xl font-bold tracking-tight">My Favorites</h1>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <FavoriteSkeletonCard key={idx} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-mint-200 bg-white p-8 text-center shadow-card">
          <Heart size={52} className="text-accent" />
          <h2 className="mt-4 text-xl font-semibold text-brand">No favorites yet</h2>
          <p className="mt-2 text-sm text-accent">Start exploring and save your favorite services.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items
            .filter((item) => item.service)
            .map((item) => (
              <ServiceCard
                key={item.service_id}
                service={item.service}
                view="grid"
                isFavorite={true}
                onToggleFavorite={() => favorites.toggleFavorite(item.service_id)}
                favoriteLoading={favorites.isToggling}
              />
            ))}
        </div>
      )}
    </section>
  );
}
