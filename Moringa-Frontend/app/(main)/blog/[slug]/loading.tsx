export default function BlogPostLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
        <div className="animate-pulse rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 shadow-sm">
          <div className="h-72 w-full rounded-t-[2rem] bg-[var(--border-color)]/50 sm:h-96" />
          <div className="mt-8 space-y-4 p-2">
            <div className="h-4 w-32 rounded bg-[var(--border-color)]/50" />
            <div className="h-8 w-3/4 rounded bg-[var(--border-color)]/50" />
            <div className="h-4 w-full rounded bg-[var(--border-color)]/50" />
            <div className="h-4 w-5/6 rounded bg-[var(--border-color)]/50" />
            <div className="h-4 w-2/3 rounded bg-[var(--border-color)]/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
