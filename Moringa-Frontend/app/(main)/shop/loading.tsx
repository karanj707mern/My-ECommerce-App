export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="h-32 rounded-[2rem] bg-gradient-to-r from-emerald-900 to-emerald-700 animate-pulse" />
        <div className="mt-8 grid animate-pulse gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
            >
              <div className="h-60 w-full bg-[var(--border-color)]/50" />
              <div className="space-y-3 p-6">
                <div className="h-4 w-1/3 rounded bg-[var(--border-color)]/50" />
                <div className="h-6 w-3/4 rounded bg-[var(--border-color)]/50" />
                <div className="h-4 w-full rounded bg-[var(--border-color)]/50" />
                <div className="h-10 w-1/2 rounded-full bg-emerald-900/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
