"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatRupees, normalizePrice } from "@/lib/formatters";
import { resolveImageUrl } from "@/lib/config";

export interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  isAdmin: boolean;
  brokenImages: Set<string | number>;
  onImageError: (id: string | number) => void;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({
  product,
  isWishlisted,
  isAdmin,
  brokenImages,
  onImageError,
  onToggleWishlist,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card">
      <Link href={`/product/${product.id}`} className="block">
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
          className="h-60 w-full object-cover"
          loading="lazy"
          onError={() => onImageError(product.id)}
        />
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
          {formatRupees(normalizePrice(product.price))}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)] line-clamp-2">
          {product.name}
        </h3>
        {product.compareAtPrice != null &&
        product.compareAtPrice > product.price ? (
          <p className="mt-1 text-sm text-[var(--text-muted)] line-through">
            {formatRupees(normalizePrice(product.compareAtPrice))}
          </p>
        ) : null}
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] line-clamp-2">
          {product.description ?? ""}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
              isWishlisted
                ? "border-rose-200 bg-rose-50 text-rose-600 dark:text-rose-400"
                : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-rose-200 hover:text-rose-600 dark:text-rose-400"
            }`}
            aria-label={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill={isWishlisted ? "currentColor" : "none"}
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
  );
}
