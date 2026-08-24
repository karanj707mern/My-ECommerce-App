import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import { io, type Socket } from "socket.io-client";
import { cancelOrder, createOrderIssue, getOrders, getOrderInvoice } from "../../lib/api/order";
import { SOCKET_BASE_URL } from "../../lib/config";
import {
  clearToken,
} from "../../lib/storage";
import { signOutCurrentUser } from "../../lib/session";
import { buildInvoiceHtml } from "../../lib/invoice";
import {
  ACTIVE_STATUSES,
  CANCELLED_STATUSES,
  COMPLETED_STATUSES,
  RETURN_REQUEST_TYPES,
  RETURN_WINDOW_DAYS,
  TRACKING_VIEWS,
  canDownloadInvoice,
  getActiveIssue,
  getIssueSearchValue,
  getIssueTypeOptions,
  getOrderDisplayTitle,
  getOrderSearchValue,
  isReturnWindowOpen,
  upsertOrder,
} from "../../lib/orders";
import { useAutoDismiss } from "../../hooks/useAutoDismiss";
import { useToast } from "../../hooks/useToast";
import { useAuthState } from "../../hooks/useAuthState";
import { AdminRedirect } from "../admin/AdminRedirect";
import { OrdersSection } from "./OrdersSection";
import { SupportSection } from "./SupportSection";

export interface OrderRecord extends Record<string, unknown> {
  id: string | number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface IssueFormState {
  type?: string;
  title?: string;
  description?: string;
}

function hasStatus(err: unknown, code: number): boolean {
  return (err as { status?: number })?.status === code;
}

/**
 * Full orders page with tabs (active/delivered/cancelled/support), search,
 * sort, realtime socket updates, support requests and invoice printing.
 * Port of legacy `useOrdersLogic` + `OrdersPageInner`.
 */
export const OrdersPage = component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const { currentUser, authChecked } = useAuthState();

  const orders = useSignal<Record<string, unknown>[]>([]);
  const error = useSignal("");
  const loading = useSignal(true);
  const cancellingOrderId = useSignal<string | null>(null);
  const searchTerm = useSignal("");
  const orderSortOption = useSignal("newest");
  const issueForms = useSignal<Record<string, IssueFormState>>({});

  useAutoDismiss(error, $(() => { error.value = ""; }), 5000);

  const currentUserId = currentUser.value?.id as string | number | undefined;
  const isAdmin = currentUser.value?.role === "ADMIN";

  const redirectToAuth = $(async () => {
    clearToken();
    await nav(
      "/auth?from=" +
        encodeURIComponent("/orders") +
        "&authMessage=" +
        encodeURIComponent("Sign in to view your orders."),
    );
  });

  useVisibleTask$(async ({ track }) => {
    if (!track(authChecked)) return;

    if (!track(currentUser)?.id) {
      loading.value = false;
      return;
    }

    try {
      const data = await getOrders();
      orders.value = Array.isArray(data)
        ? (data as Record<string, unknown>[])
        : [];
      error.value = "";
    } catch (err) {
      if (hasStatus(err, 401)) {
        await redirectToAuth();
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load your orders.";
    } finally {
      loading.value = false;
    }
  });

  /* Realtime order updates over the /orders socket namespace. */
  useVisibleTask$(({ track }) => {
    const user = track(currentUser);
    if (!track(authChecked) || !user?.id || user?.role === "ADMIN") {
      return;
    }

    const socket: Socket = io(`${SOCKET_BASE_URL}/orders`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("order.updated", (payload: Record<string, unknown>) => {
      if (payload?.type !== "order.updated" || !payload.order) {
        return;
      }

      const order = payload.order as Record<string, unknown> & {
        id: string | number;
      };
      orders.value = upsertOrder(
        orders.value as (Record<string, unknown> & { id: string | number })[],
        order,
      );
      error.value = "";
      void toast.showToast({
        severity: "info",
        summary: "Order updated",
        detail: `Order #${String(order.orderNumber ?? order.id)} status changed to ${String(order.status).replace(/_/g, " ")}.`,
        life: 4000,
      });
    });

    socket.on("connect_error", () => {
      // Keep temporary realtime disconnects quiet
    });

    return () => {
      socket.disconnect();
    };
  });

  /* Payment/order query-param messages (and cancelled-payment cleanup). */
  useVisibleTask$(async () => {
    const params = new URL(loc.url.href).searchParams;
    const paymentState = params.get("payment");
    const orderId = params.get("orderId");
    const orderNumber = params.get("orderNumber");
    let replaced = false;

    const replaceUrl = async () => {
      if (replaced) return;
      replaced = true;
      await nav(loc.url.pathname, { scroll: false });
    };

    if (paymentState === "success" && orderId) {
      await toast.showToast({
        severity: "success",
        summary: "Payment received",
        detail: `Payment received for ${orderNumber || `order #${orderId}`}. We are confirming it now.`,
        life: 3000,
      });
      await replaceUrl();
      return;
    }

    if (paymentState === "cancelled" && orderId) {
      try {
        await cancelOrder(orderId);
        orders.value = orders.value.map((order) =>
          String(order.id) === String(orderId)
            ? { ...order, status: "CANCELLED" }
            : order,
        );
        await toast.showToast({
          severity: "error",
          summary: "Order cancelled",
          detail: `Order #${orderId} was cancelled because payment was not completed.`,
          life: 5000,
        });
      } catch (err) {
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not cancel the unfinished order.";
      } finally {
        await replaceUrl();
      }
      return;
    }

    const orderMessage = params.get("orderMessage");
    if (orderMessage) {
      await toast.showToast({
        severity: "info",
        summary: "Order message",
        detail: orderMessage,
        life: 5000,
      });
      await replaceUrl();
    }
  });

  /* Derived views (filter + enrich + sort). */
  const searchTermValue = searchTerm.value.trim().toLowerCase();

  const sortByOption = (
    items: Record<string, unknown>[],
  ): Record<string, unknown>[] => {
    const nextItems = [...items];
    if (orderSortOption.value === "name") {
      return nextItems.sort((left, right) =>
        getOrderDisplayTitle(left).localeCompare(getOrderDisplayTitle(right)),
      );
    }
    if (orderSortOption.value === "oldest") {
      return nextItems.sort(
        (left, right) =>
          new Date(left.createdAt as string).getTime() -
          new Date(right.createdAt as string).getTime(),
      );
    }
    return nextItems.sort(
      (left, right) =>
        new Date(right.createdAt as string).getTime() -
        new Date(left.createdAt as string).getTime(),
    );
  };

  const enrichWithReturnWindow = (
    items: Record<string, unknown>[],
  ): Record<string, unknown>[] => {
    const now = Date.now();
    return items.map((order) => ({
      ...order,
      returnWindowOpen: (() => {
        const activities =
          (order.activities as Record<string, unknown>[]) || [];
        const deliveredAt = order.deliveredAt
          ? new Date(order.deliveredAt as string).getTime()
          : ((activities.find((activity) => activity.status === "DELIVERED")
              ?.createdAt as string | undefined)
            ? new Date(
                activities.find(
                  (activity) => activity.status === "DELIVERED",
                )?.createdAt as string,
              ).getTime()
            : null);
        return (
          deliveredAt !== null &&
          Number.isNaN(deliveredAt) === false &&
          now <= deliveredAt + 7 * 24 * 60 * 60 * 1000
        );
      })(),
    }));
  };

  const inSearch = (order: Record<string, unknown>): boolean =>
    getOrderSearchValue(order).includes(searchTermValue);

  const sortedCurrentOrders = sortByOption(
    enrichWithReturnWindow(
      orders.value.filter(
        (order) =>
          ACTIVE_STATUSES.has(order.status as string) && inSearch(order),
      ),
    ),
  );

  const sortedCompletedOrders = sortByOption(
    enrichWithReturnWindow(
      orders.value.filter(
        (order) =>
          COMPLETED_STATUSES.has(order.status as string) && inSearch(order),
      ),
    ),
  );

  const sortedCancelledOrders = sortByOption(
    enrichWithReturnWindow(
      orders.value.filter(
        (order) =>
          CANCELLED_STATUSES.has(order.status as string) && inSearch(order),
      ),
    ),
  );

  const supportTickets = orders.value
    .flatMap((order) =>
      ((order.issues as Record<string, unknown>[]) || []).map((issue) => ({
        ...issue,
        order,
      })),
    )
    .filter(
      (ticket) =>
        getIssueSearchValue(ticket).includes(searchTermValue),
    );

  const sortedSupportTickets = [...supportTickets].sort((left, right) => {
    const leftOrder = left.order as Record<string, unknown>;
    const rightOrder = right.order as Record<string, unknown>;
    if (orderSortOption.value === "name") {
      return getOrderDisplayTitle(leftOrder).localeCompare(
        getOrderDisplayTitle(rightOrder),
      );
    }
    if (orderSortOption.value === "oldest") {
      return (
        new Date(leftOrder.createdAt as string).getTime() -
        new Date(rightOrder.createdAt as string).getTime()
      );
    }
    return (
      new Date(rightOrder.createdAt as string).getTime() -
      new Date(leftOrder.createdAt as string).getTime()
    );
  });

  const trackingLinks = [
    { key: "active", label: "Active", path: "/orders/active", count: sortedCurrentOrders.length },
    { key: "delivered", label: "Delivered", path: "/orders/delivered", count: sortedCompletedOrders.length },
    { key: "cancelled", label: "Cancelled", path: "/orders/cancelled", count: sortedCancelledOrders.length },
    { key: "support", label: "Support tickets", path: "/orders/support", count: supportTickets.length },
  ];

  const lastSegment = loc.url.pathname.split("/").pop() || "active";
  const selectedView = TRACKING_VIEWS.has(lastSegment) ? lastSegment : "active";

  const handleIssueFieldChange = $(
    (orderId: string | number, field: string, value: string) => {
      const key = String(orderId);
      issueForms.value = {
        ...issueForms.value,
        [key]: {
          type: issueForms.value[key]?.type || "RETURN",
          title: issueForms.value[key]?.title || "",
          description: issueForms.value[key]?.description || "",
          [field]: value,
        },
      };
    },
  );

  const handleIssueSubmit = $(async (orderId: string | number) => {
    const order = orders.value.find(
      (currentOrder) => currentOrder.id === orderId,
    );
    const activeIssue = order ? getActiveIssue(order) : undefined;
    const availableIssueTypes = order ? getIssueTypeOptions(order) : [];

    if (activeIssue) {
      error.value =
        "This order already has an active support request under review.";
      return;
    }

    const key = String(orderId);
    const form = issueForms.value[key] ?? {};
    const selectedType = availableIssueTypes.some(
      (option) => option.value === form.type,
    )
      ? form.type
      : availableIssueTypes[0]?.value;

    if (!selectedType) {
      error.value = "Support requests are not available for this order right now.";
      return;
    }

    if (
      RETURN_REQUEST_TYPES.has(selectedType) &&
      !isReturnWindowOpen(order ?? {})
    ) {
      error.value = `Returns, refunds, and replacements are available for ${RETURN_WINDOW_DAYS} days after delivery.`;
      return;
    }

    try {
      const issue = (await createOrderIssue(orderId, {
        type: selectedType,
        title: form.title || "Order issue",
        description: form.description || "",
      })) as Record<string, unknown>;
      orders.value = orders.value.map((o) =>
        o.id === orderId
          ? {
              ...o,
              issues: [
                issue,
                ...((o.issues as Record<string, unknown>[]) || []),
              ],
            }
          : o,
      );
      issueForms.value = {
        ...issueForms.value,
        [key]: { type: "RETURN", title: "", description: "" },
      };
      await toast.showToast({
        severity: "success",
        summary: "Support request submitted",
        detail: "Your support request has been submitted.",
        life: 4000,
      });
      error.value = "";
      await nav("/orders/support");
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not submit your order issue.";
    }
  });

  const handleInvoiceDownload = $(async (invoiceOrderId: string | number) => {
    const order = orders.value.find(
      (currentOrder) => currentOrder.id === invoiceOrderId,
    );

    if (order && !canDownloadInvoice(order)) {
      error.value = "Invoice is available only after payment is confirmed.";
      return;
    }

    try {
      const raw = (await getOrderInvoice(invoiceOrderId)) as Record<
        string,
        unknown
      >;
      const orderRecord = (raw.order as Record<string, unknown>) || {};
      const items = (
        (orderRecord.items || []) as Record<string, unknown>[]
      ).map((item) => {
        const product =
          (item.product as Record<string, unknown> | undefined) || {};
        return {
          name: (product.name as string) || "Product",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.price) || 0,
          imageUrl: product.image as string | undefined,
        };
      });

      const invoice = {
        invoiceNumber: String(raw.invoiceNumber || ""),
        orderNumber: String(raw.orderNumber || ""),
        issuedAt: String(raw.issuedAt || ""),
        sellerName: String(
          ((raw.seller as Record<string, unknown>)?.name as string) ||
            "Moringa Store",
        ),
        orderTitle: String(raw.orderTitle || ""),
        recipient: {
          name: String(orderRecord.recipientName || ""),
          line1: String(orderRecord.addressLine1 || ""),
          line2: String(orderRecord.addressLine2 || ""),
          city: String(orderRecord.city || ""),
          state: String(orderRecord.state || ""),
          postalCode: String(orderRecord.postalCode || ""),
          country: String(orderRecord.country || ""),
          phoneNumber: String(orderRecord.phoneNumber || ""),
        },
        items,
        subtotal: Number(orderRecord.subtotal) || 0,
        discountAmount: Number(orderRecord.discountAmount) || 0,
        shippingAmount: Number(orderRecord.shippingAmount) || 0,
        handlingAmount: Number(orderRecord.handlingAmount) || 0,
        taxAmount: Number(orderRecord.taxAmount) || 0,
        total: Number(orderRecord.total) || 0,
      };

      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        error.value = "Allow popups to save the invoice as a PDF.";
        return;
      }

      const doc = printWindow.document;
      doc.open();
      doc.write(buildInvoiceHtml(invoice));
      doc.close();
      await toast.showToast({
        severity: "info",
        summary: "Invoice opened",
        detail: `Invoice ${invoice.invoiceNumber} opened. Choose "Save as PDF" in the print dialog.`,
        life: 4000,
      });
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load the invoice.";
    }
  });

  const handleOrderCancel = $(async (order: Record<string, unknown>) => {
    try {
      cancellingOrderId.value = String(order.id);
      const cancelledOrder = (await cancelOrder(
        order.id as string | number,
      )) as Record<string, unknown>;
      orders.value = orders.value.map((currentOrder) =>
        currentOrder.id === order.id ? cancelledOrder : currentOrder,
      );
      await toast.showToast({
        severity: "success",
        summary: "Order cancelled",
        detail: `${getOrderDisplayTitle(cancelledOrder)} was cancelled successfully.`,
        life: 4000,
      });
      error.value = "";
    } catch (err) {
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not cancel this order.";
    } finally {
      cancellingOrderId.value = null;
    }
  });

  const handleSignIn = $(async () => {
    await nav(
      "/auth?from=" +
        encodeURIComponent("/orders") +
        "&authMessage=" +
        encodeURIComponent("Sign in to view your orders."),
    );
  });

  return (
    <div class="min-h-screen bg-[var(--bg-primary)] pb-24 text-[var(--text-primary)] theme-transition">
      <AdminRedirect />
      <main>
        <div class="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          {error.value ? (
            <div
              class="mb-8 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
              role="alert"
            >
              {error.value}
            </div>
          ) : null}

          {!currentUserId ? (
            <div class="card mb-8 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <p class="text-base text-[var(--text-secondary)]">
                You are viewing your orders as a guest. Sign in to view your
                order history, track deliveries, and manage returns.
              </p>
              <button
                type="button"
                onClick$={handleSignIn}
                class="btn-primary mt-4"
              >
                Sign in to view orders
              </button>
            </div>
          ) : null}

          {loading.value ? (
            <div class="card rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-[var(--text-secondary)] shadow-sm sm:p-10">
              Loading your orders...
            </div>
          ) : (
            <div>
              <div class="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {trackingLinks.map((link) => {
                  const isSelected = link.key === selectedView;

                  return (
                    <Link
                      key={link.key}
                      href={link.path}
                      class={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                          : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-emerald-300"
                      }`}
                    >
                      <span class="text-sm font-semibold">{link.label}</span>
                      <span class="mt-2 block text-2xl font-semibold">
                        {link.count}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div class="card mb-8 grid gap-3 rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:grid-cols-[1fr_auto] lg:grid-cols-[1fr_220px]">
                <input
                  value={searchTerm.value}
                  onInput$={(_, el) => (searchTerm.value = el.value)}
                  placeholder="Search orders, products, invoices, or support tickets"
                  aria-label="Search orders"
                  class="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                />
                <select
                  value={orderSortOption.value}
                  onChange$={(_, el) => (orderSortOption.value = el.value)}
                  class="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Product name</option>
                </select>
              </div>

              {selectedView === "delivered" ? (
                <OrdersSection
                  eyebrow="Delivered orders"
                  title="Delivered and completed"
                  emptyMessage="Completed orders will appear here once they are delivered."
                  orders={sortedCompletedOrders}
                  cancellingOrderId={cancellingOrderId.value}
                  issueForms={issueForms.value}
                  onCancel={handleOrderCancel}
                  onInvoice={handleInvoiceDownload}
                  onIssueFieldChange={handleIssueFieldChange}
                  onIssueSubmit={handleIssueSubmit}
                />
              ) : selectedView === "cancelled" ? (
                <OrdersSection
                  eyebrow="Cancelled orders"
                  title="Cancelled"
                  emptyMessage="Cancelled orders will appear here separately."
                  orders={sortedCancelledOrders}
                  cancellingOrderId={cancellingOrderId.value}
                  issueForms={issueForms.value}
                  onCancel={handleOrderCancel}
                  onInvoice={handleInvoiceDownload}
                  onIssueFieldChange={handleIssueFieldChange}
                  onIssueSubmit={handleIssueSubmit}
                />
              ) : selectedView === "support" ? (
                <SupportSection tickets={sortedSupportTickets} />
              ) : (
                <OrdersSection
                  eyebrow="Current orders"
                  title="Orders in progress"
                  emptyMessage="You do not have any active orders right now."
                  orders={sortedCurrentOrders}
                  cancellingOrderId={cancellingOrderId.value}
                  issueForms={issueForms.value}
                  onCancel={handleOrderCancel}
                  onInvoice={handleInvoiceDownload}
                  onIssueFieldChange={handleIssueFieldChange}
                  onIssueSubmit={handleIssueSubmit}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
});

export default OrdersPage;
