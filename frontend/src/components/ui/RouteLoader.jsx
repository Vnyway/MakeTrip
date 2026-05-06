export function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-lg border border-mint-200 bg-white px-4 py-3 text-sm text-accent shadow-card">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
        Checking session...
      </div>
    </div>
  );
}
