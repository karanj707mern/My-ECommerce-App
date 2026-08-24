import { $, component$, useComputed$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getProducts } from "../../../lib/api/product";
import { getFirstActiveHeroImage } from "../../../lib/api/hero";
import { addCartItem } from "../../../lib/api/cart";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "../../../lib/api/wishlist";
import { resolveImageUrl } from "../../../lib/config";
import { formatRupees } from "../../../lib/formatters";
import {
  notifyCartChanged,
  notifyWishlistChanged,
} from "../../../lib/storage";
import { useToast } from "../../../hooks/useToast";
import { useAutoDismiss } from "../../../hooks/useAutoDismiss";
import { useAuthState } from "../../../hooks/useAuthState";
import { SmartImage } from "../../../components/SmartImage";
import { buildHead } from "../../../lib/seo";

type ShopProduct = Record<string, unknown>;

export const useShopData = routeLoader$(async () => {
  let products: ShopProduct[] = [];
  let loadError = "";
  let heroImage: string | null = null;

  try {
    const data = await getProducts();
    products = Array.isArray(data) ? (data as ShopProduct[]) : [];
  } catch (err) {
    loadError =
      err instanceof Error && err.message ? err.message : "Could not load products.";
  }

  try {
    const hero = await getFirstActiveHeroImage();
    heroImage = hero?.url ?? null;
  } catch {
    // Keep fallback on error
  }

  return { products, loadError, heroImage };
});

/**
 * Qwik port of the legacy shop page (`page.tsx` + `ShopPageInner.tsx`).
 * Server-loaded catalog with client-side search, availability filter and sort.
 */
export default component$(() => {
  const shop = useShopData();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();

  const searchTerm = useSignal("");
  const availabilityFilter = useSignal("all");
  const sortOption = useSignal("featured");
  const wishlistMap = useSignal<Record<string, boolean>>({});
  const error = useSignal(shop.value.loadError);
  const addingToCartId = useSignal<string | number | null>(null);

  useAutoDismiss(error, $(() => { error.value = ""; }), 5000);

  const isAdmin = currentUser.value?.role === "ADMIN";

  useVisibleTask$(async ({ track }) => {
    const admin = track(currentUser)?.role === "ADMIN";
    if (!track(authChecked) || admin) {
      wishlistMap.value = {};
      return;
    }
    try {
      const items = (await getWishlist()) as Record<string, unknown>[];
      const map: Record<string, boolean> = {};
      for (const item of items) {
        map[String(item.id)] = true;
      }
      wishlistMap.value = map;
    } catch {
      wishlistMap.value = {};
    }
  });

  const visibleProducts = useComputed$((): ShopProduct[] => {
    const products = shop.value.products;
    const admin = currentUser.value?.role === "ADMIN";
    const storefrontProducts = admin
      ? products
      : products.filter((product) => product.isActive !== false);

    const normalizedSearch = searchTerm.value.trim().toLowerCase();
    let nextProducts = storefrontProducts.filter((product) => {
      const haystack =
        `${String(product.name ?? "")} ${String(product.description ?? "")} ${String(product.brand ?? "")} ${Array.isArray(product.tags) ? product.tags.join(" ") : ""}`.toLowerCase();
      const matchesSearch =
        normalizedSearch === "" || haystack.includes(normalizedSearch);

      const stock = Number(product.stock ?? 0);
      const matchesAvailability =
        availabilityFilter.value === "all" ||
        (availabilityFilter.value === "in-stock" && stock > 0) ||
        (availabilityFilter.value === "low-stock" &&
          stock > 0 &&
          stock <= 10) ||
        (availabilityFilter.value === "out-of-stock" && stock <= 0);

      return matchesSearch && matchesAvailability;
    });

    if (sortOption.value === "price-low") {
      nextProducts = [...nextProducts].sort(
        (a, b) => Number(a.price) - Number(b.price),
      );
    } else if (sortOption.value === "price-high") {
      nextProducts = [...nextProducts].sort(
        (a, b) => Number(b.price) - Number(a.price),
      );
    } else if (sortOption.value === "name") {
      nextProducts = [...nextProducts].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? "")),
      );
    } else if (sortOption.value === "newest") {
      nextProducts = [...nextProducts].sort(
        (a, b) =>
          new Date((b.createdAt as string | number) || 0).getTime() -
          new Date((a.createdAt as string | number) || 0).getTime(),
      );
    }

    return nextProducts;
  });

  const handleAddToCart = $(async (product: ShopProduct) => {
    const productId = product.id as string | number;
    if (isAdmin) {
      await toast.showToast({
        severity: "error",
        summary: "Action not allowed",
        detail:
          "Admin accounts cannot add products to cart or place orders.",
        life: 4000,
      });
      error.value = "";
      return;
    }

    if (addingToCartId.value === productId) {
      return;
    }

    addingToCartId.value = productId;
    try {
      await addCartItem(productId);
      notifyCartChanged();
      error.value = "";
      await toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name as string} was added to your cart.`,
        life: 3000,
      });
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not add item to cart.";
    } finally {
      addingToCartId.value = null;
    }
  });

  const handleToggleWishlist = $(async (productId: string | number) => {
    try {
      if (wishlistMap.value[String(productId)]) {
        await removeFromWishlist(productId);
        const next = { ...wishlistMap.value };
        delete next[String(productId)];
        wishlistMap.value = next;
        notifyWishlistChanged();
        await toast.showToast({
          severity: "info",
          summary: "Removed",
          detail: "Removed from your wishlist.",
          life: 2500,
        });
      } else {
        await addToWishlist(productId);
        wishlistMap.value = { ...wishlistMap.value, [String(productId)]: true };
        notifyWishlistChanged();
        await toast.showToast({
          severity: "success",
          summary: "Saved",
          detail: "Added to your wishlist.",
          life: 2500,
        });
      }
    } catch {
      // ignore wishlist toggle errors
    }
  });

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <section class="rounded-[2rem] bg-[linear-gradient(135deg,#0f5132,#1f7a4c,#d6f3dd)] p-8 text-white shadow-sm">
            <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              Catalog
            </p>
            <h1 class="mt-4 font-serif text-4xl sm:text-5xl">
              Find the right moringa format
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90">
              Search the catalog, compare availability, and sort the collection
              the way you would expect from a professional storefront.
            </p>
          </section>

          {error.value ? (
            <div
              class="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
              role="alert"
            >
              {error.value}
            </div>
          ) : null}

          <section class="card mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
            <div class="grid gap-4 md:grid-cols-1 lg:grid-cols-[1fr_0.8fr_0.8fr]">
              <div>
                <label
                  for="shopSearch"
                  class="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Search products
                </label>
                <input
                  id="shopSearch"
                  type="text"
                  value={searchTerm.value}
                  onInput$={(_, el) => (searchTerm.value = el.value)}
                  placeholder="Search powders, teas, oils, capsules..."
                  autoComplete="off"
                  class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                />
              </div>
              <div>
                <label
                  for="availability"
                  class="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Availability
                </label>
                <select
                  id="availability"
                  value={availabilityFilter.value}
                  onChange$={(_, el) => (availabilityFilter.value = el.value)}
                  class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                >
                  <option value="all">All products</option>
                  <option value="in-stock">In stock</option>
                  <option value="low-stock">Low stock</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>
              </div>
              <div>
                <label
                  for="sortBy"
                  class="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Sort by
                </label>
                <select
                  id="sortBy"
                  value={sortOption.value}
                  onChange$={(_, el) => (sortOption.value = el.value)}
                  class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <span>
                {visibleProducts.value.length} products matching your current
                view
              </span>
              <button
                type="button"
                onClick$={() => {
                  searchTerm.value = "";
                  availabilityFilter.value = "all";
                  sortOption.value = "featured";
                }}
                class="text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-200"
              >
                Reset filters
              </button>
            </div>
          </section>

          {visibleProducts.value.length === 0 ? (
            <div class="card mt-8 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm">
              No products match your current filters.
            </div>
          ) : (
            <section class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.value.map((product) => {
                const productId = product.id as string | number;
                const stock = Number(product.stock ?? 0);
                const inWishlist = !!wishlistMap.value[String(productId)];
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
                        <span
                          class={`rounded-full px-3 py-1 text-xs font-medium ${
                            stock <= 0
                              ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                              : stock <= 10
                                ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                                : "bg-[var(--success-bg)] text-[var(--success-text)]"
                          }`}
                        >
                          {stock <= 0
                            ? "Out of stock"
                            : stock <= 10
                              ? `Only ${stock} left`
                              : "In stock"}
                        </span>
                        <button
                          type="button"
                          onClick$={() => handleToggleWishlist(productId)}
                          class={`ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
                            inWishlist
                              ? "border-rose-200 bg-rose-50 text-rose-600 dark:text-rose-400"
                              : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-rose-200 hover:text-rose-600 dark:text-rose-400"
                          }`}
                          aria-label={
                            inWishlist
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill={inWishlist ? "currentColor" : "none"}
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick$={() => handleAddToCart(product)}
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
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) =>
  buildHead({
    title: "Shop Moringa Products",
    description:
      "Browse the full Moringa Store catalog with moringa teas, powders, oils, capsules, and curated wellness bundles.",
    path: "/shop",
    image: resolveValue(useShopData).heroImage,
  });
