"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { cancelOrder, createOrderIssue, getOrders } from "@/lib/api/order";
import { SOCKET_BASE_URL } from "@/lib/config";
import { clearToken, useAuthChecked, useCurrentUser } from "@/lib/storage";

import { signOutCurrentUser } from "@/lib/session";
import useAutoDismiss from "@/hooks/useAutoDismiss";
import { useToast } from "@/hooks/useToast";
import {
  ACTIVE_STATUSES,
  COMPLETED_STATUSES,
  CANCELLED_STATUSES,
  TRACKING_VIEWS,
  upsertOrder,
  getOrderDisplayTitle,
  getOrderSearchValue,
  getIssueSearchValue,
  getActiveIssue,
  isReturnWindowOpen,
  getIssueTypeOptions,
  canDownloadInvoice,
  RETURN_WINDOW_DAYS,
  RETURN_REQUEST_TYPES,
} from "../lib/orders";
import { buildInvoiceHtml } from "../lib/invoice";

export interface Order {
  id: string | number;
  orderNumber: string;
  orderTitle: string;
  status: string;
  total: number;
  createdAt: string;
  items: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  recipientName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  courierName?: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  adminNotes?: string;
  invoiceNumber?: string;
  canCustomerCancel?: boolean;
  customerCancellationMessage?: string;
  discountAmount?: number;
  shippingAmount?: number;
  handlingAmount?: number;
  codAmount?: number;
  taxAmount?: number;
  shippingType?: string;
  appliedPromoCode?: string;
  subtotal?: number;
  returnWindowOpen?: boolean;
}

export interface IssueForm {
  type: string;
  title: string;
  description: string;
}

export function useOrdersLogic() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser() as Record<string, unknown> | null;
  const authChecked = useAuthChecked();
  const currentUserId = currentUser?.id;
  const currentUserRole = currentUser?.role;

  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [orderSortOption, setOrderSortOption] = useState("newest");
  const [issueForms, setIssueForms] = useState<Record<string, IssueForm>>({});

  useAutoDismiss(error, () => setError(""), 5000);
  const toast = useToast();

  const redirectToAuth = useCallback(() => {
    clearToken();
    router.push(
      "/auth?from=" +
        encodeURIComponent("/orders") +
        "&authMessage=" +
        encodeURIComponent("Sign in to view your orders."),
    );
  }, [router]);

  const handleLogout = useCallback(async () => {
    await signOutCurrentUser();
    router.push("/auth?from=" + encodeURIComponent("/orders"));
  }, [router]);

  useEffect(() => {
    if (!authChecked) {
      return;
    }

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    getOrders()
      .then((data) => {
        setOrders(Array.isArray(data) ? (data as Order[]) : []);
        setError("");
      })
      .catch((err) => {
        if ((err as Error & { status: number }).status === 401) {
          redirectToAuth();
          return;
        }
        setError((err as Error).message || "Could not load your orders.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authChecked, currentUserId, router, redirectToAuth]);

  useEffect(() => {
    if (!authChecked || !currentUserId || currentUserRole === "ADMIN") {
      return undefined;
    }

    const socket: Socket = io(`${SOCKET_BASE_URL}/orders`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("order.updated", (payload: Record<string, unknown>) => {
      if (payload?.type !== "order.updated" || !payload.order) {
        return;
      }

      const order = payload.order as Order;
      setOrders((currentOrders) => upsertOrder<Order>(currentOrders, order));
      setError("");
      toast.showToast({
        severity: "info",
        summary: "Order updated",
        detail: `Order #${order.orderNumber || order.id} status changed to ${order.status.replace(/_/g, " ")}.`,
        life: 4000,
      });
    });

    socket.on("connect_error", () => {
      // Keep temporary realtime disconnects quiet
    });

    return () => {
      socket.disconnect();
    };
  }, [authChecked, currentUserId, currentUserRole]);

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const orderId = searchParams.get("orderId");
    const orderNumber = searchParams.get("orderNumber");

    if (paymentState === "success" && orderId) {
      toast.showToast({
        severity: "success",
        summary: "Payment received",
        detail: `Payment received for ${orderNumber || `order #${orderId}`}. We are confirming it now.`,
        life: 3000,
      });
      router.replace(pathname, { scroll: false });
      return;
    }

    if (paymentState === "cancelled" && orderId) {
      cancelOrder(orderId)
        .then(() => {
          setOrders((currentOrders) =>
            currentOrders.map((order) =>
              String(order.id) === String(orderId)
                ? { ...order, status: "CANCELLED" }
                : order,
            ),
          );
          toast.showToast({
            severity: "error",
            summary: "Order cancelled",
            detail: `Order #${orderId} was cancelled because payment was not completed.`,
            life: 5000,
          });
        })
        .catch((err) => {
          setError(
            (err as Error).message || "Could not cancel the unfinished order.",
          );
        })
        .finally(() => {
          router.replace(pathname, { scroll: false });
        });
      return;
    }

    const orderMessage = searchParams.get("orderMessage");
    if (orderMessage) {
      toast.showToast({
        severity: "info",
        summary: "Order message",
        detail: orderMessage,
        life: 5000,
      });
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router, toast]);

  const currentOrders = useMemo(
    () =>
      (Array.isArray(orders) ? orders : [])
        .filter((order) => ACTIVE_STATUSES.has(order.status as string))
        .filter((order) =>
          getOrderSearchValue(order).includes(searchTerm.trim().toLowerCase()),
        ),
    [orders, searchTerm],
  );

  const completedOrders = useMemo(
    () =>
      (Array.isArray(orders) ? orders : [])
        .filter((order) => COMPLETED_STATUSES.has(order.status as string))
        .filter((order) =>
          getOrderSearchValue(order).includes(searchTerm.trim().toLowerCase()),
        ),
    [orders, searchTerm],
  );

  const cancelledOrders = useMemo(
    () =>
      (Array.isArray(orders) ? orders : [])
        .filter((order) => CANCELLED_STATUSES.has(order.status as string))
        .filter((order) =>
          getOrderSearchValue(order).includes(searchTerm.trim().toLowerCase()),
        ),
    [orders, searchTerm],
  );

  const supportTickets = useMemo(
    () =>
      (Array.isArray(orders) ? orders : [])
        .flatMap((order) =>
          (order.issues || []).map((issue) => ({
            ...issue,
            order,
          })),
        )
        .filter((ticket) =>
          getIssueSearchValue(ticket).includes(searchTerm.trim().toLowerCase()),
        ),
    [orders, searchTerm],
  );

  const sortOrders = useCallback(
    (items: Order[]) => {
      const nextItems = [...items];

      if (orderSortOption === "name") {
        return nextItems.sort((left, right) =>
          getOrderDisplayTitle(left).localeCompare(getOrderDisplayTitle(right)),
        );
      }

      if (orderSortOption === "oldest") {
        return nextItems.sort(
          (left, right) =>
            new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime(),
        );
      }

      return nextItems.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    },
    [orderSortOption],
  );

  const enrichWithReturnWindow = useCallback((items: Order[]) => {
    const now = Date.now();
    return items.map((order): Order => ({
      ...order,
      returnWindowOpen: (() => {
        const deliveredAt = order.deliveredAt
          ? new Date(order.deliveredAt).getTime()
          : (order.activities || []).find(
                (activity) => activity.status === "DELIVERED",
              )?.createdAt
            ? new Date(
                (order.activities || []).find(
                  (activity) => activity.status === "DELIVERED",
                )?.createdAt as string,
              ).getTime()
            : null;
        return (
          deliveredAt !== null &&
          !Number.isNaN(deliveredAt) &&
          now <= deliveredAt + 7 * 24 * 60 * 60 * 1000
        );
      })(),
    }));
  }, []);

  const sortedCurrentOrders = useMemo(
    () => sortOrders(enrichWithReturnWindow(currentOrders)),
    [currentOrders, sortOrders, enrichWithReturnWindow],
  );
  const sortedCompletedOrders = useMemo(
    () => sortOrders(enrichWithReturnWindow(completedOrders)),
    [completedOrders, sortOrders, enrichWithReturnWindow],
  );
  const sortedCancelledOrders = useMemo(
    () => sortOrders(enrichWithReturnWindow(cancelledOrders)),
    [cancelledOrders, sortOrders, enrichWithReturnWindow],
  );

  const sortedSupportTickets = useMemo(() => {
    const nextTickets = [...supportTickets];

    if (orderSortOption === "name") {
      return nextTickets.sort((left, right) =>
        getOrderDisplayTitle(left.order).localeCompare(
          getOrderDisplayTitle(right.order),
        ),
      );
    }

    if (orderSortOption === "oldest") {
      return nextTickets.sort(
        (left, right) =>
          new Date(left.order.createdAt).getTime() -
          new Date(right.order.createdAt).getTime(),
      );
    }

    return nextTickets.sort(
      (left, right) =>
        new Date(right.order.createdAt).getTime() -
        new Date(left.order.createdAt).getTime(),
    );
  }, [orderSortOption, supportTickets]);

  const trackingLinks = [
    {
      key: "active",
      label: "Active",
      path: "/orders/active",
      count: sortedCurrentOrders.length,
    },
    {
      key: "delivered",
      label: "Delivered",
      path: "/orders/delivered",
      count: sortedCompletedOrders.length,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      path: "/orders/cancelled",
      count: sortedCancelledOrders.length,
    },
    {
      key: "support",
      label: "Support tickets",
      path: "/orders/support",
      count: supportTickets.length,
    },
  ];

  const handleIssueFieldChange = (
    orderId: string | number,
    field: string,
    value: string,
  ) => {
    setIssueForms((currentForms) => ({
      ...currentForms,
      [orderId]: {
        type: currentForms[orderId]?.type || "RETURN",
        title: currentForms[orderId]?.title || "",
        description: currentForms[orderId]?.description || "",
        [field]: value,
      },
    }));
  };

  const handleIssueSubmit = async (orderId: string | number) => {
    const order = orders.find((currentOrder) => currentOrder.id === orderId);
    const activeIssue = order ? getActiveIssue(order) : undefined;
    const availableIssueTypes = order ? getIssueTypeOptions(order) : [];

    if (activeIssue) {
      setError(
        "This order already has an active support request under review.",
      );
      return;
    }

    const form = issueForms[orderId] || {};
    const selectedType = availableIssueTypes.some(
      (option) => option.value === form.type,
    )
      ? form.type
      : availableIssueTypes[0]?.value;

    if (!selectedType) {
      setError("Support requests are not available for this order right now.");
      return;
    }

    if (
      RETURN_REQUEST_TYPES.has(selectedType) &&
      !isReturnWindowOpen(order as Order)
    ) {
      setError(
        `Returns, refunds, and replacements are available for ${RETURN_WINDOW_DAYS} days after delivery.`,
      );
      return;
    }

    try {
      const issue = (await createOrderIssue(orderId, {
        type: selectedType,
        title: form.title || "Order issue",
        description: form.description || "",
      })) as Record<string, unknown>;
      setOrders((currentOrders) =>
        currentOrders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                issues: [
                  issue,
                  ...((o.issues as Record<string, unknown>[]) || []),
                ],
              }
            : o,
        ),
      );
      setIssueForms((currentForms) => ({
        ...currentForms,
        [orderId]: { type: "RETURN", title: "", description: "" },
      }));
      toast.showToast({
        severity: "success",
        summary: "Support request submitted",
        detail: "Your support request has been submitted.",
        life: 4000,
      });
      setError("");
      router.push("/orders/support");
    } catch (err) {
      setError((err as Error).message || "Could not submit your order issue.");
    }
  };

  const handleInvoiceDownload = async (orderId: string | number) => {
    const order = orders.find((currentOrder) => currentOrder.id === orderId);

    if (order && !canDownloadInvoice(order)) {
      setError("Invoice is available only after payment is confirmed.");
      return;
    }

    try {
      const { getOrderInvoice } = await import("@/lib/api/order");
      const raw = (await getOrderInvoice(orderId)) as Record<string, unknown>;
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
        setError("Allow popups to save the invoice as a PDF.");
        return;
      }

      const doc = printWindow.document;
      doc.open();
      doc.write(buildInvoiceHtml(invoice));
      doc.close();
      toast.showToast({
        severity: "info",
        summary: "Invoice opened",
        detail: `Invoice ${invoice.invoiceNumber} opened. Choose "Save as PDF" in the print dialog.`,
        life: 4000,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not load the invoice.");
    }
  };

  const handleOrderCancel = async (order: Order) => {
    try {
      setCancellingOrderId(order.id as string);
      const cancelledOrder = (await cancelOrder(
        order.id as string | number,
      )) as Order;
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id ? cancelledOrder : currentOrder,
        ),
      );
      toast.showToast({
        severity: "success",
        summary: "Order cancelled",
        detail: `${getOrderDisplayTitle(cancelledOrder)} was cancelled successfully.`,
        life: 4000,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not cancel this order.");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const selectedView = TRACKING_VIEWS.has(
    (pathname.split("/").pop() as string) || "active",
  )
    ? (pathname.split("/").pop() as string) || "active"
    : "active";

  return {
    orders,
    error,
    loading,
    cancellingOrderId,
    searchTerm,
    orderSortOption,
    issueForms,
    selectedView,
    currentUserId,
    isAdmin: currentUserRole === "ADMIN",
    sortedCurrentOrders,
    sortedCompletedOrders,
    sortedCancelledOrders,
    sortedSupportTickets,
    trackingLinks,
    setError,
    setSearchTerm,
    setOrderSortOption,
    redirectToAuth,
    handleLogout,
    handleIssueFieldChange,
    handleIssueSubmit,
    handleInvoiceDownload,
    handleOrderCancel,
  };
}
