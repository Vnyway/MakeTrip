import { Link } from 'react-router-dom';
import { Lightbulb, Sparkles, TrendingUp } from 'lucide-react';

function kindLabel(kind) {
  if (kind === 'hotel') return 'Hotel';
  if (kind === 'restaurant') return 'Restaurant';
  if (kind === 'activity') return 'Activity';
  if (kind === 'flight') return 'Flight';
  return 'Service';
}

function toMatchPercent(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(99, Math.round(normalized)));
}

function humanizeReason(rec) {
  if (rec?.components?.cf >= 0.6) return 'Users with similar preferences chose this option.';
  if (rec?.components?.cb >= 0.6) return 'Matches your travel style and filters very well.';
  if (rec?.components?.pop >= 0.6) return 'Popular among travelers with strong ratings.';
  return 'Based on your activity and similar users.';
}

export function RecommendationCard({ recommendation }) {
  const service = recommendation.service;
  const match = toMatchPercent(recommendation.score);

  return (
    <article className="overflow-hidden rounded-xl border border-mint-200 bg-white shadow-card">
      <div className="h-2 w-full bg-gradient-to-r from-brand via-accent to-mint-300" />
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-xs text-brand">
            <Sparkles size={12} />
            {kindLabel(service?.kind)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
            <TrendingUp size={12} />
            Match {match}%
          </span>
        </div>

        <h3 className="line-clamp-1 text-lg font-semibold text-brand">{service?.title}</h3>
        <p className="line-clamp-2 text-sm text-accent">{service?.description || 'No description available.'}</p>

        <div className="rounded-lg bg-surface p-2 text-xs text-accent">
          <p className="inline-flex items-center gap-1 font-medium text-brand">
            <Lightbulb size={12} />
            Why this recommendation
          </p>
          <p className="mt-1">{humanizeReason(recommendation)}</p>
        </div>

        <div className="flex items-center justify-between border-t border-mint-200 pt-2">
          <p className="text-lg font-semibold text-brand">${Number(service?.price_usd || 0).toFixed(0)}</p>
          <Link to={`/services/${service?.id}`} className="btn-soft px-2 py-1.5 text-xs">
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

