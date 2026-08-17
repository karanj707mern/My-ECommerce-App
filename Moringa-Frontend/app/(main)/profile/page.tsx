"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createUserAddress,
  deleteUserAddress,
  getProfile,
  updateProfile,
  updateUserAddress,
  uploadAvatar,
} from "@/lib/api/auth";
import {
  clearToken,
  setCurrentUser,
  useAuthChecked,
  useCurrentUser,
} from "@/lib/storage";
import { useToast } from "@/hooks/useToast";

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

export default function ProfilePage() {
  const router = useRouter();
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const currentUserId = currentUser?.id;
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [addresses, setAddresses] = useState<Record<string, unknown>[]>([]);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressDeletingId, setAddressDeletingId] = useState<string | null>(
    null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const toast = useToast();

  const redirectToAuth = useCallback(() => {
    clearToken();
    router.push(
      "/auth?from=" +
        encodeURIComponent("/profile") +
        "&authMessage=" +
        encodeURIComponent("Sign in to manage your profile."),
    );
  }, [router]);

  const applyProfileResponse = useCallback(
    (
      data: { user: Record<string, unknown>; message?: string },
      successMessage = "",
    ) => {
      setCurrentUser(data.user);
      setForm({
        name: (data.user.name as string) ?? "",
        phoneNumber: (data.user.phoneNumber as string) ?? "",
        addressLine1: (data.user.addressLine1 as string) ?? "",
        addressLine2: (data.user.addressLine2 as string) ?? "",
        city: (data.user.city as string) ?? "",
        state: (data.user.state as string) ?? "",
        postalCode: (data.user.postalCode as string) ?? "",
        country: (data.user.country as string) ?? "India",
      });
      setAddresses((data.user.addresses as Record<string, unknown>[]) ?? []);
      const msg = successMessage || data.message || "";
      if (msg) {
        toast.showToast({
          severity: "success",
          summary: "Success",
          detail: msg,
          life: 3000,
        });
      }
    },
    [toast],
  );

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm(EMPTY_ADDRESS);
  };

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (!currentUserId) {
      redirectToAuth();
      return;
    }

    getProfile()
      .then((data) => {
        applyProfileResponse(
          data as { user: Record<string, unknown>; message?: string },
        );
        const avatar = (data as { user: Record<string, unknown> }).user
          ?.avatar as string | null | undefined;
        setAvatarPreview(avatar || null);
      })
      .catch((err) => {
        if ((err as Error & { status: number }).status === 401) {
          redirectToAuth();
          return;
        }
        toast.showToast({
          severity: "error",
          summary: "Could not load profile",
          detail: (err as Error).message || "Could not load your profile.",
          life: 4000,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    authChecked,
    currentUserId,
    router,
    redirectToAuth,
    applyProfileResponse,
    toast,
  ]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setAddressForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const data = (await uploadAvatar(formData)) as { avatarUrl: string };
      await updateProfile({ avatar: data.avatarUrl });
      setAvatarPreview(data.avatarUrl);
      setAvatarFile(null);
      toast.showToast({
        severity: "success",
        summary: "Avatar updated",
        detail: "Your profile photo has been updated.",
        life: 3000,
      });
    } catch (err) {
      toast.showToast({
        severity: "error",
        summary: "Upload failed",
        detail: (err as Error).message || "Could not upload avatar.",
        life: 4000,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);

    try {
      await updateProfile({ avatar: "" });
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.showToast({
        severity: "info",
        summary: "Avatar removed",
        detail: "Your profile photo has been removed.",
        life: 3000,
      });
    } catch (err) {
      toast.showToast({
        severity: "error",
        summary: "Removal failed",
        detail: (err as Error).message || "Could not remove avatar.",
        life: 4000,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const data = (await updateProfile(form)) as {
        user: Record<string, unknown>;
        message?: string;
      };
      applyProfileResponse(data, "Profile updated successfully.");
      toast.showToast({
        severity: "success",
        summary: "Profile saved",
        detail: "Your profile details have been updated.",
        life: 3000,
      });
    } catch (err) {
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      const message =
        (err as Error).message || "Could not update your profile.";
      toast.showToast({
        severity: "error",
        summary: "Save failed",
        detail: message,
        life: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddressSaving(true);

    try {
      const data = editingAddressId
        ? ((await updateUserAddress(editingAddressId, addressForm)) as {
            user: Record<string, unknown>;
            message?: string;
          })
        : ((await createUserAddress(addressForm)) as {
            user: Record<string, unknown>;
            message?: string;
          });
      applyProfileResponse(
        data,
        editingAddressId
          ? "Address updated successfully."
          : "Address added successfully.",
      );
      toast.showToast({
        severity: "success",
        summary: editingAddressId ? "Address updated" : "Address added",
        detail: editingAddressId
          ? "Your address has been updated."
          : "New address has been saved.",
        life: 3000,
      });
      resetAddressForm();
    } catch (err) {
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      const message = (err as Error).message || "Could not save this address.";
      toast.showToast({
        severity: "error",
        summary: "Address save failed",
        detail: message,
        life: 4000,
      });
    } finally {
      setAddressSaving(false);
    }
  };

  const startEditingAddress = (address: Record<string, unknown>) => {
    setEditingAddressId(address.id as string);
    setAddressForm({
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
    });
  };

  const handleDeleteAddress = async (addressId: string) => {
    setAddressDeletingId(addressId);

    try {
      const data = (await deleteUserAddress(addressId)) as {
        user: Record<string, unknown>;
        message?: string;
      };
      applyProfileResponse(data, "Address removed successfully.");
      toast.showToast({
        severity: "error",
        summary: "Address deleted",
        detail: "The address has been permanently removed.",
        life: 3500,
      });
      if (editingAddressId === addressId) {
        resetAddressForm();
      }
    } catch (err) {
      if ((err as Error & { status: number }).status === 401) {
        redirectToAuth();
        return;
      }
      const message =
        (err as Error).message || "Could not remove this address.";
      toast.showToast({
        severity: "error",
        summary: "Delete failed",
        detail: message,
        life: 4000,
      });
    } finally {
      setAddressDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <main>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                My Profile
              </p>
              <h1 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                Account and saved addresses
              </h1>
              {currentUser?.email ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {currentUser.email as string}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-secondary inline-flex"
            >
              Back to store
            </button>
          </div>

          <section className="mt-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
            {loading ? (
              <div className="text-sm text-[var(--text-secondary)]">
                Loading profile...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                    Account Details
                  </p>
                  <h2 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Basic details
                  </h2>
                </div>

                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)] sm:h-28 sm:w-28">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Profile"
                          width={112}
                          height={112}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-semibold">
                          {(form.name || (currentUser?.email as string) || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      onChange={handleAvatarChange}
                      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={!avatarFile || uploadingAvatar}
                        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingAvatar ? "Uploading..." : "Upload photo"}
                      </button>
                      {avatarPreview ? (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar}
                          className="btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      JPG, PNG, WEBP, or GIF. Maximum size 2MB.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="profilePhone"
                    className="block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    Phone number
                  </label>
                  <input
                    id="profilePhone"
                    name="phoneNumber"
                    inputMode="tel"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="addressLine1"
                    placeholder="Address line 1"
                    aria-label="Address line 1"
                    value={form.addressLine1}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  <input
                    name="addressLine2"
                    placeholder="Address line 2"
                    aria-label="Address line 2"
                    value={form.addressLine2}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  <input
                    name="city"
                    placeholder="City"
                    aria-label="City"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  <input
                    name="state"
                    placeholder="State"
                    aria-label="State"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  <input
                    name="postalCode"
                    placeholder="Postal code"
                    aria-label="Postal code"
                    value={form.postalCode}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                  <input
                    name="country"
                    placeholder="Country"
                    aria-label="Country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-admin w-full"
                >
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </form>
            )}
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                    Delivery Book
                  </p>
                  <h2 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                    Saved addresses
                  </h2>
                </div>

                {editingAddressId ? (
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="btn-secondary"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <div className="mt-6 space-y-4">
                {addresses.length > 0 ? (
                  addresses.map((address) => (
                    <article
                      key={address.id as string | number}
                      className="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                              {address.label as string}
                            </h3>
                            {address.isDefault ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium uppercase tracking-[0.12em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {address.recipientName as string}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {address.phoneNumber as string}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {address.addressLine1 as string}
                            {address.addressLine2
                              ? `, ${address.addressLine2 as string}`
                              : ""}
                            <br />
                            {address.city as string}, {address.state as string}{" "}
                            {address.postalCode as string}
                            <br />
                            {address.country as string}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingAddress(address)}
                            className="btn-secondary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAddress(address.id as string)
                            }
                            disabled={
                              addressDeletingId === (address.id as string)
                            }
                            className="btn-danger disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Delete ${address.label as string}`}
                          >
                            {addressDeletingId === (address.id as string)
                              ? "Removing..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-6 text-sm leading-7 text-[var(--text-secondary)]">
                    Save your home, work, or gifting addresses here. Your
                    default address will prefill checkout automatically.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8 card">
              <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                {editingAddressId ? "Edit Address" : "New Address"}
              </p>
              <h2 className="mt-3 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
                {editingAddressId
                  ? "Update delivery details"
                  : "Add a delivery address"}
              </h2>

              <form onSubmit={handleAddressSubmit} className="mt-6 space-y-4">
                <input
                  name="label"
                  placeholder="Label e.g. Home, Office"
                  aria-label="Address label"
                  value={addressForm.label}
                  onChange={handleAddressChange}
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  required
                />
                <input
                  name="recipientName"
                  placeholder="Recipient name"
                  aria-label="Recipient name"
                  value={addressForm.recipientName}
                  onChange={handleAddressChange}
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  required
                />
                <input
                  name="phoneNumber"
                  placeholder="Phone number"
                  aria-label="Phone number"
                  inputMode="tel"
                  value={addressForm.phoneNumber}
                  onChange={handleAddressChange}
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  required
                />
                <input
                  name="addressLine1"
                  placeholder="Address line 1"
                  aria-label="Address line 1"
                  value={addressForm.addressLine1}
                  onChange={handleAddressChange}
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                  required
                />
                <input
                  name="addressLine2"
                  placeholder="Address line 2"
                  aria-label="Address line 2"
                  value={addressForm.addressLine2}
                  onChange={handleAddressChange}
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="city"
                    placeholder="City"
                    aria-label="City"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    required
                  />
                  <input
                    name="state"
                    placeholder="State"
                    aria-label="State"
                    value={addressForm.state}
                    onChange={handleAddressChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    required
                  />
                  <input
                    name="postalCode"
                    placeholder="Postal code"
                    aria-label="Postal code"
                    value={addressForm.postalCode}
                    onChange={handleAddressChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    required
                  />
                  <input
                    name="country"
                    placeholder="Country"
                    aria-label="Country"
                    value={addressForm.country}
                    onChange={handleAddressChange}
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                    required
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={addressForm.isDefault as boolean}
                    onChange={handleAddressChange}
                    className="h-4 w-4 rounded border-[var(--border-strong)] text-emerald-700 dark:text-emerald-300 focus:ring-emerald-500"
                  />
                  Use this as my default checkout address
                </label>

                <button
                  type="submit"
                  disabled={addressSaving}
                  className="btn-admin w-full"
                >
                  {addressSaving
                    ? "Saving..."
                    : editingAddressId
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
}
