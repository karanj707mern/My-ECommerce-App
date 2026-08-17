export const ACTIVE_STATUSES = new Set([
  "PENDING",
  "PAID",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
]);
export const COMPLETED_STATUSES = new Set(["DELIVERED"]);
export const CANCELLED_STATUSES = new Set(["CANCELLED"]);
export const ACTIVE_ISSUE_STATUSES = new Set([
  "OPEN",
  "UNDER_REVIEW",
  "APPROVED",
]);
export const RETURN_WINDOW_DAYS = 7;
export const RETURN_REQUEST_TYPES = new Set([
  "RETURN",
  "REFUND",
  "REPLACEMENT",
]);
export const TRACKING_VIEWS = new Set([
  "active",
  "delivered",
  "cancelled",
  "support",
]);
export const INVOICE_STATUSES = new Set([
  "PAID",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
]);

export function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function statusTone(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "bg-[var(--success-bg)] text-[var(--success-text)]";
    case "CANCELLED":
      return "bg-[var(--danger-bg)] text-[var(--danger-text)]";
    case "SHIPPED":
      return "bg-[var(--info-bg)] text-[var(--info-text)]";
    case "OUT_FOR_DELIVERY":
      return "bg-[var(--info-bg)] text-[var(--info-text)]";
    case "PAID":
      return "bg-[var(--warning-bg)] text-[var(--warning-text)]";
    default:
      return "bg-[var(--bg-muted)] text-[var(--text-secondary)]";
  }
}

export function statusDotTone(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "bg-[var(--success-text)]";
    case "CANCELLED":
      return "bg-[var(--danger-text)]";
    case "SHIPPED":
      return "bg-[var(--info-text)]";
    case "OUT_FOR_DELIVERY":
      return "bg-[var(--info-text)]";
    case "PAID":
      return "bg-[var(--warning-text)]";
    default:
      return "bg-[var(--text-muted)]";
  }
}

export function formatShippingType(value: string): string {
  switch (value) {
    case "sameDay":
      return "Same day delivery";
    case "express":
      return "Express delivery";
    case "prime":
      return "Prime delivery";
    default:
      return "Standard delivery";
  }
}

export function formatPaymentMethod(order: Record<string, unknown>): string {
  return Number(order.codAmount) > 0 ? "Cash on delivery" : "Online payment";
}

export function getOrderDisplayTitle<T extends object>(order: T): string {
  const o = order as Record<string, unknown>;
  return (
    (o.orderTitle as string) ||
    ((
      (o.items as Record<string, unknown>[])?.[0]?.product as
        Record<string, unknown> | undefined
    )?.name as string) ||
    `Order ${o.orderNumber || o.id}`
  );
}

export function getOrderSearchValue<T extends object>(order: T): string {
  const o = order as Record<string, unknown>;
  return [
    o.orderTitle as string,
    o.orderNumber as string,
    o.invoiceNumber as string,
    ...((o.items as Record<string, unknown>[]) || []).map(
      (item) => (item.product as Record<string, unknown>)?.name as string,
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getIssueSearchValue<T extends object>(ticket: T): string {
  const t = ticket as Record<string, unknown>;
  return [
    getOrderSearchValue(t.order as Record<string, unknown>),
    t.type as string,
    t.status as string,
    t.title as string,
    t.description as string,
    t.adminResponse as string,
    t.resolutionSummary as string,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getActiveIssue<T extends object>(
  order: T,
): Record<string, unknown> | undefined {
  const o = order as Record<string, unknown>;
  return ((o.issues as Record<string, unknown>[]) || []).find((issue) =>
    ACTIVE_ISSUE_STATUSES.has(issue.status as string),
  );
}

export function getDeliveredAt<T extends object>(order: T): Date | null {
  const o = order as Record<string, unknown>;
  if (o.deliveredAt) {
    return new Date(o.deliveredAt as string);
  }

  const deliveredActivity = (
    (o.activities as Record<string, unknown>[]) || []
  ).find((activity) => activity.status === "DELIVERED");

  return deliveredActivity?.createdAt
    ? new Date(deliveredActivity.createdAt as string)
    : null;
}

export function isReturnWindowOpen<T extends object>(order: T): boolean {
  const o = order as Record<string, unknown>;
  if (o.status !== "DELIVERED") {
    return false;
  }

  const deliveredAt = getDeliveredAt(order);

  if (!deliveredAt || Number.isNaN(deliveredAt.getTime())) {
    return false;
  }

  return (
    Date.now() <=
    deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
}

export function getIssueTypeOptions<T extends object>(
  order: T,
): { value: string; label: string }[] {
  const o = order as Record<string, unknown>;
  const options: { value: string; label: string }[] = [];

  if (isReturnWindowOpen(order)) {
    options.push(
      { value: "RETURN", label: "Return" },
      { value: "REFUND", label: "Refund" },
      { value: "REPLACEMENT", label: "Replacement" },
    );
  }

  const orderStatus = o.status as string;
  if (orderStatus === "PAID" || orderStatus === "DELIVERED") {
    options.push({ value: "DISPUTE", label: "Dispute" });
  }

  if (["PAID", "SHIPPED", "OUT_FOR_DELIVERY"].includes(orderStatus)) {
    options.push({ value: "SHIPMENT_EXCEPTION", label: "Shipment exception" });
  }

  return options;
}

export function canDownloadInvoice<T extends object>(order: T): boolean {
  const o = order as Record<string, unknown>;
  return INVOICE_STATUSES.has(o.status as string);
}

export function upsertOrder<T extends { id: string | number }>(
  currentOrders: T[],
  nextOrder: T,
): T[] {
  const existingIndex = currentOrders.findIndex(
    (order) => order.id === nextOrder.id,
  );

  if (existingIndex === -1) {
    return [nextOrder, ...currentOrders].sort((left, right) => {
      const leftRec = left as Record<string, unknown>;
      const rightRec = right as Record<string, unknown>;
      return (
        new Date(rightRec.createdAt as string).getTime() -
        new Date(leftRec.createdAt as string).getTime()
      );
    });
  }

  const updatedOrders = [...currentOrders];
  updatedOrders[existingIndex] = nextOrder;
  return updatedOrders;
}
