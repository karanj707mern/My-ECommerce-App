import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Product } from "@moringa/shared";
import { SmartImage } from "./SmartImage";
import { resolveImageUrl } from "../lib/config";
import { formatRupees } from "../lib/formatters";

const CARD_GAP = 20; // gap-5 = 1.25rem = 20px

function getVisibleCount(): number {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width < 640) return 1;
  if (width < 1024) return 2;
  return 3;
}

export interface NewArrivalsCarouselProps {
  products: Product[];
  wishlist?: Record<string | number, boolean>;
  isAdmin: boolean;
  onAddToCart$: (product: Product) => void;
  onToggleWishlist$?: (product: Product) => void;
}

/**
 * Qwik port of legacy `components/NewArrivalsCarousel.tsx`.
 *
 * Scroll-snapping product carousel with responsive visible-count, smooth
 * programmatic scrolling and prev/next controls.
 */
export const NewArrivalsCarousel = component$<NewArrivalsCarouselProps>(
  ({ products, wishlist, isAdmin, onAddToCart$, onToggleWishlist$ }) => {
    const visibleCount = useSignal(getVisibleCount());
    const currentIndex = useSignal(0);
    const scrollContainerRef = useSignal<HTMLDivElement>();

    useVisibleTask$(({ track, cleanup }) => {
      const total = track(() => products.length);
      const handleResize = () => {
        visibleCount.value = getVisibleCount();
        currentIndex.value = Math.min(
          currentIndex.value,
          Math.max(0, total - visibleCount.value),
        );
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      cleanup(() => window.removeEventListener("resize", handleResize));
    });

    const maxIndex = Math.max(0, products.length - visibleCount.value);

    return (
      <div class="mt-8">
        <div class="relative">
          <div
            ref={scrollContainerRef}
            class="carousel-scroll flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
          >
            {products.map((product, index) => (
              <article
                key={product.id}
                data-carousel-index={index}
                class="card group flex w-[78vw] max-w-sm shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1"
              >
                <Link href={`/product/${product.id}`} class="block">
                  <span class="absolute left-4 top-4 z-10 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-sm">
                    New
                  </span>
                  <div class="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-emerald-700 shadow-sm backdrop-blur dark:text-emerald-300">
                    {Number(product.stock ?? 0) > 0 ? "✓" : "✕"}
                  </div>
                  {typeof product.image === "string" && product.image.trim() ? (
                    <SmartImage
                      src={resolveImageUrl(product.image)}
                      alt={product.name}
                      width={400}
                      height={300}
                      class="h-60 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </Link>
                <div class="flex flex-1 flex-col p-6">
                  <p class="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                    {formatRupees(Number(product.price ?? 0))}
                  </p>
                  <h3 class="mt-2 line-clamp-2 text-xl font-semibold text-[var(--text-primary)]">
                    {product.name}
                  </h3>
                  {product.compareAtPrice != null &&
                  Number(product.compareAtPrice) >
                    Number(product.price ?? 0) ? (
                    <p class="mt-1 text-sm text-[var(--text-muted)] line-through">
                      {formatRupees(product.compareAtPrice)}
                    </p>
                  ) : null}
                  <p class="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {(product.description as string) ?? ""}
                  </p>
                  <div class="mt-auto flex items-center gap-2 pt-4">
                    {onToggleWishlist$ && (
                      <button
                        type="button"
                        onClick$={() => onToggleWishlist$(product)}
                        class={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
                          wishlist && wishlist[product.id]
                            ? "border-rose-200 bg-rose-50 text-rose-600 dark:text-rose-400"
                            : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-rose-200 hover:text-rose-600 dark:text-rose-400"
                        }`}
                        aria-label={
                          wishlist && wishlist[product.id]
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={
                            wishlist && wishlist[product.id]
                              ? "currentColor"
                              : "none"
                          }
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="h-4 w-4"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06 1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick$={() => onAddToCart$(product)}
                      disabled={isAdmin || Number(product.stock ?? 0) <= 0}
                      class="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAdmin
                        ? "Admins cannot purchase"
                        : Number(product.stock ?? 0) > 0
                          ? "Add to cart"
                          : "Out of stock"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {products.length > visibleCount.value ? (
            <>
              <span class="absolute left-20 top-1/2 z-10 hidden -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)] sm:block">
                {currentIndex.value + 1}-
                {Math.min(
                  currentIndex.value + visibleCount.value,
                  products.length,
                )}{" "}
                of {products.length}
              </span>
              <button
                type="button"
                disabled={currentIndex.value === 0}
                onClick$={() => {
                  const container = scrollContainerRef.value;
                  if (!container) return;
                  const clamped = Math.max(0, currentIndex.value - 1);
                  currentIndex.value = clamped;
                  const card = container.querySelector<HTMLElement>(
                    `[data-carousel-index="${clamped}"]`,
                  );
                  if (!card) return;
                  container.scrollTo({
                    left: clamped * (card.offsetWidth + CARD_GAP),
                    behavior: "smooth",
                  });
                }}
                class="absolute left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bg-secondary)]/90 shadow-md transition hover:bg-[var(--bg-secondary)] disabled:opacity-40 sm:flex"
                aria-label="Previous new arrivals"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5 text-[var(--text-secondary)]"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                disabled={currentIndex.value >= maxIndex}
                onClick$={() => {
                  const container = scrollContainerRef.value;
                  if (!container) return;
                  const clamped = Math.min(currentIndex.value + 1, maxIndex);
                  currentIndex.value = clamped;
                  const card = container.querySelector<HTMLElement>(
                    `[data-carousel-index="${clamped}"]`,
                  );
                  if (!card) return;
                  container.scrollTo({
                    left: clamped * (card.offsetWidth + CARD_GAP),
                    behavior: "smooth",
                  });
                }}
                class="absolute right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bg-secondary)]/90 shadow-md transition hover:bg-[var(--bg-secondary)] disabled:opacity-40 sm:flex"
                aria-label="Next new arrivals"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-5 w-5 text-[var(--text-secondary)]"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  },
);
