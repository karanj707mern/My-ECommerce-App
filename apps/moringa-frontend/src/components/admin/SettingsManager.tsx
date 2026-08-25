import {
  $,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { getStoreSettings, updateStoreSettings } from "../../lib/api/settings";
import { useToast } from "../../hooks/useToast";

interface SettingsFormState {
  shippingCharge: string;
  expressShippingCharge: string;
  sameDayShippingCharge: string;
  codCharge: string;
  handlingCharge: string;
  taxRate: string;
  freeShippingThreshold: string;
  shippingZones: string;
  codEnabled: boolean;
  maxCodOrderValue: string;
  allowInternationalCod: boolean;
  autoCancelPendingMinutes: string;
}

const DEFAULT_SHIPPING_ZONES = JSON.stringify(
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
);

const EMPTY_SETTINGS_FORM: SettingsFormState = {
  shippingCharge: "99",
  expressShippingCharge: "149",
  sameDayShippingCharge: "249",
  codCharge: "25",
  handlingCharge: "20",
  taxRate: "0",
  freeShippingThreshold: "",
  shippingZones: DEFAULT_SHIPPING_ZONES,
  codEnabled: true,
  maxCodOrderValue: "5000",
  allowInternationalCod: false,
  autoCancelPendingMinutes: "30",
};

function toSettingsFormState(
  settings: Record<string, unknown> = {},
): SettingsFormState {
  return {
    shippingCharge: String(settings.shippingCharge ?? 99),
    expressShippingCharge: String(settings.expressShippingCharge ?? 149),
    sameDayShippingCharge: String(settings.sameDayShippingCharge ?? 249),
    codCharge: String(settings.codCharge ?? 25),
    handlingCharge: String(settings.handlingCharge ?? 20),
    taxRate: String(settings.taxRate ?? 0),
    freeShippingThreshold:
      settings.freeShippingThreshold === null ||
      settings.freeShippingThreshold === undefined
        ? ""
        : String(settings.freeShippingThreshold),
    shippingZones: JSON.stringify(
      settings.shippingZones ?? JSON.parse(DEFAULT_SHIPPING_ZONES),
      null,
      2,
    ),
    codEnabled: Boolean(settings.codEnabled ?? true),
    maxCodOrderValue:
      settings.maxCodOrderValue === null ||
      settings.maxCodOrderValue === undefined
        ? ""
        : String(settings.maxCodOrderValue),
    allowInternationalCod: Boolean(settings.allowInternationalCod ?? false),
    autoCancelPendingMinutes: String(settings.autoCancelPendingMinutes ?? 30),
  };
}

/**
 * Store configuration editor (charges, COD rules, zones, expiry).
 * Port of legacy `components/admin/SettingsManager.tsx`.
 */
export const SettingsManager = component$(() => {
  const toast = useToast();
  const settingsForm = useStore<SettingsFormState>({ ...EMPTY_SETTINGS_FORM });
  const loading = useSignal(true);
  const error = useSignal("");

  useVisibleTask$(async () => {
    try {
      loading.value = true;
      error.value = "";
      const data = await getStoreSettings();
      Object.assign(
        settingsForm,
        toSettingsFormState((data as Record<string, unknown>) || {}),
      );
    } catch (err) {
      Object.assign(settingsForm, toSettingsFormState());
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load store settings.";
    } finally {
      loading.value = false;
    }
  });

  const handleSubmit = $(async () => {
    error.value = "";
    let shippingZones: unknown;
    try {
      shippingZones = JSON.parse(settingsForm.shippingZones);
    } catch {
      error.value = "Shipping zones must be valid JSON.";
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
      await toast.showToast({
        severity: "success",
        summary: "Success",
        detail: "Store settings updated successfully.",
        life: 4000,
      });
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not update store settings.";
    }
  });

  const numberInputClass =
    "mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500";

  return (
    <section class="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm sm:p-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
            Store settings
          </p>
          <h2 class="mt-2 font-serif text-2xl text-[var(--text-primary)] sm:text-3xl">
            Shipping and tax rules
          </h2>
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
        <div class="mt-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-6 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          Loading settings…
        </div>
      ) : (
        <form
          preventdefault:submit
          onSubmit$={handleSubmit}
          class="mt-8 space-y-4"
        >
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Shipping charge
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.shippingCharge}
              onInput$={(_, el) => (settingsForm.shippingCharge = el.value)}
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Express shipping charge
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.expressShippingCharge}
              onInput$={(_, el) =>
                (settingsForm.expressShippingCharge = el.value)
              }
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Same day shipping charge
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.sameDayShippingCharge}
              onInput$={(_, el) =>
                (settingsForm.sameDayShippingCharge = el.value)
              }
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Cash on delivery charge
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.codCharge}
              onInput$={(_, el) => (settingsForm.codCharge = el.value)}
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Handling charge
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.handlingCharge}
              onInput$={(_, el) => (settingsForm.handlingCharge = el.value)}
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Tax rate (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.taxRate}
              onInput$={(_, el) => (settingsForm.taxRate = el.value)}
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Free shipping threshold
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.freeShippingThreshold}
              onInput$={(_, el) =>
                (settingsForm.freeShippingThreshold = el.value)
              }
              class={numberInputClass}
            />
          </label>
          <label class="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={settingsForm.codEnabled}
              onChange$={(_, el) => (settingsForm.codEnabled = el.checked)}
            />
            Enable cash on delivery
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Max COD order value
            <input
              type="number"
              min="0"
              step="0.01"
              value={settingsForm.maxCodOrderValue}
              onInput$={(_, el) => (settingsForm.maxCodOrderValue = el.value)}
              class={numberInputClass}
            />
          </label>
          <label class="flex items-center gap-3 rounded-2xl bg-[var(--bg-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={settingsForm.allowInternationalCod}
              onChange$={(_, el) =>
                (settingsForm.allowInternationalCod = el.checked)
              }
            />
            Allow international COD
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Pending checkout expiry (minutes)
            <input
              type="number"
              min="5"
              step="1"
              value={settingsForm.autoCancelPendingMinutes}
              onInput$={(_, el) =>
                (settingsForm.autoCancelPendingMinutes = el.value)
              }
              class={numberInputClass}
              required
            />
          </label>
          <label class="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            Shipping zones JSON
            <textarea
              rows={10}
              value={settingsForm.shippingZones}
              onInput$={(_, el) => (settingsForm.shippingZones = el.value)}
              class="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            />
          </label>

          <div class="rounded-[1.25rem] bg-[var(--bg-muted)] p-4 text-sm leading-6 text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            These values control checkout pricing, COD eligibility, shipping
            zones, and auto-expiry for unpaid online orders.
          </div>

          <button
            type="submit"
            class="btn-admin w-full"
            disabled={loading.value}
          >
            {loading.value ? "Saving…" : "Save store settings"}
          </button>
        </form>
      )}
    </section>
  );
});

export default SettingsManager;
