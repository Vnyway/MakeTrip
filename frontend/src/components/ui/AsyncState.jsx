import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-mint-200 bg-white p-8 text-sm text-accent shadow-card">
      <span className="inline-flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        {message}
      </span>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-600 shadow-card">
      <span className="inline-flex items-center gap-2">
        <AlertCircle size={16} />
        {message}
      </span>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-mint-200 bg-white p-8 text-center shadow-card">
      <Inbox size={34} className="mx-auto text-accent" />
      <h2 className="mt-3 text-xl font-semibold text-brand">{title}</h2>
      <p className="mt-2 text-sm text-accent">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

