"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { resolveImageUrl } from "@/lib/config";

type NewArrivalImage = {
  id: number;
  url: string;
  alt: string | null;
  comingSoon?: boolean;
};

const CARD_GAP = 20;

function getVisibleCount(): number {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width < 640) return 1;
  if (width < 1024) return 2;
  if (width < 1280) return 3;
  return 4;
}

export default function NewArrivalsImageCarousel({
  images,
}: {
  images: NewArrivalImage[];
}) {
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const next = getVisibleCount();
      setVisibleCount(next);
      setCurrentIndex((prev) =>
        Math.min(prev, Math.max(0, images.length - next)),
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [images.length]);

  const maxIndex = Math.max(0, images.length - visibleCount);

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const clampedIndex = Math.max(0, Math.min(index, maxIndex));
      setCurrentIndex(clampedIndex);

      const card = container.querySelector(
        `[data-carousel-index="${clampedIndex}"]`,
      ) as HTMLElement | null;
      if (!card) return;

      const cardWidth = card.offsetWidth;
      const gap = CARD_GAP;
      const scrollLeft = clampedIndex * (cardWidth + gap);

      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    },
    [maxIndex],
  );

  const handlePrev = useCallback(() => {
    scrollToIndex(currentIndex - 1);
  }, [currentIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    scrollToIndex(currentIndex + 1);
  }, [currentIndex, scrollToIndex]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="carousel-scroll flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
        >
          {images.map((image, index) => (
            <article
              key={image.id}
              data-carousel-index={index}
              className="group flex flex-col w-[78vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card"
            >
              <div className="relative h-60 w-full">
                {typeof image.url === "string" && image.url.trim() ? (
                  <Image
                    src={resolveImageUrl(image.url)}
                    alt={image.alt || "New arrival"}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 78vw, (max-width: 1280px) 50vw, 300px"
                  />
                ) : null}
                <span className="absolute left-4 top-4 z-10 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-sm">
                  {image.comingSoon ? "Coming Soon" : "New"}
                </span>
                <div className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-emerald-700 dark:text-emerald-300 shadow-sm backdrop-blur">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                  New arrival
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)] line-clamp-2">
                  {image.alt || "Fresh from the source"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] line-clamp-2">
                  Discover the latest addition to our collection. Crafted with
                  care and quality in mind.
                </p>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    In stock
                  </span>
                  <button
                    type="button"
                    disabled
                    className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Coming soon
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {images.length > visibleCount ? (
          <>
            <span className="absolute left-20 top-1/2 z-10 hidden -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)] sm:block">
              {currentIndex + 1}-
              {Math.min(currentIndex + visibleCount, images.length)} of{" "}
              {images.length}
            </span>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bg-secondary)]/90 shadow-md transition hover:bg-[var(--bg-secondary)] disabled:opacity-40 sm:flex"
              aria-label="Previous new arrivals"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[var(--text-secondary)]"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className="absolute right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bg-secondary)]/90 shadow-md transition hover:bg-[var(--bg-secondary)] disabled:opacity-40 sm:flex"
              aria-label="Next new arrivals"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[var(--text-secondary)]"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
