import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailsClient from "./ProductDetailsClient";

import { API_BASE_URL } from "@/lib/config";
import type { Product } from "@/lib/types";

export const revalidate = 3600;

const API_BASE = API_BASE_URL;
const ASSET_BASE = API_BASE.replace(/\/api\/v\d+\/?$/, "");

async function getProductForMetadata(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/product/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as Product;
  } catch {
    return null;
  }
}

async function getProductReviews(id: string): Promise<{
  summary: {
    averageRating: number;
    reviewCount: number;
    ratingBreakdown: { rating: number; count: number }[];
  };
  reviews: Record<string, unknown>[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/review/product/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as {
      summary: {
        averageRating: number;
        reviewCount: number;
        ratingBreakdown: { rating: number; count: number }[];
      };
      reviews: Record<string, unknown>[];
    };
  } catch {
    return null;
  }
}

function resolveImage(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value)) return value;
  return `${ASSET_BASE}${value}`;
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductForMetadata(id);

  if (!product) {
    notFound();
  }

  const title = product.seoTitle || product.name || "Product";
  const description = product.seoDescription || product.description || "";
  const image = resolveImage(product.image);

  return {
    title,
    description,
    alternates: { canonical: `/product/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, reviews] = await Promise.all([
    getProductForMetadata(id),
    getProductReviews(id),
  ]);

  if (!product) {
    notFound();
  }

  const productImage = product?.image ? resolveImage(product.image) : undefined;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://my-nest-project-pearl.vercel.app";
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${siteUrl}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product?.name || "Product",
        item: `${siteUrl}/product/${id}`,
      },
    ],
  };
  const averageRating = Number(reviews?.summary.averageRating) || 0;
  const reviewCount = Number(reviews?.summary.reviewCount) || 0;
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription || product.description,
    ...(productImage ? { image: productImage } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${id}`,
      price: product.price,
      priceCurrency: "INR",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    ...(averageRating > 0 && reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating.toFixed(1),
            reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  return (
    <>
      <ProductDetailsClient
        product={product ?? null}
        initialReviews={reviews}
      />
      {productImage ? (
        <link
          rel="preload"
          as="image"
          href={productImage}
          {...({
            imageSrcSet: `${productImage}?w=400 400w, ${productImage}?w=800 800w, ${productImage}?w=1200 1200w`,
            imageSizes: "(max-width: 768px) 100vw, 50vw",
          } satisfies Record<string, string>)}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
    </>
  );
}
