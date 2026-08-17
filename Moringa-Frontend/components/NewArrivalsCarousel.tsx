"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveImageUrl } from "@/lib/config";
import { formatRupees } from "@/lib/formatters";
import type { Product } from "@/lib/types";

const CARD_GAP = 20; // gap-5 = 1.25rem = 20px

function getVisibleCount(): number {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width < 640) return 1;
  if (width < 1024) return 2;
  return 3;
}

export default function NewArrivalsCarousel({
  products,
  onAddToCart,
  onToggleWishlist,
  wishlist,
  isAdmin,
}: {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  wishlist?: Record<string | number, boolean>;
  isAdmin: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const next = getVisibleCount();
      setVisibleCount(next);
      setCurrentIndex((prev) =>
        Math.min(prev, Math.max(0, products.length - next)),
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [products.length]);

  const maxIndex = Math.max(0, products.length - visibleCount);

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

  return (
    <div className="mt-8">
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="carousel-scroll flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
        >
          {products.map((product, index) => (
            <article
              key={product.id}
              data-carousel-index={index}
              className="group flex flex-col w-[78vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card"
            >
              <Link href={`/product/${product.id}`} className="block">
                <span className="absolute left-4 top-4 z-10 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-sm">
                  New
                </span>
                <div className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-emerald-700 dark:text-emerald-300 shadow-sm backdrop-blur">
                  {product.stock > 0 ? "✓" : "✕"}
                </div>
                {typeof product.image === "string" && product.image.trim() ? (
                  <Image
                    src={resolveImageUrl(product.image)}
                    alt={product.name}
                    width={400}
                    height={300}
                    sizes="(max-width: 640px) 78vw, (max-width: 1280px) 50vw, 300px"
                    className="h-60 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
              </Link>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                  {formatRupees(product.price || 0)}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)] line-clamp-2">
                  {product.name}
                </h3>
                {product.compareAtPrice != null &&
                product.compareAtPrice > product.price ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)] line-through">
                    {formatRupees(product.compareAtPrice)}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] line-clamp-2">
                  {product.description}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleWishlist?.(product);
                    }}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
                      wishlist && product.id != null && wishlist[product.id]
                        ? "border-rose-200 bg-rose-50 text-rose-600 dark:text-rose-400"
                        : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-rose-200 hover:text-rose-600 dark:text-rose-400"
                    }`}
                    aria-label={
                      wishlist && product.id != null && wishlist[product.id]
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={
                        wishlist && product.id != null && wishlist[product.id]
                          ? "currentColor"
                          : "none"
                      }
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06 1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddToCart(product);
                    }}
                    disabled={isAdmin || product.stock <= 0}
                    className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAdmin
                      ? "Admins cannot purchase"
                      : product.stock > 0
                        ? "Add to cart"
                        : "Out of stock"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {products.length > visibleCount ? (
          <>
            <span className="absolute left-20 top-1/2 z-10 hidden -translate-y-1/2 text-sm font-medium text-[var(--text-secondary)] sm:block">
              {currentIndex + 1}-
              {Math.min(currentIndex + visibleCount, products.length)} of{" "}
              {products.length}
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
