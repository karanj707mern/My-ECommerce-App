"use client";

import { useMemo } from "react";
import OrderProgressStrip from "@/components/OrderProgressStrip";
import { formatMediumDateTime, formatRupees } from "@/lib/formatters";
import { formatStatus, canDownloadInvoice } from "../lib/orders";
import { statusTone } from "../lib/orders";
import type { Order } from "../hooks/useOrdersLogic";
import {
  OrderDetails,
  OrderBreakdown,
  TrackingActivity,
  OrderDeliveryDetails,
  OrderShippingAddress,
} from "./OrderDetails";

export interface OrderCardProps {
  order: Order;
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

export function OrderCard({
  order,
  cancellingOrderId,
  issueForms,
  onCancel,
  onInvoice,
  onIssueFieldChange,
  onIssueSubmit,
}: OrderCardProps) {
  const activeIssue = (order.issues || []).find((issue) =>
    ["OPEN", "UNDER_REVIEW", "APPROVED"].includes(issue.status as string),
  );
  const issueTypeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];

    if (order.returnWindowOpen) {
      options.push(
        { value: "RETURN", label: "Return" },
        { value: "REFUND", label: "Refund" },
        { value: "REPLACEMENT", label: "Replacement" },
      );
    }

    if (["PAID", "DELIVERED"].includes(order.status as string)) {
      options.push({ value: "DISPUTE", label: "Dispute" });
    }

    if (
      ["PAID", "SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status as string)
    ) {
      options.push({
        value: "SHIPMENT_EXCEPTION",
        label: "Shipment exception",
      });
    }

    return options;
  }, [order.returnWindowOpen, order.status]);
  const selectedIssueType = issueTypeOptions.some(
    (option) =>
      option.value === (issueForms[order.id as string]?.type as string),
  )
    ? (issueForms[order.id as string]?.type as string)
    : issueTypeOptions[0]?.value || "";
  const supportFormDisabled =
    Boolean(activeIssue) || issueTypeOptions.length === 0;

  return (
    <article
      key={order.id as string | number}
      className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            {(order.orderNumber as string) || `Order #${order.id}`}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-[var(--text-primary)]">
            {order.orderTitle ||
              ((
                order.items?.[0]?.product as Record<string, unknown> | undefined
              )?.name as string) ||
              `Order ${order.orderNumber || order.id}`}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {formatMediumDateTime(order.createdAt as string)}
          </p>
          {order.invoiceNumber ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Invoice {order.invoiceNumber as string}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusTone(order.status as string)}`}
          >
            {formatStatus(order.status as string)}
          </span>
          <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
            {formatRupees(order.total as number)}
          </p>
        </div>
      </div>

      <OrderProgressStrip
        status={
          order.status as
            | "PENDING"
            | "PAID"
            | "SHIPPED"
            | "OUT_FOR_DELIVERY"
            | "DELIVERED"
            | "CANCELLED"
        }
        className="mt-6"
      />

      <OrderDetails order={order} />

      <OrderBreakdown order={order} />

      <TrackingActivity order={order} />

      <OrderDeliveryDetails order={order} />

      <OrderShippingAddress order={order} />

      <div className="mt-6 flex flex-wrap gap-3">
        {canDownloadInvoice(order as unknown as Record<string, unknown>) ? (
          <button
            type="button"
            onClick={() => onInvoice(order.id as string | number)}
            className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)]"
          >
            View invoice
          </button>
        ) : (
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-muted)]">
            Invoice after payment
          </span>
        )}
        {(order.canCustomerCancel as boolean) ? (
          <button
            type="button"
            onClick={() => onCancel(order)}
            disabled={cancellingOrderId === (order.id as string)}
            className="rounded-full border border-[var(--danger-border)] px-4 py-2 text-sm text-[var(--danger-text)] transition hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancellingOrderId === (order.id as string)
              ? "Cancelling..."
              : "Cancel order"}
          </button>
        ) : null}
      </div>

      {order.customerCancellationMessage ? (
        <p className="mt-3 text-sm leading-5 text-[var(--text-muted)]">
          {order.customerCancellationMessage as string}
        </p>
      ) : null}

      <div className="mt-6 rounded-[1.5rem] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
        <p className="text-sm uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
          Order support
        </p>
        {(order.issues || []).length > 0 ? (
          <div className="mt-4 space-y-3">
            {(order.issues as Record<string, unknown>[]).map((issue) => (
              <div
                key={issue.id as string | number}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-[var(--text-primary)]">
                    {issue.title as string}
                  </p>
                  <span className="text-sm uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    {String(issue.status as string).replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {formatMediumDateTime(issue.createdAt as string)}
                </p>
                <p className="mt-2">{issue.description as string}</p>
                {issue.adminResponse ? (
                  <p className="mt-2 text-[var(--text-secondary)]">
                    Admin: {issue.adminResponse as string}
                  </p>
                ) : null}
                {issue.resolutionSummary ? (
                  <p className="mt-2 text-[var(--text-secondary)]">
                    Resolution: {issue.resolutionSummary as string}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            value={selectedIssueType}
            onChange={(event) =>
              onIssueFieldChange(
                order.id as string | number,
                "type",
                event.target.value,
              )
            }
            disabled={supportFormDisabled}
            aria-label="Support request type"
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          >
            {issueTypeOptions.length > 0 ? (
              issueTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              <option value="">No support request available</option>
            )}
          </select>
          <input
            placeholder="Issue title"
            aria-label="Issue title"
            value={(issueForms[order.id as string]?.title as string) || ""}
            onChange={(event) =>
              onIssueFieldChange(
                order.id as string | number,
                "title",
                event.target.value,
              )
            }
            disabled={supportFormDisabled}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
          />
        </div>
        {(order.status as string) === "DELIVERED" ? (
          <p className="mt-3 text-sm leading-5 text-[var(--text-muted)]">
            Returns, refunds, and replacements are available for 7 days after
            delivery.
          </p>
        ) : null}
        <textarea
          placeholder="Describe the issue"
          aria-label="Describe the issue"
          value={(issueForms[order.id as string]?.description as string) || ""}
          onChange={(event) =>
            onIssueFieldChange(
              order.id as string | number,
              "description",
              event.target.value,
            )
          }
          disabled={supportFormDisabled}
          className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
        />
        {activeIssue ? (
          <p className="mt-3 text-sm leading-5 text-[var(--text-muted)]">
            This order already has an active support request under review.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onIssueSubmit(order.id as string | number)}
          disabled={supportFormDisabled}
          className="btn-secondary mt-3"
        >
          Submit support request
        </button>
      </div>
    </article>
  );
}
