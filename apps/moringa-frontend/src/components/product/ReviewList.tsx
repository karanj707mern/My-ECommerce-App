import { component$, useSignal, type QRL } from "@builder.io/qwik";
import { formatMediumDate, renderStars } from "../../lib/formatters";

export interface ReviewListProps {
  reviews: Record<string, unknown>[];
  reviewsLoading: boolean;
  isLoggedIn: boolean;
  commentSubmittingId: string | null;
  onCommentChange$: QRL<(reviewId: string, value: string) => void>;
  onCommentSubmit$: QRL<(reviewId: string) => void>;
}

/**
 * Buyer reviews with threaded comments.
 * Port of legacy `components/Product/ReviewList.tsx`.
 */
export const ReviewList = component$<ReviewListProps>(
  ({
    reviews,
    reviewsLoading,
    isLoggedIn,
    commentSubmittingId,
    onCommentChange$,
    onCommentSubmit$,
  }) => {
    const localCommentForms = useSignal<Record<string, string>>({});

    if (reviewsLoading) {
      return (
        <div class="mt-8 rounded-[1.5rem] bg-[var(--bg-primary)] p-6 text-sm text-[var(--text-secondary)]">
          Loading reviews...
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div class="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 text-sm leading-6 text-[var(--text-secondary)]">
          No buyer reviews yet. The first verified purchase review will appear
          here.
        </div>
      );
    }

    return (
      <div class="mt-8 space-y-6">
        {reviews.map((review) => {
          const reviewId = String(review.id);
          return (
            <article
              key={reviewId}
              class="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-6"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="text-lg tracking-[0.15em] text-amber-500 dark:text-amber-300">
                    {renderStars(Number(review.rating))}
                  </p>
                  <h3 class="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    {(review.title as string) || "Verified buyer review"}
                  </h3>
                  <p class="mt-2 text-sm text-[var(--text-muted)]">
                    {String((review.user as Record<string, unknown> | undefined)?.name ?? "")}{" "}
                    on {formatMediumDate(review.createdAt as string)}
                  </p>
                </div>
              </div>

              <p class="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {review.content as string}
              </p>

              <div class="mt-6 border-t border-[var(--border-color)] pt-5">
                <p class="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-200">
                  Comments
                </p>

                {Array.isArray(review.comments) &&
                review.comments.length > 0 ? (
                  <div class="mt-4 space-y-3">
                    {(review.comments as Record<string, unknown>[]).map(
                      (comment) => (
                        <div
                          key={String(comment.id)}
                          class="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm"
                        >
                          <p class="font-medium text-[var(--text-primary)]">
                            {String(
                              (comment.user as Record<string, unknown> | undefined)
                                ?.name ?? "",
                            )}
                          </p>
                          <p class="mt-1 leading-6 text-[var(--text-secondary)]">
                            {comment.content as string}
                          </p>
                          <p class="mt-2 text-sm text-[var(--text-muted)]">
                            {formatMediumDate(comment.createdAt as string)}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p class="mt-4 text-sm text-[var(--text-muted)]">
                    No comments yet.
                  </p>
                )}

                {isLoggedIn ? (
                  <form
                    preventdefault:submit
                    onSubmit$={() => onCommentSubmit$(reviewId)}
                    class="mt-4 flex flex-col gap-3"
                  >
                    <textarea
                      value={localCommentForms.value[reviewId] ?? ""}
                      onInput$={(_, el) => {
                        localCommentForms.value = {
                          ...localCommentForms.value,
                          [reviewId]: el.value,
                        };
                        void onCommentChange$(reviewId, el.value);
                      }}
                      rows={3}
                      placeholder="Add a thoughtful comment to continue the conversation."
                      aria-label="Add a comment"
                      class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={commentSubmittingId === reviewId}
                      class="btn-secondary self-start disabled:cursor-not-allowed disabled:bg-[var(--bg-muted)]"
                    >
                      {commentSubmittingId === reviewId
                        ? "Posting..."
                        : "Post comment"}
                    </button>
                  </form>
                ) : (
                  <p class="mt-4 text-sm text-[var(--text-muted)]">
                    Sign in to join the discussion.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  },
);

export default ReviewList;
