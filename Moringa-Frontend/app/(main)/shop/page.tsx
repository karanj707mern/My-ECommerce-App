import type { Metadata } from "next";
import { Suspense } from "react";
import { getProducts } from "@/lib/api/product";
import { getFirstActiveHeroImage } from "@/lib/api/hero";
import ShopPageInner from "./ShopPageInner";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://my-nest-project-pearl.vercel.app";

  let heroImage =
    "https://my-nest-project-pearl.vercel.app/images/home-hero-1.webp";

  try {
    const firstHero = await getFirstActiveHeroImage();
    if (firstHero?.url) {
      heroImage = firstHero.url;
    }
  } catch {
    // Keep fallback on error
  }

  return {
    title: "Shop Moringa Products",
    description:
      "Browse the full Moringa Store catalog with moringa teas, powders, oils, capsules, and curated wellness bundles.",
    alternates: { canonical: "/shop" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Shop Moringa Products | Moringa Store Online",
      description:
        "Browse the full Moringa Store catalog with moringa teas, powders, oils, capsules, and curated wellness bundles.",
      images: [
        {
          url: heroImage,
          alt: "Moringa Store Online - Shop Catalog",
        },
      ],
      url: `${siteUrl}/shop`,
    },
    twitter: {
      card: "summary_large_image",
      title: "Shop Moringa Products | Moringa Store Online",
      description:
        "Browse the full Moringa Store catalog with moringa teas, powders, oils, capsules, and curated wellness bundles.",
      images: [heroImage],
    },
  };
}

export default async function ShopPage() {
  let initialProducts: Record<string, unknown>[] = [];
  let loadError = "";

  try {
    const data = await getProducts();
    initialProducts = Array.isArray(data) ? data : [];
  } catch (err) {
    loadError = (err as Error).message || "Could not load products.";
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <p className="text-sm text-[var(--text-muted)]">Loading shop...</p>
        </div>
      }
    >
      <ShopPageInner
        initialProducts={initialProducts}
        initialError={loadError}
      />
    </Suspense>
  );
}
