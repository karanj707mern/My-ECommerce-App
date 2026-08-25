import { component$ } from "@builder.io/qwik";
import { OrderCard, type IssueFormState } from "./OrderCard";

export interface OrdersSectionProps {
  eyebrow: string;
  title: string;
  emptyMessage: string;
  orders: Record<string, unknown>[];
  cancellingOrderId: string | null;
  issueForms: Record<string, IssueFormState>;
  onCancel: (order: Record<string, unknown>) => void;
  onInvoice: (orderId: string | number) => void;
  onIssueFieldChange: (
    orderId: string | number,
    field: string,
    value: string,
  ) => void;
  onIssueSubmit: (orderId: string | number) => void;
}

/** Titled list of order cards with an empty state. */
export const OrdersSection = component$<OrdersSectionProps>(
  ({
    eyebrow,
    title,
    emptyMessage,
    orders,
    cancellingOrderId,
    issueForms,
    onCancel,
    onInvoice,
    onIssueFieldChange,
    onIssueSubmit,
  }) => {
    return (
      <section>
        <p class="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          {eyebrow}
        </p>
        <h2 class="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h2>
        <div class="mt-6 space-y-5">
          {orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                key={String(order.id)}
                order={order}
                cancellingOrderId={cancellingOrderId}
                issueForms={issueForms}
                onCancel$={onCancel}
                onInvoice$={onInvoice}
                onIssueFieldChange$={onIssueFieldChange}
                onIssueSubmit$={onIssueSubmit}
              />
            ))
          ) : (
            <div class="card rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-secondary)] shadow-sm">
              {emptyMessage}
            </div>
          )}
        </div>
      </section>
    );
  },
);

export default OrdersSection;
