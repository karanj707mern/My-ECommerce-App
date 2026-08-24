import { component$, type PropFunction } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Product } from "../../lib/types";
import { formatRupees, normalizePrice, renderStars } from "../../lib/formatters";
import { resolveImageUrl } from "../../lib/config";
import { SmartImage } from "../SmartImage";

export interface ProductDetailsInfoProps {
  product: Product;
  reviewSummary: {
    averageRating: number;
    reviewCount: number;
  };
  isAdmin: boolean;
  isAddingToCart: boolean;
  isWishlisted: boolean;
  onAddToCart$: PropFunction<() => void>;
  onToggleWishlist$: PropFunction<() => void>;
}

const HIGHLIGHTS = [
  "Easy to enjoy as part of a calm daily routine",
  "Simple to mix into smoothies, juices, or recipes",
  "Convenient format for on-the-go wellness habits",
  "Suitable for self-care and beauty-focused routines",
  "Great for first-time buyers who want a fuller set",
  "Plant-based moringa product from the core store collection",
];

function buildHighlights(product: Product): string[] {
  const lowerText = `${product.name} ${product.description ?? ""}`.toLowerCase();
  return HIGHLIGHTS.filter((highlight) => {
    if (
      lowerText.includes("tea") &&
      highlight.includes("Easy to enjoy as part of a calm daily routine")
    )
      return true;
    if (
      lowerText.includes("powder") &&
      highlight.includes("Simple to mix into smoothies")
    )
      return true;
    if (
      lowerText.includes("capsule") &&
      highlight.includes("Convenient format for on-the-go wellness habits")
    )
      return true;
    if (
      (lowerText.includes("oil") || lowerText.includes("mask")) &&
      highlight.includes("Suitable for self-care and beauty-focused routines")
    )
      return true;
    if (
      (lowerText.includes("combo") || lowerText.includes("bundle")) &&
      highlight.includes("Great for first-time buyers who want a fuller set")
    )
      return true;
    if (
      highlight.includes(
        "Plant-based moringa product from the core store collection",
      )
    )
      return true;
    return false;
  });
}

function availabilityLabel(stock: number): string {
  if (stock <= 0) return "Out of stock";
  if (stock <= 10) return "Limited stock";
  return "In stock";
}

function shippingMessage(stock: number): string {
  if (stock <= 0) return "Ships when inventory is replenished";
  return "Dispatches in 1-2 business days";
}

/**
 * Product hero section: image, pricing, rating, availability, delivery,
 * highlights, tags and cart/wishlist actions.
 * Port of legacy `components/Product/ProductDetailsInfo.tsx`.
 */
export const ProductDetailsInfo = component$<ProductDetailsInfoProps>(
  ({
    product,
    reviewSummary,
    isAdmin,
    isAddingToCart,
    isWishlisted,
    onAddToCart$,
    onToggleWishlist$,
  }) => {
    const stock = Number(product.stock ?? 0);
    const price = normalizePrice(product.price);
    const compareAtPrice = normalizePrice(product.compareAtPrice);
    const highlights = buildHighlights(product);

    return (
      <section class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="card overflow-hidden rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
          <SmartImage
            src={resolveImageUrl(product.image)}
            alt={product.name}
            width={800}
            height={600}
            class="h-full min-h-[300px] w-full object-cover sm:min-h-[420px]"
          />
        </div>

        <div class="card rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
          <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Product Overview
          </p>
          <h1 class="mt-4 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {product.name}
          </h1>
          <p class="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            {formatRupees(price)}
          </p>
          {compareAtPrice > price ? (
            <p class="mt-2 text-sm text-[var(--text-muted)] line-through">
              {formatRupees(compareAtPrice)}
            </p>
          ) : null}
          <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
            <span class="text-lg tracking-[0.18em] text-amber-500 dark:text-amber-300">
              {renderStars(Math.round(reviewSummary.averageRating))}
            </span>
            <span>
              {reviewSummary.averageRating > 0
                ? `${reviewSummary.averageRating}/5 from ${reviewSummary.reviewCount} review${reviewSummary.reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </span>
          </div>
          <p class="mt-6 text-base leading-8 text-[var(--text-secondary)]">
            {product.description}
          </p>
          {product.brand || product.sku ? (
            <div class="mt-4 flex flex-wrap gap-3 text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {product.brand ? <span>{product.brand}</span> : null}
              {product.sku ? <span>{product.sku}</span> : null}
            </div>
          ) : null}

          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="rounded-[1.5rem] bg-[var(--bg-primary)] p-5">
              <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                Availability
              </p>
              <p class="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                {availabilityLabel(stock)}
              </p>
              <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {stock > 0
                  ? `${stock} units currently available`
                  : "Currently unavailable for purchase"}
              </p>
            </div>

            <div class="rounded-[1.5rem] bg-[var(--bg-primary)] p-5">
              <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                Delivery
              </p>
              <p class="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                {shippingMessage(stock)}
              </p>
              <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Standard shipping rates are calculated at checkout.
              </p>
            </div>
          </div>

          <div class="card mt-8 rounded-[1.5rem] bg-emerald-50 p-6">
            <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              Why customers buy this
            </p>
            <div class="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              {highlights.map((highlight) => (
                <p key={highlight}>{highlight}</p>
              ))}
            </div>
          </div>

          {Array.isArray(product.tags) && product.tags.length > 0 ? (
            <div class="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  class="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-sm uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick$={onAddToCart$}
              disabled={stock <= 0 || isAdmin || isAddingToCart}
              class="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAdmin
                ? "Admins cannot purchase"
                : isAddingToCart
                  ? "Adding..."
                  : stock > 0
                    ? "Add to cart"
                    : "Out of stock"}
            </button>

            {!isAdmin ? (
              <button
                type="button"
                onClick$={onToggleWishlist$}
                class={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${
                  isWishlisted
                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:text-rose-400"
                    : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-rose-200 hover:text-rose-600 dark:text-rose-400"
                }`}
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={isWishlisted ? "currentColor" : "none"}
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            ) : null}

            {!isAdmin ? (
              <Link href="/cart" class="btn-secondary">
                View cart
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  },
);

export default ProductDetailsInfo;
