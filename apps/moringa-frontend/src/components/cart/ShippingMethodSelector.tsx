import { component$, type PropFunction } from "@builder.io/qwik";
import { formatRupees } from "../../lib/formatters";
import type { ShippingOption } from "../../lib/cart";

export interface ShippingMethodSelectorProps {
  options: ShippingOption[];
  selected: string;
  onSelect$: PropFunction<(key: string) => void>;
  qualifiesForFreeShipping: boolean;
  cartCount: number;
  isDomestic: boolean;
}

/** Shipping speed picker with free-shipping highlight. */
export const ShippingMethodSelector = component$<ShippingMethodSelectorProps>(
  ({
    options,
    selected,
    onSelect$,
    qualifiesForFreeShipping,
    cartCount,
    isDomestic,
  }) => {
    return (
      <div>
        <p class="text-center text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300 sm:text-left">
          Shipping method
        </p>
        <div class="mt-4 space-y-3">
          {options.map((option) => {
            const isSelected = option.key === selected;
            const isFree =
              qualifiesForFreeShipping && option.key !== "prime" && cartCount > 0;

            return (
              <button
                key={option.key}
                type="button"
                onClick$={() => onSelect$(option.key)}
                class={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-2 border-emerald-400 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.35)] dark:border-emerald-400 dark:bg-emerald-900/30 dark:shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                    : "border border-[var(--border-color)] bg-[var(--bg-primary)] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                }`}
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p
                      class={`text-center text-sm font-semibold sm:text-left ${
                        isSelected
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {option.label}
                    </p>
                    <p
                      class={`mt-1 text-center text-sm sm:text-left ${
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
                    class={`whitespace-nowrap text-center text-sm font-semibold sm:text-left ${
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
          <p class="mt-3 text-center text-sm leading-5 text-emerald-700 dark:text-emerald-300 sm:text-left">
            Your order qualifies for free shipping based on the current store
            threshold.
          </p>
        ) : null}
        {!isDomestic ? (
          <p class="mt-3 text-center text-sm leading-5 text-[var(--text-muted)] sm:text-left">
            International addresses currently support standard delivery only.
          </p>
        ) : null}
      </div>
    );
  },
);

export default ShippingMethodSelector;
