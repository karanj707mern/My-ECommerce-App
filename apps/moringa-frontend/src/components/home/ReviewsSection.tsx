import { component$, useSignal } from "@builder.io/qwik";
import { SmartImage } from "../SmartImage";
import { renderStars } from "../../lib/formatters";
import { resolveImageUrl } from "../../lib/config";

export interface FeaturedReview {
  id: number | string;
  rating: number;
  title?: string | null;
  content: string;
  user?: { name?: string | null } | null;
  product?: { name?: string | null; image?: string | null } | null;
}

/**
 * Qwik port of legacy `components/Home/ReviewsSection.tsx`.
 *
 * One featured review at a time with prev/next navigation, product imagery
 * panel and a friendly empty state.
 */
export const ReviewsSection = component$<{ featuredReviews: FeaturedReview[] }>(
  ({ featuredReviews }) => {
    const reviewIndex = useSignal(0);
    const activeReview = featuredReviews[reviewIndex.value] ?? null;

    return (
      <section
        class="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]"
        aria-labelledby="reviews-heading"
      >
        <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
          <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-base font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                Reviews
              </p>
              <span class="hidden text-emerald-400/60 sm:inline">—</span>
              <h2
                id="reviews-heading"
                class="font-serif text-2xl text-[var(--text-primary)] sm:text-3xl"
              >
                Trusted by the community that values purity
              </h2>
            </div>

            <p class="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
              Real ratings from real buyers help you shop with confidence on
              every visit.
            </p>
          </div>

          <div class="card mx-auto mt-10 max-w-7xl overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-muted)] shadow-xl ring-1 ring-[var(--border-strong)]">
            <div class="p-6 sm:p-10">
              {activeReview ? (
                <article aria-live="polite" aria-atomic="true">
                  <div class="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                    <div class="overflow-hidden rounded-[1.75rem] bg-[var(--bg-secondary)] shadow-sm">
                      <SmartImage
                        src={resolveImageUrl(
                          activeReview.product?.image ?? undefined,
                        )}
                        alt={activeReview.product?.name || "Reviewed product"}
                        width={600}
                        height={450}
                        class="h-60 w-full object-cover"
                      />
                      <div class="space-y-1 bg-[var(--text-primary)]/10 p-5">
                        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
                          Reviewed Product
                        </p>
                        <p class="text-lg font-semibold text-white">
                          {activeReview.product?.name || "Store Product"}
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-col justify-center">
                      <div class="flex items-center gap-3">
                        <p class="text-lg font-semibold tracking-[0.1em] text-amber-500 dark:text-amber-300">
                          {renderStars(Math.round(activeReview.rating))}
                        </p>
                        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {activeReview.rating}/5
                        </span>
                      </div>
                      <h3 class="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                        {activeReview.title || "Customer review"}
                      </h3>
                      <p class="mt-4 text-base leading-7 text-[var(--text-secondary)]">
                        {activeReview.content}
                      </p>
                      <div class="mt-6 flex items-center gap-3 border-t border-[var(--border-color)] pt-4">
                        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-sm font-bold text-white">
                          {activeReview.user?.name?.charAt(0) || "C"}
                        </div>
                        <div>
                          <p class="text-sm font-semibold text-[var(--text-primary)]">
                            {activeReview.user?.name || "Verified customer"}
                          </p>
                          <p class="text-xs text-[var(--text-muted)]">
                            Shared after purchase
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="mt-8 flex items-center justify-between">
                    <p class="text-sm text-[var(--text-secondary)]">
                      Review {reviewIndex.value + 1} of {featuredReviews.length}
                    </p>
                    <div class="flex items-center gap-3">
                      <button
                        type="button"
                        onClick$={() => {
                          reviewIndex.value =
                            (reviewIndex.value - 1 + featuredReviews.length) %
                            featuredReviews.length;
                        }}
                        class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700 dark:text-emerald-300"
                        aria-label="Previous review"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick$={() => {
                          reviewIndex.value =
                            (reviewIndex.value + 1) % featuredReviews.length;
                        }}
                        class="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700 dark:text-emerald-300"
                        aria-label="Next review"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <article
                  class="flex flex-col items-center justify-center py-24 text-center"
                  aria-live="polite"
                >
                  <div class="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-300">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-12 w-12"
                      aria-hidden="true"
                    >
                      <path d="M12 21a9 9 0 1 0-9-9c0 4.965 4.015 9 9 9z" />
                      <path d="M12 7v5l3.5 2.1" />
                    </svg>
                  </div>
                  <h3 class="mt-6 font-serif text-2xl text-[var(--text-primary)]">
                    No reviews yet
                  </h3>
                  <p class="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                    Once buyers rate a product, the latest starred reviews will
                    appear here. Your feedback helps others shop with
                    confidence.
                  </p>
                </article>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  },
);
