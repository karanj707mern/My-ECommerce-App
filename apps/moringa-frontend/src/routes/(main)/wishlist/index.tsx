import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { addCartItem } from "../../../lib/api/cart";
import { getWishlist, removeFromWishlist } from "../../../lib/api/wishlist";
import { notifyCartChanged, notifyWishlistChanged } from "../../../lib/storage";
import { resolveImageUrl } from "../../../lib/config";
import { formatRupees } from "../../../lib/formatters";
import { useToast } from "../../../hooks/useToast";
import { useAutoDismiss } from "../../../hooks/useAutoDismiss";
import { useAuthState } from "../../../hooks/useAuthState";
import { SmartImage, IMAGE_FALLBACK } from "../../../components/SmartImage";
import { buildHead } from "../../../lib/seo";

type WishlistItem = Record<string, unknown>;

/**
 * Qwik port of the legacy wishlist page (`WishlistClient.tsx`).
 * Server-backed wishlist with add-to-cart, remove and bulk actions.
 */
export default component$(() => {
  const items = useSignal<WishlistItem[]>([]);
  const error = useSignal("");
  const loading = useSignal(true);
  const addingToCartId = useSignal<string | number | null>(null);
  const loadedOnce = useSignal(false);

  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();
  const isLoggedIn = !!currentUser.value;

  useAutoDismiss(
    error,
    $(() => {
      error.value = "";
    }),
    5000,
  );

  useVisibleTask$(async ({ track }) => {
    const checked = track(authChecked);
    if (!checked) return;

    loading.value = true;
    error.value = "";

    try {
      const data = await getWishlist();
      items.value = Array.isArray(data) ? (data as WishlistItem[]) : [];
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not load wishlist.";
      error.value = message;
      await toast.showToast({
        severity: "error",
        summary: "Wishlist error",
        detail: message,
        life: 4000,
      });
    } finally {
      loading.value = false;
      loadedOnce.value = true;
    }
  });

  const loadWishlist = $(async () => {
    loading.value = true;
    error.value = "";
    try {
      const data = await getWishlist();
      items.value = Array.isArray(data) ? (data as WishlistItem[]) : [];
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load wishlist.";
    } finally {
      loading.value = false;
    }
  });

  const handleAddToCart = $(async (product: WishlistItem): Promise<void> => {
    const productId = product.id as string | number;
    addingToCartId.value = productId;
    try {
      await addCartItem(productId);
      await removeFromWishlist(productId);
      items.value = items.value.filter((item) => item.id !== productId);
      notifyCartChanged();
      notifyWishlistChanged();
      await toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name as string} was added to your cart.`,
        life: 3000,
      });
    } catch {
      await toast.showToast({
        severity: "error",
        summary: "Cart error",
        detail: "Could not add item to cart.",
        life: 4000,
      });
    } finally {
      addingToCartId.value = null;
    }
  });

  const handleRemove = $(async (productId: string | number) => {
    try {
      await removeFromWishlist(productId);
      items.value = items.value.filter((item) => item.id !== productId);
      notifyWishlistChanged();
      await toast.showToast({
        severity: "info",
        summary: "Removed",
        detail: "Removed from your wishlist.",
        life: 2500,
      });
    } catch {
      error.value = "Could not remove item from wishlist.";
    }
  });

  if (!authChecked.value) {
    return (
      <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
        <main>
          <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
            <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10">
              <p class="text-base">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          {error.value && !loading.value ? (
            <div
              class="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
              role="alert"
            >
              {error.value}
              <button
                type="button"
                onClick$={loadWishlist}
                class="ml-3 text-sm font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoggedIn ? (
            <div class="card mt-10 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm">
              <p class="text-base">
                You are viewing your wishlist as a guest. Sign in to make your
                wishlist permanent and access it from any device.
              </p>
              <Link
                href={`/auth?from=${encodeURIComponent("/wishlist")}&authMessage=${encodeURIComponent("Sign in to save your wishlist.")}`}
                class="btn-primary mt-6 inline-flex"
              >
                Sign in to save wishlist
              </Link>
            </div>
          ) : null}

          {loading.value ? (
            <div class="card mt-10 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10">
              <p class="text-base">Loading your wishlist...</p>
            </div>
          ) : loadedOnce.value && items.value.length === 0 ? (
            <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10">
              <p class="text-base">Your wishlist is empty.</p>
              <Link href="/shop" class="btn-primary mt-6 inline-flex">
                Browse products
              </Link>
            </div>
          ) : items.value.length > 0 ? (
            <>
              <div class="mb-6 mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick$={async () => {
                    for (const item of [...items.value]) {
                      await handleAddToCart(item);
                    }
                  }}
                  class="btn-primary"
                  disabled={addingToCartId.value !== null}
                >
                  Add all to cart
                </button>
                <p class="text-sm text-[var(--text-secondary)]">
                  {items.value.length}{" "}
                  {items.value.length === 1 ? "item" : "items"} in wishlist
                </p>
              </div>
              <section class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {items.value.map((product) => {
                  const productId = product.id as string | number;
                  return (
                    <article
                      key={String(productId)}
                      class="card flex flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1"
                    >
                      <Link href={`/product/${productId}`} class="block">
                        <SmartImage
                          src={resolveImageUrl(product.image)}
                          alt={product.name as string}
                          width={400}
                          height={300}
                          class="h-60 w-full object-cover"
                        />
                      </Link>

                      <div class="flex flex-1 flex-col p-6">
                        <p class="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                          {formatRupees(product.price as number)}
                        </p>
                        <h3 class="mt-2 line-clamp-2 text-xl font-semibold text-[var(--text-primary)]">
                          {product.name as string}
                        </h3>
                        {typeof product.compareAtPrice === "number" &&
                        typeof product.price === "number" &&
                        product.compareAtPrice > product.price ? (
                          <p class="mt-1 text-sm text-[var(--text-muted)] line-through">
                            {formatRupees(product.compareAtPrice)}
                          </p>
                        ) : null}
                        <p class="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {(product.description as string) ?? ""}
                        </p>
                        <div class="mt-auto flex items-center gap-2 pt-4">
                          <button
                            type="button"
                            onClick$={() => handleAddToCart(product)}
                            disabled={addingToCartId.value === productId}
                            class="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {addingToCartId.value === productId
                              ? "Adding..."
                              : "Add to cart"}
                          </button>
                          <button
                            type="button"
                            onClick$={() => handleRemove(productId)}
                            class="btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Your Wishlist",
    description:
      "Products you saved for later at Moringa Store Online. Add them to your cart whenever you are ready.",
    path: "/wishlist",
    image: IMAGE_FALLBACK,
  });
