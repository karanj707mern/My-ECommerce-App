"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoreSettings, updateStoreSettings } from "@/lib/api/settings";
import { useToast } from "@/hooks/useToast";

const EMPTY_SETTINGS_FORM = {
  shippingCharge: "99",
  expressShippingCharge: "149",
  sameDayShippingCharge: "249",
  codCharge: "25",
  handlingCharge: "20",
  taxRate: "0",
  freeShippingThreshold: "",
  shippingZones: JSON.stringify(
    [
      {
        key: "DOMESTIC",
        label: "India",
        countries: ["india"],
        allowedShippingTypes: ["standard", "express", "sameDay", "prime"],
        taxRate: null,
        shippingMultiplier: 1,
      },
      {
        key: "INTERNATIONAL",
        label: "Rest of world",
        countries: [],
        allowedShippingTypes: ["standard"],
        taxRate: 0,
        shippingMultiplier: 2,
      },
    ],
    null,
    2,
  ),
  codEnabled: true,
  maxCodOrderValue: "5000",
  allowInternationalCod: false,
  autoCancelPendingMinutes: "30",
};

function toSettingsFormState(settings: Record<string, unknown> = {}) {
  return {
    shippingCharge: String(settings?.shippingCharge ?? 99),
    expressShippingCharge: String(settings?.expressShippingCharge ?? 149),
    sameDayShippingCharge: String(settings?.sameDayShippingCharge ?? 249),
    codCharge: String(settings?.codCharge ?? 25),
    handlingCharge: String(settings?.handlingCharge ?? 20),
    taxRate: String(settings?.taxRate ?? 0),
    freeShippingThreshold:
      settings?.freeShippingThreshold === null ||
      settings?.freeShippingThreshold === undefined
        ? ""
        : String(settings.freeShippingThreshold),
    shippingZones: JSON.stringify(
      settings?.shippingZones ?? JSON.parse(EMPTY_SETTINGS_FORM.shippingZones),
      null,
      2,
    ),
    codEnabled: Boolean(settings?.codEnabled ?? true),
    maxCodOrderValue:
      settings?.maxCodOrderValue === null ||
      settings?.maxCodOrderValue === undefined
        ? ""
        : String(settings.maxCodOrderValue),
    allowInternationalCod: Boolean(settings?.allowInternationalCod ?? false),
    autoCancelPendingMinutes: String(settings?.autoCancelPendingMinutes ?? 30),
  };
}

export default function SettingsManager() {
  const toast = useToast();
  const [settingsForm, setSettingsForm] = useState(EMPTY_SETTINGS_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getStoreSettings();
      setSettingsForm(
        toSettingsFormState((data as Record<string, unknown>) || {}),
      );
    } catch (err) {
      setSettingsForm(toSettingsFormState());
      setError((err as Error).message || "Could not load store settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = event.target;
    const type = target.type;
    const value = target.value;
    const checked = "checked" in target ? target.checked : false;
    setSettingsForm((current) => ({
      ...current,
      [target.name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    let shippingZones;
    try {
      shippingZones = JSON.parse(settingsForm.shippingZones);
    } catch {
      setError("Shipping zones must be valid JSON.");
      return;
    }

    const payload = {
      shippingCharge: Number(settingsForm.shippingCharge),
      expressShippingCharge: Number(settingsForm.expressShippingCharge),
      sameDayShippingCharge: Number(settingsForm.sameDayShippingCharge),
      codCharge: Number(settingsForm.codCharge),
      handlingCharge: Number(settingsForm.handlingCharge),
      taxRate: Number(settingsForm.taxRate),
      freeShippingThreshold:
        settingsForm.freeShippingThreshold.trim() === ""
          ? undefined
          : Number(settingsForm.freeShippingThreshold),
      shippingZones,
      codEnabled: Boolean(settingsForm.codEnabled),
      maxCodOrderValue:
        settingsForm.maxCodOrderValue.trim() === ""
          ? undefined
          : Number(settingsForm.maxCodOrderValue),
      allowInternationalCod: Boolean(settingsForm.allowInternationalCod),
      autoCancelPendingMinutes: Number(settingsForm.autoCancelPendingMinutes),
    };

    try {
      await updateStoreSettings(payload);
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Store settings updated successfully.",
        life: 4000,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not update store settings.");
    }
  };

  return (
    <section className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
            Store settings
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-3xl">
            Shipping and tax rules
          </h2>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-6 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          Loading settings…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Shipping charge
            <input
              name="shippingCharge"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.shippingCharge}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Express shipping charge
            <input
              name="expressShippingCharge"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.expressShippingCharge}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Same day shipping charge
            <input
              name="sameDayShippingCharge"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.sameDayShippingCharge}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Cash on delivery charge
            <input
              name="codCharge"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.codCharge}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Handling charge
            <input
              name="handlingCharge"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.handlingCharge}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Tax rate (%)
            <input
              name="taxRate"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.taxRate}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Free shipping threshold
            <input
              name="freeShippingThreshold"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.freeShippingThreshold}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              name="codEnabled"
              type="checkbox"
              checked={settingsForm.codEnabled}
              onChange={handleChange}
            />
            Enable cash on delivery
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Max COD order value
            <input
              name="maxCodOrderValue"
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.maxCodOrderValue}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              name="allowInternationalCod"
              type="checkbox"
              checked={settingsForm.allowInternationalCod}
              onChange={handleChange}
            />
            Allow international COD
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Pending checkout expiry (minutes)
            <input
              name="autoCancelPendingMinutes"
              type="number"
              min="5"
              step="1"
              value={settingsForm.autoCancelPendingMinutes}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Shipping zones JSON
            <textarea
              name="shippingZones"
              rows={10}
              value={settingsForm.shippingZones}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>

          <div className="rounded-[1.25rem] bg-[var(--bg-muted)] p-4 text-sm leading-6 text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            These values control checkout pricing, COD eligibility, shipping
            zones, and auto-expiry for unpaid online orders.
          </div>

          <button type="submit" className="btn-admin w-full" disabled={loading}>
            {loading ? "Saving…" : "Save store settings"}
          </button>
        </form>
      )}
    </section>
  );
}
