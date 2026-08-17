export default function HomeLoading() {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)]">
      <div className="w-full px-4 py-14 sm:px-6 lg:px-10">
        <div className="grid animate-pulse gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-emerald-900/90 p-10" />
          <div className="grid gap-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 card">
            <div className="h-8 w-24 rounded bg-[var(--border-color)]/50" />
            <div className="h-6 w-40 rounded bg-[var(--border-color)]/50" />
            <div className="h-6 w-32 rounded bg-[var(--border-color)]/50" />
          </div>
        </div>
        <div className="mt-10 grid animate-pulse gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
            >
              <div className="h-56 w-full bg-[var(--border-color)]/50" />
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
