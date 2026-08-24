import { component$ } from "@builder.io/qwik";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

interface OrderProgressStripProps {
  status: OrderStatus;
  class?: string;
}

const STAGES = [
  { key: "PENDING", label: "Order placed" },
  { key: "PAID", label: "Paid" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

/**
 * Five-stage order progress bar; renders a cancelled banner instead of the
 * strip when the order was cancelled.
 * Port of legacy `components/OrderProgressStrip.tsx`.
 */
export const OrderProgressStrip = component$<OrderProgressStripProps>(
  ({ status, class: className }) => {
    const cancelled = status === "CANCELLED";
    const currentIndex = cancelled
      ? -1
      : STAGES.findIndex((stage) => stage.key === status);

    return (
      <div class={`w-full ${className ?? ""}`} aria-label="Order progress">
        {cancelled ? (
          <div class="flex items-center gap-3 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:text-red-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-red-800">Order cancelled</p>
              <p class="text-xs text-red-600">
                This order will not be delivered.
              </p>
            </div>
          </div>
        ) : (
          <div class="flex items-center justify-between">
            {STAGES.map((stage, index) => {
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;
              return (
                <div
                  key={stage.key}
                  class="flex flex-1 flex-col items-center"
                >
                  <div class="flex w-full items-center">
                    <div
                      class={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                        isCompleted
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="3"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="h-5 w-5"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span class="text-xs font-semibold">{index + 1}</span>
                      )}
                    </div>
                    {index < STAGES.length - 1 ? (
                      <div
                        class={`h-1 flex-1 rounded-full transition ${
                          index < currentIndex
                            ? "bg-emerald-700"
                            : "bg-[var(--border-color)]"
                        }`}
                      />
                    ) : null}
                  </div>
                  <p
                    class={`mt-2 text-xs font-medium uppercase tracking-[0.1em] ${
                      isCurrent
                        ? "text-emerald-700 dark:text-emerald-300"
                        : isCompleted
                          ? "text-[var(--text-secondary)]"
                          : "text-[var(--text-muted)]"
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

export default OrderProgressStrip;
