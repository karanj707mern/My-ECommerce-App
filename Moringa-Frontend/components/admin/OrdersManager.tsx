"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  getOpenOrders,
  getCancelledOrders,
  updateOrderStatus,
  refundOrder,
} from "@/lib/api/order";
import { SOCKET_BASE_URL } from "@/lib/config";
import { useToast } from "@/hooks/useToast";

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

export default function OrdersManager() {
  const router = useRouter();
  const toast = useToast();
  const [openOrders, setOpenOrders] = useState<Record<string, unknown>[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<
    Record<string, unknown>[]
  >([]);
  const [orderForms, setOrderForms] = useState<
    Record<string | number, Record<string, unknown>>
  >({});
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderSortBy, setOrderSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<OrdersTab>("active");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
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
      setOpenOrders(openOrdersList);
      setCancelledOrders(cancelledOrdersList);
      setOrderForms((current) => {
        const next = { ...current };
        for (const order of [...openOrdersList, ...cancelledOrdersList]) {
          next[order.id as string | number] = {
            ...toOrderFormState(order),
            ...(current[order.id as string | number] || {}),
            note: current[order.id as string | number]?.note ?? "",
          };
        }
        return next;
      });
      setError("");
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/orders"));
        return;
      }
      setError((err as Error).message || "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();

    const socket: Socket = io(`${SOCKET_BASE_URL}/orders`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("order.updated", (payload: Record<string, unknown>) => {
      if (payload?.type !== "order.updated" || !payload.order) return;
      const order = payload.order as Record<string, unknown>;
      const orderId = String(order.id);
      setOpenOrders((current) => syncOpenOrder(current, order));
      setCancelledOrders((current) => {
        const exists = current.some((o) => o.id === order.id);
        if (order.status === "CANCELLED") {
          if (exists) {
            return current.map((o) => (o.id === order.id ? order : o));
          }
          return [order, ...current];
        }
        return current.filter((o) => o.id !== order.id);
      });
      setOrderForms((current) => ({
        ...current,
        [orderId]: {
          ...toOrderFormState(order),
          ...(current[orderId] || {}),
          note: current[orderId]?.note ?? "",
          adminNotes:
            current[orderId]?.adminNotes ?? toOrderFormState(order).adminNotes,
        },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [loadOrders]);

  const handleOrderFieldChange = (
    orderId: string | number,
    field: string,
    value: string,
  ) => {
    setOrderForms((current) => ({
      ...current,
      [orderId]: { ...(current[orderId] || {}), [field]: value },
    }));
  };

  const handleOrderStatusChange = async (
    orderId: string | number,
    status: string,
  ) => {
    try {
      const orderForm = orderForms[orderId] || {};
      await updateOrderStatus(orderId, {
        status,
        courierName: (orderForm.courierName as string)?.trim() || undefined,
        trackingNumber:
          (orderForm.trackingNumber as string)?.trim() || undefined,
        estimatedDeliveryAt: orderForm.estimatedDeliveryAt || undefined,
        adminNotes: (orderForm.adminNotes as string)?.trim() || undefined,
        note: (orderForm.note as string)?.trim() || undefined,
      });
      toast.showToast({
        severity: "success",
        summary: "Success",
        detail: `Order updated to ${status.toLowerCase()}.`,
        life: 4000,
      });
      await loadOrders();
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/orders"));
        return;
      }
      setError((err as Error).message || "Could not update order status.");
    }
  };

  const handleRefundOrder = async (orderId: string | number) => {
    try {
      await refundOrder(orderId);
      toast.showToast({
        severity: "success",
        summary: "Refund processed",
        detail: "The refund has been processed successfully.",
        life: 4000,
      });
      await loadOrders();
    } catch (err) {
      if (
        (err as Error & { status: number }).status === 401 ||
        (err as Error & { status: number }).status === 403
      ) {
        router.push("/auth?from=" + encodeURIComponent("/admin/orders"));
        return;
      }
      setError((err as Error).message || "Could not process refund.");
    }
  };

  const filteredOpenOrders = [...openOrders]
    .filter((order) => {
      const normalizedSearch = orderSearchTerm.trim().toLowerCase();
      if (!normalizedSearch) return true;
      const user = order.user as Record<string, unknown> | undefined;
      const items = (order.items as Record<string, unknown>[] | []) || [];
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
    })
    .sort((left, right) => {
      if (orderSortBy === "name") {
        return String(left.orderTitle || "").localeCompare(
          String(right.orderTitle || ""),
        );
      }
      if (orderSortBy === "oldest") {
        return (
          new Date(left.createdAt as string).getTime() -
          new Date(right.createdAt as string).getTime()
        );
      }
      return (
        new Date(right.createdAt as string).getTime() -
        new Date(left.createdAt as string).getTime()
      );
    });

  const filteredCancelledOrders = [...cancelledOrders]
    .filter((order) => {
      const normalizedSearch = orderSearchTerm.trim().toLowerCase();
      if (!normalizedSearch) return true;
      const user = order.user as Record<string, unknown> | undefined;
      const items = (order.items as Record<string, unknown>[] | []) || [];
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
    })
    .sort((left, right) => {
      if (orderSortBy === "name") {
        return String(left.orderTitle || "").localeCompare(
          String(right.orderTitle || ""),
        );
      }
      if (orderSortBy === "oldest") {
        return (
          new Date(left.createdAt as string).getTime() -
          new Date(right.createdAt as string).getTime()
        );
      }
      return (
        new Date(right.createdAt as string).getTime() -
        new Date(left.createdAt as string).getTime()
      );
    });

  const activeOrders =
    activeTab === "active" ? filteredOpenOrders : filteredCancelledOrders;

  return (
    <section className="admin-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
            {activeTab === "active" ? "Active orders" : "Cancelled orders"}
          </p>
          <h2 className="mt-1 font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
            {activeTab === "active" ? "Shipment queue" : "Cancelled orders"}
          </h2>
        </div>

        <div className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === "active"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-emerald-700 dark:text-emerald-300"
            }`}
          >
            Active ({openOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === "cancelled"
                ? "bg-red-700 text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:text-red-700 dark:text-red-300"
            }`}
          >
            Cancelled ({cancelledOrders.length})
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_200px]">
        <input
          value={orderSearchTerm}
          onChange={(event) => setOrderSearchTerm(event.target.value)}
          placeholder="Search by product, order number, customer, or email"
          aria-label="Search orders"
          className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
        />
        <select
          value={orderSortBy}
          onChange={(event) => setOrderSortBy(event.target.value)}
          className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Product name</option>
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="admin-card-static p-5 text-sm text-[var(--text-secondary)]">
            Loading orders…
          </div>
        ) : activeOrders.length > 0 ? (
          activeOrders.map((order) => {
            const allowedActions =
              activeTab === "active" ? getAllowedOrderActions(order) : [];
            const isCancelled = order.status === "CANCELLED";
            return (
              <article
                key={order.id as string | number}
                className={`admin-card p-4 ${isCancelled ? "border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-950/30" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                      {(order.orderNumber as string) || `Order #${order.id}`}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {(order.orderTitle as string) ||
                        ((
                          (order.items as Record<string, unknown>[])?.[0]
                            ?.product as Record<string, unknown>
                        )?.name as string) ||
                        "Customer order"}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {((order.user as Record<string, unknown>)
                        ?.name as string) || "Customer"}{" "}
                      ·{" "}
                      {(order.user as Record<string, unknown>)?.email as string}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p
                      className={`text-sm font-semibold ${isCancelled ? "text-red-700 dark:text-red-300 dark:text-red-400" : "text-[var(--text-secondary)]"}`}
                    >
                      {order.status as string}
                    </p>
                    {order.invoiceNumber ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {order.invoiceNumber as string}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
                      Rs {Number(order.total).toFixed(0)}
                    </p>
                    {isCancelled && order.refundedAt ? (
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                        Refunded{" "}
                        {new Date(
                          order.refundedAt as string,
                        ).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
                  {(order.items as Record<string, unknown>[]).map((item) => (
                    <div
                      key={item.id as string | number}
                      className="flex flex-wrap items-center justify-between gap-2 sm:gap-4"
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

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-color)]">
                        <th className="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          User
                        </th>
                        <th className="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Item
                        </th>
                        <th className="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Qty
                        </th>
                        <th className="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Date
                        </th>
                        <th className="pb-2 pr-3 font-medium text-[var(--text-muted)]">
                          Unit price
                        </th>
                        <th className="pb-2 font-medium text-[var(--text-muted)]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items as Record<string, unknown>[]).map(
                        (item) => {
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
                              key={item.id as string | number}
                              className="border-b border-[var(--border-color)] last:border-0"
                            >
                              <td className="py-2 pr-3 align-top">
                                <div className="flex flex-col">
                                  <span className="font-medium text-[var(--text-primary)]">
                                    {userName}
                                  </span>
                                  <span className="text-xs text-[var(--text-muted)]">
                                    {userEmail}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 pr-3 align-top">
                                {(product.name as string) || "Product"}
                              </td>
                              <td className="py-2 pr-3 align-top">
                                {quantity}
                              </td>
                              <td className="py-2 pr-3 align-top">
                                {orderDate}
                              </td>
                              <td className="py-2 pr-3 align-top">
                                Rs {unitPrice.toFixed(2)}
                              </td>
                              <td className="py-2 align-top font-medium">
                                Rs {lineTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--border-color)]">
                        <td
                          colSpan={5}
                          className="pt-2 text-right text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]"
                        >
                          Order total
                        </td>
                        <td className="pt-2 text-sm font-semibold text-[var(--text-primary)]">
                          Rs {Number(order.total).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={6}
                          className="pt-1 text-xs text-[var(--text-muted)]"
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

                {activeTab === "active" ? (
                  <>
                    <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Courier name"
                        aria-label="Courier name"
                        value={
                          (orderForms[order.id as string | number]
                            ?.courierName as string) ?? ""
                        }
                        onChange={(event) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "courierName",
                            event.target.value,
                          )
                        }
                        className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
                      />
                      <input
                        type="text"
                        placeholder="Tracking number"
                        aria-label="Tracking number"
                        value={
                          (orderForms[order.id as string | number]
                            ?.trackingNumber as string) ?? ""
                        }
                        onChange={(event) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "trackingNumber",
                            event.target.value,
                          )
                        }
                        className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
                      />
                      <input
                        type="date"
                        aria-label="Estimated delivery date"
                        value={
                          (orderForms[order.id as string | number]
                            ?.estimatedDeliveryAt as string) ?? ""
                        }
                        onChange={(event) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "estimatedDeliveryAt",
                            event.target.value,
                          )
                        }
                        className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
                      />
                      <input
                        type="text"
                        placeholder="Customer delivery note"
                        aria-label="Customer delivery note"
                        value={
                          (orderForms[order.id as string | number]
                            ?.adminNotes as string) ?? ""
                        }
                        onChange={(event) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "adminNotes",
                            event.target.value,
                          )
                        }
                        className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200"
                      />
                      <input
                        type="text"
                        placeholder="Admin note for timeline"
                        aria-label="Admin note"
                        value={
                          (orderForms[order.id as string | number]
                            ?.note as string) ?? ""
                        }
                        onChange={(event) =>
                          handleOrderFieldChange(
                            order.id as string | number,
                            "note",
                            event.target.value,
                          )
                        }
                        className="rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200 md:col-span-2"
                      />
                    </div>

                    {order.trackingNumber ||
                    order.courierName ||
                    order.estimatedDeliveryAt ? (
                      <div className="mt-3 rounded-[1.25rem] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                        {order.courierName ? (
                          <p>Courier: {order.courierName as string}</p>
                        ) : null}
                        {order.trackingNumber ? (
                          <p className="mt-0.5">
                            Tracking: {order.trackingNumber as string}
                          </p>
                        ) : null}
                        {order.estimatedDeliveryAt ? (
                          <p className="mt-0.5">
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
                      <div className="mt-3 rounded-[1.25rem] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                        <p className="text-xs uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                          Shipping address
                        </p>
                        {order.recipientName ? (
                          <p className="mt-1">
                            {order.recipientName as string}
                          </p>
                        ) : null}
                        {order.phoneNumber ? (
                          <p className="mt-0.5">
                            {order.phoneNumber as string}
                          </p>
                        ) : null}
                        {order.addressLine1 ? (
                          <p className="mt-0.5">
                            {order.addressLine1 as string}
                          </p>
                        ) : null}
                        {order.addressLine2 ? (
                          <p className="mt-0.5">
                            {order.addressLine2 as string}
                          </p>
                        ) : null}
                        <p className="mt-0.5">
                          {[
                            order.city,
                            order.state,
                            order.postalCode,
                            order.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {allowedActions.includes("PAID") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "PAID",
                            )
                          }
                          className="btn-primary px-3 py-1.5 text-sm"
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {allowedActions.includes("SHIPPED") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "SHIPPED",
                            )
                          }
                          className="btn-secondary px-3 py-1.5 text-sm"
                        >
                          Mark shipped
                        </button>
                      ) : null}
                      {allowedActions.includes("OUT_FOR_DELIVERY") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "OUT_FOR_DELIVERY",
                            )
                          }
                          className="rounded-full border border-sky-300 px-3 py-1.5 text-sm text-sky-700 transition hover:bg-sky-50"
                        >
                          Out for delivery
                        </button>
                      ) : null}
                      {allowedActions.includes("DELIVERED") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "DELIVERED",
                            )
                          }
                          className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-50"
                        >
                          Mark delivered
                        </button>
                      ) : null}
                      {allowedActions.includes("CANCELLED") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOrderStatusChange(
                              order.id as string | number,
                              "CANCELLED",
                            )
                          }
                          className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 transition hover:bg-red-50"
                        >
                          Cancel order
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-[1.25rem] bg-red-50 px-4 py-3 text-sm text-red-700 dark:text-red-300 dark:bg-red-950/40 dark:text-red-300">
                    <p className="font-semibold text-sm">Cancelled</p>
                    {order.adminNotes ? (
                      <p className="mt-1 text-xs">
                        {order.adminNotes as string}
                      </p>
                    ) : null}
                    {order.refundedAt ? (
                      <div className="mt-2">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Refund processed on{" "}
                          {new Date(
                            order.refundedAt as string,
                          ).toLocaleDateString("en-IN", {
                            dateStyle: "medium",
                          })}
                        </p>
                        {(order.refundMethod as string) ? (
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            Method: {order.refundMethod as string}
                          </p>
                        ) : null}
                        {(order.refundReference as string) ? (
                          <p className="text-xs text-[var(--text-secondary)]">
                            Reference: {order.refundReference as string}
                          </p>
                        ) : null}
                        {(order.refundNotes as string) ? (
                          <p className="text-xs text-[var(--text-secondary)]">
                            Notes: {order.refundNotes as string}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          {order.razorpayPaymentId
                            ? "Refund pending or manual processing required"
                            : "Cash/COD refund pending or manual processing required"}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleRefundOrder(order.id as string | number)
                          }
                          className="mt-2 rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
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
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-muted)] p-5 text-sm text-[var(--text-muted)]">
            {activeTab === "active"
              ? "No active customer orders are waiting for action right now."
              : "No cancelled orders yet."}
          </div>
        )}
      </div>
    </section>
  );
}
