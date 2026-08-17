"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  updateProduct,
  uploadProductImage,
} from "@/lib/api/product";
import { resolveImageUrl } from "@/lib/config";
import { useToast } from "@/hooks/useToast";

const EMPTY_FORM = {
  name: "",
  slug: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  description: "",
  image: "",
  brand: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  weightGrams: "",
  isActive: true,
  isNewArrival: false,
  stock: "",
};

function toFormState(product: Record<string, unknown>) {
  return {
    name: (product.name ?? "") as string,
    slug: (product.slug ?? "") as string,
    sku: (product.sku ?? "") as string,
    price:
      product.price === null || product.price === undefined
        ? ""
        : String(product.price),
    compareAtPrice:
      product.compareAtPrice === null || product.compareAtPrice === undefined
        ? ""
        : String(product.compareAtPrice),
    description: (product.description ?? "") as string,
    image: (product.image ?? "") as string,
    brand: (product.brand ?? "") as string,
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    seoTitle: (product.seoTitle ?? "") as string,
    seoDescription: (product.seoDescription ?? "") as string,
    weightGrams:
      product.weightGrams === null || product.weightGrams === undefined
        ? ""
        : String(product.weightGrams),
    isActive: Boolean(product.isActive ?? true),
    isNewArrival: Boolean(product.isNewArrival ?? false),
    stock:
      product.stock === null || product.stock === undefined
        ? ""
        : String(product.stock),
  };
}

export default function ProductsManager() {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [localImagePreview, setLocalImagePreview] = useState("");
  const productFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (localImagePreview) {
        URL.revokeObjectURL(localImagePreview);
      }
    };
  }, [localImagePreview]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminProducts();
      setProducts(
        Array.isArray(data) ? (data as Record<string, unknown>[]) : [],
      );
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/products"));
        return;
      }
      setError((err as Error).message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetForm = () => {
    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview);
    }
    setForm(EMPTY_FORM);
    setEditingProductId(null);
    setSelectedImageName("");
    setLocalImagePreview("");
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
      const response = (await uploadProductImage(file)) as { imageUrl: string };
      setForm((current) => ({ ...current, image: response.imageUrl }));
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Product image uploaded successfully.",
        life: 4000,
      });
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setLocalImagePreview("");
      setSelectedImageName("");
      setError((err as Error).message || "Could not upload image.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      compareAtPrice:
        form.compareAtPrice.trim() === ""
          ? undefined
          : Number(form.compareAtPrice),
      description: form.description.trim(),
      image: form.image.trim(),
      brand: form.brand.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
      weightGrams:
        form.weightGrams.trim() === "" ? undefined : Number(form.weightGrams),
      isActive: Boolean(form.isActive),
      isNewArrival: Boolean(form.isNewArrival),
      stock: Number(form.stock),
    };
    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Product updated successfully.",
          life: 4000,
        });
      } else {
        await createProduct(payload);
        toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Product added successfully.",
          life: 4000,
        });
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/products"));
        return;
      }
      setError((err as Error).message || "Could not save product.");
    }
  };

  const handleEdit = (product: Record<string, unknown>) => {
    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview);
    }
    setEditingProductId(product.id as string);
    setForm(toFormState(product));
    setSelectedImageName("");
    setLocalImagePreview("");
    productFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Product deleted successfully.",
        life: 4000,
      });
      if (editingProductId === productId) {
        resetForm();
      }
      await loadProducts();
    } catch (err) {
      setError((err as Error).message || "Could not delete product.");
    }
  };

  return (
    <div className="space-y-8">
      <section
        ref={productFormRef}
        className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              {editingProductId ? "Edit product" : "Add product"}
            </p>
            <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-3xl">
              {editingProductId
                ? "Update existing item"
                : "Create a new store item"}
            </h2>
          </div>
          {editingProductId ? (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel edit
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            name="name"
            placeholder="Product name"
            aria-label="Product name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="slug"
              placeholder="Slug"
              aria-label="Slug"
              value={form.slug}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
            <input
              name="sku"
              placeholder="SKU"
              aria-label="SKU"
              value={form.sku}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </div>
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            aria-label="Price"
            value={form.price}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="compareAtPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="Compare-at price"
            aria-label="Compare-at price"
            value={form.compareAtPrice}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
          <input
            name="stock"
            type="number"
            min="0"
            placeholder="Stock quantity"
            aria-label="Stock quantity"
            value={form.stock}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="brand"
              placeholder="Brand"
              aria-label="Brand"
              value={form.brand}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </div>
          <input
            name="tags"
            placeholder="Tags separated by commas"
            aria-label="Tags separated by commas"
            value={form.tags}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
          <input
            name="weightGrams"
            type="number"
            min="0"
            step="1"
            placeholder="Weight in grams"
            aria-label="Weight in grams"
            value={form.weightGrams}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
          <input
            name="image"
            placeholder="Image URL"
            aria-label="Image URL"
            value={form.image}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-muted)] p-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              Upload product image
            </label>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              This opens your file manager so you can choose an image from your
              computer.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="mt-3 block w-full text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
            />
            <p className="mt-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {selectedImageName || "No file selected yet."}
            </p>
            {uploadingImage ? (
              <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                Uploading image…
              </p>
            ) : null}
          </div>
          {localImagePreview || form.image ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-muted)]">
              {}
              <img
                src={resolveImageUrl(localImagePreview || form.image)}
                alt="Product preview"
                className="h-52 w-full object-cover"
              />
            </div>
          ) : null}
          <textarea
            name="description"
            placeholder="Product description"
            aria-label="Product description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
          />
          <input
            name="seoTitle"
            placeholder="SEO title"
            aria-label="SEO title"
            value={form.seoTitle}
            onChange={handleChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
          <textarea
            name="seoDescription"
            placeholder="SEO description"
            aria-label="SEO description"
            value={form.seoDescription}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              name="isActive"
              type="checkbox"
              checked={form.isActive as boolean}
              onChange={handleChange}
            />
            Product is active on the storefront
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              name="isNewArrival"
              type="checkbox"
              checked={form.isNewArrival as boolean}
              onChange={handleChange}
            />
            Show in New Arrivals carousel
          </label>

          <button type="submit" className="btn-admin w-full">
            {editingProductId ? "Update product" : "Add product"}
          </button>
        </form>
      </section>

      <section className="admin-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              Product list
            </p>
            <h2 className="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
              Manage store inventory
            </h2>
          </div>
          <div className="rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            {products.length} items
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 admin-card-static p-5 text-sm text-[var(--text-secondary)]">
            Loading products…
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {products.map((product) => (
              <article
                key={product.id as string | number}
                className="admin-card grid gap-3 p-3 md:grid-cols-[96px_1fr]"
              >
                {product.image ? (
                  <img
                    src={resolveImageUrl(product.image as string)}
                    alt={product.name as string}
                    width={110}
                    height={110}
                    className="h-24 w-full rounded-[1rem] object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-[1rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    No image
                  </div>
                )}
                <div className="flex flex-col justify-between gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        Rs. {product.price as number}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                        {product.name as string}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        {product.sku as string}
                        {(product.brand as string)
                          ? ` · ${product.brand as string}`
                          : ""}
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                        {product.description as string}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Stock {product.stock as number}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] ${
                          product.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-900/40"
                            : "bg-[var(--bg-muted)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] dark:bg-[var(--bg-muted)]"
                        }`}
                      >
                        {product.isActive ? "Active" : "Draft"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Delete this product? This cannot be undone.",
                          )
                        ) {
                          handleDelete(product.id as string);
                        }
                      }}
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
