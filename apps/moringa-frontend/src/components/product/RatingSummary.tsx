import { component$ } from "@builder.io/qwik";
import { renderStars } from "../../lib/formatters";

export interface RatingSummaryProps {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export const RatingSummary = component$<RatingSummaryProps>(
  ({ averageRating, reviewCount, ratingBreakdown }) => {
    return (
      <div class="rounded-[1.5rem] bg-[var(--bg-primary)] p-6">
        <p class="text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
          {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
        </p>
        <p class="mt-2 text-lg tracking-[0.1em] text-amber-500 dark:text-amber-300">
          {renderStars(Math.round(averageRating))}
        </p>
        <p class="mt-3 text-sm text-[var(--text-secondary)]">
          Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}.
        </p>

        <div class="mt-6 space-y-3">
          {ratingBreakdown.map((item) => {
            const width =
              reviewCount > 0 ? (item.count / reviewCount) * 100 : 0;

            return (
              <div
                key={item.rating}
                class="grid grid-cols-[52px_1fr_36px] items-center gap-3 text-sm text-[var(--text-secondary)]"
              >
                <span>{item.rating} star</span>
                <div class="h-2 rounded-full bg-[var(--bg-muted)]">
                  <div
                    class="h-2 rounded-full bg-amber-400"
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
  },
);

export default RatingSummary;
