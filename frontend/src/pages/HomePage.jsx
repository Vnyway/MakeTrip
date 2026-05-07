import { PageShell } from '../components/ui/PageShell';
import { RecommendationBlock } from '../components/catalog/RecommendationBlock';
import { useAuth } from '../app/auth';

export function HomePage() {
  const auth = useAuth();

  return (
    <section className="space-y-6">
      <PageShell
        title="Home"
        description="Discover services, build your tours, and get personalized recommendations."
      />

      {auth.isAuthenticated ? (
        <RecommendationBlock title="Recommended for You" limit={6} />
      ) : (
        <div className="rounded-xl border border-mint-200 bg-white p-4 text-sm text-accent shadow-card">
          Sign in to get personalized recommendations based on your activity and preferences.
        </div>
      )}
    </section>
  );
}
