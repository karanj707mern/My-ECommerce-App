"use client";

import Link from "next/link";
import { formatRupees } from "@/lib/formatters";
import { ShippingMethodSelector } from "./ShippingMethodSelector";
import type { StoreSettings, AddressForm } from "../hooks/useCartLogic";

export interface CheckoutSidebarProps {
  savedAddresses: Record<string, unknown>[];
  selectedAddressId: string;
  addressForm: AddressForm;
  storeSettings: StoreSettings;
  selectedShippingType: string;
  selectedPaymentMethod: string;
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
  onSavedAddressChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShippingTypeChange: (key: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onCheckout: () => void;
}

export function CheckoutSidebar({
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
  onSavedAddressChange,
  onAddressChange,
  onShippingTypeChange,
  onPaymentMethodChange,
  onCheckout,
}: CheckoutSidebarProps) {
  const isDomestic =
    String(addressForm.country || "")
      .trim()
      .toLowerCase() === "india";

  const selectedShippingOption = storeSettings.shippingOptions.find(
    (option) => option.key === selectedShippingType,
  ) ||
    storeSettings.shippingOptions[0] || {
      key: "standard",
      label: "Standard Delivery",
      amount: Number(storeSettings.shippingCharge) || 0,
      etaDays: 4,
    };

  return (
    <aside className="h-fit rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm card sm:p-7">
      <p className="text-sm uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300 text-center">
        Order Summary
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[var(--text-primary)] text-center">
        Checkout preview
      </h2>

      {savedAddresses.length > 0 ? (
        <div className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="saved-address"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              Saved address
            </label>
            <Link
              href="/profile"
              className="text-sm text-emerald-700 dark:text-emerald-300 transition hover:text-emerald-900 dark:hover:text-emerald-200 text-center sm:text-right"
            >
              Manage addresses
            </Link>
          </div>
          <select
            id="saved-address"
            value={selectedAddressId}
            onChange={onSavedAddressChange}
            className="mt-3 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          >
            <option value="">Use the form below</option>
            {savedAddresses.map((address) => (
              <option
                key={address.id as string | number}
                value={address.id as string | number}
              >
                {address.label as string} - {address.city as string}
                {address.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <Link href="/profile" className="btn-secondary">
            Save addresses in profile
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-3 border-t border-[var(--border-color)] pt-6">
        <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300 text-center">
          Shipping address
        </p>
        <div className="grid gap-4">
          <div>
            <label
              htmlFor="recipientName"
              className="block text-center text-sm font-medium text-[var(--text-secondary)] sm:text-left"
            >
              Recipient name
            </label>
            <input
              id="recipientName"
              name="recipientName"
              value={addressForm.recipientName}
              onChange={onAddressChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-center text-sm font-medium text-[var(--text-secondary)] sm:text-left"
            >
              Phone number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              value={addressForm.phoneNumber}
              onChange={onAddressChange}
              className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              inputMode="tel"
            />
          </div>
          <input
            name="addressLine1"
            placeholder="Address line 1"
            value={addressForm.addressLine1}
            onChange={onAddressChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            required
            aria-label="Address line 1"
          />
          <input
            name="addressLine2"
            placeholder="Address line 2 (optional)"
            value={addressForm.addressLine2}
            onChange={onAddressChange}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
            aria-label="Address line 2 (optional)"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="city"
              placeholder="City"
              value={addressForm.city}
              onChange={onAddressChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="City"
            />
            <input
              name="state"
              placeholder="State"
              value={addressForm.state}
              onChange={onAddressChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="State"
            />
            <input
              name="postalCode"
              placeholder="Postal code"
              value={addressForm.postalCode}
              onChange={onAddressChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="Postal code"
            />
            <input
              name="country"
              placeholder="Country"
              value={addressForm.country}
              onChange={onAddressChange}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
              required
              aria-label="Country"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t border-[var(--border-color)] pt-6">
        <ShippingMethodSelector
          options={storeSettings.shippingOptions}
          selected={selectedShippingType}
          onSelect={onShippingTypeChange}
          qualifiesForFreeShipping={false}
          cartCount={itemCount}
          isDomestic={isDomestic}
        />

        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300 text-center sm:text-left">
            Payment method
          </p>
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={() => onPaymentMethodChange("online")}
              className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200 ${
                selectedPaymentMethod === "online"
                  ? "border-2 border-emerald-400 bg-emerald-400/10 dark:bg-emerald-900/30 dark:border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)] dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                  : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-semibold text-center sm:text-left ${selectedPaymentMethod === "online" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                  >
                    Pay online
                  </p>
                  <p
                    className={`mt-1 text-sm text-center sm:text-left ${selectedPaymentMethod === "online" ? "text-emerald-700/80 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
                  >
                    Secure checkout with Razorpay cards, UPI, wallets, and net
                    banking.
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${selectedPaymentMethod === "online" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                >
                  Recommended
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPaymentMethodChange("cod")}
              className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200 ${
                selectedPaymentMethod === "cod"
                  ? "border-2 border-emerald-400 bg-emerald-400/10 dark:bg-emerald-900/30 dark:border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)] dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                  : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-semibold text-center sm:text-left ${selectedPaymentMethod === "cod" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                  >
                    Cash on delivery
                  </p>
                  <p
                    className={`mt-1 text-sm text-center sm:text-left ${selectedPaymentMethod === "cod" ? "text-emerald-700/80 dark:text-emerald-300" : "text-[var(--text-muted)]"}`}
                  >
                    Place the order now and pay when the shipment reaches you.
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${selectedPaymentMethod === "cod" ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--text-primary)]"}`}
                >
                  {formatRupees(storeSettings.codCharge || 0)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4 border-t border-[var(--border-color)] pt-6 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center justify-between">
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{formatRupees(previewSubtotal)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span>Promo discount</span>
            <span>-{formatRupees(discount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>{selectedShippingOption.label}</span>
          <span>{formatRupees(previewShipping)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Handling</span>
          <span>{formatRupees(previewHandling)}</span>
        </div>
        {selectedPaymentMethod === "cod" ? (
          <div className="flex items-center justify-between">
            <span>Cash on delivery fee</span>
            <span>{formatRupees(previewCodCharge)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>Tax</span>
          <span>{formatRupees(previewTax)}</span>
        </div>
        {pricingPreview?.shippingZone ? (
          <div className="flex items-center justify-between">
            <span>Shipping zone</span>
            <span>
              {String(pricingPreview.shippingZone).replace(/_/g, " ")}
            </span>
          </div>
        ) : null}
        {pricingPreview?.fraudRiskLevel ? (
          <div className="flex items-center justify-between">
            <span>Risk review</span>
            <span>{pricingPreview.fraudRiskLevel as string}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[var(--border-color)] pt-6">
        <span className="text-base font-medium text-[var(--text-primary)]">
          Total
        </span>
        <span className="text-2xl font-semibold text-[var(--text-primary)]">
          {formatRupees(total)}
        </span>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={!canCheckout}
        className="btn-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {startingCheckout
          ? "Processing..."
          : selectedPaymentMethod === "cod"
            ? "Place cash on delivery order"
            : "Proceed to secure checkout"}
      </button>

      {!canCheckout ? (
        <p className="mt-3 text-center text-sm leading-5 text-[var(--text-muted)]">
          Complete the shipping address above to continue.
        </p>
      ) : null}
    </aside>
  );
}
