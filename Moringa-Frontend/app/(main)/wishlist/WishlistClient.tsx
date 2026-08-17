"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { addCartItem } from "@/lib/api/cart";
import { getWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { notifyCartChanged, notifyWishlistChanged } from "@/lib/storage";
import { resolveImageUrl } from "@/lib/config";
import { formatRupees } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import useAutoDismiss from "@/hooks/useAutoDismiss";
import { useAuthChecked, useCurrentUser } from "@/lib/storage";

export default function WishlistClient() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingToCartId, setAddingToCartId] = useState<string | number | null>(
    null,
  );
  const toast = useToast();
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const isLoggedIn = Boolean(currentUser);
  const isAdmin = currentUser?.role === "ADMIN";
  const mountedRef = useRef(true);

  useAutoDismiss(error, () => setError(""), 5000);

  useEffect(() => {
    // React's development Strict Mode runs effect cleanup once before mounting
    // it again. Restore this guard so the active request can update state.
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadWishlist = useCallback(async () => {
    let cancelled = false;
    setLoading(true);
    setError("");

    try {
      const data = await getWishlist();
      if (!cancelled && mountedRef.current) {
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (!cancelled && mountedRef.current) {
        const message = (err as Error).message || "Could not load wishlist.";
        setError(message);
        toast.showToast({
          severity: "error",
          summary: "Wishlist error",
          detail: message,
          life: 4000,
        });
      }
    } finally {
      if (!cancelled && mountedRef.current) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const fetchData = async () => {
      try {
        const data = await getWishlist();
        if (!cancelled && mountedRef.current) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          const message = (err as Error).message || "Could not load wishlist.";
          setError(message);
          toast.showToast({
            severity: "error",
            summary: "Wishlist error",
            detail: message,
            life: 4000,
          });
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [authChecked, isLoggedIn, isAdmin]);

  const handleAddToCart = async (product: Record<string, unknown>) => {
    const productId = product.id as string | number;
    setAddingToCartId(productId);
    try {
      await addCartItem(productId);
      await removeFromWishlist(productId);
      if (mountedRef.current) {
        setItems((prev) => prev.filter((item) => item.id !== productId));
      }
      notifyCartChanged();
      notifyWishlistChanged();
      toast.showToast({
        severity: "success",
        summary: "Added to cart",
        detail: `${product.name as string} was added to your cart.`,
        life: 3000,
      });
    } catch {
      toast.showToast({
        severity: "error",
        summary: "Cart error",
        detail: "Could not add item to cart.",
        life: 4000,
      });
    } finally {
      setAddingToCartId(null);
    }
  };

    const handleRemove = async (productId: string | number) => {
    try {
      await removeFromWishlist(productId);
      if (mountedRef.current) {
        setItems((prev) => prev.filter((item) => item.id !== productId));
        notifyWishlistChanged();
        toast.showToast({
          severity: "info",
          summary: "Removed",
          detail: "Removed from your wishlist.",
          life: 2500,
        });
      }
    } catch {
      if (mountedRef.current) {
        setError("Could not remove item from wishlist.");
      }
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
        <main>
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
            <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              <p className="text-base">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          {error && !loading ? (
            <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
              <button
                type="button"
                onClick={loadWishlist}
                className="ml-3 text-sm font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoggedIn ? (
            <div className="mt-10 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm card">
              <p className="text-base">
                You are viewing your wishlist as a guest. Sign in to make your
                wishlist permanent and access it from any device.
              </p>
              <Link
                href={`/auth?from=${encodeURIComponent("/wishlist")}&authMessage=${encodeURIComponent("Sign in to save your wishlist.")}`}
                className="btn-primary mt-6"
              >
                Sign in to save wishlist
              </Link>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-10 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              <p className="text-base">Loading your wishlist...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              <p className="text-base">Your wishlist is empty.</p>
              <Link href="/shop" className="btn-primary mt-6">
                Browse products
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={async () => {
                    await Promise.all(
                      items.map((item) => handleAddToCart(item)),
                    );
                  }}
                  className="btn-primary"
                  disabled={addingToCartId !== null}
                >
                  Add all to cart
                </button>
                <p className="text-sm text-[var(--text-secondary)]">
                  {items.length} {items.length === 1 ? "item" : "items"} in wishlist
                </p>
              </div>
              <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <article
                    key={product.id as string | number}
                    className="flex flex-col overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card"
                  >
                    <Link href={`/product/${product.id}`} className="block">
                      <Image
                        src={resolveImageUrl(product.image as string)}
                        alt={product.name as string}
                        width={400}
                        height={300}
                        className="h-60 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23f5f5f4'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a8a29e' font-family='sans-serif' font-size='16'%3EImage unavailable%3C/text%3E%3C/svg%3E";
                        }}
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
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={
                            addingToCartId === (product.id as string | number)
                          }
                          className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {addingToCartId === (product.id as string | number)
                            ? "Adding..."
                            : "Add to cart"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemove(product.id as string | number)
                          }
                          className="btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
