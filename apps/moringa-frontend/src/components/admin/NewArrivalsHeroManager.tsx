import {
  $,
  component$,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  createHeroImage,
  deleteHeroImage,
  getHeroImages,
  updateHeroImage,
  uploadHeroImage,
} from "../../lib/api/hero";
import {
  createNewArrivalImage,
  deleteNewArrivalImage,
  getNewArrivalImages,
  updateNewArrivalImage,
  uploadNewArrivalImage,
} from "../../lib/api/new-arrival";
import { resolveImageUrl } from "../../lib/config";
import { useToast } from "../../hooks/useToast";
import { SmartImage } from "../SmartImage";

type Tab = "hero" | "new-arrivals";

interface HeroFormElements extends HTMLFormControlsCollection {
  url: HTMLInputElement;
  alt: HTMLInputElement;
  sortOrder: HTMLInputElement;
  active: HTMLInputElement;
}

interface NewArrivalFormElements extends HTMLFormControlsCollection {
  url: HTMLInputElement;
  alt: HTMLInputElement;
  sortOrder: HTMLInputElement;
  active: HTMLInputElement;
  comingSoon: HTMLInputElement;
}

/**
 * Admin marketing manager: hero carousel + new arrivals with image upload,
 * reordering, activation and coming-soon toggle.
 * Port of legacy `components/admin/NewArrivalsHeroManager.tsx`.
 */
export const NewArrivalsHeroManager = component$(() => {
  const tab = useSignal<Tab>("hero");
  const heroImages = useSignal<Record<string, unknown>[]>([]);
  const newArrivalImages = useSignal<Record<string, unknown>[]>([]);
  const saving = useSignal(false);
  const heroUploadPreview = useSignal<string | null>(null);
  const heroUploadFile = useSignal<File | null>(null);
  const newArrivalUploadPreview = useSignal<string | null>(null);
  const newArrivalUploadFile = useSignal<File | null>(null);

  const toast = useToast();

  const loadHeroImages = $(async () => {
    try {
      const data = await getHeroImages();
      heroImages.value = Array.isArray(data) ? data : [];
    } catch {
      void toast.showToast({
        severity: "error",
        detail: "Failed to load hero images",
      });
    }
  });

  const loadNewArrivalImages = $(async () => {
    try {
      const data = await getNewArrivalImages();
      newArrivalImages.value = Array.isArray(data) ? data : [];
    } catch {
      void toast.showToast({
        severity: "error",
        detail: "Failed to load new arrival images",
      });
    }
  });

  useVisibleTask$(async ({ track }) => {
    if (track(tab) === "hero") {
      await loadHeroImages();
    } else {
      await loadNewArrivalImages();
    }
  });

  const activeHeroImages = useComputed$(() =>
    heroImages.value.filter((image) => image.active),
  );
  const activeNewArrivalImages = useComputed$(() =>
    newArrivalImages.value.filter((image) => image.active),
  );

  const handleHeroFileChange = $((_event: Event, el: HTMLInputElement) => {
    const file = el.files?.[0] ?? null;
    heroUploadFile.value = file;
    heroUploadPreview.value = file ? URL.createObjectURL(file) : null;
  });

  const handleNewArrivalFileChange = $(
    (_event: Event, el: HTMLInputElement) => {
      const file = el.files?.[0] ?? null;
      newArrivalUploadFile.value = file;
      newArrivalUploadPreview.value = file ? URL.createObjectURL(file) : null;
    },
  );

  const handleCreateHero = $(async (event: SubmitEvent) => {
    event.preventDefault();
    saving.value = true;

    try {
      const form = event.currentTarget as HTMLFormElement;
      const elements = form.elements as HeroFormElements;
      const formAlt = elements.alt?.value || "";
      const formSortOrder = Number(elements.sortOrder?.value || 0);
      const formActive = elements.active?.checked ?? true;

      if (heroUploadFile.value) {
        await uploadHeroImage(heroUploadFile.value, {
          alt: formAlt,
          sortOrder: formSortOrder,
          active: formActive,
        });
      } else {
        const url = elements.url?.value || "";
        if (!url) {
          void toast.showToast({
            severity: "error",
            detail: "Image URL or file is required",
          });
          return;
        }
        await createHeroImage({
          url,
          alt: formAlt,
          sortOrder: formSortOrder,
          active: formActive,
        });
      }

      void toast.showToast({ severity: "success", detail: "Hero image added" });
      form.reset();
      heroUploadFile.value = null;
      heroUploadPreview.value = null;
      await loadHeroImages();
    } catch {
      void toast.showToast({
        severity: "error",
        detail: "Failed to add hero image",
      });
    } finally {
      saving.value = false;
    }
  });

  const handleCreateNewArrival = $(async (event: SubmitEvent) => {
    event.preventDefault();
    saving.value = true;

    try {
      const form = event.currentTarget as HTMLFormElement;
      const elements = form.elements as NewArrivalFormElements;
      const formAlt = elements.alt?.value || "";
      const formSortOrder = Number(elements.sortOrder?.value || 0);
      const formActive = elements.active?.checked ?? true;
      const formComingSoon = elements.comingSoon?.checked ?? false;

      if (newArrivalUploadFile.value) {
        await uploadNewArrivalImage(newArrivalUploadFile.value, {
          alt: formAlt,
          sortOrder: formSortOrder,
          active: formActive,
          comingSoon: formComingSoon,
        });
      } else {
        const url = elements.url?.value || "";
        if (!url) {
          void toast.showToast({
            severity: "error",
            detail: "Image URL or file is required",
          });
          return;
        }
        await createNewArrivalImage({
          url,
          alt: formAlt,
          sortOrder: formSortOrder,
          active: formActive,
          comingSoon: formComingSoon,
        });
      }

      void toast.showToast({
        severity: "success",
        detail: "New arrival image added",
      });
      form.reset();
      newArrivalUploadFile.value = null;
      newArrivalUploadPreview.value = null;
      await loadNewArrivalImages();
    } catch {
      void toast.showToast({
        severity: "error",
        detail: "Failed to add new arrival image",
      });
    } finally {
      saving.value = false;
    }
  });

  const handleUpdateHero = $(
    async (id: number, data: Record<string, unknown>) => {
      saving.value = true;
      try {
        await updateHeroImage(id, data);
        void toast.showToast({
          severity: "success",
          detail: "Hero image updated",
        });
        await loadHeroImages();
      } catch {
        void toast.showToast({
          severity: "error",
          detail: "Failed to update hero image",
        });
      } finally {
        saving.value = false;
      }
    },
  );

  const handleDeleteHero = $(async (id: number) => {
    saving.value = true;
    try {
      await deleteHeroImage(id);
      void toast.showToast({
        severity: "success",
        detail: "Hero image removed",
      });
      await loadHeroImages();
    } catch {
      void toast.showToast({
        severity: "error",
        detail: "Failed to remove hero image",
      });
    } finally {
      saving.value = false;
    }
  });

  const handleUpdateNewArrival = $(
    async (id: number, data: Record<string, unknown>) => {
      saving.value = true;
      try {
        await updateNewArrivalImage(id, data);
        void toast.showToast({
          severity: "success",
          detail: "New arrival image updated",
        });
        await loadNewArrivalImages();
      } catch {
        void toast.showToast({
          severity: "error",
          detail: "Failed to update new arrival image",
        });
      } finally {
        saving.value = false;
      }
    },
  );

  const handleDeleteNewArrival = $(async (id: number) => {
    saving.value = true;
    try {
      await deleteNewArrivalImage(id);
      void toast.showToast({
        severity: "success",
        detail: "New arrival image removed",
      });
      await loadNewArrivalImages();
    } catch {
      void toast.showToast({
        severity: "error",
        detail: "Failed to remove new arrival image",
      });
    } finally {
      saving.value = false;
    }
  });

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500";

  return (
    <section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Marketing
        </p>
        <h1 class="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
          New Arrivals & Hero
        </h1>
      </div>
      <p class="mt-2 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
        Manage the hero carousel and curate new arrivals. Changes are reflected
        immediately after the cache refreshes.
      </p>

      <div class="mt-8 inline-flex rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] p-1">
        <button
          type="button"
          onClick$={() => (tab.value = "hero")}
          class={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab.value === "hero"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:text-emerald-700 dark:text-emerald-300"
          }`}
        >
          Hero Images
        </button>
        <button
          type="button"
          onClick$={() => (tab.value = "new-arrivals")}
          class={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab.value === "new-arrivals"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:text-emerald-700 dark:text-emerald-300"
          }`}
        >
          New Arrivals
        </button>
      </div>

      <div class="mt-8">
        {tab.value === "hero" ? (
          <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div class="space-y-4">
              <h2 class="font-serif text-2xl text-[var(--text-primary)]">
                Active hero images
              </h2>
              {activeHeroImages.value.length === 0 ? (
                <p class="text-sm text-[var(--text-muted)]">
                  No active hero images yet. Add one to get started.
                </p>
              ) : null}
              <div class="grid gap-4 sm:grid-cols-2">
                {activeHeroImages.value.map((image) => (
                  <div
                    key={String(image.id)}
                    class="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
                  >
                    <SmartImage
                      src={resolveImageUrl(image.url as string)}
                      alt={(image.alt as string) || "Hero image"}
                      width={1200}
                      height={800}
                      class="h-56 w-full object-cover"
                    />
                    <div class="space-y-3 p-4">
                      <p class="text-sm text-[var(--text-secondary)]">
                        {(image.alt as string) || "No description"}
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateHero(Number(image.id), {
                              active: !image.active,
                            })
                          }
                          class="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          {image.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateHero(Number(image.id), {
                              sortOrder: Math.max(
                                0,
                                Number(image.sortOrder) - 1,
                              ),
                            })
                          }
                          class="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move left
                        </button>
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateHero(Number(image.id), {
                              sortOrder: Number(image.sortOrder) + 1,
                            })
                          }
                          class="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move right
                        </button>
                        <button
                          type="button"
                          onClick$={() => handleDeleteHero(Number(image.id))}
                          class="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <h2 class="font-serif text-2xl text-[var(--text-primary)]">
                Add hero image
              </h2>
              <p class="mt-2 text-sm text-[var(--text-secondary)]">
                Upload an image or paste a URL. For best results, use AVIF or
                WebP at 1200×800 or larger.
              </p>
              <form
                preventdefault:submit
                onSubmit$={handleCreateHero}
                class="mt-6 space-y-4"
              >
                <div>
                  <label class="text-sm font-medium text-[var(--text-primary)]">
                    Image file
                  </label>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange$={handleHeroFileChange}
                    class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  {heroUploadPreview.value ? (
                    <div class="mt-3 overflow-hidden rounded-2xl border border-[var(--border-color)]">
                      <SmartImage
                        src={heroUploadPreview.value}
                        alt="Upload preview"
                        width={1200}
                        height={800}
                        class="h-56 w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label class="text-sm font-medium text-[var(--text-primary)]">
                    Or Image URL
                  </label>
                  <input
                    name="url"
                    placeholder="/images/hero-5.webp"
                    class={inputClass}
                  />
                </div>
                <div>
                  <label class="text-sm font-medium text-[var(--text-primary)]">
                    Alt text
                  </label>
                  <input
                    name="alt"
                    placeholder="Fresh moringa harvest"
                    class={inputClass}
                  />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="text-sm font-medium text-[var(--text-primary)]">
                      Sort order
                    </label>
                    <input
                      name="sortOrder"
                      type="number"
                      value="0"
                      class={inputClass}
                    />
                  </div>
                  <div class="flex items-center gap-3">
                    <input
                      id="hero-active"
                      name="active"
                      type="checkbox"
                      checked
                      class="h-4 w-4 rounded border-[var(--border-color)] text-emerald-700 focus:ring-emerald-500"
                    />
                    <label
                      for="hero-active"
                      class="text-sm text-[var(--text-primary)]"
                    >
                      Active
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving.value}
                  class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.value ? "Saving..." : "Add hero image"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div class="space-y-4">
              <h2 class="font-serif text-2xl text-[var(--text-primary)]">
                Active new arrival images
              </h2>
              {activeNewArrivalImages.value.length === 0 ? (
                <p class="text-sm text-[var(--text-muted)]">
                  No active new arrival images yet. Add one to get started.
                </p>
              ) : null}
              <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {activeNewArrivalImages.value.map((image) => (
                  <div
                    key={String(image.id)}
                    class="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
                  >
                    <SmartImage
                      src={resolveImageUrl(image.url as string)}
                      alt={(image.alt as string) || "New arrival image"}
                      width={1200}
                      height={800}
                      class="h-48 w-full object-cover sm:h-56"
                    />
                    <div class="space-y-3 p-4">
                      <p class="text-sm text-[var(--text-secondary)]">
                        {(image.alt as string) || "No description"}
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateNewArrival(Number(image.id), {
                              active: !image.active,
                            })
                          }
                          class="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          {image.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateNewArrival(Number(image.id), {
                              sortOrder: Math.max(
                                0,
                                Number(image.sortOrder) - 1,
                              ),
                            })
                          }
                          class="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move left
                        </button>
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateNewArrival(Number(image.id), {
                              sortOrder: Number(image.sortOrder) + 1,
                            })
                          }
                          class="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move right
                        </button>
                        <button
                          type="button"
                          onClick$={() =>
                            handleUpdateNewArrival(Number(image.id), {
                              comingSoon: !image.comingSoon,
                            })
                          }
                          class={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            image.comingSoon
                              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-amber-300 hover:text-amber-700"
                          }`}
                        >
                          {image.comingSoon ? "Coming Soon" : "Available"}
                        </button>
                        <button
                          type="button"
                          onClick$={() =>
                            handleDeleteNewArrival(Number(image.id))
                          }
                          class="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {newArrivalImages.value.length === 0 ? (
                <p class="text-sm text-[var(--text-muted)]">
                  No new arrival images found.
                </p>
              ) : null}
            </div>

            <div class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <h2 class="font-serif text-2xl text-[var(--text-primary)]">
                Add new arrival image
              </h2>
              <p class="mt-2 text-sm text-[var(--text-secondary)]">
                Upload an image or paste a URL. For best results, use AVIF or
                WebP at 1200×800 or larger.
              </p>
              <form
                preventdefault:submit
                onSubmit$={handleCreateNewArrival}
                class="mt-6 space-y-4"
              >
                <div>
                  <label class="text-sm font-medium text-[var(--text-primary)]">
                    Image file
                  </label>
                  <input
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange$={handleNewArrivalFileChange}
                    class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  {newArrivalUploadPreview.value ? (
                    <div class="mt-3 overflow-hidden rounded-2xl border border-[var(--border-color)]">
                      <SmartImage
                        src={newArrivalUploadPreview.value}
                        alt="Upload preview"
                        width={1200}
                        height={800}
                        class="h-48 w-full object-cover sm:h-56"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label class="text-sm font-medium text-[var(--text-primary)]">
                    Or Image URL
                  </label>
                  <input
                    name="url"
                    placeholder="/images/new-arrival-1.webp"
                    class={inputClass}
                  />
                </div>
                <div>
                  <label class="text-sm font-medium text-[var(--text-primary)]">
                    Alt text
                  </label>
                  <input
                    name="alt"
                    placeholder="Fresh moringa harvest"
                    class={inputClass}
                  />
                </div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="text-sm font-medium text-[var(--text-primary)]">
                      Sort order
                    </label>
                    <input
                      name="sortOrder"
                      type="number"
                      value="0"
                      class={inputClass}
                    />
                  </div>
                  <div class="flex items-center gap-3">
                    <input
                      id="new-arrival-active"
                      name="active"
                      type="checkbox"
                      checked
                      class="h-4 w-4 rounded border-[var(--border-color)] text-emerald-700 focus:ring-emerald-500"
                    />
                    <label
                      for="new-arrival-active"
                      class="text-sm text-[var(--text-primary)]"
                    >
                      Active
                    </label>
                  </div>
                  <div class="flex items-center gap-3">
                    <input
                      id="new-arrival-coming-soon"
                      name="comingSoon"
                      type="checkbox"
                      class="h-4 w-4 rounded border-[var(--border-color)] text-emerald-700 focus:ring-emerald-500"
                    />
                    <label
                      for="new-arrival-coming-soon"
                      class="text-sm text-[var(--text-primary)]"
                    >
                      Coming soon
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving.value}
                  class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving.value ? "Saving..." : "Add new arrival image"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default NewArrivalsHeroManager;
