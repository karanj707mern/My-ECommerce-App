import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostClient from "./BlogPostClient";
import { API_BASE_URL } from "@/lib/config";

export const revalidate = 3600;

const API_BASE = API_BASE_URL;
const ASSET_BASE = API_BASE.replace(/\/api\/v\d+\/?$/, "");

async function getPostForMetadata(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/blog/${slug}`);
    if (!res.ok) return null;
    return (await res.json()) as {
      title?: string;
      excerpt?: string | null;
      coverImage?: string | null;
      content?: string | null;
      publishedAt?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostForMetadata(slug);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  const title = post.title || "Wellness Journal";
  const description = post.excerpt || "";
  const image = resolveImage(post.coverImage);

  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostForMetadata(slug);

  if (!post) {
    notFound();
  }

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
        name: "Journal",
        item: `${siteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post?.title || "Article",
        item: `${siteUrl}/blog/${slug}`,
      },
    ],
  };
  const postImage = resolveImage(post.coverImage);
  const blogPosting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title || "Wellness Journal",
    description: post.excerpt || undefined,
    mainEntityOfPage: `${siteUrl}/blog/${slug}`,
    ...(postImage ? { image: postImage } : {}),
    ...(post.publishedAt || post.createdAt
      ? { datePublished: post.publishedAt || post.createdAt }
      : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    author: {
      "@type": "Organization",
      name: "Moringa Store Online",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Moringa Store Online",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.svg`,
      },
    },
  };

  return (
    <>
      <BlogPostClient post={post ?? null} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogPosting) }}
      />
    </>
  );
}
