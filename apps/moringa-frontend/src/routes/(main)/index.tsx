import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import {
  Link,
  useLocation,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import type { Product } from "@moringa/shared";
import { getProducts } from "../../lib/api/product";
import { getFeaturedReviews } from "../../lib/api/review";
import { getActiveHeroImages } from "../../lib/api/hero";
import { getActiveNewArrivalImages } from "../../lib/api/new-arrival";
import { addCartItem, getCart } from "../../lib/api/cart";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "../../lib/api/wishlist";
import { notifyCartChanged, notifyWishlistChanged } from "../../lib/storage";
import { useToast } from "../../hooks/useToast";
import { useAuthState } from "../../hooks/useAuthState";
import { buildHead } from "../../lib/seo";

import { HeroCarousel } from "../../components/home/HeroCarousel";
import { ProductCard } from "../../components/home/ProductCard";
import { ProductCardSkeleton } from "../../components/home/ProductCardSkeleton";
import { AnimatedStat } from "../../components/AnimatedStat";
import { ClockAnimation } from "../../components/ClockAnimation";
import { NewArrivalsCarousel } from "../../components/NewArrivalsCarousel";
import { NewArrivalsImageCarousel } from "../../components/NewArrivalsImageCarousel";
import { UpcomingProductsSection } from "../../components/home/UpcomingProductsSection";
import { ReviewsSection } from "../../components/home/ReviewsSection";
import { TestimonialsSection } from "../../components/home/TestimonialsSection";

export const useHomeData = routeLoader$(async () => {
  const [products, reviews, heroImages, newArrivalImages] = await Promise.all([
    getProducts().catch(() => [] as Record<string, unknown>[]),
    getFeaturedReviews().catch(() => [] as Record<string, unknown>[]),
    getActiveHeroImages().catch(() => [] as Record<string, unknown>[]),
    getActiveNewArrivalImages().catch(() => [] as Record<string, unknown>[]),
  ]);
  return { products, reviews, heroImages, newArrivalImages };
});

/**
 * Qwik port of legacy `app/(main)/HomeClient.tsx` home experience.
 *
 * Section order mirrors the legacy storefront exactly:
 *   Hero carousel → Rewards banner → "Why this store works" stats →
 *   Product grid → New arrivals carousel(s) → Upcoming products →
 *   Featured reviews → Testimonials
 */
export default component$(() => {
  const data = useHomeData();
  const loc = useLocation();
  const toast = useToast();
  const { currentUser } = useAuthState();

  const addingToCartId = useSignal<string | number | null>(null);
  const productsLoading = useSignal(true);
  const wishlist = useSignal<Record<string | number, boolean>>({});

  const isAdmin = currentUser.value?.role === "ADMIN";
  const allProducts = data.value.products as unknown as Product[];
  const products: Product[] = isAdmin
    ? allProducts
    : allProducts.filter((p) => p.isActive !== false);
  const newArrivals: Product[] = products.slice(8, 16);
  const upcomingProducts: Product[] = allProducts
    .filter((product) => product.isActive === false)
    .slice(0, 4);
  const featuredReviews = data.value.reviews as unknown as Parameters<
    typeof ReviewsSection
  >[0]["featuredReviews"];
  const heroImages = data.value.heroImages as unknown as Parameters<
    typeof HeroCarousel
  >[0]["initialHeroImages"];
  const newArrivalImages = data.value.newArrivalImages as unknown as Parameters<
    typeof NewArrivalsImageCarousel
  >[0]["images"];

  // Hydrate wishlist once auth state settles (mirrors legacy effect).
  useVisibleTask$(({ track }) => {
    if (!track(() => currentUser.value !== undefined)) return;
    if (!isAdmin) {
      void getCart().catch(() => {});
      void getWishlist()
        .then((items) => {
          const map: Record<string | number, boolean> = {};
          for (const item of items as {
            id?: string | number;
            productId?: string | number;
          }[]) {
            if (item.productId != null) map[item.productId] = true;
            else if (item.id != null) map[item.id] = true;
          }
          wishlist.value = map;
        })
        .catch(() => {
          wishlist.value = {};
        });
    } else {
      wishlist.value = {};
    }
  });

  // Surface cart toasts handed over via ?cartMessage=... (legacy behaviour).
  useVisibleTask$(({ track }) => {
    const url = track(() => loc.url);
    const cartMessage =
      url instanceof URL ? url.searchParams.get("cartMessage") : null;
    if (!cartMessage) return;
    void toast.showToast({
      severity: "info",
      summary: "Cart",
      detail: cartMessage,
    });
  });

  useVisibleTask$(() => {
    productsLoading.value = false;
  });

  const handleAddToCart = $(async (product: Product) => {
    if (isAdmin) {
      await toast.showToast({
        severity: "error",
        summary: "Not allowed",
        detail: "Admin accounts cannot add products to cart or place orders.",
      });
      return;
    }
    if (addingToCartId.value === product.id) return;
    addingToCartId.value = product.id;
    try {
      await addCartItem(product.id);
      notifyCartChanged();
      await toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name} was added to your cart.`,
      });
    } catch (err) {
      await toast.showToast({
        severity: "error",
        summary: "Cart error",
        detail: (err as Error)?.message || "Could not add item to cart.",
      });
    } finally {
      addingToCartId.value = null;
    }
  });

  const handleToggleWishlist = $(async (product: Product) => {
    if (isAdmin) return;

    const productId = product.id;
    const isWishlisted = Boolean(wishlist.value[productId]);

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
        });
      } else {
        await addToWishlist(productId);
        wishlist.value = { ...wishlist.value, [productId]: true };
        notifyWishlistChanged();
        await toast.showToast({
          severity: "success",
          summary: "Saved",
          detail: "Added to your wishlist.",
        });
      }
    } catch (error) {
      await toast.showToast({
        severity: "error",
        summary: "Wishlist error",
        detail: (error as Error)?.message || "Could not update your wishlist.",
      });
    }
  });

  return (
    <div class="bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <HeroCarousel initialHeroImages={heroImages ?? []} />

        {/* Rewards banner */}
        <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <div class="rounded-[2rem] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <p class="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                  Rewards
                </p>
                <h3 class="mt-2 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
                  Earn points with every purchase
                </h3>
                <p class="mt-1 text-sm text-[var(--text-secondary)]">
                  Sign in to earn 1 point per ₹1 spent. Redeem points for
                  discounts on future orders.
                </p>
              </div>
              <div class="mt-4 sm:mt-0">
                <Link
                  href="/auth?from=%2F&authMessage=Sign%20in%20to%20start%20earning%20rewards."
                  class="btn-primary whitespace-nowrap"
                >
                  Start earning
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why this store works + live stats */}
        <section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div class="rounded-[2rem] bg-emerald-900 px-8 py-10 text-white shadow-lg">
              <p class="text-sm uppercase tracking-[0.18em] text-emerald-200">
                Why This Store Works
              </p>
              <h2 class="mt-4 font-serif text-4xl leading-tight">
                A gentle storefront that converts when buyers are ready
              </h2>
              <p class="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90">
                Explore moringa essentials at your own pace, compare formats,
                and choose the products that fit your daily routine best.
              </p>
            </div>

            <div class="card grid gap-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm sm:grid-cols-3 lg:grid-cols-1">
              <div class="group">
                <p class="text-3xl font-semibold text-[var(--text-primary)] transition-transform duration-300 group-hover:scale-110">
                  <AnimatedStat countTo={8} />
                </p>
                <p class="mt-2 text-base text-[var(--text-secondary)]">
                  Store products ready to browse
                </p>
              </div>
              <div class="group">
                <p class="text-3xl font-semibold text-[var(--text-primary)] transition-transform duration-300 group-hover:scale-110">
                  <AnimatedStat values={["4.9", "4.8", "5.0", "4.7", "4.9"]} />
                </p>
                <p class="mt-2 text-base text-[var(--text-secondary)]">
                  Average satisfaction across featured reviews
                </p>
              </div>
              <div class="group">
                <p class="text-3xl font-semibold text-[var(--text-primary)] transition-transform duration-300 group-hover:scale-110">
                  <ClockAnimation />
                </p>
                <p class="mt-2 text-base text-[var(--text-secondary)]">
                  Open storefront for guest visitors
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Products grid */}
        <section
          id="products"
          class="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]"
        >
          <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                  Store
                </p>
                <span class="hidden text-emerald-400/60 sm:inline">—</span>
                <h2 class="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                  Browse a fuller moringa collection
                </h2>
              </div>

              <p class="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
                Explore teas, powders, oils, capsules, and curated bundles
                designed for everyday wellness routines.
              </p>
            </div>

            <div class="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {productsLoading.value
                ? Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))
                : products.map((product) => (
                    <ProductCard
                      key={String(product.id)}
                      product={
                        product as unknown as Record<string, unknown> & {
                          id: Product["id"];
                          name: string;
                        }
                      }
                      isWishlisted={Boolean(wishlist.value[product.id])}
                      isAdmin={isAdmin}
                      onToggleWishlist$={handleToggleWishlist}
                      onAddToCart$={handleAddToCart}
                    />
                  ))}
            </div>
          </div>
        </section>

        {/* New arrivals: CMS image carousel preferred, product carousel fallback */}
        {newArrivalImages.length > 0 ? (
          <section class="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]">
            <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
              <NewArrivalsImageCarousel images={newArrivalImages ?? []} />
            </div>
          </section>
        ) : newArrivals.length > 0 ? (
          <section class="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]">
            <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
              <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                    Just landed
                  </p>
                  <span class="hidden text-emerald-400/60 sm:inline">—</span>
                  <h2 class="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                    New arrivals
                  </h2>
                  <p class="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
                    Fresh additions to the wellness shelf — thoughtfully sourced
                    and ready to become part of your daily routine.
                  </p>
                </div>
              </div>

              <NewArrivalsCarousel
                products={newArrivals}
                wishlist={wishlist.value}
                isAdmin={isAdmin}
                onAddToCart$={handleAddToCart}
                onToggleWishlist$={handleToggleWishlist}
              />
            </div>
          </section>
        ) : null}

        {/* Upcoming (inactive) products */}
        {upcomingProducts.length > 0 ? (
          <UpcomingProductsSection upcomingProducts={upcomingProducts} />
        ) : null}

        {/* Featured reviews carousel */}
        <ReviewsSection featuredReviews={featuredReviews ?? []} />

        {/* Testimonials spotlight */}
        <TestimonialsSection />
      </main>
    </div>
  );
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Moringa Store Online",
    description:
      "Premium moringa powders, teas, oils, capsules, and curated wellness bundles. Natural health essentials delivered to your door.",
    path: "/",
  });
