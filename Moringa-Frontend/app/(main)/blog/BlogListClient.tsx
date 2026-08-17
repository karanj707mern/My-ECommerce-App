"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAllBlogPosts } from "@/lib/api/blog";
import { resolveImageUrl } from "@/lib/config";
import useAutoDismiss from "@/hooks/useAutoDismiss";
import BlogManager from "@/components/blog/BlogManager";
import { useCurrentUser } from "@/lib/storage";

export default function BlogListClient({
  initialPosts,
  initialError,
}: {
  initialPosts: Record<string, unknown>[];
  initialError: string;
}) {
  const router = useRouter();
  const [adminPosts, setAdminPosts] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const isAdmin = currentUser?.role === "ADMIN";

  useAutoDismiss(error, () => setError(""), 5000);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getAllBlogPosts()
      .then((data) => {
        setAdminPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setAdminPosts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAdmin]);

  const visiblePosts = isAdmin ? adminPosts : initialPosts;
  const publishedCount = initialPosts.filter((post) => post.published).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <section className="rounded-[2rem] bg-[var(--bg-secondary)] px-8 py-10 text-[var(--text-primary)] shadow-lg card">
            <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-accent)]">
              Wellness Journal
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-[var(--text-primary)]">
              Practical guides for everyday moringa routines
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {isAdmin
                ? "Manage blog drafts and published articles. Only published posts appear on the public journal."
                : "Simple guidance on using moringa teas, powders, oils, and bundles in daily life."}
            </p>
            {!isAdmin ? (
              <p className="mt-3 text-sm text-[var(--text-accent)]">
                {publishedCount} {publishedCount === 1 ? "article" : "articles"}{" "}
                published
              </p>
            ) : null}
          </section>

          {error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mt-10">
              <BlogManager embedded />
            </div>
          ) : null}

          {loading ? (
            <div className="mt-10 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              Loading journal...
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="mt-10 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm card">
              No blog posts yet.
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => (
                <article
                  key={post.id as string | number}
                  className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card"
                >
                  {post.coverImage ? (
                    <Link href={`/blog/${post.slug}`} className="block">
                      <Image
                        src={resolveImageUrl(post.coverImage as string)}
                        alt={post.title as string}
                        width={800}
                        height={400}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="h-56 w-full object-cover"
                      />
                    </Link>
                  ) : null}
                  <div className="space-y-3 p-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        {(post.published as boolean) ? "Published" : "Draft"}
                      </p>
                      {post.publishedAt ? (
                        <span className="text-sm text-[var(--text-muted)]">
                          {new Date(
                            post.publishedAt as string,
                          ).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
                      {post.title as string}
                    </h3>
                    {post.excerpt ? (
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">
                        {post.excerpt as string}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => router.push(`/blog/${post.slug}`)}
                      className="btn-secondary"
                    >
                      Read article
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
