export function RecommendationBlock({ title = 'Recommended for You' }) {
  return (
    <section className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
      <h2 className="text-lg font-semibold text-brand">{title}</h2>
      <p className="mt-1 text-sm text-accent">
        Recommendation module container. Dynamic recommendation items will be connected in the next step.
      </p>
    </section>
  );
}
