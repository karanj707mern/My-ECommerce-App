"use client";

import useAutoDismiss from "@/hooks/useAutoDismiss";
import { useToast } from "@/hooks/useToast";
import { addCartItem, getCart } from "@/lib/api/cart";
import { getProduct } from "@/lib/api/product";
import {
  createReview,
  createReviewComment,
  getProductReviews,
  getReviewEligibility,
} from "@/lib/api/review";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "@/lib/api/wishlist";
import { useAuthChecked, useCurrentUser } from "@/lib/storage";
import { notifyCartChanged } from "@/lib/storage";
import { useProductViewers } from "@/app/hooks/useProductViewers";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";

import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import dynamic from "next/dynamic";

const RatingSummary = dynamic(
  () => import("@/components/Product/RatingSummary"),
  { ssr: false },
);
const ReviewForm = dynamic(() => import("@/components/Product/ReviewForm"), {
  ssr: false,
});
const ReviewList = dynamic(() => import("@/components/Product/ReviewList"), {
  ssr: false,
});

export interface ProductDetailsProps {
  product?: Product | null;
  initialReviews?: {
    summary: {
      averageRating: number;
      reviewCount: number;
      ratingBreakdown: { rating: number; count: number }[];
    };
    reviews: Record<string, unknown>[];
  } | null;
}

export default function ProductDetailsPage({
  product: initialProduct,
  initialReviews,
}: ProductDetailsProps) {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(
    initialProduct ?? null,
  );
  const [wishlist, setWishlist] = useState<Record<string | number, boolean>>(
    {},
  );
  const [addingToCartId, setAddingToCartId] = useState<string | number | null>(
    null,
  );
  const [reviewError, setReviewError] = useState("");
  const [loading, setLoading] = useState(!initialProduct);
  const [reviewsLoading, setReviewsLoading] = useState(!initialReviews);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [commentSubmittingId, setCommentSubmittingId] = useState<string | null>(
    null,
  );
  const [reviewSummary, setReviewSummary] = useState(
    initialReviews?.summary ?? {
      averageRating: 0,
      reviewCount: 0,
      ratingBreakdown: [] as { rating: number; count: number }[],
    },
  );
  const [reviews, setReviews] = useState<Record<string, unknown>[]>(
    initialReviews?.reviews ?? [],
  );
  const [reviewEligibility, setReviewEligibility] = useState({
    canReview: false,
    hasReviewed: false,
    reason: "Sign in to review this product.",
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    content: "",
  });
  const [commentForms, setCommentForms] = useState<Record<string, string>>({});
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const isLoggedIn = Boolean(currentUser);

  const isAdmin = currentUser?.role === "ADMIN";
  const viewers = useProductViewers(id);
  const toast = useToast();
  const mountedRef = useRef(true);

  useAutoDismiss(reviewError, () => setReviewError(""), 5000);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadReviews = async (productId: string) => {
    try {
      setReviewsLoading(true);
      const reviewData = (await getProductReviews(productId)) as {
        summary: {
          averageRating: number;
          reviewCount: number;
          ratingBreakdown: { rating: number; count: number }[];
        };
        reviews: Record<string, unknown>[];
      };
      setReviewSummary(reviewData.summary);
      setReviews(reviewData.reviews);
      setReviewError("");
    } catch (err) {
      setReviewError(
        (err as Error).message || "Could not load product reviews.",
      );
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProduct) {
      setProduct(
        !isAdmin && initialProduct?.isActive === false ? null : initialProduct,
      );
      setLoading(false);
    } else {
      getProduct(id)
        .then((data) => {
          const productData = data as Product;
          setProduct(
            !isAdmin && productData?.isActive === false ? null : productData,
          );
        })
        .catch((err) => {
          toast.showToast({
            severity: "error",
            summary: "Product error",
            detail: (err as Error).message || "Could not load product.",
            life: 4000,
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }

    if (initialReviews) {
      setReviewSummary(initialReviews.summary);
      setReviews(initialReviews.reviews);
      setReviewsLoading(false);
    } else {
      loadReviews(id);
    }
  }, [id, isAdmin, initialProduct, initialReviews, toast]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (isAdmin) {
      setWishlist({});
      return;
    }

    getCart()
      .then(() => {})
      .catch(() => {});

    getWishlist()
      .then((items) => {
        const next: Record<string | number, boolean> = {};
        for (const item of items as Record<string, unknown>[]) {
          next[item.id as string | number] = true;
        }
        setWishlist(next);
      })
      .catch(() => {
        setWishlist({});
      });
  }, [authChecked, isAdmin]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (!isLoggedIn) {
      setReviewEligibility({
        canReview: false,
        hasReviewed: false,
        reason: "Sign in to review this product.",
      });
      return;
    }

    getReviewEligibility(id)
      .then((data) => {
        setReviewEligibility(
          data as { canReview: boolean; hasReviewed: boolean; reason: string },
        );
      })
      .catch(() => {
        setReviewEligibility({
          canReview: false,
          hasReviewed: false,
          reason: "We could not confirm review eligibility right now.",
        });
      });
  }, [authChecked, id, isLoggedIn]);

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    if (isAdmin) {
      toast.showToast({
        severity: "error",
        summary: "Not allowed",
        detail: "Admin accounts cannot add products to cart or place orders.",
        life: 4000,
      });
      return;
    }

    const productId = product.id as string | number;
    if (addingToCartId === productId) {
      return;
    }

    setAddingToCartId(productId);
    try {
      const _updatedCart = await addCartItem(productId);
      notifyCartChanged();
      toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name} was added to your cart.`,
        life: 3000,
      });
    } catch (err) {
      toast.showToast({
        severity: "error",
        summary: "Cart error",
        detail: (err as Error).message || "Could not add item to cart.",
        life: 4000,
      });
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) {
      return;
    }

    if (isAdmin) {
      return;
    }

    const productId = product.id as string | number;
    const isWishlisted = Boolean(wishlist[productId]);

    try {
      if (isWishlisted) {
        await removeFromWishlist(productId);
        if (mountedRef.current) {
          setWishlist((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
          });
          toast.showToast({
            severity: "info",
            summary: "Removed",
            detail: "Removed from your wishlist.",
            life: 2500,
          });
        }
      } else {
        await addToWishlist(productId);
        if (mountedRef.current) {
          setWishlist((prev) => ({ ...prev, [productId]: true }));
          toast.showToast({
            severity: "success",
            summary: "Saved",
            detail: "Added to your wishlist.",
            life: 2500,
          });
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.showToast({
          severity: "error",
          summary: "Wishlist error",
          detail:
            (error as Error)?.message || "Could not update your wishlist.",
          life: 4000,
        });
      }
    }
  };

  const handleReviewFormChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setReviewForm((currentForm) => ({
      ...currentForm,
      [name]: name === "rating" ? Number(value) : value,
    }));
  };

  const handleCommentFormChange = (reviewId: string, value: string) => {
    setCommentForms((currentForms) => ({
      ...currentForms,
      [reviewId]: value,
    }));
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittingReview(true);
    setReviewError("");

    try {
      await createReview(id, reviewForm);
      setReviewForm({
        rating: 5,
        title: "",
        content: "",
      });
      setReviewError("");
      await loadReviews(id);
      if (isLoggedIn) {
        const eligibility = await getReviewEligibility(id);
        setReviewEligibility(
          eligibility as {
            canReview: boolean;
            hasReviewed: boolean;
            reason: string;
          },
        );
      }
      toast.showToast({
        severity: "success",
        summary: "Review posted",
        detail: "Your review was posted successfully.",
        life: 3000,
      });
    } catch (err) {
      setReviewError((err as Error).message || "Could not post your review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCommentSubmit = async (
    event: React.FormEvent,
    reviewId: string,
  ) => {
    event.preventDefault();
    const content = commentForms[reviewId]?.trim();

    if (!content) {
      return;
    }

    setCommentSubmittingId(reviewId);
    setReviewError("");

    try {
      const newComment = (await createReviewComment(reviewId, {
        content,
      })) as Record<string, unknown>;
      setReviews((currentReviews) =>
        currentReviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                comments: [
                  ...((review.comments as Record<string, unknown>[]) || []),
                  newComment,
                ],
              }
            : review,
        ),
      );
      setCommentForms((currentForms) => ({
        ...currentForms,
        [reviewId]: "",
      }));
    } catch (err) {
      setReviewError((err as Error).message || "Could not post your comment.");
    } finally {
      setCommentSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <li>
                <Link
                  href="/"
                  className="transition hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/shop"
                  className="transition hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Shop
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                className="font-medium text-[var(--text-primary)]"
                aria-current="page"
              >
                {product?.name || "Product"}
              </li>
            </ol>
          </nav>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary mb-8"
          >
            Back
          </button>

          {loading ? (
            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              Loading product...
            </div>
          ) : product ? (
            <div className="space-y-8">
              {viewers.connected && viewers.viewers > 0 ? (
                <div className="mb-4 flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-secondary)] shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>
                    {viewers.viewers} person{viewers.viewers !== 1 ? "s" : ""}{" "}
                    viewing this product
                  </span>
                </div>
              ) : null}
              <ProductDetailsInfo
                product={product}
                reviewSummary={reviewSummary}
                isAdmin={isAdmin}
                isAddingToCart={
                  addingToCartId === (product.id as string | number)
                }
                isWishlisted={Boolean(wishlist[product.id as string | number])}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
              />

              <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
                  <p className="text-base font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                    Customer Ratings
                  </p>
                  <h2 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Honest buyer feedback
                  </h2>
                  <RatingSummary
                    averageRating={reviewSummary.averageRating as number}
                    reviewCount={reviewSummary.reviewCount as number}
                    ratingBreakdown={
                      reviewSummary.ratingBreakdown as {
                        rating: number;
                        count: number;
                      }[]
                    }
                  />

                  <ReviewForm
                    canReview={reviewEligibility.canReview}
                    reason={reviewEligibility.reason}
                    isLoggedIn={isLoggedIn}
                    reviewForm={reviewForm}
                    submittingReview={submittingReview}
                    reviewError={reviewError}
                    onFormChange={handleReviewFormChange}
                    onSubmit={handleReviewSubmit}
                  />
                </div>

                <div className="rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
                  <p className="text-base font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                    Reviews and Comments
                  </p>
                  <h2 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Community conversation
                  </h2>

                  <ReviewList
                    reviews={reviews}
                    reviewsLoading={reviewsLoading}
                    isLoggedIn={isLoggedIn}
                    commentSubmittingId={commentSubmittingId}
                    commentForms={commentForms}
                    onCommentFormChange={handleCommentFormChange}
                    onCommentSubmit={handleCommentSubmit}
                    productId={id}
                  />
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center shadow-sm sm:p-10 card">
              <h1 className="font-serif text-3xl text-[var(--text-primary)]">
                Product not found
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                This item could not be loaded, or it may have been removed.
              </p>
              <Link href="/" className="btn-primary mt-6">
                Return to store
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
