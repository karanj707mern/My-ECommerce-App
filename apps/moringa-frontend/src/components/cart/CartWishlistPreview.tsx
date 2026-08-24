import { component$, type PropFunction } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { resolveImageUrl } from "../../lib/config";
import { formatRupees } from "../../lib/formatters";
import { SmartImage } from "../SmartImage";

export interface CartWishlistPreviewProps {
  items: Record<string, unknown>[];
  onAddToCart$: PropFunction<(item: Record<string, unknown>) => void>;
  onRemoveFromWishlist$: PropFunction<(productId: string | number) => void>;
}

/** Wishlist items not yet in the cart, shown under the cart list. */
export const CartWishlistPreview = component$<CartWishlistPreviewProps>(
  ({ items, onAddToCart$, onRemoveFromWishlist$ }) => {
    const visibleItems = items.filter((item) => {
      const product = item.product as Record<string, unknown> | undefined;
      return product && product.name && product.price != null;
    });

    if (visibleItems.length === 0) {
      return null;
    }

    return (
      <section class="card rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="text-center sm:text-left">
            <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
              Wishlist
            </p>
            <h2 class="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
              Saved items you might want now
            </h2>
          </div>
          <div class="text-center sm:text-left">
            <Link href="/wishlist" class="btn-secondary">
              View all
            </Link>
          </div>
        </div>

        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          {visibleItems.map((item) => {
            const product = item.product as Record<string, unknown>;
            return (
              <article
                key={String(item.id)}
                class="flex min-w-0 flex-col gap-4 rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <SmartImage
                  src={resolveImageUrl(product?.image as string)}
                  alt={(product?.name as string) ?? ""}
                  width={400}
                  height={300}
                  class="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
                />
                <div class="space-y-2">
                  <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                    {formatRupees(product?.price as number)}
                  </p>
                  <h3 class="text-lg font-semibold text-[var(--text-primary)]">
                    {(product?.name as string) ?? ""}
                  </h3>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick$={() => onAddToCart$(item)}
                    class="btn-primary flex-1"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick$={() =>
                      onRemoveFromWishlist$(item.id as string | number)
                    }
                    class="btn-danger"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  },
);

export default CartWishlistPreview;
