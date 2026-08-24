import { component$, type PropFunction, type Signal } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { formatRupees } from "../../lib/formatters";
import { ShippingMethodSelector } from "./ShippingMethodSelector";
import {
  resolveShippingOption,
  type AddressForm,
  type StoreSettings,
} from "../../lib/cart";

export interface CheckoutSidebarProps {
  savedAddresses: Record<string, unknown>[];
  selectedAddressId: Signal<string>;
  addressForm: Signal<AddressForm>;
  storeSettings: StoreSettings;
  selectedShippingType: Signal<string>;
  selectedPaymentMethod: Signal<string>;
  startingCheckout: boolean;
  itemCount: number;
  canCheckout: boolean;
  pricingPreview: Record<string, unknown> | null;
  previewSubtotal: number;
  discount: number;
  previewShipping: number;
  previewHandling: number;
  previewCodCharge: number;
  previewTax: number;
  total: number;
  onSavedAddressSelect$: PropFunction<(id: string) => void>;
  onShippingTypeChange$: PropFunction<(key: string) => void>;
  onPaymentMethodChange$: PropFunction<(method: string) => void>;
  onCheckout$: PropFunction<() => void>;
}

/** Address form + shipping/payment pickers + live pricing summary. */
export const CheckoutSidebar = component$<CheckoutSidebarProps>(({
  savedAddresses,
  selectedAddressId,
  addressForm,
  storeSettings,
  selectedShippingType,
  selectedPaymentMethod,
  startingCheckout,
  itemCount,
  canCheckout,
  pricingPreview,
  previewSubtotal,
  discount,
  previewShipping,
  previewHandling,
  previewCodCharge,
  previewTax,
  total,
  onSavedAddressSelect$,
  onShippingTypeChange$,
  onPaymentMethodChange$,
  onCheckout$,
}) => {
  const isDomestic =
    String(addressForm.value.country || "").trim().toLowerCase() === "india";

  const selectedShippingOption = resolveShippingOption(
    storeSettings,
    selectedShippingType.value,
  );

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500";

  return (
    <aside class="card h-fit rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm sm:p-7">
      <p class="text-center text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
        Order Summary
      </p>
      <h2 class="mt-3 text-center font-serif text-3xl text-[var(--text-primary)]">
        Checkout preview
      </h2>

      {savedAddresses.length > 0 ? (
        <div class="mt-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label
              for="saved-address"
              class="text-sm font-medium text-[var(--text-secondary)]"
            >
              Saved address
            </label>
            <Link
              href="/profile"
              class="text-center text-sm text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200 sm:text-right"
            >
              Manage addresses
            </Link>
          </div>
          <select
            id="saved-address"
            value={selectedAddressId.value}
            onChange$={(_, el) => onSavedAddressSelect$(el.value)}
            class={`${inputClass} mt-3`}
          >
            <option value="">Use the form below</option>
            {savedAddresses.map((address) => (
              <option key={String(address.id)} value={String(address.id)}>
                {`${address.label as string} - ${address.city as string}${address.isDefault ? " (Default)" : ""}`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div class="mt-6 text-center">
          <Link href="/profile" class="btn-secondary">
            Save addresses in profile
          </Link>
        </div>
      )}

      <div class="mt-8 space-y-3 border-t border-[var(--border-color)] pt-6">
        <p class="text-center text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
          Shipping address
        </p>
        <div class="grid gap-4">
          <div>
            <label
              for="recipientName"
              class="block text-center text-sm font-medium text-[var(--text-secondary)] sm:text-left"
            >
              Recipient name
            </label>
            <input
              id="recipientName"
              value={addressForm.value.recipientName}
              onInput$={(_, el) =>
                (addressForm.value = {
                  ...addressForm.value,
                  recipientName: el.value,
                })
              }
              class={inputClass}
              required
            />
          </div>
          <div>
            <label
              for="phoneNumber"
              class="block text-center text-sm font-medium text-[var(--text-secondary)] sm:text-left"
            >
              Phone number
            </label>
            <input
              id="phoneNumber"
              value={addressForm.value.phoneNumber}
              onInput$={(_, el) =>
                (addressForm.value = {
                  ...addressForm.value,
                  phoneNumber: el.value,
                })
              }
              class={inputClass}
              required
              inputMode="tel"
            />
          </div>
          <input
            placeholder="Address line 1"
            value={addressForm.value.addressLine1}
            onInput$={(_, el) =>
              (addressForm.value = {
                ...addressForm.value,
                addressLine1: el.value,
              })
            }
            class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
            aria-label="Address line 1"
          />
          <input
            placeholder="Address line 2 (optional)"
            value={addressForm.value.addressLine2}
            onInput$={(_, el) =>
              (addressForm.value = {
                ...addressForm.value,
                addressLine2: el.value,
              })
            }
            class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            aria-label="Address line 2 (optional)"
          />
          <div class="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="City"
              value={addressForm.value.city}
              onInput$={(_, el) =>
                (addressForm.value = { ...addressForm.value, city: el.value })
              }
              class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="City"
            />
            <input
              placeholder="State"
              value={addressForm.value.state}
              onInput$={(_, el) =>
                (addressForm.value = { ...addressForm.value, state: el.value })
              }
              class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="State"
            />
            <input
              placeholder="Postal code"
              value={addressForm.value.postalCode}
              onInput$={(_, el) =>
                (addressForm.value = {
                  ...addressForm.value,
                  postalCode: el.value,
                })
              }
              class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="Postal code"
            />
            <input
              placeholder="Country"
              value={addressForm.value.country}
              onInput$={(_, el) =>
                (addressForm.value = {
                  ...addressForm.value,
                  country: el.value,
                })
              }
              class="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="Country"
            />
          </div>
        </div>
      </div>

      <div class="mt-8 space-y-4 border-t border-[var(--border-color)] pt-6">
        <ShippingMethodSelector
          options={storeSettings.shippingOptions}
          selected={selectedShippingType.value}
          onSelect$={onShippingTypeChange$}
          qualifiesForFreeShipping={false}
          cartCount={itemCount}
          isDomestic={isDomestic}
        />

        <div>
          <p class="text-center text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300 sm:text-left">
            Payment method
          </p>
          <div class="mt-4 grid gap-3">
            <button
              type="button"
              onClick$={() => onPaymentMethodChange$("online")}
              class={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200 ${
                selectedPaymentMethod.value === "online"
                  ? "border-2 border-emerald-400 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.35)] dark:border-emerald-400 dark:bg-emerald-900/30 dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                  : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              }`}
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p
                    class={`text-center text-sm font-semibold sm:text-left ${selectedPaymentMethod.value === "online" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                  >
                    Pay online
                  </p>
                  <p
                    class={`mt-1 text-center text-sm sm:text-left ${selectedPaymentMethod.value === "online" ? "text-emerald-700/80 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
                  >
                    Secure checkout with Razorpay cards, UPI, wallets, and net
                    banking.
                  </p>
                </div>
                <span
                  class={`whitespace-nowrap text-center text-sm font-semibold ${selectedPaymentMethod.value === "online" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                >
                  Recommended
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick$={() => onPaymentMethodChange$("cod")}
              class={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200 ${
                selectedPaymentMethod.value === "cod"
                  ? "border-2 border-emerald-400 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.35)] dark:border-emerald-400 dark:bg-emerald-900/30 dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                  : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              }`}
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p
                    class={`text-center text-sm font-semibold sm:text-left ${selectedPaymentMethod.value === "cod" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                  >
                    Cash on delivery
                  </p>
                  <p
                    class={`mt-1 text-center text-sm sm:text-left ${selectedPaymentMethod.value === "cod" ? "text-emerald-700/80 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
                  >
                    Place the order now and pay when the shipment reaches you.
                  </p>
                </div>
                <span
                  class={`whitespace-nowrap text-center text-sm font-semibold ${selectedPaymentMethod.value === "cod" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                >
                  {formatRupees(storeSettings.codCharge || 0)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-8 space-y-4 border-t border-[var(--border-color)] pt-6 text-sm text-[var(--text-secondary)]">
        <div class="flex items-center justify-between">
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatRupees(previewSubtotal)}</span>
        </div>
        {discount > 0 ? (
          <div class="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span>Promo discount</span>
            <span>-{formatRupees(discount)}</span>
          </div>
        ) : null}
        <div class="flex items-center justify-between">
          <span>{selectedShippingOption.label}</span>
          <span>{formatRupees(previewShipping)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Handling</span>
          <span>{formatRupees(previewHandling)}</span>
        </div>
        {selectedPaymentMethod.value === "cod" ? (
          <div class="flex items-center justify-between">
            <span>Cash on delivery fee</span>
            <span>{formatRupees(previewCodCharge)}</span>
          </div>
        ) : null}
        <div class="flex items-center justify-between">
          <span>Tax</span>
          <span>{formatRupees(previewTax)}</span>
        </div>
        {pricingPreview?.shippingZone ? (
          <div class="flex items-center justify-between">
            <span>Shipping zone</span>
            <span>{String(pricingPreview.shippingZone).replace(/_/g, " ")}</span>
          </div>
        ) : null}
        {pricingPreview?.fraudRiskLevel ? (
          <div class="flex items-center justify-between">
            <span>Risk review</span>
            <span>{pricingPreview.fraudRiskLevel as string}</span>
          </div>
        ) : null}
      </div>

      <div class="mt-6 flex items-center justify-between border-t border-[var(--border-color)] pt-6">
        <span class="text-base font-medium text-[var(--text-primary)]">
          Total
        </span>
        <span class="text-2xl font-semibold text-[var(--text-primary)]">
          {formatRupees(total)}
        </span>
      </div>

      <button
        type="button"
        onClick$={onCheckout$}
        disabled={!canCheckout}
        class="btn-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {startingCheckout
          ? "Processing..."
          : selectedPaymentMethod.value === "cod"
            ? "Place cash on delivery order"
            : "Proceed to secure checkout"}
      </button>

      {!canCheckout ? (
        <p class="mt-3 text-center text-sm leading-5 text-[var(--text-muted)]">
          Complete the shipping address above to continue.
        </p>
      ) : null}
    </aside>
  );
});

export default CheckoutSidebar;
