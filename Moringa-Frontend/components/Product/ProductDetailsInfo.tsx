"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatRupees, normalizePrice, renderStars } from "@/lib/formatters";
import { resolveImageUrl } from "@/lib/config";

export interface ProductDetailsInfoProps {
  product: Product;
  reviewSummary: {
    averageRating: number;
    reviewCount: number;
  };
  isAdmin: boolean;
  isAddingToCart: boolean;
  isWishlisted: boolean;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
}

export default function ProductDetailsInfo({
  product,
  reviewSummary,
  isAdmin,
  isAddingToCart,
  isWishlisted,
  onAddToCart,
  onToggleWishlist,
}: ProductDetailsInfoProps) {
  const [brokenImages, setBrokenImages] = useState<Set<string | number>>(
    new Set(),
  );

  const handleImageError = (id: string | number) => {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };
  const productHighlights = [
    "Easy to enjoy as part of a calm daily routine",
    "Simple to mix into smoothies, juices, or recipes",
    "Convenient format for on-the-go wellness habits",
    "Suitable for self-care and beauty-focused routines",
    "Great for first-time buyers who want a fuller set",
    "Plant-based moringa product from the core store collection",
  ].filter((highlight) => {
    const lowerText = `${product.name} ${product.description}`.toLowerCase();
    if (
      lowerText.includes("tea") &&
      highlight.includes("Easy to enjoy as part of a calm daily routine")
    )
      return true;
    if (
      lowerText.includes("powder") &&
      highlight.includes("Simple to mix into smoothies")
    )
      return true;
    if (
      lowerText.includes("capsule") &&
      highlight.includes("Convenient format for on-the-go wellness habits")
    )
      return true;
    if (
      (lowerText.includes("oil") || lowerText.includes("mask")) &&
      highlight.includes("Suitable for self-care and beauty-focused routines")
    )
      return true;
    if (
      (lowerText.includes("combo") || lowerText.includes("bundle")) &&
      highlight.includes("Great for first-time buyers who want a fuller set")
    )
      return true;
    if (
      highlight.includes(
        "Plant-based moringa product from the core store collection",
      )
    )
      return true;
    return false;
  });

  const getAvailabilityLabel = (stock: number): string => {
    if (stock <= 0) return "Out of stock";
    if (stock <= 10) return "Limited stock";
    return "In stock";
  };

  const getShippingMessage = (stock: number): string => {
    if (stock <= 0) return "Ships when inventory is replenished";
    return "Dispatches in 1-2 business days";
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="overflow-hidden rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm card">
        <Image
          src={resolveImageUrl(product.image as string)}
          alt={product.name as string}
          width={800}
          height={600}
          decoding="async"
          priority
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 50vw"
          className="h-full min-h-[300px] w-full object-cover sm:min-h-[420px]"
        />
      </div>

      <div className="rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
        <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Product Overview
        </p>
        <h1 className="mt-4 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
          {product.name as string}
        </h1>
        <p className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          {formatRupees(normalizePrice(product.price as number))}
        </p>
        {Number(product.compareAtPrice) > Number(product.price) ? (
          <p className="mt-2 text-sm text-[var(--text-muted)] line-through">
            {formatRupees(normalizePrice(product.compareAtPrice as number))}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span className="text-lg tracking-[0.18em] text-amber-500 dark:text-amber-300">
            {renderStars(Math.round(reviewSummary.averageRating as number))}
          </span>
          <span>
            {reviewSummary.averageRating > 0
              ? `${reviewSummary.averageRating}/5 from ${reviewSummary.reviewCount} review${
                  reviewSummary.reviewCount === 1 ? "" : "s"
                }`
              : "No reviews yet"}
          </span>
        </div>
        <p className="mt-6 text-base leading-8 text-[var(--text-secondary)]">
          {product.description as string}
        </p>
        {product.brand || product.sku ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {product.brand ? (
              <span key="brand">{product.brand as string}</span>
            ) : null}
            {product.sku ? (
              <span key="sku">{product.sku as string}</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] bg-[var(--bg-primary)] p-5">
            <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              Availability
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              {getAvailabilityLabel(product.stock as number)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {(product.stock as number) > 0
                ? `${product.stock} units currently available`
                : "Currently unavailable for purchase"}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-[var(--bg-primary)] p-5">
            <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              Delivery
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {getShippingMessage(product.stock as number)}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Standard shipping rates are calculated at checkout.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-emerald-50 p-6 card">
          <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
            Why customers buy this
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            {productHighlights.map((highlight) => (
              <p key={highlight}>{highlight}</p>
            ))}
          </div>
        </div>

        {Array.isArray(product.tags) &&
        (product.tags as string[]).length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {(product.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-sm uppercase tracking-[0.18em] text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={
              (product.stock as number) <= 0 || isAdmin || isAddingToCart
            }
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdmin
              ? "Admins cannot purchase"
              : isAddingToCart
                ? "Adding..."
                : (product.stock as number) > 0
                  ? "Add to cart"
                  : "Out of stock"}
          </button>

          {!isAdmin ? (
            <button
              type="button"
              onClick={onToggleWishlist}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${
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
                className="h-5 w-5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06 1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          ) : null}

          {!isAdmin ? (
            <Link href="/cart" className="btn-secondary">
              View cart
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
