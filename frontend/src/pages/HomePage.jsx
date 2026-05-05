export function HomePage() {
  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">MakeTrip</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Plan your perfect trip
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Frontend baseline is ready. Next prompts will fill this page with real search, recommendations,
          and category sections.
        </p>
      </div>
    </section>
  );
}
