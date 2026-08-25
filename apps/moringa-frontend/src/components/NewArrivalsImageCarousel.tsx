import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { SmartImage } from "./SmartImage";
import { resolveImageUrl } from "../lib/config";

export interface NewArrivalImage {
  id: number | string;
  url: string;
  alt: string | null;
  comingSoon?: boolean;
}

const CARD_GAP = 20; // gap-5 = 1.25rem = 20px

function getVisibleCount(): number {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width < 640) return 1;
  if (width < 1024) return 2;
  if (width < 1280) return 3;
  return 4;
}

/**
 * Qwik port of legacy `components/NewArrivalsImageCarousel.tsx`.
 *
 * Scroll-snapping image-card carousel used for CMS-managed new-arrival
 * imagery, with responsive visible-count and prev/next controls.
 */
export const NewArrivalsImageCarousel = component$<{
  images: NewArrivalImage[];
}>(({ images }) => {
  const visibleCount = useSignal(getVisibleCount());
  const currentIndex = useSignal(0);
  const scrollContainerRef = useSignal<HTMLDivElement>();

  useVisibleTask$(({ track, cleanup }) => {
    const total = track(() => images.length);
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

  const maxIndex = Math.max(0, images.length - visibleCount.value);

  return (
    <div class="mt-8">
      <div class="relative">
        <div
          ref={scrollContainerRef}
          class="carousel-scroll flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
        >
          {images.map((image, index) => (
            <article
              key={image.id}
              data-carousel-index={index}
              class="card group flex w-[78vw] max-w-sm shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1"
            >
              <div class="relative h-60 w-full">
                {typeof image.url === "string" && image.url.trim() ? (
                  <SmartImage
                    src={resolveImageUrl(image.url)}
                    alt={image.alt || "New arrival"}
                    width={400}
                    height={300}
                    class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
                <span class="absolute left-4 top-4 z-10 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-sm">
                  {image.comingSoon ? "Coming Soon" : "New"}
                </span>
                <div class="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-emerald-700 shadow-sm backdrop-blur dark:text-emerald-300">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <div class="flex flex-1 flex-col p-6">
                <p class="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                  New arrival
                </p>
                <h3 class="mt-2 line-clamp-2 text-xl font-semibold text-[var(--text-primary)]">
                  {image.alt || "Fresh from the source"}
                </h3>
                <p class="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Discover the latest addition to our collection. Crafted with
                  care and quality in mind.
                </p>
                <div class="mt-auto flex items-center gap-2 pt-4">
                  <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    In stock
                  </span>
                  <button
                    type="button"
                    disabled
                    class="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Coming soon
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {images.length > visibleCount.value ? (
          <>
            <span class="absolute left-20 top-1/2 z-10 hidden -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)] sm:block">
              {currentIndex.value + 1}-
              {Math.min(currentIndex.value + visibleCount.value, images.length)}{" "}
              of {images.length}
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
});
