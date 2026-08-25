import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  updateProduct,
  uploadProductImage,
} from "../../lib/api/product";
import { useToast } from "../../hooks/useToast";

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  description: string;
  image: string;
  brand: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  weightGrams: string;
  isActive: boolean;
  isNewArrival: boolean;
  stock: string;
}

const EMPTY_FORM: ProductFormState = {
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

function toFormState(product: Record<string, unknown>): ProductFormState {
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
    tags: Array.isArray(product.tags)
      ? (product.tags as string[]).join(", ")
      : "",
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

function hasAuthError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403;
}

/**
 * Admin catalog manager: create/edit/delete products with image upload.
 * Port of legacy `components/admin/ProductsManager.tsx`.
 */
export const ProductsManager = component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const products = useSignal<Record<string, unknown>[]>([]);
  const form = useStore<ProductFormState>({ ...EMPTY_FORM });
  const editingProductId = useSignal<string | null>(null);
  const loading = useSignal(true);
  const error = useSignal("");
  const uploadingImage = useSignal(false);
  const selectedImageName = useSignal("");
  const localImagePreview = useSignal("");
  const productFormRef = useSignal<HTMLElement>();

  useVisibleTask$(async () => {
    await loadProducts();
  });

  const loadProducts = $(async () => {
    try {
      loading.value = true;
      error.value = "";
      const data = await getAdminProducts();
      products.value = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : [];
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/products"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load products.";
    } finally {
      loading.value = false;
    }
  });

  const resetForm = $(() => {
    if (localImagePreview.value) {
      URL.revokeObjectURL(localImagePreview.value);
    }
    Object.assign(form, EMPTY_FORM);
    editingProductId.value = null;
    selectedImageName.value = "";
    localImagePreview.value = "";
  });

  const handleImageFileChange = $(
    async (_event: Event, el: HTMLInputElement) => {
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
        const response = (await uploadProductImage(file)) as {
          imageUrl: string;
        };
        form.image = response.imageUrl;
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Product image uploaded successfully.",
          life: 4000,
        });
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        localImagePreview.value = "";
        selectedImageName.value = "";
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not upload image.";
      } finally {
        uploadingImage.value = false;
        el.value = "";
      }
    },
  );

  const handleSubmit = $(async () => {
    error.value = "";
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
      if (editingProductId.value) {
        await updateProduct(editingProductId.value, payload);
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Product updated successfully.",
          life: 4000,
        });
      } else {
        await createProduct(payload);
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: "Product added successfully.",
          life: 4000,
        });
      }
      await resetForm();
      await loadProducts();
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/products"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not save product.";
    }
  });

  const handleEdit = $((product: Record<string, unknown>) => {
    if (localImagePreview.value) {
      URL.revokeObjectURL(localImagePreview.value);
    }
    editingProductId.value = String(product.id);
    Object.assign(form, toFormState(product));
    selectedImageName.value = "";
    localImagePreview.value = "";
    productFormRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  const handleDelete = $(async (productId: string) => {
    try {
      await deleteProduct(productId);
      await toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Product deleted successfully.",
        life: 4000,
      });
      if (editingProductId.value === productId) {
        await resetForm();
      }
      await loadProducts();
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not delete product.";
    }
  });

  const inputClass =
    "w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500";

  return (
    <div class="space-y-8">
      <section
        ref={productFormRef}
        class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              {editingProductId.value ? "Edit product" : "Add product"}
            </p>
            <h2 class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
              {editingProductId.value
                ? "Update existing item"
                : "Create a new store item"}
            </h2>
          </div>
          {editingProductId.value ? (
            <button type="button" onClick$={resetForm} class="btn-secondary">
              Cancel edit
            </button>
          ) : null}
        </div>

        <form
          preventdefault:submit
          onSubmit$={handleSubmit}
          class="mt-8 space-y-4"
        >
          <input
            placeholder="Product name"
            aria-label="Product name"
            value={form.name}
            onInput$={(_, el) => (form.name = el.value)}
            class={inputClass}
            required
          />
          <div class="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Slug"
              aria-label="Slug"
              value={form.slug}
              onInput$={(_, el) => (form.slug = el.value)}
              class={inputClass}
              required
            />
            <input
              placeholder="SKU"
              aria-label="SKU"
              value={form.sku}
              onInput$={(_, el) => (form.sku = el.value)}
              class={inputClass}
              required
            />
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            aria-label="Price"
            value={form.price}
            onInput$={(_, el) => (form.price = el.value)}
            class={inputClass}
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Compare-at price"
            aria-label="Compare-at price"
            value={form.compareAtPrice}
            onInput$={(_, el) => (form.compareAtPrice = el.value)}
            class={inputClass}
          />
          <input
            type="number"
            min="0"
            placeholder="Stock quantity"
            aria-label="Stock quantity"
            value={form.stock}
            onInput$={(_, el) => (form.stock = el.value)}
            class={inputClass}
            required
          />
          <div class="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Brand"
              aria-label="Brand"
              value={form.brand}
              onInput$={(_, el) => (form.brand = el.value)}
              class={inputClass}
            />
          </div>
          <input
            placeholder="Tags separated by commas"
            aria-label="Tags separated by commas"
            value={form.tags}
            onInput$={(_, el) => (form.tags = el.value)}
            class={inputClass}
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Weight in grams"
            aria-label="Weight in grams"
            value={form.weightGrams}
            onInput$={(_, el) => (form.weightGrams = el.value)}
            class={inputClass}
          />
          <input
            placeholder="Image URL"
            aria-label="Image URL"
            value={form.image}
            onInput$={(_, el) => (form.image = el.value)}
            class={inputClass}
            required
          />
          <div class="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-muted)] p-4">
            <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              Upload product image
            </label>
            <p class="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              This opens your file manager so you can choose an image from your
              computer.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange$={handleImageFileChange}
              class="mt-3 block w-full text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-800"
            />
            <p class="mt-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {selectedImageName.value || "No file selected yet."}
            </p>
            {uploadingImage.value ? (
              <p class="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                Uploading image…
              </p>
            ) : null}
          </div>
          {localImagePreview.value || form.image ? (
            <div class="overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-muted)]">
              <img
                src={localImagePreview.value || form.image}
                alt="Product preview"
                class="h-52 w-full object-cover"
              />
            </div>
          ) : null}
          <textarea
            placeholder="Product description"
            aria-label="Product description"
            value={form.description}
            onInput$={(_, el) => (form.description = el.value)}
            rows={5}
            class={inputClass}
            required
          />
          <input
            placeholder="SEO title"
            aria-label="SEO title"
            value={form.seoTitle}
            onInput$={(_, el) => (form.seoTitle = el.value)}
            class={inputClass}
          />
          <textarea
            placeholder="SEO description"
            aria-label="SEO description"
            value={form.seoDescription}
            onInput$={(_, el) => (form.seoDescription = el.value)}
            rows={3}
            class={inputClass}
          />
          <label class="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange$={(_, el) => (form.isActive = el.checked)}
            />
            Product is active on the storefront
          </label>
          <label class="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.isNewArrival}
              onChange$={(_, el) => (form.isNewArrival = el.checked)}
            />
            Show in New Arrivals carousel
          </label>

          <button type="submit" class="btn-admin w-full">
            {editingProductId.value ? "Update product" : "Add product"}
          </button>
        </form>
      </section>

      <section class="admin-card p-4 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
              Product list
            </p>
            <h2 class="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
              Manage store inventory
            </h2>
          </div>
          <div class="rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            {products.value.length} items
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
            Loading products…
          </div>
        ) : (
          <div class="mt-6 space-y-3">
            {products.value.map((product) => (
              <article
                key={String(product.id)}
                class="admin-card grid gap-3 p-3 md:grid-cols-[96px_1fr]"
              >
                {product.image ? (
                  <img
                    src={product.image as string}
                    alt={product.name as string}
                    width={110}
                    height={110}
                    class="h-24 w-full rounded-[1rem] object-cover"
                  />
                ) : (
                  <div class="flex h-24 w-full items-center justify-center rounded-[1rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    No image
                  </div>
                )}
                <div class="flex flex-col justify-between gap-3">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        Rs. {String(product.price)}
                      </p>
                      <h3 class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                        {product.name as string}
                      </h3>
                      <p class="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        {(product.sku as string) ?? ""}
                        {product.brand ? ` · ${product.brand as string}` : ""}
                      </p>
                      <p class="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                        {(product.description as string) ?? ""}
                      </p>
                    </div>
                    <div class="space-y-1.5">
                      <div class="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Stock {String(product.stock)}
                      </div>
                      <div
                        class={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.12em] ${
                          product.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-[var(--bg-muted)] text-[var(--text-secondary)] dark:bg-[var(--bg-muted)] dark:text-[var(--text-secondary)]"
                        }`}
                      >
                        {product.isActive ? "Active" : "Draft"}
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick$={() => handleEdit(product)}
                      class="btn-secondary px-3 py-1.5 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick$={() => {
                        if (
                          window.confirm(
                            "Delete this product? This cannot be undone.",
                          )
                        ) {
                          void handleDelete(String(product.id));
                        }
                      }}
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

export default ProductsManager;
