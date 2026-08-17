"use client";

import { renderStars } from "@/lib/formatters";

export interface RatingSummaryProps {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export default function RatingSummary({
  averageRating,
  reviewCount,
  ratingBreakdown,
}: RatingSummaryProps) {
  return (
    <div className="rounded-[1.5rem] bg-[var(--bg-primary)] p-6">
      <p className="text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
        {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
      </p>
      <p className="mt-2 text-lg tracking-[0.1em] text-amber-500 dark:text-amber-300">
        {renderStars(Math.round(averageRating))}
      </p>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}.
      </p>

      <div className="mt-6 space-y-3">
        {ratingBreakdown.map((item) => {
          const width = reviewCount > 0 ? (item.count / reviewCount) * 100 : 0;

          return (
            <div
              key={item.rating}
              className="grid grid-cols-[52px_1fr_36px] items-center gap-3 text-sm text-[var(--text-secondary)]"
            >
              <span>{item.rating} star</span>
              <div className="h-2 rounded-full bg-[var(--bg-muted)]">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span>{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
