import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getAllBlogPosts } from "../../../../lib/api/blog";
import { API_BASE_URL, resolveImageUrl } from "../../../../lib/config";
import { useToast } from "../../../../hooks/useToast";
import { SmartImage } from "../../../../components/SmartImage";
import { getSiteUrl } from "../../../../lib/seo";

interface BlogPostData {
  id?: number | string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  coverImage?: string | null;
  content?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

async function fetchPost(slug: string): Promise<BlogPostData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as BlogPostData;
  } catch {
    return null;
  }
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const usePostData = routeLoader$(async ({ params }) => {
  const post = await fetchPost(params.slug);
  return post;
});

/**
 * Blog article page with JSON-LD BlogPosting schema and related posts.
 * Port of legacy blog `[slug]` page + `BlogPostClient`.
 */
export default component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const data = usePostData();

  const allPosts = useSignal<Record<string, unknown>[]>([]);

  useVisibleTask$(async () => {
    try {
      const list = await getAllBlogPosts();
      allPosts.value = Array.isArray(list)
        ? (list as Record<string, unknown>[])
        : [];
    } catch {
      allPosts.value = [];
      await toast.showToast({
        severity: "error",
        summary: "Could not load blog posts",
        detail: "Related articles are unavailable right now.",
        life: 4000,
      });
    }
  });

  const post = data.value;

  /* JSON-LD structured data */
  const siteUrl = getSiteUrl();
  const slug = post?.slug ?? "";
  const postImage = post?.coverImage
    ? /^https?:\/\//.test(post.coverImage)
      ? post.coverImage
      : `${siteUrl}${post.coverImage}`
    : undefined;

  const breadcrumbJsonLd = post
    ? serializeJsonLd({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Journal",
            item: `${siteUrl}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title || "Article",
            item: `${siteUrl}/blog/${slug}`,
          },
        ],
      })
    : "";

  const blogPostingJsonLd =
    post && (post.publishedAt || post.createdAt || post.updatedAt) !== undefined
      ? serializeJsonLd({
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
        })
      : "";

  const relatedPosts = allPosts.value
    .filter((item) => item.published && item.slug !== slug)
    .slice(0, 3);

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          {post ? (
            <article class="card rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
              {post.coverImage ? (
                <SmartImage
                  src={resolveImageUrl(post.coverImage)}
                  alt={post.title ?? ""}
                  width={1200}
                  height={600}
                  class="h-72 w-full rounded-t-[2rem] object-cover sm:h-96"
                />
              ) : null}
              <div class="space-y-5 p-6 sm:p-10">
                <div class="flex flex-wrap items-center gap-3 text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
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
                <h1 class="font-serif text-3xl leading-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                  {post.title as string}
                </h1>
                {post.excerpt ? (
                  <p class="max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                    {post.excerpt as string}
                  </p>
                ) : null}
                <div class="prose prose-stone max-w-none whitespace-pre-line text-sm leading-7 text-[var(--text-primary)] sm:text-base">
                  {post.content as string}
                </div>
              </div>
            </article>
          ) : (
            <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm">
              Article not found.
            </div>
          )}

          {relatedPosts.length > 0 ? (
            <section class="mt-16">
              <h2 class="font-serif text-3xl text-[var(--text-primary)]">
                More from the journal
              </h2>
              <div class="mt-8 grid gap-6 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <article
                    key={String(relatedPost.id)}
                    class="card overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1"
                  >
                    {relatedPost.coverImage ? (
                      <button
                        type="button"
                        onClick$={() =>
                          nav(`/blog/${relatedPost.slug as string}`)
                        }
                        class="block w-full text-left"
                      >
                        <SmartImage
                          src={resolveImageUrl(
                            relatedPost.coverImage as string,
                          )}
                          alt={relatedPost.title as string}
                          width={800}
                          height={400}
                          class="h-44 w-full object-cover"
                        />
                      </button>
                    ) : null}
                    <div class="space-y-2 p-5">
                      <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                        {(relatedPost.publishedAt as string)
                          ? new Date(
                              relatedPost.publishedAt as string,
                            ).toLocaleDateString()
                          : "Draft"}
                      </p>
                      <h3 class="text-xl font-semibold text-[var(--text-primary)]">
                        {relatedPost.title as string}
                      </h3>
                      <button
                        type="button"
                        onClick$={() =>
                          nav(`/blog/${relatedPost.slug as string}`)
                        }
                        class="btn-secondary"
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

      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={breadcrumbJsonLd}
        />
      ) : null}
      {blogPostingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={blogPostingJsonLd}
        />
      ) : null}
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const post = resolveValue(usePostData);

  if (!post) {
    return { title: "Article Not Found" };
  }

  const siteUrl = getSiteUrl();
  const title = post.title || "Wellness Journal";
  const description = post.excerpt || "";
  const image = post.coverImage
    ? /^https?:\/\//.test(post.coverImage)
      ? post.coverImage
      : `${siteUrl}${post.coverImage}`
    : undefined;

  return {
    title,
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${siteUrl}/blog/${post.slug}` },
      ...(image ? [{ property: "og:image", content: image }] : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@moringastore" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(image ? [{ name: "twitter:image", content: image }] : []),
    ],
    links: [{ rel: "canonical", href: `${siteUrl}/blog/${post.slug}` }],
  };
};
