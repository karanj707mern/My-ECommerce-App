import { component$, type PropFunction } from "@builder.io/qwik";
import { resolveImageUrl } from "../../lib/config";
import { formatRupees } from "../../lib/formatters";
import { SmartImage } from "../SmartImage";
import type { ServerCartItem } from "../../lib/cart";

export interface CartItemCardProps {
  item: ServerCartItem;
  onRemove$: PropFunction<(id: string | number, name: string) => void>;
  onQuantityChange$: PropFunction<(id: string | number, quantity: number) => void>;
  addingToCartId: string | number | null;
}

/** Single cart line with quantity stepper and remove action. */
export const CartItemCard = component$<CartItemCardProps>(
  ({ item, onRemove$, onQuantityChange$, addingToCartId }) => {
    const product = item.product as Record<string, unknown>;
    const imageUrl = resolveImageUrl(product?.image as string | undefined);
    const quantity = Number(item.quantity ?? 0);
    const busy = addingToCartId === item.id;

    return (
      <article class="card grid gap-6 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:grid-cols-[200px_1fr]">
        <div class="flex items-center justify-center">
          <SmartImage
            src={imageUrl}
            alt={(product?.name as string) ?? ""}
            width={400}
            height={400}
            class="h-40 w-full max-w-[200px] rounded-[1.5rem] object-cover"
          />
        </div>

        <div class="flex flex-col justify-between gap-4">
          <div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
                  {formatRupees(product?.price as number)}
                </p>
                <h3 class="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {(product?.name as string) ?? ""}
                </h3>
              </div>

              <button
                type="button"
                onClick$={() =>
                  onRemove$(item.id as string | number, (product?.name as string) ?? "")
                }
                class="text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                Remove
              </button>
            </div>

            <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {(product?.description as string) ?? ""}
            </p>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              class="inline-flex items-center justify-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2"
              role="group"
              aria-label={`Quantity for ${(product?.name as string) ?? "item"}`}
            >
              <button
                type="button"
                onClick$={() =>
                  onQuantityChange$(item.id as string | number, Math.max(1, quantity - 1))
                }
                disabled={quantity <= 1 || busy}
                class="h-10 w-10 rounded-full bg-[var(--bg-secondary)] text-lg text-[var(--text-secondary)] shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span class="min-w-8 text-center text-sm font-medium text-[var(--text-primary)]">
                {quantity}
              </span>
              <button
                type="button"
                onClick$={() =>
                  onQuantityChange$(item.id as string | number, quantity + 1)
                }
                disabled={busy}
                class="h-10 w-10 rounded-full bg-[var(--bg-secondary)] text-lg text-[var(--text-secondary)] shadow-sm"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <p class="text-center text-lg font-semibold text-[var(--text-primary)] sm:text-right">
              {formatRupees(Number(product?.price ?? 0) * quantity)}
            </p>
          </div>
        </div>
      </article>
    );
  },
);

export default CartItemCard;
