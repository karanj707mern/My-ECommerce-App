import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";
import { io, type Socket } from "socket.io-client";
import {
  getOpenOrders,
  getCancelledOrders,
  updateOrderStatus,
  refundOrder,
} from "../../lib/api/order";
import { SOCKET_BASE_URL } from "../../lib/config";
import { useToast } from "../../hooks/useToast";

const OPEN_ORDER_STATUSES = new Set([
  "PENDING",
  "PAID",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
]);

type OrdersTab = "active" | "cancelled";

function getAllowedOrderActions(order: Record<string, unknown>): string[] {
  if (!order || order.status === "CANCELLED" || order.status === "DELIVERED") {
    return [];
  }
  const isAwaitingOnlinePayment = Boolean(
    order.razorpayOrderId && !order.paidAt,
  );
  switch (order.status) {
    case "PENDING":
      return isAwaitingOnlinePayment
        ? ["PAID", "CANCELLED"]
        : ["PAID", "SHIPPED", "CANCELLED"];
    case "PAID":
      return ["SHIPPED", "CANCELLED"];
    case "SHIPPED":
      return ["OUT_FOR_DELIVERY"];
    case "OUT_FOR_DELIVERY":
      return ["DELIVERED"];
    default:
      return [];
  }
}

function toOrderFormState(order: Record<string, unknown>) {
  return {
    courierName: order.courierName ?? "",
    trackingNumber: order.trackingNumber ?? "",
    estimatedDeliveryAt: order.estimatedDeliveryAt
      ? new Date(order.estimatedDeliveryAt as string).toISOString().slice(0, 10)
      : "",
    adminNotes: order.adminNotes ?? "",
    note: "",
  };
}

function syncOpenOrder(
  currentOrders: Record<string, unknown>[],
  nextOrder: Record<string, unknown>,
): Record<string, unknown>[] {
  const existingIndex = currentOrders.findIndex(
    (order) => order.id === nextOrder.id,
  );
  const shouldBeOpen = OPEN_ORDER_STATUSES.has(nextOrder.status as string);
  if (!shouldBeOpen) {
    if (existingIndex === -1) return currentOrders;
    return currentOrders.filter((order) => order.id !== nextOrder.id);
  }
  if (existingIndex === -1) {
    return [nextOrder, ...currentOrders].sort(
      (left, right) =>
        new Date(right.createdAt as string).getTime() -
        new Date(left.createdAt as string).getTime(),
    );
  }
  const updatedOrders = [...currentOrders];
  updatedOrders[existingIndex] = nextOrder;
  return updatedOrders;
}

function hasAuthError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403;
}

/**
 * Admin order queue: active/cancelled tabs, search, sort, status transitions,
 * courier/tracking capture and refunds. Realtime via /orders socket.
 * Port of legacy `components/admin/OrdersManager.tsx`.
 */
export const OrdersManager = component$(() => {
  const nav = useNavigate();
  const toast = useToast();
  const openOrders = useSignal<Record<string, unknown>[]>([]);
  const cancelledOrders = useSignal<Record<string, unknown>[]>([]);
  const orderForms = useSignal<Record<string | number, Record<string, unknown>>>({});
  const orderSearchTerm = useSignal("");
  const orderSortBy = useSignal("newest");
  const loading = useSignal(true);
  const error = useSignal("");
  const activeTab = useSignal<OrdersTab>("active");

  const loadOrders = $(async () => {
    try {
      loading.value = true;
      const [openData, cancelledData] = await Promise.all([
        getOpenOrders(),
        getCancelledOrders(),
      ]);
      const openOrdersList = Array.isArray(openData)
        ? (openData as Record<string, unknown>[])
        : [];
      const cancelledOrdersList = Array.isArray(cancelledData)
        ? (cancelledData as Record<string, unknown>[])
        : [];
      openOrders.value = openOrdersList;
      cancelledOrders.value = cancelledOrdersList;
      const next: Record<string | number, Record<string, unknown>> = {};
      for (const order of [...openOrdersList, ...cancelledOrdersList]) {
        next[order.id as string | number] = {
          ...toOrderFormState(order),
          ...(orderForms.value[order.id as string | number] || {}),
          note: orderForms.value[order.id as string | number]?.note ?? "",
        };
      }
      orderForms.value = next;
      error.value = "";
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/orders"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not load orders.";
    } finally {
      loading.value = false;
    }
  });

  useVisibleTask$(async ({ cleanup }) => {
    await loadOrders();

    const socket: Socket = io(`${SOCKET_BASE_URL}/orders`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("order.updated", (payload: Record<string, unknown>) => {
      if (payload?.type !== "order.updated" || !payload.order) return;
      const order = payload.order as Record<string, unknown>;
      const orderId = String(order.id);
      openOrders.value = syncOpenOrder(openOrders.value, order);
      const exists = cancelledOrders.value.some((o) => o.id === order.id);
      if (order.status === "CANCELLED") {
        cancelledOrders.value = exists
          ? cancelledOrders.value.map((o) => (o.id === order.id ? order : o))
          : [order, ...cancelledOrders.value];
      } else {
        cancelledOrders.value = cancelledOrders.value.filter(
          (o) => o.id !== order.id,
        );
      }
      orderForms.value = {
        ...orderForms.value,
        [orderId]: {
          ...toOrderFormState(order),
          ...(orderForms.value[orderId] || {}),
          note: orderForms.value[orderId]?.note ?? "",
          adminNotes:
            orderForms.value[orderId]?.adminNotes ??
            toOrderFormState(order).adminNotes,
        },
      };
    });

    cleanup(() => {
      socket.disconnect();
    });
  });

  const handleOrderFieldChange = $(
    (orderId: string | number, field: string, value: string) => {
      orderForms.value = {
        ...orderForms.value,
        [orderId]: { ...(orderForms.value[orderId] || {}), [field]: value },
      };
    },
  );

  const handleOrderStatusChange = $(
    async (orderId: string | number, status: string) => {
      try {
        const orderForm = orderForms.value[orderId] || {};
        await updateOrderStatus(orderId, {
          status,
          courierName: (orderForm.courierName as string)?.trim() || undefined,
          trackingNumber:
            (orderForm.trackingNumber as string)?.trim() || undefined,
          estimatedDeliveryAt: orderForm.estimatedDeliveryAt || undefined,
          adminNotes: (orderForm.adminNotes as string)?.trim() || undefined,
          note: (orderForm.note as string)?.trim() || undefined,
        });
        await toast.showToast({
          severity: "success",
          summary: "Success",
          detail: `Order updated to ${status.toLowerCase()}.`,
          life: 4000,
        });
        await loadOrders();
      } catch (err) {
        if (hasAuthError(err)) {
          await nav("/auth?from=" + encodeURIComponent("/admin/orders"));
          return;
        }
        error.value =
          err instanceof Error && err.message
            ? err.message
            : "Could not update order status.";
      }
    },
  );

  const handleRefundOrder = $(async (orderId: string | number) => {
    try {
      await refundOrder(orderId);
      await toast.showToast({
        severity: "success",
        summary: "Refund processed",
        detail: "The refund has been processed successfully.",
        life: 4000,
      });
      await loadOrders();
    } catch (err) {
      if (hasAuthError(err)) {
        await nav("/auth?from=" + encodeURIComponent("/admin/orders"));
        return;
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "Could not process refund.";
    }
  });

  const sortOrders = (
    orders: Record<string, unknown>[],
  ): Record<string, unknown>[] => {
    const filtered = [...orders].filter((order) => {
      const normalizedSearch = orderSearchTerm.value.trim().toLowerCase();
      if (!normalizedSearch) return true;
      const user = order.user as Record<string, unknown> | undefined;
      const items = (order.items as Record<string, unknown>[]) || [];
      return [
        order.orderTitle as string,
        order.orderNumber as string,
        user?.name as string,
        user?.email as string,
        ...items.map(
          (item) => (item.product as Record<string, unknown>)?.name as string,
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });

    if (orderSortBy.value === "name") {
      return filtered.sort((left, right) =>
        String(left.orderTitle || "").localeCompare(
          String(right.orderTitle || ""),
        ),
      );
    }
    if (orderSortBy.value === "oldest") {
      return filtered.sort(
        (left, right) =>
          new Date(left.createdAt as string).getTime() -
          new Date(right.createdAt as string).getTime(),
      );
    }
    return filtered.sort(
      (left, right) =>
        new Date(right.createdAt as string).getTime() -
        new Date(left.createdAt as string).getTime(),
    );
  };

  const filteredOpenOrders = sortOrders(openOrders.value);
  const filteredCancelledOrders = sortOrders(cancelledOrders.value);
  const activeOrders =
    activeTab.value === "active" ? filteredOpenOrders : filteredCancelledOrders;

  const inputClass =
    "rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200";

  return (
    <section class="admin-card p-4 shadow-sm sm:p-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
            {activeTab.value === "active" ? "Active orders" : "Cancelled orders"}
          </p>
          <h2 class="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
            {activeTab.value === "active" ? "Shipment queue" : "Cancelled orders"}
          </h2>
        </div>

        <div class="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] p-1">
          <button
            type="button"
            onClick$={() => (activeTab.value = "active")}
            class={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab.value === "active"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-emerald-700 dark:text-emerald-300"
            }`}
          >
            Active ({openOrders.value.length})
          </button>
          <button
            type="button"
            onClick$={() => (activeTab.value = "cancelled")}
            class={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab.value === "cancelled"
                ? "bg-red-700 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-red-700 dark:text-red-300"
            }`}
          >
            Cancelled ({cancelledOrders.value.length})
          </button>
        </div>
      </div>

      {error.value ? (
        <div
          class="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {error.value}
        </div>
      ) : null}

      <div class="mt-5 grid gap-3 md:grid-cols-[1fr_200px]">
        <input
          value={orderSearchTerm.value}
          onInput$={(_, el) => (orderSearchTerm.value = el.value)}
          placeholder="Search by product, order number, customer, or email"
          aria-label="Search orders"
          class={inputClass}
        />
        <select
          value={orderSortBy.value}
          onChange$={(_, el) => (orderSortBy.value = el.value)}
          class={inputClass}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Product name</option>
        </select>
      </div>

      <div class="mt-6 space-y-3">
        {loading.value ? (
          <div class="admin-card-static p-5 text-sm text-[var(--text-secondary)]">
            Loading orders…
          </div>
        ) : activeOrders.length > 0 ? (
          activeOrders.map((order) => {
            const allowedActions =
              activeTab.value === "active" ? getAllowedOrderActions(order) : [];
            const isCancelled = order.status === "CANCELLED";
            return (
              <article
                key={String(order.id)}
                class={`admin-card p-4 ${
                  isCancelled
                    ? "border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-950/30"
                    : ""
                }`}
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                      {(order.orderNumber as string) ||
                        `Order #${String(order.id)}`}
                    </p>
                    <h3 class="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {(order.orderTitle as string) ||
                        (((order.items as Record<string, unknown>[])?.[0]
                          ?.product as Record<string, unknown>)?.name as string) ||
                        "Customer order"}
                    </h3>
                    <p class="mt-1 text-xs text-[var(--text-muted)]">
                      {((order.user as Record<string, unknown>)?.name as string) ||
                        "Customer"}{" "}
                      ·{" "}
                      {(order.user as Record<string, unknown>)?.email as string}
                    </p>
                  </div>
                  <div class="text-left sm:text-right">
                    <p
                      class={`text-sm font-semibold ${
                        isCancelled
                          ? "text-red-700 dark:text-red-400"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {order.status as string}
                    </p>
                    {order.invoiceNumber ? (
                      <p class="mt-1 text-xs text-[var(--text-muted)]">
                        {order.invoiceNumber as string}
                      </p>
                    ) : null}
                    <p class="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
                      Rs {Number(order.total).toFixed(0)}
                    </p>
                    {isCancelled && order.refundedAt ? (
                      <p class="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                        Refunded{" "}
                        {new Date(
                          order.refundedAt as string,
                        ).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div class="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
                  {(order.items as Record<string, unknown>[]).map((item) => (
                    <div
                      key={String(item.id)}
                      class="flex flex-wrap items-center justify-between gap-2 sm:gap-4"
                    >
                      <span>
                        {((item.product as Record<string, unknown>)
                          ?.name as string) || "Product"}{" "}
                        x {item.quantity as number}
                      </span>
                      <span>
                        Rs{" "}
                        {Number(
                          (item.price as number) * (item.quantity as number),
                        ).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                <div class="mt-4 overflow-x-auto">
                  <table class="min-w-full text-left text-sm">
                    <thead>
                      <tr class="border-b border-[var(--border-color)]">
                        <th class="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          User
                        </th>
                        <th class="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Item
                        </th>
                        <th class="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Qty
                        </th>
                        <th class="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Date
                        </th>
                        <th class="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Unit price
                        </th>
                        <th class="pb-2 font-medium text-[var(--text-muted)]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items as Record<string, unknown>[]).map((item) => {
                        const product =
                          (item.product as Record<string, unknown>) || {};
                        const unitPrice = Number(item.price as number);
                        const quantity = Number(item.quantity as number);
                        const lineTotal = unitPrice * quantity;
                        const orderDate = new Date(
                          order.createdAt as string,
                        ).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        });
                        const userName =
                          ((order.user as Record<string, unknown>)
                            ?.name as string) || "Customer";
                        const userEmail =
                          ((order.user as Record<string, unknown>)
                            ?.email as string) || "";

                        return (
                          <tr
                            key={String(item.id)}
                            class="border-b border-[var(--border-color)] last:border-0"
                          >
                            <td class="py-2 pr-3 align-top">
                              <div class="flex flex-col">
                                <span class="font-medium text-[var(--text-primary)]">
                                  {userName}
                                </span>
                                <span class="text-xs text-[var(--text-muted)]">
                                  {userEmail}
                                </span>
                              </div>
                            </td>
                            <td class="py-2 pr-3 align-top">
                              {(product.name as string) || "Product"}
                            </td>
                            <td class="py-2 pr-3 align-top">{quantity}</td>
                            <td class="py-2 pr-3 align-top">{orderDate}</td>
                            <td class="py-2 pr-3 align-top">
                              Rs {unitPrice.toFixed(2)}
                            </td>
                            <td class="py-2 align-top font-medium">
                              Rs {lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr class="border-t border-[var(--border-color)]">
                        <td
                          colSpan={5}
                          class="pt-2 text-right text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]"
                        >
                          Order total
                        </td>
                        <td class="pt-2 text-sm font-semibold text-[var(--text-primary)]">
                          Rs {Number(order.total).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={6}
                          class="pt-1 text-xs text-[var(--text-muted)]"
                        >
                          Payment:{" "}
                          {order.paymentMethod === "cod"
                            ? "Cash on delivery"
                            : "Online"}{" "}
                          ·{" "}
                          {order.paidAt
                            ? `Paid on ${new Date(order.paidAt as string).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
                            : "Awaiting payment"}
                          {order.razorpayPaymentId
                            ? ` · Ref: ${order.razorpayPaymentId as string}`
                            : null}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {activeTab.value === "active" ? (
                  <>
                    <div class="mt-4 grid gap-2.5 md:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Courier name"
                        aria-label="Courier name"
                        value={
                          (orderForms.value[order.id as string | number]
                            ?.courierName as string) ?? ""
                        }
                        onInput$={(_, el) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "courierName",
                            el.value,
                          )
                        }
                        class={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Tracking number"
                        aria-label="Tracking number"
                        value={
                          (orderForms.value[order.id as string | number]
                            ?.trackingNumber as string) ?? ""
                        }
                        onInput$={(_, el) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "trackingNumber",
                            el.value,
                          )
                        }
                        class={inputClass}
                      />
                      <input
                        type="date"
                        aria-label="Estimated delivery date"
                        value={
                          (orderForms.value[order.id as string | number]
                            ?.estimatedDeliveryAt as string) ?? ""
                        }
                        onInput$={(_, el) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "estimatedDeliveryAt",
                            el.value,
                          )
                        }
                        class={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Customer delivery note"
                        aria-label="Customer delivery note"
                        value={
                          (orderForms.value[order.id as string | number]
                            ?.adminNotes as string) ?? ""
                        }
                        onInput$={(_, el) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "adminNotes",
                            el.value,
                          )
                        }
                        class={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Admin note for timeline"
                        aria-label="Admin note"
                        value={
                          (orderForms.value[order.id as string | number]
                            ?.note as string) ?? ""
                        }
                        onInput$={(_, el) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "note",
                            el.value,
                          )
                        }
                        class={`${inputClass} md:col-span-2`}
                      />
                    </div>

                    {order.trackingNumber ||
                    order.courierName ||
                    order.estimatedDeliveryAt ? (
                      <div class="mt-3 rounded-[1.25rem] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                        {order.courierName ? (
                          <p>Courier: {order.courierName as string}</p>
                        ) : null}
                        {order.trackingNumber ? (
                          <p class="mt-0.5">
                            Tracking: {order.trackingNumber as string}
                          </p>
                        ) : null}
                        {order.estimatedDeliveryAt ? (
                          <p class="mt-0.5">
                            Estimated delivery:{" "}
                            {new Date(
                              order.estimatedDeliveryAt as string,
                            ).toLocaleDateString("en-IN", {
                              dateStyle: "medium",
                            })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {order.recipientName || order.addressLine1 ? (
                      <div class="mt-3 rounded-[1.25rem] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                        <p class="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                          Shipping address
                        </p>
                        {order.recipientName ? (
                          <p class="mt-1">{order.recipientName as string}</p>
                        ) : null}
                        {order.phoneNumber ? (
                          <p class="mt-0.5">{order.phoneNumber as string}</p>
                        ) : null}
                        {order.addressLine1 ? (
                          <p class="mt-0.5">{order.addressLine1 as string}</p>
                        ) : null}
                        {order.addressLine2 ? (
                          <p class="mt-0.5">{order.addressLine2 as string}</p>
                        ) : null}
                        <p class="mt-0.5">
                          {[order.city, order.state, order.postalCode, order.country]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    ) : null}

                    <div class="mt-4 flex flex-wrap gap-2">
                      {allowedActions.includes("PAID") ? (
                        <button
                          type="button"
                          onClick$={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "PAID",
                            )
                          }
                          class="btn-primary px-3 py-1.5 text-sm"
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {allowedActions.includes("SHIPPED") ? (
                        <button
                          type="button"
                          onClick$={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "SHIPPED",
                            )
                          }
                          class="btn-secondary px-3 py-1.5 text-sm"
                        >
                          Mark shipped
                        </button>
                      ) : null}
                      {allowedActions.includes("OUT_FOR_DELIVERY") ? (
                        <button
                          type="button"
                          onClick$={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "OUT_FOR_DELIVERY",
                            )
                          }
                          class="rounded-full border border-sky-300 px-3 py-1.5 text-sm text-sky-700 transition hover:bg-sky-50"
                        >
                          Out for delivery
                        </button>
                      ) : null}
                      {allowedActions.includes("DELIVERED") ? (
                        <button
                          type="button"
                          onClick$={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "DELIVERED",
                            )
                          }
                          class="rounded-full border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300"
                        >
                          Mark delivered
                        </button>
                      ) : null}
                      {allowedActions.includes("CANCELLED") ? (
                        <button
                          type="button"
                          onClick$={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "CANCELLED",
                            )
                          }
                          class="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 dark:text-red-300"
                        >
                          Cancel order
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div class="mt-3 rounded-[1.25rem] bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    <p class="text-sm font-semibold">Cancelled</p>
                    {order.adminNotes ? (
                      <p class="mt-1 text-xs">{order.adminNotes as string}</p>
                    ) : null}
                    {order.refundedAt ? (
                      <div class="mt-2">
                        <p class="text-xs text-emerald-700 dark:text-emerald-300">
                          Refund processed on{" "}
                          {new Date(
                            order.refundedAt as string,
                          ).toLocaleDateString("en-IN", {
                            dateStyle: "medium",
                          })}
                        </p>
                        {order.refundMethod ? (
                          <p class="mt-0.5 text-xs text-[var(--text-secondary)]">
                            Method: {order.refundMethod as string}
                          </p>
                        ) : null}
                        {order.refundReference ? (
                          <p class="text-xs text-[var(--text-secondary)]">
                            Reference: {order.refundReference as string}
                          </p>
                        ) : null}
                        {order.refundNotes ? (
                          <p class="text-xs text-[var(--text-secondary)]">
                            Notes: {order.refundNotes as string}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div class="mt-2">
                        <p class="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          {order.razorpayPaymentId
                            ? "Refund pending or manual processing required"
                            : "Cash/COD refund pending or manual processing required"}
                        </p>
                        <button
                          type="button"
                          onClick$={() =>
                            handleRefundOrder(order.id as string | number)
                          }
                          class="mt-2 rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        >
                          {order.razorpayPaymentId
                            ? "Process refund"
                            : "Mark as refunded"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div class="rounded-[1.5rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] p-5 text-sm text-[var(--text-muted)]">
            {activeTab.value === "active"
              ? "No active customer orders are waiting for action right now."
              : "No cancelled orders yet."}
          </div>
        )}
      </div>
    </section>
  );
});

export default OrdersManager;
