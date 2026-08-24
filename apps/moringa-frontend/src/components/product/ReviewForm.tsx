import { component$ } from "@builder.io/qwik";

export interface ReviewFormState {
  rating: number;
  title: string;
  content: string;
}

export interface ReviewFormProps {
  canReview: boolean;
  reason: string;
  isLoggedIn: boolean;
  reviewForm: ReviewFormState;
  submittingReview: boolean;
  reviewError: string;
  onFieldChange$: QRL<(field: "rating" | "title" | "content", value: string) => void>;
  onSubmit$: QRL<() => void>;
}

import type { QRL } from "@builder.io/qwik";

/**
 * Star-rating + headline + body form for posting a product review.
 * Port of legacy `components/Product/ReviewForm.tsx`.
 */
export const ReviewForm = component$<ReviewFormProps>(
  ({
    canReview,
    reason,
    isLoggedIn,
    reviewForm,
    submittingReview,
    reviewError,
    onFieldChange$,
    onSubmit$,
  }) => {
    return (
      <>
        <div class="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-5">
          <p class="text-base font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]">
            Write a review
          </p>
          <p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            {reason}
          </p>
        </div>

        {isLoggedIn && canReview ? (
          <form
            preventdefault:submit
            onSubmit$={onSubmit$}
            class="mt-6 space-y-4"
          >
            <label class="block text-sm font-medium text-[var(--text-secondary)]">
              Star rating
              <select
                value={String(reviewForm.rating)}
                onChange$={(_, el) => onFieldChange$("rating", el.value)}
                class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={String(rating)}>
                    {`${rating} star${rating === 1 ? "" : "s"}`}
                  </option>
                ))}
              </select>
            </label>

            <input
              placeholder="Short headline"
              aria-label="Review title"
              value={reviewForm.title}
              onInput$={(_, el) => onFieldChange$("title", el.value)}
              class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />

            <div>
              <label
                for="reviewContent"
                class="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Your review
              </label>
              <textarea
                id="reviewContent"
                placeholder="Share what you liked, what stood out, and how you used it."
                value={reviewForm.content}
                onInput$={(_, el) => onFieldChange$("content", el.value)}
                rows={5}
                class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              class="btn-admin"
            >
              {submittingReview ? "Posting review..." : "Post review"}
            </button>
          </form>
        ) : null}

        {reviewError ? (
          <div
            class="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
            role="alert"
          >
            {reviewError}
          </div>
        ) : null}
      </>
    );
  },
);

export default ReviewForm;
