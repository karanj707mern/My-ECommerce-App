"use client";

import { useState } from "react";
import { formatMediumDate, renderStars } from "@/lib/formatters";

export interface ReviewListProps {
  reviews: Record<string, unknown>[];
  reviewsLoading: boolean;
  isLoggedIn: boolean;
  commentSubmittingId: string | null;
  commentForms: Record<string, string>;
  onCommentFormChange: (reviewId: string, value: string) => void;
  onCommentSubmit: (event: React.FormEvent, reviewId: string) => void;
  productId: string;
}

export default function ReviewList({
  reviews,
  reviewsLoading,
  isLoggedIn,
  commentSubmittingId,
  commentForms,
  onCommentFormChange,
  onCommentSubmit,
  productId,
}: ReviewListProps) {
  const [localCommentForms, setLocalCommentForms] =
    useState<Record<string, string>>(commentForms);

  const handleLocalCommentChange = (reviewId: string, value: string) => {
    setLocalCommentForms((current) => ({
      ...current,
      [reviewId]: value,
    }));
    onCommentFormChange(reviewId, value);
  };

  const handleLocalCommentSubmit = (
    event: React.FormEvent,
    reviewId: string,
  ) => {
    event.preventDefault();
    const content = localCommentForms[reviewId]?.trim();
    if (!content) {
      return;
    }
    void onCommentSubmit(event, reviewId);
    setLocalCommentForms((current) => ({
      ...current,
      [reviewId]: "",
    }));
  };

  if (reviewsLoading) {
    return (
      <div className="mt-8 rounded-[1.5rem] bg-[var(--bg-primary)] p-6 text-sm text-[var(--text-secondary)]">
        Loading reviews...
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 text-sm leading-6 text-[var(--text-secondary)]">
        No buyer reviews yet. The first verified purchase review will appear
        here.
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {reviews.map((review) => (
        <article
          key={review.id as string | number}
          className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg tracking-[0.15em] text-amber-500 dark:text-amber-300">
                {renderStars(review.rating as number)}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                {(review.title as string) || "Verified buyer review"}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {(review.user as Record<string, unknown>)?.name as string} on{" "}
                {formatMediumDate(review.createdAt as string)}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            {review.content as string}
          </p>

          <div className="mt-6 border-t border-[var(--border-color)] pt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-200">
              Comments
            </p>

            {Array.isArray(review.comments) && review.comments.length > 0 ? (
              <div className="mt-4 space-y-3">
                {(review.comments as Record<string, unknown>[]).map(
                  (comment) => (
                    <div
                      key={comment.id as string | number}
                      className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm"
                    >
                      <p className="font-medium text-[var(--text-primary)]">
                        {
                          (comment.user as Record<string, unknown>)
                            ?.name as string
                        }
                      </p>
                      <p className="mt-1 leading-6 text-[var(--text-secondary)]">
                        {comment.content as string}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {formatMediumDate(comment.createdAt as string)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                No comments yet.
              </p>
            )}

            {isLoggedIn ? (
              <form
                onSubmit={(event) =>
                  handleLocalCommentSubmit(event, review.id as string)
                }
                className="mt-4 flex flex-col gap-3"
              >
                <textarea
                  value={localCommentForms[review.id as string] || ""}
                  onChange={(event) =>
                    handleLocalCommentChange(
                      review.id as string,
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Add a thoughtful comment to continue the conversation."
                  aria-label="Add a comment"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={commentSubmittingId === (review.id as string)}
                  className="btn-secondary self-start disabled:cursor-not-allowed disabled:bg-[var(--bg-muted)]"
                >
                  {commentSubmittingId === (review.id as string)
                    ? "Posting..."
                    : "Post comment"}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Sign in to join the discussion.
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
