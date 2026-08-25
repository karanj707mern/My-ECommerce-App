import {
  $,
  component$,
  useSignal,
  useVisibleTask$,
  useComputed$,
} from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getProducts } from "../../lib/api/product";
import { getFeaturedReviews } from "../../lib/api/review";
import { getActiveHeroImages } from "../../lib/api/hero";
import { getActiveNewArrivalImages } from "../../lib/api/new-arrival";
import { addCartItem } from "../../lib/api/cart";
import { resolveImageUrl } from "../../lib/config";
import { formatRupees } from "../../lib/formatters";
import { notifyCartChanged } from "../../lib/storage";
import { useToast } from "../../hooks/useToast";
import { useAuthState } from "../../hooks/useAuthState";
import { SmartImage } from "../../components/SmartImage";
import { buildHead } from "../../lib/seo";

export const useHomeData = routeLoader$(async () => {
  const [products, reviews, heroImages, newArrivalImages] = await Promise.all([
    getProducts().catch(() => [] as Record<string, unknown>[]),
    getFeaturedReviews().catch(() => [] as Record<string, unknown>[]),
    getActiveHeroImages().catch(() => [] as Record<string, unknown>[]),
    getActiveNewArrivalImages().catch(() => [] as Record<string, unknown>[]),
  ]);
  return { products, reviews, heroImages, newArrivalImages };
});

export default component$(() => {
  const data = useHomeData();
  const toast = useToast();
  const { currentUser } = useAuthState();
  const addingToCartId = useSignal<string | number | null>(null);
  const heroIndex = useSignal(0);

  const isAdmin = currentUser.value?.role === "ADMIN";
  const products: Record<string, unknown>[] = isAdmin
    ? (data.value.products as Record<string, unknown>[])
    : (data.value.products as Record<string, unknown>[]).filter(
        (p) => p.isActive !== false,
      );
  const featuredProducts = products.slice(0, 8);
  const reviews = data.value.reviews as Record<string, unknown>[];
  const heroImages = data.value.heroImages as Record<string, unknown>[];
  const newArrivalImages = data.value.newArrivalImages as Record<string, unknown>[];

  const handleAddToCart = $(async (product: Record<string, unknown>) => {
    if (isAdmin) {
      await toast.showToast({
        severity: "error",
        summary: "Not allowed",
        detail: "Admin accounts cannot add products to cart.",
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
        detail: `${product.name as string} was added to your cart.`,
      });
    } catch {
      await toast.showToast({
        severity: "error",
        summary: "Cart error",
        detail: "Could not add item to cart.",
      });
    } finally {
      addingToCartId.value = null;
    }
  });

  return (
    <div class="theme-transition">
      {/* Hero Section */}
      {heroImages.length > 0 ? (
        <section
          class="relative overflow-hidden bg-[linear-gradient(135deg,#0f5132,#1f7a4c,#d6f3dd)]"
          aria-label="Featured promotion"
        >
          <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
            <div class="grid items-center gap-8 lg:grid-cols-2">
              <div class="text-white">
                <p class="text-sm uppercase tracking-[0.16em] text-emerald-100">
                  Natural wellness
                </p>
                <h1 class="mt-3 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  Pure moringa, curated for your everyday wellness
                </h1>
                <p class="mt-4 max-w-xl text-base leading-7 text-emerald-50/90 sm:text-lg">
                  Premium moringa powders, teas, oils, and capsules — sourced
                  thoughtfully and delivered to your door.
                </p>
                <div class="mt-8 flex flex-wrap gap-3">
                  <Link href="/shop" class="btn-primary bg-white text-emerald-950 hover:bg-emerald-50">
                    Shop now
                  </Link>
                  <Link
                    href="/blog"
                    class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/40 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Read the journal
                  </Link>
                </div>
              </div>
              <div class="relative">
                <SmartImage
                  src={resolveImageUrl(
                    heroImages[heroIndex.value % heroImages.length]?.url,
                  )}
                  alt={
                    (heroImages[heroIndex.value % heroImages.length]?.alt as string) ||
                    "Moringa products"
                  }
                  width={800}
                  height={600}
                  class="h-72 w-full rounded-[2rem] object-cover shadow-2xl sm:h-96"
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section class="bg-[linear-gradient(135deg,#0f5132,#1f7a4c,#d6f3dd)] px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
          <div class="mx-auto max-w-7xl text-center text-white">
            <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl">
              Pure moringa, curated for your everyday wellness
            </h1>
            <p class="mx-auto mt-4 max-w-2xl text-lg text-emerald-50/90">
              Premium moringa powders, teas, oils, and capsules.
            </p>
            <Link href="/shop" class="btn-primary mt-8 inline-flex bg-white text-emerald-950">
              Shop now
            </Link>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10" aria-labelledby="featured-heading">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Catalog
              </p>
              <h2 id="featured-heading" class="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                Featured products
              </h2>
            </div>
            <Link href="/shop" class="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300">
              View all
            </Link>
          </div>
          <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <article
                key={String(product.id)}
                class="card overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1"
              >
                <Link href={`/product/${product.id}`} class="block">
                  <SmartImage
                    src={resolveImageUrl(product.image)}
                    alt={product.name as string}
                    width={400}
                    height={300}
                    class="h-48 w-full object-cover"
                  />
                </Link>
                <div class="p-5">
                  <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatRupees(product.price as number)}
                  </p>
                  <h3 class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    <Link href={`/product/${product.id}`} class="hover:text-emerald-700 dark:hover:text-emerald-300">
                      {product.name as string}
                    </Link>
                  </h3>
                  <button
                    type="button"
                    onClick$={() => handleAddToCart(product)}
                    disabled={isAdmin || addingToCartId.value === product.id}
                    aria-label={`Add ${product.name as string} to cart`}
                    class="btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {addingToCartId.value === product.id ? "Adding..." : "Add to cart"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivalImages.length > 0 && (
        <section class="bg-[var(--bg-secondary)] px-4 py-16 sm:px-6 lg:px-10" aria-labelledby="new-arrivals-heading">
          <div class="mx-auto max-w-7xl">
            <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Just landed
            </p>
            <h2 id="new-arrivals-heading" class="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
              New arrivals
            </h2>
            <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {newArrivalImages.slice(0, 4).map((image) => (
                <SmartImage
                  key={String(image.id)}
                  src={resolveImageUrl(image.url)}
                  alt={(image.alt as string) || "New arrival"}
                  width={400}
                  height={400}
                  class="h-64 w-full rounded-[1.5rem] object-cover"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Reviews */}
      {reviews.length > 0 && (
        <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10" aria-labelledby="reviews-heading">
          <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Customer voices
          </p>
          <h2 id="reviews-heading" class="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            What people are saying
          </h2>
          <div class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <blockquote
                key={String(review.id)}
                class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm"
              >
                <p class="text-lg tracking-[0.15em] text-amber-500 dark:text-amber-300">
                  {"★".repeat(Math.round(Number(review.rating)))}
                  <span class="text-stone-300">
                    {"★".repeat(5 - Math.round(Number(review.rating)))}
                  </span>
                </p>
                <p class="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {review.content as string}
                </p>
                <footer class="mt-4 text-sm font-medium text-[var(--text-primary)]">
                  {
                    (review.user as Record<string, unknown> | undefined)?.name as string
                  }
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section class="px-4 py-16 sm:px-6 lg:px-10">
        <div class="mx-auto max-w-4xl rounded-[2.5rem] bg-emerald-900 px-8 py-12 text-center text-white sm:px-16">
          <h2 class="font-serif text-3xl sm:text-4xl">
            Start your wellness routine today
          </h2>
          <p class="mt-3 text-emerald-100">
            Browse the full collection and find the moringa format that fits
            your life.
          </p>
          <Link href="/shop" class="btn-primary mt-8 inline-flex bg-white text-emerald-950">
            Explore the store
          </Link>
        </div>
      </section>
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
