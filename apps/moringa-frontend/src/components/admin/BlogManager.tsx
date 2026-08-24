import { $, component$, useSignal, useVisibleTask$, useStore } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import {
  createBlogPost,
  deleteBlogPost,
  getAllBlogPosts,
  updateBlogPost,
  uploadBlogImage,
} from "../../lib/api/blog";
import { useToast } from "../../hooks/useToast";

export interface BlogFormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  published: boolean;
  publishedAt: string;
}

const EMPTY_BLOG_FORM: BlogFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  published: false,
  publishedAt: "",
};

function hasAuthError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403;
}

/**
 * Admin CRUD for blog posts with cover-image upload.
 * Port of legacy `components/blog/BlogManager.tsx`.
 */
export const BlogManager = component$<{ embedded?: boolean }>(({ embedded }) => {
  const nav = useNavigate();
  const toast = useToast();

  const posts = useSignal<Record<string, unknown>[]>([]);
  const loading = useSignal(true);
  const error = useSignal("");
  const form = useStore<BlogFormState>({ ...EMPTY_BLOG_FORM });
  const editingId = useSignal<string | null>(null);
  const selectedImageName = useSignal("");
  const localImagePreview = useSignal("");
  const uploadingImage = useSignal(false);

  useVisibleTask$(async () => {
    await loadPosts();
  });

  const loadPosts = $(async () => {
    try {
      loading.value = true;
      error.value = "";
      const data = await getAllBlogPosts();
      posts.value = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/blog"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load blog posts.";
    } finally {
      loading.value = false;
    }
  });

  const showError = $((message: string) => {
    error.value = message;
    void toast.showToast({
      severity: "error",
      summary: "Error",
      detail: message,
      life: 6000,
    });
  });

  const handleImageFileChange = $(async (_event: Event, el: HTMLInputElement) => {
    const file = el.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    try {
      uploadingImage.value = true;
      error.value = "";
      if (localImagePreview.value) {
        URL.revokeObjectURL(localImagePreview.value);
      }
      selectedImageName.value = file.name;
      localImagePreview.value = previewUrl;
      const response = (await uploadBlogImage(file)) as { imageUrl: string };
      form.coverImage = response.imageUrl;
      await toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Cover image uploaded.",
        life: 4000,
      });
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      localImagePreview.value = "";
      selectedImageName.value = "";
      await showError(
        err instanceof Error && err.message
          ? err.message
          : "Could not upload blog image.",
      );
    } finally {
      uploadingImage.value = false;
      el.value = "";
    }
  });

  const resetForm = $(() => {
    if (localImagePreview.value) {
      URL.revokeObjectURL(localImagePreview.value);
    }
    Object.assign(form, EMPTY_BLOG_FORM);
    editingId.value = null;
    selectedImageName.value = "";
    localImagePreview.value = "";
  });

  const handleSubmit = $(async () => {
    error.value = "";
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim(),
      coverImage: form.coverImage.trim() || undefined,
      published: Boolean(form.published),
      publishedAt: form.publishedAt || undefined,
    };
    try {
      if (editingId.value) {
        await updateBlogPost(editingId.value, payload);
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Blog post updated successfully.",
          life: 4000,
        });
      } else {
        await createBlogPost(payload);
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Blog post created successfully.",
          life: 4000,
        });
      }
      await resetForm();
      await loadPosts();
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/blog"));
        return;
      }
      await showError(
        err instanceof Error && err.message
          ? err.message
          : "Could not save blog post.",
      );
    }
  });

  const handleEdit = $((post: Record<string, unknown>) => {
    if (localImagePreview.value) {
      URL.revokeObjectURL(localImagePreview.value);
    }
    editingId.value = String(post.id);
    form.title = (post.title ?? "") as string;
    form.slug = (post.slug ?? "") as string;
    form.excerpt = (post.excerpt ?? "") as string;
    form.content = (post.content ?? "") as string;
    form.coverImage = (post.coverImage ?? "") as string;
    form.published = Boolean(post.published ?? false);
    form.publishedAt = post.publishedAt
      ? new Date(post.publishedAt as string).toISOString().slice(0, 10)
      : "";
    selectedImageName.value = "";
    localImagePreview.value = "";
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  const handleDelete = $(async (postId: string) => {
    try {
      await deleteBlogPost(postId);
      await toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Blog post deleted successfully.",
        life: 4000,
      });
      if (editingId.value === postId) {
        await resetForm();
      }
      await loadPosts();
    } catch (err) {
      await showError(
        err instanceof Error && err.message
          ? err.message
          : "Could not delete blog post.",
      );
    }
  });

  const inputClass =
    "w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500";

  return (
    <div class={embedded ? "" : "space-y-8"}>
      <section class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              {editingId.value ? "Edit blog post" : "Add blog post"}
            </p>
            <h2 class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
              {editingId.value ? "Update existing article" : "Create a new article"}
            </h2>
          </div>
          {editingId.value ? (
            <button type="button" onClick$={resetForm} class="btn-secondary">
              Cancel edit
            </button>
          ) : null}
        </div>

        <form preventdefault:submit onSubmit$={handleSubmit} class="mt-8 space-y-4">
          <input
            placeholder="Post title"
            aria-label="Post title"
            value={form.title}
            onInput$={(_, el) => (form.title = el.value)}
            class={inputClass}
            required
          />
          <input
            placeholder="Slug"
            aria-label="Slug"
            value={form.slug}
            onInput$={(_, el) => (form.slug = el.value)}
            class={inputClass}
            required
          />
          <input
            placeholder="Short excerpt"
            aria-label="Short excerpt"
            value={form.excerpt}
            onInput$={(_, el) => (form.excerpt = el.value)}
            class={inputClass}
          />
          <textarea
            placeholder="Full article content"
            aria-label="Full article content"
            value={form.content}
            onInput$={(_, el) => (form.content = el.value)}
            rows={8}
            class={inputClass}
            required
          />
          <div class="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-muted)] p-4">
            <label class="block text-sm font-medium text-[var(--text-secondary)]">
              Cover image
            </label>
            <p class="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              Upload a cover image for the blog post. Accepted formats: JPG,
              PNG, WEBP, GIF. Max size: 5MB.
            </p>
            <input
              type="file"
              accept="image/*"
              aria-label="Cover image"
              onChange$={handleImageFileChange}
              class="mt-3 block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
            />
            <p class="mt-3 text-sm text-[var(--text-secondary)]">
              {selectedImageName.value || "No file selected yet."}
            </p>
            {uploadingImage.value ? (
              <p class="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                Uploading cover image…
              </p>
            ) : null}
          </div>
          {localImagePreview.value || form.coverImage ? (
            <div class="overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-muted)]">
              <img
                src={localImagePreview.value || form.coverImage}
                alt="Blog cover preview"
                width={800}
                height={400}
                class="h-52 w-full object-cover"
              />
            </div>
          ) : null}
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={form.published}
                onChange$={(_, el) => (form.published = el.checked)}
              />
              Published
            </label>
            <label class="block text-sm font-medium text-[var(--text-secondary)]">
              Published at
              <input
                type="date"
                value={form.publishedAt}
                onInput$={(_, el) => (form.publishedAt = el.value)}
                class={`${inputClass} mt-2`}
              />
            </label>
          </div>

          <button type="submit" class="btn-admin w-full">
            {editingId.value ? "Update blog post" : "Create blog post"}
          </button>
        </form>
      </section>

      <section class="admin-card p-4 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              Blog list
            </p>
            <h2 class="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
              Manage articles
            </h2>
          </div>
          <div class="rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            {posts.value.length} posts
          </div>
        </div>

        {error.value ? (
          <div
            class="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            {error.value}
          </div>
        ) : null}

        {loading.value ? (
          <div class="admin-card-static mt-6 p-5 text-sm text-[var(--text-secondary)]">
            Loading blog posts…
          </div>
        ) : (
          <div class="mt-6 space-y-3">
            {posts.value.map((post) => (
              <article
                key={String(post.id)}
                class="admin-card grid gap-3 p-3 md:grid-cols-[96px_1fr]"
              >
                {post.coverImage ? (
                  <img
                    src={post.coverImage as string}
                    alt={post.title as string}
                    class="h-24 w-full rounded-[1rem] object-cover"
                  />
                ) : (
                  <div class="flex h-24 w-full items-center justify-center rounded-[1rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    No cover
                  </div>
                )}

                <div class="flex flex-col justify-between gap-3">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        {(post.published as boolean) ? "Published" : "Draft"}
                      </p>
                      <h3 class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                        {post.title as string}
                      </h3>
                      <p class="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        {post.slug as string}
                      </p>
                      {post.excerpt ? (
                        <p class="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                          {post.excerpt as string}
                        </p>
                      ) : null}
                    </div>
                    <div class="space-y-1.5 text-right">
                      {post.publishedAt ? (
                        <div class="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {new Date(
                            post.publishedAt as string,
                          ).toLocaleDateString()}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick$={() => handleEdit(post)}
                      class="btn-secondary px-3 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick$={() => handleDelete(String(post.id))}
                      class="btn-danger px-3 py-1.5 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export default BlogManager;
