import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { getBlogPosts, getAllBlogPosts } from "../../../lib/api/blog";
import { resolveImageUrl } from "../../../lib/config";
import { useAutoDismiss } from "../../../hooks/useAutoDismiss";
import { BlogManager } from "../../../components/admin/BlogManager";
import { useAuthState } from "../../../hooks/useAuthState";
import { SmartImage } from "../../../components/SmartImage";
import { buildHead } from "../../../lib/seo";

export const useInitialPosts = routeLoader$(async () => {
  let posts: Record<string, unknown>[] = [];
  let loadError = "";
  try {
    const data = await getBlogPosts();
    posts = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  } catch (err) {
    loadError =
      err instanceof Error && err.message
        ? err.message
        : "Could not load blog posts.";
  }
  return { posts, loadError };
});

/**
 * Wellness Journal list. Admins additionally get the embedded BlogManager
 * with draft visibility. Port of legacy blog list page + client.
 */
export default component$(() => {
  const initial = useInitialPosts();
  const nav = useNavigate();
  const { currentUser } = useAuthState();

  const adminPosts = useSignal<Record<string, unknown>[]>([]);
  const error = useSignal(initial.value.loadError);
  const loading = useSignal(false);

  useAutoDismiss(error, $(() => { error.value = ""; }), 5000);

  useVisibleTask$(async ({ track }) => {
    if (track(currentUser)?.role !== "ADMIN") return;
    loading.value = true;
    try {
      const data = await getAllBlogPosts();
      adminPosts.value = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : [];
    } catch {
      adminPosts.value = [];
    } finally {
      loading.value = false;
    }
  });

  const isAdmin = currentUser.value?.role === "ADMIN";
  const visiblePosts = isAdmin ? adminPosts.value : initial.value.posts;
  const publishedCount = initial.value.posts.filter(
    (post) => post.published,
  ).length;

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <section class="card rounded-[2rem] bg-[var(--bg-secondary)] px-8 py-10 text-[var(--text-primary)] shadow-lg">
            <p class="text-sm uppercase tracking-[0.12em] text-[var(--text-accent)]">
              Wellness Journal
            </p>
            <h1 class="mt-4 font-serif text-4xl leading-tight text-[var(--text-primary)]">
              Practical guides for everyday moringa routines
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {isAdmin
                ? "Manage blog drafts and published articles. Only published posts appear on the public journal."
                : "Simple guidance on using moringa teas, powders, oils, and bundles in daily life."}
            </p>
            {!isAdmin ? (
              <p class="mt-3 text-sm text-[var(--text-accent)]">
                {publishedCount} {publishedCount === 1 ? "article" : "articles"}{" "}
                published
              </p>
            ) : null}
          </section>

          {error.value ? (
            <div
              class="mt-6 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
              role="alert"
            >
              {error.value}
            </div>
          ) : null}

          {isAdmin ? (
            <div class="mt-10">
              <BlogManager embedded />
            </div>
          ) : null}

          {loading.value ? (
            <div class="card mt-10 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10">
              Loading journal...
            </div>
          ) : visiblePosts.length === 0 ? (
            <div class="card mt-10 rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-secondary)] shadow-sm">
              No blog posts yet.
            </div>
          ) : (
            <div class="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => (
                <article
                  key={String(post.id)}
                  class="card overflow-hidden rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm transition hover:-translate-y-1"
                >
                  {post.coverImage ? (
                    <Link href={`/blog/${post.slug}`} class="block">
                      <SmartImage
                        src={resolveImageUrl(post.coverImage as string)}
                        alt={post.title as string}
                        width={800}
                        height={400}
                        class="h-56 w-full object-cover"
                      />
                    </Link>
                  ) : null}
                  <div class="space-y-3 p-6">
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        {(post.published as boolean) ? "Published" : "Draft"}
                      </p>
                      {post.publishedAt ? (
                        <span class="text-sm text-[var(--text-muted)]">
                          {new Date(
                            post.publishedAt as string,
                          ).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <h3 class="text-2xl font-semibold text-[var(--text-primary)]">
                      {post.title as string}
                    </h3>
                    {post.excerpt ? (
                      <p class="text-sm leading-7 text-[var(--text-secondary)]">
                        {post.excerpt as string}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick$={() =>
                        nav(`/blog/${post.slug as string}`)
                      }
                      class="btn-secondary"
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
});

export const head: DocumentHead = () =>
  buildHead({
    title: "Wellness Journal",
    description:
      "Read articles about moringa health benefits, wellness tips, recipes, and natural living from the Moringa Store Online journal.",
    path: "/blog",
    image: "https://my-nest-project-pearl.vercel.app/images/home-hero-1.webp",
  });
