export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="mt-8 grid animate-pulse gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[420px] rounded-[2.5rem] bg-[var(--border-color)]/50" />
          <div className="space-y-4 rounded-[2.5rem] bg-[var(--bg-secondary)] p-8 shadow-sm">
            <div className="h-4 w-24 rounded bg-[var(--border-color)]/50" />
            <div className="h-8 w-3/4 rounded bg-[var(--border-color)]/50" />
            <div className="h-4 w-1/2 rounded bg-[var(--border-color)]/50" />
            <div className="mt-6 h-24 rounded-[1.5rem] bg-[var(--bg-muted)]" />
            <div className="h-12 w-40 rounded-full bg-emerald-900/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
