"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { resolveImageUrl } from "@/lib/config";

export interface UpcomingProductsSectionProps {
  upcomingProducts: Product[];
  brokenImages: Set<string | number>;
  onImageError: (id: string | number) => void;
}

export default function UpcomingProductsSection({
  upcomingProducts,
  brokenImages,
  onImageError,
}: UpcomingProductsSectionProps) {
  if (upcomingProducts.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="overflow-hidden rounded-[2.25rem] border border-[var(--border-color)] bg-gradient-to-br from-[var(--text-primary)]/95 to-emerald-900 p-8 text-[var(--text-primary)] shadow-lg">
        <p className="text-sm uppercase tracking-[0.16em] text-emerald-200">
          Coming soon
        </p>
        <h2 className="mt-3 font-serif text-3xl text-[var(--text-primary)]">
          Upcoming products worth the wait
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/90">
          We&apos;re preparing a few more moringa essentials. Join the waitlist
          and be the first to know when they&apos;re available.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {upcomingProducts.map((product) => (
            <article
              key={product.id}
              className="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)]/20 bg-[var(--bg-secondary)]/10"
            >
              <Image
                src={
                  brokenImages.has(product.id)
                    ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f5f5f4'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a8a29e' font-family='sans-serif' font-size='16'%3EImage unavailable%3C/text%3E%3C/svg%3E"
                    : resolveImageUrl(product.image)
                }
                alt={product.name}
                width={400}
                height={300}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="h-40 w-full object-cover"
                onError={() => onImageError(product.id)}
              />
              <div className="space-y-2 p-5">
                <p className="text-sm uppercase tracking-[0.12em] text-emerald-200">
                  Coming soon
                </p>
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                  {product.name}
                </h3>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {product.description ?? ""}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
