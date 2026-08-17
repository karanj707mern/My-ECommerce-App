"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { addCartItem, getCart } from "@/lib/api/cart";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "@/lib/api/wishlist";
import { resolveImageUrl } from "@/lib/config";
import { formatRupees } from "@/lib/formatters";
import { useAuthChecked, useCurrentUser, notifyCartChanged, notifyWishlistChanged } from "@/lib/storage";
import { useToast } from "@/hooks/useToast";
import useAutoDismiss from "@/hooks/useAutoDismiss";

export default function ShopPageInner({
  initialProducts,
  initialError,
}: {
  initialProducts: Record<string, unknown>[];
  initialError: string;
}) {
  const products = useMemo(() => initialProducts, [initialProducts]);
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortOption, setSortOption] = useState("featured");
  const [wishlist, setWishlist] = useState<Record<string | number, boolean>>(
    {},
  );
  const [error, setError] = useState(initialError);
  const [addingToCartId, setAddingToCartId] = useState<string | number | null>(
    null,
  );
  const [brokenImages, setBrokenImages] = useState<Set<string | number>>(
    new Set(),
  );
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const isLoggedIn = Boolean(currentUser);
  const toast = useToast();

  useAutoDismiss(error, () => setError(""), 5000);

  const isAdmin = currentUser?.role === "ADMIN";

  const handleImageError = useCallback((id: string | number) => {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!authChecked || isAdmin) {
      setWishlist({});
      return;
    }

    getWishlist()
      .then((items) => {
        const map: Record<string | number, boolean> = {};
        for (const item of items as Record<string, unknown>[]) {
          map[item.id as string | number] = true;
        }
        setWishlist(map);
      })
      .catch(() => {
        setWishlist({});
      });
  }, [authChecked, isAdmin]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (isAdmin) {
      return;
    }

    getCart()
      .then(() => {})
      .catch(() => {});
  }, [authChecked, isAdmin]);

  const visibleProducts = useMemo(() => {
    const storefrontProducts = isAdmin
      ? products
      : products.filter((product) => product.isActive !== false);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let nextProducts = storefrontProducts.filter((product) => {
      const matchesSearch =
        normalizedSearch === "" ||
        `${product.name as string} ${product.description as string} ${(product.brand as string) || ""} ${(
          (product.tags as string[] | undefined) || []
        ).join(" ")}`
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "in-stock" && (product.stock as number) > 0) ||
        (availabilityFilter === "low-stock" &&
          (product.stock as number) > 0 &&
          (product.stock as number) <= 10) ||
        (availabilityFilter === "out-of-stock" &&
          (product.stock as number) <= 0);

      return matchesSearch && matchesAvailability;
    });

    if (sortOption === "price-low") {
      nextProducts = [...nextProducts].sort(
        (a, b) => Number(a.price) - Number(b.price),
      );
    } else if (sortOption === "price-high") {
      nextProducts = [...nextProducts].sort(
        (a, b) => Number(b.price) - Number(a.price),
      );
    } else if (sortOption === "name") {
      nextProducts = [...nextProducts].sort((a, b) =>
        (a.name as string).localeCompare(b.name as string),
      );
    } else if (sortOption === "newest") {
      nextProducts = [...nextProducts].sort(
        (a, b) =>
          new Date((b.createdAt as string | number) || 0).getTime() -
          new Date((a.createdAt as string | number) || 0).getTime(),
      );
    }

    return nextProducts;
  }, [availabilityFilter, isAdmin, products, searchTerm, sortOption]);

  const handleAddToCart = async (product: Record<string, unknown>) => {
    const productId = product.id as string | number;
    if (isAdmin) {
      toast.showToast({
        severity: "error",
        summary: "Action not allowed",
        detail: "Admin accounts cannot add products to cart or place orders.",
        life: 4000,
      });
      setError("");
      return;
    }

    if (addingToCartId === productId) {
      return;
    }

    setAddingToCartId(productId);
    try {
      const _updatedCart = await addCartItem(productId);
      notifyCartChanged();
      setError("");
      toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name} was added to your cart.`,
        life: 3000,
      });
    } catch (err) {
      setError((err as Error).message || "Could not add item to cart.");
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleToggleWishlist = async (productId: string | number) => {
    try {
       if (wishlist[productId]) {
         await removeFromWishlist(productId);
         setWishlist((prev) => {
           const next = { ...prev };
           delete next[productId];
           return next;
         });
         notifyWishlistChanged();
         toast.showToast({
          severity: "info",
          summary: "Removed",
          detail: "Removed from your wishlist.",
          life: 2500,
        });
       } else {
         await addToWishlist(productId);
         setWishlist((prev) => ({ ...prev, [productId]: true }));
         notifyWishlistChanged();
         toast.showToast({
          severity: "success",
          summary: "Saved",
          detail: "Added to your wishlist.",
          life: 2500,
        });
      }
    } catch {
      // ignore wishlist toggle errors
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f5132,#1f7a4c,#d6f3dd)] p-8 text-white shadow-sm">
            <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              Catalog
            </p>
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl">
              Find the right moringa format
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90">
              Search the catalog, compare availability, and sort the collection
              the way you would expect from a professional storefront.
            </p>
          </section>

          {error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}

          <section className="mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-[1fr_0.8fr_0.8fr]">
              <div>
                <label
                  htmlFor="shopSearch"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Search products
                </label>
                <input
                  id="shopSearch"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search powders, teas, oils, capsules..."
                  autoComplete="off"
                  className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="availability"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Availability
                </label>
                <select
                  id="availability"
                  value={availabilityFilter}
                  onChange={(event) =>
                    setAvailabilityFilter(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                >
                  <option value="all">All products</option>
                  <option value="in-stock">In stock</option>
                  <option value="low-stock">Low stock</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="sortBy"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Sort by
                </label>
                <select
                  id="sortBy"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <span>
                {visibleProducts.length} products matching your current view
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setAvailabilityFilter("all");
                  setSortOption("featured");
                }}
                className="text-emerald-700 dark:text-emerald-300 transition hover:text-emerald-900 dark:text-emerald-200"
              >
                Reset filters
              </button>
            </div>
          </section>

          {visibleProducts.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm card">
              No products match your current filters.
            </div>
          ) : (
            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <article
                  key={product.id as string | number}
                  className="flex flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card"
                >
                  <Link href={`/product/${product.id}`} className="block">
                    <Image
                      src={
                        brokenImages.has(product.id as string | number)
                          ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f5f5f4'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a8a29e' font-family='sans-serif' font-size='16'%3EImage unavailable%3C/text%3E%3C/svg%3E"
                          : resolveImageUrl(product.image as string)
                      }
                      alt={product.name as string}
                      width={400}
                      height={300}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="h-60 w-full object-cover"
                      loading="lazy"
                      onError={() =>
                        handleImageError(product.id as string | number)
                      }
                    />
                  </Link>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
                      {formatRupees(product.price as number)}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)] line-clamp-2">
                      {product.name as string}
                    </h3>
                    {(product.compareAtPrice as number) >
                    (product.price as number) ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)] line-through">
                        {formatRupees(product.compareAtPrice as number)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)] line-clamp-2">
                      {product.description as string}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <span
                         className={`rounded-full px-3 py-1 text-xs font-medium ${
                           (product.stock as number) <= 0
                             ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                             : (product.stock as number) <= 10
                               ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                               : "bg-[var(--success-bg)] text-[var(--success-text)]"
                         }`}
                      >
                        {(product.stock as number) <= 0
                          ? "Out of stock"
                          : (product.stock as number) <= 10
                            ? `Only ${product.stock} left`
                            : "In stock"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleWishlist(product.id as string | number)
                        }
                        className={`ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
                          wishlist[product.id as string | number]
                            ? "border-rose-200 bg-rose-50 text-rose-600 dark:text-rose-400"
                            : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-rose-200 hover:text-rose-600 dark:text-rose-400"
                        }`}
                        aria-label={
                          wishlist[product.id as string | number]
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={
                            wishlist[product.id as string | number]
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
                          handleAddToCart(product);
                        }}
                        disabled={isAdmin || (product.stock as number) <= 0}
                        className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isAdmin
                          ? "Admins cannot purchase"
                          : (product.stock as number) > 0
                            ? "Add to cart"
                            : "Out of stock"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
