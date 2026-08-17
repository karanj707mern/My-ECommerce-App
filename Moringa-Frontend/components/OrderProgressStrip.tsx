"use client";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

interface OrderProgressStripProps {
  status: OrderStatus;
  className?: string;
}

const STAGES = [
  { key: "PENDING", label: "Order placed" },
  { key: "PAID", label: "Paid" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

function isCancelled(status: OrderStatus): boolean {
  return status === "CANCELLED";
}

export default function OrderProgressStrip({
  status,
  className = "",
}: OrderProgressStripProps) {
  const cancelled = isCancelled(status);
  const currentIndex = cancelled
    ? -1
    : STAGES.findIndex((stage) => stage.key === status);

  return (
    <div className={`w-full ${className}`} aria-label="Order progress">
      {cancelled ? (
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:text-red-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">
              Order cancelled
            </p>
            <p className="text-xs text-red-600">
              This order will not be delivered.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {STAGES.map((stage, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <div
                key={stage.key}
                className="flex flex-1 flex-col items-center"
              >
                <div className="flex w-full items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
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
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </div>
                  {index < STAGES.length - 1 ? (
                    <div
                      className={`h-1 flex-1 rounded-full transition ${
                        index < currentIndex
                          ? "bg-emerald-700"
                          : "bg-[var(--border-color)]"
                      }`}
                    />
                  ) : null}
                </div>
                <p
                  className={`mt-2 text-xs font-medium uppercase tracking-[0.1em] ${
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
}
