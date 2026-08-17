import { Suspense } from "react";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/api/blog";
import BlogListClient from "./BlogListClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Wellness Journal",
    description:
      "Read articles about moringa health benefits, wellness tips, recipes, and natural living from the Moringa Store Online journal.",
    alternates: { canonical: "/blog" },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Moringa Store Online",
      title: "Wellness Journal | Moringa Store Online",
      description:
        "Read articles about moringa health benefits, wellness tips, recipes, and natural living.",
      images: [
        {
          url: "https://my-nest-project-pearl.vercel.app/images/home-hero-1.webp",
          alt: "Moringa Store Online Wellness Journal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@moringastore",
      title: "Wellness Journal | Moringa Store Online",
      description:
        "Read articles about moringa health benefits, wellness tips, recipes, and natural living.",
      images: [
        "https://my-nest-project-pearl.vercel.app/images/home-hero-1.webp",
      ],
    },
  };
}

export const revalidate = 300;

export default async function BlogListPage() {
  let initialPosts: Record<string, unknown>[] = [];
  let initialError = "";

  try {
    const data = await getBlogPosts();
    initialPosts = Array.isArray(data) ? data : [];
  } catch (err) {
    initialError = (err as Error).message || "Could not load blog posts.";
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <p className="text-sm text-[var(--text-muted)]">Loading journal...</p>
        </div>
      }
    >
      <BlogListClient initialPosts={initialPosts} initialError={initialError} />
    </Suspense>
  );
}
