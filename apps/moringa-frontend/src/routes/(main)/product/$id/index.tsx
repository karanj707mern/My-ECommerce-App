import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import {
  Link,
  useLocation,
  useNavigate,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import ProductDetailsInfo from "../../../../components/product/ProductDetailsInfo";
import RatingSummary from "../../../../components/product/RatingSummary";
import ReviewForm, {
  type ReviewFormState,
} from "../../../../components/product/ReviewForm";
import ReviewList from "../../../../components/product/ReviewList";
import { addCartItem, getCart } from "../../../../lib/api/cart";
import { getProduct } from "../../../../lib/api/product";
import {
  createReview,
  createReviewComment,
  getProductReviews,
  getReviewEligibility,
} from "../../../../lib/api/review";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../../../../lib/api/wishlist";
import {
  notifyCartChanged,
  notifyWishlistChanged,
} from "../../../../lib/storage";
import { resolveImageUrl } from "../../../../lib/config";
import { API_BASE_URL } from "../../../../lib/config";
import { useToast } from "../../../../hooks/useToast";
import { useAutoDismiss } from "../../../../hooks/useAutoDismiss";
import { useAuthState } from "../../../../hooks/useAuthState";
import { useProductViewers } from "../../../../hooks/useProductViewers";
import { getSiteUrl } from "../../../../lib/seo";
import type { Product } from "../../../../lib/types";

export interface ReviewSummaryData {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: { rating: number; count: number }[];
}

export interface ReviewsPayload {
  summary: ReviewSummaryData;
  reviews: Record<string, unknown>[];
}

async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/product/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null;
  }
}

async function fetchReviews(id: string): Promise<ReviewsPayload | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/review/product/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as ReviewsPayload;
  } catch {
    return null;
  }
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const useProductData = routeLoader$(async ({ params }) => {
  const [product, reviews] = await Promise.all([
    fetchProduct(params.id),
    fetchReviews(params.id),
  ]);

  return { product, reviews };
});

/**
 * Qwik port of the legacy product detail page
 * (`page.tsx` + `ProductDetailsClient.tsx`) with JSON-LD structured data.
 */
export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const data = useProductData();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();

  const id = loc.params.id;

  const wishlist = useSignal<Record<string, boolean>>({});
  const addingToCartId = useSignal<string | number | null>(null);
  const reviewError = useSignal("");
  const reviewsLoading = useSignal(false);
  const submittingReview = useSignal(false);
  const commentSubmittingId = useSignal<string | null>(null);

  const reviewSummary = useSignal<ReviewSummaryData>(
    data.value.reviews?.summary ?? {
      averageRating: 0,
      reviewCount: 0,
      ratingBreakdown: [],
    },
  );
  const reviews = useSignal<Record<string, unknown>[]>(
    data.value.reviews?.reviews ?? [],
  );

  const reviewEligibility = useSignal({
    canReview: false,
    hasReviewed: false,
    reason: "Sign in to review this product.",
  });

  const reviewForm = useSignal<ReviewFormState>({
    rating: 5,
    title: "",
    content: "",
  });

  const commentForms = useSignal<Record<string, string>>({});

  const isLoggedIn = !!currentUser.value;
  const isAdmin = currentUser.value?.role === "ADMIN";

  const viewers = useProductViewers(id);

  useAutoDismiss(reviewError, $(() => { reviewError.value = ""; }), 5000);

  const loadReviews = $(async (productId: string) => {
    try {
      reviewsLoading.value = true;
      const payload = (await getProductReviews(productId)) as ReviewsPayload;
      reviewSummary.value = payload.summary;
      reviews.value = payload.reviews as Record<string, unknown>[];
      reviewError.value = "";
    } catch (err) {
      reviewError.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load product reviews.";
    } finally {
      reviewsLoading.value = false;
    }
  });

  useVisibleTask$(async ({ track }) => {
    const checked = track(authChecked);
    if (!checked) return;

    const admin = currentUser.value?.role === "ADMIN";

    if (admin) {
      wishlist.value = {};
      return;
    }

    getCart().catch(() => {});

    getWishlist()
      .then((items) => {
        const next: Record<string, boolean> = {};
        for (const item of items as Record<string, unknown>[]) {
          next[String(item.id)] = true;
        }
        wishlist.value = next;
      })
      .catch(() => {
        wishlist.value = {};
      });
  });

  useVisibleTask$(async ({ track }) => {
    const checked = track(authChecked);
    if (!checked) return;

    if (!currentUser.value) {
      reviewEligibility.value = {
        canReview: false,
        hasReviewed: false,
        reason: "Sign in to review this product.",
      };
      return;
    }

    getReviewEligibility(id)
      .then((eligibility) =>
        reviewEligibility.value = eligibility as typeof reviewEligibility.value,
      )
      .catch(() => {
        reviewEligibility.value = {
          canReview: false,
          hasReviewed: false,
          reason: "We could not confirm review eligibility right now.",
        };
      });
  });

  const handleAddToCart = $(async () => {
    const product = data.value.product;
    if (!product) return;

    if (isAdmin) {
      void toast.showToast({
        severity: "error",
        summary: "Not allowed",
        detail: "Admin accounts cannot add products to cart or place orders.",
        life: 4000,
      });
      return;
    }

    const productId = product.id as string | number;
    if (addingToCartId.value === productId) return;

    addingToCartId.value = productId;
    try {
      await addCartItem(productId);
      notifyCartChanged();
      await toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name} was added to your cart.`,
        life: 3000,
      });
    } catch (err) {
      await toast.showToast({
        severity: "error",
        summary: "Cart error",
        detail:
          err instanceof Error && err.message
            ? err.message
            : "Could not add item to cart.",
        life: 4000,
      });
    } finally {
      addingToCartId.value = null;
    }
  });

  const handleToggleWishlist = $(async () => {
    const product = data.value.product;
    if (!product || isAdmin) return;

    const productId = String(product.id);
    const isWishlisted = !!wishlist.value[productId];

    try {
      if (isWishlisted) {
        await removeFromWishlist(productId);
        const next = { ...wishlist.value };
        delete next[productId];
        wishlist.value = next;
        notifyWishlistChanged();
        await toast.showToast({
          severity: "info",
          summary: "Removed",
          detail: "Removed from your wishlist.",
          life: 2500,
        });
      } else {
        await addToWishlist(productId);
        wishlist.value = { ...wishlist.value, [productId]: true };
        notifyWishlistChanged();
        await toast.showToast({
          severity: "success",
          summary: "Saved",
          detail: "Added to your wishlist.",
          life: 2500,
        });
      }
    } catch (err) {
      await toast.showToast({
        severity: "error",
        summary: "Wishlist error",
        detail:
          err instanceof Error && err.message
            ? err.message
            : "Could not update your wishlist.",
        life: 4000,
      });
    }
  });

  const handleReviewSubmit = $(async () => {
    submittingReview.value = true;
    reviewError.value = "";

    try {
      await createReview(id, { ...reviewForm.value });
      reviewForm.value = { rating: 5, title: "", content: "" };
      reviewError.value = "";
      await loadReviews(id);
      if (currentUser.value) {
        try {
          const eligibility = await getReviewEligibility(id);
          reviewEligibility.value =
            eligibility as typeof reviewEligibility.value;
        } catch {
          // keep current eligibility on refresh failure
        }
      }
      await toast.showToast({
        severity: "success",
        summary: "Review posted",
        detail: "Your review was posted successfully.",
        life: 3000,
      });
    } catch (err) {
      reviewError.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not post your review.";
    } finally {
      submittingReview.value = false;
    }
  });

  const handleCommentSubmit = $(async (reviewId: string) => {
    const content = commentForms.value[reviewId]?.trim();
    if (!content) return;

    commentSubmittingId.value = reviewId;
    reviewError.value = "";

    try {
      const newComment = (await createReviewComment(reviewId, {
        content,
      })) as Record<string, unknown>;
      reviews.value = reviews.value.map((review) =>
        String(review.id) === reviewId
          ? {
              ...review,
              comments: [
                ...((review.comments as Record<string, unknown>[]) ?? []),
                newComment,
              ],
            }
          : review,
      );
      commentForms.value = { ...commentForms.value, [reviewId]: "" };
    } catch (err) {
      reviewError.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not post your comment.";
    } finally {
      commentSubmittingId.value = null;
    }
  });

  const product = data.value.product;

  /* JSON-LD structured data (breadcrumb + product). */
  const siteUrl = getSiteUrl();
  const productImage = product?.image
    ? /^https?:\/\//.test(product.image)
      ? product.image
      : undefined
    : undefined;
  const resolvedImage = product?.image ? resolveImageUrl(product.image) : "";

  const averageRating = Number(reviewSummary.value.averageRating) || 0;
  const reviewCount = Number(reviewSummary.value.reviewCount) || 0;

  const breadcrumbJsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: product?.name || "Product",
        item: `${siteUrl}/product/${id}`,
      },
    ],
  });

  const productJsonLd = product
    ? serializeJsonLd({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.seoDescription || product.description,
        ...(resolvedImage ? { image: resolvedImage } : {}),
        ...(product.sku ? { sku: product.sku } : {}),
        ...(product.brand
          ? { brand: { "@type": "Brand", name: product.brand } }
          : {}),
        offers: {
          "@type": "Offer",
          url: `${siteUrl}/product/${id}`,
          price: product.price,
          priceCurrency: "INR",
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
        ...(averageRating > 0 && reviewCount > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: averageRating.toFixed(1),
                reviewCount,
                bestRating: "5",
                worstRating: "1",
              },
            }
          : {}),
      })
    : "";

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <nav aria-label="Breadcrumb" class="mb-6">
            <ol class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <li>
                <Link
                  href="/"
                  class="transition hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/shop"
                  class="transition hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Shop
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                class="font-medium text-[var(--text-primary)]"
                aria-current="page"
              >
                {product?.name || "Product"}
              </li>
            </ol>
          </nav>

          <button
            type="button"
            onClick$={() => nav(-1)}
            class="btn-secondary mb-8"
          >
            Back
          </button>

          {product ? (
            <div class="space-y-8">
              {viewers.connected.value && viewers.viewers.value > 0 ? (
                <div class="mb-4 flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-secondary)] shadow-sm">
                  <span class="relative flex h-2 w-2">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>
                    {viewers.viewers.value} person
                    {viewers.viewers.value !== 1 ? "s" : ""} viewing this
                    product
                  </span>
                </div>
              ) : null}

              <ProductDetailsInfo
                product={product}
                reviewSummary={reviewSummary.value}
                isAdmin={isAdmin}
                isAddingToCart={addingToCartId.value === product.id}
                isWishlisted={!!wishlist.value[String(product.id)]}
                onAddToCart$={handleAddToCart}
                onToggleWishlist$={handleToggleWishlist}
              />

              <section class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div class="card rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
                  <p class="text-base font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                    Customer Ratings
                  </p>
                  <h2 class="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Honest buyer feedback
                  </h2>

                  <RatingSummary
                    averageRating={reviewSummary.value.averageRating}
                    reviewCount={reviewSummary.value.reviewCount}
                    ratingBreakdown={reviewSummary.value.ratingBreakdown}
                  />

                  <ReviewForm
                    canReview={reviewEligibility.value.canReview}
                    reason={reviewEligibility.value.reason}
                    isLoggedIn={isLoggedIn}
                    reviewForm={reviewForm.value}
                    submittingReview={submittingReview.value}
                    reviewError={reviewError.value}
                    onFieldChange$={(field, value) => {
                      reviewForm.value = {
                        ...reviewForm.value,
                        [field]:
                          field === "rating" ? Number(value) || 5 : value,
                      };
                    }}
                    onSubmit$={handleReviewSubmit}
                  />
                </div>

                <div class="card rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
                  <p class="text-base font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-200">
                    Reviews and Comments
                  </p>
                  <h2 class="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Community conversation
                  </h2>

                  <ReviewList
                    reviews={reviews.value}
                    reviewsLoading={reviewsLoading.value}
                    isLoggedIn={isLoggedIn}
                    commentSubmittingId={commentSubmittingId.value}
                    onCommentChange$={(reviewId, value) => {
                      commentForms.value = {
                        ...commentForms.value,
                        [reviewId]: value,
                      };
                    }}
                    onCommentSubmit$={handleCommentSubmit}
                  />
                </div>
              </section>
            </div>
          ) : (
            <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center shadow-sm sm:p-10">
              <h1 class="font-serif text-3xl text-[var(--text-primary)]">
                Product not found
              </h1>
              <p class="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                This item could not be loaded, or it may have been removed.
              </p>
              <Link href="/" class="btn-primary mt-6 inline-flex">
                Return to store
              </Link>
            </div>
          )}
        </div>
      </main>

      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={productJsonLd}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={breadcrumbJsonLd}
      />
      {productImage ? null : null}
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const { product } = resolveValue(useProductData);
  const siteUrl = getSiteUrl();

  if (!product) {
    return {
      title: "Product not found",
      meta: [{ name: "robots", content: "noindex" }],
    };
  }

  const title = product.seoTitle || product.name || "Product";
  const description = product.seoDescription || product.description || "";
  const image = product.image
    ? /^https?:\/\//.test(product.image)
      ? product.image
      : `${siteUrl}${product.image}`
    : undefined;

  return {
    title,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${siteUrl}/product/${product.id}` },
      ...(image ? [{ property: "og:image", content: image }] : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(image ? [{ name: "twitter:image", content: image }] : []),
    ],
    links: [
      { rel: "canonical", href: `${siteUrl}/product/${product.id}` },
    ],
  };
};
