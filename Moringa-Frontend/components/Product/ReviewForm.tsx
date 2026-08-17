"use client";

export interface ReviewFormProps {
  canReview: boolean;
  reason: string;
  isLoggedIn: boolean;
  reviewForm: {
    rating: number;
    title: string;
    content: string;
  };
  submittingReview: boolean;
  reviewError: string;
  onFormChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export default function ReviewForm({
  canReview,
  reason,
  isLoggedIn,
  reviewForm,
  submittingReview,
  reviewError,
  onFormChange,
  onSubmit,
}: ReviewFormProps) {
  return (
    <>
      <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-5">
        <p className="text-base font-semibold uppercase tracking-[0.1em] text-[var(--text-primary)]">
          Write a review
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {reason}
        </p>
      </div>

      {isLoggedIn && canReview ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Star rating
            <select
              name="rating"
              value={reviewForm.rating}
              onChange={onFormChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} star{rating === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>

          <input
            name="title"
            placeholder="Short headline"
            aria-label="Review title"
            value={reviewForm.title}
            onChange={onFormChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />

          <div>
            <label
              htmlFor="reviewContent"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              Your review
            </label>
            <textarea
              id="reviewContent"
              name="content"
              placeholder="Share what you liked, what stood out, and how you used it."
              value={reviewForm.content}
              onChange={onFormChange}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingReview}
            className="btn-admin"
          >
            {submittingReview ? "Posting review..." : "Post review"}
          </button>
        </form>
      ) : null}

      {reviewError ? (
        <div className="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
          {reviewError}
        </div>
      ) : null}
    </>
  );
}
