export function PageShell({ title, description }) {
  return (
    <section className="space-y-4 rounded-2xl border border-mint-200 bg-surface p-6 shadow-card">
      <h1 className="text-2xl font-bold tracking-tight text-brand">{title}</h1>
      <p className="text-accent">{description}</p>
    </section>
  );
}
