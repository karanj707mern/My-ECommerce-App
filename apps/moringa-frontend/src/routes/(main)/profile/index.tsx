import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import {
  createUserAddress,
  deleteUserAddress,
  getProfile,
  updateProfile,
  updateUserAddress,
  uploadAvatar,
} from "../../../lib/api/auth";
import { clearToken, setCurrentUser } from "../../../lib/storage";
import { useToast } from "../../../hooks/useToast";
import { useAuthState } from "../../../hooks/useAuthState";
import { SmartImage } from "../../../components/SmartImage";
import { buildHead } from "../../../lib/seo";

const EMPTY_PROFILE = {
  name: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const EMPTY_ADDRESS = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

type ProfileFormState = typeof EMPTY_PROFILE;
type AddressFormState = typeof EMPTY_ADDRESS;

function hasStatus(err: unknown, code: number): boolean {
  return (err as { status?: number })?.status === code;
}

const inputClass =
  "w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500";

/**
 * Profile management: account details + avatar upload + address book CRUD.
 * Port of the legacy profile page.
 */
export default component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();

  const form = useSignal<ProfileFormState>({ ...EMPTY_PROFILE });
  const addresses = useSignal<Record<string, unknown>[]>([]);
  const addressForm = useSignal<AddressFormState>({ ...EMPTY_ADDRESS });
  const editingAddressId = useSignal<string | null>(null);
  const loading = useSignal(true);
  const saving = useSignal(false);
  const addressSaving = useSignal(false);
  const addressDeletingId = useSignal<string | null>(null);
  const avatarFile = useSignal<File | null>(null);
  const avatarPreview = useSignal<string | null>(null);
  const uploadingAvatar = useSignal(false);

  const redirectToAuth = $(async () => {
    clearToken();
    await nav(
      "/auth?from=" +
        encodeURIComponent("/profile") +
        "&authMessage=" +
        encodeURIComponent("Sign in to manage your profile."),
    );
  });

  const applyProfileResponse = $(
    (
      data: { user: Record<string, unknown>; message?: string },
      successMessage = "",
    ) => {
      setCurrentUser(data.user);
      form.value = {
        name: (data.user.name as string) ?? "",
        phoneNumber: (data.user.phoneNumber as string) ?? "",
        addressLine1: (data.user.addressLine1 as string) ?? "",
        addressLine2: (data.user.addressLine2 as string) ?? "",
        city: (data.user.city as string) ?? "",
        state: (data.user.state as string) ?? "",
        postalCode: (data.user.postalCode as string) ?? "",
        country: (data.user.country as string) ?? "India",
      };
      addresses.value =
        (data.user.addresses as Record<string, unknown>[]) ?? [];
      const msg = successMessage || data.message || "";
      if (msg) {
        void toast.showToast({
          severity: "success",
          summary: "Success",
          detail: msg,
          life: 3000,
        });
      }
    },
  );

  const resetAddressForm = $(() => {
    editingAddressId.value = null;
    addressForm.value = { ...EMPTY_ADDRESS };
  });

  useVisibleTask$(async ({ track }) => {
    if (!track(authChecked)) return;
    if (!track(currentUser)?.id) {
      await redirectToAuth();
      return;
    }

    try {
      const data = (await getProfile()) as {
        user: Record<string, unknown>;
        message?: string;
      };
      await applyProfileResponse(data);
      avatarPreview.value =
        (data.user?.avatar as string | null | undefined) || null;
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      await toast.showToast({
        severity: "error",
        summary: "Could not load profile",
        detail:
          err instanceof Error && err.message
            ? err.message
            : "Could not load your profile.",
        life: 4000,
      });
    } finally {
      loading.value = false;
    }
  });

  const handleAvatarChange = $((_event: Event, el: HTMLInputElement) => {
    avatarFile.value = el.files?.[0] ?? null;
    if (avatarFile.value) {
      avatarPreview.value = URL.createObjectURL(avatarFile.value);
    }
  });

  const handleAvatarUpload = $(async () => {
    if (!avatarFile.value) return;

    uploadingAvatar.value = true;

    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile.value);

      const data = (await uploadAvatar(formData)) as { avatarUrl: string };
      await updateProfile({ avatar: data.avatarUrl });
      avatarPreview.value = data.avatarUrl;
      avatarFile.value = null;
      await toast.showToast({
        severity: "success",
        summary: "Avatar updated",
        detail: "Your profile photo has been updated.",
        life: 3000,
      });
    } catch (err) {
      await toast.showToast({
        severity: "error",
        summary: "Upload failed",
        detail:
          err instanceof Error && err.message
            ? err.message
            : "Could not upload avatar.",
        life: 4000,
      });
    } finally {
      uploadingAvatar.value = false;
    }
  });

  const handleRemoveAvatar = $(async () => {
    uploadingAvatar.value = true;

    try {
      await updateProfile({ avatar: "" });
      avatarPreview.value = null;
      avatarFile.value = null;
      await toast.showToast({
        severity: "info",
        summary: "Avatar removed",
        detail: "Your profile photo has been removed.",
        life: 3000,
      });
    } catch (err) {
      await toast.showToast({
        severity: "error",
        summary: "Removal failed",
        detail:
          err instanceof Error && err.message
            ? err.message
            : "Could not remove avatar.",
        life: 4000,
      });
    } finally {
      uploadingAvatar.value = false;
    }
  });

  const handleSubmit = $(async () => {
    saving.value = true;

    try {
      const data = (await updateProfile({ ...form.value })) as {
        user: Record<string, unknown>;
        message?: string;
      };
      await applyProfileResponse(data, "Profile updated successfully.");
      await toast.showToast({
        severity: "success",
        summary: "Profile saved",
        detail: "Your profile details have been updated.",
        life: 3000,
      });
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      await toast.showToast({
        severity: "error",
        summary: "Save failed",
        detail:
          (err instanceof Error && err.message) ||
          "Could not update your profile.",
        life: 4000,
      });
    } finally {
      saving.value = false;
    }
  });

  const handleAddressSubmit = $(async () => {
    addressSaving.value = true;

    try {
      const data = editingAddressId.value
        ? ((await updateUserAddress(editingAddressId.value, {
            ...addressForm.value,
          })) as { user: Record<string, unknown>; message?: string })
        : ((await createUserAddress({ ...addressForm.value })) as {
            user: Record<string, unknown>;
            message?: string;
          });
      await applyProfileResponse(
        data,
        editingAddressId.value
          ? "Address updated successfully."
          : "Address added successfully.",
      );
      await toast.showToast({
        severity: "success",
        summary: editingAddressId.value ? "Address updated" : "Address added",
        detail: editingAddressId.value
          ? "Your address has been updated."
          : "New address has been saved.",
        life: 3000,
      });
      await resetAddressForm();
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      await toast.showToast({
        severity: "error",
        summary: "Address save failed",
        detail:
          (err instanceof Error && err.message) ||
          "Could not save this address.",
        life: 4000,
      });
    } finally {
      addressSaving.value = false;
    }
  });

  const startEditingAddress = $((address: Record<string, unknown>) => {
    editingAddressId.value = String(address.id);
    addressForm.value = {
      label: (address.label as string) ?? "",
      recipientName: (address.recipientName as string) ?? "",
      phoneNumber: (address.phoneNumber as string) ?? "",
      addressLine1: (address.addressLine1 as string) ?? "",
      addressLine2: (address.addressLine2 as string) ?? "",
      city: (address.city as string) ?? "",
      state: (address.state as string) ?? "",
      postalCode: (address.postalCode as string) ?? "",
      country: (address.country as string) ?? "",
      isDefault: Boolean(address.isDefault),
    };
  });

  const handleDeleteAddress = $(async (addressId: string) => {
    addressDeletingId.value = addressId;

    try {
      const data = (await deleteUserAddress(addressId)) as {
        user: Record<string, unknown>;
        message?: string;
      };
      await applyProfileResponse(data, "Address removed successfully.");
      await toast.showToast({
        severity: "error",
        summary: "Address deleted",
        detail: "The address has been permanently removed.",
        life: 3500,
      });
      if (editingAddressId.value === addressId) {
        await resetAddressForm();
      }
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      await toast.showToast({
        severity: "error",
        summary: "Delete failed",
        detail:
          (err instanceof Error && err.message) ||
          "Could not remove this address.",
        life: 4000,
      });
    } finally {
      addressDeletingId.value = null;
    }
  });

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                My Profile
              </p>
              <h1 class="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                Account and saved addresses
              </h1>
              {currentUser.value?.email ? (
                <p class="mt-3 text-sm text-[var(--text-secondary)]">
                  {currentUser.value.email as string}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick$={() => nav("/")}
              class="btn-secondary inline-flex"
            >
              Back to store
            </button>
          </div>

          <section class="card mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
            {loading.value ? (
              <div class="text-sm text-[var(--text-secondary)]">
                Loading profile...
              </div>
            ) : (
              <form
                preventdefault:submit
                onSubmit$={handleSubmit}
                class="space-y-6"
              >
                <div>
                  <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                    Account Details
                  </p>
                  <h2 class="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Basic details
                  </h2>
                </div>

                <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div class="relative">
                    <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)] sm:h-28 sm:w-28">
                      {avatarPreview.value ? (
                        <SmartImage
                          src={avatarPreview.value}
                          alt="Profile"
                          width={112}
                          height={112}
                          class="h-full w-full object-cover"
                        />
                      ) : (
                        <span class="text-3xl font-semibold">
                          {(
                            form.value.name ||
                            ((currentUser.value?.email as string) ?? "") ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div class="w-full space-y-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      onChange$={handleAvatarChange}
                      class={inputClass}
                    />
                    <div class="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick$={handleAvatarUpload}
                        disabled={!avatarFile.value || uploadingAvatar.value}
                        class="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingAvatar.value
                          ? "Uploading..."
                          : "Upload photo"}
                      </button>
                      {avatarPreview.value ? (
                        <button
                          type="button"
                          onClick$={handleRemoveAvatar}
                          disabled={uploadingAvatar.value}
                          class="btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                    <p class="text-xs text-[var(--text-muted)]">
                      JPG, PNG, WEBP, or GIF. Maximum size 2MB.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    for="name"
                    class="block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    value={form.value.name}
                    onInput$={(_, el) => (form.value.name = el.value)}
                    class={`${inputClass} mt-2`}
                    required
                  />
                </div>
                <div>
                  <label
                    for="profilePhone"
                    class="block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Phone number
                  </label>
                  <input
                    id="profilePhone"
                    inputMode="tel"
                    value={form.value.phoneNumber}
                    onInput$={(_, el) => (form.value.phoneNumber = el.value)}
                    class={`${inputClass} mt-2`}
                  />
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <input
                    placeholder="Address line 1"
                    aria-label="Address line 1"
                    value={form.value.addressLine1}
                    onInput$={(_, el) => (form.value.addressLine1 = el.value)}
                    class={inputClass}
                  />
                  <input
                    placeholder="Address line 2"
                    aria-label="Address line 2"
                    value={form.value.addressLine2}
                    onInput$={(_, el) => (form.value.addressLine2 = el.value)}
                    class={inputClass}
                  />
                  <input
                    placeholder="City"
                    aria-label="City"
                    value={form.value.city}
                    onInput$={(_, el) => (form.value.city = el.value)}
                    class={inputClass}
                  />
                  <input
                    placeholder="State"
                    aria-label="State"
                    value={form.value.state}
                    onInput$={(_, el) => (form.value.state = el.value)}
                    class={inputClass}
                  />
                  <input
                    placeholder="Postal code"
                    aria-label="Postal code"
                    value={form.value.postalCode}
                    onInput$={(_, el) => (form.value.postalCode = el.value)}
                    class={inputClass}
                  />
                  <input
                    placeholder="Country"
                    aria-label="Country"
                    value={form.value.country}
                    onInput$={(_, el) => (form.value.country = el.value)}
                    class={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving.value}
                  class="btn-admin w-full"
                >
                  {saving.value ? "Saving..." : "Save profile"}
                </button>
              </form>
            )}
          </section>

          <section class="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div class="card rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                    Delivery Book
                  </p>
                  <h2 class="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Saved addresses
                  </h2>
                </div>

                {editingAddressId.value ? (
                  <button
                    type="button"
                    onClick$={resetAddressForm}
                    class="btn-secondary"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <div class="mt-6 space-y-4">
                {addresses.value.length > 0 ? (
                  addresses.value.map((address) => (
                    <article
                      key={String(address.id)}
                      class="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-5"
                    >
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div class="flex flex-wrap items-center gap-2">
                            <h3 class="text-lg font-semibold text-[var(--text-primary)]">
                              {address.label as string}
                            </h3>
                            {address.isDefault ? (
                              <span class="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium uppercase tracking-[0.12em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p class="mt-2 text-sm text-[var(--text-secondary)]">
                            {address.recipientName as string}
                          </p>
                          <p class="mt-1 text-sm text-[var(--text-secondary)]">
                            {address.phoneNumber as string}
                          </p>
                          <p class="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {(address.addressLine1 as string) ?? ""}
                            {address.addressLine2
                              ? `, ${address.addressLine2 as string}`
                              : ""}
                            <br />
                            {`${address.city as string}, ${address.state as string} ${address.postalCode as string}`}
                            <br />
                            {address.country as string}
                          </p>
                        </div>

                        <div class="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick$={() => startEditingAddress(address)}
                            class="btn-secondary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick$={() =>
                              handleDeleteAddress(String(address.id))
                            }
                            disabled={
                              addressDeletingId.value === String(address.id)
                            }
                            class="btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Delete ${address.label as string}`}
                          >
                            {addressDeletingId.value === String(address.id)
                              ? "Removing..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div class="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 text-sm leading-7 text-[var(--text-secondary)]">
                    Save your home, work, or gifting addresses here. Your
                    default address will prefill checkout automatically.
                  </div>
                )}
              </div>
            </div>

            <div class="card rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
              <p class="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                {editingAddressId.value ? "Edit Address" : "New Address"}
              </p>
              <h2 class="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                {editingAddressId.value
                  ? "Update delivery details"
                  : "Add a delivery address"}
              </h2>

              <form
                preventdefault:submit
                onSubmit$={handleAddressSubmit}
                class="mt-6 space-y-4"
              >
                <input
                  placeholder="Label e.g. Home, Office"
                  aria-label="Address label"
                  value={addressForm.value.label}
                  onInput$={(_, el) => (addressForm.value.label = el.value)}
                  class={inputClass}
                  required
                />
                <input
                  placeholder="Recipient name"
                  aria-label="Recipient name"
                  value={addressForm.value.recipientName}
                  onInput$={(_, el) =>
                    (addressForm.value.recipientName = el.value)
                  }
                  class={inputClass}
                  required
                />
                <input
                  placeholder="Phone number"
                  aria-label="Phone number"
                  inputMode="tel"
                  value={addressForm.value.phoneNumber}
                  onInput$={(_, el) =>
                    (addressForm.value.phoneNumber = el.value)
                  }
                  class={inputClass}
                  required
                />
                <input
                  placeholder="Address line 1"
                  aria-label="Address line 1"
                  value={addressForm.value.addressLine1}
                  onInput$={(_, el) =>
                    (addressForm.value.addressLine1 = el.value)
                  }
                  class={inputClass}
                  required
                />
                <input
                  placeholder="Address line 2"
                  aria-label="Address line 2"
                  value={addressForm.value.addressLine2}
                  onInput$={(_, el) =>
                    (addressForm.value.addressLine2 = el.value)
                  }
                  class={inputClass}
                />
                <div class="grid gap-4 md:grid-cols-2">
                  <input
                    placeholder="City"
                    aria-label="City"
                    value={addressForm.value.city}
                    onInput$={(_, el) => (addressForm.value.city = el.value)}
                    class={inputClass}
                    required
                  />
                  <input
                    placeholder="State"
                    aria-label="State"
                    value={addressForm.value.state}
                    onInput$={(_, el) => (addressForm.value.state = el.value)}
                    class={inputClass}
                    required
                  />
                  <input
                    placeholder="Postal code"
                    aria-label="Postal code"
                    value={addressForm.value.postalCode}
                    onInput$={(_, el) =>
                      (addressForm.value.postalCode = el.value)
                    }
                    class={inputClass}
                    required
                  />
                  <input
                    placeholder="Country"
                    aria-label="Country"
                    value={addressForm.value.country}
                    onInput$={(_, el) => (addressForm.value.country = el.value)}
                    class={inputClass}
                    required
                  />
                </div>

                <label class="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={addressForm.value.isDefault}
                    onChange$={(_, el) =>
                      (addressForm.value.isDefault = el.checked)
                    }
                    class="h-4 w-4 rounded border-[var(--border-strong)] text-emerald-700 focus:ring-emerald-500 dark:text-emerald-300"
                  />
                  Use this as my default checkout address
                </label>

                <button
                  type="submit"
                  disabled={addressSaving.value}
                  class="btn-admin w-full"
                >
                  {addressSaving.value
                    ? "Saving..."
                    : editingAddressId.value
                      ? "Save address"
                      : "Add address"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
});

export const head: DocumentHead = () =>
  buildHead({
    title: "My Profile",
    description:
      "Manage your Moringa Store Online account details, profile photo, and saved delivery addresses.",
    path: "/profile",
  });
