"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveHeroImages } from "@/lib/api/hero";
import { resolveImageUrl } from "@/lib/config";

const HERO_CACHE_TTL = 300000;

export default function Header({
  initialHeroImages = [],
}: {
  initialHeroImages?: { id: number; url: string; alt: string | null }[];
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [availableImages, setAvailableImages] = useState<string[]>(() =>
    initialHeroImages.length > 0
      ? initialHeroImages.map((img) => img.url)
      : [
          "/images/home-hero-1.webp",
          "/images/home-hero-2.webp",
          "/images/home-hero-3.webp",
          "/images/home-hero-4.webp",
        ],
  );
  const intervalRef = useRef<number | null>(null);
  const heroImagesCacheRef = useRef<string[] | null>(null);
  const heroImagesCacheTimeRef = useRef(0);

  useEffect(() => {
    if (initialHeroImages.length > 0) {
      return;
    }

    const now = Date.now();
    if (
      heroImagesCacheRef.current &&
      now - heroImagesCacheTimeRef.current < HERO_CACHE_TTL
    ) {
      setAvailableImages(heroImagesCacheRef.current);
      return;
    }

    let cancelled = false;

    async function fetchHeroImages() {
      try {
        const data = await getActiveHeroImages();
        if (cancelled) return;
        const images = Array.isArray(data) ? data : [];
        const urls = images.map((img) => img.url);
        if (urls.length > 0) {
          heroImagesCacheRef.current = urls;
          heroImagesCacheTimeRef.current = Date.now();
          setAvailableImages(urls);
        }
      } catch {
        if (cancelled) return;
      }
    }

    fetchHeroImages();

    return () => {
      cancelled = true;
    };
  }, [initialHeroImages.length]);

  useEffect(() => {
    if (availableImages.length <= 1) return;

    const startCarousel = () => {
      intervalRef.current = window.setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % availableImages.length);
      }, 3500);
    };

    const stopCarousel = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startCarousel();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCarousel();
      } else {
        startCarousel();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopCarousel();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [availableImages]);

  const handleImageError = useCallback((imagePath: string) => {
    setAvailableImages((prev) => {
      const next = prev.filter((img) => img !== imagePath);
      setActiveImageIndex((current) => {
        if (next.length === 0) return 0;
        if (current < next.length) return current;
        return next.length - 1;
      });
      return next;
    });
  }, []);

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,var(--hero-bg-start)_0%,var(--hero-bg-mid)_50%,var(--hero-bg-end)_100%)]">
      <div className="absolute left-0 top-12 h-40 w-40 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-500/10" />
      <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-lime-100 blur-3xl dark:bg-emerald-900/20" />

      <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-10 lg:py-16">
        <div className="min-w-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--bg-secondary)] px-8 py-3 text-lg font-medium text-emerald-900 shadow dark:text-emerald-200">
            Pure moringa for everyday wellness
          </div>

          <h1 className="font-serif text-4xl leading-tight text-emerald-900 dark:text-emerald-200 sm:text-5xl lg:text-7xl">
            Pure Moringa
          </h1>

          <h2 className="mt-3 max-w-xl text-2xl font-semibold text-emerald-900 dark:text-emerald-200 sm:text-3xl lg:text-5xl">
            Natural support for energy, immunity, and daily health.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-[var(--text-secondary)]">
            Discover premium moringa powders, teas, oils, capsules, and wellness
            blends made for modern daily nutrition.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/shop" className="btn-primary">
              Browse products
            </Link>
            <Link href="/#products" className="btn-secondary">
              See catalog
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 sm:gap-10">
            <div>
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                8+
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Wellness products
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                100%
              </h3>
              <p className="text-sm text-[var(--text-muted)]">Natural focus</p>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                Daily
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Wellness routine
              </p>
            </div>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="relative h-[320px] overflow-hidden rounded-[2rem] shadow-lg sm:h-[380px] lg:h-[450px]">
            {availableImages.length > 0 && (
              <Image
                src={resolveImageUrl(availableImages[0])}
                alt="Hero image"
                onError={() => handleImageError(availableImages[0])}
                width={1200}
                height={800}
                sizes="(max-width: 1023px) 100vw, 50vw"
                priority
                fetchPriority="high"
                loading="eager"
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                  activeImageIndex === 0
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-105"
                }`}
              />
            )}
            {availableImages.slice(1).map((imagePath, index) => (
              <Image
                key={imagePath}
                src={resolveImageUrl(imagePath)}
                alt="Hero image"
                onError={() => handleImageError(imagePath)}
                width={1200}
                height={800}
                sizes="(max-width: 1023px) 100vw, 50vw"
                loading="lazy"
                fetchPriority="auto"
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                  index + 1 === activeImageIndex
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-105"
                }`}
              />
            ))}

            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>

          <div className="absolute right-4 top-4 flex items-center gap-3 rounded-full bg-[var(--bg-secondary)]/85 px-4 py-3 shadow-sm backdrop-blur">
            {availableImages.length > 0 && (
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {activeImageIndex + 1}/{availableImages.length}
              </span>
            )}
            <div className="flex gap-2">
              {availableImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-3 w-3 rounded-full transition-all duration-300 ${
                    index === activeImageIndex
                      ? "bg-emerald-700 scale-100"
                      : "bg-[var(--border-color)] hover:bg-[var(--text-muted)] scale-75"
                  }`}
                  aria-label={`Show hero image ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-[1.5rem] bg-[var(--bg-secondary)] px-4 py-3 shadow-md sm:bottom-6 sm:left-6 sm:right-auto sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              +
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Premium quality
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Fresh, clean, and naturally sourced
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
