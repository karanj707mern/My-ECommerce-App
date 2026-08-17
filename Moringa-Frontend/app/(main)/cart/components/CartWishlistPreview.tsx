"use client";

import Image from "next/image";
import Link from "next/link";
import { resolveImageUrl } from "@/lib/config";
import { formatRupees } from "@/lib/formatters";

export interface CartWishlistPreviewProps {
  items: Record<string, unknown>[];
  onAddToCart: (product: Record<string, unknown>) => void;
  onRemoveFromWishlist: (productId: string | number) => void;
}

export function CartWishlistPreview({
  items,
  onAddToCart,
  onRemoveFromWishlist,
}: CartWishlistPreviewProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
            Wishlist
          </p>
          <h2 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
            Saved items you might want now
          </h2>
        </div>
        <div className="text-center sm:text-left">
          <Link href="/wishlist" className="btn-secondary">
            View all
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {items
          .filter((item) => {
            const product = item.product as Record<string, unknown> | undefined;
            return product && product.name && product.price != null;
          })
          .map((item) => (
            <article
              key={item.id as string | number}
              className="flex min-w-0 flex-col gap-4 rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
            >
              <Image
                src={resolveImageUrl(
                  (item.product as Record<string, unknown>)?.image as string,
                )}
                alt={(item.product as Record<string, unknown>)?.name as string}
                width={400}
                height={300}
                sizes="(max-width: 640px) 100vw, 50vw"
                className="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
              />
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                  {formatRupees(
                    (item.product as Record<string, unknown>)?.price as number,
                  )}
                </p>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {(item.product as Record<string, unknown>)?.name as string}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAddToCart(item)}
                  className="btn-primary flex-1"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onRemoveFromWishlist(item.id as string | number)
                  }
                  className="btn-danger"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
