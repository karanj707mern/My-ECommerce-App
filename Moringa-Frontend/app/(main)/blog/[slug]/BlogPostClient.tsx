"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { resolveImageUrl } from "@/lib/config";
import { getBlogPost, getAllBlogPosts } from "@/lib/api/blog";

export interface BlogPostProps {
  post?: Record<string, unknown> | null;
}

export default function BlogPostPage({ post: initialPost }: BlogPostProps) {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const toast = useToast();
  const [post, setPost] = useState<Record<string, unknown> | null>(
    initialPost ?? null,
  );
  const [loading, setLoading] = useState(!initialPost);
  const [allPosts, setAllPosts] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (initialPost) {
      setPost(initialPost);
      setLoading(false);
    } else {
      getBlogPost(slug)
        .then((data) => {
          setPost(data as Record<string, unknown>);
        })
        .catch((err) => {
          toast.showToast({
            severity: "error",
            summary: "Could not load blog post",
            detail: (err as Error).message || "Could not load blog post.",
            life: 5000,
          });
          setPost(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }

    getAllBlogPosts()
      .then((data) => {
        setAllPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setAllPosts([]);
      });
  }, [slug, initialPost, toast]);

  const relatedPosts = allPosts
    .filter((item) => item.published && item.slug !== slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          {loading ? (
            <div className="mt-10 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10 card">
              Loading article...
            </div>
          ) : post ? (
            <article className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm card">
              {post.coverImage ? (
                <Image
                  src={resolveImageUrl(post.coverImage as string)}
                  alt={post.title as string}
                  width={1200}
                  height={600}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 70vw"
                  className="h-72 w-full rounded-t-[2rem] object-cover sm:h-96"
                />
              ) : null}
              <div className="space-y-5 p-6 sm:p-10">
                <div className="flex flex-wrap items-center gap-3 text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <span>Wellness Journal</span>
                  {post.publishedAt ? (
                    <span>
                      •{" "}
                      {new Date(
                        post.publishedAt as string,
                      ).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <h1 className="font-serif text-3xl leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                  {post.title as string}
                </h1>
                {post.excerpt ? (
                  <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                    {post.excerpt as string}
                  </p>
                ) : null}
                <div className="prose prose-stone max-w-none whitespace-pre-line text-sm leading-7 text-[var(--text-primary)] sm:text-base">
                  {post.content as string}
                </div>
              </div>
            </article>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm card">
              Article not found.
            </div>
          )}

          {relatedPosts.length > 0 ? (
            <section className="mt-16">
              <h2 className="font-serif text-3xl text-[var(--text-primary)]">
                More from the journal
              </h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <article
                    key={relatedPost.id as string | number}
                    className="overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1 card"
                  >
                    {relatedPost.coverImage ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/blog/${relatedPost.slug}`)}
                        className="block w-full text-left"
                      >
                        <Image
                          src={resolveImageUrl(
                            relatedPost.coverImage as string,
                          )}
                          alt={relatedPost.title as string}
                          width={800}
                          height={400}
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
                          className="h-44 w-full object-cover"
                        />
                      </button>
                    ) : null}
                    <div className="space-y-2 p-5">
                      <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                        {(relatedPost.publishedAt as string)
                          ? new Date(
                              relatedPost.publishedAt as string,
                            ).toLocaleDateString()
                          : "Draft"}
                      </p>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                        {relatedPost.title as string}
                      </h3>
                      <button
                        type="button"
                        onClick={() => router.push(`/blog/${relatedPost.slug}`)}
                        className="btn-secondary"
                      >
                        Read article
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
