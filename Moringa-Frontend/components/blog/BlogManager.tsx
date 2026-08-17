"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBlogPost,
  deleteBlogPost,
  getAllBlogPosts,
  updateBlogPost,
  uploadBlogImage,
} from "@/lib/api/blog";
import { useToast } from "@/hooks/useToast";

const EMPTY_BLOG_FORM: Record<string, unknown> = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  published: false,
  publishedAt: "",
};

export default function BlogManager({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [posts, setPosts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, unknown>>(EMPTY_BLOG_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [localImagePreview, setLocalImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    return () => {
      if (localImagePreview) {
        URL.revokeObjectURL(localImagePreview);
      }
    };
  }, [localImagePreview]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllBlogPosts();
      setPosts(Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/blog"));
        return;
      }
      setError((err as Error).message || "Could not load blog posts.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const showError = (message: string) => {
    setError(message);
    toast.showToast({
      severity: "error",
      summary: "Error",
      detail: message,
      life: 6000,
    });
  };

  const handleImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    try {
      setUploadingImage(true);
      setError("");
      if (localImagePreview) {
        URL.revokeObjectURL(localImagePreview);
      }
      setSelectedImageName(file.name);
      setLocalImagePreview(previewUrl);
      const response = (await uploadBlogImage(file)) as { imageUrl: string };
      setForm((current) => ({ ...current, coverImage: response.imageUrl }));
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Cover image uploaded.",
        life: 4000,
      });
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setLocalImagePreview("");
      setSelectedImageName("");
      showError((err as Error).message || "Could not upload blog image.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = event.target;
    const type = target.type;
    const value = target.value;
    const checked = "checked" in target ? target.checked : false;
    setForm((current) => ({
      ...current,
      [target.name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview);
    }
    setForm(EMPTY_BLOG_FORM);
    setEditingId(null);
    setSelectedImageName("");
    setLocalImagePreview("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = {
      title: (form.title as string).trim(),
      slug: (form.slug as string).trim(),
      excerpt: (form.excerpt as string).trim() || undefined,
      content: (form.content as string).trim(),
      coverImage: (form.coverImage as string).trim() || undefined,
      published: Boolean(form.published),
      publishedAt: (form.publishedAt as string) || undefined,
    };
    try {
      if (editingId) {
        await updateBlogPost(editingId, payload);
        toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Blog post updated successfully.",
          life: 4000,
        });
      } else {
        await createBlogPost(payload);
        toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Blog post created successfully.",
          life: 4000,
        });
      }
      resetForm();
      await loadPosts();
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/blog"));
        return;
      }
      showError((err as Error).message || "Could not save blog post.");
    }
  };

  const handleEdit = (post: Record<string, unknown>) => {
    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview);
    }
    setEditingId(post.id as string);
    setForm({
      title: (post.title ?? "") as string,
      slug: (post.slug ?? "") as string,
      excerpt: (post.excerpt ?? "") as string,
      content: (post.content ?? "") as string,
      coverImage: (post.coverImage ?? "") as string,
      published: Boolean(post.published ?? false),
      publishedAt: post.publishedAt
        ? new Date(post.publishedAt as string).toISOString().slice(0, 10)
        : "",
    });
    setSelectedImageName("");
    setLocalImagePreview("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deleteBlogPost(postId);
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Blog post deleted successfully.",
        life: 4000,
      });
      if (editingId === postId) {
        resetForm();
      }
      await loadPosts();
    } catch (err) {
      showError((err as Error).message || "Could not delete blog post.");
    }
  };

  const resolveImageUrl = (value: string | null | undefined) => {
    if (!value) return "";
    if (
      value.startsWith("http") ||
      value.startsWith("blob:") ||
      value.startsWith("data:")
    )
      return value;
    return value;
  };

  return (
    <div className={embedded ? "" : "space-y-8"}>
      <section className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              {editingId ? "Edit blog post" : "Add blog post"}
            </p>
            <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
              {editingId ? "Update existing article" : "Create a new article"}
            </h2>
          </div>
          {editingId ? (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel edit
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            name="title"
            placeholder="Post title"
            aria-label="Post title"
            value={form.title as string}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="slug"
            placeholder="Slug"
            aria-label="Slug"
            value={form.slug as string}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="excerpt"
            placeholder="Short excerpt"
            aria-label="Short excerpt"
            value={form.excerpt as string}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
          <textarea
            name="content"
            placeholder="Full article content"
            aria-label="Full article content"
            value={form.content as string}
            onChange={handleChange}
            rows={8}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-muted)] p-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Cover image
            </label>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              Upload a cover image for the blog post. Accepted formats: JPG,
              PNG, WEBP, GIF. Max size: 5MB.
            </p>
            <input
              type="file"
              accept="image/*"
              aria-label="Cover image"
              onChange={handleImageFileChange}
              className="mt-3 block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
            />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {selectedImageName || "No file selected yet."}
            </p>
            {uploadingImage ? (
              <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                Uploading cover image…
              </p>
            ) : null}
          </div>
          {localImagePreview || (form.coverImage as string) ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-muted)]">
              {}
              <img
                src={resolveImageUrl(
                  localImagePreview || (form.coverImage as string),
                )}
                alt="Blog cover preview"
                width={800}
                height={400}
                className="h-52 w-full object-cover"
              />
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                name="published"
                type="checkbox"
                checked={form.published as boolean}
                onChange={handleChange}
              />
              Published
            </label>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Published at
              <input
                name="publishedAt"
                type="date"
                value={form.publishedAt as string}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              />
            </label>
          </div>

          <button type="submit" className="btn-admin w-full">
            {editingId ? "Update blog post" : "Create blog post"}
          </button>
        </form>
      </section>

      <section className="admin-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              Blog list
            </p>
            <h2 className="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
              Manage articles
            </h2>
          </div>
          <div className="rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            {posts.length} posts
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 admin-card-static p-5 text-sm text-[var(--text-secondary)]">
            Loading blog posts…
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {posts.map((post) => (
              <article
                key={post.id as string | number}
                className="admin-card grid gap-3 p-3 md:grid-cols-[96px_1fr]"
              >
                {post.coverImage ? (
                  <img
                    src={resolveImageUrl(post.coverImage as string)}
                    alt={post.title as string}
                    className="h-24 w-full rounded-[1rem] object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-[1rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    No cover
                  </div>
                )}

                <div className="flex flex-col justify-between gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        {(post.published as boolean) ? "Published" : "Draft"}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                        {post.title as string}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        {post.slug as string}
                      </p>
                      {post.excerpt ? (
                        <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                          {post.excerpt as string}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5 text-right">
                      {post.publishedAt ? (
                        <div className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {new Date(
                            post.publishedAt as string,
                          ).toLocaleDateString()}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(post)}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id as string)}
                      className="btn-danger px-3 py-1.5 text-sm"
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
}
