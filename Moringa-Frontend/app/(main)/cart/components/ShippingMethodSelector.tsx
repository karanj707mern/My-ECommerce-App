"use client";

import type { StoreSettings } from "../hooks/useCartLogic";
import { formatRupees } from "@/lib/formatters";

export interface ShippingMethodSelectorProps {
  options: StoreSettings["shippingOptions"];
  selected: string;
  onSelect: (key: string) => void;
  qualifiesForFreeShipping: boolean;
  cartCount: number;
  isDomestic: boolean;
}

export function ShippingMethodSelector({
  options,
  selected,
  onSelect,
  qualifiesForFreeShipping,
  cartCount,
  isDomestic,
}: ShippingMethodSelectorProps) {
  return (
    <div>
      <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300 text-center sm:text-left">
        Shipping method
      </p>
      <div className="mt-4 space-y-3">
        {options.map((option) => {
          const isSelected = option.key === selected;
          const isFree =
            qualifiesForFreeShipping && option.key !== "prime" && cartCount > 0;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-2 border-emerald-400 bg-emerald-400/10 dark:bg-emerald-900/30 dark:border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)] dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                  : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-semibold text-center sm:text-left ${
                      isSelected
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p
                    className={`mt-1 text-sm text-center sm:text-left ${
                      isSelected
                        ? "text-emerald-700/80 dark:text-emerald-300"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    Estimated delivery in {option.etaDays} day
                    {option.etaDays > 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap text-center sm:text-left ${
                    isSelected
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {isFree ? "Free" : formatRupees(option.amount)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {qualifiesForFreeShipping ? (
        <p className="mt-3 text-center text-sm leading-5 text-emerald-700 dark:text-emerald-300 sm:text-left">
          Your order qualifies for free shipping based on the current store
          threshold.
        </p>
      ) : null}
      {!isDomestic ? (
        <p className="mt-3 text-center text-sm leading-5 text-[var(--text-muted)] sm:text-left">
          International addresses currently support standard delivery only.
        </p>
      ) : null}
    </div>
  );
}
