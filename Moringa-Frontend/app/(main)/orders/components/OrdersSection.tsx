"use client";

import type { Order } from "../hooks/useOrdersLogic";
import { OrderCard } from "./OrderCard";

export interface OrdersSectionProps {
  eyebrow: string;
  title: string;
  emptyMessage: string;
  orders: Order[];
  cancellingOrderId: string | null;
  issueForms: Record<
    string,
    { type?: string; title?: string; description?: string }
  >;
  onCancel: (order: Order) => void;
  onInvoice: (orderId: string | number) => void;
  onIssueFieldChange: (
    orderId: string | number,
    field: string,
    value: string,
  ) => void;
  onIssueSubmit: (orderId: string | number) => void;
}

export function OrdersSection({
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
}: OrdersSectionProps) {
  return (
    <section>
      <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
        {title}
      </h2>
      <div className="mt-6 space-y-5">
        {orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={order.id as string | number}
              order={order}
              cancellingOrderId={cancellingOrderId}
              issueForms={issueForms}
              onCancel={onCancel}
              onInvoice={onInvoice}
              onIssueFieldChange={onIssueFieldChange}
              onIssueSubmit={onIssueSubmit}
            />
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-secondary)] shadow-sm card">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
