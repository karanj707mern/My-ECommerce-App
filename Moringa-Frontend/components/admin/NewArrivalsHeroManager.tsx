"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  createHeroImage,
  deleteHeroImage,
  getHeroImages,
  updateHeroImage,
  uploadHeroImage,
} from "@/lib/api/hero";
import {
  createNewArrivalImage,
  deleteNewArrivalImage,
  getNewArrivalImages,
  updateNewArrivalImage,
  uploadNewArrivalImage,
} from "@/lib/api/new-arrival";
import { resolveImageUrl } from "@/lib/config";
import { useToast } from "@/hooks/useToast";

type HeroImageRecord = {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type NewArrivalImageRecord = {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  active: boolean;
  comingSoon?: boolean;
  createdAt: string;
  updatedAt: string;
};

type Tab = "hero" | "new-arrivals";

export default function NewArrivalsHeroManager() {
  const [tab, setTab] = useState<Tab>("hero");
  const [heroImages, setHeroImages] = useState<HeroImageRecord[]>([]);
  const [newArrivalImages, setNewArrivalImages] = useState<
    NewArrivalImageRecord[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [heroUploadPreview, setHeroUploadPreview] = useState<string | null>(
    null,
  );
  const [heroUploadFile, setHeroUploadFile] = useState<File | null>(null);
  const [newArrivalUploadPreview, setNewArrivalUploadPreview] = useState<
    string | null
  >(null);
  const [newArrivalUploadFile, setNewArrivalUploadFile] = useState<File | null>(
    null,
  );
  const { showToast } = useToast();

  const loadHeroImages = useCallback(async () => {
    try {
      const data = await getHeroImages();
      setHeroImages(Array.isArray(data) ? data : []);
    } catch {
      showToast({ severity: "error", detail: "Failed to load hero images" });
    }
  }, [showToast]);

  const loadNewArrivalImages = useCallback(async () => {
    try {
      const data = await getNewArrivalImages();
      setNewArrivalImages(Array.isArray(data) ? data : []);
    } catch {
      showToast({
        severity: "error",
        detail: "Failed to load new arrival images",
      });
    }
  }, [showToast]);

  useEffect(() => {
    if (tab === "hero") {
      loadHeroImages();
    } else {
      loadNewArrivalImages();
    }
  }, [tab, loadHeroImages, loadNewArrivalImages]);

  useEffect(() => {
    return () => {
      if (heroUploadPreview) {
        URL.revokeObjectURL(heroUploadPreview);
      }
      if (newArrivalUploadPreview) {
        URL.revokeObjectURL(newArrivalUploadPreview);
      }
    };
  }, [heroUploadPreview, newArrivalUploadPreview]);

  const activeHeroImages = useMemo(
    () => heroImages.filter((image) => image.active),
    [heroImages],
  );

  const activeNewArrivalImages = useMemo(
    () => newArrivalImages.filter((image) => image.active),
    [newArrivalImages],
  );

  const handleHeroFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      setHeroUploadFile(file);
      setHeroUploadPreview(file ? URL.createObjectURL(file) : null);
    },
    [],
  );

  const handleNewArrivalFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      setNewArrivalUploadFile(file);
      setNewArrivalUploadPreview(file ? URL.createObjectURL(file) : null);
    },
    [],
  );

  const handleCreateHero = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);

      try {
        let url = "";
        let alt = "";
        let sortOrder = 0;
        let active = true;

        const formAlt =
          (event.currentTarget.elements.namedItem("alt") as HTMLInputElement)
            ?.value || "";
        const formSortOrder = Number(
          (
            event.currentTarget.elements.namedItem(
              "sortOrder",
            ) as HTMLInputElement
          )?.value || 0,
        );
        const formActive =
          (event.currentTarget.elements.namedItem("active") as HTMLInputElement)
            ?.checked ?? true;

        if (heroUploadFile) {
          const result = await uploadHeroImage(heroUploadFile, {
            alt: formAlt,
            sortOrder: formSortOrder,
            active: formActive,
          });
          url = (result as Record<string, unknown>).url as string;
          alt = formAlt;
          sortOrder = formSortOrder;
          active = formActive;
        } else {
          const formData = new FormData(event.currentTarget);
          url = (formData.get("url") as string) || "";
          alt = (formData.get("alt") as string) || "";
          sortOrder = Number(formData.get("sortOrder") || 0);
          active = formData.get("active") !== "off";
        }

        if (!url) {
          showToast({
            severity: "error",
            detail: "Image URL or file is required",
          });
          return;
        }

        if (!heroUploadFile) {
          await createHeroImage({
            url,
            alt,
            sortOrder,
            active,
          });
        }

        showToast({ severity: "success", detail: "Hero image added" });
        event.currentTarget.reset();
        setHeroUploadFile(null);
        setHeroUploadPreview(null);
        await loadHeroImages();
      } catch {
        showToast({ severity: "error", detail: "Failed to add hero image" });
      } finally {
        setSaving(false);
      }
    },
    [loadHeroImages, showToast, heroUploadFile],
  );

  const handleCreateNewArrival = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaving(true);

      try {
        let url = "";
        let alt = "";
        let sortOrder = 0;
        let active = true;
        let comingSoon = false;

        const formAlt =
          (event.currentTarget.elements.namedItem("alt") as HTMLInputElement)
            ?.value || "";
        const formSortOrder = Number(
          (
            event.currentTarget.elements.namedItem(
              "sortOrder",
            ) as HTMLInputElement
          )?.value || 0,
        );
        const formActive =
          (event.currentTarget.elements.namedItem("active") as HTMLInputElement)
            ?.checked ?? true;
        const formComingSoon =
          (
            event.currentTarget.elements.namedItem(
              "comingSoon",
            ) as HTMLInputElement
          )?.checked ?? false;

        if (newArrivalUploadFile) {
          const result = await uploadNewArrivalImage(newArrivalUploadFile, {
            alt: formAlt,
            sortOrder: formSortOrder,
            active: formActive,
            comingSoon: formComingSoon,
          });
          url = (result as Record<string, unknown>).url as string;
          alt = formAlt;
          sortOrder = formSortOrder;
          active = formActive;
          comingSoon = formComingSoon;
        } else {
          const formData = new FormData(event.currentTarget);
          url = (formData.get("url") as string) || "";
          alt = (formData.get("alt") as string) || "";
          sortOrder = Number(formData.get("sortOrder") || 0);
          active = formData.get("active") !== "off";
          comingSoon = formData.get("comingSoon") === "on";
        }

        if (!url) {
          showToast({
            severity: "error",
            detail: "Image URL or file is required",
          });
          return;
        }

        if (!newArrivalUploadFile) {
          await createNewArrivalImage({
            url,
            alt,
            sortOrder,
            active,
            comingSoon,
          });
        }

        showToast({ severity: "success", detail: "New arrival image added" });
        event.currentTarget.reset();
        setNewArrivalUploadFile(null);
        setNewArrivalUploadPreview(null);
        await loadNewArrivalImages();
      } catch {
        showToast({
          severity: "error",
          detail: "Failed to add new arrival image",
        });
      } finally {
        setSaving(false);
      }
    },
    [loadNewArrivalImages, showToast, newArrivalUploadFile],
  );

  const handleUpdateHero = useCallback(
    async (id: number, data: Record<string, unknown>) => {
      setSaving(true);
      try {
        await updateHeroImage(id, data);
        showToast({ severity: "success", detail: "Hero image updated" });
        await loadHeroImages();
      } catch {
        showToast({ severity: "error", detail: "Failed to update hero image" });
      } finally {
        setSaving(false);
      }
    },
    [loadHeroImages, showToast],
  );

  const handleDeleteHero = useCallback(
    async (id: number) => {
      setSaving(true);
      try {
        await deleteHeroImage(id);
        showToast({ severity: "success", detail: "Hero image removed" });
        await loadHeroImages();
      } catch {
        showToast({ severity: "error", detail: "Failed to remove hero image" });
      } finally {
        setSaving(false);
      }
    },
    [loadHeroImages, showToast],
  );

  const handleUpdateNewArrival = useCallback(
    async (id: number, data: Record<string, unknown>) => {
      setSaving(true);
      try {
        await updateNewArrivalImage(id, data);
        showToast({ severity: "success", detail: "New arrival image updated" });
        await loadNewArrivalImages();
      } catch {
        showToast({
          severity: "error",
          detail: "Failed to update new arrival image",
        });
      } finally {
        setSaving(false);
      }
    },
    [loadNewArrivalImages, showToast],
  );

  const handleDeleteNewArrival = useCallback(
    async (id: number) => {
      setSaving(true);
      try {
        await deleteNewArrivalImage(id);
        showToast({ severity: "success", detail: "New arrival image removed" });
        await loadNewArrivalImages();
      } catch {
        showToast({
          severity: "error",
          detail: "Failed to remove new arrival image",
        });
      } finally {
        setSaving(false);
      }
    },
    [loadNewArrivalImages, showToast],
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          Marketing
        </p>
        <h1 className="font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
          New Arrivals & Hero
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
        Manage the hero carousel and curate new arrivals. Changes are reflected
        immediately after the cache refreshes.
      </p>

      <div className="mt-8 inline-flex rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] p-1">
        <button
          type="button"
          onClick={() => setTab("hero")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "hero"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:text-emerald-700 dark:text-emerald-300"
          }`}
        >
          Hero Images
        </button>
        <button
          type="button"
          onClick={() => setTab("new-arrivals")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "new-arrivals"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:text-emerald-700 dark:text-emerald-300"
          }`}
        >
          New Arrivals
        </button>
      </div>

      <div className="mt-8">
        {tab === "hero" ? (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <h2 className="font-serif text-2xl text-[var(--text-primary)]">
                Active hero images
              </h2>
              {activeHeroImages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No active hero images yet. Add one to get started.
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {activeHeroImages.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
                  >
                    <div className="relative h-56 w-full">
                      <Image
                        src={resolveImageUrl(image.url)}
                        alt={image.alt || "Hero image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1023px) 100vw, 50vw"
                      />
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {image.alt || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateHero(image.id, {
                              active: !image.active,
                            })
                          }
                          className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          {image.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateHero(image.id, {
                              sortOrder: Math.max(0, image.sortOrder - 1),
                            })
                          }
                          className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move left
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateHero(image.id, {
                              sortOrder: image.sortOrder + 1,
                            })
                          }
                          className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move right
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHero(image.id)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <h2 className="font-serif text-2xl text-[var(--text-primary)]">
                Add hero image
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Upload an image or paste a URL. For best results, use AVIF or
                WebP at 1200×800 or larger.
              </p>
              <form
                onSubmit={handleCreateHero}
                className="mt-6 space-y-4"
                method="post"
              >
                <div>
                  <label
                    htmlFor="hero-image-file"
                    className="text-sm font-medium text-[var(--text-primary)]"
                  >
                    Image file
                  </label>
                  <input
                    id="hero-image-file"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleHeroFileChange}
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  {heroUploadPreview ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-color)]">
                      <Image
                        src={heroUploadPreview}
                        alt="Upload preview"
                        width={1200}
                        height={800}
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Or Image URL
                  </label>
                  <input
                    name="url"
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    placeholder="/images/hero-5.webp"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Alt text
                  </label>
                  <input
                    name="alt"
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    placeholder="Fresh moringa harvest"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Sort order
                    </label>
                    <input
                      name="sortOrder"
                      type="number"
                      defaultValue={0}
                      className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="hero-active"
                      name="active"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-700 focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="hero-active"
                      className="text-sm text-[var(--text-primary)]"
                    >
                      Active
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add hero image"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <h2 className="font-serif text-2xl text-[var(--text-primary)]">
                Active new arrival images
              </h2>
              {activeNewArrivalImages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No active new arrival images yet. Add one to get started.
                </p>
              ) : null}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {activeNewArrivalImages.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
                  >
                    <div className="relative h-48 w-full sm:h-56">
                      <Image
                        src={resolveImageUrl(image.url)}
                        alt={image.alt || "New arrival image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1023px) 100vw, 50vw"
                      />
                    </div>
                    <div className="space-y-3 p-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {image.alt || "No description"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewArrival(image.id, {
                              active: !image.active,
                            })
                          }
                          className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          {image.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewArrival(image.id, {
                              sortOrder: Math.max(0, image.sortOrder - 1),
                            })
                          }
                          className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move left
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewArrival(image.id, {
                              sortOrder: image.sortOrder + 1,
                            })
                          }
                          className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
                        >
                          Move right
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateNewArrival(image.id, {
                              comingSoon: !image.comingSoon,
                            })
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            image.comingSoon
                              ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-amber-300 hover:text-amber-700"
                          }`}
                        >
                          {image.comingSoon ? "Coming Soon" : "Available"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNewArrival(image.id)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {newArrivalImages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No new arrival images found.
                </p>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <h2 className="font-serif text-2xl text-[var(--text-primary)]">
                Add new arrival image
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Upload an image or paste a URL. For best results, use AVIF or
                WebP at 1200×800 or larger.
              </p>
              <form
                onSubmit={handleCreateNewArrival}
                className="mt-6 space-y-4"
                method="post"
              >
                <div>
                  <label
                    htmlFor="new-arrival-image-file"
                    className="text-sm font-medium text-[var(--text-primary)]"
                  >
                    Image file
                  </label>
                  <input
                    id="new-arrival-image-file"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleNewArrivalFileChange}
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  {newArrivalUploadPreview ? (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-color)]">
                      <Image
                        src={newArrivalUploadPreview}
                        alt="Upload preview"
                        width={1200}
                        height={800}
                        className="h-48 w-full object-cover sm:h-56"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Or Image URL
                  </label>
                  <input
                    name="url"
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    placeholder="/images/new-arrival-1.webp"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Alt text
                  </label>
                  <input
                    name="alt"
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    placeholder="Fresh moringa harvest"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Sort order
                    </label>
                    <input
                      name="sortOrder"
                      type="number"
                      defaultValue={0}
                      className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="new-arrival-active"
                      name="active"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-700 focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="new-arrival-active"
                      className="text-sm text-[var(--text-primary)]"
                    >
                      Active
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="new-arrival-coming-soon"
                      name="comingSoon"
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-700 focus:ring-emerald-500"
                    />
                    <label
                      htmlFor="new-arrival-coming-soon"
                      className="text-sm text-[var(--text-primary)]"
                    >
                      Coming soon
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add new arrival image"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
