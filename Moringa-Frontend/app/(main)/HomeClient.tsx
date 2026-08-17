"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { addCartItem, getCart } from "@/lib/api/cart";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "@/lib/api/wishlist";
import {
  notifyCartChanged,
  notifyWishlistChanged,
  useAuthChecked,
  useCurrentUser,
} from "@/lib/storage";
import { useToast } from "@/hooks/useToast";
import type { CartItem, Product, Review, User } from "@/lib/types";

import Header from "@/components/Header";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import dynamic from "next/dynamic";

const NewArrivalsCarousel = dynamic(
  () => import("@/components/NewArrivalsCarousel"),
  { ssr: false },
);
const NewArrivalsImageCarousel = dynamic(
  () => import("@/components/NewArrivalsImageCarousel"),
  { ssr: false },
);
import AnimatedStat from "@/components/AnimatedStat";
import ClockAnimation from "@/components/ClockAnimation";

import ProductCard from "@/components/Home/ProductCard";

const TestimonialsSection = dynamic(
  () => import("@/components/Home/TestimonialsSection"),
  { ssr: false },
);
const ReviewsSection = dynamic(
  () => import("@/components/Home/ReviewsSection"),
  { ssr: false },
);
const UpcomingProductsSection = dynamic(
  () => import("@/components/Home/UpcomingProductsSection"),
  { ssr: false },
);

export default function HomeClient({
  initialProducts,
  initialFeaturedReviews,
  initialNewArrivals,
  initialNewArrivalImages,
  initialHeroImages,
}: {
  initialProducts: Product[];
  initialFeaturedReviews: Review[];
  initialNewArrivals: Product[];
  initialNewArrivalImages: { id: number; url: string; alt: string | null }[];
  initialHeroImages: { id: number; url: string; alt: string | null }[];
}) {
  const searchParams = useSearchParams();
  const [wishlist, setWishlist] = useState<Record<string | number, boolean>>(
    {},
  );
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Set<string | number>>(
    new Set(),
  );
  const [productsLoading, setProductsLoading] = useState(true);
  const currentUser = useCurrentUser() as User | null;
  const authChecked = useAuthChecked();
  const isLoggedIn = Boolean(currentUser);
  const toast = useToast();

  const isAdmin = currentUser?.role === "ADMIN";

  const handleImageError = useCallback((id: string | number) => {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const products = initialProducts;
  const newArrivals = initialNewArrivals;
  const featuredReviews = initialFeaturedReviews;
  const newArrivalImages = initialNewArrivalImages;

  useEffect(() => {
    setProductsLoading(false);
  }, []);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (isAdmin) {
      setWishlist({});
      return;
    }

    getCart()
      .then(() => {})
      .catch(() => {});

    getWishlist()
      .then((items) => {
        const map: Record<string | number, boolean> = {};
        for (const item of items as CartItem[]) {
          map[item.id] = true;
        }
        setWishlist(map);
      })
      .catch(() => {
        setWishlist({});
      });
  }, [authChecked, isAdmin, isLoggedIn]);

  useEffect(() => {
    const cartMessage = searchParams.get("cartMessage");
    if (!cartMessage) return;
    toast.showToast({
      severity: "info",
      summary: "Cart",
      detail: cartMessage,
      life: 4000,
    });
  }, [searchParams, toast]);

  const handleAddToCart = useCallback(
    async (product: Product) => {
      if (isAdmin) {
        toast.showToast({
          severity: "error",
          summary: "Not allowed",
          detail: "Admin accounts cannot add products to cart or place orders.",
          life: 4000,
        });
        return;
      }

      try {
        const _updatedCart = await addCartItem(product.id);
        notifyCartChanged();
        toast.showToast({
          severity: "success",
          summary: "Added to cart",
          detail: `${product.name} was added to your cart.`,
          life: 3000,
        });
      } catch (err) {
        toast.showToast({
          severity: "error",
          summary: "Cart error",
          detail: (err as Error).message || "Could not add item to cart.",
          life: 4000,
        });
      }
    },
    [isAdmin, toast],
  );

  const handleToggleWishlist = useCallback(
    async (product: Product) => {
      if (isAdmin) {
        return;
      }

      const productId = product.id;
      const isWishlisted = Boolean(wishlist[productId]);

      try {
         if (isWishlisted) {
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
      } catch (error) {
        toast.showToast({
          severity: "error",
          summary: "Wishlist error",
          detail:
            (error as Error)?.message || "Could not update your wishlist.",
          life: 4000,
        });
      }
    },
    [isAdmin, wishlist, toast],
  );

  const upcomingProducts = useMemo(
    () => products.filter((product) => product.isActive === false).slice(0, 4),
    [products],
  );

  return (
    <div className="bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <Header initialHeroImages={initialHeroImages} />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="rounded-[2rem] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left sm:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                  Rewards
                </p>
                <h3 className="mt-2 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
                  Earn points with every purchase
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Sign in to earn 1 point per ₹1 spent. Redeem points for
                  discounts on future orders.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Link
                  href="/auth?from=%2F&authMessage=Sign%20in%20to%20start%20earning%20rewards."
                  className="btn-primary whitespace-nowrap"
                >
                  Start earning
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] bg-emerald-900 px-8 py-10 text-white shadow-lg">
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-200">
                Why This Store Works
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-tight">
                A gentle storefront that converts when buyers are ready
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90">
                Explore moringa essentials at your own pace, compare formats,
                and choose the products that fit your daily routine best.
              </p>
            </div>

            <div className="grid gap-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm sm:grid-cols-3 lg:grid-cols-1 card">
              <div className="group">
                <p className="text-3xl font-semibold text-[var(--text-primary)] transition-transform duration-300 group-hover:scale-110">
                  <AnimatedStat countTo={8} />
                </p>
                <p className="mt-2 text-base text-[var(--text-secondary)]">
                  Store products ready to browse
                </p>
              </div>
              <div className="group">
                <p className="text-3xl font-semibold text-[var(--text-primary)] transition-transform duration-300 group-hover:scale-110">
                  <AnimatedStat values={["4.9", "4.8", "5.0", "4.7", "4.9"]} />
                </p>
                <p className="mt-2 text-base text-[var(--text-secondary)]">
                  Average satisfaction across featured reviews
                </p>
              </div>
              <div className="group">
                <p className="text-3xl font-semibold text-[var(--text-primary)] transition-transform duration-300 group-hover:scale-110">
                  <ClockAnimation />
                </p>
                <p className="mt-2 text-base text-[var(--text-secondary)]">
                  Open storefront for guest visitors
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="products"
          className="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]"
        >
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                  Store
                </p>
                <span className="hidden sm:inline text-emerald-400/60">—</span>
                <h2 className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                  Browse a fuller moringa collection
                </h2>
              </div>

              <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
                Explore teas, powders, oils, capsules, and curated bundles
                designed for everyday wellness routines.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {productsLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))
                : products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isWishlisted={Boolean(wishlist[product.id])}
                      isAdmin={isAdmin}
                      brokenImages={brokenImages}
                      onImageError={handleImageError}
                      onToggleWishlist={handleToggleWishlist}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
            </div>
          </div>
        </section>

        {newArrivalImages.length > 0 ? (
          <section className="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
              <NewArrivalsImageCarousel images={newArrivalImages} />
            </div>
          </section>
        ) : newArrivals.length > 0 ? (
          <section className="bg-gradient-to-b from-[var(--bg-primary)] via-emerald-50/40 to-[var(--bg-primary)] dark:from-[var(--bg-primary)] dark:via-emerald-900/20 dark:to-[var(--bg-primary)]">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                    Just landed
                  </p>
                  <span className="hidden sm:inline text-emerald-400/60">
                    —
                  </span>
                  <h2 className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                    New arrivals
                  </h2>
                  <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
                    Fresh additions to the wellness shelf — thoughtfully sourced
                    and ready to become part of your daily routine.
                  </p>
                </div>
              </div>

              <NewArrivalsCarousel
                products={newArrivals}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                wishlist={wishlist}
                isAdmin={isAdmin}
              />
            </div>
          </section>
        ) : null}

        {upcomingProducts.length > 0 ? (
          <UpcomingProductsSection
            upcomingProducts={upcomingProducts}
            brokenImages={brokenImages}
            onImageError={handleImageError}
          />
        ) : null}

        <ReviewsSection
          reviewIndex={reviewIndex}
          featuredReviews={featuredReviews}
          onReviewIndexChange={setReviewIndex}
        />

        <TestimonialsSection
          testimonialIndex={testimonialIndex}
          onTestimonialIndexChange={setTestimonialIndex}
        />
      </main>
    </div>
  );
}
