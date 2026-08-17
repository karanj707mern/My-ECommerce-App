import ProductCardSkeleton from "@/components/ProductCardSkeleton";

export default function MainLoading() {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="w-full px-4 py-14 sm:px-6 lg:px-10">
        <div className="grid animate-pulse gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-emerald-900/90 p-10" />
          <div className="grid gap-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 card">
            <div className="h-8 w-24 rounded bg-[var(--border-color)]/50" />
            <div className="h-6 w-40 rounded bg-[var(--border-color)]/50" />
            <div className="h-6 w-32 rounded bg-[var(--border-color)]/50" />
          </div>
        </div>

        <div className="mt-10">
          <div className="h-8 w-48 rounded bg-[var(--border-color)]/50" />
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="mt-14">
          <div className="h-8 w-48 rounded bg-[var(--border-color)]/50" />
          <div className="mt-6 flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-72 w-72 shrink-0 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
              >
                <div className="h-full w-full bg-[var(--border-color)]/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
