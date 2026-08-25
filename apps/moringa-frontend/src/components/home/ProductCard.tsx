import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Product } from "@moringa/shared";
import { SmartImage } from "../SmartImage";
import { formatRupees, normalizePrice } from "../../lib/formatters";
import { resolveImageUrl } from "../../lib/config";

export interface ProductCardProps {
  product: Record<string, unknown> & { id: Product["id"]; name: string };
  isWishlisted: boolean;
  isAdmin: boolean;
  onToggleWishlist$: (product: Product) => void;
  onAddToCart$: (product: Product) => void;
}

/**
 * Qwik port of legacy `components/Home/ProductCard.tsx`.
 *
 * Storefront product tile with wishlist heart, compare-at price strikethrough
 * and stock-aware add-to-cart. Broken images fall back to a friendly SVG via
 * `SmartImage`.
 */
export const ProductCard = component$<ProductCardProps>(
  ({ product, isWishlisted, isAdmin, onToggleWishlist$, onAddToCart$ }) => {
    const price = normalizePrice(product.price as number);
    const compareAt = product.compareAtPrice as number | null | undefined;
    const stock = Number(product.stock ?? 0);

    return (
      <article class="card flex flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1">
        <Link href={`/product/${product.id}`} class="block">
          <SmartImage
            src={resolveImageUrl(product.image as string | undefined)}
            alt={product.name}
            width={400}
            height={300}
            class="h-60 w-full object-cover"
          />
        </Link>

        <div class="flex flex-1 flex-col p-6">
          <p class="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
            {formatRupees(price)}
          </p>
          <h3 class="mt-2 line-clamp-2 text-xl font-semibold text-[var(--text-primary)]">
            {product.name}
          </h3>
          {compareAt != null && compareAt > price ? (
            <p class="mt-1 text-sm text-[var(--text-muted)] line-through">
              {formatRupees(compareAt)}
            </p>
          ) : null}
          <p class="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {(product.description as string) ?? ""}
          </p>
          <div class="mt-auto flex items-center gap-2 pt-4">
            <button
              type="button"
              onClick$={() => onToggleWishlist$(product as unknown as Product)}
              class={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
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
                class="h-4 w-4"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06 1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <button
              type="button"
              onClick$={() => onAddToCart$(product as unknown as Product)}
              disabled={isAdmin || stock <= 0}
              class="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAdmin
                ? "Admins cannot purchase"
                : stock > 0
                  ? "Add to cart"
                  : "Out of stock"}
            </button>
          </div>
        </div>
      </article>
    );
  },
);
